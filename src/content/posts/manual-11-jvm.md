---
title: "JVM 入门与调优手册：内存、GC 与排查实战"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 11 册：JVM 内存结构、垃圾回收与线上排查。"
tags: ["Java","JVM"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> **定位：** 面向八股 JVM 板块 + 项目一压测调优期（12 月）+ 日常 OOM/GC 抖动排查。前置：无。学法：先建立「运行时数据区 → 对象生命周期 → GC → 工具」一条链，再背参数。
> **本册不覆盖：** Java 语法、类加载细节源码——面试问到源码级再深入。

---

# 0. 后端什么时候真的用到 JVM 知识

1. **线上 OOM / 内存持续上涨**：知道 dump 堆、用 MAT/JProfiler 找泄漏点。
2. **GC 抖动、RT 毛刺**：读懂 GC 日志，判断是young GC 太频繁还是 Mixed GC 停顿。
3. **压测调优**（项目一 12 月压测期）：堆大小、GC 器选择、日志参数。
4. **面试**：运行时数据区、GC 算法与收集器、类加载、调优案例是八股固定曲目。

一句话心智模型：**JVM 管的就是「对象放哪、什么时候回收、回收时停多久」三件事。**

---

# 1. 运行时数据区

```
线程共享：堆（对象实例、数组）｜ 方法区/元空间（类元信息、运行时常量池——JDK 8 起由堆外本地内存实现）
线程私有：虚拟机栈（栈帧：局部变量表/操作数栈）｜ 本地方法栈 ｜ 程序计数器
堆内部分代（分代收集器视角）：新生代（Eden + 2×Survivor，默认 8:1:1）｜ 老年代
```

必须知道的 JDK 8 变化：**永久代（PermGen）被元空间（Metaspace）取代**——移到本地内存，默认只受物理内存限制（`MaxMetaspaceSize` 兜底）。字符串常量池 JDK 7 就已移入堆。这是高频面试题。

对象分配路径速记（面试可按这条讲）：

> 绝大多数对象在 Eden 出生 → minor GC 存活进 Survivor（年龄+1，默认 15 晋升老年代）→ 大对象直接进老年代（`-XX:PretenureSizeThreshold`，避免 Eden/Survivor 来回复制）→ 动态年龄判断（Survivor 中同龄对象总和超空间一半，该年龄及以上直接晋升）。

栈相关的两个经典异常：`StackOverflowError`（递归太深——栈帧数超栈容量）vs `OutOfMemoryError: Java heap space`（对象太多堆装不下）。`-Xss` 调栈大小。

---

# 2. 类加载（问到能答的程度）

**生命周期**：加载 → 验证 → 准备（静态变量分配内存设零值）→ 解析 → 初始化（`<clinit>` 才执行静态赋值）→ 使用 → 卸载。

**双亲委派**：子加载器先委托父加载器加载，父找不到才自己加载——保证核心类（java.lang.String）不被篡改、同一个类只被加载一次。三层的名字要背：启动（Bootstrap，核心库）→ 平台（Platform，原扩展）→ 应用（Application，classpath）。

**谁打破了它、为什么**：
- SPI/JDBC：核心库要加载 classpath 里的驱动实现 → 线程上下文类加载器。
- Tomcat：每个 webapp 隔离（webapp 自己的加载器先加载本应用类，实现应用隔离）。
- 热部署/OSGi：模块化按需加载。

---

# 3. 判定对象死亡 & 引用类型

- **可达性分析**（不是引用计数——循环引用它解决不了）：从 GC Roots（栈上局部变量、静态变量、常量、JNI 引用、活跃线程等）出发不可达 = 可回收。
- **finalize() 逃生舱**：不可达对象若重写了 finalize 且未执行过，有一次自救机会——**永远不要用**（执行时机不确定、拖慢 GC），面试说「已废弃（JDK 9+ Deprecated）」。
- 四种引用：强（不回收）> 软（内存不足才回收，缓存可用）> 弱（下次 GC 必回收，ThreadLocalMap 的 key）> 虚（形同没有，配合堆外内存回收通知）。软/弱引用结合 ThreadLocal 讲是常见串联题——见 10 册第 6 章。

---

# 4. GC 算法基础

| 算法 | 思路 | 代价 | 适用 |
| --- | --- | --- | --- |
| 标记-清除 | 标记存活，直接清 | 内存碎片 | CMS 的老年代方案 |
| 标记-复制 | 存活对象复制到另一半 | 浪费空间、复制成本 | **新生代（存活率低，正合适）** |
| 标记-整理 | 存活对象压向一端 | 移动对象、更新引用慢 | **老年代（存活率高）** |

分代的本质：**大部分对象朝生夕死**（弱分代假说），新生代用复制的空间换时间，老年代用整理避免碎片。跨代引用用**卡表（Card Table）**解决：老年代到新生代的引用按 512B 卡页粗粒度记录，minor GC 时只扫脏卡，不扫整个老年代。

---

# 5. 收集器：重点 G1

演变线：Serial（单线程）→ Parallel（吞吐优先，JDK 8 默认）→ CMS（低停顿，已移除）→ **G1（JDK 9+ 默认）** → ZGC/Shenandoah（亚毫秒停顿，超大堆）。

**G1 核心（面试主战场）**：

- 堆划成 ~2048 个等大 Region，每个 Region 动态扮演 Eden/Survivor/Old/Humongous（大对象，连续多个 Region）。
- **可预测停顿模型**：`-XX:MaxGCPauseMillis`（默认 200ms）设定目标，G1 按每个 Region 的「回收价值（垃圾比例）/回收成本（历史统计）」排序，优先收垃圾最多的——这就是名字 Garbage-First 的含义。
- **Mixed GC**：不只收新生代，还收部分老年代 Region。触发条件：老年代占比达 `InitiatingHeapOccupancyPercent`（IHCO，默认 45%）。
- 失败兜底：并发标记期间老年代被填满 → **Full GC（Serial Old，单线程，秒级停顿）**——G1 调优的大目标就是避免 Full GC。
- 记忆关系：RememberedSet 每个 Region 记录谁引用我（点入），卡表是点出——两套结构配合，G1 的 RSet 维护成本也是它小堆上不如 Parallel 的原因。

**怎么选**（项目一压测期的标准答案）：堆 4-8G、要求可控停顿 → G1 默认即可；超大堆（几十 G）低延迟 → ZGC；纯吞吐批处理 → Parallel。**先跑默认+看日志，再调参**，不预先玄学调优。

---

# 6. 必会参数与 GC 日志

```bash
# 常用组合（项目一压测写进启动脚本）
-Xms4g -Xmx4g                        # 初始=最大，避免堆动态伸缩抖动
-Xmn / -XX:NewRatio=2                # 新生代大小（Eden:S=8:1:1 由 SurvivorRatio 控制）
-XX:+UseG1GC -XX:MaxGCPauseMillis=200
-Xlog:gc*:file=gc.log:time,uptime:filecount=5,filesize=20m   # JDK 9+ 日志
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump  # OOM 自动 dump（生产必配）
```

**读 GC 日志三步**：
1. minor GC 频率：几分钟一次 vs 一秒多次——新生代太小或流量激增。
2. 每次 GC 后老年代占用曲线：**锯齿持续抬升 = 有对象不断晋升，快 Full GC/OOM 了**（典型泄漏特征）。
3. 单次停顿：young 一般几 ms~几十 ms；出现 Full GC（G1 里标记 Full (Serial Old)）就要查原因。

---

# 7. 排查工具链（动手章）

| 工具 | 用途 | 关键命令 |
| --- | --- | --- |
| jps | 找 Java 进程 | `jps -l` |
| jstat | GC 实时统计（先看趋势再 dump） | `jstat -gcutil <pid> 1000`（每秒一行各代占比+GC 次数/耗时） |
| jmap | 堆快照/直方图 | `jmap -histo <pid>`；`jmap -dump:format=b,file=heap.hprof <pid>`（注意会 STW，避开高峰） |
| jstack | 线程快照：死锁、CPU 飙高定位 | `jstack <pid>`；CPU 高：`top -Hp <pid>` 找线程号 → 转 16 进制 → 在 jstack 输出里找对应 nid |
| arthas | 阿里在线诊断（生产首选） | `dashboard`、`thread -n 3`（最忙线程）、`heapdump`、`jad` 反编译、`trace 类 方法` 耗时追踪 |

**OOM 排查标准流程**（面试答案例题）：
1. 确认 OOM 类型（heap / metaspace / direct memory——报错信息不同）。
2. `jstat -gcutil` 看是不是老年代持续满、Full GC 后不降（降了=流量问题，不降=泄漏）。
3. 拿 dump（OOM 自动 dump 或 jmap），MAT 打开看 **Dominator Tree**：谁占最大、GC Roots 引用链是谁。
4. 常见元凶：无界集合当缓存、ThreadLocal 没 remove、连接/流没关、大查询一次拉全表（项目一里 MyBatis 一次捞百万行就是这种）。

**CPU 100% 排查**：top 找进程 → `top -Hp` 找线程 → 线程号转 16 进制 → jstack 找栈 → 通常死循环/正则回溯/频繁 Full GC。

---

# 8. 高频面试问答（自测）

1. 运行时数据区划分？哪些共享哪些私有？JDK 8 最大的变化？
2. 对象什么时候进老年代？（四个答案：年龄阈值、大对象、动态年龄判断、Survivor 放不下）
3. 双亲委派是什么、为什么、谁打破？
4. G1 和 CMS 区别？G1 的 Region 和 Mixed GC？
5. minor/major/full GC 分别回收什么、触发条件？
6. 内存泄漏 vs 内存溢出？举两个泄漏例子。
7. 线上服务 RT 突然毛刺，你怎么查？（答：GC 日志→jstat→arthas trace→按第七章流程）

---

# 9. 动手练习清单

- [ ] 写一段无限往 static List 塞对象的代码，`-Xmx64m` 触发 OOM，用 `-XX:+HeapDumpOnOutOfMemoryError` 拿 dump，MAT 找到元凶
- [ ] 写死循环方法让 CPU 100%，用 top -Hp + jstack 完整定位一次
- [ ] 对任意本地 Spring Boot 应用跑 `jstat -gcutil` 5 分钟，画出老年代曲线
- [ ] 给 02 册的订单表造 100 万行，用 MyBatis 一次全查，复现 heap OOM，改分页修复（连接 10 册线程池与 02 册索引知识）
