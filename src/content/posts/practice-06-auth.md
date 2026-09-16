---
title: "06 登录认证：Cookie、Session、令牌、JWT、Filter 与 Interceptor"
published: 2026-09-16
description: "课程实操笔记第 06 篇：认证体系与拦截器。"
tags: ["Java","JWT","实操笔记"]
category: "教程"
draft: false
lang: 'zh_CN'
---

对应目录：119 项目实战需求；120 登录功能实现；121 会话技术介绍；122 Cookie；123 Session；124 令牌方案；125 JWT生成与校验；126 登录成功后下发令牌；127 Filter入门；128 令牌校验Filter；129 Filter详解；130 Interceptor入门；131 令牌校验Interceptor；132 Interceptor详解。

## 1. 登录功能最小实现

需求：用户名密码登录，成功后返回 token，之后请求带 token 才能访问员工/部门管理。

登录接口：

```java
@PostMapping("/login")
public Result login(@RequestBody LoginDTO dto) {
  Emp emp = empService.login(dto.getUsername(), dto.getPassword());
  if (emp == null) return Result.error("用户名或密码错误");
  String token = jwtUtil.create(emp.getId(), emp.getUsername());
  return Result.success(Map.of("token", token, "name", emp.getName()));
}
```

教学项目常明文密码；真实系统必须加盐哈希，如 BCrypt/Argon2。密码永远不要存明文，不要日志打印。

## 2. 为什么需要会话技术

HTTP 无状态：服务器默认不知道这次请求和上次是不是同一个人。登录后要维持状态，有几种思路：

- Cookie：浏览器存小数据，之后自动携带。
- Session：服务器存会话，Cookie 里只放 SessionId。
- Token/JWT：服务器签发凭证，客户端每次携带；服务端可校验签名，不一定服务端存会话。

## 3. Cookie

服务器：`Set-Cookie: SESSIONID=abc; Path=/; HttpOnly`。浏览器之后同域请求自动带 `Cookie`。

属性意义：

- HttpOnly：JS 不能读，降低 XSS 偷 Cookie。
- Secure：只 HTTPS。
- SameSite：降低 CSRF。
- Path/Domain：控制携带范围。
- Max-Age/Expires：过期。

Cookie 不是保险箱，客户端可见可改；敏感数据别放 Cookie 明文。

## 4. Session

Session 在服务端存用户状态，客户端只带 SessionId。优点：服务端可控，能踢人。缺点：多实例要共享 Session 或粘性会话；横向扩展麻烦。传统 `HttpSession` 好用，但分布式系统要 Redis Session 或改 token。

## 5. 令牌方案与 JWT

令牌方案：登录成功后服务器签发 token，客户端放 localStorage/内存，请求头带：

```http
Authorization: Bearer eyJhbGciOi...
```

JWT 结构：header.payload.signature。payload 只是 base64，不是加密，别放密码/敏感信息。服务端验签、校验 exp/iss/aud，再取 userId。

优点：无状态、跨服务易扩展。缺点：主动吊销难，权限变更不即时；缓解方式是短过期 + refresh token + 关键操作二次校验 + Redis 黑名单/版本号。

## 6. 登录成功后下发令牌

签发时至少放：`sub=userId`、`username`、`role`、`iat`、`exp`、`jti`。返回给前端后，前端在后续请求头携带。退出登录：无状态 JWT 难以真失效，可删除前端 token；强安全场景维护 Redis 黑名单或 tokenVersion。

## 7. Filter 入门与令牌校验

Filter 在 Servlet 层，进入 DispatcherServlet 前执行，适合做编码、CORS、安全、粗粒度拦截。

```java
@WebFilter("/*")
public class TokenFilter implements Filter {
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) {
    HttpServletRequest request = (HttpServletRequest) req;
    if (isWhiteList(request.getRequestURI())) { chain.doFilter(req,res); return; }
    String token = request.getHeader("Authorization");
    Claims claims = jwtUtil.parse(token); // 失败抛异常 -> 401
    request.setAttribute("loginUser", claims);
    chain.doFilter(req,res);
  }
}
```

核心：`chain.doFilter` 才放行；白名单放行登录、静态资源、健康检查；失败统一 401，不要把异常堆栈给前端。

## 8. Filter 详解

- 执行时机更早，拿不到 Spring MVC 的 HandlerMethod 细节。
- 顺序重要：编码/CORS/安全/日志谁先谁后要明确。
- 对异步、包装 request/response、body 多次读取要谨慎，一旦流被消费，下游读不到。
- Filter 是 Servlet 规范，不依赖 Spring MVC；Interceptor 更懂 MVC。

## 9. Interceptor 入门与令牌校验

Interceptor 在 DispatcherServlet 后、Controller 前后执行，能看到 handler。

```java
public class LoginInterceptor implements HandlerInterceptor {
  public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
    if (!(handler instanceof HandlerMethod)) return true;
    String token = req.getHeader("Authorization");
    LoginUser u = jwtUtil.parseToUser(token);
    UserContext.set(u); // ThreadLocal，注意 finally 清理
    return true;
  }
  public void afterCompletion(...) { UserContext.clear(); }
}
```

注册：

```java
registry.addInterceptor(loginInterceptor)
  .addPathPatterns("/**")
  .excludePathPatterns("/login","/error","/files/**");
```

## 10. Interceptor 详解与 Filter 选择

- Filter：更底层，适合安全框架、编码、CORS、原始流。
- Interceptor：适合登录上下文、权限注解、审计、API 耗时，能取 HandlerMethod。
- AOP：方法级业务横切，如操作日志、事务、缓存。

ThreadLocal 必须 `afterCompletion` 清理；异步线程切换要显式传递上下文，否则“有时拿不到登录人”。

## 11. 练习

1. 实现登录签发 JWT，错误密码返回 401/400 而不是 200。
2. 用 Filter 拦截 `/emps/**`，白名单 `/login`；无 token 返回 401。
3. 改用 Interceptor 实现同样校验，并把 userId 放入 ThreadLocal；确认 afterCompletion 清理。
4. 对比：把 token 放 Cookie 与 Authorization header 的 CSRF/XSS 差异。
5. 设计 token 续期：剩余 10 分钟内请求自动刷新，避免每次请求都刷新造成写放大。
