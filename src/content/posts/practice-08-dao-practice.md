---
title: "08 综合练习：菜品 DAO 手把手"
published: 2026-09-16
description: "课程实操笔记第 08 篇：JDBC 与 MyBatis 综合落地。"
tags: ["Java","MyBatis","实操笔记"]
category: "教程"
draft: false
lang: 'zh_CN'
---

对应：03 册 §5–§11（MyBatis 三件套、增删改查、XML 映射、动态 SQL、综合练习）；02 册 §2.5（dish 表设计）、§7（订单事务只做口述预览）。
模式：**只敲不运行**。敲完的运行与验收在苍穹外卖第一周原样进行（面板约定：代码验证统一在阶段三）。
每个代码块分两部分：`//` 注释管"这行干什么"，代码块下方的「原文锚点」管"手册为什么这么说"。

## 1. 这份文档解决什么

03 册 §11.1 要求实现菜品 Mapper 五连：新增回填 id、带归属的修改、上下架、动态列表、原子扣库存。本文把这件事从空文件夹到测试类完整走一遍：每一行代码的作用、文件之间怎么咬合、每个写法在 03/02 册的哪一节。

03 册 §6 的结论先立在这：「JDBC 教你真相，MyBatis 给你生产力。不要跳过 JDBC 直接背 MyBatis 标签」。你 1–4 章已经快过，所以本文每个 MyBatis 写法都会顺手指回它替你省掉的 JDBC 那段。

## 2. 整体框架：先看全景再动手

```text
shop-dao-lab/                        ← 项目根（今晚只是个文件夹，敲完不跑）
 ├─ pom.xml                          ← 声明"我要什么"：谁替 Maven 管依赖（§3.1 03册）
 ├─ src/main/java/com/shop/lab/
 │   ├─ ShopDaoLabApplication.java   ← main 入口，Spring 容器从这里启动
 │   ├─ pojo/Dish.java               ← 菜品实体：字段 ↔ 02册 dish 表的列
 │   ├─ mapper/DishMapper.java       ← 三件套之一：接口，只有方法签名（03册 §5）
 │   ├─ service/DishService.java     ← 业务规则层：强制关键条件、判断影响行数
 │   └─ exception/BusinessException.java ← 业务失败信号（03册 §3.2 用的同名类）
 ├─ src/main/resources/
 │   ├─ application.yml              ← 数据源/连接池/MyBatis 三组配置（03册 §9、§10）
 │   └─ mapper/DishMapper.xml        ← 三件套之二：SQL 与映射（03册 §5）
 └─ src/test/java/com/shop/lab/
     └─ DishMapperTest.java          ← 只敲不跑；苍穹第一周原样运行验收
```

03 册 §5 原文的「核心三件套」对应关系：

| 三件套（§5 原文） | 本项目文件 |
| --- | --- |
| Mapper 接口：方法签名 | `mapper/DishMapper.java` |
| XML 或注解：SQL 与映射 | `resources/mapper/DishMapper.xml` |
| SqlSession/Spring 集成：执行、事务、连接池 | `application.yml` + starter 依赖（不用你写） |

分层依据是 01 册 §9 / 实操笔记 01 的三层：Mapper 只管 SQL，Service 管业务规则（库存够不够、merchantId 在不在），谁也不越界。

**敲码顺序**（也是本文小节顺序）：pom → yml → 启动类 → 实体 → Mapper 接口 → XML → 异常类 → Service → 测试类。依赖关系决定了这个顺序：后面的文件引用前面的。

**IDEA 里怎么建**：File → New → Project → 选一个空目录命名 `shop-dao-lab`（不用 Initializr、不用模板——今晚不运行，不需要联网向导）。建好后按上面的树逐个 New → File / New → Class 手敲。敲完 `pom.xml` 保存，IDEA 右下角会问是否识别为 Maven 项目，点 Load 即可。

