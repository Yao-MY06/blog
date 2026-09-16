---
title: "SpringBoot 详细教程"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 04 册：从环境搭建到核心机制的完整 Spring Boot 教程，1548 行长文。"
tags: ["Java","Spring Boot"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 适用对象：有 Java 基础，想系统掌握 Spring Boot 的学习者。  
> 主线：Spring Boot 3.x / Spring Framework 6.x / Java 17+。涉及 2.x 时会明确标注 `javax.*` 与 `jakarta.*` 等差异。  
> 阅读方式：每章按“概念是什么 → 为什么需要 → 最小可运行示例 → 深入机制 → 常见坑 → 练习”组织。建议边看边敲，不要只收藏。

---

# 第一部分：认知与环境

## 第 1 章：先弄清楚 Spring、Spring Boot、Spring Cloud 的关系

### 1.1 三者分别是什么

- **Java**：语言与运行时。你写的是类、接口、泛型、集合、并发、IO。
- **Spring Framework**：企业级 Java 应用基础框架，核心是容器、依赖注入、AOP、资源抽象、事务抽象、Web MVC、数据访问、测试支持等。
- **Spring Boot**：让 Spring 应用“快速跑起来”的框架，提供 starter、自动配置、嵌入式服务器、外部化配置、Actuator、默认安全与日志集成。
- **Spring Cloud**：在 Spring Boot 之上做分布式系统能力，如配置中心、服务发现、网关、熔断、负载均衡、消息总线等。它不是必须项。

一句话理解：

> Spring Framework 是发动机与底盘；Spring Boot 是把发动机、底盘、仪表盘、启动钥匙、出厂调校装好的一辆车；Spring Cloud 是车队调度系统。

### 1.2 为什么 Spring Boot 会成为主流

在没有 Spring Boot 的时代，搭一个 Spring Web 项目常见工作包括：选择 Spring 版本、对齐依赖、配置 `web.xml` 或 Java Config、装 Tomcat、配 DispatcherServlet、配扫描包、配数据源、配事务、配日志、处理版本冲突。问题不在于“做不到”，而在于每个项目都重复做，且默认值并不统一。

Spring Boot 的意义在于：

1. **把经验固化为默认行为**：绝大多数 Web 应用都需要 JSON、嵌入容器、健康检查、统一配置，于是框架先给你合理默认。
2. **把兼容问题收敛到 BOM**：`spring-boot-dependencies` 管理常用库版本，减少“这个 Spring 配哪个 Jackson/Hibernate/Tomcat”的试错。
3. **把运行单元变成进程**：可执行 JAR 更适合容器、CI/CD、弹性扩缩容。
4. **把运维能力前置**：健康检查、指标、环境端点不是上线前才补，而是开发期就可用。

### 1.3 什么时候不该神化 Spring Boot

- 它不是“不用懂原理”的许可证。自动配置越方便，越需要知道默认行为从哪来、如何关闭、如何替换。
- 它不是微服务代名词。一个 Spring Boot 应用可以是单体、批处理、消费者、CLI、网关、任务 worker。
- 它不保证性能。错误事务边界、N+1、无界缓存、重试风暴、阻塞调用，照样把系统拖垮。

---

## 第 2 章：环境准备与工程骨架

### 2.1 必备工具

- JDK 17+：Spring Boot 3.x 基线。建议用 SDKMAN、jenv 或系统包管理器管理多版本。
- Maven 或 Gradle：本教程示例用 Maven；概念同样适用于 Gradle。
- IDE：IntelliJ IDEA 推荐；VS Code + Java 扩展也可以。
- Docker：用于跑数据库、消息队列、Prometheus 等依赖。
- HTTP 客户端：curl、HTTPie、Postman 或 IDE 内置 HTTP Client。
- 数据库客户端：DataGrip、DBeaver、psql/mysql CLI。

检查环境：

```bash
java -version
mvn -version
docker version
```

### 2.2 创建项目

推荐使用 Spring Initializr：选择 Maven、Java 17、Spring Boot 3.x，依赖先只选 `Spring Web`。项目生成后，最小结构如下：

```text
demo/
 ├─ pom.xml
 └─ src/
    ├─ main/
    │  ├─ java/com/example/demo/DemoApplication.java
    │  └─ resources/application.yml
    └─ test/java/com/example/demo/DemoApplicationTests.java
```

最小 `pom.xml` 关键片段：

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.4.0</version>
  <relativePath/>
</parent>

<properties>
  <java.version>17</java.version>
</properties>

<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>
```

> 版本号示例仅说明结构；实际使用以 Initializr 当前可选版本为准。

### 2.3 第一个可运行接口

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
public class DemoApplication {
  public static void main(String[] args) {
    SpringApplication.run(DemoApplication.class, args);
  }
}

@RestController
class HelloController {
  @GetMapping("/hello")
  String hello() {
    return "hello spring boot";
  }
}
```

运行：

```bash
mvn spring-boot:run
# 或
mvn package && java -jar target/demo-0.0.1-SNAPSHOT.jar
```

验证：

```bash
curl http://localhost:8080/hello
```

### 2.4 工程结构推荐

小项目可以按层分包，但中大型项目更推荐按业务域分包，再在每个域内放 api/service/domain/repository：

```text
com.example.shop
 ├─ ShopApplication.java
 ├─ order/
 │  ├─ api/OrderController.java
 │  ├─ api/dto/CreateOrderRequest.java
 │  ├─ service/OrderService.java
 │  ├─ domain/Order.java
 │  ├─ domain/OrderStatus.java
 │  └─ infra/OrderRepository.java
 ├─ payment/
 ├─ catalog/
 └─ common/
    ├─ error/GlobalExceptionHandler.java
    ├─ web/ApiResult.java
    └─ config/TimeConfig.java
```

为什么不推荐长期只用 `controller/service/dao/entity` 大平层：业务增长后，订单相关规则散落在四层目录，修改一个用例要跨包找文件；按域聚合能降低认知成本，也为未来拆服务留边界。

### 2.5 练习

1. 新建 `/hello?name=tom`，返回 `hello tom`，参数默认值为 `world`。
2. 把端口改为 `9090`，再用环境变量覆盖为 `9091`。
3. 打开启动日志的 debug，观察 Tomcat、Jackson、MVC 哪些自动配置生效。

---

# 第二部分：容器与装配机制

## 第 3 章：IoC/DI 详细拆解

### 3.1 没有容器时的问题

假设订单服务需要库存服务和支付客户端：

```java
class OrderService {
  private InventoryService inventory = new InventoryService();
  private PaymentClient payment = new PaymentClient("https://pay.internal");
}
```

问题：

- 测试时无法替换成假支付客户端。
- 支付地址硬编码，环境切换要改代码。
- 对象创建散落各处，生命周期没人统一管。
- 想加日志、事务、缓存，要改业务构造过程。

控制反转把“我来 new”改成“容器给我装配好”。

### 3.2 构造器注入为什么是默认推荐

```java
@Service
public class OrderService {
  private final InventoryService inventory;
  private final PaymentClient payment;

  public OrderService(InventoryService inventory, PaymentClient payment) {
    this.inventory = inventory;
    this.payment = payment;
  }
}
```

优势：

- **依赖显式**：构造器参数就是这个类的协作者清单。
- **不可变**：字段可 `final`，避免运行期被意外替换。
- **易测试**：`new OrderService(fakeInventory, fakePayment)` 即可。
- **暴露坏味道**：构造器超过 4~6 个参数，往往说明职责过多，可拆 UseCase、Policy、Gateway。

字段注入的问题不是“不能跑”，而是隐藏依赖、阻碍 final、单测必须起容器或反射塞值。Setter 注入适合可选依赖，核心协作者用构造器。

### 3.3 Bean 名称与注入冲突

接口有两个实现时：

```java
interface Notifier { void send(String msg); }

@Component class SmsNotifier implements Notifier { public void send(String msg){} }
@Component class MailNotifier implements Notifier { public void send(String msg){} }
```

直接注入 `Notifier` 会报 `NoUniqueBeanDefinitionException`。解决方式按语义选择：

- `@Primary`：标一个默认实现，其余场景显式指定。
- `@Qualifier("smsNotifier")`：调用点明确选谁。
- 注入 `List<Notifier>`：广播或按条件选择。
- 改设计：如果总要根据渠道选 notifier，抽象成 `NotifierRouter`，比在一堆注入点写 `@Qualifier` 更清楚。

### 3.4 Bean 生命周期关键点

简化顺序：实例化 → 属性填充 → Aware 回调 → BeanPostProcessor 前置 → 初始化（`@PostConstruct`、`InitializingBean`、init-method）→ BeanPostProcessor 后置（常在此生成代理）→ 使用 → 销毁。

要理解几个钩子：

- `BeanPostProcessor`：框架增强 Bean 的核心扩展点，AOP 代理、注解处理常靠它。
- `@PostConstruct`：依赖已注入后执行轻量初始化；不要做长时间远程连接预热，避免拖慢启动与失败定位。
- `SmartLifecycle`/`ApplicationRunner`：适合需要按阶段启动/停止的资源，如消费者、调度器、连接预热。

### 3.5 作用域与状态

- singleton：默认。适合无状态服务。禁止存请求级可变字段。
- prototype：每次获取新建。很少用于 Web 服务层，多用于需要短生命周期的组件。
- request/session：Web 上下文 Bean，通常通过代理注入 singleton 使用。

错误示例：

```java
@Service
class BadCartService {
  private String currentUser; // 危险：singleton 存请求状态
}
```

正确做法：把用户身份作为方法参数，或封装在请求上下文对象中传递；不要轻易用裸 ThreadLocal 传遍全链路，异步/线程池切换会丢上下文。

### 3.6 练习

1. 写两个 `Clock` 实现：系统时钟与固定时钟；测试注入固定时钟，生产注入系统时钟。
2. 故意制造两个同接口 Bean，观察启动异常，再用三种方式分别解决。
3. 在 Bean 中打印构造、`@PostConstruct`、销毁日志，关闭容器观察顺序。

---

## 第 4 章：自动配置从“魔法”到可读

### 4.1 自动配置本质

自动配置不是启动时随机扫描所有类，而是：

1. 读取候选自动配置类清单。
2. 每个配置类上有条件注解。
3. 条件满足才创建其中声明的 Bean。
4. 用户显式 Bean 通常优先，默认实现使用 `@ConditionalOnMissingBean` 退让。

在 Boot 3.x，候选清单位于：

```text
META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

在 Boot 2.x，多通过 `META-INF/spring.factories` 的 `EnableAutoConfiguration` key。

### 4.2 常见条件注解

- `@ConditionalOnClass`：classpath 有某类才生效。例如有 `DataSource` 才考虑数据源自动配置。
- `@ConditionalOnMissingClass`：没有某类才生效，适合互斥栈。
- `@ConditionalOnBean` / `@ConditionalOnMissingBean`：容器已有/没有某 Bean。
- `@ConditionalOnProperty`：属性开关控制。
- `@ConditionalOnWebApplication`：只在 Web 应用生效。
- `@ConditionalOnExpression`：SpEL 表达式，慎用，读性差。

### 4.3 手写一个迷你 Starter

目标：提供一个 `GreetingService`，默认实现是 `SimpleGreetingService`，用户可自定义覆盖，可用属性关闭。

模块一：autoconfigure

```java
@ConfigurationProperties(prefix = "demo.greeting")
public class GreetingProperties {
  private boolean enabled = true;
  private String prefix = "hello";
  // getters/setters
}
```

```java
@AutoConfiguration
@ConditionalOnClass(GreetingService.class)
@EnableConfigurationProperties(GreetingProperties)
public class GreetingAutoConfiguration {

  @Bean
  @ConditionalOnProperty(prefix = "demo.greeting", name = "enabled", havingValue = "true", matchIfMissing = true)
  @ConditionalOnMissingBean
  GreetingService greetingService(GreetingProperties props) {
    return new SimpleGreetingService(props.getPrefix());
  }
}
```

在 `src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 写入：

```text
com.example.demoautoconfigure.GreetingAutoConfiguration
```

模块二：业务项目依赖 autoconfigure 模块后，可直接注入 `GreetingService`；也可自己定义同类型 Bean 覆盖默认。

这个练习的意义在于：你亲手复刻了 Boot 的套路。以后遇到“为什么这个 Bean 有了/没了”，就知道去查条件、属性、已有 Bean，而不是玄学重启。

### 4.4 如何调试自动配置

启动加参数：

```bash
java -jar app.jar --debug
```

或开启 Actuator 后访问：

```text
/actuator/conditions
/actuator/beans
/actuator/configprops
/actuator/env
```

看报告时按四问定位：

1. 这个自动配置类在候选清单吗？
2. classpath 条件满足吗？依赖真的进来了吗？
3. 属性条件满足吗？前缀/拼写/环境覆盖对吗？
4. 是否已有用户 Bean 或已有自动配置 Bean 抢先生效？

### 4.5 练习

1. 给迷你 starter 增加 `style=upper|lower`，默认 `lower`。
2. 在业务项目自定义 `GreetingService`，确认默认实现退让。
3. 用 `demo.greeting.enabled=false` 验证服务不可注入。

---

## 第 5 章：配置体系与环境差异

### 5.1 配置优先级心智模型

常见优先级从高到低大致是：命令行参数 > Java 系统属性 > OS 环境变量 > profile 特定配置文件 > application 配置文件 > `@PropertySource` > 默认属性。不要死背全部顺序，记住原则：**越靠近运行环境、越显式的来源优先级越高；代码里的默认值最低。**

### 5.2 YAML 的正确使用

```yaml
server:
  port: 8080
  shutdown: graceful

spring:
  application:
    name: shop-api
  profiles:
    active: ${APP_PROFILE:local}
  datasource:
    url: jdbc:postgresql://localhost:5432/shop
    username: shop
    password: ${DB_PASSWORD:local-only}

app:
  security:
    cors-allowed-origins: http://localhost:5173
  feature:
    new-checkout: false
```

建议：

- 用 kebab-case：`cors-allowed-origins`，绑定到 `corsAllowedOrigins`。
- 敏感值只放占位符，真实密码来自环境变量或密钥系统。
- profile 特定文件用 `application-prod.yml`，公共项放 `application.yml`。

### 5.3 强类型配置

```java
@Validated
@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
    @NotBlank String host,
    @Min(1) @Max(65535) int port,
    @Email String from,
    Duration timeout,
    boolean enabled
) {}
```

启用：

```java
@Configuration
@EnableConfigurationProperties(MailProperties.class)
class AppConfig {}
```

或直接加 `@ConfigurationPropertiesScan` 扫描。意义：启动期绑定失败会快速报错，而不是运行到发送邮件才 NPE。

### 5.4 Profile 不是安全边界

`prod` profile 只改变行为，不保护机密。即使密码只在 `application-prod.yml`，只要文件进仓库就是泄露。正确分层：

- 非敏感默认：进仓库。
- 环境差异：环境变量/CI/CD 变量/配置中心。
- 机密：KMS、Vault、云厂商 Secret Manager，按最小权限注入。

### 5.5 练习

1. 给 `app.feature.new-checkout` 做布尔开关，控制返回旧/新文案。
2. 故意把 `app.mail.port` 配成 `70000`，启动观察绑定校验失败信息。
3. 用命令行 `--server.port=0` 随机端口启动，从日志读实际端口。

---

# 第三部分：Web 深度教程

## 第 6 章：一次 HTTP 请求的完整旅程

以 servlet 栈为例，请求大致经历：

1. 客户端建立 TCP/TLS 连接到嵌入式 Tomcat/Jetty。
2. 容器线程接收请求，构造 `HttpServletRequest/Response`。
3. 经过 Filter 链：编码、CORS、安全、请求包装等。
4. 到达 `DispatcherServlet`。
5. `HandlerMapping` 根据路径、方法、媒体类型找到 Controller 方法。
6. `HandlerAdapter` 调用方法，参数解析器完成绑定与校验。
7. 业务方法执行，可能抛异常。
8. 返回值由 `HandlerMethodReturnValueHandler` 和 `HttpMessageConverter` 写成 JSON/XML/字节流。
9. 若异常，`HandlerExceptionResolver`（含 `@RestControllerAdvice`）映射为错误响应。
10. 容器写回响应，连接按 keep-alive 策略复用或关闭。

掌握这个链路的意义：状态码和错误体不再神秘。

- 404：mapping 没找到、context-path 错、静态资源规则覆盖。
- 405：路径有但方法不对。
- 400：参数绑定/校验失败、JSON 语法错。
- 401/403：认证失败或授权不足。
- 406/415：Accept/Content-Type 与 produces/consumes 不匹配。
- 500：业务异常未处理或异常解析器没覆盖。

## 第 7 章：REST API 设计实战

### 7.1 资源与用例

以订单为例，资源是 `orders`，用例包括创建、查询详情、分页列表、取消。不要设计成 `/createOrder` `/getOrder` 这种 RPC 风格堆砌；用 HTTP 语义表达：

```text
POST   /api/v1/orders
GET    /api/v1/orders/{id}
GET    /api/v1/orders?page=0&size=20&status=CREATED
POST   /api/v1/orders/{id}/cancel
```

取消用 POST 子资源/动作，而不是 DELETE，因为订单不消失，只是状态迁移。

### 7.2 DTO 与校验

```java
public record CreateOrderRequest(
    @NotBlank String customerId,
    @NotEmpty List<@Valid Item> items,
    @Size(max = 200) String remark
) {
  public record Item(@NotBlank String sku, @Min(1) int quantity) {}
}
```

```java
@PostMapping("/api/v1/orders")
public ResponseEntity<ApiResult<OrderView>> create(@Valid @RequestBody CreateOrderRequest req) {
  OrderView view = orderService.create(req);
  return ResponseEntity.created(URI.create("/api/v1/orders/" + view.id())).body(ApiResult.ok(view));
}
```

原则：

- 创建成功用 201 + Location，不一定总返回 200。
- 查询不存在用 404；参数非法用 400；业务冲突如库存不足可用 409 或 422，全系统统一。
- 更新区分全量 PUT 与局部 PATCH；大多数业务用“命令式端点”更贴近用例，如 cancel、pay、ship。

### 7.3 统一响应与错误模型

成功包装可选；错误模型必须稳定。Spring 6 支持 `ProblemDetail`：

```java
@RestControllerAdvice
class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ProblemDetail invalid(MethodArgumentNotValidException ex) {
    ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
    pd.setTitle("请求参数不合法");
    pd.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
        .map(f -> Map.of("field", f.getField(), "message", String.valueOf(f.getDefaultMessage())))
        .toList());
    return pd;
  }

  @ExceptionHandler(OrderNotFoundException.class)
  ProblemDetail notFound(OrderNotFoundException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    pd.setTitle("订单不存在");
    return pd;
  }
}
```

不要把堆栈直接塞进 `detail`。生产可返回 traceId，便于用户报障时定位日志。

### 7.4 分页与排序

```java
@GetMapping("/api/v1/orders")
Page<OrderView> list(@RequestParam(defaultValue = "0") int page,
                     @RequestParam(defaultValue = "20") int size,
                     @RequestParam(required = false) OrderStatus status) {
  return orderService.list(status, PageRequest.of(page, Math.min(size, 100), Sort.by("createdAt").descending()));
}
```

注意：客户端 size 必须限上限，否则 `size=100000` 就是一次慢查询攻击。排序字段白名单化，避免任意列排序导致索引失效。

### 7.5 文件上传下载

上传：

```java
@PostMapping(value = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public FileView upload(@RequestPart MultipartFile file) throws IOException {
  return storage.store(file.getOriginalFilename(), file.getInputStream(), file.getSize(), file.getContentType());
}
```

下载用 `Resource` + `Content-Disposition`；大文件考虑流式、Range、对象存储预签名 URL，不要把整文件读进内存。

### 7.6 练习

1. 为订单列表加 status、createdFrom、createdTo 过滤，限制 size 最大 100。
2. 让校验错误返回 `errors` 数组，包含 field 与 message。
3. 实现取消订单：不存在 404，已发货 409，成功返回最新状态。

---

## 第 8 章：拦截器、过滤器、跨域与内容协商

### 8.1 Filter 适合什么

Filter 在 Servlet 规范层，早于 DispatcherServlet。适合：

- 请求/响应包装、Gzip、字符集。
- 访问日志与粗粒度限流。
- 安全框架底层链。
- 需要操作原始流或异步支持的场景。

不适合精细业务鉴权，因为此时还不知道会调用哪个 handler。

### 8.2 Interceptor 适合什么

```java
@Component
class LoginInterceptor implements HandlerInterceptor {
  public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
    // 可从 handler 判断是不是 HandlerMethod，读取注解
    return true;
  }
}
```

```java
@Configuration
class WebConfig implements WebMvcConfigurer {
  private final LoginInterceptor loginInterceptor;
  WebConfig(LoginInterceptor loginInterceptor) { this.loginInterceptor = loginInterceptor; }

  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(loginInterceptor)
        .addPathPatterns("/api/**")
        .excludePathPatterns("/api/public/**", "/actuator/health");
  }
}
```

适合做登录上下文、租户解析、接口耗时、灰度标记。不要做重 IO 阻塞所有请求；必要时在拦截器只做快速拒绝。

### 8.3 CORS 的本质

CORS 不是服务器“防止攻击”的通用墙，而是浏览器对跨源读取响应的限制。服务端通过响应头告诉浏览器：哪些 origin、方法、头、凭证被允许。配置：

```java
@Configuration
class CorsConfig {
  @Bean
  WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
      }
    };
  }
}
```

生产不要 `allowedOrigins("*")` 又 `allowCredentials(true)`，浏览器不允许且语义危险。

### 8.4 内容协商

同一资源可按 Accept 返回 JSON 或 XML。现代 API 通常固定 JSON；需要导出 CSV/PDF 时，建议用单独端点明确 `produces`，避免协商导致客户端拿到意外格式。

---

# 第四部分：数据访问、事务与一致性

## 第 9 章：连接池、JPA 与 SQL 透明化

### 9.1 依赖与配置

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
  <groupId>org.postgresql</groupId>
  <artifactId>postgresql</artifactId>
  <scope>runtime</scope>
</dependency>
```

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/shop
    username: shop
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      connection-timeout: 3000
      max-lifetime: 1700000
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate.jdbc.time_zone: UTC
```

生产用 `validate` 或迁移工具保证结构；不要用 `update` 自动改生产表。

### 9.2 实体与聚合边界

```java
@Entity
@Table(name = "orders")
public class Order {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String customerId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private OrderStatus status = OrderStatus.CREATED;

  @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<OrderItem> items = new ArrayList<>();

  @Version
  private long version;

  protected Order() {}

  public Order(String customerId) { this.customerId = customerId; }

  public void addItem(String sku, int qty) {
    if (status != OrderStatus.CREATED) throw new IllegalStateException("只能给新建订单加明细");
    items.add(new OrderItem(this, sku, qty));
  }

  public void cancel() {
    if (status == OrderStatus.SHIPPED) throw new IllegalStateException("已发货不能取消");
    status = OrderStatus.CANCELLED;
  }
}
```

意义：实体不只是表结构映射，也应承载不变量。能放进聚合的一致性规则，不要散落到 Controller 和多个 Service。

### 9.3 Repository 与查询选择

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
  Page<Order> findByStatus(OrderStatus status, Pageable pageable);

  @EntityGraph(attributePaths = "items")
  Optional<Order> findWithItemsById(Long id);
}
```

选择策略：

- 简单 CRUD/派生查询：方法名。
- 中等复杂：`@Query` JPQL 或 Criteria/Specification。
- 报表/复杂 SQL：DTO 投影、native query，或交给 MyBatis/查询服务。
- 需要 items 的详情：EntityGraph 或 join fetch；列表页不要 fetch 大集合。

### 9.4 N+1 复现与修复

错误模式：

```java
List<Order> orders = orderRepository.findAll();
for (Order o : orders) {
  System.out.println(o.getItems().size()); // 每次触发一条 items 查询
}
```

修复按目标选：

- 详情需要关联：`findWithItemsById`。
- 列表只要计数：写投影 `select o.id, size(o.items)` 或冗余计数列。
- DTO 只要少数字段：`select new com.example.OrderRow(o.id, o.status)`，不加载实体。

判断标准不是“用了 JPA 有没有 N+1”，而是“这个用例需要哪些数据，是否一次取回且不过度取回”。

### 9.5 OSIV 为什么建议关闭

`spring.jpa.open-in-view=false` 后，离开事务/service 层再访问懒加载会抛 `LazyInitializationException`。这看似麻烦，实际是好事：它把“视图渲染时偷偷发 SQL”的隐患提前暴露。正确做法是在 service 事务内组装好 DTO，再返回给 Web 层。

### 9.6 练习

1. 用 `@DataJpaTest` 复现 N+1，打开 SQL 日志观察查询数。
2. 把详情接口改成 EntityGraph，把列表改成 DTO 投影，对比 SQL 数与耗时。
3. 给 `Order` 加 `@Version` 乐观锁，模拟两个并发取消，观察 `ObjectOptimisticLockingFailureException`。

---

## 第 10 章：事务深入

### 10.1 `@Transactional` 语义

```java
@Transactional
public OrderView create(CreateOrderRequest req) {
  Order order = new Order(req.customerId());
  req.items().forEach(i -> order.addItem(i.sku(), i.quantity()));
  inventory.reserve(req.items()); // 本地或远程？决定一致性模型
  return OrderView.from(orderRepository.save(order));
}
```

代理逻辑：进入方法前开事务，正常返回提交，运行时异常默认回滚，受检异常默认不回滚。可配置 `rollbackFor`。

### 10.2 失效场景清单

- 自调用：`this.createInternal()` 不经过代理。
- 非 public 方法：默认只代理 public。
- final 类/方法与某些代理策略冲突。
- 同一个类里 A 调用 B，B 的 `@Transactional(propagation=REQUIRES_NEW)` 不生效，仍是自调用。
- 多数据源时注错 `transactionManager`。
- 异常被 catch 吃掉且没标记回滚。

修复方法：把需要事务的方法移到另一个 Bean；通过 `TransactionTemplate` 编程式控制；或用 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()` 在 catch 中显式回滚。

