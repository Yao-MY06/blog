---
title: "Spring Cloud 详细教程：从单体到可控微服务"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 09 册：微服务拆分、注册发现、网关与配置中心。"
tags: ["Java","Spring Cloud","微服务"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 前置：建议你已经看过前面的 JavaWeb、Spring Boot、Redis、MQ 教程。  
> 主线版本：Spring Boot 3.x + Spring Cloud 2022/2023 这一代的心智模型；组件名可能随版本替换，但问题不变。  
> 核心立场：Spring Cloud 不是“把一个项目拆成很多项目”的注解集合，而是解决服务变多之后的问题：发现、配置、入口、调用、失败、数据一致、观测、发布。  
> 业务载体：外卖系统拆成 user、merchant、catalog、order、payment、inventory、coupon、delivery、notification、report、gateway。

---

# 0. 先回答：你真的需要 Spring Cloud 吗

很多系统失败不是因为没上微服务，而是因为没必要地上了微服务。拆服务前问自己五个问题：

1. 团队是否大到单体已经互相阻塞？一个服务一个负责人吗？
2. 是否有模块需要独立扩容，比如 order 高峰，而 report 平时很闲？
3. 是否有模块需要独立发布，比如 payment 改动不能影响 catalog？
4. 是否有明确故障隔离需求，比如推荐挂了不能影响下单？
5. 数据所有权能否说清：order 库只能 order 服务写，别人只能调接口或读事件？

如果答案大多是否定，先做模块化单体：按域分包、明确接口、内部事件、独立表结构、统一观测。微服务是解决组织与系统边界问题的，不是性能银弹，也不是简历装饰。

拆错代价：本地方法调用变成网络调用；一个事务变成最终一致；一次排错跨多个服务；发布要协调；测试环境变贵；新人理解成本暴涨。Spring Cloud 能缓解，但不能消灭这些成本。

---

# 1. 总体地图：Spring Cloud 管什么

外卖拆分示例：

```text
client/app/mini program
        │
    api-gateway  统一入口、鉴权、限流、路由、灰度
        │
 ┌──────┼────────────────────────────┐
user  merchant/catalog  order  payment  inventory  coupon  delivery
        │              │      │        │          │
      MySQL          MySQL  MySQL    MySQL     MySQL
                         │
                  notification / report / search
                         │
                    MQ / Redis / ES / OSS
```

Spring Cloud 关注横切能力：

| 问题 | 常见组件/机制 | 业务意义 |
|---|---|---|
| 服务在哪里 | Nacos/Eureka/Consul 注册发现 | 实例上下线动态，不写死 IP |
| 配置怎么管 | Nacos Config/Spring Cloud Config | 多环境配置集中、审计、刷新 |
| 流量从哪进 | Spring Cloud Gateway | 统一鉴权、限流、路由、灰度 |
| 服务怎么调 | OpenFeign/RestClient + LoadBalancer | 声明式调用，客户端负载均衡 |
| 失败怎么挡 | Resilience4j/Sentinel | 超时、重试、熔断、限流、舱壁 |
| 消息怎么连 | Spring Cloud Stream + MQ | 屏蔽部分 MQ 样板，统一 binder |
| 链路怎么追 | Micrometer Tracing/OpenTelemetry | 一个请求跨服务有 traceId |
| 事务怎么一致 | Outbox/Saga/Seata | 跨库不再靠本地 @Transactional |
| 安全怎么做 | OAuth2/OIDC + 网关 + 服务内鉴权 | 不能只信任网关 |
| 发布怎么稳 | 灰度、滚动、健康检查、优雅停机 | 新版本出问题影响面可控 |

---

# 2. 服务注册与发现：为什么不能再写死 IP

## 2.1 没有注册中心

order 调 inventory：

```text
http://10.0.0.21:8081/deduct
```

实例扩容到 3 台、机器重启换 IP、测试环境换地址，配置就要到处改。负载均衡也要自己维护列表。

## 2.2 注册中心做了什么

服务启动：把 `serviceId + ip + port + 健康状态 + 元数据` 注册到 Nacos/Eureka。  
服务调用：order 只写 `http://inventory/deduct`，客户端负载均衡从注册表选一个健康实例。  
实例下线：心跳失败或主动注销，调用方尽快不再路由过去。

关键概念：

- serviceId：逻辑服务名，如 `inventory-service`，是调用契约的稳定锚点。
- instance：一次启动的进程；同 serviceId 可多实例。
- 健康检查：注册中心认为可用与实例真的能处理请求，可能不一致，所以客户端仍要超时/重试/熔断。
- 元数据：版本、环境、区域、灰度标签，用于路由。

## 2.3 学习要点

不要只记住“加 `@EnableDiscoveryClient`”。要理解：注册表是最终一致缓存，刚下线的实例可能短暂还被调用，所以幂等、超时、熔断不可少。服务发现让定位自动化，不等于调用可靠。

---

# 3. 配置中心：集中不是目的，可控才是

外卖服务配置有：数据源、Redis、MQ、限流阈值、开关、支付渠道、短信模板、灰度比例。配置中心价值：

- 多环境一致管理：dev/test/prod 不散落在各机器。
- 变更审计：谁改了 payment.timeout，什么时候。
- 动态刷新：部分开关可不重启生效。
- 权限与加密：机密不能明文进仓库。

但要警惕：

- 配置中心不是第二数据库；不要把业务状态塞进去。
- 全局配置一改多服务生效，可能扩大爆炸半径；核心阈值要有灰度和回滚。
- 动态刷新只适合无状态开关；连接池、线程池、Bean 生命周期复杂的配置，刷新可能不一致，宁可重启发布。
- 配置要有 schema 校验与默认值；启动时关键配置缺失要快速失败。

推荐分层：启动必需的本地 bootstrap 最小化；业务参数进配置中心；机密进 KMS/Secret；高风险配置走发布流程而非手改。

---

# 4. 网关：统一入口，不是业务垃圾桶

Spring Cloud Gateway 负责：路由、鉴权前置、限流、CORS、灰度、请求改写、WAF 对接、统一响应包装、超时总预算。

外卖路由示例：

```text
/api/user/**    -> user-service
/api/merchant/**-> merchant-service
/api/order/**   -> order-service
/api/pay/callback/** -> payment-service 且加强验签/限流
/internal/**    -> 拒绝公网
```

网关该做：

- 校验 token、基础权限、签名、黑白名单。
- 按用户/IP/接口限流，挡住明显攻击和突发。
- 统一 traceId 透传，没生成则生成。
- 灰度路由：header `X-Canary: true` 或按用户 hash 进新版本。
- 设置总超时与下游连接池，避免网关线程被慢服务占满。

网关不该做：

- 不该承载复杂业务规则，比如“判断订单能否取消”应留在 order。
- 不该绕过服务内鉴权；网关被配置错误或内部横向调用时，服务仍要校验身份与资源归属。
- 不该无限制重试；网关重试叠加下游重试会放大流量。

---

# 5. 服务调用：OpenFeign 背后的 HTTP 真相

声明式调用：

```java
@FeignClient(name = "inventory-service")
public interface InventoryClient {
  @PostMapping("/internal/inventory/deduct")
  DeductResult deduct(@RequestBody DeductCommand cmd);
}
```

它本质上还是 HTTP 客户端：序列化、连接池、超时、重试、负载均衡、熔断。你要像配置 RestTemplate/WebClient 一样配置它。

关键设计：

- 超时：connect/read/overall 分开；下游 P99 决定超时，不拍脑袋。
- 重试：只幂等接口默认有限重试；非幂等写操作要么不重试，要么带 Idempotency-Key。
- 负载均衡：本机房/同可用区优先，减少跨区；权重、灰度靠元数据。
- 契约：内部接口也有 DTO、版本、错误模型；不要返回对方服务内部异常类。
- 边界：服务间调用走明确 API/事件，不读对方数据库表。

失败语义要写清楚：`DeductResult` 可能 success、insufficient、duplicate、unknown。`unknown` 最难：请求可能已到下游但响应丢失，需要查询接口或事件对账，而不是盲目重试造成重复扣减。

---

# 6. 韧性：超时、重试、熔断、限流、舱壁

微服务最大的新问题是局部失败会扩散：inventory 慢 → order 线程等 → order 连接池满 → gateway 队列满 → 用户全站慢。

## 6.1 超时预算

从用户可接受时间倒推。比如下单接口预算 3s：

```text
gateway: 3.0s 总预算
order:   2.2s
inventory: 0.6s
coupon:    0.4s
payment precheck: 0.4s
```

每个下游超时都要小于上级剩余预算；否则上级已经放弃，下游还在白干。

## 6.2 重试原则

只对幂等或可去重操作重试；对 4xx 业务错误不重试；对连接超时、部分 5xx 可指数退避 + jitter。重试次数、间隔、最大耗时要写进配置，并和熔断联动。重试不是提高成功率的魔法，它是在下游还能恢复时买时间；下游已崩时重试是加压。

## 6.3 熔断

当 inventory 失败率/慢调用比例超阈值，order 对 inventory 熔断：短时间快速失败或降级。给下游恢复空间，也保护本服务线程。熔断状态要监控：CLOSED/OPEN/HALF_OPEN 转换是重要事件。

降级返回值要业务认可：库存不可用时下单不能假装成功；可降级为“下单受理但人工审核”吗？多数交易不能接受。非核心如推荐、猜你喜欢可以返回空或缓存。

## 6.4 限流与舱壁

- 入口限流：按用户/IP/接口，保护系统不被突发打穿。
- 下游舱壁：order 调 inventory、coupon、payment 使用不同线程池/连接池/客户端实例；payment 慢不拖垮 inventory。
- 并发限制：不是线程越多越好；超过下游容量，排队比硬冲更稳。

Resilience4j/Sentinel 都是工具；关键是先画调用图、标出每个依赖的 SLA 与失败策略，再填参数。

---

# 7. 数据一致性：跨服务没有免费事务

单体里订单、库存、券可一个 `@Transactional`。拆服务后，order 库、inventory 库、coupon 库在不同进程/数据库。选择：

## 7.1 本地消息表 / Outbox + Saga

下单流程可为：

```text
order 本地事务：创建 PENDING 订单 + outbox OrderCreated
inventory consumer：预扣库存，成功发 InventoryReserved，失败发 InventoryReserveFailed
coupon consumer：核销券，失败发 CouponFailed
order 聚合事件：全部成功 → 待支付；任一失败 → 取消并补偿释放已占用资源
```

每一步本地事务保证“状态 + 事件”原子；跨系统通过事件最终一致。需要：事件幂等、状态机、超时补偿、对账。

## 7.2 TCC

Try-Confirm-Cancel：Try 预留资源，Confirm 确认，Cancel 释放。适合资金/库存强约束，但接口设计复杂，要考虑空回滚、悬挂、幂等。学习期理解概念即可，别轻易手写。

## 7.3 Seata/分布式事务

能简化部分代码，但引入协调者、锁与可用性权衡。不要把它当“跨服务 @Transactional 免费版”。高并发交易核心链更常见仍是本地事务 + 事件 + 补偿 + 对账。

原则：能用单服务聚合保证的，别跨服务；必须跨服务的，明确谁是流程编排者、每步失败怎么补偿、多久对账一次。

---

# 8. Spring Cloud Stream 与消息

Spring Cloud Stream 用 binder 抽象 RabbitMQ/Kafka：

```java
@Bean
Consumer<OrderPaidEvent> orderPaid() {
  return event -> notificationService.onPaid(event);
}
```

优点：少写连接/通道样板，函数式模型清晰，测试方便。  
注意：抽象不能让你忘记底层语义。重试、DLQ、分区、顺序、ack、消费组仍要按具体 binder 配置；换 MQ 不是零成本。关键交易事件仍建议 outbox 表，而不是只在业务方法里 `streamBridge.send` 后听天由命。

---

# 9. 观测：跨服务排错的命根子

微服务里一个用户下单可能穿 gateway → order → inventory/coupon → payment → MQ → notification。没有 trace，你只能说“好像慢”。

必备：

- traceId/spanId 全链路透传：HTTP header、MQ header、异步线程、定时任务都要传。
- 日志结构化：service、instance、traceId、orderId、userId、downstream、latencyMs。
- 指标：每个服务 RED；依赖调用单独指标 `downstream_latency{target=inventory,result=timeout}`。
- 拓扑：自动或人工维护依赖图，告警能定位“是谁的上游被拖死”。
- 采样：正常低采样，错误/高延迟高采样；支付、下单全量或近全量追踪。

排错套路：入口 traceId → gateway 看到总耗时 → order span 找到慢在 inventory → inventory 看 DB/Redis/连接池 → 若为 MQ 后段慢，看 lag 与消费耗时。不要平均用力，每跳都要能回答“这一跳花了多久、失败没有”。

---

# 10. 安全：网关不是唯一防线

常见错误：只在网关校验 token，内网服务默认互相信任。一旦某服务被攻陷或配置错误暴露，横向移动很容易。

建议：

- 外部用户：OAuth2/OIDC；网关验签和基础 scope；服务内再做资源归属。
- 服务间：mTLS 或内部 token，明确 caller identity；`internal` 接口不暴露公网。
- 权限模型：用户/商家/骑手/运营角色，订单只能查自己或本商家；服务内必须再校验。
- 机密：支付密钥、短信密钥、OSS key 进 Secret 管理，按服务最小授权，配置中心加密也不够。
- 审计：运营导出、改价、退款、人工关单要记录 who/when/why/before/after。

---

# 11. 发布、灰度与兼容性

微服务接口是契约。发布顺序要考虑兼容：

- 先加字段不删字段；消费者 tolerant reader。
- 改语义用新版本路径或 schemaVersion，老版本并行一段时间。
- 数据库变更先兼容代码旧新两版：加列 → 双写/回填 → 切读 → 删旧列。
- 灰度：按用户/商户/城市小流量；核心交易灰度要能一键回退。
- 优雅停机：摘流量 → 停消费者 → 等在途 → 关池；MQ 消费者不停会造成“下线还在处理”。

健康检查区分 readiness 与 liveness：依赖短暂失败不应让 liveness 杀掉进程；启动未完成不应接流量。

---

# 12. 最小落地路线：别一次上全套

## 阶段 0：模块化单体基线

保留一个 Spring Boot 应用，但按域清边界：user/catalog/order/payment/inventory/coupon。每域独立包、独立表、禁止跨域读表；域间用 Java 接口或内部事件。把 Actuator、traceId、统一异常、测试做好。没有这个基线，拆服务只会把混乱分布式化。

## 阶段 1：拆出最痛的 2~3 个服务

先拆 order、catalog、notification 这类边界清晰或读写特征不同的。引入：

- Nacos：注册发现 + 配置。
- Gateway：入口路由、鉴权、限流。
- OpenFeign + LoadBalancer：同步调用。
- Resilience4j：超时/熔断/舱壁。
- MQ：order 事件给 notification/report。

验收：停掉 notification，不影响下单；catalog 实例扩到 3 个，order 不写死 IP；改 catalog 配置不影响 order 启动。

## 阶段 2：交易一致性

拆 payment/inventory/coupon 后，重点做 Saga/Outbox：创建订单、预扣库存、核销券、支付、失败补偿、超时关单、对账任务。写出失败矩阵：每个步骤成功/失败/超时/重复分别怎么办。

## 阶段 3：生产化

全链路追踪、Prometheus 告警、日志规范、灰度发布、机密管理、演练：注册中心宕机、MQ 积压、某服务慢、配置误改、Redis 故障。每个演练要有手册和回退按钮。

---

# 13. 常见组件选型速记

- 注册/配置：Nacos 在国内业务常见，一体化；Eureka 偏注册，Config 需另配；Consul 生态不同。看团队运维能力。
- 网关：Spring Cloud Gateway；更重流量治理可配合 APISIX/Kong，但别重复堆网关。
- 调用：OpenFeign 声明式，简单 HTTP 可用 RestClient/WebClient；响应式不是默认答案。
- 韧性：Resilience4j 轻量；Sentinel 流量治理更强。选一个吃透。
- 消息：Stream 统一入口，复杂语义回到具体 MQ 配置。
- 追踪：Micrometer Tracing + OpenTelemetry + Jaeger/Tempo。
- 事务：优先 Outbox/Saga；Seata/TCC 谨慎评估。

---

# 14. 面试高频

**问：什么时候拆微服务？**  
答：当拆分带来独立交付、独立扩缩容、故障隔离和清晰数据所有权，且团队能承受分布式复杂度。否则模块化单体更优。拆的边界按业务能力与数据所有权，不按技术层 controller/service/dao 拆。

**问：服务发现是否保证调用成功？**  
答：不保证。注册表最终一致，实例状态有延迟；所以仍要超时、重试、熔断、舱壁、幂等、降级和监控。发现解决“去哪”，韧性解决“去了失败怎么办”。

**问：跨服务事务怎么做？**  
答：核心交易用本地事务 + outbox 事件 + Saga 编排，失败补偿，定时对账。TCC/Seata 用于强约束且能接受复杂度的场景。原则是把全局 ACID 拆成一串可补偿的本地 ACID，并用状态机表达进度。

**问：网关和服务内鉴权关系？**  
答：网关做边缘认证、限流、粗粒度授权和流量卫生；服务内做身份验证与资源级授权。零信任：不因为来自内网就信任，internal 接口也要身份与最小权限。

**问：如何防止一个下游拖垮全站？**  
答：超时预算小于上级、舱壁隔离连接/线程池、熔断快速失败、限流挡突发、降级只用于非核心、MQ 削峰异步化、监控按依赖维度报警。还要演练，不是配置完就算。

---

# 15. 一页纸记忆

- 先模块化单体，再因组织/容量/故障域拆服务。
- 注册发现解决动态定位；不解决可靠性。
- 配置中心管参数，不管业务状态；高风险配置走发布。
- 网关守边缘：路由、鉴权前置、限流、灰度；不堆业务。
- Feign 是 HTTP 客户端：超时、重试、幂等键、契约一样不能少。
- 韧性五件套：超时预算、有限重试、熔断、限流、舱壁。
- 跨服务一致性：本地事务 + outbox + Saga + 补偿 + 对账。
- 消息别只 send；事件要可追踪、可重放、可幂等。
- 观测三件套：trace、指标、结构化日志；按依赖维度报警。
- 安全零信任：网关之外，服务内仍要验身份和资源归属。
- 发布靠兼容与灰度：加字段先于删字段，回退要一键。

Spring Cloud 学好的标志：给你任意两个服务的一次失败调用，你能画出从网关到注册中心到负载均衡到熔断到 MQ 到数据库的路径，并说出每一跳的失败语义、配置项、监控指标和回退动作。
