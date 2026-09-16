---
title: "JavaWeb 零基础详细教程：从只懂 Java 语法到能看懂 Spring Boot"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 01 册：Tomcat、HTTP、Servlet、JSON、Session/Cookie、JDBC、Maven，为 Spring Boot 打底。"
tags: ["Java","JavaWeb"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 假设你的基础：会写类、对象、方法、集合、异常、泛型；没做过网站后端。  
> 目标：理解浏览器访问一个网址后发生了什么；能写最小 Servlet；理解 Tomcat、HTTP、请求参数、JSON、Session/Cookie、JDBC、Maven、线程安全；为 Spring Boot 打底。  
> 学习建议：每章都动手。不要先背概念，先让请求跑起来，再回头理解名字。

---

# 第 0 章：先建立整体画面

你在浏览器输入：

```text
http://localhost:8080/hello?name=tom
```

背后发生了这些事：

1. 浏览器把 `localhost` 解析成本机，把 `8080` 当成服务器端口。
2. 浏览器通过 TCP 连接到你电脑上一个正在监听的程序，比如 Tomcat。
3. 浏览器发一段文本格式的 HTTP 请求：

```http
GET /hello?name=tom HTTP/1.1
Host: localhost:8080
User-Agent: curl/8.x
Accept: */*
```

4. 服务器程序解析这段文本，知道：方法是 GET，路径是 `/hello`，查询参数 `name=tom`。
5. 服务器找到能处理 `/hello` 的代码，执行它。
6. 你的代码返回一段内容，服务器包装成 HTTP 响应：

```http
HTTP/1.1 200 OK
Content-Type: text/plain;charset=UTF-8
Content-Length: 9

hello tom
```

7. 浏览器收到后按 `Content-Type` 展示。

JavaWeb 的本质：**用 Java 写一个能接受 TCP 连接、解析 HTTP、调用业务代码、返回 HTTP 响应的程序。**  
Tomcat 帮你做底层 socket 和 HTTP 解析；Servlet 规范规定你的处理代码长什么样；Spring/Spring Boot 再把大量重复配置自动化。

---

# 第 1 章：必须先懂的 HTTP

## 1.1 HTTP 是什么

HTTP 是应用层文本协议，规定客户端和服务器怎么说话。它不关心你返回的是 HTML、JSON、图片还是文件；它只规定：请求行、请求头、空行、请求体；响应行、响应头、空行、响应体。

一个 POST JSON 请求：

```http
POST /users HTTP/1.1
Host: api.example.com
Content-Type: application/json
Content-Length: 25

{"name":"tom","age":18}
```

一个响应：

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /users/1

{"id":1,"name":"tom"}
```

## 1.2 URL 结构

```text
http://localhost:8080/order/detail?id=100#top
\___/   \________/ \__/ \___________/ \____/
协议      主机      端口 路径          查询参数   片段(后端一般看不到)
```

后端最关心：路径、查询参数、请求头、请求体。片段 `#top` 通常只在浏览器里用，不会发给服务器。

## 1.3 方法语义

常见方法：

- GET：获取资源，参数常在 query，不应修改数据。
- POST：创建资源或触发动作，参数常在 body。
- PUT：全量替换资源。
- PATCH：局部修改。
- DELETE：删除。

REST 风格建议用语义化方法，而不是全部 POST 到 `/do?action=xxx`。

## 1.4 状态码要记大类

- 2xx：成功。200 成功，201 创建成功，204 成功但无返回体。
- 3xx：重定向/缓存。301 永久，302 临时，304 资源没变。
- 4xx：客户端错。400 参数坏，401 没登录，403 没权限，404 没有，405 方法不对，409 冲突，415 媒体类型不对。
- 5xx：服务器错。500 通用异常，502 网关拿到坏响应，503 不可用，504 网关超时。

## 1.5 请求头常见项

- `Content-Type`：请求体是什么格式，如 `application/json`。
- `Accept`：客户端希望收到什么格式。
- `Authorization`：凭证，如 `Bearer token`。
- `Cookie`：浏览器自动带上的会话凭证。
- `User-Agent`：客户端标识。
- `Content-Length` / `Transfer-Encoding`：body 长度或分块。

## 1.6 练习

用 curl 看原始请求响应：

```bash
curl -v http://localhost:8080/hello
curl -v -X POST http://localhost:8080/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"tom"}'
```

目标：能指出请求行、请求头、空行、请求体；能说出状态码含义。

---

# 第 2 章：Java 语法到 Web 之间缺了什么

普通 Java 程序从 `main` 开始，执行完就结束。Web 服务器不同：它启动后一直运行，监听端口；每来一个请求，就调用你的处理代码。

你需要补四块：

1. **网络**：端口、TCP、连接。先不用写 socket，理解概念。
2. **协议**：HTTP 文本格式。
3. **容器**：Tomcat 负责监听、解析、线程调度。
4. **规范**：Servlet/Filter/Listener 规定你的代码如何被容器调用。

类比：

- Tomcat 是餐厅前台和传菜系统：接单、排队、分配给厨师、上菜。
- Servlet 是某道菜的处理窗口：只负责“给我订单，我出菜”。
- 你的 Service 是厨师真正做菜逻辑。
- 数据库是仓库。

---

# 第 3 章：Maven：为什么不用手动下载 jar

## 3.1 没有 Maven 的痛苦

Servlet 需要 `jakarta.servlet-api`，JSON 需要 Jackson，数据库需要驱动和连接池。手动下载 jar 会遇到：版本不兼容、传递依赖缺失、同事环境不一致、升级困难。

Maven 做的是：你在 `pom.xml` 声明要什么，它从中央仓库下载，并管理编译、测试、打包。

## 3.2 最小 pom

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>web-basic</artifactId>
  <version>1.0-SNAPSHOT</version>
  <packaging>war</packaging>

  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>jakarta.servlet</groupId>
      <artifactId>jakarta.servlet-api</artifactId>
      <version>6.0.0</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>
</project>
```

`provided` 的意思是：编译需要它，但运行由 Tomcat 提供，不要把 Servlet API 打进 WAR，避免和容器自带版本冲突。

## 3.3 常用命令

```bash
mvn compile     # 编译
mvn test        # 跑测试
mvn package     # 打包成 target/web-basic.war
mvn dependency:tree -Dverbose  # 看依赖冲突
```

## 3.4 坐标是什么

`groupId:artifactId:version` 类似“组织:项目:版本”。例如 `com.fasterxml.jackson.core:jackson-databind:2.17.2`。依赖冲突本质是同一个 artifact 被不同路径要求了不同版本。

---

# 第 4 章：Tomcat：Web 容器到底干什么

## 4.1 容器职责

Tomcat 启动后做这些事：

- 监听端口，比如 8080。
- 接收 TCP 连接，解析 HTTP。
- 维护线程池，每个请求交给一个线程处理。
- 根据 URL 找到对应 Web 应用和 Servlet。
- 把 HTTP 请求包装成 `HttpServletRequest`，准备 `HttpServletResponse`。
- 调用 Servlet 的 `service` 方法。
- 把你写出的内容发回客户端。
- 管理 Session、错误页、静态资源、JSP（现代后端少用作视图）等。

## 4.2 传统部署与嵌入式部署

传统方式：你打 WAR，放进外部 Tomcat 的 `webapps`。  
Spring Boot 方式：Tomcat 被打进应用里，`main` 方法直接启动。

概念相同：都有一个容器监听端口并调用你的代码；不同是“谁启动谁”。

## 4.3 目录结构概念

传统 WAR 大致：

```text
web-basic.war
 ├─ WEB-INF/
 │  ├─ web.xml          # 老式配置；现代多用注解或 Java 配置
 │  └─ classes/         # 编译后的 class
 └─ static files
```

现在学习不需要死守 `web.xml`，但要知道它曾经负责把 URL 映射到 Servlet。注解 `@WebServlet` 是后来的简化。

---

# 第 5 章：Servlet 最小可运行示例

## 5.1 第一个 Servlet

```java
package com.example.web;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/hello")
public class HelloServlet extends HttpServlet {
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    String name = req.getParameter("name");
    if (name == null || name.isBlank()) name = "world";

    resp.setCharacterEncoding("UTF-8");
    resp.setContentType("text/plain;charset=UTF-8");
    resp.getWriter().write("hello " + name);
  }
}
```

访问：

```text
http://localhost:8080/web-basic/hello?name=tom
```

注意：`/web-basic` 是应用上下文路径，传统部署常等于 WAR 名；嵌入式 Spring Boot 默认是空，所以后来你看到的是 `/hello`。

## 5.2 `HttpServletRequest` 能拿到什么

```java
String method = req.getMethod();          // GET/POST
String uri = req.getRequestURI();         // /web-basic/hello
String query = req.getQueryString();      // name=tom
String name = req.getParameter("name");   // query 或 form 表单参数
String ua = req.getHeader("User-Agent");
Cookie[] cookies = req.getCookies();
var body = req.getInputStream();          // POST body 原始流
```

## 5.3 `HttpServletResponse` 能设置什么

```java
resp.setStatus(201);
resp.setContentType("application/json;charset=UTF-8");
resp.setHeader("X-Trace-Id", "abc");
resp.getWriter().write("{\"ok\":true}");
```

原则：先设置 status/header/contentType，再写 body。body 一旦提交，前面想改 header 可能来不及。

## 5.4 GET 和 POST 的区别要落到代码

GET 参数在 query：

```text
/search?keyword=phone&page=1
```

POST 表单参数：

```java
String name = req.getParameter("name"); // application/x-www-form-urlencoded 也能 getParameter
```

POST JSON 不能用 `getParameter`，要读 body：

```java
String json = new String(req.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
```

这是为什么后来 Spring 里会有 `@RequestParam`、`@RequestBody`、`@PathVariable` 的区分。

---

# 第 6 章：JSON：为什么前后端用它说话

## 6.1 JSON 是什么

JSON 是文本数据格式，和语言无关：

```json
{"id":1,"name":"tom","tags":["a","b"],"active":true}
```

对应 Java 可以是 Map，也可以是强类型类：

```java
public record User(long id, String name, List<String> tags, boolean active) {}
```

## 6.2 序列化与反序列化

- Java 对象 -> JSON 字符串：序列化，服务器返回数据时发生。
- JSON 字符串 -> Java 对象：反序列化，服务器接收请求时发生。

Spring 默认用 Jackson 自动做。你学习底层时要理解：这不是魔法，是读取 body 文本后按字段映射。

## 6.3 常见错误

- 请求头没写 `Content-Type: application/json`，服务器当成表单。
- JSON 语法错，状态码 400。
- 字段类型不匹配，比如 `"age":"abc"` 转 int 失败。
- 日期格式不统一，建议统一 ISO-8601，如 `2026-08-21T10:00:00`。

---

# 第 7 章：Cookie 与 Session：HTTP 无状态怎么办

## 7.1 HTTP 无状态

服务器默认不记得上一个请求是谁。两次请求从协议上看是独立的。但登录系统需要知道“刚才登录过的人现在又请求了”。

## 7.2 Cookie

服务器响应：

```http
Set-Cookie: SESSIONID=abc123; Path=/; HttpOnly
```

浏览器保存后，以后同域请求自动带：

```http
Cookie: SESSIONID=abc123
```

Cookie 是浏览器存的键值对。它能被偷、被改，所以不要放敏感明文；登录态通常只放一个随机 Session ID 或签名 token。

## 7.3 Session

Session 是服务器端根据 Session ID 找出的用户会话数据。流程：

1. 登录成功，服务器创建 Session，存 `userId=1001`。
2. 响应种 Cookie：`JSESSIONID=xyz`。
3. 浏览器下次请求带 Cookie。
4. 服务器找到 Session，知道这是用户 1001。

Servlet 里：

```java
HttpSession session = req.getSession(true);
session.setAttribute("userId", 1001L);
Object uid = session.getAttribute("userId");
```

## 7.4 重要安全问题

- `HttpOnly`：JS 不能读 Cookie，降低 XSS 偷 Cookie 风险。
- `Secure`：只走 HTTPS。
- `SameSite`：降低 CSRF 风险。
- Session 固定攻击：登录成功后应更换 Session ID。
- 分布式系统多台机器共享 Session 麻烦，后来才有 JWT、Redis Session、网关鉴权等方案。

---

# 第 8 章：Filter：在到达 Servlet 前统一做事

Filter 像安检，在请求进 Servlet 前后执行。适合做：

- 统一编码。
- 登录检查。
- 访问日志。
- 跨域头。
- 包装 request/response。

```java
@WebFilter("/api/*")
public class LogFilter implements Filter {
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    long start = System.nanoTime();
    chain.doFilter(request, response); // 放行，不调用就进不了后面的 Servlet
    long cost = System.nanoTime() - start;
    System.out.println("cost ns = " + cost);
  }
}
```

关键：`chain.doFilter` 是“继续往下走”。不调用，请求被截断；调用前后都可加逻辑。后来 Spring 的拦截器、安全过滤器链都是这个思想的更高级形态。

---

# 第 9 章：MVC 思想：不要把所有代码塞 Servlet

一个差 Servlet 可能同时做：读参数、拼 SQL、算业务、写 HTML。问题：难测试、难复用、改一处崩一片。

拆成三层：

- Controller/Servlet：管 HTTP，参数、状态码、响应。
- Service：管业务规则，比如库存够不够、订单能否取消。
- Repository/DAO：管数据库访问。

```java
class OrderServlet extends HttpServlet {
  private OrderService service = new OrderService();

  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    CreateOrder cmd = readJson(req, CreateOrder.class);
    try {
      OrderView view = service.create(cmd);
      writeJson(resp, 201, view);
    } catch (NotEnoughStockException e) {
      writeJson(resp, 409, Map.of("error", e.getMessage()));
    }
  }
}
```

Spring MVC 本质就是把“按 URL 找方法、绑定参数、写 JSON、处理异常”做成通用框架，你只写：

```java
@PostMapping("/orders")
OrderView create(@RequestBody CreateOrder cmd) { ... }
```

但你要记住：底下仍然是 Servlet 那套 request/response。

---

# 第 10 章：JDBC：Java 怎么连数据库

## 10.1 JDBC 是什么

JDBC 是 Java 访问数据库的标准 API。不同数据库提供驱动：MySQL Connector、PostgreSQL Driver。你写同一套接口，驱动负责和具体数据库通信。

核心对象：

- `DataSource`：连接工厂，生产用连接池。
- `Connection`：一次数据库会话。
- `PreparedStatement`：预编译 SQL，防注入。
- `ResultSet`：查询结果游标。

## 10.2 为什么不能字符串拼 SQL

错误：

```java
String sql = "select * from user where name = '" + name + "'";
```

如果 `name` 是 `' or '1'='1`，SQL 被改写。必须参数化：

```java
String sql = "select id,name from user where name = ?";
try (PreparedStatement ps = conn.prepareStatement(sql)) {
  ps.setString(1, name);
  try (ResultSet rs = ps.executeQuery()) {
    while (rs.next()) {
      long id = rs.getLong("id");
      String n = rs.getString("name");
    }
  }
}
```

## 10.3 事务手动版

```java
conn.setAutoCommit(false);
try {
  // 多条 SQL
  conn.commit();
} catch (Exception e) {
  conn.rollback();
  throw e;
} finally {
  conn.setAutoCommit(true);
}
```

Spring 的 `@Transactional` 就是把这套模板用代理封装，但本质仍是 connection 的 commit/rollback。

## 10.4 连接池

创建数据库连接很贵，不能每个请求新建。连接池预先维护一批连接，借出、归还、校验、限流。HikariCP 是常用实现。你要记住：池大小是数据库入口闸门，不是越大越快。

---

# 第 11 章：线程安全：Web 服务器是多线程的

这点很多初学者忽略。Tomcat 会用多个线程同时调用你的 Servlet/Controller。所以：

错误：

```java
@WebServlet("/count")
public class CountServlet extends HttpServlet {
  private int count; // 危险：所有请求共享