### 10.3 传播级别怎么选

- REQUIRED：默认，有就加入，没有新建。绝大多数用例。
- REQUIRES_NEW：挂起当前事务另起一个。适合独立审计日志必须提交，但要警惕“主业务回滚、审计已提交”的语义是否真是你要的。
- NESTED：基于 savepoint，数据库与驱动支持才可靠。
- SUPPORTS/NOT_SUPPORTED/MANDATORY/NEVER：用于明确边界，不要乱用。

### 10.4 事务里调用远程服务

反例：本地事务中调用支付，支付成功但本地提交失败，造成钱扣了单没成；或本地卡住长事务占连接。

可选模式：

- **先本地后远程**：本地状态置为 `PAYING`，提交后异步触发支付；支付回调再迁移状态。
- **Outbox**：同事务写业务表和 outbox 事件，relay 投递消息，消费者做远程调用。
- **Saga**：跨服务用补偿动作，不强求分布式 ACID。

核心原则：本地数据库负责可恢复事实，远程调用走可重试、幂等、可对账通道。

### 10.5 隔离级别与锁

不要一上来调最高隔离。先明确并发问题：

- 防重复扣款：唯一约束/状态机 + 乐观锁/悲观锁。
- 防超卖：库存 `update stock set qty = qty - ? where sku=? and qty >= ?` 的原子 SQL，或聚合内悲观锁。
- 报表一致性：读快照/只读事务/数据仓库，不要锁在线库。

