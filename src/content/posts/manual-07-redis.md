---
title: "用「黑马点评」式项目学 Redis：从缓存到秒杀到 Feed 流"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 07 册：缓存、秒杀、Feed 流等 Redis 核心场景。"
tags: ["Java","Redis"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 定位：这是一份 Redis 学习手册，用“点评/探店/团购秒杀”业务串起 Redis 核心能力。不复制现成项目源码；所有示例为教学伪代码或可改写示例。  
> 前置：你已经懂 Java 语法，最好看过前面的 JavaWeb/Spring Boot 入门内容。  
> 核心学法：每学一个 Redis 数据结构，都问三件事——它替代了什么慢操作？它带来什么一致性问题？挂了/满了/并发时怎么办？

---

# 0. 点评业务里 Redis 到底解决什么

一个点评/本地生活系统常见功能：

- 手机号验证码登录。
- 首页推荐、商户列表、商户详情、优惠券详情。
- 商户点评、点赞、收藏、关注。
- 附近商户：按地理位置查。
- 秒杀优惠券：限量、一人一单、防超卖、防黄牛。
- 签到、连续签到、UV/PV 统计。
- 关注 Feed：我关注的人发了笔记，我的收件箱要能刷到。
- 排行榜：热门商户、热门笔记、达人榜。

如果只用 MySQL：

- 高频读详情会把数据库打满。
- 秒杀库存扣减会压垮行锁。
- 点赞/关注/Feed 写扩散会让大 V 发笔记时写爆。
- UV 统计如果精确落库，成本极高。
- 验证码、限流、分布式锁都不适合放关系库做高频操作。

Redis 的价值不是“快”这么简单，而是提供了几类数据库不擅长或很贵的原语：内存 KV、过期时间、原子计数、Set/ZSet、Geo、Bitmap/HyperLogLog、Pub/Sub 与 Stream、Lua 原子脚本、分布式锁生态。

代价也很明确：数据在内存，可能丢；缓存和 DB 可能不一致；热 key、大 key、缓存击穿、穿透、雪崩；分布式锁有边界；消息可能重复；高可用和集群带来新复杂度。

---

# 1. Redis 基础：把命令当成业务原语

## 1.1 String：不只是字符串

业务用法：

- 验证码：`sms:code:{phone} = 123456`，TTL 5 分钟。
- 登录 token：`login:token:{token} = userId`，TTL 30 分钟。
- 详情缓存：`shop:{id} = json`，TTL 30 分钟。
- 计数：`note:{id}:like = 1024`。
- 分布式锁：`lock:order:{userId} = requestId`，`SET NX PX`。

关键命令：`GET/SET/DEL/INCR/EXPIRE/SET NX PX/GETSET`。

为什么原子：`INCR` 是单命令原子，等价于“读-改-写”不被插队。Java 里 `count++` 不是原子，Redis 单命令是。

## 1.2 Hash：对象的局部字段

- 用户会话：`session:{token}` 存 userId、role、expireAt。
- 配置项、表单草稿。
- 优点：改一个字段不用读改写整个 JSON；缺点：字段级过期不如 key 级自然，序列化协议要谨慎。

## 1.3 List：简单队列和时间线

- 小规模任务队列、最近评论列表。
- `LPUSH + LTRIM` 做“最新 N 条”。
- 真消息队列不要长期只靠 List；需要 ack、重试、消费者组用 Stream 或专业 MQ。

## 1.4 Set：去重与关系

- 点赞集合：`note:{id}:likes` 存 userId。
- 关注集合：`user:{id}:follows`、`user:{id}:fans`。
- 共同关注：`SINTER`。
- 是否点赞：`SISMEMBER`，比查库快且天然去重。

## 1.5 ZSet：带分数的排序

- 排行榜：`rank:hot:note`  member=noteId，score=热度。
- 延迟任务：member=taskId，score=执行时间戳，`ZRANGEBYSCORE` 扫到期任务。
- Feed 收件箱：`feed:inbox:{userId}`，member=noteId，score=发布时间戳。

## 1.6 Geo：附近的人/店

- `GEOADD shop:geo lng lat shopId`
- `GEOSEARCH shop:geo FROMLONLAT lng lat BYRADIUS 5 km ASC COUNT 20`

学习期可直接用 Redis Geo；生产要评估数据量、精度、分片、与搜索系统边界。

## 1.7 Bitmap / HyperLogLog：统计利器

- 签到：`sign:{userId}:{yyyyMM}`，第几天对应 bit。
- 连续签到：从当天往前找连续 1；Redis 位操作配合本地计算。
- UV：`PFADD uv:note:{id}:{date} userId`，`PFCOUNT` 估算。HyperLogLog 是近似，标准差约 0.81%，换来极低内存；不能接受近似就别用。

---

# 2. 登录：验证码与 token 的正确姿势

## 2.1 发送验证码

流程：

1. 校验手机号格式。
2. 限流：同手机号 1 分钟只能发 1 次，同 IP 一天限制次数。
3. 生成 6 位随机码。
4. 写 Redis：`SET sms:code:13800000000 482913 NX EX 300`。
5. 调短信通道；学习期打印日志。

失败模式：

- 不限制发送频率：短信轰炸和成本攻击。
- 验证码永久有效：撞库风险。
- 验证码存 DB 且高频写：没必要。

## 2.2 校验登录

```text
输入 phone + code
code 不存在或不等 → 400/401
成功 → 删除 code，生成 token
SET login:token:{token} userId EX 1800
返回 token
```

为什么删除验证码：防重放。为什么 token 存 Redis：可主动踢下线、可续期、可集中控制；代价是每次请求要查 Redis，且 Redis 故障影响登录态。JWT 是无状态替代，但主动吊销困难。学习期先用 Redis token 理解“服务端可控会话”。

## 2.3 拦截器刷新有效期

每次请求带 token：

- token 不存在：401。
- 存在：取 userId，放入请求上下文；若剩余 TTL 小于阈值可续期。
- 注意并发续期不要每次请求都 `EXPIRE` 造成写放大；可阈值续期，例如剩余小于 10 分钟才刷新到 30 分钟。

---

# 3. 商户详情缓存：先学“读多写少”的基本功

场景：商户详情被高频访问，DB 查询慢且重复。

## 3.1 基础缓存

```java
public Shop getShop(long id) {
  String key = "shop:" + id;
  String json = redis.get(key);
  if (json != null) {
    if ("NULL".equals(json)) return null; // 缓存空值防穿透
    return parse(json);
  }
  Shop shop = shopMapper.selectById(id);
  if (shop == null) {
    redis.setex(key, 120, "NULL"); // 空值短 TTL
    return null;
  }
  redis.setex(key, 1800 + random(300), toJson(shop)); // TTL 加抖动
  return shop;
}
```

## 3.2 三大问题

### 缓存穿透：查一个不存在的数据，每次都打到 DB

解决：缓存空值短 TTL；入口参数校验；布隆过滤器拦截明确不存在的 id。空值简单有效，布隆过滤器适合 id 空间大且恶意请求多，但有误判和删除维护成本。

### 缓存击穿：热点 key 过期瞬间，大量请求同时重建

解决：

- 互斥锁：只有一个请求查库重建，其他短暂等待或返回旧值。
- 逻辑过期：value 里带 expireAt，不设置 Redis TTL；发现逻辑过期后，单个线程异步重建，其他先返回旧数据。

互斥锁稳但可能等待；逻辑过期体验好但可能读到旧值。秒杀、详情页可接受短暂旧值；资金、库存不能接受。

### 缓存雪崩：大量 key 同时过期或 Redis 宕机

解决：TTL 加随机抖动；热点数据不全部同时失效；多级缓存；熔断降级；Redis 高可用；核心接口有 DB 兜底与限流。

## 3.3 更新一致性

推荐写路径：先更新 DB，再删除缓存。为什么不是更新缓存：并发写会让缓存覆盖成旧值；为什么不是先删缓存再写 DB：删完后写库前，另一个读请求可能把旧值回填。先写 DB 再删缓存仍有小窗口，但简单可靠；强一致场景加版本号、binlog 订阅、延迟双删或读写串行化，但要明白这些都是降低概率而非免费强一致。

---

# 4. 点赞、收藏、关注：Set 是天然模型

## 4.1 点赞

需求：用户对笔记点赞/取消，显示点赞数，判断是否已赞，防重复。

Redis：

```text
SADD note:100:likes 1     -> 用户1点赞
SREM note:100:likes 1     -> 取消
SISMEMBER note:100:likes 1 -> 是否点赞
SCARD note:100:likes      -> 数量
```

持久化策略：

- 方案 A：Redis 权威，定时批量同步 MySQL。快，但丢数据风险要评估。
- 方案 B：MySQL 权威，Redis 做加速。写 DB 成功后再改 Redis；失败要补偿。
- 学习建议：先 B 保证正确，再体会 A 的性能诱惑与风险。

## 4.2 关注与共同关注

```text
user:1:follows = {2,3,4}
user:2:fans    = {1,9}
SINTER user:1:follows user:2:follows -> 共同关注
```

大 V 粉丝集合很大时不要一次 `SMEMBERS` 全取；用 `SSCAN` 分批。共同关注在好友推荐里有用，但别把大集合交集放在请求主路径高并发执行，可预计算或异步。

## 4.3 排行榜热度

笔记热度可以粗算：

```text
score = like*5 + comment*8 + collect*10 + view*1 - hoursSincePublish*decay
```

更新：`ZINCRBY rank:note:hot delta noteId`。不要每次浏览都写 DB；浏览量先 Redis 计数，异步汇总。排行榜分页用 `ZREVRANGE key start end WITHSCORES`。

---

# 5. GEO 附近商户：五分钟做出“附近”

```bash
GEOADD shop:geo 116.397128 39.916527 1001
GEOSEARCH shop:geo FROMLONLAT 116.40 39.91 BYRADIUS 5 km ASC COUNT 20
```

返回的 shopId 再批量查详情：先 Redis `MGET shop:{id}`，缺失回源 DB。注意：

- Geo 只解决“附近候选”，不解决营业状态、品类筛选、评分排序；可拿到候选后过滤，或预置城市/商圈分 key。
- 数据量大、实时排序复杂、文本搜索强时，专业搜索/空间数据库更合适。
- 商户搬家要更新 Geo；删除商户要 `ZREM shop:geo shopId`。

---

# 6. 签到与统计：Bitmap 和 HyperLogLog

## 6.1 签到

key：`sign:{userId}:{yyyyMM}`，bit offset 用“日期-1”。

```text
SETBIT sign:1:202608 20 1   # 8月21日签到
GETBIT sign:1:202608 20     # 是否签
BITCOUNT sign:1:202608      # 本月签到天数
```

连续签到：从当天 offset 往前读 bit，遇到 0 停止。学习期可把整月 bitmap 取出来本地算；数据量小且按用户按月分 key，成本低。

补签要谨慎：补签卡、次数限制、事务性（扣卡 + 置位）要设计，别把补签做成无限改历史。

## 6.2 UV 统计

```text
PFADD uv:note:100:20260821 userId
PFCOUNT uv:note:100:20260821
```

要强调：HyperLogLog 是近似去重计数。产品说“大概多少访问”可用；财务结算、精确发放奖励不可用。

---

# 7. 分布式锁：什么时候该用，怎么用得不出事

点评项目里锁常用于：一人一单、缓存重建互斥、定时任务防重复、库存预减保护。

## 7.1 最小正确锁

```text
SET lock:seckill:user:1: voucher:20 requestId NX PX 30000
```

含义：key 不存在才设置成功；value 是本次请求唯一 ID；过期 30 秒防死锁。

释放必须 Lua 原子：

```lua
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
```

为什么：不能先 `GET` 判断再 `DEL`，中间锁可能过期被别人拿到，你会误删别人的锁。

## 7.2 常见误区

- 没过期时间：服务宕机死锁。
- 锁 value 不唯一：误删他人锁。
- 业务执行时间超过锁 TTL：需要 watchdog 续期（Redisson 思路）或缩短临界区；但续期也不是银弹，GC 长暂停仍可能出问题。
- 用锁解决所有并发：能数据库原子更新就别上锁；能消息串行化就别全局锁。

## 7.3 锁不是一致性本身

一人一单更稳的兜底是数据库唯一约束：`(voucher_id, user_id)` 唯一。Redis 锁用于提前挡流量、减少 DB 冲突；最终正确性由唯一索引/状态机保证。这个思路贯穿秒杀：Redis 降噪，DB 兜底。

---

# 8. 秒杀优惠券：把“快”和“对”拆开设计

需求：限量券开抢，一人一单，不能超卖，高并发下接口不能崩。

## 8.1 只做 DB 会怎样

所有请求打到 DB：行锁竞争库存、唯一索引冲突、连接池耗尽、响应雪崩。正确但慢，体验差。

## 8.2 Redis 预检 + Lua 原子

抢券前把资格和库存放 Redis：

```text
seckill:stock:{voucherId} = 100
seckill:users:{voucherId} = Set(userId)  # 已抢到的人
```

Lua 原子判断：

```lua
-- KEYS[1]=stockKey KEYS[2]=usersKey ARGV[1]=userId
if redis.call('sismember', KEYS[2], ARGV[1]) == 1 then
  return 2 -- 已抢过
end
local stock = tonumber(redis.call('get', KEYS[1]) or '-1')
if stock <= 0 then
  return 1 -- 没库存
end
redis.call('decr', KEYS[1])
redis.call('sadd', KEYS[2], ARGV[1])
return 0
```

为什么用 Lua：判断“没抢过 + 有库存 + 扣库存 + 记用户”必须原子，拆成多条 Redis 命令会被并发插队。

## 8.3 抢到之后怎么办

Lua 成功只代表“获得下单资格”，不该在高并发请求里同步落库。常见做法：

1. Lua 预减成功，生成 orderId，投递消息：`voucherOrder{orderId,userId,voucherId,expireAt}`。
2. 立即返回“抢购中/成功受理”，前端轮询或 WebSocket 通知结果。
3. 消费者创建订单：DB 唯一约束 `(voucherId,userId)` 防重复，库存表最终扣减或对账，写订单事件。
4. 超时未支付关闭：释放 Redis 资格或 DB 状态迁移；释放要幂等，防把别人后续资格误释放。

学习期可同步落库以便理解；进阶必须改成异步，并明确“Redis 预减”和“DB 最终一致”的差异与对账。

## 8.4 防黄牛与限流

- 接口层：同 user/IP/设备指纹限流；活动开始前隐藏真实地址或签名。
- 资格层：一人一单 Set；黑名单；风险评分。
- 时间层：开始时间服务器端判断，不信任客户端。
- 数据层：库存预热，避免开抢瞬间从 DB 加载。

## 8.5 失败补偿清单

- Lua 成功但发 MQ 失败：可用本地 outbox，或把资格状态写成“待确认”，后台对账。
- MQ 消费失败：重试 + 死信；消费幂等靠 orderId 唯一和 `(voucherId,userId)` 唯一。
- 用户抢到不支付：超时关单释放资格；释放动作要判断订单仍是未支付。
- Redis 宕机：降级为直接 DB 抢或活动暂停；关键是用演练决定，不要上线当天才想。

---

# 9. Feed 流：关注的人发笔记，我怎么刷到

这是点评/社区系统最能拉开差距的地方。两种经典模式：

## 9.1 推模式（写扩散）

作者发笔记时，把 noteId 推到每个粉丝收件箱：

```text
ZADD feed:inbox:{fanId} publishTimestamp noteId
```

优点：读快，粉丝刷自己的 inbox 即可。  
缺点：大 V 粉丝几百万时，一次发笔记写几百万个 key，写爆炸。

适合：普通用户、中小作者、可控粉丝量。

## 9.2 拉模式（读扩散）

粉丝刷 Feed 时，临时取所有关注作者的最新笔记合并排序。  
优点：发笔记只写作者 outbox，写轻。  
缺点：关注很多人时读放大，实时合并贵。

适合：大 V、关注关系巨大、读少写多场景。

## 9.3 推拉结合

现实系统常混合：

- 普通作者：推给粉丝 inbox。
- 大 V：只写自己的发件箱 `feed:outbox:{authorId}`，粉丝读时拉取大 V outbox 合并普通 inbox。
- inbox 只保留最近 N 条：`ZADD` 后 `ZREMRANGEBYRANK inbox 0 -1001` 或按时间裁剪。
- 已读/推荐/广告另走通道，别把所有内容塞一个收件箱。

学习项目建议：先实现推模式，粉丝数限制在 1000；再模拟一个“百万粉大 V”改为拉模式，对比发笔记耗时与刷 Feed 耗时。你会真正理解“没有最好，只有读写比例匹配”。

---

# 10. Redis 消息能力：Pub/Sub、List、Stream 怎么选

- Pub/Sub：发布订阅，简单实时提醒；不持久化，消费者不在线就丢。适合“新订单响铃”这类可丢失提醒，权威数据仍靠拉取。
- List：`LPUSH + BRPOP` 可做阻塞队列；但没有完善 ack、重试、消费者组，容易在崩溃时丢或重复。
- Stream：有消息 ID、消费者组、pending、ack，更接近轻量 MQ。学习秒杀异步订单可用 Stream；生产复杂生态常选 RabbitMQ/Kafka。

用 Stream 最小模型：

```text
XADD voucher:orders * orderId 1 userId 1 voucherId 20
XGROUP CREATE voucher:orders g1 0 MKSTREAM
XREADGROUP GROUP g1 c1 COUNT 10 BLOCK 5000 STREAMS voucher:orders >
...处理...
XACK voucher:orders g1 <id>
```

消费者崩溃后，pending 中的消息可被 `XCLAIM` 接管；这就是 List 简单队列缺的“可靠性语义”。

---

# 11. 工程化：key 设计、序列化、内存与高可用

## 11.1 key 设计

统一风格：

```text
业务:子业务:{维度}:...
sms:code:{phone}
login:token:{token}
shop:{id}
seckill:stock:{voucherId}
note:{id}:likes
feed:inbox:{userId}
```

原则：可读、带维度、避免过长、避免热 key 集中。大促前找热 key：监控、`--hotkeys`（需合适配置）、采样日志。大 key 要拆：一个超大 Set/Hash 会影响删除、迁移和集群 slot。

## 11.2 序列化

- 业务缓存建议 JSON，可读性好；注意字段演进兼容。
- 不要随意改类名/字段名导致旧缓存反序列化失败；加 schemaVersion 或兼容字段。
- 大对象拆分；别把整个商户带菜单带评论塞一个 key。
- 本地缓存 + Redis 多级缓存时，失效广播要考虑一致性。

## 11.3 内存与淘汰

设置 `maxmemory` 和淘汰策略。缓存场景常用 `allkeys-lru`/`volatile-lru` 类策略；有重要数据（如锁、会话）要区分实例或 DB，不要和纯缓存混在一个随便淘汰的空间。上线前估算：key 数量 × value 大小 × 副本 × 碎片系数，留水位。

## 11.4 高可用与集群

- 主从 + Sentinel：故障转移；客户端要处理重连和短暂不可用。
- Cluster：数据分片到 slot；跨 slot 多 key 操作受限，Lua 的 key 要在同 slot，可用 hash tag 如 `seckill:{1001}:stock` 与 `seckill:{1001}:users` 同 tag。
- 持久化：RDB 快但可能丢窗口；AOF 更稳但更重。纯缓存可弱持久化，会话/资格类要谨慎。
- 缓存不是数据库：可丢数据必须能重建；不可丢数据不要只放 Redis。

---

# 12. 分阶段练习路线

## 阶段 A：基础命令业务化

1. 验证码登录：发送限流、5 分钟过期、登录成功删除 code、token 30 分钟、阈值续期。
2. 商户详情缓存：空值防穿透、TTL 抖动、更新 DB 后删缓存。
3. 点赞/关注：Set 去重、SCARD 计数、共同关注 SINTER、SSCAN 分批。

验收：能解释每个 key 的 TTL、失败时用户看到什么、Redis 挂了怎样降级。

## 阶段 B：击穿、锁、GEO

1. 热点商户详情做逻辑过期，模拟 100 并发同时过期，观察 DB 只有一次回源。
2. 手写 `SET NX PX` + Lua 释放锁，再故意演示误删锁：用唯一 value 前后的差异。
3. GEO 导入 1 万商户，按经纬度查附近，再用 MGET 批量回填详情。

验收：压测时 DB QPS 不飙升；锁在业务超时、服务宕机时不死锁、不误删。

## 阶段 C：秒杀

1. 库存和一人一单预热到 Redis。
2. Lua 原子预减 + 记用户。
3. 同步落库版先做对；再改 Stream/MQ 异步版。
4. 超时未支付释放资格；释放幂等。
5. 故意制造重复消费、Redis 预减成功但落库失败，写补偿/对账。

验收：超卖为 0；一人一单由 DB 唯一约束兜底；重复请求/重复消息不产生重复订单；高并发下接口快速失败而不是拖死。

## 阶段 D：Feed 与统计

1. 普通作者推模式 inbox，限制最近 500 条。
2. 大 V 拉模式 outbox，读时合并；对比发笔记和刷 Feed 耗时。
3. Bitmap 签到、连续签到；HyperLogLog 做 UV，说明误差边界。
4. ZSet 热度榜，浏览量异步汇总。

验收：能根据粉丝量和读写比例选择推/拉/混合；能说明 Feed 是“近似实时、可裁剪、可重建”，不是财务级强一致。

---

# 13. 面试高频：用点评业务答 Redis

**问：为什么用 Redis 做登录 token？和 JWT 区别？**  
答：Redis token 服务端可控，支持踢下线、续期、集中风控；代价是每次请求查 Redis，Redis 故障影响面大。JWT 无状态、易扩展，但吊销和权限即时变更弱。点评登录态要强风控，可用 Redis token 或短 JWT + Redis 黑名单/版本号。

**问：商户缓存怎么保证一致？**  
答：读走 cache-aside，空值短 TTL 防穿透；写先更 DB 再删缓存；TTL 抖动防雪崩；热点逻辑过期 + 互斥重建防击穿。要承认这是最终一致，强一致字段不能依赖缓存。

**问：秒杀如何不超卖？**  
答：分层：入口限流和风控降噪；Lua 原子完成“未买过 + 有库存 + 预减 + 记录”；消息异步落库；DB 唯一约束一人一单、库存原子扣减兜底；超时关单幂等释放；对账修正 Redis 与 DB 偏差。核心原则：Redis 负责快和挡流量，DB 负责最终正确。

**问：分布式锁安全吗？**  
答：安全是条件性的。要 `SET NX PX`、唯一 value、Lua 释放、临界区小于 TTL 或有续期、监控锁等待。即便 Redisson，也要面对 GC 长暂停、时钟、主从切换边界。能不用锁就不用；必须用时，业务正确性仍由唯一约束/状态机兜底。

**问：大 V 发笔记为什么写扩散会炸？**  
答：写扩散把一次发文放大成粉丝数次写，大 V 场景写 QPS 与存储爆炸；读扩散把成本转移到刷新时，关注多则读放大。工程上用推拉结合：普通作者推，大 V 拉，inbox 限长裁剪，读路径异步预计算热点。

---

# 14. 一页纸记忆

- String：验证码、token、计数、锁；`SET NX PX` 和 `INCR` 是原子朋友。
- Hash：对象局部字段；别滥用到丢失过期语义。
- Set：点赞/关注/去重；大集合用 SSCAN。
- ZSet：排行榜、延迟任务、Feed inbox；记得裁剪。
- Geo：附近候选；不是完整搜索引擎。
- Bitmap/HLL：签到、UV；HLL 是近似。
- Lua：把“判断 + 修改”打包成原子。
- 锁：`SET NX PX` + 唯一值 + Lua 释放；DB 唯一约束兜底。
- 缓存：空值防穿透，互斥/逻辑过期防击穿，TTL 抖动防雪崩。
- 秒杀：Redis 预检降噪，MQ 削峰，DB 保正确，对账收尾。
- Feed：普通推，大 V 拉，inbox 限长，热点预计算。

真正学会 Redis 的标志：看到一个需求，能先说“不该用 Redis 的部分是什么”，再说“该用的那部分失败时怎么兜底”。
