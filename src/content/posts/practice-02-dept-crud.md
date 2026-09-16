---
title: "02 部门管理：列表、删除、新增、修改回显与修改"
published: 2026-09-16
description: "课程实操笔记第 02 篇：完整的部门管理 CRUD。"
tags: ["Java","Spring Boot","实操笔记"]
category: "教程"
draft: false
lang: 'zh_CN'
---

对应目录：77 部门列表接口；78 结果封装；79 前后端联调测试；80 删除部门；81 新增部门；82 修改-查询回显；83 修改-修改数据。

## 1. 业务目标

部门管理是最小 CRUD 闭环，用来打通 Controller-Service-Mapper-MySQL，以及前端表格、新增弹窗、修改回显。表可以很小：

```sql
create table dept (
  id bigint primary key auto_increment,
  name varchar(50) not null,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  unique key uk_name (name)
);
```

给 name 加唯一约束，是为了说明：页面提示“部门已存在”是体验，数据库唯一约束才是底线。

## 2. 列表查询

接口：`GET /depts`

Controller：

```java
@GetMapping("/depts")
public Result list() {
  return Result.success(deptService.list());
}
```

Mapper XML：

```xml
<select id="list" resultType="com.example.ems.pojo.Dept">
  select id, name, created_at, updated_at
  from dept
  order by updated_at desc, id desc
</select>
```

教学点：列表接口先做空表也能返回 `[]`，不是 null；前端更好处理。字段不要 `select *` 形成习惯，虽然部门表小，也要练习明确列。

## 3. 结果封装

培训项目常用：

```java
public class Result {
  private Integer code;
  private String msg;
  private Object data;
  public static Result success(Object data){ return new Result(1,"success",data); }
  public static Result error(String msg){ return new Result(0,msg,null); }
}
```

工程增强：错误码不要只有 0/1。可以定义 `ErrorCode.PARAM_INVALID/DEPT_DUPLICATE/DEPT_NOT_FOUND`，前端按 code 做不同提示。无论是否包 Result，HTTP 状态码仍应尽量正确。

## 4. 前后端联调测试

联调时最容易卡在：

- 路径不一致：前端 `/dept`，后端 `/depts`。
- 方法不一致：前端 delete 写成了 post。
- 参数位置不一致：路径变量、query、body 混用。
- 跨域：前端 `localhost:5173` 调 `localhost:8080` 需要 CORS 配置。
- 时间格式：后端返回数组或时间戳，前端展示乱。统一 ISO 字符串或明确格式。

建议用 curl/Apifox 先把后端接口打绿，再接前端。前端报“网络错误”先看浏览器 Console/Network，不要先改 Service。

## 5. 删除部门

接口：`DELETE /depts/{id}`

```java
@DeleteMapping("/depts/{id}")
public Result delete(@PathVariable Long id) {
  deptService.delete(id);
  return Result.success(null);
}
```

Mapper：

```xml
<delete id="deleteById">
  delete from dept where id = #{id}
</delete>
```

工程问题：部门下有员工能不能删？两种策略：不允许删并提示“存在员工”；或逻辑删除/先迁移员工。学习项目常直接删，真实系统要有约束或校验。删除接口也要防误删：重要操作二次确认，后端仍要校验。

## 6. 新增部门

接口：`POST /depts`

请求：

```json
{"name":"研发部"}
```

```java
@PostMapping("/depts")
public Result add(@Valid @RequestBody Dept dept) {
  deptService.add(dept);
  return Result.success(null);
}
```

校验：`@NotBlank(message="部门名不能为空")`。重复名捕获 `DuplicateKeyException` 转 409/业务错误，而不是把 SQL 异常抛给前端。

## 7. 修改回显与修改数据

修改分两步：

1. 查询回显：`GET /depts/{id}`，前端拿到当前 name 填进表单。
2. 提交修改：`PUT /depts/{id}`，body 带新 name。

为什么需要回显接口：列表数据可能不完整、可能过期；进入编辑页应取最新数据，避免基于旧快照覆盖别人刚改的内容。

修改 XML 可用动态 set：

```xml
<update id="update">
  update dept
  <set>
    <if test="name != null and name != ''">name = #{name},</if>
  </set>
  where id = #{id}
</update>
```

注意动态更新要防空 set；至少更新 `updated_at` 或限制必填字段。影响行数为 0 要判断：可能 id 不存在，也可能被别人删了。

## 8. 练习

1. 完成 `/depts` 五个接口并用 curl 全量测：200/400/404/409。
2. 故意制造重名新增，观察唯一约束异常，改成友好错误。
3. 修改接口先查询回显再提交；模拟回显后别人已改，讨论是否需要乐观锁 version。
4. 给删除加规则：部门下有员工返回 409。
