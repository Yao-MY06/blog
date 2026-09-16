---
title: "Java 教程总结（最终版）"
published: 2026-09-16
description: "JavaSE 核心知识点全景总结，955 行长文。"
tags: ["Java"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 来源：菜鸟教程 Java 板块（runoob.com/java/）全部 54 个有效页面的完整归纳。
> 覆盖：基础语法 → 面向对象 → 常用类 → 异常 → 集合框架 → IO/序列化 → 多线程 → 泛型/反射/网络/JDBC/邮件。
> 说明：原站「Java 8/9 新特性」两个页面已被官方删除（404）；Applet 已淘汰，仅作了解。

---

# 第一部分：入门与环境

## 1. Java 简介

- Java 由 Sun Microsystems 于 1995 年 5 月推出（James Gosling 主导），后 Sun 被 Oracle 收购。
- 三个体系：**JavaSE**（标准版）、**JavaEE**（企业版）、**JavaME**（微型版）。2005 年后去掉 "2"（J2SE→Java SE）。
- 主要特性（面试常问）：
  - **简单**：语法接近 C/C++，但去掉了指针、操作符重载、多继承；自动内存分配与垃圾回收。
  - **面向对象**：纯 OOP，类单继承、接口多继承，全面支持动态绑定。
  - **分布式**：java.net 提供 URL、Socket 等网络类库；RMI 支持远程调用。
  - **健壮**：强类型、异常处理、自动垃圾收集。
  - **安全**：ClassLoader 命名空间隔离、字节码校验、SecurityManager。
  - **体系结构中立 / 可移植**：.java 编译为字节码 .class，"一次编写，到处运行"（JVM 屏蔽平台差异）。
  - **解释型 + 高性能**：字节码由解释器执行，JIT 编译器使速度接近 C++。
  - **多线程**：Thread 类 / Runnable 接口内置支持，synchronized 同步。
  - **动态**：类可动态加载，支持运行时类型检查（反射的基础）。

## 2. 开发环境配置

- 下载 JDK（Oracle 官网），安装时 JRE 一并安装。
- Windows 环境变量三件套：
  - `JAVA_HOME` = JDK 安装目录（如 `C:\Program Files\Java\jdk1.8.0_91`）
  - `Path` 追加 `%JAVA_HOME%\bin`（Win10 要分条添加）
  - `CLASSPATH` = `.;%JAVA_HOME%\lib\dt.jar;%JAVA_HOME%\lib\tools.jar;`（**JDK 1.5+ 其实可以不设**）
- 验证：`java -version`、`java`、`javac` 三个命令有输出即成功。
- 常用 IDE：IntelliJ IDEA（主流推荐）、Eclipse、VS Code。

## 3. 第一个程序与编译运行

```java
public class HelloWorld {          // 文件名必须与 public 类名一致：HelloWorld.java
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
```

```bash
javac HelloWorld.java   # 编译：.java → .class 字节码
java HelloWorld         # 运行：java 后面跟类名，不要加 .class
```

- `String args[]` 和 `String[] args` 都合法，推荐后者。
- 源程序（.java）→ javac 编译 → 字节码（.class）→ JVM 解释/JIT 执行，这是 Java 跨平台的本质。

## 4. 基础语法规则

- **标识符**：字母、`$`、`_` 开头，后面可跟数字；大小写敏感；不能用关键字。
- **类名**：大驼峰（MyClass）；**方法/变量名**：小驼峰（myMethod）。
- **源文件名**必须与 public 类名完全一致；一个文件最多一个 public 类。
- **注释**三种：
  - 单行 `//`
  - 多行 `/* ... */`
  - 文档注释 `/** ... */`：可被 javadoc 提取生成 HTML 文档，常用标签 `@author`、`@version`、`@param`、`@return`、`@throws`、`@see`。
- 关键字约 50 个（class、public、static、final、abstract、synchronized、volatile、transient、instanceof、native、strictfp 等），**true/false/null 不是关键字**，是字面量。
- 枚举、数组、继承、接口都可在源文件中声明；空行/空格不影响编译。

## 5. 变量命名约定（规范）

| 元素 | 规则 | 示例 |
|---|---|---|
| 局部变量 / 实例变量 / 参数 | 小驼峰、见名知意 | `myLocalVariable` |
| 静态变量 | 小驼峰；常量用全大写蛇形 | `MAX_SIZE` |
| 常量 | `final` + 全大写下划线 | `public static final double PI = 3.14;` |
| 类名 | 大驼峰 | `MyClass` |
| 包名 | 全小写 | `com.example.util` |

---

# 第二部分：数据类型、变量、运算符、流程控制

## 6. 基本数据类型（8 种，重点背）

| 类型 | 位数 | 范围 | 默认值 | 备注 |
|---|---|---|---|---|
| byte | 8 | -128 ~ 127 | 0 | 大数组省空间 |
| short | 16 | -32768 ~ 32767 | 0 | |
| **int** | 32 | ±21 亿 | 0 | 整数字面量默认类型 |
| long | 64 | ±2^63 | 0L | 后缀用 **L**（小写 l 易与 1 混） |
| float | 32 | IEEE 754 单精度 | 0.0f | 后缀 **f**；不能表示精确金额 |
| **double** | 64 | IEEE 754 双精度 | 0.0d | 浮点默认类型；金额用 BigDecimal |
| boolean | 1 位 | true/false | false | |
| char | 16 | \u0000 ~ \uffff | | Unicode 字符 |

- **引用类型**：类、接口、数组，默认值为 null。
- **常量**：`final double PI = 3.14;` 声明后不可修改。
- **自动类型转换**（小→大，自动）：byte→short→int→long→float→double；char→int。
- **强制类型转换**（大→小，可能丢失精度）：`int i = (int) 123.45;`
- 隐含强制转换陷阱：`byte b = 1; b = b + 1;` 编译报错（b+1 提升为 int），要 `b = (byte)(b+1);` 或 `b += 1;`（复合赋值自带强转）。

## 7. 变量类型（按作用域分三种）

```java
public class Demo {
    static int classVar;        // 类变量（静态变量）：属于类，static 修饰，方法区共享
    int instanceVar;            // 实例变量：属于对象，堆中，随对象创建/销毁
    public void method() {
        int localVar = 0;       // 局部变量：方法/代码块内，必须显式初始化才能用
    }
}
```

- 局部变量**没有默认值**，不初始化直接用会编译错误；实例变量和类变量有默认值（数值 0、boolean false、引用 null）。
- 类变量可用 `类名.变量` 直接访问；实例变量必须通过对象访问。

## 8. 运算符

- **算术**：`+ - * / % ++ --`
  - 前缀 `++a` 先加后用；后缀 `a++` 先用后加（笔试常考）。
- **关系**：`== != > < >= <=`，返回 boolean。
- **位运算**：`& | ^ ~ << >> >>>`
  - `>>>` 无符号右移（高位补 0）；`>>` 带符号右移（高位补符号位）。
- **逻辑**：`&& || !`（短路：&& 前为 false、|| 前为 true 时后面不执行）。
- **赋值**：`= += -= *= /= %= &= |= ^= <<= >>= >>>=`
- **三目**：`条件 ? 值1 : 值2`
- **instanceof**：`obj instanceof String` 判断对象类型（多态章节常用）。

## 9. 条件语句

```java
if (x < 20) { ... } else if (x < 30) { ... } else { ... }
```

**switch case** 规则：
- 变量类型支持：byte、short、int、char；**JDK 7 起支持 String**；还支持枚举。
- case 后必须是常量/字面量，类型与变量一致。
- 匹配后从该 case 顺序执行，**直到 break 才跳出**；不写 break 会"穿透"到下一个 case（可故意利用）。
- `default` 处理无匹配情况，可不放 break。

## 10. 循环结构

```java
while (条件) { ... }              // 先判断后执行，可能一次不执行
do { ... } while (条件);          // 先执行后判断，至少执行一次
for (初始化; 条件; 更新) { ... }   // 次数明确时首选
for (int x : numbers) { ... }     // Java 5 增强 for（foreach），遍历数组/集合
```

- `break`：跳出整个循环；`continue`：跳过本次进入下一次。
- 增强 for 遍历的是**副本**，不能通过它修改数组元素本身。

## 11. 数组

```java
int[] arr = new int[10];            // 声明+创建（推荐 dataType[] 风格，别用 C 风格 dataType arr[]）
int[] arr2 = {1, 2, 3};             // 静态初始化
arr.length;                         // 数组长度（属性，不是方法！String 是 length() 方法）
```

- 索引从 0 到 length-1，越界抛 `ArrayIndexOutOfBoundsException`。
- 数组创建后元素自动初始化为默认值（0 / false / null）。
- 多维数组：`int[][] a = new int[2][3];`（本质是数组的数组，每行长度可以不同）。
- **Arrays 工具类**（java.util.Arrays）高频方法：
  - `Arrays.sort(arr)` 排序
  - `Arrays.binarySearch(arr, key)` 二分查找（**必须先排序**）
  - `Arrays.toString(arr)` 打印
  - `Arrays.equals(a, b)` 比较
  - `Arrays.fill(arr, val)` 填充
  - `Arrays.copyOf(arr, newLen)` 拷贝

## 12. 方法（Method）

```java
修饰符 返回值类型 方法名(参数类型 参数名) {
    方法体
    return 返回值;
}
```

- **方法签名** = 方法名 + 参数列表（不含返回值）。
- **值传递**：Java 只有值传递。基本类型传值副本；引用类型传**引用的副本**（方法内改对象内容会影响外部，但重新 new 一个赋给形参不影响外部）。
- **方法重载 Overload**：同类中同名方法，参数列表不同（个数/类型/顺序），与返回值无关。
- **可变参数**：`void print(int... nums)`，相当于数组，**必须放在参数列表最后**，一个方法只能有一个。
- **命令行参数**：`java Demo a b c` → main 的 args 接收。
- **变量作用域**：成员变量全类可见；局部变量只在声明它的块内可见；for 循环里声明的变量循环外不可见。
- **finalize()**：GC 回收对象前调用（已过时，JDK 9 起标记废弃，了解即可）。

## 13. Scanner 类（控制台输入）

```java
import java.util.Scanner;
Scanner scan = new Scanner(System.in);

String s1 = scan.next();      // 遇空格/回车结束，不读空格
String s2 = scan.nextLine();  // 读整行，遇回车结束
int i = scan.nextInt();       // 还有 nextDouble()、nextBoolean() 等
// 配套判断：hasNext()、hasNextLine()、hasNextInt()...
```

- 经典坑：`nextInt()` 后紧跟 `nextLine()` 会读到上一个回车残留的换行，需多调一次 `nextLine()` 消化。

---

# 第三部分：面向对象（OOP 核心）

## 14. 对象和类

- **类**：模板/蓝图，描述状态（成员变量）和行为（方法）；**对象**：类的实例。
- 创建对象三步：声明 → 实例化（new）→ 初始化（构造方法）。
  ```java
  Puppy myPuppy = new Puppy("tommy");
  ```
- 成员变量 vs 局部变量：成员变量有默认值、全类可见；局部变量必须初始化、块内可见。
- 一个源文件可多个类，但 public 类只能一个且与文件名一致。
- OOP 四大特性：**封装、继承、多态、抽象**。

## 15. 构造方法

特点（每条都是考点）：
- 与类名完全相同（含大小写）；**没有返回类型**（连 void 都不写）。
- `new` 时自动调用，不能像普通方法一样直接调用。
- 支持重载（多个参数列表不同的构造方法）。
- **不写任何构造方法时，编译器自动提供无参默认构造；一旦自己写了任何一个，默认的就不再提供**。
- 构造方法不能被继承，但子类可用 `super(...)` 调用父类构造（必须在第一行）。
- `this(...)` 调用本类其他构造方法（也必须在第一行）。

```java
public class Person {
    String name;
    public Person() {}                          // 无参构造
    public Person(String name) { this.name = name; }  // 有参构造，this 区分成员与参数
}
```

## 16. 封装（Encapsulation）

- 含义：隐藏实现细节，通过受控接口访问，改实现不影响调用方。
- 优点：减少耦合、内部结构可自由改、对成员精确控制、隐藏信息。
- 实现两步：
  1. 属性私有化 `private String name;`
  2. 提供公共 getter/setter
  ```java
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  ```
- getter/setter 里可加校验逻辑（如年龄不能为负），这就是"精确控制"。

## 17. 继承（Inheritance）

- `class 子类 extends 父类 { }`，is-a 关系（狗 is an Animal）。
- **Java 只支持单继承**（一个类只能 extends 一个父类），但支持多层继承（A→B→C）和接口多实现。
- 特性：
  - 子类拥有父类非 private 的成员；private 成员继承但不可直接访问。
  - 提高代码复用，是多态的前提。
  - Java 所有类默认继承 `java.lang.Object`（不写 extends 也继承）。
- **super 与 this**：
  - `this`：当前对象引用；`super`：父类引用。
  - `super.成员` 访问父类成员（解决同名遮蔽）；`super()` 调父类构造（第一行）。
- **继承中的构造器**：子类构造方法默认第一行隐式调用 `super()`（父类无参构造）。父类只有有参构造时，子类必须显式 `super(参数)`，否则编译错误。
- **final 关键字**：final 类不能被继承；final 方法不能被重写；final 变量是常量。

## 18. 重写（Override）与重载（Overload）——面试必考

| | 重写 Override | 重载 Overload |
|---|---|---|
| 位置 | 父子类之间 | 同一个类内 |
| 方法名 | 相同 | 相同 |
| 参数列表 | **必须相同** | **必须不同** |
| 返回值 | 相同或是其子类（协变返回） | 无关 |
| 访问权限 | 不能更严格（只能放宽） | 无关 |
| 异常 | 不能抛更宽泛的检查异常 | 无关 |
| 本质 | 运行时多态（动态绑定） | 编译时多态（静态绑定） |

```java
class Animal { public void move() { System.out.println("动物移动"); } }
class Dog extends Animal {
    @Override                       // 注解帮助编译器检查，建议加
    public void move() { System.out.println("狗跑"); }   // 重写
}
```
- 规则：外壳不变，核心重写；父类 final/static/private 方法不能重写。
- 重写方法不能抛出比父类更宽泛的**检查异常**（可抛相同或其子类异常，运行时异常随意）。

## 19. 多态（Polymorphism）

- 定义：同一行为在不同对象上有不同表现。**同一接口，不同实现**。
- 存在三必要条件（背）：
  1. **继承**（或实现接口）
  2. **重写**
  3. **父类引用指向子类对象**：`Parent p = new Child();`
- 调用规则（重点）：
  - 成员方法：编译看左边，**运行看右边**（实际执行子类重写的方法）。
  - 成员变量：编译运行都看左边（变量没有多态，就近取父类的）。
- 优点：消除耦合、可替换、可扩充、灵活。集合 `List<String> list = new ArrayList<>();` 就是多态的日常用法。
- 向下转型需强转：`Dog d = (Dog) p;`，转错抛 `ClassCastException`，安全做法先 `p instanceof Dog` 判断。

## 20. 抽象类（abstract class）

```java
public abstract class Employee {
    private String name;
    public abstract double computePay();   // 抽象方法：只有声明没有方法体
    public void print() { ... }            // 普通方法也可以有
}
```

- 不能实例化（`new Employee()` 报错），必须被继承使用。
- 有抽象方法的类**必须**声明为抽象类；抽象类可以没有抽象方法。
- 可以有成员变量、构造方法、普通方法——这点和接口不同。
- 一个类只能继承一个抽象类；子类必须实现所有抽象方法，否则子类也得是抽象类。
- 抽象方法不能用 private/static/final 修饰。

## 21. 接口（interface）

```java
public interface Animal {
    int LEGS = 4;                  // 隐式 public static final
    void eat();                    // 隐式 public abstract
}
class Dog implements Animal {
    public void eat() { ... }      // 实现时必须 public
}
```

- 接口不是类：不能实例化、没有构造方法。
- 接口方法隐式 `public abstract`；变量隐式 `public static final`。
- **接口支持多继承**：`interface C extends A, B {}`；一个类可实现多个接口：`class D implements A, B {}`。
- 版本演进（重要）：
  - **JDK 8**：接口可以有 `default` 默认方法（带方法体）和 `static` 静态方法。
  - **JDK 9**：接口可以有 `private` 方法（给 default 方法复用代码）。
- 接口 vs 抽象类（高频对比）：
  - 抽象类可有普通成员变量/构造方法/静态代码块；接口变量只能是 public static final 常量。
  - 单继承抽象类，多实现接口。
  - 抽象类表达 is-a（是什么），接口表达 has-a 能力/契约（能做什么）。
- 标记接口：没有任何方法的接口（如 Serializable），仅作类型标记。

## 22. 包（package）

- 作用：组织类、避免命名冲突、限定访问权限（包私有）、便于查找。
- 声明必须在源文件**第一行**：`package com.example.util;`；目录结构必须匹配 `com/example/util/`。
- 不带 package 声明的类在"无名包"中。
- `import` 导入：`import java.util.ArrayList;` 或通配 `import java.util.*;`；同包和 java.lang 不用导。
- 常见包：`java.lang`（基础，自动导入）、`java.util`（集合/工具）、`java.io`（IO）、`java.net`（网络）、`java.sql`（数据库）。

## 23. Object 类（万类之父）

所有类都直接或间接继承 Object，核心方法（每个类都可用/可重写）：

| 方法 | 作用 |
|---|---|
| `String toString()` | 对象字符串表示，建议重写（打印对象默认是 类名@哈希码） |
| `boolean equals(Object obj)` | 比较相等，**默认比较引用（==）**，要按内容比较需重写（String/Integer 已重写） |
| `int hashCode()` | 哈希值；**equals 相等 ⇒ hashCode 必须相等**，重写 equals 必须同时重写 hashCode |
| `Class<?> getClass()` | 获取运行时类对象（反射入口），不可重写 |
| `protected Object clone()` | 浅拷贝，需实现 Cloneable 接口，否则抛 CloneNotSupportedException |
| `void wait() / notify() / notifyAll()` | 线程协作，必须在 synchronized 块中调用 |
| `protected void finalize()` | GC 回收前调用（已废弃，了解） |

- `==` vs `equals()`（必考）：基本类型 `==` 比值；引用类型 `==` 比地址，`equals` 默认也比地址，String 等重写了 equals 比内容。

## 24. 枚举（enum）

```java
enum Color { RED, GREEN, BLUE; }

Color c = Color.RED;
switch (c) { case RED: ... }        // switch 支持枚举
```

- 枚举是特殊的类，每个常量都是该类的**实例**，构造方法默认 private，不能被 new。
- 常用方法：`values()`（全部常量数组）、`valueOf("RED")`（按名取）、`name()`、`ordinal()`（序号从 0 开始）。
- 枚举可实现接口、可定义成员变量和构造方法（带参枚举）：
  ```java
  enum Size { SMALL("S"), LARGE("L");
      private String abbr;
      Size(String abbr) { this.abbr = abbr; }
  }
  ```
- 枚举天然线程安全，是实现**单例模式**的最佳方式之一。

---

# 第四部分：常用类库

## 25. String 类（重中之重）

```java
String s1 = "Runoob";              // 字面量：进字符串常量池
String s2 = "Runoob";              // 复用池里同一对象，s1 == s2 为 true
String s3 = new String("Runoob");  // new：堆上新对象，s1 == s3 为 false
```

- **String 不可变（immutable）**：每次"修改"都生成新对象，原对象不变。
- 常用方法（按考频排序）：
  - `length()` 长度
  - `charAt(i)` 取字符
  - `equals() / equalsIgnoreCase()` 内容比较
  - `contains(s)` 是否包含
  - `indexOf(s) / lastIndexOf(s)` 位置（找不到返回 -1）
  - `substring(begin, end)` 截取（左闭右开）
  - `replace(old, new) / replaceAll(正则, new)`
  - `split(正则)` 分割成数组
  - `trim()` 去两端空白（JDK 11 有更强的 `strip()`）
  - `toUpperCase() / toLowerCase()`
  - `startsWith() / endsWith()`
  - `String.valueOf(x)` 转字符串
  - `String.format("%s-%d", ...)` 格式化
  - JDK 11+：`isBlank()`、`repeat(n)`、`lines()`
- 拼接：`+` 或 `concat()`；循环里大量拼接**不要**用 `+`（产生大量临时对象），用 StringBuilder。

## 26. StringBuffer 与 StringBuilder

| | String | StringBuffer | StringBuilder |
|---|---|---|---|
| 可变性 | 不可变 | 可变 | 可变 |
| 线程安全 | — | **安全（synchronized）** | **不安全** |
| 速度 | 慢（改一次建一个） | 较慢 | **最快** |

- 结论：**单线程用 StringBuilder，多线程用 StringBuffer，少量拼接用 String**。
- 常用方法：`append()`、`insert(位置, 值)`、`delete(start, end)`、`deleteCharAt(i)`、`reverse()`、`setCharAt()`、`toString()`。

## 27. Number & Math 类

- 每个基本类型有对应包装类：Byte、Short、Integer、Long、Float、Double、Boolean、Character，都是抽象类 **Number** 的子类（Boolean/Character 除外）。
- **装箱**：基本类型 → 包装对象（自动：`Integer x = 5;`）；**拆箱**：包装对象 → 基本类型（自动：`int y = x;`）。
- 经典坑：**Integer 缓存 -128~127**，范围内 `Integer a=127, b=127; a==b` 为 true，超出为 false（比内容用 equals）。
- 常用转换：`Integer.parseInt("123")`、`Integer.valueOf()`、`intValue()`、`toString()`。
- **Math 类**（全静态方法）：`abs()`、`max()/min()`、`pow(a,b)`、`sqrt()`、`random()`（[0,1) 随机数）、`round()` 四舍五入、`ceil()` 向上、`floor()` 向下。

## 28. Character 类

- char 的包装类：`Character ch = 'a';`（自动装箱）。
- 常用静态方法（判字符类型）：
  - `isLetter(ch)` 是否字母、`isDigit(ch)` 是否数字
  - `isWhitespace(ch)` 是否空白
  - `isUpperCase(ch) / isLowerCase(ch)`
  - `toUpperCase(ch) / toLowerCase(ch)`
  - `toString(ch)`

## 29. 日期时间（新旧两套，新代码只用新 API）

| 类别 | 类 | 线程安全 | 评价 |
|---|---|---|---|
| 传统 | Date、Calendar、GregorianCalendar | 否、可变 | 设计缺陷多，遗留代码才见 |
| **Java 8 新 API** | LocalDate、LocalTime、LocalDateTime、ZonedDateTime | **是、不可变** | **推荐，java.time 包** |

**新 API（java.time）日常用法**：
```java
LocalDate date = LocalDate.now();                    // 2026-07-18
LocalDateTime dt = LocalDateTime.now();              // 日期+时间
LocalDate d2 = LocalDate.of(2026, 7, 18);            // 指定日期
date.plusDays(7);                                    // 加减（返回新对象，不可变）
ChronoUnit.DAYS.between(date1, date2);               // 两个日期间隔天数
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
String s = dt.format(fmt);                           // 格式化
LocalDateTime parsed = LocalDateTime.parse(str, fmt); // 解析
```

**旧 API（看懂遗留代码即可）**：
- `new Date()` 当前时间；`getTime()` 毫秒时间戳。
- `SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");` → `sdf.format(date)` / `sdf.parse(str)`；**线程不安全**。
- 日期比较：`getTime()` 比毫秒、`before()/after()/equals()`、`compareTo()`。
- Calendar：`Calendar.getInstance()` 获取，字段用 `Calendar.YEAR / MONTH / DAY_OF_MONTH`，`set()` / `get()` / `add()`。
- 休眠：`Thread.sleep(1000);`（毫秒）；测耗时：`System.currentTimeMillis()` 前后相减。

## 30. 正则表达式

- 包：`java.util.regex`，三个类：**Pattern**（编译后的模式）、**Matcher**（匹配引擎）、**PatternSyntaxException**（语法错误异常）。
- 元字符速查：`.` 任意字符、`\d` 数字、`\D` 非数字、`\s` 空白、`\S` 非空白、`\w` 单词字符[a-zA-Z0-9_]、`\W` 非单词、`^` 开头、`$` 结尾、`[]` 字符集、`*` 0次+、`+` 1次+、`?` 0或1次、`{n}` n次、`{n,m}` n~m次、`|` 或、`()` 分组。
- 两种用法：
  ```java
  // 1. 一次性匹配：Pattern.matches(正则, 字符串) → boolean
  boolean b = Pattern.matches("^\\d+(\\.\\d+)?$", "12.34");

  // 2. 查找/提取：compile + matcher
  Pattern p = Pattern.compile(".*runoob.*");
  Matcher m = p.matcher(content);
  m.matches();        // 整体匹配
  m.find();           // 找下一个匹配子串
  m.group();          // 取匹配到的内容；m.group(1) 取第一个分组
  m.replaceAll("替换"); // 全部替换
  ```
- String 类自带正则方法：`matches()`、`replaceAll()`、`split()`。
- Java 字符串里写正则，反斜杠要双写：`"\\d"` 表示 \d。

## 31. 常用类库全景（第三方库一览）

标准库核心：java.util（集合）、java.time（日期）、java.io/java.nio（IO）、java.net（网络）、java.util.concurrent（并发）、java.util.regex（正则）。

第三方常用（后端开发会接触）：
- JSON：**Jackson**（Spring 默认）、**Gson**、**Fastjson**（阿里，注意老版本漏洞）
- 工具集：**Apache Commons**（Lang/IO/Collections）、**Guava**（Google）、**Hutool**（国产全家桶）
- HTTP：OkHttp、Apache HttpClient
- 日志：SLF4J + Logback / Log4j2
- 测试：JUnit、Mockito
- 选库标准：功能匹配、社区活跃、性能、学习成本、维护状态；版本优先 LTS。

---

# 第五部分：异常处理

## 32. 异常体系

```
Throwable
├── Error（错误：JVM 级问题，程序管不了，如 OutOfMemoryError、StackOverflowError）
└── Exception
    ├── IOException 等（检查性异常 checked：编译器强制处理）
    └── RuntimeException（运行时异常 unchecked：不强制处理）
        ├── NullPointerException（空指针）
        ├── ArrayIndexOutOfBoundsException（数组越界）
        ├── ArithmeticException（如除零）
        ├── ClassCastException（类型转换失败）
        ├── NumberFormatException（字符串转数字失败）
        └── IllegalArgumentException（非法参数）
```

- **检查性异常**（如 IOException、SQLException、ClassNotFoundException）：必须 try-catch 或 throws 声明，否则编译不过。
- **运行时异常**：程序逻辑错误引起，可处理可不处理。
- **Error ≠ Exception**：Error 是严重故障（内存溢出等），程序一般不捕获。

## 33. 处理语法（五个关键字）

```java
try {
    // 可能抛异常的代码
} catch (NullPointerException e) {      // 可多个 catch，子类异常要写前面
    e.printStackTrace();                 // 打印堆栈
    e.getMessage();                      // 异常信息
} catch (IOException | SQLException e) { // JDK 7 多异常合并捕获
    ...
} finally {
    // 无论是否异常都执行（除非 System.exit()），通常用来释放资源
}
```

- `throw`：手动抛出异常对象 `throw new NullPointerException("手动抛的");`
- `throws`：方法声明上声明可能抛的异常，甩给调用者处理：
  ```java
  public void readFile() throws IOException { ... }
  ```
- 子类重写方法时，**不能抛出比父类更宽泛的检查异常**。

## 34. try-with-resources（JDK 7，自动关流，强烈推荐）

```java
try (BufferedReader br = new BufferedReader(new FileReader("a.txt"))) {
    return br.readLine();
}   // 自动调用 close()，不用写 finally
```
- 括号里可声明多个资源（分号隔开），只要实现了 AutoCloseable 接口即可。

## 35. 自定义异常

```java
public class InsufficientFundsException extends Exception {   // 检查性异常
    private double amount;
    public InsufficientFundsException(double amount) { this.amount = amount; }
    public double getAmount() { return amount; }
}
// 继承 RuntimeException 则是运行时异常，不强制处理
```

最佳实践：异常不是流程控制工具；catch 别留空；优先具体异常而非 catch(Exception)；资源用 try-with-resources；自定义异常要带上下文信息。

---

# 第六部分：集合框架（面试第一高频区）

## 36. 框架总览

```
java.util 集合框架
├── Collection（存单个元素）
│   ├── List（有序、可重复、有索引）
│   │   ├── ArrayList（动态数组）
│   │   ├── LinkedList（双向链表，兼可当队列/栈）
│   │   └── Vector（遗留，线程安全，已弃用）
│   ├── Set（不重复）
│   │   ├── HashSet（无序）
│   │   ├── LinkedHashSet（保持插入序）
│   │   └── TreeSet（红黑树，自动排序）
│   └── Queue（队列 FIFO）
│       ├── LinkedList
│       ├── PriorityQueue（优先队列/堆）
│       └── ArrayDeque（双端队列，可当栈）
└── Map（存键值对，不是 Collection 子接口）
    ├── HashMap（无序，允许一个 null 键）
    ├── LinkedHashMap（保持插入序）
    ├── TreeMap（按键排序，红黑树）
    ├── Hashtable（遗留，线程安全，弃用）
    └── ConcurrentHashMap（线程安全，并发场景用）
```

- 框架三部分：**接口**（List/Set/Map 定义行为）+ **实现类**（ArrayList 等）+ **算法**（Collections 工具类的 sort、shuffle、binarySearch 等）。
- Set 和 List 的区别：Set 不重复、无序；List 可重复、有序（插入序）、可按索引访问。

## 37. ArrayList

```java
import java.util.ArrayList;
ArrayList<String> list = new ArrayList<>();   // 泛型只能是引用类型
list.add("A");                                // 尾部添加
list.add(1, "B");                             // 指定位置插入
list.get(0);                                  // 按下标取
list.set(0, "C");                             // 修改
list.remove(0);                               // 按下标删 / remove("A") 按元素删
list.contains("A");
list.size();
list.isEmpty();
list.clear();
list.indexOf("A");
Collections.sort(list);                       // 排序
```
- 底层动态数组：查改 O(1)，中间增删 O(n)；默认容量 10，满了自动扩容约 1.5 倍。
- 遍历：增强 for、for-i、迭代器、forEach。**遍历中删除必须用迭代器的 remove()**，否则可能抛 ConcurrentModificationException。

## 38. LinkedList

- 底层双向链表；同时实现 List、Queue、Deque 接口 → 可当列表、队列、双端队列、栈用。
- 比 ArrayList 多出头尾操作方法：
  - `addFirst() / addLast()`、`getFirst() / getLast()`、`removeFirst() / removeLast()`
  - `offer() / poll() / peek()`（队列式，失败返回 null/false 而不是抛异常）
  - `push() / pop()`（栈式）
- 选型：**查多改少 → ArrayList；头尾频繁增删/当队列栈 → LinkedList**（实践中 90% 用 ArrayList）。

## 39. HashSet

```java
HashSet<String> set = new HashSet<>();
set.add("A");          // 重复元素添加无效，add 返回 false
set.contains("A");
set.remove("A");
set.size();
```
- 底层基于 HashMap（元素存在 map 的 key 里，value 是个固定占位对象）。
- 不重复、无序、允许一个 null、线程不安全。
- 去重原理：先比 hashCode，再比 equals → **自定义对象入 HashSet 必须重写 equals + hashCode**。

## 40. HashMap（必考中的必考）

```java
HashMap<Integer, String> map = new HashMap<>();
map.put(1, "Google");                 // 添加/覆盖（key 已存在则覆盖旧值）
map.get(1);                           // 取值，key 不存在返回 null
map.getOrDefault(2, "默认");          // 防 null 神器
map.remove(1);
map.containsKey(1);  map.containsValue("Google");
map.size();  map.isEmpty();  map.clear();

// 三种遍历
for (Integer key : map.keySet()) { ... }
for (String val : map.values()) { ... }
for (Map.Entry<Integer, String> e : map.entrySet()) {   // 推荐，效率最高
    e.getKey(); e.getValue();
}
```
- 特性：无序、最多一个 null 键（value 可多个 null）、线程不安全。
- 底层（JDK 8）：数组 + 链表 + 红黑树。默认容量 16、负载因子 0.75，链表长度 ≥8 且数组 ≥64 时转红黑树。
- 要线程安全：用 `ConcurrentHashMap`（不要用 Hashtable，也不要 Collections.synchronizedMap，并发性能差）。
- 要顺序：`LinkedHashMap`（插入序/访问序）或 `TreeMap`（键排序）。

## 41. Iterator 迭代器

```java
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    String s = it.next();
    if (条件) it.remove();      // 遍历中安全删除的唯一正确姿势
}
```
- 三个核心方法：`hasNext()`、`next()`、`remove()`。
- 遍历 Map：先 `map.entrySet().iterator()`。
- **遍历集合的同时直接调用集合的 add/remove 会抛 ConcurrentModificationException**（fail-fast 机制）。

## 42. 数据结构一页速查（承接上一轮的总结）

```
查改快 → ArrayList        增删快 → LinkedList
去重   → HashSet(无序) / TreeSet(排序) / LinkedHashSet(插入序)
键值对 → HashMap(无序) / TreeMap(键排序) / LinkedHashMap(插入序)
LIFO 栈 → ArrayDeque      FIFO 队列 → LinkedList/ArrayDeque
Top-K  → PriorityQueue（最小堆默认；最大堆传 Collections.reverseOrder()）
树     → 自定义 TreeNode  图 → 自定义（邻接表 Map<V, List<V>>）
```

遗留类对照（遇到老代码认识即可，新代码别用）：
- Vector → ArrayList；Stack → ArrayDeque；Hashtable/Dictionary → HashMap/ConcurrentHashMap；Enumeration → Iterator。
- **Properties**（Hashtable 子类，键值都是 String）仍活跃在配置文件读写场景：`load()` 读 .properties 文件、`getProperty()`、`setProperty()`。
- **BitSet**：位集合，存大量布尔值省内存，布隆过滤器思想的基础。

---

# 第七部分：IO、文件与序列化

## 43. 流（Stream）、文件（File）和 IO

**流的分类**（先记这个框架，类名就不会乱）：
- 按方向：输入流（Input/Reader）/ 输出流（Output/Writer）。
- 按单位：**字节流**（InputStream/OutputStream，处理一切数据含二进制）/ **字符流**（Reader/Writer，处理文本，带编码）。

| | 字节输入 | 字节输出 | 字符输入 | 字符输出 |
|---|---|---|---|---|
| 抽象基类 | InputStream | OutputStream | Reader | Writer |
| 文件 | FileInputStream | FileOutputStream | FileReader | FileWriter |
| 缓冲 | BufferedInputStream | BufferedOutputStream | BufferedReader | BufferedWriter |
| 桥接 | InputStreamReader（字节→字符） | OutputStreamWriter | | |

- 控制台输入老写法：`new BufferedReader(new InputStreamReader(System.in))` → `read()` 读单字符 / `readLine()` 读一行。
- 控制台输出：`System.out.print / println / printf`。
- 读写文件经典写法：
  ```java
  // 字符流读
  try (BufferedReader br = new BufferedReader(new FileReader("a.txt"))) {
      String line;
      while ((line = br.readLine()) != null) { ... }
  }
  // 字节流写
  try (FileOutputStream fos = new FileOutputStream("b.txt")) {
      fos.write("内容".getBytes());
  }
  ```
- **File 类**（文件/目录本身的操作，不负责读写内容）：
  - `exists()`、`isFile()`、`isDirectory()`、`getName()`、`getPath()`、`length()`
  - `mkdir()` 建单层目录 / `mkdirs()` 建多层、`delete()`、`list()` / `listFiles()` 列目录
  - 目录操作：创建 `new File("/tmp/a").mkdirs()`；遍历 `list()`；删除要求目录为空。
- 流用完整关/flush：字符流有缓冲区，**不关可能丢数据**；用 try-with-resources 最稳。

## 44. NIO Files 类（现代文件操作，推荐）

`java.nio.file.Files` 全是静态方法，配合 `Path`（用 `Paths.get("a.txt")` 获取）：

```java
Path path = Paths.get("a.txt");
List<String> lines = Files.readAllLines(path);                 // 读所有行
byte[] bytes = Files.readAllBytes(path);
Files.write(path, content.getBytes());                         // 写（覆盖）
Files.write(path, content.getBytes(), StandardOpenOption.APPEND); // 追加
Files.copy(src, dst, StandardCopyOption.REPLACE_EXISTING);     // 复制
Files.move(src, dst);                                          // 移动/重命名
Files.delete(path);                                            // 删除（不存在抛异常）
Files.deleteIfExists(path);
Files.exists(path);  Files.createFile(path);  Files.createDirectories(path);
Files.size(path);  Files.getLastModifiedTime(path);
Files.list(dir);   Files.walk(dir);                            // 遍历（Stream）
```
- 小文件一把梭用 Files；大文件/精细控制还是用传统流。

## 45. 序列化（Serialization）

- 含义：对象 → 字节流（可存盘/网络传输），反序列化则还原。
- 让类可序列化：实现 `java.io.Serializable` 接口（**标记接口，无任何方法**）。
- 必加版本号：`private static final long serialVersionUID = 1L;`（不加时类结构变了反序列化会炸）。
- **transient 修饰的字段不参与序列化**；static 字段也不序列化（属于类不属于对象）。
- 写法：
  ```java
  // 序列化
  try (ObjectOutputStream out = new ObjectOutputStream(new FileOutputStream("obj.ser"))) {
      out.writeObject(obj);
  }
  // 反序列化
  try (ObjectInputStream in = new ObjectInputStream(new FileInputStream("obj.ser"))) {
      MyClass obj = (MyClass) in.readObject();
  }
  ```
- 注意：对象引用的其他对象也必须可序列化（整个对象图）；实际工程更多用 JSON（Jackson）做跨语言传输。

---

# 第八部分：多线程

## 46. 基础概念与生命周期

- **进程**：OS 分配内存的独立单位，含一个或多个线程；**线程**：进程内的单一控制流，开销更小。
- 进程在所有**非守护线程**结束后才结束。
- 线程生命周期五态（必背）：
  1. **新建 New**：new Thread() 之后。
  2. **就绪 Runnable**：调用 start() 后，等待 CPU 调度。
  3. **运行 Running**：获得 CPU，执行 run()。
  4. **阻塞 Blocked**：三种——等待阻塞（wait()）、同步阻塞（抢 synchronized 锁失败）、其他阻塞（sleep()/join()/IO）。
  5. **死亡 Dead**：run() 执行完或异常终止。
- 优先级：1~10（MIN_PRIORITY~MAX_PRIORITY），默认 5（NORM_PRIORITY）；只影响调度倾向，**不保证执行顺序**。

## 47. 创建线程三种方式（必考对比）

```java
// 1. 继承 Thread 类
class MyThread extends Thread {
    public void run() { ... }
}
new MyThread().start();

// 2. 实现 Runnable 接口（推荐）
class MyRunnable implements Runnable {
    public void run() { ... }
}
new Thread(new MyRunnable()).start();
// Lambda 简写：new Thread(() -> { ... }).start();

// 3. Callable + Future（能返回值、能抛异常）
Callable<Integer> task = () -> { return 42; };
FutureTask<Integer> ft = new FutureTask<>(task);
new Thread(ft).start();
Integer result = ft.get();   // get() 会阻塞等结果
```

| 方式 | 优点 | 缺点 |
|---|---|---|
| 继承 Thread | 简单，this 即线程 | **Java 单继承限制**，类不能再继承别的 |
| 实现 Runnable | 解耦任务与线程，可多线程共享同一任务对象 | 无返回值 |
| Callable+Future | **有返回值、可抛异常** | 写法稍复杂 |

- 关键区分：**start() 启动新线程执行 run()；直接调 run() 只是普通方法调用，不开线程**。
- Thread 常用方法：`start()`、`run()`、`sleep(ms)`（静态，当前线程休眠）、`join()`（等该线程结束）、`setDaemon(true)`（守护线程）、`isAlive()`、`currentThread()`、`getName()`、`setPriority()`、`interrupt()`。
- 对象锁方法（Object 上）：`wait() / notify() / notifyAll()`，**必须在 synchronized 块内**调用。
- 线程同步：`synchronized` 修饰方法或代码块（锁对象）；并发集合（ConcurrentHashMap）；线程池用 `Executors` 工厂类创建（FixedThreadPool / CachedThreadPool / SingleThreadExecutor，工程上更推荐手动 new ThreadPoolExecutor 控制参数）。

---

# 第九部分：进阶特性

## 48. 泛型（Generics，JDK 5）

- 本质：参数化类型，编译期类型安全检查，避免强制转换。
- **泛型方法**：类型参数声明放在返回值前：
  ```java
  public static <E> void printArray(E[] inputArray) {
      for (E element : inputArray) System.out.println(element);
  }
  ```
- **泛型类**：
  ```java
  public class Box<T> {
      private T t;
      public void add(T t) { this.t = t; }
      public T get() { return t; }
  }
  Box<Integer> box = new Box<>();
  ```
- 类型通配符：
  - `List<?>`：未知类型。
  - `<? extends Number>`：上界，Number 及其子类（适合读取，PECS 之 Producer Extends）。
  - `<? super Integer>`：下界，Integer 及其父类（适合写入，Consumer Super）。
- 泛型标记符惯例：**E**（元素）**T**（类型）**K**（键）**V**（值）**N**（数值）**?**（不确定）。
- 限制：类型参数只能是**引用类型**（int 用 Integer）；**运行时泛型擦除**（泛型信息编译后去掉）。

## 49. 反射（Reflection）

- 能力：运行时查询、访问、修改类的信息；Spring 依赖注入、注解处理的底层基石。
- 核心 API：`java.lang.Class`、`java.lang.reflect.Field / Method / Constructor`。
- 获取 Class 对象三种方式：
  ```java
  Class<?> c1 = String.class;
  Class<?> c2 = str.getClass();
  Class<?> c3 = Class.forName("java.lang.String");   // 最常用（JDBC 加载驱动就是它）
  ```
- 典型操作：
  ```java
  // 创建对象
  Object obj = clazz.getDeclaredConstructor().newInstance();
  // 访问字段（私有要 setAccessible(true)）
  Field f = clazz.getDeclaredField("name");
  f.setAccessible(true);
  Object val = f.get(obj);   f.set(obj, "新值");
  // 调用方法
  Method m = clazz.getMethod("greet", String.class);
  m.invoke(obj, "World");
  // 构造器
  Constructor<?> cons = clazz.getConstructor(String.class, int.class);
  Object o = cons.newInstance("John", 30);
  // 父类与接口
  clazz.getSuperclass();  clazz.getInterfaces();
  ```
- `getMethod()` 只拿 public（含继承的）；`getDeclaredMethod()` 拿本类所有声明的（含私有）。
- 代价：性能比直接调用慢、破坏封装；框架层用，业务代码少用。

## 50. 网络编程（Socket）

- java.net 包支持两种协议：
  - **TCP**：面向连接、可靠、字节流（Socket / ServerSocket）。
  - **UDP**：无连接、不可靠、数据报（DatagramSocket / DatagramPacket，可能丢包乱序）。
- TCP 通信流程（背这个时序）：
  1. 服务器 `new ServerSocket(port)` 监听端口。
  2. 服务器 `accept()` 阻塞等待客户端连接。
  3. 客户端 `new Socket("服务器IP", port)` 发起连接。
  4. 连接建立，服务器 accept() 返回一个新的 Socket 与该客户端通信。
  5. 双方通过 socket 的输入/输出流读写（`getInputStream() / getOutputStream()`）。
- 要点：一个客户端一个 Socket，服务端通常**每接入一个客户端就开一个线程**处理；端口范围 0~65535，1024 以下要权限；URL 处理用 URL / URLConnection 类。

## 51. JDBC 连接 MySQL

```java
// MySQL 8.0+ 驱动类名和连接串（8.0 与 5.x 不同，注意！）
Class.forName("com.mysql.cj.jdbc.Driver");
Connection conn = DriverManager.getConnection(
    "jdbc:mysql://localhost:3306/test_demo?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC",
    "root", "password");
```
- MySQL 8.0+ 三个注意点：驱动类改为 `com.mysql.cj.jdbc.Driver`（旧的是 com.mysql.jdbc.Driver）、不建 SSL 要显式 `useSSL=false`、必须设 `serverTimezone`。
- 操作流程六步（JDBC 标准套路）：
  1. 加载驱动（Class.forName）
  2. 获取连接（DriverManager.getConnection）
  3. 创建 Statement / **PreparedStatement**（防 SQL 注入，用 ? 占位）
  4. 执行 SQL：`executeQuery()` 查询返回 ResultSet / `executeUpdate()` 增删改返回影响行数
  5. 遍历结果：`while (rs.next()) { rs.getString("name"); }`
  6. 关闭资源（ResultSet → Statement → Connection，用 try-with-resources）
- 工程现实：实际项目不裸写 JDBC，用 **MyBatis / JPA / Spring Data**；但面试会问底层流程。

## 52. 发送邮件（JavaMail）

- 依赖：JavaMail API（mail.jar）+ JAF（activation.jar）加入 CLASSPATH（Maven 项目则加 javax.mail 依赖）。
- 核心类：`Session`（会话，配 SMTP 属性）、`MimeMessage`（邮件内容）、`Transport.send()`（发送）。
- 流程：Properties 配 `mail.smtp.host` → 获取 Session → 构造 MimeMessage（setFrom / addRecipient / setSubject / setText）→ Transport.send()。
- 用第三方 SMTP（如 QQ 邮箱）要开启 SMTP 服务拿**授权码**，并配 `mail.smtp.auth=true`；Spring Boot 项目直接用 spring-boot-starter-mail 更省事。

---

# 第十部分：过时内容与补充说明

## 53. 已淘汰/只需了解的内容

- **Applet**：浏览器内嵌 Java 小程序，生命周期 init → start → stop → destroy（+paint）。浏览器早已全面停止支持，**了解概念即可，不用学**。Applet 没有 main()，嵌入 HTML 运行，沙箱安全机制。
- **Vector / Stack / Hashtable / Dictionary / Enumeration**：Java 2 之前的遗留类，已被集合框架取代（Vector→ArrayList、Stack→ArrayDeque、Hashtable→ConcurrentHashMap、Dictionary→Map、Enumeration→Iterator）。**Properties 例外**（读配置文件还在用）。
- **Date / Calendar / SimpleDateFormat**：被 java.time 取代，遗留代码要能看懂。
- **finalize()**：JDK 9 起废弃，资源释放用 try-with-resources。
- 原站「Java 8 新特性」「Java 9 新特性」页面已删除（404）。Java 8 的关键新特性（Lambda、Stream API、Optional、接口默认方法、新日期时间）本教程只在零散章节涉及，**建议另补这块——它是现在 Java 面试的绝对重点**。

## 54. Java 实例库说明

原站附带约百个分类小实例（环境设置、字符串、数组、集合、异常、线程、正则、日期等主题，如字符串反转/分割、数组排序查找、文件读写），适合入门期跟着敲。入口：runoob.com/java/java-examples.html。

---

# 附录：面试速查清单（从 54 页中提炼）

**必背概念**
1. Java 跨平台原理：源码 → 字节码 → JVM（一次编译到处运行）。
2. 八大基本类型及位数；float/double 不能精确表示金额（用 BigDecimal）。
3. == vs equals；Integer 缓存 -128~127。
4. String 不可变；String vs StringBuilder vs StringBuffer（可变性、线程安全、速度）。
5. 重载 vs 重写对比表；多态三条件；成员变量不参与多态。
6. 抽象类 vs 接口对比表；JDK8 接口默认方法/静态方法。
7. final / finally / finalize 的区别（final 修饰符；finally 异常块；finalize 是 GC 方法）。
8. 异常体系：Error vs Exception；checked vs unchecked；throw vs throws。
9. HashMap 底层（数组+链表+红黑树）、HashSet 去重原理（hashCode+equals）。
10. ArrayList vs LinkedList；HashMap vs Hashtable vs ConcurrentHashMap。
11. 线程五态；创建线程三方式对比；start() 与 run() 区别；sleep vs wait。
12. 泛型通配符上界/下界（PECS）；类型擦除。
13. 反射获取 Class 三方式；Class.forName 的应用场景。
14. JDBC 六步流程；PreparedStatement 防注入。
15. TCP vs UDP；Socket 通信时序。

**Java 8+ 需另补**（原教程缺失）：Lambda 表达式、Stream API（filter/map/collect）、Optional、函数式接口、方法引用——后端面试必考，建议直接看对应专题。

---

*整理自菜鸟教程 Java 板块全部有效页面（54/56，2 页已 404），2026-07。*