---

# 第五部分：测试与质量

## 第 11 章：测试策略落地

### 11.1 单元测试：不启动 Spring

领域规则优先纯单测：

```java
class OrderTest {
  @Test
  void shipped_order_cannot_be_cancelled() {
    Order order = new Order("c1");
    // 构造已发货状态
    assertThrows(IllegalStateException.class, order::cancel);
  }
}
```

意义：最快、最稳定、最能表达业务规则。

### 11.2 Web 切片测试

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
  @Autowired MockMvc mvc;
  @MockBean OrderService orderService;

  @Test
  void create_returns_400_when_items_empty() throws Exception {
    mvc.perform(post("/api/v1/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"customerId\":\"c1\",\"items\":[]}"))
       .andExpect(status().isBadRequest())
       .andExpect(jsonPath("$.title").value("请求参数不合法"));
  }
}
```

`@WebMvcTest` 只加载 MVC 相关组件，不启动数据库；Service 用 mock。它验证绑定、校验、状态码、序列化。

### 11.3 数据切片测试

`@DataJpaTest` 默认用嵌入式内存库；生产是 PostgreSQL 时，建议 Testcontainers：

```java
@DataJpaTest
@Testcontainers
class OrderRepositoryTest {
  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16");

  @Autowired OrderRepository repo;

