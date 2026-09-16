---
title: "用「苍穹外卖」式项目学 JavaWeb 与 Spring Boot"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 06 册：以外卖业务为线索的实战学习路线。"
tags: ["Java","项目实战"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 定位：这是一份学习导读与实战拆解，不复制任何现成培训项目源码。我们借“外卖系统”这个大家都熟悉的业务，把前面学的 HTTP、Servlet、Spring Boot、MyBatis/JPA、Redis、消息、事务、安全、定时任务、报表、WebSocket 全部串起来。  
> 适合：刚学完 Java 语法，正在补 JavaWeb，再过渡到 Spring Boot。  
> 学法：不要先看完整大项目。按“最小闭环 → 加难度 → 生产化”的顺序做。

---

# 0. 为什么用外卖项目学后端

外卖业务好处是：每个人都能理解需求，但后端要解决的问题非常典型。

用户视角一句话：打开小程序/App → 看附近商家和菜品 → 加购物车 → 领券 → 下单 → 支付 → 商家接单 → 骑手配送 → 完成/评价。

后端视角要处理：

- 高并发读：首页、商家列表、菜品列表、详情。
- 写一致性：下单要扣库存、算优惠、清购物车、生成订单。
- 异步流程：支付回调、超时关单、接单提醒、配送状态变更。
- 权限：用户、商家、骑手、平台运营四种角色看到的数据完全不同。
- 缓存：菜品、商家详情、首页推荐、验证码、限流。
- 报表：订单量、营业额、复购、菜品销量。
- 实时性：新订单提醒商家，常用 WebSocket 或轮询。
- 文件：菜品图片上传，常见是对象存储 OSS。
- 地理：附近商家可用 GeoHash/PostGIS/ES，学习期先用“城市 + 距离模拟”。

它能覆盖后端面试里 80% 的常见问题：登录态、幂等、事务、超卖、缓存一致性、消息重复、状态机、定时任务、报表 SQL、接口安全。

---

# 1. 总体架构：先跑通单体，再谈拆分

学习期强烈建议做“模块化单体”，不要一开始微服务。

```text
外卖单体应用
 ├─ user-api        用户端接口：登录、地址、商家、菜品、购物车、订单、支付
 ├─ merchant-api    商家端接口：菜品管理、接单、拒单、营业状态
 ├─ rider-api       骑手端接口：抢单/派单、取餐、送达（学习期可模拟）
 ├─ admin-api       平台运营：商家审核、分类、优惠券、报表
 ├─ order-domain    订单状态机、金额计算、优惠规则、库存
 ├─ infra           DB、Redis、MQ、OSS、WebSocket、定时任务
 └─ common          统一响应、异常、鉴权上下文、幂等、工具
```

为什么不先拆服务：你现在的瓶颈是理解请求如何进系统、数据如何一致、异常如何处理；不是服务发现、配置中心、熔断。单体里先把边界画清楚，未来才好拆。

---

# 2. 技术栈与每个组件的意义

| 技术 | 在外卖项目里干什么 | 为什么需要它 |
|---|---|---|
| Spring Boot | 启动 Web 服务、自动配置、装配 Bean | 少写样板，快速搭好可运行系统 |
| Spring MVC | 接收请求、参数绑定、返回 JSON | 对应底层 Servlet/HTTP |
| Validation | 校验手机号、地址、菜品价格 | 脏数据不要进业务和数据库 |
| MyBatis 或 JPA | 操作 MySQL | 把 Java 对象和表数据连起来 |
| MySQL | 存用户、商家、菜品、订单 | 关系数据需要事务和约束 |
| Redis | 缓存、验证码、分布式锁、购物车可选 | 读多写少降数据库压力，控制并发 |
| RabbitMQ/Kafka | 订单事件、支付成功后续处理 | 削峰、解耦、可重试 |
| XXL-Job/Spring Scheduled | 超时关单、结算、报表预聚合 | 时间驱动任务不能靠用户请求触发 |
| WebSocket | 新订单推送商家 | 服务端主动通知，不让商家一直刷新 |
| OSS/本地文件 | 菜品图片 | 大文件不要直接塞数据库 |
| JWT/Session | 登录态 | HTTP 无状态，需要识别用户 |
| Swagger/OpenAPI | API 文档 | 前后端联调契约 |
| POI/EasyExcel | 运营导出报表 | 管理端常见需求 |

学习时建议：核心链路用 MySQL 事务保证正确；缓存、消息、WebSocket 是增强，不要一开始全上，否则问题定位会失控。

---

# 3. 数据库设计：从核心表开始

先设计最小闭环：用户能看菜品、下单、支付模拟成功、商家接单。

## 3.1 用户与地址

```text
user(id, phone, nickname, avatar, status, created_at)
address(id, user_id, receiver, phone, province, city, district, detail, is_default)
```

意义：订单收货地址要冗余到订单快照里。用户改默认地址，不应该改历史订单的配送地址。

## 3.2 商家与菜品

```text
merchant(id, name, logo, phone, status, open_status, address, created_at)
category(id, merchant_id, name, sort)
dish(id, merchant_id, category_id, name, price, image, description, status, stock, version)
setmeal(id, merchant_id, name, price, image, status) -- 套餐可选
```

关键点：

- `dish.status`：上架/下架。
- `dish.stock`：学习期先做菜品库存；真实外卖常按门店库存/售罄。
- `version`：乐观锁，防并发更新冲突。
- 价格单位建议用“分”存整数，避免浮点误差。

## 3.3 购物车

```text
cart_item(id, user_id, merchant_id, dish_id, quantity, selected, created_at, updated_at)
```

关键点：一个订单通常只来自一个商家。购物车要限制跨店结算，或结算前拆单。学习期直接规定：一次只能提交同一商家商品。

## 3.4 订单核心

```text
order_main(
  id, order_no, user_id, merchant_id,
  status, pay_status,
  dish_amount, delivery_fee, coupon_amount, pay_amount,
  receiver_snapshot, address_snapshot, remark,
  created_at, paid_at, accepted_at, delivered_at, cancelled_at, version
)

order_item(id, order_id, dish_id, dish_name, dish_price, quantity, image)
```

重点：订单必须保存“下单时快照”。菜品后来改价、下架、改名，不影响历史订单。这是订单系统最容易被忽视的点。

## 3.5 优惠券与支付

```text
coupon(id, title, type, threshold_amount, reduce_amount, valid_from, valid_to, status)
user_coupon(id, user_id, coupon_id, status, order_id, used_at)
payment(id, order_id, channel, channel_trade_no, amount, status, callback_payload, created_at, paid_at)
```

学习期支付用“模拟回调”：点击支付后，后端直接调用回调逻辑，但必须按真实要求做：验签、幂等、金额核对、状态机迁移。

---

# 4. 订单状态机：外卖项目的心脏

建议状态：

```text
待支付 PENDING_PAY
  ├─ 支付成功 → 待接单 PENDING_ACCEPT
  └─ 超时/用户取消 → 已取消 CANCELLED

待接单 PENDING_ACCEPT
  ├─ 商家接单 → 待配送 PREPARING/DELIVERING
  └─ 商家拒单 → 已取消/待退款

配送中 DELIVERING → 已完成 COMPLETED

支付后取消 → 退款中 REFUNDING → 已退款 REFUNDED
```

原则：

1. 所有状态变更集中在 `OrderStateMachine` 或 `OrderService` 的明确方法里，不允许 Controller、定时任务、回调各自乱改 `status`。
2. 非法迁移抛 `OrderStateException`，映射 409。
3. 迁移要记录事件：`order_event(order_id, from_status, to_status, actor, remark, created_at)`。

这能解释为什么 Spring 事务重要：状态迁移、库存扣减、券核销、购物车清理必须同成败；支付回调和超时关单可能同时发生，需要唯一约束/乐观锁/状态判断兜底。

---

# 5. 最小闭环实战：第一周目标

目标：只做用户下单到商家接单，不接入真实支付、不做骑手、不做券。

## 5.1 接口清单

用户端：

```text
POST /user/login          手机号+验证码（学习期验证码固定 123456 或打印日志）
GET  /merchants           商家列表（先做全部，后做附近）
GET  /merchants/{id}/dishes 菜品列表
POST /cart/items          加入购物车
GET  /cart                我的购物车
POST /orders              提交订单
POST /orders/{id}/mock-pay 模拟支付成功
GET  /orders/{id}         订单详情
GET  /orders              我的订单分页
```

商家端：

```text
POST /merchant/login
GET  /merchant/orders/pending 待接单列表
POST /merchant/orders/{id}/accept 接单
POST /merchant/orders/{id}/reject 拒单
PUT  /merchant/dishes/{id}  修改菜品/上下架
```

## 5.2 提交订单伪代码

```java
@Transactional
public OrderView submit(Long userId, SubmitOrderRequest req) {
  Cart cart = cartService.lockUserCart(userId, req.merchantId());
  if (cart.isEmpty()) throw new BusinessException("购物车为空");

  Merchant merchant = merchantRepo.findForUpdate(req.merchantId())
      .filter(Merchant::isOpen)
      .orElseThrow(() -> new BusinessException("商家休息中"));

  List<Dish> dishes = dishRepo.lockByIds(cart.dishIds());
  OrderAmount amount = pricing.calculate(cart, dishes); // 校验价格以后端为准

  stockService.deduct(dishes, cart); // update ... set stock = stock - ? where id=? and stock >= ?

  Order order = Order.create(userId, merchant, amount, addressSnapshot(req.addressId()));
  order.addItems(cart, dishes); // 快照名称/价格/图片
  orderRepo.save(order);

  couponService.markUsedIfAny(userId, req.userCouponId(), order); // 第一周可跳过
  cartService.clearChecked(userId, req.merchantId());
  outbox.append(OrderCreatedEvent.of(order)); // 第一周可先记日志
  return OrderView.from(order);
}
```

这段里每个点都对应前面教程：

- 价格不能信前端：对应 HTTP 参数不可信。
- `lockByIds` / 原子扣库存：对应并发与超卖。
- 快照：对应订单数据不可变事实。
- `@Transactional`：对应手动 JDBC commit/rollback。
- outbox：对应异步解耦与消息可靠投递，第一周先打日志。

## 5.3 必须写测试

- 参数校验：数量为 0、地址不属于当前用户、商家不存在。
- 超卖：两个线程同时买最后 1 份，只能成功一个。
- 状态机：未支付不能接单；已接单不能用户直接取消；已完成不能改。
- 金额：前端传便宜价格，后端仍按数据库价格算。
- 支付回调幂等：同一个 `orderNo` 回调两次，状态只迁移一次。

---

# 6. 登录与权限：别把“登录了”当“能操作”

外卖系统至少有四种身份：用户、商家、骑手、平台运营。很多 bug 来自“只验证登录，不验证资源归属”。

错误：用户登录后能访问 `/orders/{id}` 就看订单。  
正确：`/user/orders/{id}` 要校验 `order.userId == currentUserId`；商家端要校验 `order.merchantId == currentMerchantId`。

落地建议：

- 登录后解析出 `LoginUser{role, userId, merchantId, riderId}` 放入上下文。
- Controller 不做复杂 if，统一用注解或服务层守卫：

```java
@PreAuthorize("hasRole('USER')")
OrderView detail(@PathVariable Long id) {
  return orderService.userDetail(currentUser.userId(), id);
}
```

```java
public Order userOrder(Long userId, Long orderId) {
  return repo.findById(orderId)
      .filter(o -> o.getUserId().equals(userId))
      .orElseThrow(() -> new NotFoundException("订单不存在"));
}
```

注意：对不属于自己的订单，返回 404 还是 403 要统一。很多系统返回 404，避免暴露“这个订单存在但不是你的”。

---

# 7. 缓存：先知道缓存解决什么，再谈怎么加

外卖读多写少：商家列表、菜品列表、菜品详情适合缓存；订单详情、支付状态不适合长缓存。

第一版建议：

- 菜品详情：Redis `dish:{merchantId}:{dishId}`，TTL 10~30 分钟 + 抖动。
- 商家菜品列表：商家改菜/上下架后删除 `merchant:{id}:dishes`。
- 首页推荐：后台配置变更后主动失效。
- 验证码：`sms:code:{phone}`，TTL 5 分钟，带发送频率限制。
- 限流：下单接口按 userId 限制每分钟次数。

缓存一致性口诀：

- 读：先缓存，没有再查库并回填；空结果短 TTL 防穿透。
- 写：先更新数据库，再删缓存；不要先删缓存再慢慢写库。
- 热点：菜品详情可能被秒杀打爆，用逻辑过期或互斥重建。
- 维度：key 里带商家、城市、用户、版本，避免串数据。

---

# 8. 消息与异步：支付成功后别全塞在回调里

模拟支付回调也不能只做 `order.status = PAID`。支付成功后通常要：更新订单、通知商家、记支付流水、触发履约、可能发短信/推送。

坏设计：回调接口里同步做所有事，一个推送失败导致回调失败，支付平台反复重试。  
好设计：回调只做最小关键事——验签、幂等、金额核对、订单状态迁移、写 outbox；其余交给消息消费者。

流程：

```text
支付回调
 ├─ 验签失败 → 401
 ├─ 订单不存在/金额不符 → 记录异常，返回失败或按渠道协议处理
 ├─ 已处理过 → 返回成功（幂等）
 └─ 本地事务：订单置为待接单 + payment 置成功 + outbox 写 OrderPaid
      → 返回成功
消费者处理 OrderPaid：推送商家 WebSocket、短信、履约准备；失败重试，重复消费幂等
```

---

# 9. 定时任务：超时未支付自动关单

需求：下单 15 分钟未支付自动取消，释放库存和券。

错误做法：用户每次进订单页检查是否超时。这样如果用户不打开，订单永远不关闭，库存被占。

正确做法：定时任务扫描：

```sql
select id from order_main
where status = 'PENDING_PAY' and created_at < now() - interval 15 minute
limit 200;
```

处理注意：

- 分页/批量，避免一次扫全表。
- 每条关单要在事务里做：状态仍是 PENDING_PAY 才取消、回补库存、释放券、记事件。
- 与支付回调竞争：回调把订单置已支付，定时任务同时取消。用条件更新兜底：

```sql
update order_main
set status='CANCELLED', cancelled_at=now()
where id=? and status='PENDING_PAY'
```

影响行数为 0 说明已被支付或已取消，不要再回滚库存两次。关单回补库存也要防重复：用 `order_event` 或 `stock_restore_log` 唯一记录。

集群部署时，定时任务要防多实例重复跑：用 ShedLock、XXL-Job 调度中心，或数据库锁。

---

# 10. WebSocket 新订单提醒

商家端不能靠每秒刷新待接单列表。用户支付成功后，服务端推送：

```text
topic: /merchant/{merchantId}/orders
message: {type:"NEW_ORDER", orderId, orderNo, amount, createdAt}
```

学习要点：

- WebSocket 是长连接，服务端可主动发消息；HTTP 是请求-响应。
- 登录鉴权要在握手时做，连接建立后也要防订阅别的商家 topic。
- 推送只是提醒，不能作为数据权威来源；商家刷新仍调 `/merchant/orders/pending`。
- 断线重连、消息丢失要靠拉取兜底，不要假设推送一定到达。

---

# 11. 报表：运营端为什么 SQL 会变复杂

常见报表：今日营业额、订单量、客单价、菜品销量 TopN、取消率、按小时订单分布。

设计建议：

- 明细查询走 `order_main/order_item` 索引；大报表不要直接扫在线库高峰。
- 预聚合表：`order_daily_stat(merchant_id, stat_date, order_cnt, gmv, cancel_cnt)`，每天凌晨汇总。
- 导出走异步：生成文件到 OSS，完成后给下载链接，别让导出大 Excel 把 HTTP 请求挂 5 分钟。
- 金额统计口径要统一：GMV 是否含配送费？是否扣券？退款是否扣减？报表烂尾常因口径没写清。

---

# 12. 分阶段学习路线

## 阶段一：JavaWeb 复刻（不用 Spring）

目标：真正理解 Spring 替你做了什么。

- 用 Servlet 实现 `/user/login`、`/merchants`、`/orders` 三个接口。
- 手动解析 JSON，手动 JDBC，手动事务。
- 手动做登录 Cookie/Session。
- 手动处理 400/404/409/500。

完成后你会很痛苦：每个接口都重复读 body、转 JSON、开连接、try/catch、映射状态码。这个痛苦是理解 Spring Boot 的燃料。

## 阶段二：Spring Boot 重写最小闭环

把阶段一项目改成 Spring Boot：

- `@RestController` 替代 Servlet。
- `@RequestBody/@Valid` 替代手动解析和校验。
- `@Service` + 构造器注入替代 new。
- `@Transactional` 替代手动事务。
- `@RestControllerAdvice` 替代每个接口 try/catch。
- `application.yml` 管理端口、数据源、Redis。
- Actuator 暴露 health。

验收：同样功能代码量明显下降，但你能说出每个注解背后对应原来哪段样板。

## 阶段三：加真实复杂度

- Redis：验证码、菜品缓存、下单限流、分布式锁。
- 消息：OrderPaid/OrderCreated 事件，消费者幂等。
- 定时任务：超时关单，防多实例重复。
- WebSocket：商家新订单提醒，HTTP 拉取兜底。
- 文件：菜品图片上传 OSS，本地学习可先用 MinIO。
- 报表：日报表预聚合 + Excel 导出。

## 阶段四：生产化与面试表达

- 统一错误模型、traceId、结构化日志。
- Prometheus 指标：下单成功率、支付回调延迟、消息积压、缓存命中率。
- Docker Compose 起 MySQL/Redis/MQ/MinIO。
- 压测下单接口，观察连接池、慢 SQL、Redis、GC。
- 写一份设计文档：状态机、幂等、超卖、缓存一致性、消息可靠性、权限边界。

---

# 13. 关键面试问题用这个项目怎么答

**问：如何防超卖？**  
答：下单不以前端查询库存为准，提交时用原子 SQL 扣减 `update dish set stock=stock-? where id=? and stock>=?`，影响行数 0 即失败；同事务生成订单和明细；超时关单回补库存要做唯一回补记录防重复回补；热点菜品可再加分桶库存或 Redis 预减 + 异步落库，但学习期先把数据库原子方案做扎实。

**问：支付回调怎么保证可靠？**  
答：回调是外部系统主动通知，必须验签、金额核对、幂等。核心状态迁移和支付流水、outbox 在一个本地事务；后续通知商家、履约走消息。消费端按 eventId 去重，失败重试，进死信可人工处理。不能因推送商家失败让支付回调失败。

**问：订单为什么要快照？**  
答：菜品会改名改价下架，地址会改，但历史订单是履约和售后事实，必须保存下单时名称、单价、图片、收货信息、优惠明细。改菜品不应改写历史。

**问：缓存一致性怎么做？**  
答：区分数据类型。菜品详情读多写少，先更 DB 再删缓存，TTL 加抖动，空值短缓存防穿透，热点重建加互斥；订单状态是强一致事实，不依赖缓存，缓存只可做极短展示优化，不能当权威。

**问：为什么先单体不微服务？**  
答：业务边界未稳定时拆服务，会把本地方法调用变成分布式调用，带来网络、事务、消息、观测成本。先在单体里按用户/商家/订单/支付划模块，接口和数据所有权清楚，出现独立扩容或团队边界再拆。

---

# 14. 你现在的下一步作业

不要直接找完整源码从头读到尾。按这个顺序做：

1. 画出外卖系统角色、核心表、订单状态机，写到纸上或 README。
2. 用 Spring Boot 只实现：登录模拟、商家/菜品查询、购物车、提交订单、模拟支付回调、商家接单。
3. 给“提交订单”和“支付回调”各写 5 个测试：正常、参数错、库存不足、重复提交、并发超卖/重复回调。
4. 加 Redis：验证码 + 菜品详情缓存 + 下单限流，只加这三样。
5. 加超时关单，重点处理“关单与支付回调同时发生”。
6. 最后加 WebSocket 和报表，把可观测性补齐。

每完成一步，回到前面的两份教程找对应概念：这一步用到了 HTTP 的什么？Servlet 的什么？Spring Boot 自动配置的什么？事务、缓存、消息各解决了什么失败模式？这样学，项目才不是抄完就忘。