## 3. pom.xml：声明"我要什么"

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <!-- ↑ 固定开头：XML 命名空间声明，照抄即可，作用是让 IDEA 校验标签拼写 -->

  <modelVersion>4.0.0</modelVersion>
  <!-- ↑ Maven 固定值 4.0.0，表示 pom 模型版本，不是你项目的版本 -->

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.5</version>
  </parent>
  <!-- ↑ 继承 Spring Boot 官方父工程：几百个常用依赖的"推荐版本号"由它锁定，
       你下面引依赖不用写 version，避免版本打架（这就是 03册 §3.4 说的依赖冲突的解药） -->

  <groupId>com.shop</groupId>
  <artifactId>shop-dao-lab</artifactId>
  <version>1.0-SNAPSHOT</version>
  <!-- ↑ 坐标三件套（03册 §3.4）：组织:项目:版本。SNAPSHOT=还在开发期 -->

  <properties>
    <java.version>17</java.version>
    <!-- ↑ 告诉父工程按 JDK 17 编译；Spring Boot 3 要求最低 17 -->
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.mybatis.spring.boot</groupId>
      <artifactId>mybatis-spring-boot-starter</artifactId>
      <version>3.0.3</version>
    </dependency>
    <!-- ↑ 三件套之三"Spring 集成"的实体：一个 starter 同时拉进
         MyBatis 核心 + Spring Boot 自动配置（自动创建 SqlSessionFactory、
         扫描 Mapper 接口并生成实现类）。03册 §5"最小依赖思路"原文就是它 -->

    <dependency>
      <groupId>com.mysql</groupId>
      <artifactId>mysql-connector-j</artifactId>
    </dependency>
    <!-- ↑ MySQL 驱动（03册 §1.2 同款）。不写版本：parent 已锁定配套版本。
         作用：把 JDBC 接口调用翻译成 MySQL 网络协议（§1.1 原文） -->

    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <optional>true</optional>
    </dependency>
    <!-- ↑ @Data 注解自动生成 getter/setter 等，省掉 8 个字段的手写样板。
         optional=true 表示不传染给依赖本项目的其他项目。
         想零魔法也可以删掉它，把 getter/setter 手写全——作用一样，只是费键盘 -->

    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
    <!-- ↑ JUnit 5 + Spring 测试上下文，只给 src/test 用（scope=test 不打进正式包） -->
  </dependencies>
</project>
```

**原文锚点**：03 册 §1.2「Maven：你在 pom.xml 声明要什么，它从中央仓库下载，并管理编译、测试、打包」（此句原出处是 01 册 §3.1，03 册 §1.2 沿用）。注意本项目**没有** `spring-boot-starter-web`：纯 DAO 练习不需要 HTTP 层， Controller 留给苍穹。

对照 JDBC 版本：如果不用 Spring Boot，你至少要手写 HikariConfig 六行 + SqlSessionFactory 构建——starter 把这些变成 yml 里的三行配置。

## 4. application.yml：数据源、连接池、MyBatis 三组

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/shop?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8mb4
    #   ↑ jdbc:mysql://  协议前缀，驱动认这个
    #     localhost:3306 数据库机器和端口（01册附录：端口=区分进程的编号）
    #     /shop          用哪个库（02册建的外卖库）
    #     useSSL=false              本地学习不加密
    #     serverTimezone=Asia/Shanghai  时区（03册 §1.3 原文：连接串写时区）
    #     characterEncoding=utf8mb4    编码（实操笔记01坑：防中文乱码）
    username: root
    password: ${DB_PASSWORD:123456}
    #   ↑ 先读环境变量 DB_PASSWORD，没有则用冒号后的默认值。
    #     03册 §10 原文用 ${DB_PASSWORD}，实操笔记01原文"机密用环境变量覆盖，不进仓库"
    hikari:
      maximum-pool-size: 20
      # ↑ 应用侧对 DB 的并发闸门（03册 §4 原文：不是越大越好）
      connection-timeout: 3000
      # ↑ 拿不到连接 3 秒就失败——快速失败保护系统
      max-lifetime: 1700000
      # ↑ 连接最大寿命毫秒，小于 MySQL wait_timeout，避免拿到半死连接
mybatis:
  mapper-locations: classpath:mapper/*.xml
  # ↑ 告诉 MyBatis 去哪找 SQL：resources/mapper/ 下所有 XML（三件套之二的家）
  type-aliases-package: com.shop.lab.pojo
  # ↑ 实体包起别名：XML 里可写 resultType="Dish" 不用写全限定名
  configuration:
    map-underscore-to-camel-case: true
    # ↑ 列 merchant_id ↔ 字段 merchantId 自动互转（03册 §8.1 原文开的第一选择）
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
    # ↑ 控制台打印实际执行的 SQL，仅本地调试（03册 §9 原文：生产不要 stdout 打全量）
```