  @Test
  void find_with_items_avoids_n_plus_one() {
    // 保存数据，开 SQL 计数，断言查询次数
  }
}
```

意义：真实数据库能暴露方言、约束、索引、JSON 类型、并发锁差异，H2 经常掩盖这些。

### 11.4 集成测试要少而关键

`@SpringBootTest` + Testcontainers 验证关键链路：创建订单 → 库存预留 → outbox 事件 → 消息消费幂等。不要每个接口都全量启动，否则套件慢到没人跑。

### 11.5 测试数据与隔离

- 每个测试自己造数据，避免依赖执行顺序。
- 用事务回滚或清理策略；跨提交场景要谨慎。
- 固定时钟、固定 ID 生成器，减少随机失败。
- 外部 HTTP 用 WireMock；消息用 Testcontainers 或 Embedded 谨慎选择。

---

# 第六部分：安全、缓存、消息与任务

## 第 12 章：Spring Security 实战

### 12.1 最小安全链

```java
@Configuration
@EnableWebSecurity
class SecurityConfig {
  @Bean
  SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http
      .csrf(csrf -> csrf.disable()) // 纯无状态 API 可关；浏览器表单场景慎重
      .authorizeHttpRequests(reg -> reg
          .requestMatchers("/api/public/**", "/actuator/health").permitAll()
          .requestMatchers("/actuator/**").hasRole("OPS")
          .anyRequest().authenticated())
      .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
      .build();
  }
}
```

关键概念：

- Authentication：当前身份与凭证、权限。
- Authorization：能否访问某资源/执行某方法。
- Filter Chain：安全不是注解魔法，而是一串 servlet filter 与方法拦截。

### 12.2 JWT 的正确姿势

JWT 适合无状态资源服务器校验，但不等于天然安全：

- 签名密钥/公钥来源要可信，issuer、audience、exp 都要校验。
- token 吊销难，访问 token 要短；高风险操作二次确认。
- 权限变化要求立即生效的场景，不要只靠长寿命 JWT。
- 不要把敏感隐私塞进 payload，payload 只是 base64，不是加密。

### 12.3 方法级授权

```java
@PreAuthorize("hasAuthority('order:cancel') or #customerId == authentication.name")
public void cancel(Long orderId, String customerId) {}
```

意义：即使绕过 Controller，服务层仍有防线。表达式可读性有限，复杂规则封装成 `PermissionService` 后调用，别在注解里写长篇 SpEL。

## 第 13 章：缓存实战

```java
@Cacheable(cacheNames = "product", key = "#tenant + ':' + #sku")
public ProductView get(String tenant, String sku) { ... }

