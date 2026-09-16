---
title: "自己动手写一个 SQL 数据库：原理、教程与 GitHub 资源全景调研"
published: 2026-09-16
description: "手写 SQL 数据库的原理拆解与开源资源全景图。"
tags: ["数据库","调研"]
category: "技术博客"
draft: false
lang: 'zh_CN'
---

> **入库说明（2026-09-03）：** 参考资料，按需查阅，不是当前 P0。自研数据库不在实习路线内，但本报告的 B+ 树、WAL、MVCC、火山模型部分可直接支撑 MySQL 八股与项目一分库分表的深层理解；Java 阵营入口见第 3.2 节（RookieDB / SimpleDB）。原文引用的 `report_assets/` 图片未随附，图片位置为断链，不影响文字内容。

> **TL;DR**：自己写一个玩具级 SQL 数据库是理解数据库内核最高效的方式之一。入门首选三条路线：① 跟着 **cstack/db_tutorial**（C 语言从零克隆 SQLite，10.5k 星）一步步写；② 做一门大学课程的配套实验，如 **CMU 15-445 的 BusTub**（C++）或 **Berkeley CS186 的 RookieDB**（Java）；③ 直接阅读一个完整但刻意保持简单的玩具数据库源码，如 Rust 写的 **toyDB**（7.3k 星，带完整架构文档）。写之前先搞懂 B+ 树、Pager、WAL、火山模型这几个核心概念，写的时候遵循"先打通最简 INSERT/SELECT 闭环，再逐层加能力"的顺序。

---

## 1. 你需要先建立的整体认知

### 1.1 一个 SQL 数据库到底由哪些部件组成

