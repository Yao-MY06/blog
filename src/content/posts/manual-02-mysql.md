---
title: "MySQL 详细教程：从 DDL/DML/DQL 到后端项目实战"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 02 册：MySQL 从建库建表到多表查询与后端实战。"
tags: ["Java","MySQL"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 适合：会 Java 语法，正在学 JavaWeb/Spring Boot，需要把 MySQL 学扎实。  
> 讲法：不只讲 SQL 语法，还讲“为什么这么设计、Java 代码怎么用、并发会出什么事”。  
> 业务载体：外卖/点评项目：用户、商家、菜品、订单、支付、库存、优惠券、点评、签到。  
> 版本建议：学习用 MySQL 8.x；字符集统一 `utf8mb4`，时区、排序规则、大小写敏感先在团队内统一。

---

# 0. 先建立后端视角：MySQL 在系统里负责什么

MySQL 不是“存数据的文件”，它是你系统里最贵的一致性资源。Redis 可以重建，MQ 可以重放，搜索索引可以再刷，但订单、支付、库存、用户资产错了就是事故。

后端开发要时刻记住三类问题：

1. **结构**：表怎么设计，字段类型、约束、索引怎么选。对应 DDL。
2. **写入**：insert/update/delete 怎么保证不脏、不重、不超卖。对应 DML + 事务 + 锁 + 唯一约束。
3. **读取**：查询怎么快，分页怎么不炸，报表怎么不拖垮在线库。对应 DQL + 索引 + 执行计划。

口诀：**约束兜底正确性，索引决定速度，事务保护一组写入，锁和隔离级别决定并发行为，执行计划证明你没骗自己。**

---

# 1. 数据库与图形化工具

## 1.1 数据库操作

```sql
create database shop default charset utf8mb4 collate utf8mb4_0900_ai_ci;
use shop;
show databases;
show tables;
drop database shop; -- 危险，学习库以外别手滑
```

建议：

- 一个项目一个库，至少逻辑边界清楚；不要所有项目挤一个库。
- 库名、表名、字段名小写下划线：`order_main`、`order_item`。
- 不要把生产 `drop/truncate` 权限给应用账号；应用账号只要需要的库和表的 CRUD。

## 1.2 图形化工具与命令行

图形化：DataGrip、DBeaver、Navicat、IDEA Database。命令行：`mysql -h -u -p`。学习建议：GUI 看结构方便，但 DDL/DML 必须能手写；线上变更要脚本化、可评审、可回滚。

## 1.3 连接配置直觉

Java 连接串常见参数：

```text
jdbc:mysql://localhost:3306/shop?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8mb4&rewriteBatchedStatements=true
```

注意：时区要统一，建议应用、DB、JVM、服务器都明确；时间字段团队统一 `datetime` 还是 `timestamp`，别混用到不知道是谁在转换。

---

# 2. DDL：表结构就是系统契约

DDL 管结构：create/alter/drop/truncate。后端最重要的是：字段类型、约束、索引、默认值、是否允许 null。

## 2.1 创建表：以用户表为例

```sql
create table user (
  id bigint primary key auto_increment comment '用户ID',
  phone varchar(20) not null comment '手机号',
  nickname varchar(50) not null default '' comment '昵称',
  avatar varchar(255) not null default '' comment '头像',
  status tinyint not null default 1 comment '1正常 0禁用',
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  unique key uk_phone (phone)
) engine=InnoDB comment='用户表';
```

这段包含很多后端意识：

- 主键用 `bigint auto_increment` 学习够用；分布式可考虑雪花/号段，但别一开始复杂化。
- `phone` 加唯一约束：数据库兜底，不靠代码判断。
- `status` 用 tinyint 表示状态，但 Java 侧用枚举，不要满屏魔法数。
- `created_at/updated_at` 几乎每表都要；审计和问题定位都靠它。
- 尽量 `not null` + 默认值；null 会让索引、比较、统计变复杂。
- 引擎 InnoDB；学习项目不用碰 MyISAM。

## 2.2 数据类型怎么选

| 场景    | 推荐                        | 为什么                           |
| ----- | ------------------------- | ----------------------------- |
| 主键/外键 | bigint                    | 业务增长后 int 可能不够；统一类型减少 join 转换 |
| 金额    | decimal(10,2) 或 bigint 存分 | 不要用 float/double 算钱           |
| 状态    | tinyint + Java 枚举         | 存储小；代码侧可读                     |
| 短字符串  | varchar(n)，n 别乱给 255      | 过长影响索引、排序、内存估计                |
| 手机号   | varchar(20)               | 不是数字，可能含区号/前导 0，不参与运算         |
| 正文/备注 | varchar/text 按长度          | 大文本别和热点行混设计，详情可拆表             |
| 时间    | datetime 或 timestamp 统一   | timestamp 有时区与范围特性；团队先统一      |
| JSON  | json                      | 可变扩展字段可用，但高频过滤字段别藏 JSON 里     |
| 布尔    | tinyint(1) 或 boolean 别名   | Java 映射 boolean，DB 仍 tinyint  |

金额重点：外卖订单金额建议统一“分”存 bigint，展示层转元；如果团队习惯 decimal，也要全系统统一，不要一边分一边元。

## 2.3 约束：正确性的最后防线

- primary key：行身份。
- unique key：手机号、订单号、支付流水号、一人一单。
- foreign key：学习期可理解；高并发互联网项目常弱外键，用应用约束 + 对账。不是不要正确性，而是把级联写死可能带来锁与运维成本。
- not null/default：减少三态逻辑。
- check：MySQL 8 支持，但团队要统一是否使用；很多规则仍在服务层做可读性更好。

关键认知：**代码校验是体验，数据库约束是底线。** 比如优惠券一人一单，代码判断会有并发窗口，唯一索引才兜底。

## 2.4 修改表

```sql
alter table user add column email varchar(100) null after phone;
alter table user add index idx_status_created (status, created_at);
alter table user modify nickname varchar(80) not null default '';
alter table user drop column email;
```

生产变更原则：

- 先加字段，发布代码兼容旧新，再回填，再切读，最后删旧字段。
- 大表加索引/改字段可能锁表或耗时长；低峰、在线 DDL 工具、评估 rows。
- 所有变更脚本化进 Flyway/Liquibase，不许手工登录生产点两下。

## 2.5 设计表案例：商家与菜品

```sql
create table merchant (
  id bigint primary key auto_increment,
  name varchar(80) not null,
  logo varchar(255) not null default '',
  phone varchar(20) not null default '',
  status tinyint not null default 1 comment '审核状态',
  open_status tinyint not null default 1 comment '营业状态',
  city varchar(50) not null default '',
  address varchar(255) not null default '',
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  index idx_city_status (city, status)
) engine=InnoDB;

create table dish (
  id bigint primary key auto_increment,
  merchant_id bigint not null,
  category_id bigint not null default 0,
  name varchar(80) not null,
  price bigint not null comment '单位分',
  image varchar(255) not null default '',
  stock int not null default 0,
  status tinyint not null default 1 comment '1上架0下架',
  version int not null default 0,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  index idx_merchant_status (merchant_id, status),
  index idx_merchant_category (merchant_id, category_id)
) engine=InnoDB;
```

设计说明：菜品一定带 `merchant_id`，因为绝大多数查询都是“某商家的上架菜品”；`version` 给乐观锁；价格以后端 DB 为准，不信前端传值。

## 2.6 查询/修改/删除结构对象

```sql
show create table dish;
desc dish;
alter table dish drop index idx_merchant_category;
drop table if exists temp_dish; -- 只建议临时表
truncate table temp_dish;       -- 清空并重置自增，危险
```

`delete` 是删行可回滚（在事务里）、`truncate` 是快速清空且通常重置自增、不可按 where。生产别用 truncate 当“清空测试数据”按钮。

---

# 3. DML：写数据要想到并发

DML：insert/update/delete。学习时只写对一行不难，难的是高并发下还正确。

## 3.1 insert

```sql
insert into user(phone, nickname) values ('13800000000', 'tom');
insert into user(phone, nickname)
values ('13800000001','a'),('13800000002','b');
```

重复处理：

```sql
insert into user(phone, nickname) values ('13800000000','tom')
on duplicate key update nickname = values(nickname);
```

要谨慎：`on duplicate key update` 可能掩盖“本来想报错”的业务冲突。注册手机号重复，通常应返回冲突，而不是顺手改昵称。

## 3.2 update：防超卖核心

错误：先查库存再扣减。

```text
select stock from dish where id=1; -- 读到 1
-- 并发另一个请求也读到 1
update dish set stock=0 where id=1;
```

两个请求都以为有货，超卖。

正确：让数据库原子判断。

```sql
update dish
set stock = stock - #{qty}, version = version + 1
where id = #{id} and stock >= #{qty} and status = 1;
```

Java 看影响行数：1 成功，0 失败。这里的重点是“判断和修改在同一条 SQL 里完成”，不给并发插队窗口。这也解释了为什么 Spring 事务里远程调用危险：你占着行锁/连接去等网络，别的请求全排队。

## 3.3 delete

尽量少物理删除业务事实。订单、支付、点评更适合状态字段：`status=CANCELLED/REFUNDED`。真删除用于日志、临时、明文过期数据。需要软删就统一字段：`deleted` 或 `status`，并在唯一约束设计时考虑，例如“同一手机号历史注销后能否再注册”。

## 3.4 批量写与 rewriteBatchedStatements

批量插入用 JDBC batch 或 MyBatis `foreach`，连接串开 `rewriteBatchedStatements=true` 可显著减少 round trip。批量也有上限：几千一批准比一次十万稳；太大单事务会占锁、redo、复制延迟。

---

# 4. DQL：查询语法到执行计划

DQL 是 select。学习顺序：基本查询 → 条件 → 聚合分组 → 排序分页 → 多表 join → 子查询 → 执行计划。

## 4.1 基本查询

```sql
select id, name, price from dish;
select * from dish; -- 项目里少写 *，读不需要的列浪费 IO/内存/网络
```

别习惯 `select *`：加字段后可能把大 text 查出来；覆盖索引也用不上；ORM 映射也更容易踩坑。

## 4.2 条件查询 where

```sql
select id,name,price from dish
where merchant_id = 10 and status = 1 and price between 1000 and 5000
order by id desc;
```

注意：

- `and` 优先级高于 `or`，混合条件加括号。
- `null` 用 `is null/is not null`，`=` 不等于 null。
- `like '%abc'` 前缀通配走不了普通 B+ 索引；`like 'abc%'` 才可能用。
- 字段做函数/隐式转换可能让索引失效，例如 `where phone = 138...` 数字传字符串、`date(created_at)=...`。

## 4.3 分组查询 group by

统计某商家菜品数与均价：

```sql
select merchant_id, count(*) as dish_cnt, avg(price) as avg_price
from dish
where status = 1
group by merchant_id
having count(*) >= 5;
```

`where` 在分组前过滤行，`having` 在分组后过滤聚合结果。报表里口径要写清楚：count(*) 还是 count(id)？avg(price) 是否含下架？退款是否扣减？

## 4.4 排序与分页

```sql
select id,name,created_at from dish
where merchant_id = 10 and status = 1
order by created_at desc, id desc
limit 20 offset 0;
```

深分页问题：`limit 100000,20` 要扫描并丢弃前十万行。优化：

- 限制最大页/最大 size。
- 用游标/seek：`where (created_at,id) < (?,?) order by created_at desc,id desc limit 20`。
- 搜索/报表走 ES 或预聚合，不在线库硬翻页。

## 4.5 join

```sql
select o.id, o.order_no, oi.dish_name, oi.price, oi.quantity
from order_main o
join order_item oi on oi.order_id = o.id
where o.id = 1001;
```

原则：

- 小表驱动大表，join 字段有索引且类型一致。
- 列表页不要 join 出一堆明细导致行爆炸；详情再查明细。
- join 不是越多越好；高并发核心查询宁可拆两次简单查询，也不要一个巨无霸 SQL 把优化器逼疯。

## 4.6 子查询与 exists

查“有上架菜品的商家”：

```sql
select m.id, m.name
from merchant m
where exists (
  select 1 from dish d where d.merchant_id = m.id and d.status = 1
);
```

`exists` 常在“只关心有没有”时比 join 后去重清楚。`in (select ...)` 要小心子查询结果很大。

## 4.7 explain：别猜，看计划

```sql
explain select id,name from dish where merchant_id=10 and status=1 order by created_at desc limit 20;
```

重点看：

- type：最好 `ref/range`，警惕 `ALL` 全表扫。
- key：实际用了哪个索引。
- rows：估算扫描行数。
- Extra：`Using filesort`、`Using temporary` 要警惕；`Using index` 是覆盖索引好信号。

学习要求：每写一个核心查询，都 explain 一次；慢查询先开 slow log 或看监控，不要凭感觉加索引。

---

# 5. 索引：不是越多越好，是匹配查询

## 5.1 B+ 树直觉

InnoDB 索引像有序字典。主键是聚簇索引，叶子存整行；二级索引叶子存主键，再回表拿整行。所以：

- 主键查询最快。
- 二级索引如果只查索引列和主键，可能覆盖索引不回表。
- 无序大主键会让插入更碎；学习期 auto_increment 反而友好。

## 5.2 联合索引最左前缀

索引 `(merchant_id, status, created_at)` 能服务：

```text
merchant_id = ?
merchant_id = ? and status = ?
merchant_id = ? and status = ? order by created_at
```

不太能服务：只按 `status` 查、只按 `created_at` 排序而前面列没等值。范围列后面的索引列通常难继续用于等值。

设计方法：把核心查询列出来，为高频查询建联合索引；低频大报表别为了它在在线表乱加索引。

## 5.3 索引成本

每个索引都要随写入维护，占空间，影响 insert/update/delete；优化器还可能选错。索引不是收藏，越多越安心。删掉不用的索引和加索引一样重要。

## 5.4 外卖索引示例

- 用户订单列表：`order_main(user_id, status, created_at desc)`，分页按 created_at,id。
- 商家待接单：`order_main(merchant_id, status, created_at)`。
- 菜品列表：`dish(merchant_id, status, category_id)`。
- 支付流水：`payment(channel, channel_trade_no)` 唯一，`payment(order_id)`。
- 一人一单：`voucher_order(voucher_id, user_id)` 唯一。

---

# 6. 事务：一组写入要么全成要么全败

## 6.1 ACID 用项目话讲

- Atomicity：下单写 order_main 和 order_item 不能只成功一半。
- Consistency：约束、触发器、应用规则让状态合法。
- Isolation：并发下单、支付、关单不能互相读到半成品。
- Durability：提交后宕机不丢，靠 redo/持久化。

## 6.2 手动事务

```sql
start transaction;
insert into order_main(...) values (...);
insert into order_item(...) values (...);
update dish set stock=stock-1 where id=1 and stock>=1;
commit;
-- 出错 rollback;
```

Java/Spring 里就是 `@Transactional`，但本质仍是 connection 的 commit/rollback。事务越短越好；不要在事务里调支付、短信、HTTP、文件上传。

## 6.3 隔离级别

常见级别：读未提交、读已提交、可重复读、串行化。MySQL InnoDB 默认 REPEATABLE READ，并用 MVCC 让普通读不阻塞写。

你不用背定义到考试级，但要懂业务问题：

- 脏读：读到别人未提交。基本不可接受。
- 不可重复读：同一事务两次读同一行不同。多数互联网用 RC 可接受且锁更少。
- 幻读：同一范围查询出现新行。唯一约束、间隙锁、原子条件更新比口头背级别更实用。

工程建议：理解默认 RR 与 RC 差异，核心资金/库存用条件更新和唯一约束兜底，不要幻想隔离级别替你做业务规则。

## 6.4 锁

- 行锁：`update ... where id=` 命中索引锁行；没命中索引可能锁更多。
- 间隙锁：RR 下范围更新可能锁区间，防插入；死锁排查要想到它。
- 表锁：DDL、无索引更新大表、显式 lock tables 可能带来。
- 死锁：两个事务互相等。解决：固定加锁顺序、缩短事务、索引命中、批量操作排序、捕获死锁重试幂等操作。

示例：扣多个菜品库存时，按 dishId 升序排序再逐条原子 update，降低死锁概率。

---

# 7. 订单表实战：把 DDL/DML/DQL 串起来

## 7.1 订单与明细

```sql
create table order_main (
  id bigint primary key auto_increment,
  order_no varchar(32) not null,
  user_id bigint not null,
  merchant_id bigint not null,
  status varchar(24) not null comment 'PENDING_PAY/PENDING_ACCEPT/...',
  dish_amount bigint not null default 0,
  delivery_fee bigint not null default 0,
  coupon_amount bigint not null default 0,
  pay_amount bigint not null default 0,
  receiver varchar(50) not null default '',
  address_snapshot varchar(500) not null default '',
  remark varchar(200) not null default '',
  created_at datetime not null default current_timestamp,
  paid_at datetime null,
  version int not null default 0,
  unique key uk_order_no (order_no),
  index idx_user_status_created (user_id, status, created_at),
  index idx_merchant_status_created (merchant_id, status, created_at)
) engine=InnoDB;

create table order_item (
  id bigint primary key auto_increment,
  order_id bigint not null,
  dish_id bigint not null,
  dish_name varchar(80) not null,
  dish_price bigint not null,
  quantity int not null,
  image varchar(255) not null default '',
  key idx_order (order_id)
) engine=InnoDB;
```

重点：快照字段必须冗余；订单状态用字符串便于扩展与排查，也可用 tinyint + 字典表，但全系统统一。

## 7.2 提交订单 SQL 顺序

一个事务内：

1. 锁/校验商家营业：读 merchant 必要条件，必要时 `for update`。
2. 原子扣库存：`update dish set stock=stock-? where id=? and stock>=?`，按 id 升序。
3. 插 order_main/order_item 快照。
4. 标记券已用：`update user_coupon set status='USED', order_id=? where id=? and user_id=? and status='UNUSED'`，影响行数必须 1。
5. 清理购物车。
6. 写 outbox 事件。

任何一步影响行数不符，整体回滚。注意：如果第 2 步先成功、第 4 步券失败，事务回滚会连库存一起回滚；这就是本地事务的价值。跨服务后就不能这么舒服了，才需要 Saga/补偿。

## 7.3 查询订单详情

```sql
select id, order_no, status, pay_amount from order_main where id=? and user_id=?;
select dish_name, dish_price, quantity from order_item where order_id=?;
```

用户必须带 `user_id` 条件；商家端带 `merchant_id`。这不仅安全，也能用上索引。

---

# 8. 与 Java 的连接：JDBC、MyBatis、JPA 怎么落到 SQL

## 8.1 JDBC 核心

永远用 PreparedStatement：

```java
String sql = "update dish set stock = stock - ? where id = ? and stock >= ?";
try (PreparedStatement ps = conn.prepareStatement(sql)) {
  ps.setInt(1, qty);
  ps.setLong(2, dishId);
  ps.setInt(3, qty);
  int rows = ps.executeUpdate();
  if (rows == 0) throw new BusinessException("库存不足");
}
```

这段是防 SQL 注入和防超卖的共同样板。

## 8.2 MyBatis

XML 里把 SQL 写清楚，动态条件防全表更新；批量、联表、报表可控。重点：`#{}` 是参数占位，`${}` 是字符串拼接，排序字段白名单后才能 `${}`，否则注入。

## 8.3 JPA

省心但要懂 SQL：N+1、懒加载、flush、锁。核心写路径仍可用 `update` 派生或 `@Modifying` 原子扣减，别靠“查出来改字段再 save”防超卖。

---

# 9. 慢查询与运维基础

- 开 slow query log，阈值如 200ms；核心接口看 P95/P99，不看平均。
- explain 核心 SQL；关注全表扫、filesort、temporary、rows 估算。
- 大表变更走低峰和在线 DDL；先评估行数、磁盘、复制延迟。
- 备份要演练恢复；没恢复过的备份不算备份。
- 账号最小权限；应用账号不要 drop/alter 生产表。
- 连接池大小不是越大越好；看 DB 能承受的并发和慢查询。

---

# 10. 高频坑清单

1. 金额用 double，最后对账差几分。
2. 手机号用 int，前导 0/区号/长度全坏。
3. 唯一约束只靠代码判断，并发注册/一人一单被打穿。
4. `select *` 加一个大字段，接口突然变慢。
5. `like '%关键字'` 抱怨索引没用。
6. 深分页 `limit 100000,20` 在高峰期扫崩 DB。
7. 在事务里调远程接口，锁行等网络。
8. 更新没命中索引，锁范围远超预期。
9. `delete` 业务事实，售后/审计/报表全断。
10. 用 Created_at 排序却没有联合索引，分页靠 filesort。
11. 时区混乱，统计今天订单少一截。
12. 把报表大查询打到在线主库，影响下单。

---

# 11. 按你课程目录的 4 周练习

## 第 1 周：DDL 与工具

- 建 shop 库，写 user/merchant/dish/order_main/order_item。
- 每张表必须有主键、created_at/updated_at、必要唯一索引和查询索引。
- 用 GUI 看结构，但所有表必须能用脚本重建。
- 作业：给 dish 加 `version`，给 payment 设计唯一流水约束。

## 第 2 周：DML

- 写 insert/update/delete；重点练影响行数。
- 原子扣库存；模拟两个线程同时扣最后 1 份，只能一个影响行数为 1。
- 练 `on duplicate key update`，并写出它在注册场景为什么可能错。
- 作业：实现“超时关单回补库存”，用恢复记录表防重复回补。

## 第 3 周：DQL

- 基本查询、条件、分组、排序、分页。
- 用户订单列表、商家待接单、菜品销量 Top10、今日营业额。
- 每条核心 SQL explain，贴出 type/key/rows/Extra。
- 作业：把深分页改成游标分页，比较 1 万页附近耗时。

## 第 4 周：事务、锁、索引综合

- 写提交订单事务：扣库存、插订单、用券、清购物车、outbox。
- 制造死锁：两个事务反序更新两个菜品；再改成按 id 升序解决。
- 用 explain 证明订单列表索引有效；删掉一个无用索引观察写入变化。
- 作业：写一份“订单库表设计说明”，包含字段类型、约束、索引、状态机、慢查询预案。

---

# 12. 一页纸记忆

- DDL：类型选对、not null/default、唯一约束兜底、索引按查询建。
- DML：看影响行数；扣减用 `set stock=stock-? where stock>=?`。
- DQL：少 `select *`，警惕函数/隐式转换/前导 like/深分页；核心 SQL 必 explain。
- 事务：短、只做本地一致；远程调用移出去。
- 锁：命中索引、固定顺序、缩短事务、死锁可重试幂等。
- 订单：快照不可少；状态机管住迁移；历史事实少物理删。
- MySQL 是底线：代码会并发失手，约束和原子 SQL 不会讲情面。