@CacheEvict(cacheNames = "product", key = "#tenant + ':' + #product.sku()")
public ProductView update(String tenant, ProductUpdate product) { ... }
```

设计清单：

- key 必含租户、版本、区域等隔离维度。
- value 大小要评估；大对象考虑拆引用或压缩。
- TTL 必须有，哪怕很长；永久缓存是内存泄漏温床。
- 穿透：缓存空值短 TTL 或布隆过滤器。
- 击穿：热点 key 逻辑过期、单飞重建。
- 雪崩：TTL 加抖动，批量预热错峰。
- 一致性：更新 DB 后删缓存，还是缓存写穿？别同时“更新缓存又删缓存”造成竞态。

## 第 14 章：消息与幂等

### 14.1 Outbox 最小模型

业务事务内：

```java
orderRepository.save(order);
outbox.save(new OutboxEvent("OrderCreated", order.getId(), payload));
```

relay 轮询或 CDC 把 outbox 发到 Kafka。消费者：

```java
@KafkaListener(topics = "order-created")
void on(OrderCreated evt) {
  if (processed.exists(evt.eventId())) return;
  inventory.reserve(evt);
  processed.save(evt.eventId());
}
```

幂等不是口号，是数据设计：事件 ID 唯一、处理记录唯一约束、业务状态机拒绝非法迁移、重复投递结果相同。

### 14.2 重试与死信

- 可恢复错误：指数退避重试，带 jitter。
- 不可恢复错误：直接死信，不要无限重试毒消息。
- 死信要可查询、可重放、可标记已处理；只报警不处理会积压成数据债。

## 第 15 章：异步与调度

```java
@Configuration
@EnableAsync
class AsyncConfig {
  @Bean
  ThreadPoolTaskExecutor orderExecutor() {
    ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
    ex.setCorePoolSize(8);
    ex.setMaxPoolSize(16);
    ex.setQueueCapacity(200);
    ex.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
    ex.setThreadNamePrefix("order-async-");
    ex.initialize();
    return ex;
  }
}
```

注意：

- `@Async` 同类自调用不生效。
- 无返回任务异常要进 `AsyncUncaughtExceptionHandler`，否则吞掉。
- 队列不是越大越好；队列长=延迟高+失败晚暴露。
- 集群定时任务要防重复：ShedLock 或外部调度，不要只靠 `@Scheduled`。

---

# 第七部分：生产化与运维

## 第 16 章：Actuator、指标与日志

### 16.1 端点暴露原则

```yaml
management:
  server:
    port: 9091
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      probes:
        enabled: true