**原文锚点**：这一节几乎逐行来自 03 册 §9 的 yaml 原文 + §10 的 hikari 原文。§10 最后一句要记：「MyBatis 不替代连接池；它从 DataSource 拿连接」——yml 里这两组是并列的两件事。

## 5. 启动类与实体类

### 5.1 ShopDaoLabApplication.java

```java
package com.shop.lab;                    // 包声明，和目录 com/shop/lab 一一对应

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
// ↑ 组合注解 = @Configuration(本类是配置) + @EnableAutoConfiguration(读 yml、
//   自动配 DataSource/SqlSessionFactory) + @ComponentScan(扫描本包及子包的组件)
public class ShopDaoLabApplication {
  public static void main(String[] args) {
    SpringApplication.run(ShopDaoLabApplication.class, args);
    // ↑ 启动 Spring 容器：创建连接池、生成 Mapper 实现类、注册映射关系。
    //   01册 §0 第5步"服务器找到能处理 /hello 的代码"在 Spring 世界由这套机制完成
  }
}
```

### 5.2 pojo/Dish.java

```java
package com.shop.lab.pojo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
// ↑ Lombok：编译期自动生成所有字段的 getter/setter/toString/equals/hashCode。
//   MyBatis 装配结果集靠 setter，缺了它映射就静默失败——这是不用 Lombok 时最常见的坑
public class Dish {
  // ↓ 字段与 02册 §2.5 dish 表列一一对应；类型对齐 DDL：bigint→Long，varchar→String，
  //   int→Integer，tinyint→Integer，datetime→LocalDateTime
  private Long id;             // 主键，insert 成功后被 useGeneratedKeys 回填
  private Long merchantId;     // 归属商家——所有写操作的 where 必带它（见 §8.2 本文件）
  private Long categoryId;     // 分类，列表的可选过滤条件
  private String name;
  private Long price;          // 单位分（02册原设计：bigint 存分，避免浮点误差）
  private String image;        // 图片地址，练习中可不给值
  private Integer stock;       // 库存，原子扣库存的主角
  private Integer status;      // 1上架 0下架（02册 DDL 注释原文）
  private Integer version;     // 乐观锁版本号（02册 §2.5 原文"version 给乐观锁"）
  private LocalDateTime createdAt;   // 敲累了这两个时间字段可省：DB 有默认值
  private LocalDateTime updatedAt;
}
```

**原文锚点**：02 册 §2.5 设计说明原文——「菜品一定带 merchant_id，因为绝大多数查询都是"某商家的上架菜品"；version 给乐观锁；价格以后端 DB 为准，不信前端传值」。这三个设计决定分别落在：实体有 merchantId 字段、deductStock 的 SQL 里 version+1、price 由后端计算而非前端传入（苍穹会做）。

## 6. DishMapper.java：三件套之一，只有签名

```java
package com.shop.lab.mapper;

import com.shop.lab.pojo.Dish;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
// ↑ 让 MyBatis 在启动时扫描本接口，为它生成实现类（代理对象）并注册进 Spring 容器。
//   你不写 implements，调用时注入的就是框架生成的代理
public interface DishMapper {

  Dish selectById(@Param("id") Long id);
  // ↑ 03册 §5.1 入门程序原样方法。返回单个对象：查不到就是 null
  //   @Param("id")：给 XML 里的 #{id} 起名字。单参数时其实可省，但 §9 原文要求
  //   "参数用 @Param 命名"——统一写，多参数时它就是必需品

  int insert(Dish dish);
  // ↑ 新增。返回 int=影响行数（成功恒为1）。参数是整个实体，
  //   XML 用 #{name} 直接点实体属性。id 会通过 XML 配置回填进这个 dish 对象

  int updateDish(Dish dish);
  // ↑ 修改：商家只能改自己的菜品。归属校验不在 Java 里 if 判断，
  //   而是写进 SQL 的 where（本文件 §8.2 讲为什么）

  int toggleStatus(@Param("id") Long id,
                   @Param("merchantId") Long merchantId,
                   @Param("status") Integer status);
  // ↑ 上架/下架。三个独立参数，每个都必须 @Param 命名，否则 XML 找不到值

  List<Dish> listDish(@Param("merchantId") Long merchantId,
                      @Param("status") Integer status,
                      @Param("categoryId") Long categoryId,
                      @Param("limit") Integer limit);
  // ↑ 列表：merchantId 必填（Service 强制），status/categoryId 可选（XML 动态拼），
  //   limit 上限校验（Service 做）。03册 §11.1 对列表的三条要求逐一落位

  int deductStock(@Param("id") Long id, @Param("qty") Integer qty);
  // ↑ 原子扣库存。返回 int：0=没扣到（库存不足/下架/不存在），1=扣成功。
  //   注意：返回 0 不抛异常！抛不抛是 Service 的决定（§8.5）
}
```

