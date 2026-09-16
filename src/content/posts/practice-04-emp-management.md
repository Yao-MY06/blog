---
title: "04 员工管理：分页、条件查询、批量操作与全局异常"
published: 2026-09-16
description: "课程实操笔记第 04 篇：员工管理全流程与全局异常处理。"
tags: ["Java","Spring Boot","实操笔记"]
category: "教程"
draft: false
lang: 'zh_CN'
---

对应目录：93 员工管理准备；94 分页原理；95 分页代码实现；96 PageHelper；97 条件分页基本实现；98 条件分页优化；99 新增员工基本信息；100 批量保存工作经历；110 删除员工请求参数；111 删除逻辑；112 修改回显；113 修改数据；114 动态更新；115 全局异常处理器；116-118 员工统计。

## 1. 员工管理为什么比部门难

部门是单表 CRUD；员工涉及分页、条件、关联部门、工作经历批量子表、动态更新、统计报表。它把 MyBatis、事务、异常、SQL 优化都串起来。

表简化：

```text
emp(id, username, name, gender, dept_id, entry_date, created_at, updated_at)
emp_work(id, emp_id, company, position, start_date, end_date)
dept(id, name)
```

员工与工作经历一对多；新增员工时基本信息和工作经历要同事务。

## 2. 分页查询原理

前端传 `page=1&size=10`，后端转 `limit (page-1)*size, size`。总数 `count(*)` 用于总页数。

返回结构：

```java
public class PageResult<T> {
  private long total;
  private List<T> rows;
}
```

注意：

- size 必须限上限，例如最大 100，防 `size=100000` 拖库。
- 深分页 `limit 100000,10` 慢；核心列表可改游标分页。
- count 与列表查询条件必须一致，否则总数和页码对不上。

## 3. 手写分页与 PageHelper

手写：

```xml
<select id="page" resultMap="EmpRowMap">
  select e.id,e.username,e.name,e.gender,e.entry_date,d.name dept_name
  from emp e left join dept d on e.dept_id=d.id
  <where>...</where>
  order by e.updated_at desc,e.id desc
  limit #{offset},#{size}
</select>
<select id="count" resultType="long">
  select count(*) from emp e <where>...</where>
</select>
```

PageHelper：调用前 `PageHelper.startPage(page,size)`，下一条 Mapper 查询自动分页，返回 `PageInfo`。方便但要懂原理：它基于 ThreadLocal 拦截下一条 SQL；不要在复杂异步/多查询里误以为全局生效。复杂报表、深分页、精确控制仍建议手写。

## 4. 条件分页查询与优化

条件：姓名模糊、性别、部门、入职日期区间。

```xml
<where>
  <if test="name != null and name != ''">and e.name like concat('%',#{name},'%')</if>
  <if test="gender != null">and e.gender = #{gender}</if>
  <if test="deptId != null">and e.dept_id = #{deptId}</if>
  <if test="begin != null">and e.entry_date &gt;= #{begin}</if>
  <if test="end != null">and e.entry_date &lt;= #{end}</if>
</where>
```

优化点：

- `<where>` 自动处理首个 and，避免拼接 `where 1=1` 的丑写法。
- 日期区间用 `>= begin and < end` 半开区间更稳；`between` 容易边界争议。
- 模糊查询 `like '%x%'` 不走普通索引；搜索需求强考虑 ES，不要硬扛。
- count 查询可去掉 join（若条件不涉及部门），减少成本。

## 5. 新增员工 + 批量保存工作经历

接口：`POST /emps`

Service：

```java
@Transactional
public void add(Emp emp) {
  empMapper.insert(emp); // 回填 id
  if (emp.getWorks() != null && !emp.getWorks().isEmpty()) {
    empWorkMapper.batchInsert(emp.getId(), emp.getWorks());
  }
}
```

批量 XML：

```xml
<insert id="batchInsert">
  insert into emp_work(emp_id, company, position, start_date, end_date)
  values
  <foreach collection="works" item="w" separator=",">
    (#{empId}, #{w.company}, #{w.position}, #{w.startDate}, #{w.endDate})
  </foreach>
</insert>
```

事务意义：员工插入成功但工作经历失败，不能留“半个员工”。批量不要一次几千条；分批并开 `rewriteBatchedStatements`。

## 6. 删除员工

请求参数可能是 `DELETE /emps/{id}` 或批量 `DELETE /emps?ids=1,2,3`。批量更推荐请求体 `{ids:[1,2]}` 或明确限制数量；URL 太长和语义都要考虑。

删除逻辑：

- 是否删工作经历子表：同事务删除或软删。
- 是否检查权限：运营能删员工？还是只能停用。
- 真实系统多用停用 `status=0`，保留历史考勤、订单、审计关联。

## 7. 修改员工：回显、修改、动态更新

回显：`GET /emps/{id}` 返回基本信息和工作经历列表。不要偷懒用列表行数据直接编辑，列表可能少字段或不是最新。

修改：`PUT /emps/{id}`。动态更新只改非空字段：

```xml
<update id="update">
  update emp
  <set>
    <if test="username != null">username=#{username},</if>
    <if test="name != null">name=#{name},</if>
    <if test="gender != null">gender=#{gender},</if>
    <if test="deptId != null">dept_id=#{deptId},</if>
    updated_at = now()
  </set>
  where id=#{id}
</update>
```

工作经历修改策略：学习期可“先删后插”；生产要评估，这会丢子表 id、审计和并发安全。更好是按子记录 id 增删改。

## 8. 全局异常处理器

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public Result valid(MethodArgumentNotValidException e){ ... }

  @ExceptionHandler(DuplicateKeyException.class)
  public Result dup(DuplicateKeyException e){ return Result.error("数据已存在"); }

  @ExceptionHandler(Exception.class)
  public Result unknown(Exception e){
    log.error("系统异常", e);
    return Result.error("系统异常，请联系管理员");
  }
}
```

意义：统一错误模型；不泄露堆栈；把唯一约束、校验失败、业务异常转成稳定 code/msg。不要把所有异常都包成 200 + code=0，HTTP 状态码仍要语义化。

## 9. 员工统计

职位统计、性别统计本质是 group by：

```sql
select position, count(*) cnt from emp_work group by position;
select gender, count(*) cnt from emp group by gender;
```

前端图表要稳定格式：`[{name:'男',value:10},...]`。统计口径写清：统计在职还是含离职？职位按工作经历当前还是历史？数据量大用预聚合，别在高峰扫大表。

## 10. 练习

1. 手写分页和 PageHelper 各实现一次，比较 total/rows。
2. 条件查询构造：姓名+部门+入职区间，explain 看 `emp(dept_id,entry_date)` 是否可用。
3. 新增员工带 3 条工作经历，模拟第二条失败，验证回滚。
4. 修改员工只传 name，确认动态 SQL 不覆盖其他字段。
5. 制造重复 username，用全局异常返回友好 409。
