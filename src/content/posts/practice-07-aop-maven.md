---
title: "07 SpringAOP、SpringBoot 原理与 Maven 高级"
published: 2026-09-16
description: "课程实操笔记第 07 篇：AOP、框架原理与 Maven 进阶。"
tags: ["Java","AOP","实操笔记"]
category: "教程"
draft: false
lang: 'zh_CN'
---

对应目录：133 AOP入门；134 核心概念；135 通知类型；136 通知顺序；137 切入点表达式；138 JoinPoint；139 记录操作日志；140 获取当前登录员工；141 配置优先级；142 Bean管理；143 起步依赖原理；144 自动配置两种方案；145 自动配置源码跟踪；146 @Conditional；147 自定义starter；148 分模块设计；149 Maven继承；150 聚合；151 私服；152 总结。

## 1. AOP 入门：把重复横切逻辑抽出来

业务里很多重复不是业务：记录操作日志、耗时统计、权限检查、事务、缓存。AOP 让你在方法执行前后织入逻辑，而不污染业务方法。

```java
@Aspect
@Component
public class TimeAspect {
  @Around("@annotation(com.example.ems.anno.LogTime)")
  public Object around(ProceedingJoinPoint pjp) throws Throwable {
    long start = System.nanoTime();
    try { return pjp.proceed(); }
    finally { log.info("{} cost {}ns", pjp.getSignature(), System.nanoTime()-start); }
  }
}
```

`pjp.proceed()` 是放行；不调用目标方法不执行。这个心智和 Filter 的 `chain.doFilter` 一样。

## 2. 核心概念

- JoinPoint：可被增强的点，Spring AOP 主要是方法执行。
- Pointcut：选中哪些 JoinPoint 的表达式。
- Advice：增强逻辑，Before/After/AfterReturning/AfterThrowing/Around。
- Aspect：Pointcut + Advice 的组合。
- Weaving：把切面织入目标，Spring 运行期用代理。
- Target/Proxy：目标对象与代理对象；理解代理才能懂自调用失效。

## 3. 通知类型与顺序

- Before：方法前，不能阻止执行除非抛异常。
- AfterReturning：正常返回后。
- AfterThrowing：抛异常后。
- After：finally 语义。
- Around：最强，可控制是否执行、改参数要谨慎、包 try/finally。

多个切面顺序用 `@Order`，数字小优先级高。事务、日志、权限、缓存顺序会影响语义；例如日志是否记录到事务回滚后的状态，取决于顺序。

## 4. 切入点表达式

```java
@Pointcut("execution(* com.example.ems.service.*.*(..))")
public void serviceMethods() {}

@Pointcut("@annotation(com.example.ems.anno.OpLog)")
public void opLogMethods() {}
```

学习优先级：注解切入点最清晰，适合操作日志；execution 表达力强但容易误伤。`within` 限定包，`@annotation` 限定注解，`args` 限定参数。表达式越宽，越要测试命中范围。

## 5. JoinPoint

`ProceedingJoinPoint` 只在 Around 有 proceed。可拿：方法签名、参数、目标类、注解。记录操作日志常用：当前登录人、方法名、参数摘要、耗时、结果/异常、IP、traceId。注意参数脱敏，密码、身份证、token 不落日志。

## 6. 案例：记录操作日志

