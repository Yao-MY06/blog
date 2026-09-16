---
title: "01 SpringBoot 项目准备、配置文件与开发规范"
published: 2026-09-16
description: "课程实操笔记第 01 篇：工程初始化、配置文件与规范。"
tags: ["Java","Spring Boot","实操笔记"]
category: "教程"
draft: false
lang: 'zh_CN'
---

对应目录：SpringBoot项目配置文件；74 准备工作-开发规范-开发模式；75 Restful；76 工程搭建；141 SpringBoot配置优先级。

## 1. 这份文档解决什么

学完 JavaSE/MySQL/JDBC/MyBatis 后，进入 SpringBoot 项目第一课不是写业务，而是统一“项目怎么搭、接口怎么设计、配置从哪里来、出错按什么规则改”。如果这里不统一，后面部门管理、员工管理会越写越乱。

## 2. 开发模式：前后端分离的心智

现代企业管理端常见是前后端分离：

```text
浏览器/前端 Vue/React
   ↓ HTTP JSON
SpringBoot Controller
   ↓
Service 业务规则
   ↓
Mapper/MyBatis
   ↓
MySQL
```

后端不再渲染页面，而是返回 JSON；前端根据 JSON 渲染表格、表单、弹窗。你要把 Controller 当成“HTTP 与业务之间的翻译层”：接收参数、校验、调用 Service、封装结果；不要把业务规则、SQL、页面判断都塞 Controller。

## 3. Restful 接口规范

Restful 的核心是用 URL 表示资源，用 HTTP 方法表示动作，用状态码表达结果。

部门管理示例：

```text
GET    /depts        查询部门列表
POST   /depts        新增部门
DELETE /depts/{id}   删除部门
GET    /depts/{id}   查询单个部门，用于修改回显
PUT    /depts/{id}   修改部门
```

不建议：

```text
/getDeptList
/addDept
/deleteDept?id=1
/updateDept
```

原因：动作全塞进 URL，HTTP 方法失去语义；网关、缓存、权限、文档工具都难以统一处理。

统一响应示例：

```java
public class Result {
  private Integer code; // 1成功 0失败，也可改成更规范的业务码
  private String msg;
  private Object data;
}
```

建议：成功失败不要只靠 200/500。参数错误 400，未登录 401，无权限 403，不存在 404，业务冲突 409。培训项目常用 `Result` 包一层，工程上还要让 HTTP 状态码尽量正确。

## 4. 工程搭建

典型结构：

```text
src/main/java/com/example/ems
 ├─ EmsApplication.java
 ├─ controller/DeptController.java
 ├─ service/DeptService.java
 ├─ service/impl/DeptServiceImpl.java
 ├─ mapper/DeptMapper.java
 ├─ pojo/Dept.java
 └─ common/Result.java
src/main/resources
 ├─ application.yml
 └─ mapper/DeptMapper.xml
```

最小依赖：Web、MyBatis、MySQL 驱动、Lombok 可选、Validation 建议加。工程搭建时先跑通 `/health` 或一个 `/depts` 空列表，再接数据库，分层验证。

## 5. application.yml 与配置优先级

示例：

```yaml
server:
  port: 8080
spring:
  application:
    name: ems
  datasource:
    url: jdbc:mysql://localhost:3306/ems?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8mb4
    username: root
    password: ${DB_PASSWORD:123456}
mybatis:
  mapper-locations: classpath:mapper/*.xml
  configuration:
    map-underscore-to-camel-case: true
logging:
  level:
    com.example.ems: debug
```

常见优先级从强到弱记原则：命令行参数 > Java 系统属性 > OS 环境变量 > `application-{profile}.yml` > `application.yml` > 代码默认值。实际项目不要死背全部顺序，记“越靠近运行环境越优先；机密用环境变量覆盖，不进仓库”。

Profile 用法：

```yaml
spring:
  profiles:
    active: dev
---
spring:
  config:
    activate:
      on-profile: dev
  datasource:
    url: jdbc:mysql://localhost:3306/ems_dev
---
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: jdbc:mysql://prod:3306/ems
```

`@ConfigurationProperties` 优于满屏 `@Value`：把 `aliyun.oss.*` 或 `app.upload.*` 绑定成强类型对象，启动期校验，可生成元数据，便于重构。

## 6. 常见坑

- 端口被占用：先确认是否真的要用 8080；不要一错就乱改业务代码。
- 时区不一致：DB、JVM、连接串、服务器统一。
- 中文乱码：连接串 `characterEncoding=utf8mb4`，表也 utf8mb4。
- 配置不生效：多半是 profile 没激活、缩进错、被更高优先级覆盖。
- 把密码写进 git：用 `${DB_PASSWORD}` 占位。

## 7. 练习

1. 搭工程，返回 `GET /ping` -> `{code:1,msg:"success",data:"pong"}`。
2. 用 dev/prod 两个 profile 切换数据库名和日志级别。
3. 把上传路径做成 `app.upload.path`，分别用 `@Value` 和 `@ConfigurationProperties` 读一次，比较哪个更可维护。