```

生产建议：管理端口与业务端口分离；只暴露必要端点；`env`、`heapdump`、`threaddump`、`shutdown` 严格保护；Kubernetes 用 liveness/readiness 对应健康组。

### 16.2 指标设计

入口看 RED：请求量、错误率、耗时分位数。资源看 USE：CPU/内存/连接池/线程池利用率、饱和度、错误。业务指标如订单创建成功率、支付回调延迟也要埋。

避免高基数标签：不要把 userId、orderId、完整 URL、异常 message 当 tag。需要明细去日志/追踪找，不要把指标系统当明细库。

### 16.3 日志规范

- 结构化 JSON，字段稳定：`ts,level,logger,msg,traceId,spanId,orderId,latencyMs`。
- 不打印密码、token、身份证、完整银行卡。
- 异常日志带上下文，但响应不泄露堆栈。
- 动态调级别用于临时诊断，配合权限与审计。

## 第 17 章：容器化、发布与排错

### 17.1 Docker 基础

使用分层 JAR 与 JRE 镜像，非 root 运行，只暴露必要端口。JVM 在容器中要感知 cgroup 限制；现代 JDK 默认较好，但仍要显式设置 MaxRAMPercentage、GC、堆外内存预算。

健康检查不要打重型接口；readiness 失败应摘流，liveness 失败才重启，别把短暂慢查询误判成进程死亡。

### 17.2 优雅停机与发布

开启 `server.shutdown=graceful` 与 `spring.lifecycle.timeout-per-shutdown-phase`。发布流程：摘流量 → 等待在途请求 → 停消费者/调度 → 关池 → 退出。若消费者没停，摘流后仍处理消息会造成“看似下线仍在写”。

### 17.3 排错 playbook

**启动失败**：读 stack trace 第一因；查 `conditions`；查配置绑定；查端口；查 Flyway checksum；查 Bean 冲突。  
**接口超时**：从入口 access log 定 latency → 看下游 trace → 看连接池等待 → 看慢 SQL → 看 GC/线程池 → 看锁。  
**内存涨**：jmap/heapdump 或 Actuator heapdump，分析 dominator tree；常查无界缓存、队列、ThreadLocal、监听器未注销、大字段 DTO。  
**CPU 高**：top -H 找线程，jstack 对齐 tid；常见死循环、正则灾难、序列化热点、频繁 GC。  
**数据不一致**：先确定权威源，再核对消息是否丢/重/乱序，检查事务边界与唯一约束。

---

# 第八部分：综合实战项目

## 第 18 章：订单服务完整需求

实现一个可演示、可测试、可部署的订单服务。

功能：

- 创建订单：校验客户与明细，计算金额，状态 CREATED。
- 库存预留：本地模拟库存表，防超卖。
- 支付回调：幂等更新订单为 PAID 或 FAILED。
- 取消订单：状态机约束，已发货不可取消。
- 查询：详情含 items，列表 DTO 投影分页。
- 事件：订单创建/支付成功写 outbox，relay 发消息。
- 运维：health、metrics、结构化日志、Docker Compose。

技术：Web、Validation、Data JPA、Flyway、Actuator、Micrometer、Testcontainers、Kafka 或先用日志 relay 模拟。

## 第 19 章：关键实现提示

### 19.1 状态机

```text
CREATED --pay--> PAID --ship--> SHIPPED --complete--> COMPLETED
CREATED --cancel--> CANCELLED
PAID --refund--> REFUNDED
非法迁移抛 BusinessConflictException -> 409
```

### 19.2 防超卖 SQL

```sql
update inventory
set available = available - :qty
where sku = :sku and available >= :qty
```

更新行数为 0 即库存不足。比“先查 available 再扣减”安全，因为查与减之间可能并发变化。

### 19.3 支付回调幂等

回调表以 `provider + paymentNo` 唯一约束；处理前先插入处理记录，冲突说明重复回调；状态只在合法迁移路径内更新。回调验签失败直接 401，不进业务。

### 19.4 验收测试

- Web 切片：创建参数错误 400。
- JPA：防超卖并发更新只有一笔成功。
- 集成：Testcontainers PostgreSQL 跑创建→支付→查询全链。
- 消息：重复投递 OrderCreated，库存只扣一次。
- 运维： `/actuator/health` 通过，创建订单指标上升，错误日志含 traceId。

---

# 第九部分：进阶方向

## 第 20 章：WebFlux 与虚拟线程

WebFlux 适合高并发 IO 与全链路非阻塞；代价是编程模型、调试、生态约束。Java 21 虚拟线程给 servlet 栈带来“同步代码 + 廉价阻塞”的另一条路，但连接池、数据库驱动、同步锁、ThreadLocal 仍需评估。选择顺序建议：

1. 常规业务：MVC + 合理池化 + 虚拟线程评估。
2. 海量长连接/网关/BFF 且下游全异步：WebFlux。
3. 别混用阻塞 JDBC 到 WebFlux 主链；用 `boundedElastic` 隔离是补救，不是设计。

## 第 21 章：GraalVM Native Image

Native Image 优势是启动快、内存低，适合 Serverless/CLI/冷启动敏感场景。代价是构建慢、反射/资源/动态代理需要 hints、部分库兼容要验证。策略：边缘小服务可尝试；复杂业务先做好 AOT 测试与运行回归，不要为启动速度牺牲迭代效率。

## 第 22 章：微服务拆分的判断

只有当拆分能带来清晰收益时才拆：团队独立交付、容量独立扩展、故障域隔离、数据所有权明确。否则优先模块化单体：按域分包、限界上下文、内部事件、明确依赖方向。拆服务前备好：CI/CD 模板、观测、契约测试、幂等、对账、超时/重试/熔断、数据迁移方案。

---

# 附录 A：注解速查

- `@SpringBootApplication`：配置 + 自动配置 + 组件扫描组合。
- `@RestController`：Controller + 返回值直接写响应体。
- `@Service/@Component/@Repository`：构造型注解，语义分层与异常翻译。
- `@ConfigurationProperties`：强类型配置绑定。
- `@ConditionalOnMissingBean`：默认 Bean 给用户实现退让。
- `@Transactional`：声明式事务边界。
- `@Cacheable/@CacheEvict`：缓存读/失效。
- `@Scheduled/@Async`：调度与异步。
- `@WebMvcTest/@DataJpaTest/@SpringBootTest`：不同范围测试。

# 附录 B：配置片段速查

```yaml
server:
  port: 8080
  shutdown: graceful
spring:
  application:
    name: shop-api
  lifecycle:
    timeout-per-shutdown-phase: 20s
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
logging:
  pattern:
    console: "%d{yyyy-MM-dd'T'HH:mm:ss.SSSXXX} %-5level [%thread] %logger{36} trace=%X{traceId} - %msg%n"
