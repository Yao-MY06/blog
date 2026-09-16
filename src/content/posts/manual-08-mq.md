---
title: "消息队列详细教程：用外卖/点评业务理解可靠异步"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 08 册：消息队列的核心模型与业务落地。"
tags: ["Java","消息队列"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 定位：从零理解消息队列 MQ。业务载体沿用前面的外卖与点评：下单、支付回调、商家通知、超时关单、缓存同步、Feed 推送、秒杀订单。  
> 核心问题始终四个：会不会丢？会不会重复？顺序对不对？积压怎么办？  
> 结论先行：MQ 不是“发了就完事”，而是一套“生产确认 + Broker 持久化 + 消费确认 + 幂等 + 重试死信 + 对账”的可靠性工程。

---

# 0. 为什么需要消息队列

## 0.1 同步调用的诱惑

没有 MQ 时，支付成功后可能这样写：

```java
payCallback() {
  order.markPaid();
  shopNotice.push();      // WebSocket 推商家
  sms.send();             // 发短信
  couponService.record(); // 券使用记录
  statService.incr();     // 统计
  feedService.fanout();   // 可能触发内容扩散
}
```

问题：

- 一个非关键步骤失败，整个支付回调失败，支付平台反复重试。
- 下游慢会拖住支付回调，连接、线程、事务都被占住。
- 高峰期短信/统计/推送把核心链路拖垮。
- 系统之间强耦合，改一个下游影响支付。

## 0.2 MQ 带来的改变

把“必须立即完成”和“可以稍后完成”分开：

```text
支付回调关键路径：验签 → 幂等 → 改订单/支付流水 → 写事件 → 返回成功
非关键后续：通知商家、短信、统计、Feed、积分 → 消费者异步做
```

收益：

- **解耦**：支付不关心谁在监听“已支付”。
- **削峰**：秒杀/大促流量先进入消息，后端按能力消费。
- **异步**：快路径快，慢任务慢，不互相拖死。
- **可恢复**：消费者宕机，消息还在；修好后继续。

代价：

- 一致性从强一致变成最终一致。
- 重复、乱序、延迟、积压成为常态。
- 排错变难：请求不再是一条同步栈，要追 eventId/traceId。

---

# 1. 核心概念地图

- Producer：生产者，发消息的一方，如支付服务发 `OrderPaid`。
- Broker：消息服务器，如 RabbitMQ/Kafka/RocketMQ。
- Consumer：消费者，处理消息的一方。
- Queue/Topic：消息放哪里。RabbitMQ 常说 exchange/binding/queue；Kafka 说 topic/partition。
- Routing：消息按规则进入哪个队列。
- Ack/Nack：消费者处理完确认；失败可拒绝或重试。
- Durable/Persistent：队列/消息是否持久化，Broker 重启不丢。
- Retry/DLQ：失败后重试，多次失败进死信队列。
- Offset：Kafka 消费进度。
- Consumer Group：一组消费者共同消费一个 topic，组内负载均衡，组间广播。
- Idempotency：同一消息处理多次效果等同一次。
- Backpressure：下游处理不过来时，上游/ broker/消费者如何减速。

---

# 2. 三类主流 MQ 的心智模型

## 2.1 RabbitMQ：灵活路由的企业级队列

适合：业务异步、任务队列、延迟/死信、复杂路由、中小到较高吞吐。  
关键词：exchange、queue、binding、routing key、confirm、ack、TTL、DLX。

优点：模型直观，路由强，延迟消息和死信好用。  
注意：超高吞吐、海量积压不是它最擅长；队列过长会影响性能。

外卖用法：支付成功事件、商家通知、短信任务、超时关单延迟消息、报表任务。

## 2.2 Kafka：高吞吐日志流

适合：日志、事件流、行为数据、Feed/统计管道、大数据衔接、极高吞吐。  
关键词：topic、partition、offset、consumer group、replication、retention。

优点：吞吐高、可回放、扩展好。  
注意：延迟队列、灵活路由、单条消息精细确认不如 RabbitMQ 直观；消息保留期是设计点，不是无限数据库。

点评用法：浏览事件、点赞事件流、热度榜更新、搜索同步、埋点入仓。

## 2.3 RocketMQ：业务消息与事务消息

适合：电商交易、顺序消息、延迟消息、事务消息。  
关键词：topic、tag、queue、producer group、consumer group、half message、事务回查。

外卖交易链路很常见：本地事务和发消息的一致性，可用事务消息或 outbox 模式。

## 2.4 怎么选

学习建议：先用 RabbitMQ 学“确认/重试/死信/延迟/路由”，再用 Kafka 学“分区/offset/消费者组/回放/积压”。不要陷入哪个最好；问的是业务语义匹配。

---

# 3. 消息可靠性：一条消息的一生

以 `OrderPaid` 为例，从支付服务到商家通知。

## 3.1 生产端不丢

坏代码：

```java
order.markPaid();
mq.send("OrderPaid", event); // 发失败怎么办？发成功但本地库回滚怎么办？
```

问题：本地事务和发消息不是原子。

方案一：Outbox，学习期最该掌握。

```text
本地事务：
  update order set status='PENDING_ACCEPT' ...
  insert payment_success_log ...
  insert outbox(id, type='OrderPaid', payload, status='NEW')
提交
relay 读取 outbox NEW → 发 MQ → 标记 SENT
```

意义：业务事实和“要发消息这个事实”在同一数据库事务里。relay 崩溃可重发；MQ 短暂不可用不会丢，只会延迟。

方案二：事务消息（RocketMQ）：先发 half message，再执行本地事务，Broker 回查本地事务状态决定提交/回滚消息。本质也是把“发消息”和“本地事务”对齐，只是机制在 MQ 侧。

生产端还要：

- producer confirm/return：知道 Broker 是否收到、是否路由到队列。
- 消息带全局唯一 eventId、traceId、bizId、occurredAt、schemaVersion。
- relay 标记 SENT 失败可重试，消费者必须幂等，因为可能重发。

## 3.2 Broker 不丢

- 队列/交换机持久化，消息持久化。
- Kafka 副本 ISR、acks=all、min.insync.replicas 按可用性/一致性权衡。
- 镜像/副本不等于备份；误删、保留期过期、磁盘损坏仍可能丢，关键事件要有业务对账。
- Broker 宕机演练：relay 是否堆积？消费者是否重复？恢复顺序是否可接受？

## 3.3 消费端不丢、不乱重

核心：处理成功才 ack；失败不要立刻无限重试。

RabbitMQ 风格：

```text
手动 ack
处理成功 → ack
可重试异常 → nack/requeue 或进 retry queue，带退避
多次失败/不可恢复 → DLQ
```

Kafka 风格：

```text
poll 一批 → 处理 → 成功才 commit offset
失败不要提交；可按 topic-retry、topic-dlq 分层
注意自动提交会“处理失败也前进”，生产慎用
```

消费者崩溃时：未 ack/未 commit 的消息会被再次投递，所以重复是常态。不要试图用 MQ 配置实现绝对不重复；正确方向是“至少一次投递 + 消费幂等”。

---

# 4. 幂等：MQ 学习的第一性原理

## 4.1 为什么不能靠“MQ 不重复”

网络重试、生产者重发、消费者重启、再平衡、offset 提交失败，都会造成重复。Exactly-once 在跨系统业务里通常是特定链路语义，不应把它当默认假设。

## 4.2 幂等设计四件套

1. 唯一事件 ID：生产者生成 eventId，全局唯一。
2. 处理记录表：`processed_message(event_id, consumer, status, processed_at)`，event_id 唯一约束。
3. 业务唯一约束：如支付回调 `channel_trade_no` 唯一，一人一单 `(voucher_id,user_id)` 唯一。
4. 状态机校验：非法迁移拒绝；重复消息到达时返回“已处理”而不是报错。

消费伪代码：

```java
@Transactional
void consume(OrderPaid e) {
  if (processed.exists(e.eventId())) return;
  paymentService.applyPaidOnce(e);       // 内部靠唯一约束/状态机
  noticeService.createNoticeOnce(e);     // 通知也可用 dedup key
  processed.save(e.eventId());
}
```

注意：processed 表与业务效果尽量同一事务；如果外部调用无法同事务，要把外部调用设计成可重试幂等接口，或先落“待执行”再由后续任务驱动。

## 4.3 返回结果语义

重复消息不是错误。比如支付回调重复收到同一 tradeNo：应返回成功/已处理，让平台停止重试；而不是抛异常导致更猛烈重试。区分：重复（安全忽略）与冲突（状态不允许，要告警）。

---

# 5. 顺序消息：别要全局顺序，要关键顺序

全局有序通常意味着单分区/单队列，吞吐和可用性大幅下降。外卖里真正需要的往往是“同一订单/同一用户/同一商户有序”。

做法：

- Kafka：按 orderId/userId 做 key，同一 key 进同一 partition，partition 内有序。
- RocketMQ/RabbitMQ：用 sharding key/单队列/一致性 hash，让同一实体消息进同一消费路径。
- 消费端仍要状态机兜底：收到 `OrderCancelled` 早于 `OrderPaid` 这种异常，要告警并等待/补偿，而不是假设网络永远按你想象排队。

例子：同一订单事件顺序 `Created → Paid → Accepted → Delivered → Completed`；不同订单之间可并行。把并行度建在订单维度上，兼顾顺序与吞吐。

---

# 6. 延迟与定时：超时关单怎么做

需求：下单 15 分钟未支付自动取消。

方案对比：

- 定时扫表：简单可靠，延迟取决于扫描间隔；要防多实例重复和与回调竞争。
- RabbitMQ TTL + DLX：消息到时进死信再消费；直观，但大量不同 TTL 或超长延迟要评估。
- RocketMQ 延迟级别：固定级别好用；任意延迟看版本能力。
- Kafka：原生不适合延迟；可用时间轮服务、外部调度或 Redis ZSet delay queue。

关单消费伪代码：

```java
@Transactional
void closeIfTimeout(CloseOrderCmd c) {
  int rows = orderRepo.closeIfPending(c.orderId()); // update ... where status='PENDING_PAY'
  if (rows == 0) return; // 已支付或已关闭，幂等退出
  stockRestore.restoreOnce(c.orderId()); // 恢复记录唯一，防重复回补
  couponRelease.releaseOnce(c.orderId());
  eventRepo.save(OrderCancelled.timeout(c.orderId()));
}
```

关键：延迟消息只是触发器，真正正确性由“条件更新影响行数”和幂等恢复保证。消息晚到、早到、重复到都不能造成错。

---

# 7. 积压与消费扩容

## 7.1 积压从哪来

- 下游突然变慢：短信网关、DB 慢查询、缓存失效。
- 流量突增：秒杀、推送风暴。
- 消费者代码 bug：大量消息进 retry/dlq，主流量也被拖住。
- 分区/并发不足：Kafka 分区太少，RabbitMQ 消费者 prefetch 不合理。

## 7.2 怎么处理

先保核心链路：

- 隔离：关键事件（支付成功）和非关键（运营统计）分 topic/queue，别共用一条命。
- 降级：统计、推荐、日志类可暂停或采样，支付/接单必须优先。
- 扩容：Kafka 受 partition 上限约束，消费者超过分区数没意义；RabbitMQ 增消费者和调 prefetch。
- 削峰：前端排队、资格预检、拒绝超额流量，比事后消费积压便宜。
- 追数：积压消费时开批处理、跳过非关键步骤；追平后恢复正常路径。

指标必须看：生产速率、消费速率、lag/积压、最老消息年龄、失败率、DLQ 数量、消费耗时 P99。只看“积压条数”不够，100 万条日志可能无所谓，1000 条支付消息就是事故。

---

# 8. 外卖/点评典型消息设计

## 8.1 支付成功事件

topic：`order.paid`  
key：orderId  
字段：`eventId, orderId, userId, merchantId, amount, payChannel, tradeNo, paidAt, schemaVersion`

消费者：

- 商家通知：WebSocket 推送；失败重试；权威数据仍靠商家拉待接单列表。
- 履约/骑手派单：可做成独立服务消费。
- 积分/成长值：可延迟、可降级，但必须幂等。
- 统计：进入 Kafka 流，供实时报表。

## 8.2 秒杀订单

高并发路径：

```text
Lua 预减成功 → 生成 orderId → 写 outbox → 返回受理
relay → MQ topic seckill.order.created
consumer：创建订单（唯一约束）→ 超时关单延迟消息 → 通知
```

强调：秒杀接口不直接同步落库，是为了快；但最终订单必须靠 DB 约束与消费幂等保证。

## 8.3 缓存同步

商户改菜后：

```text
本地事务更新 dish → outbox DishChanged
consumer：删除 Redis 缓存、刷新搜索索引、记录审计
```

不要用消息替代数据库写；消息用于让派生系统最终追上。

## 8.4 Feed 事件

作者发笔记：

```text
本地事务保存 note → outbox NotePublished
fanout consumer：普通粉丝推 inbox，大 V 标记拉模式
index consumer：同步搜索
stat consumer：更新计数
```

一个业务事件可以有多个消费者组，各自独立失败与重试。这就是 MQ 解耦的价值。

---

# 9. 代码骨架：可靠生产与消费

## 9.1 Outbox 表

```sql
create table outbox_event (
  id bigint primary key,
  event_id varchar(64) not null unique,
  topic varchar(128) not null,
  biz_key varchar(64) not null,
  payload json not null,
  status varchar(16) not null default 'NEW',
  retry_count int not null default 0,
  next_retry_at datetime null,
  created_at datetime not null,
  sent_at datetime null,
  index idx_status_next (status, next_retry_at)
);
```

relay 逻辑：批量取 NEW 且到期 → 发送成功标 SENT → 失败 retry_count+1、指数退避 → 超上限进人工处理表并告警。relay 本身要短事务、可并发、防重复发送；重复发送不可怕，消费幂等兜底。

## 9.2 消费骨架

```java
void onMessage(Message msg) {
  Event e = parse(msg); // 解析失败进 DLQ，别无限重试毒消息
  if (processed.exists(e.eventId())) { ack(); return; }
  try {
    handler.handle(e); // 业务内部事务/唯一约束/状态机
    processed.save(e.eventId());
    ack();
  } catch (RetryableException ex) {
    retryWithBackoff(msg, ex); // 控制次数，进 DLQ
  } catch (Exception ex) {
    alert(ex, e);
    toDlq(msg); // 不可恢复，保留现场
  }
}
```

毒消息处理：格式错、schema 不兼容、业务永远拒绝的消息不能无限 requeue。进 DLQ，保留原文、原因、堆栈摘要、重放按钮。

---

# 10. 面试怎么答 MQ

**问：怎么保证消息不丢？**  
答：分三段。生产端用 outbox/事务消息，把业务写入和发消息对齐，配合 producer confirm；Broker 端持久化、副本、合理 acks；消费端手动 ack/offset 成功才提交。即便三段都做，跨系统仍可能重复，所以消费幂等和对账是底座。

**问：消息重复怎么办？**  
答：默认至少一次，不假设不重复。eventId 处理记录唯一、业务唯一约束、状态机校验、外部接口幂等。重复消息返回已处理；真正状态冲突才告警。

**问：顺序怎么保证？**  
答：不要全局顺序，按业务实体分 key 保局部有序。Kafka 用 key 进同 partition，RocketMQ 用 sharding key 队列，消费端单线程/按实体串行。同时用状态机防御乱序到达。

**问：消息积压怎么处理？**  
答：先分级：核心支付/接单与非核心统计隔离。查是生产突增、消费慢还是失败风暴。短期扩消费者/分区上限内扩容、批处理、暂停非关键消费者；长期优化慢路径、增加容量、限流和排队。看 lag 还要看最老消息年龄和失败率。

**问：延迟消息和定时任务怎么选？**  
答：少量明确延迟可用 MQ 延迟/TTL+DLX；海量可预测任务或需要强管控用调度扫表/时间轮。无论哪种，业务动作必须条件更新和幂等，消息只是触发器。

**问：MQ 和 Redis Stream 怎么选？**  
答：学习和小规模可靠队列 Stream 可用；需要成熟生态、复杂路由、延迟死信、多语言、大吞吐与运维体系，选 RabbitMQ/Kafka/RocketMQ。选型看语义：路由、延迟、吞吐、回放、顺序、事务、团队运维能力。

---

# 11. 四周练习

## 第 1 周：RabbitMQ 基本功

- 跑通 direct/topic exchange，做一个 `order.paid` 通知商家。
- 手动 ack；故意抛异常观察 requeue；配置 retry queue + DLQ。
- 用 TTL+DLX 做 15 分钟超时关单触发器。
- 练习：同一条消息重复投递 3 次，业务只生效一次。

## 第 2 周：Outbox 与幂等

- 给支付成功加 outbox 表和 relay。
- 消费端加 processed_message 表。
- 演练：relay 发成功但标记 SENT 失败，导致重发；消费者不能重复通知积分。
- 练习：支付回调与超时关单并发，结果只能是“已支付不关单”或“未支付才关单”。

## 第 3 周：Kafka 流

- 建 topic：`note-events`，按 noteId 分区。
- 三个消费者组：搜索同步、热度榜、审计，互不影响。
- 故意停一个消费者组产生 lag，再恢复追平；观察其他组不受影响。
- 练习：同一 note 的 like/unlike 事件按 noteId 保序，不同 note 并行。

## 第 4 周：秒杀综合

- Redis Lua 预减 → outbox → MQ → 异步创建订单 → 超时释放。
- 注入故障：MQ 宕机 5 分钟；消费者处理慢；重复投递；毒消息进 DLQ。
- 做一个小对账任务：比较 Redis 资格、订单表、库存流水，输出差异。
- 产出设计图：生产确认、Broker、消费 ack、retry/DLQ、幂等键、状态机、监控指标。

---

# 12. 一页纸记忆

- MQ 解决解耦、异步、削峰、可恢复；带来最终一致、重复、乱序、积压。
- 不丢靠三段：outbox/事务消息、Broker 持久化副本、成功才 ack/commit。
- 重复靠幂等：eventId + processed 表 + 业务唯一约束 + 状态机。
- 顺序要局部：同订单/同用户一个分区或队列，消费端按实体串行。
- 延迟只是触发；超时关单要条件更新和幂等恢复。
- 积压先隔离核心链路，再看生产/消费/失败风暴，扩容受分区与下游限制。
- DLQ 不是垃圾桶：要能看、能判、能修、能重放。
- 最终兜底永远是对账：Redis、DB、MQ、第三方流水要能对上。

学好 MQ 的标准：画得出一条消息从业务事务到消费者 ack 的全链路，并能在每个箭头说出“这里断了会怎样、怎么发现、怎么恢复”。