自定义注解：

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface OpLog { String value(); }
```

切面记录到 `op_log` 表或异步发 MQ。要思考：日志记录失败是否影响业务？通常不影响，用异步/独立 try；但关键审计要可靠，可落 outbox。操作日志也是数据，要有保留与查询设计。

## 7. 案例：获取当前登录员工

不要在每个 Controller 手写解析 token。流程：Interceptor 校验 token 后放 `UserContext(ThreadLocal)`；AOP 或参数解析器把 `LoginUser` 注入方法；用完 `afterCompletion` 清理。异步线程要复制上下文，否则日志里“当前人”丢失。

## 8. SpringBoot 配置优先级

原则：越靠近运行环境越优先。命令行/环境变量覆盖 application.yml；profile 特定覆盖公共；代码默认最低。排查配置不生效按：是否拼写/缩进错 → profile 是否激活 → 是否被更高优先级覆盖 → `@ConfigurationProperties` 前缀是否一致 → 是否被自动配置条件挡住。

## 9. Bean 管理

Bean 是容器管理的对象。重点：作用域默认 singleton；注入推荐构造器；Bean 生命周期钩子；`@Bean` 用于第三方类，`@Component/@Service` 用于自己类；`@ConditionalOnMissingBean` 让默认实现可被覆盖。理解 BeanPostProcessor 才能理解 AOP/事务代理从哪来。

## 10. 起步依赖原理

Starter 是“功能意图的依赖包”：你要 Web，就引 `spring-boot-starter-web`，它带 Spring MVC、Jackson、Tomcat 等兼容版本。父 POM/BOM 管版本，减少依赖地狱。不要看见 starter 就引，每个 starter 都可能带来默认 Bean、端点和攻击面。

## 11. 自动配置两种方案与源码跟踪

自动配置核心：候选配置类 + 条件注解 + 用户优先。Boot3 候选清单在 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`。跟踪路径：`@SpringBootApplication` → `@EnableAutoConfiguration` → import selector → 条件过滤 → Bean 注册。`--debug` 或 Actuator conditions 看为什么生效/未生效。

## 12. `@Conditional`

常见：`@ConditionalOnClass`、`@ConditionalOnMissingBean`、`@ConditionalOnProperty`、`@ConditionalOnWebApplication`。它们把“有这个依赖/没这个 Bean/开关打开/是 Web 应用”变成装配条件。读懂条件，就不觉得自动配置是魔法。

## 13. 自定义 starter

做一个 `my-log-spring-boot-starter`：autoconfigure 模块提供 `LogProperties`、`LogAutoConfiguration`、imports 文件；starter 模块只负责引依赖。验收：业务项目引入 starter 后能用默认日志切面；自己定义同类型 Bean 可覆盖；`my.log.enabled=false` 可关闭。做完这个，你就真正理解 SpringBoot。

## 14. Maven 高级：分模块、继承、聚合、私服

分模块：`ems-common`、`ems-pojo`、`ems-mapper`、`ems-service`、`ems-web`。边界要真：web 不直接 new mapper 绕过 service；common 不放业务。

继承：父 POM 统一 JDK、编码、依赖管理、插件管理；子模块少写版本。聚合：根 POM 一键构建所有模块。继承解决“共用配置”，聚合解决“一起构建”，二者常一起用但不是一回事。

私服 Nexus/阿里云效：缓存中央仓库提速、发布公司内部模块、控制依赖安全。学习期理解 settings.xml mirror、deploy 到 releases/snapshots 即可。

## 15. Web 后端开发总结

到这一步你应该能串起来：HTTP/REST → Controller → Service 业务与事务 → Mapper SQL → MySQL 约束索引 → 统一异常/日志 → 文件 OSS → 登录 JWT/Filter/Interceptor → AOP 操作日志 → SpringBoot 配置/Bean/自动配置 → Maven 多模块。后端不是注解收集，而是让系统在高并发、异常、多人协作、频繁变更下仍然正确可维护。

## 16. 练习

1. 用注解切面记录部门/员工增删改操作日志，脱敏参数。
2. 故意让日志切面抛异常，确认不影响主业务；再讨论审计日志如何可靠。
3. 写一个最小 starter，提供 `hello.enabled` 开关和默认 `HelloService`。
4. 把单体拆成 common/pojo/mapper/service/web 多模块，跑通聚合构建。
5. 用 `--debug` 找出一个你引了 starter 但没生效的自动配置，并说明缺哪个条件。