自研数据库最大的障碍不是某个算法有多难，而是**不知道整个系统长什么样、该先写哪块**。一条 SQL 语句从你敲下回车到结果打印出来，通常要穿过五层结构：最外层是 REPL 交互界面；往下是 SQL 解析器，负责把文本切成 token 再组织成抽象语法树（AST）；接着是查询规划与优化层，把 AST 变成可执行的计划树；再往下是执行引擎，按经典的**火山模型（Volcano Model）**以 `next()` 迭代器的方式逐行拉取数据；最底部是存储层，包括页式磁盘读写（Pager/缓冲池）、索引结构（**B+ 树**或 LSM 树）以及保证崩溃不丢数据的**预写日志（WAL）**和事务机制。这个分层在几乎所有教学项目里高度一致——无论是 cstack 的 C 教程，还是 build-your-own.org 的 Go 教程，都把系统拆解为 "REPL → 解析器 → 代码生成/规划 → 虚拟机/执行器 → B+ 树 → Pager → 操作系统接口" 这条流水线（[steeldb](https://github.com/paolorechia/steeldb), [build-your-own.org](https://build-your-own.org/database/)）。

*（玩具级 SQL 数据库的典型架构，配图待补）*

理解这套架构最好的综述文章是 Christophe Kalenzaga 的《How does a relational database work》，它用开发者的视角把查询优化器、事务管理器、锁管理器、日志缓冲这些"黑盒"逐个拆开，被多个 awesome 系列清单列为数据库栏目的首选读物（[awesome-internals](https://github.com/ghaiklor/awesome-internals)）。如果只想先建立一个直觉，记住一个类比就够了：**SQL 解析器之于数据库，相当于编译器前端之于编程语言；B+ 树和 Pager 之于数据库，相当于内存管理之于运行时**。你完全可以把写数据库当成"写一个带持久化存储的解释器"。

### 1.2 最小可行数据库（MVP）的正确打开方式

几乎所有教程作者都给出同一条忠告：**不要一开始就想写完整 SQL**。社区里被反复验证的路径是先做一个"能跑通端到端"的骨架：一个 REPL、一个硬编码的单表、只支持 `INSERT` 和 `SELECT *` 两条命令、数据先放内存数组里，最后再加序列化落到单个文件里。steeldb 作者把这个骨架明确列为 v0.1.0 的全部范围——"不支持 B+ 树、不做 Pager、单文件持久化、静态单表"，然后才在后续迭代里逐个加入 WHERE 过滤、B+ 树、事务和 JOIN（[steeldb](https://github.com/paolorechia/steeldb)）。cstack 的教程同样如此：前 4 部分只实现一个内存中的单表，直到第 5 部分才开始把数据刷到磁盘，第 7 部分才引入 B 树（[db_tutorial](https://github.com/cstack/db_tutorial)）。

这个顺序背后有一个工程逻辑：数据库各层之间的接口（解析器输出 AST、执行器调用存储的 `get/put`、Pager 按页读写）是相对稳定的，**先把接口立起来，再逐个把"玩具实现"替换为"真实现"**，每一步都有可运行、可测试的东西。反过来，如果一上来就闷头写 B+ 树，很可能写完才发现它和上层的行格式、下层的页管理对不上，推倒重来。build-your-own.org 的《Build Your Own Database from Scratch in Go》教程把这条路线固化成了四个阶段：先写 B+ 树数据结构 → 让它具备崩溃持久性 → 在其上做并发事务的迷你关系库 → 最后加一层 SQL 风格的查询语言收尾（[build-your-own.org](https://build-your-own.org/database/)）。

---

## 2. 手把手教程类资源：从零写到能跑

### 2.1 C 语言经典：Let's Build a Simple Database（cstack/db_tutorial）

这是"自研数据库"领域流传最广的教程，没有之一。Connor Stack 为了搞清楚 SQLite 的工作原理，用 C 语言从零克隆了一个极简 SQLite，并把每一步写成了图文教程，仓库目前约 **10.5k 星、1.0k fork**（[GitHub API 数据，2026-09-03](https://github.com/cstack/db_tutorial)）。教程从"数据库到底是怎么工作的"这组问题出发——数据在内存和磁盘上是什么格式、什么时候从内存写到磁盘、为什么一张表只能有一个主键、事务回滚是怎么实现的——然后逐章实现 REPL、编译器前端（词法/语法分析）、虚拟机、内存中追加写入的表、磁盘持久化（Pager）、游标、B 树叶节点与内部节点（[db_tutorial](https://github.com/cstack/db_tutorial)）。

需要注意的是，这个教程**在 Part 13 左右就停更了**，B+ 树的删除、二级索引、真正的 SQL 语法都没有覆盖，不少跟随者（如 artysidorenko/c-database、zsxh/build-a-simple-database-from-scratch）在 fork 里自行补完了后续内容，可以作为参考（[artysidorenko/c-database](https://github.com/artysidorenko/c-database), [zsxh/build-a-simple-database-from-scratch](https://github.com/zsxh/build-a-simple-database-from-scratch)）。它适合作为你的**第一份临摹作业**：代码量小、依赖为零、每一步都有 Ruby rspec 写的验收测试。HelloGitHub 对它的评价是"内容由浅入深、循序渐进"，并将其收录于第 18 期（[HelloGitHub](https://hellogithub.com/repository/cstack/db_tutorial)）。

### 2.2 挑战闯关式：CodeCrafters "Build Your Own SQLite" 与 build-your-own-x

如果你更喜欢"闯关+自动评测"的游戏化模式，CodeCrafters 平台的 "Build Your Own SQLite" 挑战是现成选择：你要实现一个能直接读取真实 `.db` 文件的裸 SQLite，逐步完成打印页大小、列出表名、按列读取、WHERE 过滤、全表扫描、索引扫描共九个阶段，支持 Python、Rust、Go、C#、Zig 等语言（[codecrafters-io/build-your-own-sqlite](https://github.com/codecrafters-io/build-your-own-sqlite), [feliposz/build-your-own-sqlite-go](https://github.com/feliposz/build-your-own-sqlite-go)）。这个挑战的独特价值在于它**逼着你去啃 SQLite 的官方文件格式文档和 B-tree 页面布局**，而不是照抄别人的代码——有完成者评价第二阶段难度陡增，"从取消注释一行代码直接跳到'去读这个 db 文件里的 B-tree，文档在这，祝好运'"（[volatile write](https://knutwalker.codes/blog/build-your-own-sqlite-codecrafters/)）。

再往上聚合一层，codecrafters-io 维护的 **build-your-own-x**（约 545k 星，GitHub 全站最受欢迎的仓库之一）专门设有 Database 板块，汇总了各语言的从零写数据库教程：C 的 Let's Build a Simple Database、Go 的《Build Your Own Database from Scratch: From B+Tree To SQL in 3000 Lines》、Python 的 DBDB、JavaScript 的 Dagoba 图数据库、C# 的 Build Your Own Database 等（[build-your-own-x](https://github.com/codecrafters-io/build-your-own-x)）。此外《500 Lines or Less》这本"用不超过 500 行代码实现一个真东西"的名著里有两个数据库章节：Python 写的键值库 **DBDB（Dog Bed Database）**，用追加写（append-only）+ 不可变二叉树 + 超级块原子提交，演示了 CouchDB 式存储的核心思想，代码在 aosabook/500lines 仓库中（[aosabook.org](https://aosabook.org/en/500L/dbdb-dog-bed-database.html)）；以及 JavaScript 写的内存图数据库 **Dagoba**，用"小精灵在管道里流动"的模型实现图遍历查询（[aosabook.org](https://aosabook.org/en/500L/dagoba-an-in-memory-graph-database.html)）。这两个项目代码量极小，适合在动笔写自己的数据库之前花一两个晚上通读，体会"存储引擎原来可以这么简单"。

---

## 3. 大学课程与"代码填空"式项目：跟着教学大纲走

### 3.1 CMU 15-445 / BusTub（C++）：最硬核也最受欢迎

CMU 数据库组的 15-445/645（Database Systems，Andy Pavlo 主讲）被公认为网上公开资源里质量最高的数据库系统课，配套实验是在名为 **BusTub** 的教学型关系数据库骨架上填空实现核心模块：C++ 热身（写 copy-on-write Trie）→ 缓冲池管理器（LRU-K 替换算法、磁盘调度器）→ 可扩展哈希索引 → B+ 树索引（含 latch crabbing 并发）→ 查询执行器（火山模型算子 + 优化器改写规则，如 NLJ 转 hash join、sort+limit 转 top-N）→ 并发控制（MVCC、undo log 链、watermark 垃圾回收）（[appleweiping/cmu-15445-bustub](https://github.com/appleweiping/cmu-15445-bustub)）。BusTub 官方仓库（cmu-db/bustub）约 **5.1k 星**，做完所有项目后它会变成一个支持基本 SQL、带交互 shell 的真数据库（[cmu-db/bustub](https://github.com/cmu-db/bustub)）。

这套路线的优点是**评测完善**（sqllogictest 测试集 + Gradescope 自动评分，非 CMU 学生也有公开 entry code）、社区笔记极多（中文圈有大量实现记录和踩坑文章）；缺点是对 C++17、CMake、并发编程有实打实的门槛要求。另外要特别注意学术诚信红线：课程方明确要求不要公开推送自己的实现，甚至警告"毕业后也可能因此被撤销学位"，所以正确姿势是建**私有仓库**做，公开仓库只放笔记（[BusTub README](https://github.com/lssssj/bustub-2023fall)）。

### 3.2 Berkeley CS186 / RookieDB（Java）与 MIT 6.830 / SimpleDB（Java）

如果 C++ 不是你的菜，Java 阵营有两套成熟方案。Berkeley CS186 的 **RookieDB** 是一个"支持串行执行简单事务的骨架数据库"，课程作业依次往里加 B+ 树索引、高效 join 算法、查询优化、多粒度锁并发控制和崩溃恢复（ARIES 简化版），六个项目做下来正好覆盖存储→索引→优化→并发→恢复全链路，项目说明公开在 GitBook 上（[berkeley-cs186/sp26-rookiedb](https://github.com/berkeley-cs186/sp26-rookiedb/), [CS186 GitBook](https://cs186.gitbook.io/project)）。MIT 6.830 的 **SimpleDB** 则是另一套 Java 骨架：堆文件、基础算子（Scan/Filter/Join/Aggregate）、缓冲池、事务、SQL 前端，刻意不做查询优化器和恢复，留给学生扩展（[vvksh/SimpleDB](https://github.com/vvksh/SimpleDB)）。

Java 阵营还有一个"教材级"选择：Edward Sciore 的教科书《Database Design and Implementation: Second Edition》配套的同名 SimpleDB——一个完整但刻意低效的多用户事务型数据库服务器，代码按 file → log → buffer → tx → record → metadata → query → parse → plan → jdbc 分层组织，每一层对应书中一章，并预留了大量章末扩展练习（如换成高效 join、加查询优化器）（[jessepav/simpledb](https://github.com/jessepav/simpledb)）。这本书被 PingCAP 的 awesome-database-learning 列入推荐书单，且有 C++、Rust、Python 的爱好者重写版可供对照（[awesome-database-learning](https://github.com/pingcap/awesome-database-learning), [rotaki/simpledb](https://github.com/rotaki/simpledb)）。

### 3.3 中文圈友好：OceanBase MiniOB（C++）与 PingCAP TinySQL/TinyKV（Go）

国内厂商出品的两个教学项目对中文读者格外友好。**MiniOB** 是 OceanBase 团队基于华中科技大学数据库课程原型、联合多所高校开发的零基础数据库入门项目，代码简洁、刻意砍掉了并发、安全和复杂事务管理，配套《从0到1数据库内核实战教程》视频课和华科《数据库管理系统实现》讲义，还是全国大学生计算机系统能力大赛（数据库赛道）的官方平台，仓库约 **4.4k 星**（[oceanbase/miniob](https://github.com/oceanbase/miniob)）。OceanBase 还专门维护了一份五章节的开发者入门教程，从存储结构、B+ 树/LSM 索引、SQL 引擎（Parser/Resolver/优化器/火山模型执行器）一路讲到事务引擎的 undo/redo 日志和 MVCC（[oceanbase/kernel-quickstart](https://github.com/oceanbase/kernel-quickstart)）。

PingCAP 的 Talent Plan 则走分布式路线：**TinyKV**（约 4.0k 星）让你基于 TiKV 模型实现一个带 Raft 共识、Multi-Raft 调度和分布式事务的 KV 存储，灵感来自 MIT 6.824；**TinySQL**（约 2.0k 星）则聚焦 SQL 层，实现一个能用官方 MySQL 客户端直连（`mysql -h 127.0.0.1 -P 4000`）的分布式数据库（[talent-plan/tinykv](https://github.com/talent-plan/tinykv), [talent-plan/tinysql](https://github.com/talent-plan/tinysql)）。这两个项目比 BusTub 更贴近工业实现，但文档完善度和维护活跃度略逊，适合作为"第二座山"而非起点。中文自学路径可以参考 rosedblabs 的《数据库/存储学习路径推荐》，它把 MIT 6.824、TinyKV、TinySQL 串成了一条进阶路线（[rosedblabs/database-learning](https://github.com/rosedblabs/database-learning)）。

### 3.4 存储引擎专项：skyzh/mini-lsm（Rust）

如果你想深入的不是 SQL 层而是**存储引擎**，skyzh 的 Mini-LSM 是目前口碑最好的专项课程：三周 21 章，第一周从跳表 memtable、SST 编码、读写路径写出一个能用的 KV 引擎；第二周加压缩策略（leveled/tiered）、manifest、WAL、崩溃恢复；第三周上 MVCC、快照读、乐观并发控制和可序列化校验，全程 Rust，每章都有配套测试和 compaction 模拟器，仓库约 **4.2k 星**（[skyzh/mini-lsm](https://github.com/skyzh/mini-lsm)）。作者明确表示 Mini-LSM 只聚焦存储层，不涉及 SQL 解析、优化器或分布式共识——这恰好可以和 cstack 类教程互补：**一个教你 SQL 层到 B+ 树，一个教你 LSM 存储到事务**（[Mini-LSM 教程](https://skyzh.github.io/mini-lsm/)）。它孵化的思想已经流入了生产项目，如对象存储上的 LSM 引擎 SlateDB 和 Tonbo（[skyzh/mini-lsm](https://github.com/skyzh/mini-lsm)）。

---

## 4. GitHub 上的完整玩具数据库：读源码的最佳范本

### 4.1 总览对比

除了"跟着教程写"，另一条高效路径是**通读一个刻意保持简单的完整数据库源码**。下面这些项目都是"能跑 SQL、功能正确、但不追求性能/生产可用"的教学型实现。星数为 GitHub API 于 2026-09-03 的实测数据。

*（GitHub 上主流自研/教学数据库项目星数对比，配图待补）*

| 项目 | 语言 | 星数 | 定位与亮点 |
|---|---|---|---|
| [cstack/db_tutorial](https://github.com/cstack/db_tutorial) | C | **10,510** | 从零克隆 SQLite 的连载教程，写到 B 树内部节点为止 |
| [erikgrinaker/toydb](https://github.com/erikgrinaker/toydb) | Rust | **7,277** | 完整分布式 SQL 库：Raft + MVCC + BitCask 存储 + SQL 引擎，带架构指南 |
| [cmu-db/bustub](https://github.com/cmu-db/bustub) | C++ | **5,072** | CMU 15-445 课程骨架：缓冲池、B+ 树、执行器、MVCC |
| [oceanbase/miniob](https://github.com/oceanbase/miniob) | C++ | **4,406** | OceanBase 官方零基础教学库，配套中文视频课与大赛 |
| [skyzh/mini-lsm](https://github.com/skyzh/mini-lsm) | Rust | **4,159** | 三周 LSM 存储引擎课程：压缩、WAL、MVCC 事务 |
| [talent-plan/tinykv](https://github.com/talent-plan/tinykv) | Go | **3,987** | PingCAP 分布式 KV 课程：Raft、Multi-Raft、分布式事务 |
| [dolthub/go-mysql-server](https://github.com/dolthub/go-mysql-server) | Go | **2,653** | MySQL 兼容的 SQL 引擎+服务端，存储后端可插拔（Dolt 的内核） |
| [talent-plan/tinysql](https://github.com/talent-plan/tinysql) | Go | **2,049** | PingCAP SQL 层课程，可被官方 MySQL 客户端直连 |
| [risinglightdb/risinglight](https://github.com/risinglightdb/risinglight) | Rust | **1,841** | 教学向 OLAP 列存数据库，可跑 TPC-H |
| [auxten/go-sqldb](https://github.com/auxten/go-sqldb) | Go | **842** | 约 2000 行纯 Go SQL 库：B+ 树 + 4KB 分页 + 火山模型 |
| [DBDB (aosabook/500lines)](https://aosabook.org/en/500L/dbdb-dog-bed-database.html) | Python | 29,575（整书仓库） | 500 行内的 append-only KV 库，演示不可变数据结构+原子提交 |
| [Sciore 的 SimpleDB](https://github.com/jessepav/simpledb) | Java | — | 教科书《Database Design and Implementation》配套完整教学库 |
| [Berkeley RookieDB](https://github.com/berkeley-cs186/sp26-rookiedb) | Java | — | CS186 骨架：B+ 树、join、优化、多粒度锁、恢复 |

### 4.2 重点推荐：toyDB——一个人能读完的"分布式 SQL 全家桶"

在所有玩具数据库里，**toyDB 是完成度和文档质量的标杆**。作者 Erik Grinaker 2020 年为学习数据库内核写下它，之后去 CockroachDB 和 Neon 做了多年真正的分布式 SQL 数据库，又基于工业界经验把它重写成"分布式 SQL 架构的简约示意图"：Raft 共识实现线性一致的状态机复制、MVCC 快照隔离的 ACID 事务、BitCask/内存两种可插拔存储、迭代器式查询引擎带启发式优化和时间旅行查询，SQL 层支持 join、聚合、事务（[erikgrinaker/toydb](https://github.com/erikgrinaker/toydb)）。项目自带一份**架构导览**逐层讲代码，测试用 golden master 脚本覆盖了 Raft 集群、MVCC 事务、SQL 执行和端到端场景（[toyDB 文档](https://github.com/erikgrinaker/toydb)）。

toyDB 给自研者的启示有两点。其一是**明确的取舍声明**——作者公开说性能、扩展性、可用性是 non-goal，因为"这些是生产级数据库复杂度的主要来源，会掩盖底层基本概念"；这正是玩具项目该有的心态。其二是它的基准测试数据本身就是好教材：开 fsync 的 BitCask 引擎写吞吐只有 35 txn/s，关掉 fsync 立刻涨到 4719 txn/s，用一张表就讲清了"持久性 vs 性能"这对数据库的根本矛盾（[toyDB README](https://github.com/erikgrinaker/toydb)）。

### 4.3 按语言挑一个对标的阅读对象

Rust 阵营除了 toyDB，还有 RisingLight（列存 OLAP，由 RisingWave Labs 赞助，有配套的"从零写 OLAP 数据库"中文教程站）、steeldb（带 Medium 连载的分迭代开发记录）、simpledb-rust（Sciore 教材的 Rust 重写，直接写成了一本"如何从零设计关系数据库"的书）（[risinglight-tutorial](https://risinglightdb.github.io/risinglight-tutorial/), [sonhmai/simpledb-rust](https://github.com/sonhmai/simpledb-rust)）。Go 阵营里，auxten/go-sqldb 用约 2000 行代码实现了 B+ 树检索、4KB 分页持久化、SQL-2011 Parser 和火山模型 Select，作者写了详细中文文章讲解，是"一个晚上能读完"量级的好范本；genji 则是更完整的文档型嵌入式 SQL 库，展示了"SQL 引擎 + 可插拔 KV 后端"的经典组合（[auxten/go-sqldb](https://github.com/auxten/go-sqldb), [量子位介绍](https://www.qbitai.com/2021/06/25028.html), [genji](https://genji.dev/)）。

Python 和 JavaScript 阵营虽然没有大型玩具 SQL 库，但有独特的小而美项目：DBDB 教你不可变数据结构如何做原子提交；PyPI 上的 toydb 包是一个纯 Python 的 RDBMS 学习项目，明确写着"目标不是高性能甚至不是完成它，而是持续加深对数据库内部原理的理解"（[toydb - PyPI](https://pypi.com.cn/project/toydb/)）；Dagoba 则用 500 行 JS 演示了查询管道/惰性求值的图遍历模型（[aosabook.org](https://aosabook.org/en/500L/dagoba-an-in-memory-graph-database.html)）。如果你的主力语言是 Python，用 Python 写玩具库完全可行——只是要接受它离"系统编程"的手感更远一些。

*（本报告收录资源按实现语言分布，配图待补）*

---

## 5. 不必重复造轮子的部件：可复用组件库

### 5.1 SQL 解析器：自己写还是先借一个

写 SQL 解析器是自研数据库里最"劝退"的环节之一——SQL 语法表面简单，实则方言众多、优先级规则繁琐。务实的做法是**先用现成解析器打通系统，之后有余力再回来手写**。可用的成熟库包括：Rust 生态的 datafusion-sqlparser-rs（约 3.4k 星，DataFusion 等项目在用，支持 WASM）、Python 生态的 sqlglot（约 9.6k 星，支持 31 种方言互转）、Java 生态的 Apache Calcite 与 JSqlParser、以及直接从 PostgreSQL 源码剥离出的 libpg_query（约 1.5k 星，C 库，拿到的是 PG 原生解析树）（[SQL 解析器综述](https://nishchith.com/sql-parsers/), [pganalyze/libpg_query](https://github.com/pganalyze/libpg_query)）。BusTub 官方骨架就是直接集成 libpg_query 作为 SQL 前端，让学生把精力集中在执行与存储上（[cmu-15445-bustub](https://github.com/appleweiping/cmu-15445-bustub)）。

如果你想把"手写解析器"本身当作学习目标（这很值得一做，相当于顺带学了编译原理入门），社区总结的主流手法是**递归下降 + Pratt 优先级解析**，玩具规模下几百行就能覆盖 SELECT/INSERT/CREATE 子集；Go 里甚至可以取巧复用标准库 `text/scanner` 做词法分析，go-sqldb 就是这么干的（[SQL 解析器综述](https://nishchith.com/sql-parsers/), [go-sqldb 介绍](https://www.senses-ai.com/sys-nd/35.html)）。建议路线：第一版借库，第二版手写递归下降替换掉它，你会真切体会到"接口稳定、实现可替换"这条分层原则的价值。

### 5.2 测试与验证：sqllogictest 值得尽早引入

玩具数据库最容易烂尾的原因是"不知道自己写得对不对"。业界事实标准是 SQLite 的 **sqllogictest** 格式——把 SQL 语句和期望结果写成文本文件批量比对；RisingLight 社区维护了 Rust 版运行器 sqllogictest-rs（227 星），BusTub 的评分体系也建立在这套测试上（[risinglightdb/sqllogictest-rs](https://github.com/risinglightdb)）。cstack 教程则用 Ruby rspec 对 REPL 做端到端断言，Codecrafters 干脆把"自动判题"做成了产品形态。

给你的玩具库写测试时，建议覆盖三类：单元测试（B+ 树插入/分裂/删除的边界）、端到端 SQL 测试（sqllogictest 格式）、以及**崩溃恢复测试**——写到一半 kill 掉进程再重启，验证 WAL 是否真能让数据活下来。第三类是玩具项目里最常被跳过、也最能学到东西的测试；toyDB 的 golden master 测试和 Mini-LSM 的逐章测试都提供了可直接借鉴的范式（[erikgrinaker/toydb](https://github.com/erikgrinaker/toydb), [skyzh/mini-lsm](https://github.com/skyzh/mini-lsm)）。

---

## 6. 书、论文与资料合集：写卡住时去哪查

### 6.1 核心书单

动手期间最值得放在手边的三本书：Alex Petrov 的 **《Database Internals》**——存储引擎（B 树族 vs LSM 族）与分布式系统的现代导览，被几乎所有"写数据库"类 README 列为头号参考书；Martin Kleppmann 的 **《Designing Data-Intensive Applications》（DDIA）**——建立数据系统大局观的标准读物；Edward Sciore 的 **《Database Design and Implementation》**——唯一一本"整本书就是在解剖一个能跑的教学数据库"的教材，前文 SimpleDB 即出自它（[awesome-database-learning](https://github.com/pingcap/awesome-database-learning), [Rusql 书单](https://github.com/HN026/Rusql)）。

论文方面有两篇适合在写之前读：**《Architecture of a Database System》（2007）**用一篇论文的篇幅画清了 DBMS 的进程模型、查询处理器、存储管理器全貌；**《What Goes Around Comes Around》（2005）**梳理数据模型六十年变迁，帮你理解"为什么 SQL 赢了"。想再往上读论文，直接翻《Readings in Database Systems》（红宝书第五版）和 rxin/db-readings 这两个精选集即可（[awesome-papers-awesome](https://github.com/LanceZPF/awesome-papers-awesome/blob/main/README.zh-CN.md), [Rusql](https://github.com/HN026/Rusql)）。

### 6.2 资料合集（awesome 类）

两个仓库足够覆盖"找资料"的全部需求：PingCAP 的 **awesome-database-learning**（约 11k 星）按内核模块细分——查询优化器、执行框架、事务隔离、缓冲管理、B 树/LSM、Raft、基准测试，每一节都链到对应的课程讲次、博客和论文，是查漏补缺的首选索引（[pingcap/awesome-database-learning](https://github.com/pingcap/awesome-database-learning)）。codecrafters-io 的 **build-your-own-x**（约 545k 星）则负责"动手教程"维度，Database 板块持续收录各语言新作（[build-your-own-x](https://github.com/codecrafters-io/build-your-own-x)）。中文读者还可以参考 PKUFlyingPig 的 CS 自学指南中 CS186 条目，以及 dbdb.io（Database of Databases）这个卡内基梅隆维护的数据库设计选型百科——想知道某个真实数据库用的是 B 树还是 LSM、支持哪种隔离级别，查它比翻文档快（[CS自学指南](https://github.com/PKUFlyingPig/cs-self-learning/discussions/131), [dbdb.io](https://dbdb.io/db/risinglight)）。

---

## 7. 实战路线图建议

### 7.1 按你的语言背景选路线

综合来看，**Go 和 Rust 是当前"自研数据库"资源最密集的两个语言**，这不是巧合：Go 有 TinyKV/TinySQL、go-sqldb、rosedb、build-your-own.org 教程这一整条链，且语法负担低；Rust 有 toyDB、Mini-LSM、RisingLight 这套"教科书级三件套"，社区氛围最浓。C/C++ 路线对应 BusTub、MiniOB 和 cstack 教程，能学到最真实的页管理与并发控制；Java/Python/JS 路线资源相对少，但 SimpleDB、RookieDB、DBDB、Dagoba 也各自闭环。第一条建议永远是：**用你最熟练的语言写，别让语言学习曲线抢戏**。

### 7.2 一份可执行的四阶段计划

**阶段一（1~2 周）：打通骨架。** 写一个 REPL + 极简解析器 + 内存单表 + `INSERT`/`SELECT *` 全表扫描，把数据序列化到单文件。直接照抄 cstack 前 5 部分的结构即可，语言不限。验收标准：重启程序后数据还在。

**阶段二（2~4 周）：上真存储。** 实现页式 Pager（定长 4KB 页）和 B+ 树（插入、分裂、范围扫描），用 `.btree` 之类的元命令把树打印出来肉眼验证。卡住时对照 cstack Part 7-13、build-your-own.org 的 B+Tree 章节或 MiniOB 的 B+ 树讲义（[oceanbase/kernel-quickstart](https://github.com/oceanbase/kernel-quickstart)）。

**阶段三（2~4 周）：持久性与事务。** 加 WAL（先写日志再写数据页）、实现崩溃恢复（kill -9 后重启不丢已提交数据），再加最简单的锁或单版本事务。这一步可以参考 DBDB 的原子超级块提交、Mini-LSM 第 2.6 章 WAL、以及 toyDB 的 MVCC 简化思路（[skyzh/mini-lsm](https://github.com/skyzh/mini-lsm)）。

**阶段四（自由发挥）：查询能力与正确性。** 依次加 WHERE、ORDER BY/LIMIT、二级索引、JOIN（先嵌套循环再哈希连接）、聚合；引入 sqllogictest 做回归；写一个简单的代价估算把全表扫描替换成索引扫描。到这一步，你的玩具库已经覆盖了 BusTub 四大项目的主干，再往上就可以挑一个方向深入：分布式（Raft，参考 toyDB/TinyKV）、OLAP（列存+向量化，参考 RisingLight）、或者查询优化器（参考《Architecture of a Database System》与 CMU 15-721 讲次）。

### 7.3 常见坑提醒

从各教程的 issue 区和跟随者笔记里可以总结出几个高频坑：**（1）过早优化**——先把 `write()` 后接 `fsync()` 写对，再谈批量写和缓存；**（2）B+ 树删除**是全书最难写的部分，多数教程（包括 cstack）都回避了它，玩具项目可以只做墓碑标记；**（3）变长记录与溢出页**会迅速放大复杂度，第一版用定长行即可；**（4）并发**放到最后，单线程正确性优先——toyDB 和 MiniOB 都明确把并发/性能列为 non-goal；**（5）别忘了测试驱动**，cstack 教程和 Codecrafters 的共同经验是"每章有可跑的验收"是项目不烂尾的关键（[artysidorenko/c-database](https://github.com/artysidorenko/c-database), [volatile write](https://knutwalker.codes/blog/build-your-own-sqlite-codecrafters/)）。

---

## 8. 结语

费曼那句被 build-your-own-x 放在卷首的话——"What I cannot create, I do not understand"——放在数据库这个领域格外贴切：它外表是基础设施里最"重"的一类软件，内核却可以被压缩到几百行代码里讲清楚。从 cstack 的 C 教程到 toyDB 的 Rust 全家桶，GitHub 上已经形成了一条成熟度相当高的自学供应链，你要做的只是挑一条和自己语言栈匹配的路线，然后把第一个 `INSERT` 跑通。祝玩得开心。

*星数数据采集自 GitHub API（2026-09-03），会随时间变化；本报告仅供学习参考。*