**原文锚点**：03 册 §9「Mapper 接口和 XML namespace 严格对应；方法名/id 一致，参数用 @Param 命名」——下一节 XML 的每条规则的另一半在这里。

## 7. DishMapper.xml：三件套之二，SQL 与映射

先看骨架，再逐条语句：

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<!-- ↑ MyBatis 固定文件头，照抄 -->
<mapper namespace="com.shop.lab.mapper.DishMapper">
  <!-- ↑ namespace=接口的全限定名，一一咬合：MyBatis 靠它把 XML 语句绑到接口方法上。
       绑定规则：select/update/insert/delete 的 id = 接口方法名（§9 原文"严格对应"）。
       下面每条语句对应 §6 里的一个方法签名 -->

  <!-- ……各条语句见 §7.1–7.6 …… -->

</mapper>
```

### 7.1 selectById：resultType 与驼峰转换

```xml
<select id="selectById" resultType="Dish">
  <!-- ↑ id=方法名；resultType=查出来每行装进什么类型。
       "Dish"是 type-aliases-package 起的别名，等价 com.shop.lab.pojo.Dish。
       列名 merchant_id 到字段 merchantId 的转换由 yml 里
       map-underscore-to-camel-case: true 自动完成（03册 §8.1 原文的第一选择） -->
  select id, merchant_id, category_id, name, price, stock, status, version
  from dish
  where id = #{id}
  <!-- ↑ #{id}：预编译参数占位（§8.4 原文：默认安全），运行时等价 JDBC 的 ? 和 setLong -->