```

# 附录 C：学习验收清单

能不看资料回答以下问题，说明已经入门到可独立开发：

- 一个 Bean 从哪来？如何覆盖默认 Bean？
- 配置项为什么生效/不生效？优先级如何排查？
- 404/400/415/500 分别到链路哪一环定位？
- JPA 什么时候用 EntityGraph，什么时候用 DTO 投影？
- 事务失效有哪些场景？远程调用为什么不能放本地事务里？
- 幂等靠什么数据结构保证？
- Actuator 生产暴露原则是什么？
- 接口慢如何从入口一路查到数据库/GC？

---

# 第十部分：补强专题

## 第 23 章：Maven 与依赖管理细节

### 23.1 `spring-boot-starter-parent` 做了什么

它主要提供：默认编译级别、资源过滤、插件管理、可执行 JAR 打包配置，以及继承 `spring-boot-dependencies` 的依赖版本管理。理解这一点后，如果公司已有统一父 POM，可以不继承 starter-parent，而改用 `dependencyManagement` 导入 BOM：

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-dependencies</artifactId>
      <version>3.4.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

这样既能用 Boot 的版本对齐，又不抢占公司父 POM。

### 23.2 依赖冲突排查

常用命令：

```bash
mvn dependency:tree -Dverbose
mvn dependency:analyze
```

关注三类问题：

- **版本收敛**：同一个库出现多个版本，看 nearest wins 与 dependencyManagement 覆盖。
- **多余依赖**：`dependency:analyze` 提示 used undeclared / declared unused，但注解、SPI、运行期反射可能造成误报，要结合启动验证。
- **传递依赖带入风险**：引入一个 starter 可能带出日志桥接、JSON、池、驱动；上线前看最终依赖树，不只看手写 dependency。

排除传递依赖示例：

```xml
<dependency>
  <groupId>com.example</groupId>
  <artifactId>legacy-sdk</artifactId>
  <exclusions>
    <exclusion>
      <groupId>commons-logging</groupId>
      <artifactId>commons-logging</artifactId>
    </exclusion>
  </exclusions>
