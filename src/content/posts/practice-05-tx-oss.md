---
title: "05 事务管理、文件上传与 OSS、配置绑定优化"
published: 2026-09-16
description: "课程实操笔记第 05 篇：事务、文件上传与对象存储。"
tags: ["Java","OSS","实操笔记"]
category: "教程"
draft: false
lang: 'zh_CN'
---

对应目录：101 事务介绍与操作；102 Spring事务介绍；103 Spring事务进阶&四大特性；104 文件上传介绍；105 本地存储；106 OSS准备；107 OSS入门；108 OSS案例集成；109 程序优化(@Value & @ConfigurationProperties)。

## 1. 事务是什么

事务是一组操作要么全成功，要么全失败。员工管理里最典型：新增员工主表 + 批量工作经历；订单里：扣库存 + 插订单 + 用券。缺了事务，就可能出现“员工有了，工作经历没保存”“库存扣了，订单没生成”。

ACID 用项目话：

- 原子性：一组 SQL 同成败。
- 一致性：约束和业务规则不被破坏，比如库存不为负。
- 隔离性：并发操作不看到半成品。
- 持久性：提交后宕机不丢。

## 2. 手动事务到 Spring 事务

JDBC 手动：

```java
conn.setAutoCommit(false);
try { ...; conn.commit(); } catch(Exception e){ conn.rollback(); throw e; }
```

Spring 声明式：

```java
@Transactional
public void add(Emp emp) {
  empMapper.insert(emp);
  empWorkMapper.batchInsert(emp.getId(), emp.getWorks());
}
```

本质没变：底层仍是 connection commit/rollback，Spring 用 AOP 代理把模板包起来。因为靠代理，才有后面的失效场景。

## 3. Spring 事务进阶与失效

常见失效：

- 同类自调用：`this.saveBatch()` 不走代理。
- 非 public 方法默认不代理。
- 异常被 catch 吃掉没回滚。
- 默认只回滚 RuntimeException/Error，受检异常要 `rollbackFor`。
- 多数据源/多事务管理器注错。
- 在事务里做远程调用、文件上传、OSS 请求：失败语义不一致，还拉长事务占连接。

传播级别常用 REQUIRED；REQUIRES_NEW 要谨慎，别把“主业务回滚但日志/审计已提交”的语义用错。只读查询用 `readOnly=true` 并思考是否真要事务。

## 4. 文件上传介绍

文件上传不是把文件塞进数据库。主流做法：文件进对象存储或文件服务，DB 只存 URL/key、原始名、大小、类型、上传人、hash。请求格式是 `multipart/form-data`，后端用 `MultipartFile`。

关键风险：

- 大文件内存爆掉：用流，不要 `getBytes()` 全读。
- 文件名不可信：`originalFilename` 可能带路径或伪装扩展。
- 类型伪造：Content-Type 可信有限，重要场景做魔数校验/杀毒。
- 重复上传：按内容 hash 去重或秒传。
- 权限：头像可公开，合同/身份证必须私有签名 URL。

## 5. 本地存储

```java
@PostMapping("/upload")
public Result upload(MultipartFile file) throws IOException {
  String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
  String name = UUID.randomUUID() + "." + ext;
  Path path = Paths.get(uploadDir, name);
  Files.copy(file.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
  return Result.success("/files/" + name);
}
```

本地存储适合学习，不适合多实例生产：A 机器上传，B 机器读不到；容器重建文件丢；备份和扩容麻烦。所以它用于理解 multipart，不是最终方案。

## 6. 阿里云 OSS 思路

OSS 价值：文件高可用、可多实例共享、CDN、私有签名、生命周期归档。流程：

1. 后端拿到 `MultipartFile`。
2. 校验大小、扩展名、Content-Type，生成 object key，如 `ems/avatar/{userId}/{uuid}.jpg`。
3. 用 OSS SDK 流式上传。
4. DB 保存 key/url。
5. 删除文件要处理“DB 删了 OSS 没删”或反向孤儿文件，用生命周期/对账清理。

学习期没有云账号也可用 MinIO 本地模拟 S3 协议，概念一致。

## 7. 配置优化：`@Value` vs `@ConfigurationProperties`

`@Value("${aliyun.oss.endpoint}")` 散落各处的问题：拼写错难发现、类型不校验、重构难、测试难。

```java
@Validated
@ConfigurationProperties(prefix = "aliyun.oss")
public record OssProperties(
  @NotBlank String endpoint,
  @NotBlank String accessKeyId,
  @NotBlank String accessKeySecret,
  @NotBlank String bucket,
  @NotBlank String dir
) {}
```

配合 `@EnableConfigurationProperties` 或 `@ConfigurationPropertiesScan`。敏感密钥仍放环境变量/Secret；配置绑定解决结构与校验，不解决机密存储。

## 8. 练习

1. 写一个必失败的新增员工：工作经历第二条非法，验证员工主表也回滚。
2. 制造自调用事务失效，再改成注入自身/拆 Service 修复。
3. 上传 1 个 5MB 图片，本地存；再改 OSS/MinIO，DB 只存 key。
4. 用 `@ConfigurationProperties` 重构 OSS 配置，故意把 bucket 配空，启动快速失败。
5. 删除文件设计：DB 删除成功但 OSS 删除失败，写补偿任务思路。
