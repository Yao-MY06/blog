---
title: "SpringBoot 学习地图与面试速查"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 05 册：Spring Boot 知识地图与高频面试题速查。"
tags: ["Java","Spring Boot","面试"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> **定位（2026-09-03 整理）：** 本册只保留学习路线（第 0 章）、面试问题框架、训练计划与速查清单；原理正文全部在 [04-SpringBoot详细教程](/blog/posts/manual-04-springboot/)，两册不重复。

## 0. 学习方法与总体地图

### 0.1 先建立三条主线

1. **装配主线**：Bean 如何被创建、注入、配置、条件化生效。核心词：IoC/DI、自动配置、Starter、`@ConfigurationProperties`、Profile。
2. **请求主线**：HTTP 请求如何进入应用、被校验、被处理、被包装成响应。核心词：嵌入式容器、DispatcherServlet、Controller、Validation、异常处理、拦截器、过滤器。
3. **运行主线**：应用如何打包、启动、观测、调参、排错、上线。核心词：Actuator、日志、指标、链路追踪、外部化配置、容器化、Graceful Shutdown。

### 0.2 建议学习顺序

1. Java 基础与 Maven/Gradle 依赖管理。
2. Spring 核心：IoC/DI、Bean 生命周期、AOP、事件、资源与环境抽象。
3. Spring Boot 本质：自动配置、Starter、条件装配、外部化配置。
4. Web：REST、参数绑定、校验、统一响应、异常处理、跨域、文件上传下载。
5. 数据：连接池、JDBC、JPA/Hibernate、MyBatis、事务、分页、审计、迁移。
6. 生产化：Actuator、Micrometer、日志、Docker、配置中心、健康检查、性能与排错。
7. 进阶：安全、缓存、消息、任务调度、WebFlux、GraalVM、云原生与微服务。

### 0.3 练习项目路线

- 入门：Todo REST API（CRUD + Validation + 全局异常）。
- 进阶：库存/订单服务（事务、乐观锁、分页、审计、Flyway）。
- 生产：接入 Actuator + Prometheus 指标、结构化日志、Docker Compose、健康检查、优雅停机。
- 架构：拆成两个服务，用 OpenFeign/RestClient、消息队列、Resilience4j 做超时/重试/熔断。


---

## 11. 常见面试/评审问题与答题框架

1. Spring Boot 自动配置原理？答：导入候选自动配置 → 条件过滤 → 用户 Bean 优先 → 属性绑定 → 条件报告可解释。
2. 为什么推荐构造器注入？答：依赖显式、可 final、易测试、暴露循环依赖与职责过多。
3. `@Transactional` 失效场景？答：自调用、非 public、代理未覆盖、异常类型不匹配、多数据源/事务管理器错乱。
4. JPA N+1 怎么解？答：先确认查询目标，再选 EntityGraph/join fetch/DTO 投影/批量抓取；别先怪框架。
5. 如何设计幂等？答：业务唯一键、请求 ID、去重表、状态机约束、数据库唯一约束兜底、消息消费者重放安全。
6. 生产如何暴露 Actuator？答：最小端点、认证授权、网络隔离、管理端口分离、敏感端点禁公网。

---

## 12. 30 天训练计划

- 第 1 周：核心机制。手写最小自动配置 starter；观察 `conditions`；实现强类型配置与 profile。
- 第 2 周：Web 与数据。完成 Todo API：DTO、Validation、全局异常、JPA/MyBatis 任选、Flyway、分页。
- 第 3 周：可靠性与测试。事务边界实验、N+1 复现与修复、Testcontainers 集成测试、Testcontainers + 消息幂等。
- 第 4 周：生产化。Actuator 最小暴露、Prometheus 指标、结构化日志、Docker 镜像、优雅停机、故障演练清单。

验收标准：能解释每个默认行为从哪里来，能把它关掉/替换，并能在出问题时用端点、日志、指标、追踪定位到层。

---

## 13. 速查清单

- 新功能先问：要不要 starter？默认 Bean 是否够用？要不要显式覆盖？
- 新接口先定：DTO、错误模型、状态码、幂等、超时、权限、审计字段。
- 新事务先想：边界多大？是否含远程调用？失败补偿？只读？
- 新缓存先想：key 维度、TTL、失效触发、击穿/穿透/雪崩、内存上限。
- 上线前必有：健康检查、指标、日志 traceId、配置外置、迁移脚本、回滚方案、优雅停机。
- 出问题先看：conditions/beans/env、连接池、慢 SQL、线程与 GC、下游 P99、最近变更。

---

## 14. 进一步阅读方向

- Spring Boot Reference：Features、Auto-configuration、Actuator、Externalized Configuration。
- Spring Framework Reference：Core Container、Web MVC、Data Access、Testing。
- Hibernate 文档：fetching、caching、flushing、locking。
- Micrometer/OpenTelemetry：指标与追踪语义。
- 12-Factor App、Release It!、Designing Data-Intensive Applications：把框架能力放进系统观。