</dependency>
```

### 23.3 构建可重复

- 固定插件版本，CI 用同一 JDK 镜像。
- 不依赖 SNAPSHOT 上生产。
- 重要版本升级做依赖树 diff。
- 产物带版本、提交号、构建时间；`/actuator/info` 可读 git/build 信息。

---

## 第 24 章：Jackson 序列化与 API 契约细节

Spring MVC 默认用 Jackson 做 JSON。很多“接口突然报错/字段丢了/日期格式变了”的问题都在这一层。

### 24.1 常用注解

- `@JsonProperty`：指定字段名，处理命名不一致。
- `@JsonIgnore`：序列化/反序列化忽略，慎用；更好是 DTO 不放该字段。
- `@JsonFormat`：日期格式；全局建议用 Java Time 模块与 ISO-8601。
- `@JsonInclude`：空值是否输出；全局与局部要一致，避免前端时而缺字段。
- `@JsonCreator/@JsonValue`：自定义值对象与枚举序列化。

### 24.2 Java 8 时间与全局配置

```java
@Bean
Jackson2ObjectMapperBuilderCustomizer jsonCustomizer() {
  return builder -> builder
      .serializers(new LocalDateTimeSerializer(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
      .deserializers(new LocalDateTimeDeserializer(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
      .failOnUnknownProperties(false)
      .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
}
```

注意：把全局命名策略改成 snake_case 会影响所有 API；对外契约已稳定时不要随手改全局。新字段要兼容：反序列化可 `failOnUnknownProperties(false)`，但写入侧不要把未知字段当业务数据吞掉。

### 24.3 多态与循环引用

- 多态用 `@JsonTypeInfo/@JsonSubTypes`，但 API 层更推荐显式 `type` 字段 + 不同 DTO，避免暴露类名。
- JPA 双向关联直接序列化容易循环引用；根治是 DTO 投影，不是到处 `@JsonIgnore`。

---

## 第 25 章：MyBatis 在 Spring Boot 中的工程化

当 SQL 复杂、表结构遗留、优化由 DBA 主导时，MyBatis 比 JPA 更透明。

### 25.1 基本结构

```xml
<dependency>
  <groupId>org.mybatis.spring.boot</groupId>
  <artifactId>mybatis-spring-boot-starter</artifactId>
  <version>3.0.4</version>
</dependency>
```

```java
@Mapper
public interface OrderMapper {
  Optional<OrderRow> findRowById(@Param("id") long id);
  List<OrderRow> search(@Param("status") String status, RowBounds bounds);
}
```

XML 放 `resources/mapper/OrderMapper.xml`，包路径与接口对应，别名与 map-underscore 配置统一。

### 25.2 工程化原则

- Mapper 返回列表行 DTO，不返回含懒加载语义的 Entity。
- 动态 SQL 的 `<if>` 要防全表更新/删除：所有危险语句必须有强制条件或拦截器守护。
- 分页用 PageHelper 要清楚它改的是当前线程下一条 SQL；复杂报表手写 limit/offset 或窗口函数更可控。
- SQL 日志只打印到参数级别，敏感字段脱敏；慢 SQL 阈值进监控系统。

### 25.3 JPA 与 MyBatis 能否共存

可以，但要划清边界：命令侧聚合用 JPA，查询/报表用 MyBatis；不要同一聚合既被 Hibernate 管又被 XML 大改，事务与缓存语义会混乱。共享同一个 `DataSource` 与事务管理器时，读写仍要在同一事务边界内设计。

---

## 第 26 章：Resilience4j 韧性设计

超时、重试、熔断、限流、舱壁不是“加个注解就高可用”，要成组设计。

### 26.1 超时预算

从用户入口倒推：入口总预算 3s，网关 0.2s，服务内部 0.3s，下游 A 1.0s，下游 B 1.2s。任何下游超时不应接近入口总预算，否则没有空间重试和降级。连接超时、读取超时、整体 deadline 分别设置。

### 26.2 重试原则

只对幂等或可去重操作重试；对 4xx 业务错误不重试；对连接超时、部分 5xx、限流可退避重试。公式：`initialInterval * multiplier^n + jitter`。重试风暴会让已经过载的下游更糟，配合熔断与舱壁。

### 26.3 熔断语义

熔断器不是让系统“更快”，而是失败时快速让路，保护线程与连接，并给下游恢复时间。要监控：状态转换、慢调用比例、失败比例、半开试探结果。熔断期间的降级返回值必须业务可接受；不能为了“接口不报错”返回假成功。

### 26.4 舱壁

给不同下游不同线程池/连接池，避免支付慢把库存查询也拖死。同步栈用独立 executor/connection pool；响应式栈用不同 Scheduler 与客户端实例。

---

## 第 27 章：可观测性深入

### 27.1 traceId 如何贯穿

Micrometer Tracing/OpenTelemetry 会把当前 span 上下文放进 MDC，日志 pattern 输出 `traceId/spanId`。跨越边界要传：HTTP header、消息 header、异步线程上下文。异步线程要包装 task decorator，否则 `@Async` 后日志丢 trace。

### 27.2 指标命名与标签

命名：`shop_order_create_total`、`shop_payment_callback_duration_seconds`。标签低频且枚举化：`result=success|conflict|error`、`channel=app|web`。错误明细进日志/事件，不进 Prometheus label。

### 27.3 SLI/SLO 意识

即便小团队，也要明确核心 SLI：订单创建成功率、P95/P99 延迟、支付回调处理延迟、消息积压。告警应指向用户影响，而不是只报 CPU；资源告警用来解释，不应替代业务告警。

---

## 第 28 章：Docker Compose 本地依赖示例

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: shop
      POSTGRES_USER: shop
      POSTGRES_PASSWORD: local-only
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data

  kafka:
    image: confluentinc/cp-kafka:7.6.1
    depends_on: [zookeeper]
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.1
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

volumes:
  pgdata:
```

意义：本地依赖一键起，测试环境与 CI 用同一镜像版本族；不要把 compose 当生产编排，它只是开发一致性的起点。

---

# 第十一部分：源码阅读与升级路线

## 第 29 章：源码怎么读不迷路

读源码目标不是背类名，而是能回答行为。建议按问题读：

1. 为什么这个 Bean 存在：从自动配置 imports 找到配置类，看条件。
2. 请求为什么 404：从 `DispatcherServlet` 到 `RequestMappingHandlerMapping` 的映射注册。
3. JSON 为什么这样序列化：看 `HttpMessageConverters` 与 `MappingJackson2HttpMessageConverter` 配置。
4. 事务为何没生效：看代理创建 `InfrastructureAdvisorAutoProxyCreator`、`TransactionInterceptor`。
5. 配置为何绑定失败：看 `ConfigurationPropertiesBindingPostProcessor` 与 Binder。

工具：IDE 条件断点、`-Dlogging.level.org.springframework=DEBUG` 临时开启、`@ConditionalOn...` 报告、启动时打印 `ApplicationContext` 中 BeanDefinition 数量与名称。

## 第 30 章：2.x 到 3.x 升级关注点

- Java 17 基线。
- `javax.*` 到 `jakarta.*`：servlet、persistence、validation、annotation、mail 等。
- Spring Security 配置风格从 `WebSecurityConfigurerAdapter` 迁移到 `SecurityFilterChain` Bean。
- 自动配置注册文件从 `spring.factories` 到 `AutoConfiguration.imports`。
-  Micrometer/Observation 变化， tracing 方案更新。
- 依赖库整体升级：Hibernate 6、Jackson、Tomcat、Netty 等带来的行为差异要回归测试。

升级策略：先升构建与测试，再升 Boot 小版本到 2.7 最新，处理 deprecated，再跨 3.x；每一步跑切片与关键集成测试，不要一次性大跳。

---

# 第十二部分：面试、评审与设计表达

## 第 31 章：怎么把概念讲出“作用意义”

面试或技术评审不要只背定义，用四段式：

1. **定义**：它是什么，边界在哪。
2. **动机**：没有它会重复/脆弱/不可观测在哪。
3. **机制**：关键扩展点或数据流是什么。
4. **代价**：带来什么复杂度，何时不用。

示例：自动配置。

> 定义：按条件注册默认 Bean 的机制。动机：把 Web、JSON、数据源这类高频装配从手工样板变成可覆盖默认。机制：候选配置清单 + 条件注解 + `@ConditionalOnMissingBean` 用户优先 + 属性绑定。代价：默认行为可能出乎意料，需要会看 conditions 报告；复杂系统要显式化关键 Bean，不能把一切交给隐式默认。

这样讲比“Boot 通过 `@EnableAutoConfiguration` 实现自动装配”更能体现工程判断。

## 第 32 章：常见设计评审问题清单

提交设计文档时自查：

- API：资源名、状态码、错误模型、版本策略、幂等键、分页上限。
- 数据：表约束、索引、迁移、归档、读写比例、热点行。
- 一致性：哪些必须强一致，哪些最终一致；失败补偿与对账在哪。
- 安全：认证来源、授权粒度、机密管理、审计日志、数据脱敏。
- 性能：预估 QPS、P95/P99 目标、慢查询阈值、缓存策略、连接池容量。
- 运维：指标、告警、日志字段、追踪采样、发布回滚、优雅停机。
- 失败模式：下游挂了、消息重复、时钟回拨、配置错误、磁盘满、证书过期分别怎样。

---

# 附录 D：练习参考答案要点

## D.1 条件装配练习要点

- `matchIfMissing=true` 表示属性缺省时默认启用。
- 用户自定义同类型 Bean 后，`@ConditionalOnMissingBean` 不再注册默认实现。
- `enabled=false` 后注入失败，应报 `NoSuchBeanDefinitionException`，说明条件正确。

## D.2 N+1 实验要点

- 列表 `findAll()` 后访问 `items`，SQL 数约为 1 + N。
- EntityGraph 后详情查询变成 join 或二次批量查询，次数显著下降。
- 列表投影只 select 需要列，不触发 `items` 初始化。

## D.3 事务练习要点

- 同类内部调用增强方法，代理不触发。
- catch 后未 rethrow 且未 setRollbackOnly，事务可能提交。
- REQUIRES_NEW 在自调用时不会新开；移到独立 Bean 后能看到挂起与新建事务日志。

## D.4 幂等练习要点

- 唯一约束是最后防线；代码判断存在并发窗口。
- 处理记录与业务效果要尽量同事务或可核对。
- 重复消息返回相同结果，不报错或返回已处理，才适合消费者重试。

---

# 附录 E：术语表

- **IoC**：控制反转，对象创建与依赖管理交给容器。
- **DI**：依赖注入，容器把协作者提供给对象。
- **BeanPostProcessor**：Bean 初始化前后增强扩展点。
- **Auto-configuration**：按条件注册默认配置的机制。
- **Starter**：依赖与自动配置的功能入口包。
- **Profile**：一组环境相关配置与 Bean 条件。
- **Actuator**：生产端点集合。
- **DTO**：对外/层间传输对象，隔离领域模型。
- **OSIV**：视图层保持会话开启，易掩盖懒加载。
- **Outbox**：本地事务记录事件，异步投递保证至少一次。
- **幂等**：同一操作重复执行效果等同一次。
- **熔断**：失败达到阈值后短时快速失败，保护系统并给下游恢复。
- **背压**：下游处理不过来时向上游传递减速信号。
- **SLI/SLO**：服务水平指标与目标，用用户影响度量可靠性。

---

# 结语

Spring Boot 的学习关键不是记住更多注解，而是建立“默认行为从哪里来、如何覆盖、出问题看哪里”的心智。掌握装配、请求、数据三条主线后，安全、缓存、消息、韧性、观测都是同一件事：把非功能性需求显式化、可测试、可运维。练到能独立交付一个可测试、可部署、可排错的服务，Spring Boot 才算真正入门。