</select>
```

**原文锚点**：§2.2「把 rs -> Dish 抽成 mapRow，否则每个查询都复制一遍字段映射，后面会懂 MyBatis 在替你做这件事」——resultType + 驼峰开关就是那句"替你做"的真身：JDBC 里你手写的 `while(rs.next()) new Dish(rs.getLong("id"),...)`，现在一个 `resultType="Dish"` 全包了。

### 7.2 insert：回填自增主键

```xml
<insert id="insert" useGeneratedKeys="true" keyProperty="id">
  <!-- ↑ useGeneratedKeys：拿回数据库生成的自增主键（等价 JDBC 的
       Statement.RETURN_GENERATED_KEYS，03册 §3.1）；
       keyProperty="id"：把拿到的键塞进参数 dish 对象的 id 属性。
       效果：service 里 insert(dish) 之后，dish.getId() 就有值了 -->
  insert into dish(merchant_id, category_id, name, price, stock, status)
  values(#{merchantId}, #{categoryId}, #{name}, #{price}, #{stock}, #{status})
  <!-- ↑ 每个实体属性一一填位；id/created_at/updated_at 不出现在清单里：
       id 是自增，两个时间是 DDL 默认值，DB 自己管 -->
</insert>
```

**原文锚点**：§7.2「useGeneratedKeys + keyProperty 把自增 id 回填到对象」。苍穹外卖里"新增菜品后立刻跳详情页要用新 id"就靠它。

### 7.3 updateDish：归属写进 where + 动态 set

```xml
<update id="updateDish">
  update dish
  <set>
    <!-- ↑ <set> 标签：只拼满足条件的列，并自动处理末尾逗号。
         作用：改哪个字段传哪个字段，没传的不动（局部更新） -->
    <if test="name != null">name = #{name},</if>
    <if test="price != null">price = #{price},</if>
    <if test="stock != null">stock = #{stock},</if>
    <!-- ↑ test 里写的是实体属性名（OGNL 表达式）：属性非空才拼这一列 -->
  </set>
  where id = #{id} and merchant_id = #{merchantId}
  <!-- ↑ 本文件最重要的一行 where。归属校验不写在 Java 里，写在 SQL 里：
       商家2拿着商家1的 dishId 来改，id 对得上但 merchant_id 对不上，
       影响行数=0，什么都没发生——数据天然隔离，不靠代码自觉 -->
</update>
```

**原文锚点**：§3.3「一定要带商户归属条件，否则用户传别人 dishId 也能改。SQL 层把"资源归属"写进 where，是安全习惯」；`<set>`/`<if>` 来自 §8.3 动态 SQL 标签原文。

### 7.4 toggleStatus：上下架也是 update

```xml
<update id="toggleStatus">
  update dish
  set status = #{status}, version = version + 1
  <!-- ↑ status 由调用方传 1(上架)或 0(下架)；状态变化让 version+1，
         给将来的乐观锁用（02册 §2.5 设计意图落地） -->
  where id = #{id} and merchant_id = #{merchantId}
  <!-- ↑ 同样带归属：只能动自己家的上下架开关 -->
</update>
```

### 7.5 listDish：动态 where，但 merchantId 永远在

```xml
<select id="listDish" resultType="Dish">
  select id, merchant_id, category_id, name, price, stock, status, version
  from dish
  <where>
    <!-- ↑ <where>：内部条件都不满足时整个 where 子句不出现；
         满足时自动抹掉开头的 and/or -->
    merchant_id = #{merchantId}
    <!-- ↑ 不包 <if>：无条件必拼。这是"服务层强制关键条件"在 XML 侧的呼应——
         就算 Service 校验被绕过，SQL 也绝不全表查 -->
    <if test="status != null">and status = #{status}</if>
    <if test="categoryId != null">and category_id = #{categoryId}</if>
    <!-- ↑ 两个可选条件：传了才拼，不传就是"全部状态/全部分类" -->
  </where>
  order by id desc
  limit #{limit}
  <!-- ↑ 顺序：where → order by → limit，SQL 语法固定顺序；
       limit 也用 #{}：预编译，防注入一视同仁 -->
</select>
```

**原文锚点**：§8.3 危险点原文「动态 SQL 如果所有条件都空，可能变成全表查/全表更/全表删。服务层要强制关键条件」——所以本条的 merchantId 不进 `<if>`，双保险（XML 硬拼 + Service 校验，见 §9）。

### 7.6 deductStock：全文件的核心，原子扣库存

```xml
<update id="deductStock">
  update dish
  set stock = stock - #{qty},
      version = version + 1
  where id = #{id} and stock >= #{qty} and status = 1
  <!-- ↑ 三个条件缺一不可：
       id=#{id}      找到这道菜
       stock>=#{qty} 库存够才扣——"判断"和"扣减"合并成一步
       status=1      上架的菜才能被扣

       为什么这样写：如果拆成两步（先 select stock 再 update），
       两个并发请求可能都读到 stock=1、都通过判断、都扣成功 → 超卖。
       合并成一条 SQL 后，MySQL 行锁保证同一行同时只有一个 update 在改，
       第二个请求的 where 条件在锁释放后重新评估，stock 已不够 → 影响行数 0 -->
</update>
```

**原文锚点**：§3.2「这就是后端防超卖底线：判断和扣减同一条 SQL 完成」；§7.3 原文一模一样的语句。02 册 §7.2 提交订单 SQL 顺序第 2 步「原子扣库存……按 id 升序」——苍穹下单事务里它原样出现，只是升级为多个 dish 循环调用。

## 8. exception 与 Service：rows==0 是业务信号

### 8.1 exception/BusinessException.java

```java
package com.shop.lab.exception;

public class BusinessException extends RuntimeException {
  // ↑ 继承 RuntimeException（非受检）：业务失败不强迫调用方 try-catch，
  //   而是往上抛给统一异常处理器（苍穹的 @RestControllerAdvice，01册 §12 有伏笔）
  public BusinessException(String message) {
    super(message);   // 把"库存不足或已下架"这类人类可读的原因传给父类存储
  }
}
```

### 8.2 service/DishService.java

```java
package com.shop.lab.service;

import com.shop.lab.exception.BusinessException;
import com.shop.lab.mapper.DishMapper;
import com.shop.lab.pojo.Dish;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
// ↑ 声明为 Spring 组件：启动时被扫描、实例化、放进容器。
//   实例是单例——呼应 01册 §11：单例 Bean 里不能存请求级状态，
//   本类全部状态都在方法参数/局部变量里，安全
public class DishService {

  @Autowired
  // ↑ 让 Spring 把容器里的 DishMapper 代理注入进来。
  //   你没写过 DishMapper 的实现类——那是 @Mapper 生成的（§6 讲过）
  private DishMapper dishMapper;

  private static final int MAX_LIMIT = 50;
  // ↑ 列表上限，写成常量防止魔法数字散落各处

  public Long createDish(Dish dish) {
    dishMapper.insert(dish);
    // ↑ 影响行数恒为 1，不必判断；真正的价值在下一行——
    return dish.getId();
    // ↑ insert 后对象 id 已被 keyProperty 回填（§7.2），
    //   调用方拿到新 id 可以立刻做后续操作
  }

  public void updateDish(Dish dish) {
    int rows = dishMapper.updateDish(dish);
    // ↑ 接住影响行数——不判断就当成功，是 03册 §12 高频坑第 3 条
    if (rows == 0) {
      throw new BusinessException("菜品不存在或不属于当前商家");
      // ↑ rows=0 的三种含义（§7.3 原文）：库存不足/已下架/不是你的资源。
      //   这里是"不是你的资源或不存在"。抛异常=本次请求整体失败
    }
  }

  public void toggleStatus(Long id, Long merchantId, Integer status) {
    int rows = dishMapper.toggleStatus(id, merchantId, status);
    if (rows == 0) {
      throw new BusinessException("菜品不存在或不属于当前商家");
    }
  }

  public List<Dish> listDish(Long merchantId, Integer status, Long categoryId, Integer limit) {
    if (merchantId == null) {
      throw new IllegalArgumentException("merchantId 必填");
      // ↑ §8.3 危险点的服务层一半：动态条件全空=全表查，先在门口拦下
    }
    int safeLimit = (limit == null || limit < 1 || limit > MAX_LIMIT) ? MAX_LIMIT : limit;
    // ↑ §11.1 "limit 上限校验"落地：超界/不传都收敛到 50，不让客户端拉全表
    return dishMapper.listDish(merchantId, status, categoryId, safeLimit);
  }

  public void deductStock(Long dishId, int qty) {
    int rows = dishMapper.deductStock(dishId, qty);
    if (rows == 0) {
      throw new BusinessException("库存不足或已下架");
      // ↑ §7.3 原文场景原样落地：单条 SQL 扣不到，就是业务失败，
      //   抛出让上层（将来的事务）回滚
    }
  }
}
```

**原文锚点**：§7.3「update 的返回值必须判断。rows=0 不是异常，是业务失败信号：库存不足/已下架/不是你的资源」——本类四个写方法全部遵守；§8.3「服务层要强制关键条件」——`listDish` 的第一行。

顺带回答一个"为什么 Service 不自己 new DishMapper"：实操笔记 01 的分层心智（Controller→Service→Mapper）+ 03 册 §5 三件套之三——对象创建和装配交给 Spring，你只声明依赖关系。这就是 01 册 §14 对照表里「手动 new Service → IoC/DI 注入」那一行。

## 9. DishMapperTest.java：只敲不跑，注释写"应该发生什么"

```java
package com.shop.lab;

import com.shop.lab.exception.BusinessException;
import com.shop.lab.mapper.DishMapper;
import com.shop.lab.pojo.Dish;
import com.shop.lab.service.DishService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.List;

@SpringBootTest
// ↑ 启动整个 Spring 容器再跑测试（会读 application.yml 连上 MySQL）——
//   所以今晚只敲不跑：一跑就需要数据库。苍穹第一周原样运行
class DishMapperTest {

  @Autowired DishMapper dishMapper;
  @Autowired DishService dishService;
  // ↑ 从测试容器注入被测对象。字段注入在测试代码里是常见写法

  @Test
  void testInsertReturnId() {
    Dish d = new Dish();
    d.setMerchantId(1L); d.setCategoryId(1L);
    d.setName("白切鸡"); d.setPrice(3200L); d.setStock(6); d.setStatus(1);
    Long id = dishService.createDish(d);
    // 【跑起来应看到】返回的 id 非空，且 == d.getId()（回填成功，§7.2）
    System.out.println("new id = " + id);
  }

  @Test
  void testUpdateNotYours() {
    Dish d = new Dish();
    d.setId(1L); d.setMerchantId(2L); d.setPrice(999L);
    // ↑ 商家2 想改商家1 的 1 号菜（种子数据里 1 号菜属于商家1）
    dishService.updateDish(d);
    // 【跑起来应看到】抛 BusinessException；数据库里 1 号菜价格纹丝不动。
    //   这就是 where 带归属条件的价值（§3.3 原文场景复现）
  }

  @Test
  void testListDynamic() {
    List<Dish> a = dishService.listDish(1L, 1, null, 10);
    // 【应看到】商家1 全部上架菜（含 status 过滤，不含下架的隔夜凉菜）
    List<Dish> b = dishService.listDish(1L, 1, 2, 10);
    // 【应看到】再按 categoryId=2 过滤，只剩分类2 的菜——<if> 生效证据
    List<Dish> c = dishService.listDish(null, 1, null, 10);
    // 【应看到】抛 IllegalArgumentException——服务层强制关键条件（§8.3）
    System.out.println(a.size() + " " + b.size());
  }

  @Test
  void testDeductInsufficient() {
    // 种子数据：2号菜"番茄炒蛋" stock=1
    dishService.deductStock(2L, 2);
    // 请求扣 2 件 > 库存 1 件
    // 【跑起来应看到】抛 BusinessException("库存不足或已下架")；
    //   再 selectById(2L) 查库存应仍是 1——where 的 stock>=#{qty} 拦住了，
    //   绝不会出现 stock 被扣成 -1
  }

  @Test
  void testDeductOk() {
    dishService.deductStock(1L, 3);
    // 1号菜 stock=10 扣 3
    // 【应看到】不抛异常；selectById(1L).getStock()==7，version 加了 1
  }
}
```

**原文锚点**：§11.1 五条要求 ↔ 五个测试方法一一对应；`testDeductInsufficient` 就是验收测试「影响行数 0 抛库存不足」的复现。运行与环境（含 §11.2 订单事务全套：锁商家、按 dishId 升序扣、插订单快照、标券、清购物车、写 outbox）都是苍穹外卖第一周的内容——到时这套代码原样是那周的起点。

## 10. 两张收尾对照表

### 10.1 你敲的每一段，替你省了 JDBC 哪段（03 册 §6 表格的实操版）

| 今晚敲的 | JDBC 里对应的手写段（03册出处） |
| --- | --- |
| `resultType="Dish"` + 驼峰开关 | `while(rs.next())` 逐列 `rs.getLong("...")` 装对象（§2.2 mapRow） |
| `#{id}` | `ps.setLong(1, id)` 的占位与传参（§1.3） |
| `useGeneratedKeys` | `RETURN_GENERATED_KEYS` + `getGeneratedKeys()`（§3.1） |
| Mapper 接口调用 | DriverManager/连接/Statement/ResultSet 四件套全套（§1.3） |
| yml 的 hikari 三行 | HikariConfig 六行 Java（§4） |
| 将来的 `@Transactional` | `setAutoCommit(false)` + commit/rollback 手动事务（§3.4） |

### 10.2 本练习命中的高频坑自查（03 册 §12）

- 坑 2「update/delete 忘写归属条件」→ §7.3/7.4 的 where 已防。
- 坑 3「不判断影响行数」→ Service 四个写方法全判断。
- 坑 4「resultType 靠巧合映射」→ 驼峰开关是显式配置，不是巧合；列名真对不上时升级 resultMap（§8.1）。
- 坑 10「把 MyBatis 当黑盒」→ log-impl 开着，跑起来时每条 SQL 都打印，看它拼了什么。

## 11. 今晚收尾

面板「手册精读记录」第 4 行建议：`03 册全册 + 菜品DAO五连（只敲未跑）`；关键词候选：**useGeneratedKeys 回填；归属条件进 where；原子扣库存**。敲码时长和卡壳处顺手记一行，9-16 晚苍穹第一天直接回来对着跑。

#{} 与 ${} 最后再念一遍（§8.4 原文）：**#{} 预编译参数，安全，绝大多数字段值都用它；${} 字符串替换，危险，只能用于白名单**。本文件通篇没有一个 ${}，将来你要写 order by ${...} 时，先回来读 §8.4 的白名单写法。
