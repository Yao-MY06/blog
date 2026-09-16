---
title: "Maven 后端开发详细教程（Spring Boot 前置）"
published: 2026-09-16
description: "Maven 依赖管理、构建生命周期与多模块项目。"
tags: ["Java","Maven"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 目标：学完后能独立搭建 Maven 项目、读懂任何公司项目的 pom.xml、解决依赖冲突，并无缝衔接 Spring Boot。
> 定位：工具书 + 面试速查。建议配合动手操作食用。

---

# 第一章：彻底理解 Maven 是什么

## 1.1 没有 Maven 的时代有多痛

手动开发一个 Java Web 项目，你需要：
1. 去各个官网下载 servlet-api.jar、mysql-connector.jar、log4j.jar……
2. 这些 jar 自己还依赖别的 jar（log4j 依赖 xxx），你得继续找。
3. 版本不对互相冲突，运行时报 `NoClassDefFoundError` / `NoSuchMethodError`。
4. 团队里每个人 jar 版本不一样，"我电脑上能跑"。
5. 编译、打包、部署全靠手动或各写各的脚本。

Maven 一次性解决两件事：
- **依赖管理**：声明坐标 → 自动下载 → 自动带出传递依赖 → 统一管理版本。
- **项目构建**：一套标准生命周期（编译/测试/打包/安装/部署），所有 Maven 项目结构统一，换个项目不用重新学目录结构。

## 1.2 Maven 的本质

- 核心是一个 **POM（Project Object Model）** 文件：`pom.xml`，描述"这个项目是什么、依赖什么、怎么构建"。
- 一切能力由**插件（Plugin）**提供：编译是 maven-compiler-plugin、测试是 surefire、打包是 jar/war 插件。Maven 本身只是个调度框架。
- 约定优于配置（Convention Over Configuration）：目录结构是约定好的，你不用配置源码在哪。

## 1.3 标准目录结构（必背）

```
my-app/
├── pom.xml                        ← 项目的心脏
└── src/
    ├── main/                      ← 正式代码
    │   ├── java/                  ← 源代码（com.example.App）
    │   ├── resources/             ← 配置文件（application.yml、logback.xml、mapper.xml）
    │   └── webapp/                ← web 项目才有（WEB-INF/web.xml）
    └── test/                      ← 测试代码
        ├── java/                  ← 单元测试
        └── resources/             ← 测试专用配置
```

打包后：`target/` 目录，里面是编译产物和最终的 jar/war。

---

# 第二章：安装与配置

## 2.1 安装（前置：已装好 JDK 并配好 JAVA_HOME）

1. 官网下载 apache-maven-3.9.x-bin.zip，解压到无空格无中文路径（如 `D:\dev\apache-maven-3.9.9`）。
2. 配环境变量：
   - `MAVEN_HOME = D:\dev\apache-maven-3.9.9`
   - `Path` 追加 `%MAVEN_HOME%\bin`
3. 验证：`mvn -v` → 能看到 Maven 版本 + Java 版本 + JAVA_HOME 路径才算成功。

> 注意：`mvn -v` 显示的 Java 版本必须是你想用的 JDK。如果不对，说明 JAVA_HOME 指错了——Maven 只认 JAVA_HOME，不认 Path 里的 java。

## 2.2 settings.xml（Maven 的全局配置，必改）

位置：`%MAVEN_HOME%\conf\settings.xml`（全局）或 `~/.m2/settings.xml`（用户级，推荐，升级 Maven 不丢）。

**三个必配项**：

```xml
<settings>
    <!-- ① 本地仓库位置：默认 C:\Users\你\.m2\repository，C盘紧张就挪走 -->
    <localRepository>D:\dev\maven-repo</localRepository>

    <!-- ② 阿里云镜像：不配的话从海外中央仓库下载，慢到怀疑人生 -->
    <mirrors>
        <mirror>
            <id>aliyun</id>
            <mirrorOf>central</mirrorOf>
            <name>Aliyun Maven</name>
            <url>https://maven.aliyun.com/repository/public</url>
        </mirror>
    </mirrors>

    <!-- ③ 默认 JDK 编译版本：不配的话 Maven 编译插件默认用很老的 1.5，必报错 -->
    <profiles>
        <profile>
            <id>jdk-17</id>
            <activation>
                <activeByDefault>true</activeByDefault>
            </activation>
            <properties>
                <maven.compiler.source>17</maven.compiler.source>
                <maven.compiler.target>17</maven.compiler.target>
                <maven.compiler.release>17</maven.compiler.release>
            </properties>
        </profile>
    </profiles>
</settings>
```

## 2.3 IDEA 集成（日常 99% 的操作都在这完成）

- `File → Settings → Build Tools → Maven`：
  - Maven home path：选你解压的 Maven（别用 IDEA 自带的 Bundled，版本可能旧）
  - User settings file：指向你改过的 settings.xml（勾 Override）
  - Local repository：会自动跟着 settings.xml 变
- 右侧 **Maven 面板**：
  - Lifecycle 下双击 = 执行命令（clean、install…）
  - 刷新按钮 = 重新加载 pom（改了 pom.xml 必须点，或开启自动 reload）
  - `m` 图标 = 执行任意 Maven 命令

## 2.4 创建第一个项目

**方式一：IDEA 新建** → New Project → Maven Archetype / Jakarta EE，填 GAV 即可。
**方式二：命令行骨架生成**：

```bash
mvn archetype:generate -DgroupId=com.example -DartifactId=demo \
  -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false
```

**方式三（最快）**：直接手写目录 + 最小 pom.xml：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>jar</packaging>
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
</project>
```

---

# 第三章：依赖管理（核心中的核心）

## 3.1 坐标 GAV

```xml
<dependency>
    <groupId>mysql</groupId>           <!-- 组织/公司，一般是域名倒写 -->
    <artifactId>mysql-connector-j</artifactId>  <!-- 项目名 -->
    <version>8.0.33</version>          <!-- 版本 -->
</dependency>
```

- 找坐标：去 https://mvnrepository.com 搜库名，复制 Maven 标签页内容。
- 本地仓库里的存放路径由 GAV 决定：`<本地仓库>/mysql/mysql-connector-j/8.0.33/mysql-connector-j-8.0.33.jar`。
- **SNAPSHOT**：`1.0-SNAPSHOT` 是开发版，每次构建可覆盖，远端会带时间戳；`1.0` 是 release 正式版，不可变。公司私服对两者策略不同。

## 3.2 依赖范围 scope（六个，前四个必背）

| scope | 编译期 | 测试期 | 运行/打包 | 使用场景 | 例子 |
|---|---|---|---|---|---|
| **compile**（默认） | ✅ | ✅ | ✅ | 普通依赖 | spring-core、fastjson |
| **provided** | ✅ | ✅ | ❌ | 运行环境（如 Tomcat/JDK）已提供 | jakarta.servlet-api、lombok |
| **runtime** | ❌ | ✅ | ✅ | 编译不需要、运行才需要 | mysql-connector-j（代码里写的是 JDBC 接口） |
| **test** | ❌ | ✅ | ❌ | 只用于测试 | junit-jupiter、mockito |
| system | ✅ | ✅ | ❌ | 引用本地磁盘 jar（systemPath 指定），**别用**，移植性极差 | — |
| import | — | — | — | 只用于 dependencyManagement 里导入 BOM | spring-boot-dependencies |

scope 会"传递"且可能收窄：A(compile) 依赖 B(runtime)，到你项目里 B 就是 runtime。

## 3.3 传递依赖（Transitive Dependency）

你只声明了 `spring-boot-starter-web`，它自己依赖 spring-web、spring-webmvc、内嵌 Tomcat、Jackson……这些会**自动全部带进来**。这就是 Maven 最大的价值。

查看完整依赖树：

```bash
mvn dependency:tree                    # 全量
mvn dependency:tree -Dincludes=com.google.code.gson   # 过滤某个
```

## 3.4 依赖冲突与调解规则（面试必考）

同一个类库的不同版本出现在依赖树里 = 冲突。

**Maven 的自动调解规则（按顺序生效）：**
1. **最短路径优先**：`A→B→C→X(1.0)`（深度3） vs `A→D→X(2.0)`（深度2）→ 选 2.0。
2. **同等深度，先声明者优先**：pom.xml 里先写的赢。

**手动干预三招：**

① 排除传递来的版本（最常用）：
```xml
<dependency>
    <groupId>com.xxx</groupId>
    <artifactId>some-sdk</artifactId>
    <version>2.0</version>
    <exclusions>
        <exclusion>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-log4j12</artifactId>   <!-- 踢掉它带的旧日志 -->
        </exclusion>
    </exclusions>
</dependency>
```

② 在自己 pom 里**直接声明**想要的版本（路径深度=1，最短，必赢）：
```xml
<dependency>
    <groupId>com.google.code.gson</groupId>
    <artifactId>gson</artifactId>
    <version>2.10.1</version>   <!-- 直接写死，覆盖传递来的版本 -->
</dependency>
```

③ 用 dependencyManagement 锁版本（大型项目正规做法，见 3.6）。

**排障工具**：
- `mvn dependency:tree` 里标 `omitted for conflict with xxx` 的就是被调解掉的。
- IDEA 装 **Maven Helper** 插件 → 打开 pom.xml → 底部 Dependency Analyzer 标签 → 红色=冲突，右键 Exclude。

**典型症状**：
- `NoSuchMethodError` / `NoSuchFieldError`：编译时类里有这个方法，运行时加载的是旧版本类 → 依赖版本被调解错了。
- `ClassNotFoundException` / `NoClassDefFoundError`：依赖没引入或 scope 不对（如该 runtime 的写成了 provided）。

## 3.5 统一管理版本：properties

```xml
<properties>
    <java.version>17</java.version>
    <mysql.version>8.0.33</mysql.version>
    <fastjson.version>2.0.43</fastjson.version>
</properties>

<dependencies>
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <version>${mysql.version}</version>
    </dependency>
</dependencies>
```

## 3.6 dependencyManagement 与 BOM（Spring Boot 的地基，务必吃透）

- `<dependencies>` 里的依赖 = **真的会下载引入**。
- `<dependencyManagement>` 里的依赖 = **只声明版本，不引入**。子模块（或本模块）在 dependencies 里引用时**可以不写 version**，自动继承这里锁定的版本。

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <version>8.0.33</version>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <!-- 不用写 version，继承上面的 8.0.33 -->
    </dependency>
</dependencies>
```

**BOM（Bill of Materials，物料清单）**：把几百个相关依赖的版本打包管理成一个 POM，别人用 `import` 一键引入整套版本约束——这就是 Spring Boot 版本管理的秘密：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.2.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

> 衔接提示：你在 Spring Boot 里写依赖从来不写版本号，就是因为 `spring-boot-starter-parent`（它内部就是 import 了 spring-boot-dependencies 这个 BOM）已经帮你定好了几百个经过兼容性验证的版本。

---

# 第四章：构建生命周期与插件机制

## 4.1 三套生命周期（相互独立）

**① clean（清理）**：`pre-clean → clean → post-clean`

**② default（构建核心，21+ 阶段，记这条主线）**：

```
validate → initialize → compile → test → package → verify → install → deploy
   │           │          │        │        │         │         │        │
 校验pom    初始化      编译main  跑测试   打jar/war  集成校验  装入本地  推到私服
 合法性                    代码    (test目录)                     仓库     (远程仓库)
```

**③ site（文档）**：生成项目站点文档（基本没人用，了解）。

**关键规则**：
- 执行某个阶段，**同一生命周期内它前面的阶段全部按序执行**。`mvn package` = validate→…→compile→test→package 全跑。
- 不同生命周期可组合：`mvn clean install` = clean 全跑 + install 之前全跑。
- 每个阶段实际干活的是绑定的**插件目标（goal）**。比如 compile 阶段 = maven-compiler-plugin:compile。

## 4.2 常用命令大全

```bash
mvn clean                          # 删 target/
mvn compile                        # 编译 main 代码
mvn test                           # 跑 src/test 下所有测试
mvn package                        # 打包到 target/xxx.jar（会先跑测试）
mvn install                        # 打包 + 装进本地仓库（别的项目能依赖它）
mvn deploy                         # 发布到远程私服（要配 distributionManagement）
mvn clean install -DskipTests      # 跳过测试执行（编译测试类但不跑）
mvn clean install -Dmaven.test.skip=true   # 连测试类编译都跳过（更狠）
mvn test -Dtest=UserServiceTest    # 只跑指定测试类
mvn dependency:tree                # 依赖树
mvn dependency:resolve             # 解析并列出依赖
mvn help:effective-pom             # 查看合并所有继承后的最终 pom（排查神器）
mvn versions:display-dependency-updates  # 检查依赖有没有新版本
mvn -U clean install               # 强制更新 SNAPSHOT 依赖（依赖不生效时用）
mvn -o package                     # 离线模式（本地仓库已有时）
mvn -pl 模块名 -am install         # 多模块项目：只构建某模块及其依赖
```

## 4.3 常用插件配置

**maven-compiler-plugin**（指定 JDK 版本，pom 里配了 properties 就不用显式配）：

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <version>3.13.0</version>
    <configuration>
        <source>17</source>
        <target>17</target>
        <encoding>UTF-8</encoding>
        <parameters>true</parameters>   <!-- Spring 需要参数名反射 -->
    </configuration>
</plugin>
```

**maven-surefire-plugin**（测试插件）：

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <skipTests>false</skipTests>
        <includes>
            <include>**/*Test.java</include>   <!-- 只跑 *Test 结尾的 -->
        </includes>
    </configuration>
</plugin>
```

**spring-boot-maven-plugin**（马上就会用到）：把项目打成**可执行的 fat jar**（内含所有依赖 + 内嵌 Tomcat），`java -jar xxx.jar` 直接启动：

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
</plugin>
```

打出来的 jar 结构：`BOOT-INF/classes/`（你的代码）+ `BOOT-INF/lib/`（所有依赖 jar）+ `org/springframework/boot/loader/`（启动器）。

**pluginManagement**：和 dependencyManagement 同理——父 POM 锁插件版本，子模块引用不写版本。

## 4.4 resources 与打包细节

- `src/main/resources` 下的文件打包时原样进入 classpath（jar 根目录）。
- `<packaging>` 三种值：`jar`（默认）/ `war`（传统 Web，扔 Tomcat）/ `pom`（纯管理用，父工程/BOM）。
- 资源过滤 filtering：可以让 Maven 把 pom 里的变量替换进配置文件（如 `@project.version@`），多环境打包的底层手段之一。

---

# 第五章：多模块项目（公司项目真实形态）

## 5.1 典型结构

```
mall/                            ← 父工程（packaging=pom，只有 pom.xml）
├── pom.xml
├── mall-common/                 ← 公共工具类、常量、DTO
├── mall-dao/                    ← 实体类、Mapper（依赖 common）
├── mall-service/                ← 业务逻辑（依赖 dao）
└── mall-web/                    ← Controller、启动类（依赖 service）
```

## 5.2 父 POM（聚合 + 继承 + 版本统一管理）

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>mall</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>pom</packaging>          <!-- 关键：父工程必须是 pom -->

    <!-- 聚合：列出所有子模块，构建父 = 构建全部 -->
    <modules>
        <module>mall-common</module>
        <module>mall-dao</module>
        <module>mall-service</module>
        <module>mall-web</module>
    </modules>

    <properties>
        <java.version>17</java.version>
        <mysql.version>8.0.33</mysql.version>
    </properties>

    <!-- 统一锁版本：子模块引用不用写 version -->
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>mysql</groupId>
                <artifactId>mysql-connector-j</artifactId>
                <version>${mysql.version}</version>
                <scope>runtime</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

## 5.3 子模块 POM

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <parent>                             <!-- 继承父 POM：获得版本管理与公共配置 -->
        <groupId>com.example</groupId>
        <artifactId>mall</artifactId>
        <version>1.0-SNAPSHOT</version>
    </parent>
    <artifactId>mall-dao</artifactId>    <!-- 自己的 artifactId -->

    <dependencies>
        <dependency>                     <!-- 依赖兄弟模块 -->
            <groupId>com.example</groupId>
            <artifactId>mall-common</artifactId>
            <!-- version 继承自父 -->
        </dependency>
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <!-- version 由父 POM dependencyManagement 提供 -->
        </dependency>
    </dependencies>
</project>
```

## 5.4 要点

- **聚合（modules）≠ 继承（parent）**：聚合是"一键构建全部"，继承是"共享配置/版本"。实践中父 POM 两个角色一起当。
- 子模块互相依赖时，必须先在父工程 `mvn clean install`（把 common 等装进本地仓库），单独构建子模块才找得到。
- 只想构建某个模块及其上游：`mvn install -pl mall-web -am`（-am = also make 依赖的模块）。
- 依赖分层原则：上层依赖下层，**禁止循环依赖**（web→service→dao→common，反过来就报错）。

---

# 第六章：Profile 多环境

场景：开发连 dev 库、测试连 test 库、生产连 prod 库。

```xml
<profiles>
    <profile>
        <id>dev</id>
        <activation><activeByDefault>true</activeByDefault></activation>   <!-- 默认 -->
        <properties>
            <env>dev</env>
            <db.url>jdbc:mysql://localhost:3306/mall_dev</db.url>
        </properties>
    </profile>
    <profile>
        <id>prod</id>
        <properties>
            <env>prod</env>
            <db.url>jdbc:mysql://prod-server:3306/mall</db.url>
        </properties>
    </profile>
</profiles>
```

使用：`mvn clean package -P prod` 激活 prod 环境。配合资源 filtering 可把 `@db.url@` 替换进配置文件。

> 衔接提示：Spring Boot 里这套被 `application-dev.yml` + `spring.profiles.active` 取代了，更优雅。Maven profile 仍需认识，老项目和 CI 流水线（Jenkins）里常见。

---

# 第七章：仓库体系（公司开发必知）

```
你的项目
   │
   ▼ 查找顺序
① 本地仓库（~/.m2/repository）
   │ miss
   ▼
② 私服（Nexus/Artifactory，公司内网）——settings.xml 里 mirrorOf=*
   │ miss
   ▼
③ 中央仓库（被镜像代理，通常不直连）
```

- **私服的作用**：缓存中央仓库（加速+省带宽）+ 托管公司内部 jar（比如你们公司的 mall-common 发布上去，别的团队引用）。
- 发布到私服：pom 里配 `<distributionManagement>`（repository=release / snapshotRepository=snapshot），settings.xml 配 `<servers>` 存账号密码，然后 `mvn deploy`。
- 从私服下载：settings.xml 的 profile 里配 `<repositories>` 指向私服地址。

---

# 第八章：常见报错与排查速查

| 症状 | 原因 | 解法 |
|---|---|---|
| 下载卡住/超时 | 没配镜像 | settings.xml 配阿里云 |
| `Could not resolve dependencies` | 坐标写错/版本不存在/网络问题 | 去 mvnrepository.com 核对；删本地仓库对应目录重下（可能下了半截） |
| 依赖引入后还是报红 | 下载了 .lastUpdated 失败标记文件 | 删本地仓库对应目录 → IDEA 点 Maven 刷新；或 `mvn -U` |
| `NoSuchMethodError` | 版本冲突，加载了旧版类 | dependency:tree 查冲突 → exclusion/锁版本 |
| 编译报 "不支持发行版本 5" | 没配 JDK 版本 | pom properties 或 settings.xml 配 17 |
| 打包中文乱码 | 没配编码 | `<project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>` |
| 改了 pom 不生效 | IDEA 没重新加载 | Maven 面板点刷新 |
| 子模块找不到兄弟模块 | 父工程没 install | 先在父工程跑 `mvn clean install` |
| `mvn -v` 显示 Java 版本不对 | JAVA_HOME 指错 | 修 JAVA_HOME，不是改 Path |

---

# 第九章：面试问答全收录

**Q1：Maven 是什么？解决什么问题？**
依赖管理（坐标声明+自动下载+传递依赖）+ 项目构建（统一生命周期：编译/测试/打包/部署），约定优于配置统一了项目结构。

**Q2：Maven 生命周期？**
三套独立生命周期：clean / default / site。default 主线：validate→compile→test→package→verify→install→deploy。执行某阶段会自动执行该生命周期内它之前的所有阶段。每个阶段绑定插件 goal 干活。

**Q3：package 和 install 区别？**
package 只把包打进 target/；install 额外复制到本地仓库，使别的本地项目能通过坐标依赖它。deploy 再进一步推到远程私服。

**Q4：依赖冲突怎么解决？**
自动规则：最短路径优先 → 同深度先声明优先。手动：exclusions 排除 / 直接声明目标版本 / dependencyManagement 统一锁版本。排查：dependency:tree、Maven Helper。

**Q5：scope 有哪几种？**
compile（默认，全程）/ provided（编译测试有，运行容器提供，如 servlet-api、lombok）/ runtime（运行才需要，如数据库驱动）/ test（仅测试，如 JUnit）/ system、import（了解）。

**Q6：dependencyManagement 作用？**
只做版本管理不引入依赖；子模块引用可省略 version。BOM（如 spring-boot-dependencies）通过 scope=import 导入，一键锁定整套生态版本——这是 Spring Boot 不用写版本号的原理。

**Q7：多模块项目怎么组织？**
父 POM（packaging=pom）用 modules 聚合子模块，子模块用 parent 继承父 POM 共享依赖版本与配置。上层依赖下层（web→service→dao→common），禁循环依赖。

**Q8：SNAPSHOT 和 release 区别？**
SNAPSHOT 是不稳定开发版，可重复覆盖发布，Maven 每次可拉新；release 是稳定版，发布后不可变。

**Q9：Maven 仓库查找顺序？**
本地仓库 → 镜像/私服 → 中央仓库。找到即停，并缓存到本地。

**Q10：为什么 Spring Boot 的依赖不用写版本？**
项目继承 spring-boot-starter-parent → 它 import 了 spring-boot-dependencies BOM → BOM 用 dependencyManagement 锁定了全部经官方兼容性测试的依赖版本。要覆盖某个版本，在 properties 里写对应版本属性即可（如 `<mysql.version>8.0.33</mysql.version>`）。

---

# 第十章：动手清单（学完自检）

- [ ] 装好 Maven，配好 settings.xml（本地仓库位置 + 阿里镜像 + JDK 版本），`mvn -v` 验证
- [ ] 从零手写一个 pom，引入 mysql-connector + fastjson2 + junit5，写个类连一次本地 MySQL
- [ ] 跑通 `mvn clean compile test package install`，观察 target/ 和本地仓库新增内容
- [ ] `mvn dependency:tree` 看 spring-boot-starter-web（或任意 starter）带出了什么
- [ ] 故意制造一次依赖冲突，用 Maven Helper 找到并用 exclusions 解决
- [ ] 搭一个两模块项目（common + app），app 依赖 common，父工程 install 后跑通
- [ ] 看一次 `mvn help:effective-pom`，理解"你写的 pom 只是冰山一角"

全部过完，直接开 Spring Boot——你会发现 starter、parent、自动配置全都建立在今天这套东西之上，水到渠成。