  protected void doGet(...) {
    count++;
    resp.getWriter().write(String.valueOf(count));
  }
}
```

`count++` 不是原子操作，会丢更新。更严重的是把某个请求的用户、订单、临时文件路径存在成员变量，会串请求。

规则：

- Controller/Servlet/Service 默认无状态。
- 请求数据放局部变量、方法参数、request attribute。
- 共享计数用 `AtomicLong`；共享缓存用并发容器或成熟缓存。
- 单例 Bean 里不要保存请求级状态。

---

# 第 12 章：异常处理：别把堆栈直接甩给用户

底层 Servlet 里如果不处理异常，容器可能返回默认 500 页，泄露类名、SQL、路径。正确做法是分层处理：

- 参数错误：400，告诉哪个字段错。
- 未登录：401。
- 无权限：403。
- 不存在：404。
- 业务冲突：409。
- 未知异常：500，记录详细日志，响应只给通用信息和 traceId。

```java
try {
  // ...
} catch (BusinessException e) {
  writeJson(resp, 409, Map.of("error", e.getMessage(), "traceId", traceId));
} catch (Exception e) {
  log.error("unexpected", e);
  writeJson(resp, 500, Map.of("error", "internal error", "traceId", traceId));
}
```

Spring 的 `@RestControllerAdvice` 就是把这类重复处理集中起来。

---

# 第 13 章：一个纯 Servlet 小项目：用户注册查询

目标：不用 Spring，打通 HTTP -> JSON -> JDBC -> 事务 -> 异常。

功能：

- `POST /users`：创建用户，name 唯一。
- `GET /users/{id}`：按 id 查询。
- name 重复返回 409；id 不存在 404；JSON 坏 400。

步骤建议：

1. Maven 引入 servlet-api、Jackson、PostgreSQL 驱动、HikariCP。
2. 写 `Json` 工具类：读 request body 成对象；把对象写进 response。
3. 写 `UserDao`：insert、findById、findByName，全部 PreparedStatement。
4. 写 `UserService`：检查重名，开启事务，插入，提交，异常回滚。
5. 写 `UserServlet`：解析路径，分发 GET/POST，捕获异常映射状态码。
6. 写 `Db`：启动时建表，用 HikariCP 提供连接。
7. curl 测试所有状态码。

你要在这个项目里亲手体验：参数绑定、JSON 转换、SQL、事务、唯一约束、异常映射都是重复模式。体验过，再学 Spring 才知道它替你封装了什么。

---

# 第 14 章：从 Servlet 到 Spring 的对应关系

学 Spring 时不要把它当新世界，对照底层：

| JavaWeb 底层 | Spring/Spring Boot 对应 |
|---|---|
| Tomcat 监听端口 | 嵌入式容器自动启动 |
| `web.xml`/注解映射 URL | `@RequestMapping` 与 HandlerMapping |
| `HttpServletRequest` 手动读参数 | `@RequestParam/@PathVariable/@RequestBody` |
| 手动 Jackson 读写 | HttpMessageConverter 自动序列化 |
| Filter | Filter + Interceptor + SecurityFilterChain |
| 手动 new Service | IoC/DI 注入 |
| 手动 setAutoCommit/commit/rollback | `@Transactional` |
| 到处 try/catch 映射状态码 | `@RestControllerAdvice` |
| 手动配置数据源/JSON/端口 | 自动配置 + application.yml |

Spring 的价值：把“每个请求都要做的样板”抽象成框架；你的价值：写业务规则、状态机、事务边界、失败处理。

---

# 第 15 章：学 Spring Boot 前的验收清单

能独立做到这些，再进 Spring Boot 会很快：

- 能画出一次 HTTP 请求从浏览器到 Java 方法再回浏览器的路径。
- 能解释 GET/POST、query/form/body、path variable 的区别。
- 能用 curl 复现 400/401/404/409/500。
- 能写一个 `@WebServlet` 处理 GET 和 POST JSON。
- 能说明 Cookie/Session 如何维持登录态，以及 HttpOnly/Secure/SameSite 意义。
- 能用 JDBC + PreparedStatement 做 CRUD，知道为什么不能拼 SQL。
- 能手动写一个事务，并说出 commit/rollback 时机。
- 能解释为什么 Servlet/Controller 不能有请求级成员变量。
- 能用 Maven 看依赖树，理解版本冲突。

---

# 第 16 章：接下来怎么接 Spring Boot

建议顺序：

1. 用本教程第 13 章做纯 Servlet 小项目，哪怕丑也要跑通。
2. 然后用 Spring Boot 重写同一个项目。每用一个注解，问：它替代了我手写哪段？
   - `@RestController` 替代继承 HttpServlet。
   - `@PostMapping` 替代 URL 映射。
   - `@RequestBody` 替代手动读 body + Jackson。
   - `@Service` + 构造器注入替代手动 new。
   - `@Transactional` 替代手动 commit/rollback。
   - `@RestControllerAdvice` 替代每个 Servlet 的异常 try/catch。
3. 最后读我之前给你的 Spring Boot 详细教程，重点看：自动配置、请求管线、事务、测试、生产化。

---

# 附录：最小知识速查

- 端口：一台机器上区分不同服务进程的编号，0~65535。
- localhost：本机，通常是 127.0.0.1。
- TCP：可靠字节流，HTTP/1.1、HTTP/2 常建立在其上。
- 进程：正在运行的程序；Tomcat 是一个进程。
- 线程：进程内执行单元；Tomcat 用线程池处理并发请求。
- WAR：传统 Web 应用包，丢给外部 Tomcat。
- JAR：可执行应用包，Spring Boot 默认内嵌 Tomcat。
- JSON：文本数据格式，前后端常用。
- REST：用 URL 表资源、HTTP 方法表动作、状态码表结果的设计风格。
- CRUD：Create/Read/Update/Delete。
- SQL 注入：把用户输入拼进 SQL 导致语义被改；用 PreparedStatement 防。
- 幂等：重复执行一次和多次结果相同；支付、回调、重试必须考虑。

你下一步最该做的不是继续看，而是完成第 13 章那个纯 Servlet 小项目。跑通后，Spring Boot 会从“一堆注解”变成“哦，它是在帮我省掉这些样板”。
