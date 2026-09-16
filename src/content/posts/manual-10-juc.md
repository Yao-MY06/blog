---
title: "JUC 并发编程手册：从线程安全到并发实战"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 10 册：线程安全、锁、线程池与 JUC 工具集。"
tags: ["Java","并发编程"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> **定位：** 面向 Java 后端实习面试与项目一「并发编程显性化」需求。前置：Java 语法 + 集合基础。业务载体沿用外卖/点评。学法：每个组件先问「没有它会出什么事」，再看它怎么解决，最后看它的坑。
> **本册与 04-SpringBoot详细教程 不重复：那边讲框架怎么用线程，这边讲并发本身。**

---

# 0. 为什么后端必须懂并发

外卖系统三个真实场景：

1. **秒杀扣库存**：1000 个请求同时买最后 1 件商品，MySQL 行锁会让全排队等一行——需要 Redis + Lua 原子扣减（见 07 册），而「原子」的底层就是并发语义。
2. **商品详情聚合**：详情页要查 库存+活动+评价+优惠券 四个下游，串行 400ms，并行 120ms——CompletableFuture。
3. **线程池打满雪崩**：核心业务和非核心业务共用一个池，报表任务把线程占满，下单请求全部排队超时——线程池隔离。

并发不是「多线程语法」，是**正确性（不脏不丢不重）+ 吞吐（并行利用）+ 稳定性（隔离与降级）**三件事。

---

# 1. 线程与 Java 内存模型（JMM）

## 1.1 三大性质：并发 bug 的全部来源

- **可见性**：线程 A 改了变量，线程 B 看不到（各自缓存在 CPU 缓存/寄存器）。
- **原子性**：`count++` 是读-改-写三步，两个线程交错执行就丢更新。
- **有序性**：编译器和 CPU 会指令重排，单线程结果不变，多线程可能读到「半初始化」对象。

经典复现：一个 `boolean flag` 控制循环，主线程改成 false，工作线程可能永远读不到——可见性问题。

## 1.2 JMM 与 happens-before

JMM 定义了线程何时能看到其他线程的写入。核心规则（记住这五条就够面试）：

1. 程序顺序规则：单线程内前面的操作 happens-before 后面的。
2. 监视器锁规则：解锁 happens-before 后续加锁。
3. volatile 规则：写 volatile 变量 happens-before 后续读它。
4. 线程启动：`Thread.start()` 之前的操作对新线程可见。
5. 传递性：A→B 且 B→C，则 A→C。

**答题框架**：被问到「volatile 能不能保证线程安全」——先说它保证可见性+有序性（禁止重排），不保证原子性；`count++` 用 volatile 照样丢更新，要原子类或锁。

---

# 2. synchronized 与 Lock

## 2.1 synchronized

```java
public synchronized void deductStock() { ... }          // 锁 this
public static synchronized void init() { ... }          // 锁 Class 对象
synchronized (lockObject) { ... }                        // 指定对象
```

要点：
- 可重入（同线程可重复进入自己持有的锁）。
- **锁升级**（JDK 6 优化）：无锁 → 偏向锁（只有一个线程访问）→ 轻量级锁（CAS 自旋）→ 重量级锁（涉及用户态/内核态阻塞）。面试常问，答到「大部分场景竞争不激烈，自旋比阻塞便宜；竞争激烈才膨胀」即可。
- 字节码层面是 `monitorenter/monitorexit`。

## 2.2 AQS：JUC 锁的地基（面试高频）

AbstractQueuedSynchronizer = **一个 volatile int state + 一条 CLH 双向等待队列 + 一套获取/释放模板**。

- ReentrantLock：state 0→1 抢锁，>0 记重入；抢不到进队列排队。
- Semaphore：state = 许可数，acquire 减、release 加。
- CountDownLatch：state = 计数，countDown 减到 0 唤醒所有 await。
- 独占模式（锁）vs 共享模式（信号量/闭锁）是模板的两个分支。

理解 AQS 后，ReentrantLock 的公平/非公平（非公平 = 新线程先插队 CAS 一次，吞吐更高）、Condition（await/signal 对应 wait/notify 但可多条件队列）都是自然推论。

## 2.3 synchronized vs ReentrantLock 怎么选

默认 synchronized（JDK 6 后性能不再明显吃亏、不会忘记解锁）；需要**tryLock 超时、可中断、公平锁、多个 Condition** 时用 ReentrantLock。项目里用锁的口诀：**锁对象私有 final、临界区最小化、锁内不做远程调用**。

---

# 3. volatile、CAS 与原子类

- **volatile**：可见性 + 有序性。典型用法：状态标志位、双检锁（DCL）单例的实例字段。
- **CAS**（compareAndSwap）：`Unsafe.compareAndSwapInt`，硬件级原子指令。三个操作数（内存值、期望值、新值）。问题：① ABA（值 A→B→A，CAS 以为没变过——版本号 `AtomicStampedReference` 解决）；② 自旋开销（竞争激烈时空转烧 CPU）；③ 只能保证一个变量。
- **原子类**：AtomicLong 用 CAS；高并发计数用 **LongAdder**（分段 Cell 累加，读时求和——写性能远高于 AtomicLong，代价是读不是精确瞬时值）。秒杀系统的 PV 计数用它。

```java
// DCL 单例，volatile 不能少：防止别的线程拿到「已分配内存但未初始化完」的对象
private static volatile OrderService instance;
public static OrderService getInstance() {
    if (instance == null) {
        synchronized (OrderService.class) {
            if (instance == null) instance = new OrderService();
        }
    }
    return instance;
}
```

---

# 4. 线程池（最重要的一章）

## 4.1 七个参数与执行流程

```java
new ThreadPoolExecutor(
    corePoolSize,      // 常驻核心线程数
    maximumPoolSize,   // 最大线程数
    keepAliveTime, unit, // 非核心线程空闲回收时间
    workQueue,         // 任务队列（有界/无界）
    threadFactory,     // 线程工厂（起名字，排错全靠它）
    handler            // 拒绝策略
);
```

执行顺序（面试必考，别记反）：**核心线程 → 队列 → 非核心线程 → 拒绝策略**。不是「先开满线程再入队」。

## 4.2 拒绝策略

- AbortPolicy（默认）：抛异常。
- CallerRunsPolicy：提交任务的线程自己跑——天然限流，适合削峰场景。
- DiscardPolicy / DiscardOldestPolicy：静默丢（日志都没有，慎用）。
- 生产建议：自定义 handler，拒绝时打日志+降级（记库重试或发 MQ）。

## 4.3 参数怎么定（项目一压测要用的答案）

- **CPU 密集**（加密、压缩、正则回溯）：N+1。
- **IO 密集**（调下游、查库）：2N 起步，**最终以压测为准**——观察队列深度、线程上下文切换、RT 曲线。没有万能公式是正确答案的核心。
- **必须有界队列**（如 `ArrayBlockingQueue(500)`）：无界队列（LinkedBlockingQueue 默认 Integer.MAX_VALUE）在流量洪峰下堆积到 OOM。
- **为什么禁用 Executors 快捷方法**：newFixedThreadPool/newSingleThreadExecutor 无界队列会 OOM；newCachedThreadPool 最大线程 Integer.MAX_VALUE 会创建线程爆炸——这是《阿里巴巴 Java 开发手册》规定，面试高频。

## 4.4 项目一落地：线程池隔离

```
orderPool    (core=20)  ← 下单链路
reportPool   (core=4)   ← 报表/统计
```

核心业务与非核心业务分池，报表打满不影响下单；每个池起名（`threadFactory` 命名 `order-pool-%d`），日志和监控一眼定位是哪个池出事。

---

# 5. CompletableFuture：并行聚合（项目一必用）

```java
// 详情页并行查四个下游，取最慢的为总耗时
CompletableFuture<Stock>  f1 = CompletableFuture.supplyAsync(() -> stockClient.get(id), ioPool);
CompletableFuture<Promo>  f2 = CompletableFuture.supplyAsync(() -> promoClient.get(id), ioPool);
CompletableFuture<List<Eval>> f3 = CompletableFuture.supplyAsync(() -> evalClient.list(id), ioPool);
CompletableFuture<Coupon> f4 = CompletableFuture.supplyAsync(() -> couponClient.get(id), ioPool);

CompletableFuture.allOf(f1, f2, f3, f4).join();   // 等全部完成
DetailVO vo = new DetailVO(f1.join(), f2.join(), f3.join(), f4.join());
```

要点：
- **必须传自定义线程池**：默认用 ForkJoinPool.commonPool()，全 JVM 共享，被别的代码占满就互相拖死——和 4.4 的隔离思想一致。
- `get()` 抛受检异常，`join()` 抛非受检；`get(timeout, unit)` 必加超时。
- `thenApply/thenCompose/thenCombine` 的区别：同步转换 / 依赖异步 / 合并两个独立结果。
- 任一最快：`anyOf`；超时降级：`completeOnTimeout(defaultValue, 800, MS)`（JDK 9+）。
- 一个子任务异常会让 allOf 异常——每个分支内部 try-catch 返回兜底值，别让一个评价服务挂了拖死整个详情页。


# 7. JUC 协作工具

| 工具 | 语义 | 项目场景 |
| --- | --- | --- |
| CountDownLatch | 等 N 个事件完成（一次性） | 并行调用 4 个下游后汇总（现在多用 CF.allOf） |
| CyclicBarrier | N 个线程互相等齐（可复用） | 分片对账：N 个分片各自算完再合并 |
| Semaphore | 最多 N 个并发许可 | 保护下游：第三方接口只允许 10 QPS |
| Exchanger | 两线程交换数据 | 少用，知道即可 |

Semaphore 限流示例（保护第三方支付查询接口）：

```java
Semaphore payApiLimit = new Semaphore(10);   // 最多 10 并发
if (!payApiLimit.tryAcquire(200, TimeUnit.MILLISECONDS)) {
    return PayQueryResult.DEGRADeD;          // 拿不到许可直接降级
}
try { return payClient.query(orderId); }
finally { payApiLimit.release(); }
```

---

# 8. ConcurrentHashMap

- JDK 8 结构：Node 数组 + 链表/红黑树（链长≥8 且数组≥64 转树），**CAS 初始化+插入首节点，synchronized 只锁桶头**——锁粒度从段（JDK 7 分段锁）细化到单个桶。
- **为什么不允许 null**：并发下 `get()==null` 无法区分「不存在」和「值为 null」——语义歧义在并发场景无解（HashMap 单线程可以二义，因为它可以再 containsKey 复查，并发下复查也可能变了）。这是面试高频送分题。
- 复合操作要用原子方法：`putIfAbsent / computeIfAbsent / merge`。统计计数用 `mappingCount()`。
- `computeIfAbsent` 做本地缓存时要防递归更新死锁（JDK 9 已部分修复，但仍建议缓存初始化逻辑简单化）。

---

# 9. 虚拟线程一瞥（JDK 21，项目二会用到）

虚拟线程 = 挂在载体平台线程上的轻量线程，阻塞成本极低，**I/O 密集场景（Agent 会话、批量下游调用）天然契合**：`Executors.newVirtualThreadPerTaskExecutor()`，数万并发不再需要巨型线程池。限制：CPU 密集无收益；synchronized 块内阻塞会 pin 载体线程（JDK 21 限制）。项目二的诊断 Agent 每会话一个虚拟线程的设计依据就在这，详见双项目规划 2.2。

---

# 10. 高频面试问答（自测）

1. synchronized 和 ReentrantLock 区别？锁升级过程？
2. volatile 语义？DCL 为什么必须 volatile？
3. CAS 是什么？ABA 问题及解法？
4. **线程池参数与执行流程？为什么禁止 Executors？参数怎么定？**（项目一压测期重点）
5. ThreadLocal 原理？内存泄漏链条？线程池下怎么办？
6. ConcurrentHashMap JDK 8 改动？为什么不能放 null？
7. happens-before 规则举三例。
8. CountDownLatch vs CyclicBarrier。

答不上的回对应章节，用 [AI辅助概念深度学习法](/blog/posts/ai-assisted-deep-learning/) 的问答闭环拆到能自讲。

---

# 11. 动手练习清单

- [ ] 两个线程交错打印 1-100（锁/wait-notify 和 CF 两种实现）
- [ ] 写一个会 OOM 的无界队列线程池，用 `-Xmx64m` 复现，再改有界修复
- [ ] 用 CompletableFuture 聚合 3 个模拟下游（一个故意慢 2s），加超时降级
- [ ] ThreadLocal 在固定线程池里复现「串用户」，用 remove 修复
- [ ] AtomicLong vs LongAdder 写性能对比（10 线程各累加 100 万次）
