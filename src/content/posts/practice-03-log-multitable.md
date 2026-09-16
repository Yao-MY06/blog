---
title: "03 日志 Logback 与 MySQL 多表关系/多表查询"
published: 2026-09-16
description: "课程实操笔记第 03 篇：日志配置与多表查询。"
tags: ["Java","MySQL","实操笔记"]
category: "教程"
draft: false
lang: 'zh_CN'
---

对应目录：84 Logback入门；85 Logback配置文件&日志级别；86 一对多；87 一对一&多对多；88 多表设计案例；89 多表查询概述；90 内连接&外连接；91 子查询；92 多表查询案例。

## 1. 日志不是 System.out.println

`System.out.println` 问题：不能分级、不能写文件、不能按包开关、没有统一格式、性能差、生产排查无法过滤。日志框架把“哪里、什么时候、什么级别、什么线程、什么 trace、什么消息”结构化。

SpringBoot 默认 Logback。最小使用：

```java
private static final Logger log = LoggerFactory.getLogger(DeptService.class);
log.info("查询部门列表");
log.warn("删除部门不存在 id={}", id);
log.error("新增部门失败 name={}", name, e);
```

占位符 `{}` 比字符串拼接好：级别不启用时少拼接成本，也更清晰。异常要传最后一个参数 `e`，不要只 `e.getMessage()`，否则丢堆栈。

## 2. 日志级别

常见级别：TRACE < DEBUG < INFO < WARN < ERROR。

- ERROR：需要人介入或影响用户的失败。
- WARN：可恢复异常、降级、非法请求增多。
- INFO：关键业务节点，如订单创建、支付回调、登录成功。
- DEBUG：开发定位细节，生产按需临时开。
- TRACE：极细，少用。

配置示例：

```yaml
logging:
  level:
    root: info
    com.example.ems: debug
  pattern:
    console: "%d{HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n"
```

生产建议输出到文件并滚动；错误日志单独文件；接入 ELK/Loki 后保证 traceId 字段。日志别打印密码、身份证、完整手机号。

## 3. 多表关系

部门员工系统天然有多表：

- 一对多：一个部门多个员工。`dept 1 - n emp`，在多方 emp 表存 `dept_id`。
- 一对一：员工和员工档案/身份证扩展信息。可把低频大字段拆到 `emp_profile`，主表保持瘦。
- 多对多：学生和课程、员工和角色。用中间表：`emp_role(emp_id, role_id)`，联合唯一。

设计原则：关系放在“多”的一方；多对多必须中间表；唯一约束想清楚，比如一个员工同一角色不能重复。

## 4. 多表设计案例

```sql
create table dept(id bigint primary key auto_increment, name varchar(50) not null unique);

create table emp(
  id bigint primary key auto_increment,
  username varchar(50) not null unique,
  name varchar(50) not null,
  gender tinyint,
  dept_id bigint,
  entry_date date,
  created_at datetime default current_timestamp,
  index idx_dept (dept_id)
);

create table role(id bigint primary key auto_increment, name varchar(50) unique);
create table emp_role(
  emp_id bigint not null,
  role_id bigint not null,
  primary key(emp_id, role_id)
);
```

是否加外键：学习可加强理解；高并发系统常用弱外键，由服务层和一致性任务保证。重点不是有没有 FK，而是你是否知道删部门时员工怎么办。

## 5. 多表查询概述

多表查询的核心是“连接条件”和“结果集重复”。只要 join，就要问：一行主表会不会被明细放大？分页会不会错？是否真的需要 join，还是可以分两次查？

笛卡尔积是坑：`from emp, dept` 没写条件会 N×M。显式写 `join ... on ...`，不要老式逗号连接。

## 6. 内连接与外连接

内连接：只要两边都匹配。

```sql
select e.id, e.name, d.name dept_name
from emp e join dept d on e.dept_id = d.id;
```

左外连接：保留左表全部，右表没有补 null。查“所有员工及部门，含未分配”：

```sql
select e.id, e.name, d.name dept_name
from emp e left join dept d on e.dept_id = d.id;
```

反查“没有员工的部门”：

```sql
select d.*
from dept d left join emp e on e.dept_id = d.id
where e.id is null;
```

## 7. 子查询

标量子查询：查入职晚于某员工的人：

```sql
select * from emp where entry_date > (select entry_date from emp where id = 10);
```

IN/EXISTS：查有员工的部门：

```sql
select * from dept d where exists (select 1 from emp e where e.dept_id = d.id);
```

`exists` 表达“有没有”常比 `in` 清楚；子查询结果很大时注意性能。

## 8. 多表查询案例：员工列表带部门名

```sql
select e.id, e.username, e.name, e.gender, e.entry_date, d.name dept_name
from emp e left join dept d on e.dept_id = d.id
where (#{name} is null or e.name like concat('%',#{name},'%'))
  and (#{deptId} is null or e.dept_id = #{deptId})
order by e.updated_at desc, e.id desc
limit #{offset}, #{size};
```

MyBatis 中建议返回扁平 DTO `EmpRow`，不要硬塞实体加临时字段太久。列表字段按需选择；后续统计、导出可能用不同 SQL。

## 9. 练习

1. 给日志加统一格式，制造一个异常，比较 `log.error("x", e)` 和 `log.error(e.getMessage())`。
2. 建 emp/dept/role/emp_role，写出：员工带部门、无员工部门、员工的角色列表。
3. 用 left join 找出未分配部门员工；用 exists 找出有男员工的部门。
4. 对一个 join 查询 explain，确认 `emp.dept_id` 有索引。
