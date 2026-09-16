---
title: "Kimi-Agent 技术手册总览"
published: 2026-09-16
description: "Java 后端 12 册技术手册的总目录与阅读路线。"
tags: ["Java","目录"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> **定位：** Java 后端学习参考资料库，按需查阅，不是阅读计划。什么时候用什么册看下表；卡壳才查，查完回到当前 P0。收藏不等于学习（见 [知识处理 SOP](/blog/posts/knowledge-processing-sop/)）。

## 学习顺序与时间线对照

| 册 | 文件 | 内容定位 | 对应阶段（见 启动计划 时间线） |
| --- | --- | --- | --- |
| 01 | [01-JavaWeb零基础详细教程](/blog/posts/manual-01-javaweb/) | HTTP/Servlet/Tomcat/Session/JDBC 底层原理，只懂 Java 语法起步 | 9/3–9/16 手册精读期主读（已读完，视频已终止） |
| 02 | [02-MySQL详细教程](/blog/posts/manual-02-mysql/) | DDL/DML/DQL → 事务/锁/索引/执行计划，外卖业务载体 | 苍穹前（9 月上旬）+ 全程查阅 |
| 03 | [03-JDBC与MyBatis详细教程](/blog/posts/manual-03-jdbc-mybatis/) | 手写 JDBC → MyBatis 映射框架，理解持久层演进 | 苍穹前（9 月上旬） |
| 04 | [04-SpringBoot详细教程](/blog/posts/manual-04-springboot/) | **原理正文唯一权威**：IoC/自动配置/Web/事务/安全/缓存/消息/生产化 | 苍穹+黑马全程（9–10 月）+ 项目一 |
| 05 | [05-SpringBoot学习地图与面试速查](/blog/posts/manual-05-springboot-map/) | 学习路线、面试答题框架、30 天训练计划、速查清单（不含原理正文） | 随学随查 + 2027-01 起面试准备 |
| 06 | [06-苍穹外卖式项目学习手册](/blog/posts/manual-06-project-practice/) | 外卖项目实战导读：最小闭环 → 加难度 → 生产化 | 阶段三苍穹练手（9/16 晚–9/24，8 学习日） |
| 07 | [07-黑马点评式Redis学习手册](/blog/posts/manual-07-redis/) | Redis 全景：缓存三大问题/分布式锁/秒杀/Feed 流 | 阶段四 Redis+黑马（9/25–10/10，14 学习日）+ 项目一缓存体系 |
| 08 | [08-消息队列详细教程](/blog/posts/manual-08-mq/) | 可靠消息四问：丢/重/序/积压；生产确认+幂等+重试死信+对账 | 项目一 P0（10 月上中旬补 MQ） |
| 09 | [09-SpringCloud详细教程](/blog/posts/manual-09-springcloud/) | 单体 → 微服务：发现/配置/网关/调用/熔断/一致性 | 项目一 P0–P1（10/12–11/18） |
| 10 | [10-JUC并发编程手册](/blog/posts/manual-10-juc/) | 线程池/锁/AQS/CompletableFuture/ThreadLocal/ConcurrentHashMap | 项目一 P0 并发基础 + 八股 |
| 11 | [11-JVM入门与调优手册](/blog/posts/manual-11-jvm/) | 内存模型/GC/G1/调优参数/OOM 排查/工具链 | 项目一压测期（12 月）+ 八股 |
| 12 | [12-开发工具命令速查](/blog/posts/manual-12-commands/) | Git / Linux / Docker 按场景速查 | 辅助线工具类（Git·Linux·Docker）随时 |

## 课程实操笔记（子目录）

`课程实操笔记/01–07` 是黑马 SpringBoot 课程的连续讲次笔记（对应课程 74–152 讲，员工管理系统 EMS 业务）：项目准备 → 部门 CRUD → 日志与多表查询 → 员工管理 → 事务与 OSS → 登录认证 → AOP/原理/Maven。苍穹外卖阶段（9/16 晚–9/24）对照参考，不按讲次顺序重学。

## 使用原则

1. 编号即推荐学习顺序，但**以当前 P0 需要为准**——做项目一卡在 MQ 就直接进 08，不需要先“学完”前面的。
2. 原理疑问进对应正文档（04/07/08/09），路线和面试框架进 05。
3. 学到可复用结论时按 [最小笔记](/blog/posts/knowledge-processing-sop/) 沉淀，不在本目录做笔记。
