---
title: "JDBC 与 MyBatis 详细教程：从手动 SQL 到映射框架"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 03 册：从裸 JDBC 的繁琐到 MyBatis 的映射与动态 SQL。"
tags: ["Java","JDBC","MyBatis"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 适合：会 Java 语法，学过一点 MySQL，准备接 Spring Boot。  
> 目标：能手写 JDBC 完成 DQL/DML；理解 PreparedStatement 为什么必须用；理解连接池；能用 MyBatis 做增删改查和 XML 映射；知道 JDBC 与 MyBatis 各自解决什么。  
> 业务例子：菜品 dish、订单 order_main/order_item。  
> 学习原则：先用 JDBC 把“连接—预编译—执行—遍历结果—关资源—事务”走一遍，再让 MyBatis 帮你省样板。这样以后看 MyBatis Plus、JPA 也不会慌。

---

# 1. JDBC 入门程序：最小但完整

## 1.1 JDBC 是什么

JDBC 是 Java 访问数据库的标准 API。不同数据库提供驱动，例如 MySQL Connector/J。你写同一套接口，驱动负责把调用翻译成 MySQL 协议。

核心对象：

- `Connection`：一次数据库会话，事务也挂在它上面。
- `Statement`：执行 SQL，但不安全，容易注入。
- `PreparedStatement`：预编译 SQL，参数用 `?` 占位，安全且可复用执行计划。
- `ResultSet`：查询结果游标，一行一行读。
- `DataSource`：连接工厂，生产环境用连接池实现，如 HikariCP。

## 1.2 依赖

Maven：

```xml
<dependency>
  <groupId>com.mysql</groupId>
  <artifactId>mysql-connector-j</artifactId>
  <version>8.4.0</version>
</dependency>
```

版本以你环境为准；学习重点是 API，不是某个精确小版本。

## 1.3 第一个查询程序

```java
import java.sql.*;

public class JdbcHello {
  public static void main(String[] args) throws Exception {
    String url = "jdbc:mysql://localhost:3306/shop?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8mb4";
    String user = "root";
    String password = "123456";

    String sql = "select id, name, price, stock from dish where merchant_id = ? and status = ?";

    try (Connection conn = DriverManager.getConnection(url, user, password);
         PreparedStatement ps = conn.prepareStatement(sql)) {

      ps.setLong(1, 10L);
      ps.setInt(2, 1);

      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          long id = rs.getLong("id");
          String name = rs.getString("name");
          long price = rs.getLong("price");
          int stock = rs.getInt("stock");
          System.out.println(id + " " + name + " " + price + " " + stock);
        }
      }
    }
  }
}
```

这段已经包含后端最重要的习惯：try-with-resources 自动关资源；PreparedStatement 参数占位；查询按列名取值；连接串写时区和编码。

## 1.4 为什么不直接拼接 SQL

错误：

```java
String sql = "select * from dish where name = '" + name + "'";
```

如果 name 是 `' or '1'='1`，SQL 语义被改。预编译让“结构”和“数据”分开：SQL 结构先编译，参数只当值传，不再参与语法。

---

# 2. 执行 DQL：ResultSet 要读对

## 2.1 查询一行

```java
String sql = "select id, merchant_id, name, price, stock, status from dish where id = ?";
try (Connection conn = ds.getConnection();
     PreparedStatement ps = conn.prepareStatement(sql)) {
  ps.setLong(1, 1L);
  try (ResultSet rs = ps.executeQuery()) {
    if (rs.next()) {
      Dish d = new Dish(
        rs.getLong("id"),
        rs.getLong("merchant_id"),
        rs.getString("name"),
        rs.getLong("price"),
        rs.getInt("stock"),
        rs.getInt("status")
      );
      return d;
    }
    return null;
  }
}
```

建议查询用列名，不用 `rs.getLong(1)` 这种下标；列顺序一变，bug 很隐蔽。

## 2.2 查询列表

```java
List<Dish> list = new ArrayList<>();
String sql = "select id, merchant_id, name, price, stock, status from dish where merchant_id=? and status=? order by id desc limit ?";
ps.setLong(1, merchantId);
ps.setInt(2, 1);
ps.setInt(3, size);
try (ResultSet rs = ps.executeQuery()) {
  while (rs.next()) list.add(mapRow(rs));
}
return list;
```

把 `rs -> Dish` 抽成 `mapRow`，否则每个查询都复制一遍字段映射，后面会懂 MyBatis 在替你做这件事。

## 2.3 聚合查询

```sql
select merchant_id, count(*) cnt, avg(price) avg_price
from dish
where status = 1
group by merchant_id
having count(*) >= 5;
```

JDBC 读法相同：`rs.getInt("cnt")`、`rs.getBigDecimal("avg_price")`。注意 avg 返回可能是 decimal，不要强行 getInt。

---

# 3. DML 与事务：新增、更新、删除

## 3.1 新增并拿回自增主键

```java
String sql = "insert into dish(merchant_id, category_id, name, price, stock, status) values(?,?,?,?,?,?)";
try (Connection conn = ds.getConnection();
     PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
  ps.setLong(1, merchantId);
  ps.setLong(2, categoryId);
  ps.setString(3, name);
  ps.setLong(4, price);
  ps.setInt(5, stock);
  ps.setInt(6, 1);
  int rows = ps.executeUpdate();
  try (ResultSet keys = ps.getGeneratedKeys()) {
    if (keys.next()) return keys.getLong(1);
  }
  return rows > 0 ? -1 : 0;
}
```

## 3.2 更新：原子扣库存

```java
String sql = "update dish set stock = stock - ?, version = version + 1 where id = ? and stock >= ? and status = 1";
ps.setInt(1, qty);
ps.setLong(2, dishId);
ps.setInt(3, qty);
int rows = ps.executeUpdate();
if (rows == 0) throw new BusinessException("库存不足或已下架");
```

这就是后端防超卖底线：判断和扣减同一条 SQL 完成。

## 3.3 删除与软删除

业务事实尽量软删/状态化：

```sql
update dish set status = 0 where id = ? and merchant_id = ?;
```

一定要带商户归属条件，否则用户传别人 dishId 也能改。SQL 层把“资源归属”写进 where，是安全习惯。

## 3.4 手动事务：下单的最小骨架

```java
try (Connection conn = ds.getConnection()) {
  conn.setAutoCommit(false);
  try {
    deductStock(conn, items);       // 多条原子 update
    long orderId = insertOrder(conn, req);
    insertItems(conn, orderId, items);
    markCouponUsed(conn, req);      // update ... where status='UNUSED'，影响行数必须1
    clearCart(conn, req);
    insertOutbox(conn, orderId);
    conn.commit();
    return orderId;
  } catch (Exception e) {
    conn.rollback();
    throw e;
  }
}
```

这段是 Spring `@Transactional` 的原型。你亲手写过，就会知道：事务边界是一组 connection 上的 SQL 同成败；把远程调用放进事务，是在拿数据库连接和锁等网络。

---

# 4. 数据库连接池：为什么不能 DriverManager 直连生产

`DriverManager.getConnection` 每次都建 TCP、认证、初始化会话，很慢。高并发下会瞬间打爆数据库。连接池提前维护连接，借出、校验、归还、销毁。

HikariCP 示例：

```java
HikariConfig cfg = new HikariConfig();
cfg.setJdbcUrl(url);
cfg.setUsername(user);
cfg.setPassword(password);
cfg.setMaximumPoolSize(20);
cfg.setConnectionTimeout(3000);
cfg.setIdleTimeout(600000);
cfg.setMaxLifetime(1700000);
HikariDataSource ds = new HikariDataSource(cfg);
```

理解参数：

- maximumPoolSize：应用侧对 DB 的并发闸门，不是越大越好。
- connectionTimeout：拿不到连接多久失败，快速失败比无限排队更能保护系统。
- maxLifetime：连接最大寿命，要小于 DB/中间件 wait_timeout，避免拿到半死连接。
- 池耗尽症状：接口卡住、超时集中在获取连接、DB 并发不高但应用堵——先看是不是有连接没还或长事务。

---

# 5. MyBatis 入门：它替你省掉哪段

MyBatis 半自动 ORM：SQL 仍由你写，映射、参数占位、结果集装对象、连接/事务集成由框架做。它介于 JDBC 和 JPA 之间：比 JDBC 省样板，比 JPA 更可控 SQL。

最小依赖思路：

```xml
<dependency>
  <groupId>org.mybatis.spring.boot</groupId>
  <artifactId>mybatis-spring-boot-starter</artifactId>
</dependency>
```

核心三件套：

- Mapper 接口：方法签名。
- XML 或注解：SQL 与映射。
- SqlSession/Spring 集成：执行、事务、连接池。

## 5.1 入门程序

```java
@Mapper
public interface DishMapper {
  Dish selectById(@Param("id") long id);
}
```

```xml
<mapper namespace="com.example.dish.DishMapper">
  <select id="selectById" resultType="com.example.dish.Dish">
    select id, merchant_id, name, price, stock, status
    from dish
    where id = #{id}
  </select>
</mapper>
```

调用：`dishMapper.selectById(1)`。你不再写 Connection/PreparedStatement/ResultSet，但 SQL 仍是你的。

---

# 6. JDBC VS MyBatis：到底差在哪

| 维度 | JDBC | MyBatis |
|---|---|---|
| SQL 控制 | 完全手写 | 仍手写，可 XML/动态 SQL 管理 |
| 参数安全 | 手动 PreparedStatement | `#{}` 默认预编译 |
| 结果映射 | 手动 while(rs.next) | resultType/resultMap 自动映射 |
| 资源释放 | 手动 try-with-resources | Spring/SqlSession 管理 |
| 事务 | 手动 commit/rollback | 与 Spring 事务集成 |
| 样板代码 | 多 | 少 |
| 复杂 SQL | 自由但啰嗦 | 自由且结构化 |
| 学习价值 | 理解本质 | 工程效率 |

结论：JDBC 教你真相，MyBatis 给你生产力。不要跳过 JDBC 直接背 MyBatis 标签；否则遇到 `#{}` 与 `${}`、resultMap、懒加载、批量、事务会像背咒语。

---

# 7. MyBatis 增删改查

## 7.1 删除操作

```java
int deleteByIdAndMerchant(@Param("id") long id, @Param("merchantId") long merchantId);
```

```xml
<delete id="deleteByIdAndMerchant">
  delete from dish where id = #{id} and merchant_id = #{merchantId}
</delete>
```

返回 int 是影响行数。学习阶段允许物理删；真实业务更建议软删：`update dish set status=0 where ...`，保留审计与报表能力。

## 7.2 新增操作

```java
int insert(Dish dish);
```

```xml
<insert id="insert" useGeneratedKeys="true" keyProperty="id">
  insert into dish(merchant_id, category_id, name, price, stock, status)
  values(#{merchantId}, #{categoryId}, #{name}, #{price}, #{stock}, #{status})
</insert>
```

`useGeneratedKeys + keyProperty` 把自增 id 回填到对象。批量新增可用 `foreach`，但要控制批次大小，并开连接串批量重写参数。

## 7.3 更新操作

```java
int deductStock(@Param("id") long id, @Param("qty") int qty);
```

```xml
<update id="deductStock">
  update dish
  set stock = stock - #{qty}, version = version + 1
  where id = #{id} and stock >= #{qty} and status = 1
</update>
```

再次强调：update 的返回值必须判断。`rows=0` 不是异常，是业务失败信号：库存不足/已下架/不是你的资源。

## 7.4 查询操作

```java
List<Dish> listOnSale(@Param("merchantId") long merchantId,
                      @Param("categoryId") Long categoryId,
                      @Param("limit") int limit);
```

```xml
<select id="listOnSale" resultMap="DishMap">
  select id, merchant_id, category_id, name, price, stock, status, version
  from dish
  where merchant_id = #{merchantId}
    and status = 1
    <if test="categoryId != null">
      and category_id = #{categoryId}
    </if>
  order by id desc
  limit #{limit}
</select>
```

---

# 8. XML 映射配置：resultMap、别名、动态 SQL

## 8.1 resultType 与 resultMap

`resultType` 适合列名和字段名能对应；下划线转驼峰可开 `map-underscore-to-camel-case`。复杂映射用 resultMap：

```xml
<resultMap id="DishMap" type="com.example.dish.Dish">
  <id column="id" property="id"/>
	  <result column="merchant_id" property="merchantId"/>
  <result column="category_id" property="categoryId"/>
  <result column="name" property="name"/>
  <result column="price" property="price"/>
  <result column="stock" property="stock"/>
  <result column="status" property="status"/>
  <result column="version" property="version"/>
</resultMap>
```

什么时候必须 resultMap：字段名不一致、嵌套对象、一对多 collection、多对一 association、枚举/类型处理器。

## 8.2 一对多：商家和菜品

```xml
<resultMap id="MerchantWithDishes" type="Merchant">
  <id column="m_id" property="id"/>
  <result column="m_name" property="name"/>
  <collection property="dishes" ofType="Dish">
    <id column="d_id" property="id"/>
    <result column="d_name" property="name"/>
    <result column="d_price" property="price"/>
  </collection>
</resultMap>

<select id="selectMerchantWithDishes" resultMap="MerchantWithDishes">
  select m.id m_id, m.name m_name, d.id d_id, d.name d_name, d.price d_price
  from merchant m
  left join dish d on d.merchant_id = m.id and d.status = 1
  where m.id = #{id}
</select>
```

注意：一对多 join 会把主表行重复；列表分页时不要这么 join 后再内存分页。先分页商家，再批量查菜品按 merchantId 分组，常常更稳。

## 8.3 动态 SQL

常用标签：

```xml
<where>
  <if test="status != null">and status = #{status}</if>
  <if test="name != null and name != ''">and name like concat('%', #{name}, '%')</if>
</where>

<set>
  <if test="name != null">name = #{name},</if>
  <if test="price != null">price = #{price},</if>
</set>

<foreach collection="ids" item="id" open="(" separator="," close=")">
  #{id}
</foreach>

<choose>
  <when test="sort == 'price'">order by price asc</when>
  <when test="sort == 'sales'">order by sales desc</when>
  <otherwise>order by id desc</otherwise>
</choose>
```

危险点：动态 SQL 如果所有条件都空，可能变成全表查/全表更/全表删。服务层要强制关键条件，DAO 层也可用拦截器拒绝无 where 的 update/delete。

## 8.4 `#{}` 与 `${}`

- `#{}`：预编译参数，安全，绝大多数字段值都用它。
- `${}`：字符串替换进 SQL，危险；只能用于白名单控制的表名/排序方向/列名。

```xml
order by ${orderBy} <!-- 错误：用户传什么拼什么 -->
```

正确：

```java
String orderBy = switch (sort) {
  case "price" -> "price asc";
  case "sales" -> "sales desc";
  default -> "id desc";
};
```

再把白名单后的固定字符串传给 `${}`，或者干脆在 XML 用 `<choose>` 写死。

---

# 9. 辅助配置：别名、日志、下划线、枚举

```yaml
mybatis:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.example.**.domain
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl # 仅本地调试
```

建议：

- 本地看 SQL 很有用，生产不要 stdout 打全量 SQL；用日志级别和脱敏。
- 状态字段用 TypeHandler 把 DB tinyint 映射 Java 枚举，比到处写数字强。
- Mapper 接口和 XML namespace 严格对应；方法名/id 一致，参数用 `@Param` 命名。

---

# 10. 连接池在 MyBatis 里怎么用

Spring Boot 引入 starter 后，通常配 HikariCP：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/shop?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8mb4&rewriteBatchedStatements=true
    username: shop
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      connection-timeout: 3000
      max-lifetime: 1700000
```

MyBatis 不替代连接池；它从 DataSource 拿连接。你要监控：活跃连接、等待连接、获取超时、慢 SQL。接口卡顿时先看是 SQL 慢，还是根本没拿到连接。

---

# 11. 综合练习：菜品与订单 DAO

## 11.1 菜品 Mapper 要求

实现：

- 新增菜品并回填 id。
- 商家只能改自己菜品：`update ... where id=#{id} and merchant_id=#{merchantId}`，判断影响行数。
- 上架/下架：状态切换也要带 merchantId。
- 列表：merchantId 必填，status/categoryId 可选，limit 上限校验。
- 原子扣库存：影响行数 0 抛库存不足。

## 11.2 订单写入要求

在一个 Service 事务里调用 Mapper 完成：

1. 校验并锁定商家营业状态。
2. 按 dishId 升序原子扣库存，任一失败整体回滚。
3. 插入 order_main，回填 id。
4. 批量插入 order_item 快照。
5. 标记优惠券已用，SQL 必须带 `status='UNUSED'` 和 userId，影响行数为 1。
6. 删除购物车已选项，必须带 userId。
7. 写 outbox。

验收测试：

- 库存不足回滚后，订单没有半截数据。
- 券被另一请求先用，下单失败，库存不回补成双倍。
- 批量插入 100 个明细和 1 个明细都正确。
- XML 动态条件全空时，服务层拒绝执行全表查询。

---

# 12. 高频坑

1. `${}` 当参数用，SQL 注入。
2. update/delete 忘写 where 或资源归属条件，一改全表。
3. 不判断影响行数，把“没更新到”当成功。
4. `resultType` 靠巧合映射，列改名后静默错。
5. 一对多 join 后直接分页，主表行重复导致页数错。
6. foreach 批量过大，单 SQL 巨大、事务长、锁多。
7. 本地开 stdout SQL，生产也忘关，泄露手机号地址。
8. 连接池设置凭感觉；出现获取连接超时才第一次看 Hikari 指标。
9. 在事务里调远程接口，DB 行锁等网络。
10. 把 MyBatis 当黑盒，不 explain XML 里实际 SQL。

---

# 13. 一页纸记忆

- JDBC 五件事：连接、预编译、参数、执行、读结果；资源用 try-with-resources。
- DQL 读列名，聚合注意类型；DML 必看影响行数。
- PreparedStatement 防注入；批量开 rewriteBatchedStatements 并控制批次。
- 连接池是闸门：最大连接、获取超时、最大寿命要懂。
- 手动事务是 `@Transactional` 的原型；事务里别放远程调用。
- MyBatis 省样板不省思考：SQL、索引、映射、动态条件仍是你的。
- `#{}` 默认安全；`${}` 只能白名单。
- resultMap 处理真实世界：别名、枚举、一对多。
- 动态 SQL 防全表操作；服务层强制关键条件。
- 业务删除优先状态化；核心写入靠约束和原子 SQL 兜底。
