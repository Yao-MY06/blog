---
title: "开发工具命令速查：Git / Linux / Docker"
published: 2026-09-16
description: "Kimi-Agent 技术手册第 12 册：日常开发高频命令速查表。"
tags: ["Git","Linux","Docker"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> **定位：** 辅助线「Git、Linux、Docker 基础」的工具载体，按场景速查，不按工具书通读。每次辅助线轮到工具类时，挑一个场景把命令跑一遍并留下一条记录即可。
> **记忆原则：** 命令不用背——把「场景 → 命令」的映射记住，用时来查。

---

# 一、Git

## 1.1 日常流（每天用）

```bash
git status                        # 改了什么
git diff                          # 具体改动（工作区 vs 暂存区）
git add -p                        # 逐块确认暂存（比 add . 更可控）
git commit -m "feat: 秒杀下单接口"
git pull --rebase origin main     # 拉取并变基，保持线性历史
git push
```

commit message 前缀约定：`feat`（新功能）/`fix`（修 bug）/`refactor`（重构）/`docs`/`test`/`chore`。

## 1.2 分支与合并

```bash
git switch -c feat/seckill        # 建分支并切换（新语法，替代 checkout -c）
git switch main
git merge --no-ff feat/seckill    # 保留分支拓扑的合并
git branch -d feat/seckill        # 删已合并分支
git log --oneline --graph -20     # 图形化看历史
```

**merge vs rebase 怎么选**（团队问题，技术上是两件事）：个人分支同步主干用 `rebase`（历史干净、像在最新主干上开发）；主干合入功能用 `merge --no-ff`（保留「这批提交属于这个功能」的信息）。**已推送到共享分支的提交不要 rebase**（改写历史会让别人的仓库错乱）。

## 1.3 撤销与救命（panic 专用）

```bash
git restore <file>                       # 丢弃工作区改动（未 add）
git restore --staged <file>              # 取消暂存（保留改动）
git commit --amend                       # 改最近一次提交（未 push 前）
git reset --soft HEAD~1                  # 撤销上次提交，改动保留
git reset --hard origin/main             # 本地完全对齐远程（慎用，改动会丢）
git revert <commit-id>                   # 生成反向提交（已 push 的公共历史用这个，不改写历史）
git stash / git stash pop                # 临时藏起改动
git reflog                               # ★所有HEAD移动记录——reset 错了靠它救回
```

`reflog` 是 Git 的后悔药：几乎任何「丢失」的提交都能在这里找到 commit-id 再 `reset` 回去。

## 1.4 远程与排查

```bash
git remote -v
git push -u origin feat/seckill          # 首推并建立跟踪
git fetch --prune                        # 同步远程分支列表（删掉已消失的）
git blame -L 20,30 file.java             # 这段代码谁写的
git log -S "deductStock" --oneline       # 这个字符串什么时候加/删的
git checkout <commit-id> -- path/file    # 只恢复某文件的历史版本
```

## 1.5 场景题

- **提交错分支了**：`git log` 找 commit-id → 目标分支 `git cherry-pick <id>` → 原分支 `git reset --hard HEAD~1`（未推送时）。
- **合并冲突**：`git status` 看冲突文件 → 手动改 `<<<<<<< ======= >>>>>>>` 标记段 → `git add` → `git rebase --continue`（rebase 中）或 `git commit`（merge 中）→ 想放弃：`git rebase --abort` / `git merge --abort`。
- **想把大文件从历史里去掉**（仓库越推越大）：`git filter-repo`（提前搜教程，先在副本上练）。

---

# 二、Linux（服务器视角）

## 2.1 文件与目录

```bash
ls -lah                     # l 详情 a 含隐藏 h 人类可读大小
cd -                        # 回上一个目录
pwd
mkdir -p a/b/c              # 递归建目录
cp -r src dst               # 递归复制
mv old new                  # 移动/改名
find . -name "*.log" -mtime +7        # 7天前的日志
find . -type f -size +100M            # 超过100M的文件
du -sh * | sort -rh | head             # 当前目录谁最大
df -h                       # 磁盘还剩多少（排查"磁盘写满"第一步）
```

## 2.2 文本三剑客（看日志的核心技能）

```bash
# grep：找
grep -rn "ERROR" logs/                  # r 递归 n 带行号
grep -c "order timeout" app.log         # 数出现次数
grep -A 5 -B 2 "Exception" app.log      # 匹配行 + 后5行/前2行（看异常上下文）
grep -E "ERROR|WARN" app.log            # 正则或

# tail/head：追
tail -f app.log                         # 实时滚动（最常用）
tail -n 2000 app.log | grep orderId     # 最后2000行里找订单
tail -f app.log | grep --line-buffered "seckill"   # 只追秒杀日志

# awk：列处理（记住这一个模式就够用）
awk '{print $1, $7}' access.log         # 打印第1、7列
awk '$9==500 {print $7}' access.log     # 第9列是500的，打印第7列（URL）——统计500错的接口
awk -F',' '{sum+=$3} END {print sum/NR}' data.csv   # 第3列平均

# sort/uniq 组合：接口调用量 Top10
awk '{print $7}' access.log | sort | uniq -c | sort -rn | head
```

## 2.3 进程 / 资源（性能排查）

```bash
ps -ef | grep java
top                        # P 按CPU排序 M 按内存排序
top -Hp <pid>              # 看进程内线程（CPU高时定位线程，连11册jstack流程）
free -h                    # 内存；看 available 不是 free
uptime                     # 负载（1/5/15分钟）
kill -15 <pid>             # 优雅停止（先15后9）
kill -9 <pid>              # 强杀（进程没机会收尾，最后手段）
lsof -i:8080               # 谁占了端口
nohup java -jar app.jar > /dev/null 2>&1 &    # 后台跑（学习服务器常用）
```

## 2.4 网络与系统

```bash
curl -v http://localhost:8080/api/order/1     # -v 看完整请求响应
curl -X POST -H "Content-Type: application/json" -d '{"id":1}' http://localhost:8080/api/order
ip addr / ifconfig                            # 看本机 IP
ss -tlnp                                       # 监听端口（替代 netstat -tlnp）
ping / traceroute <host>
journalctl -u myapp -f --since "10 min ago"    # systemd 服务日志
tar -czf backup.tar.gz dir/ && tar -xzf backup.tar.gz
scp app.jar user@192.168.1.10:/opt/app/        # 传文件
```

## 2.5 场景：服务起不来/挂了怎么查（固定套路）

1. `ps -ef | grep java` —— 进程还在吗？
2. 在不在：`curl -v localhost:8080/actuator/health` —— 端口通吗？
3. `df -h` + `free -h` —— 磁盘满/内存尽会直接杀进程。
4. `tail -n 200 nohup.out` 或 `journalctl -u xxx -n 200` —— 看崩前最后的日志。
5. `top -Hp` + 11 册流程 —— CPU 型死亡。

---

# 三、Docker

## 3.1 镜像与容器

```bash
docker pull mysql:8.0
docker images
docker run -d --name mysql8 \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root123 \
  -v /opt/mysql-data:/var/lib/mysql \
  --restart unless-stopped \
  mysql:8.0
docker ps                       # 在跑的容器
docker ps -a                    # 包括已退出的（看启动失败）
docker logs -f --tail 200 mysql8     # 看日志（排错第一步）
docker exec -it mysql8 bash     # 进容器
docker rm -f mysql8             # 删容器
docker rmi mysql:8.0            # 删镜像
```

`-d` 后台 / `-p` 端口映射(宿:容器) / `-e` 环境变量 / `-v` 卷挂载——**数据库容器必须挂卷**，否则删容器=数据全没。

## 3.2 Compose（项目一本地环境的主力）

```yaml
# docker-compose.yml：一键起 MySQL+Redis+RocketMQ 伪集群
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root123
    ports: ["3306:3306"]
    volumes: ["./data/mysql:/var/lib/mysql"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

```bash
docker compose up -d          # 全部启动
docker compose ps
docker compose logs -f mysql
docker compose down           # 停并删容器（卷数据还在）
docker compose up -d --build  # 改完代码重建自己的服务
```

## 3.3 给自己的 Spring Boot 应用做镜像

```dockerfile
# 多阶段构建：构建层和运行层分离，镜像小
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline          # 依赖层缓存，改代码不重下依赖
COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", \
  "-Xms512m", "-Xmx512m", \
  "-XX:+HeapDumpOnOutOfMemoryError"]    # 连11册：参数在这里进容器
```

## 3.4 清理与调试

```bash
docker system df                     # 磁盘被 docker 吃了多少
docker system prune -a --volumes     # 清理一切没在用的（注意 --volumes 会删未挂载的卷数据）
docker stats                         # 各容器 CPU/内存
docker inspect mysql8 | grep -i memory
docker cp mysql8:/var/log/x.log ./   # 容器里拷文件出来
```

## 3.5 场景：容器一启动就退出

1. `docker ps -a` 看退出码（137=OOM 被杀或 kill -9；1=应用错误）。
2. `docker logs` 看它死前说了什么。
3. 交互式起一次进去看：`docker run -it --entrypoint bash 镜像`。
4. 常见原因：配置文件路径错（挂载写反宿:容器）、依赖的服务没就绪（MySQL 还没起来应用就连）、JVM 堆超过容器内存限制（`-Xmx` vs compose 的 `mem_limit`，连 11 册）。

---

# 四、使用建议（连回辅助线）

1. 辅助线轮到工具日时，从「场景题」里挑一个没做过的，在实验室机上真跑一遍，把命令和结果记一条到 [最小笔记](/blog/posts/knowledge-processing-sop/)。
2. 本册不进阅读计划；**项目一 Docker Compose 环境（P0 阶段）会把 3.2/3.3 全部变成实战**，到时回来对着搭。
3. 每条命令的完整参数：`man xxx` 或 `xxx --help`，看一手文档。
