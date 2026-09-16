---
title: "TypeScript 技术手册（概念详解版）"
published: 2026-09-16
description: "TypeScript 类型系统与核心概念详解。"
tags: ["TypeScript","前端"]
category: "教程"
draft: false
lang: 'zh_CN'
---

> 面向初学者的 TypeScript 学习手册。
> 每个概念都包含三部分：**【是什么】（解释）、【作用与意义】（为什么需要它）、代码示例**。
> 建议边读边动手敲代码，配合官方文档（typescriptlang.org）使用。

---

## 目录

1. [TypeScript 是什么](#1-typescript-是什么)
2. [环境搭建与编译](#2-环境搭建与编译)
3. [基础类型](#3-基础类型)
4. [类型注解与类型推断](#4-类型注解与类型推断)
5. [函数](#5-函数)
6. [接口（Interface）](#6-接口interface)
7. [类型别名（type）](#7-类型别名type)
8. [类（Class）](#8-类class)
9. [数组与元组](#9-数组与元组)
10. [联合类型与交叉类型](#10-联合类型与交叉类型)
11. [类型收窄（Narrowing）](#11-类型收窄narrowing)
12. [泛型（Generics）](#12-泛型generics)
13. [枚举（Enum）](#13-枚举enum)
14. [内置工具类型](#14-内置工具类型)
15. [模块与导入导出](#15-模块与导入导出)
16. [类型声明文件（.d.ts）](#16-类型声明文件dts)
17. [tsconfig.json 常用配置](#17-tsconfigjson-常用配置)
18. [实战常用技巧与最佳实践](#18-实战常用技巧与最佳实践)
19. [学习路线建议](#19-学习路线建议)

---

## 1. TypeScript 是什么

**【是什么】**
TypeScript（简称 TS）是微软开发的编程语言，是 JavaScript 的"超集"——所有合法的 JS 代码都是合法的 TS 代码，TS 在 JS 之上增加了**静态类型系统**。TS 不能直接运行，必须先**编译成 JS**，再由浏览器或 Node.js 执行。

**【作用与意义】**
JavaScript 是动态类型语言：变量的类型在运行时才确定，写错了也只有运行时才会报错（甚至不报错，悄悄产生 bug）。项目一大，这种"不确定"就是灾难。TypeScript 的意义在于：

| 作用 | 具体意义 |
| --- | --- |
| 提前发现错误 | 类型错误在**写代码/编译时**就报出来，而不是上线后才崩溃 |
| 编辑器智能提示 | VS Code 能精确自动补全、跳转定义、安全重命名，写代码更快 |
| 代码即文档 | 看类型就知道函数要什么参数、返回什么，不用猜 |
| 安全重构 | 改了某个类型，编译器立刻列出所有受影响的地方，敢改代码 |
| 团队协作 | 类型就是接口约定，别人的代码不用读实现也敢调用 |

一句话：**TypeScript 用"写代码时多写一点类型"，换"运行时少出很多 bug"。**

---

## 2. 环境搭建与编译

**【是什么】**
`tsc` 是 TypeScript 的官方编译器，负责把 `.ts` 文件翻译成 `.js` 文件并做类型检查。

**【作用与意义】**
浏览器和 Node.js 只认识 JavaScript，所以 TS 必须有"编译"这一步。理解编译流程，你才知道 TS 的类型只在开发阶段存在，运行时会被完全擦除（这叫**类型擦除**——类型不改变程序运行行为，只是开发时的"脚手架"）。

```bash
npm install -g typescript   # 安装编译器
tsc --version               # 查看版本
tsc hello.ts                # 编译单个文件，生成 hello.js
tsc --init                  # 生成 tsconfig.json 配置文件
```

**快速运行（跳过手动编译，学习阶段推荐）：**

```bash
npm install -g tsx
tsx hello.ts   # 直接运行 TS 文件
```

---

## 3. 基础类型

### 3.1 原始类型

**【是什么】**
与 JavaScript 完全对应的几种最基本的数据类型。

**【作用与意义】**
给变量"定性"：一旦声明为 `string`，就不能再赋数字。这样"把数字当字符串拼接""对 undefined 调方法"这类低级错误在编译期就被拦住。这是整个类型系统的地基。

```typescript
let name: string = "小明";        // 字符串：文本数据
let age: number = 18;             // 数字：TS 不区分整数和小数
let isStudent: boolean = true;    // 布尔：真/假
let nothing: null = null;         // null：明确的"空值"
let notDefined: undefined = undefined; // undefined："还没赋值"
let big: bigint = 100n;           // 大整数：超出 number 安全范围时用
let sym: symbol = Symbol("id");   // symbol：创建唯一标识
```

### 3.2 any —— "放弃检查"类型

**【是什么】**
`any` 表示"任意类型"，赋值什么都可以，对它做任何操作都不报错。

**【作用与意义】**
它存在的意义是**兼容存量 JS 代码**，让迁移可以渐进进行。但它的代价是关闭类型检查——`any` 会像病毒一样传染：任何接触过 `any` 的值都会失去类型保护。**新手最常见的错误就是到处写 any，等于白用 TypeScript。**

```typescript
let anything: any = 1;
anything = "字符串";   // 不报错
anything.foo.bar;      // 也不报错 —— 但运行时会崩溃！
```

### 3.3 unknown —— 安全的"我不知道"

**【是什么】**
`unknown` 也表示"什么都能装"，但在使用之前**必须先判断（收窄）类型**。

**【作用与意义】**
它是 `any` 的安全替代品，用于"我确实不知道类型"的场景（比如解析后端返回的 JSON）。它强迫你写检查代码，把不确定性显式暴露出来，而不是假装它不存在。

```typescript
let value: unknown = "hello";
// value.toUpperCase();            // 报错：unknown 不能直接用
if (typeof value === "string") {
  value.toUpperCase();            // 判断之后就可以了
}
```

### 3.4 void —— "没有返回值"

**【是什么】**
标注函数不返回任何有意义的值。

**【作用与意义】**
明确告诉调用者："这个函数是拿来做事情的（打印、发请求），不是拿来取结果的。"防止有人误写 `const result = log(...)` 并依赖这个结果。

```typescript
function log(msg: string): void {
  console.log(msg);
}
```

### 3.5 never —— "永远不会发生"

**【是什么】**
表示根本不可能出现的值，比如抛异常的函数、死循环函数的返回类型。

**【作用与意义】**
它最大的实战价值是**穷尽性检查**：当 switch 覆盖了所有情况，default 分支里的值应该是 `never`；如果哪天加了新情况忘了处理，编译器立刻报错。这是写"健壮的联合类型处理代码"的关键工具。

```typescript
function throwError(msg: string): never {
  throw new Error(msg);
}
```

### 3.6 字面量类型

**【是什么】**
类型本身是一个具体的值，如 `"up"`、`8080`，变量只能取这个字面量。

**【作用与意义】**
把"取值范围有限"这个业务规则写进类型里。比如方向只有上下左右、请求方法只有 GET/POST——拼错一个字母编译器就报错，杜绝"魔法字符串"出错。

```typescript
let direction: "up" | "down" | "left" | "right";
direction = "up";       // 正确
// direction = "north"; // 报错：不在允许范围内
```

---

## 4. 类型注解与类型推断

**【是什么】**
- **类型注解**：你手动写 `: number` 告诉编译器类型。
- **类型推断**：你不写，编译器根据初始值自己推出来。

**【作用与意义】**
推断的存在是为了**减少噪音**——能推出来的就不必手写，让代码保持简洁。理解"什么时候该写注解"是写优雅 TS 的关键：

- ✅ 建议写：函数参数（推断不了）、公共函数的返回值（当作文档和契约）
- ❌ 不必写：有初始值的普通变量

```typescript
let count: number = 10;     // 显式注解
let message = "hello";      // 推断为 string，不必写
// message = 123;           // 报错：推断的保护依然生效

// const 断言：把类型收窄到最精确的字面量
const config = { mode: "dev" } as const;
// config.mode 的类型是 "dev" 而不是宽泛的 string
```

`as const` 的意义：默认情况下对象属性的类型会被放宽（`"dev"` 被当成 `string`），`as const` 告诉编译器"这个值不会变，请按最精确的类型记住它"——配合后端约定字段、状态机非常好用。

---

## 5. 函数

### 5.1 参数与返回值类型

**【是什么】**
给函数的输入（参数）和输出（返回值）分别标注类型。

**【作用与意义】**
函数是代码之间互相调用的"接口"。标注后：**调用方**不用读函数体就知道怎么调用；**实现方**写错了返回值类型会被立刻发现。函数类型签名就是一份自动检查的文档。

```typescript
function add(a: number, b: number): number {
  return a + b;
}
```

### 5.2 可选参数（?）

**【是什么】**
参数名后加 `?`，表示这个参数可以传也可以不传。

**【作用与意义】**
现实中很多参数是"锦上添花"的（如问候语、配置项）。没有可选参数，调用方就得被迫传 `undefined` 或一个占位值。它让函数签名精确表达"这个参数可有可无"。

```typescript
function greet(name: string, greeting?: string): string {
  return `${greeting ?? "你好"}, ${name}`;
}
```

### 5.3 默认参数

**【是什么】**
在参数里直接写 `= 默认值`，调用方不传时自动使用默认值。

**【作用与意义】**
把"兜底逻辑"写在函数签名里，而不是函数体开头写一堆 `if (x === undefined)`。签名即文档，一眼看出"不传会怎样"。

```typescript
function createUser(name: string, age: number = 18) {
  return { name, age };
}
```

### 5.4 剩余参数（...）

**【是什么】**
`...nums` 把数量不定的实参收集成一个数组。

**【作用与意义】**
解决"参数个数不确定"的问题（求和、拼接任意多个值）。类型标注 `number[]` 保证传进来的每一项都是数字。

```typescript
function sum(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}
```

### 5.5 函数类型

**【是什么】**
把"一个函数长什么样"（参数和返回值的形状）抽象成一个类型，可以赋给变量、当参数传递。

**【作用与意义】**
回调函数、事件处理器、策略模式都需要"把函数当值传来传去"。有了函数类型，传错形状的回调（比如少个参数）在编译时就被发现——回调地狱变成回调天堂。

```typescript
type MathFn = (a: number, b: number) => number;
const divide: MathFn = (a, b) => a / b;
```

### 5.6 函数重载

**【是什么】**
为同一个函数声明多套不同的参数/返回值签名。

**【作用与意义】**
有些函数"传不同类型的参数，返回不同类型的结果"。重载让编译器根据实参类型给出精确的返回类型提示，调用体验更好。日常业务代码用得不多，写工具库时常见。

```typescript
function format(value: string): string;
function format(value: number): string;
function format(value: string | number): string {
  return String(value).trim();
}
```

---

## 6. 接口（Interface）

**【是什么】**
interface 用来描述**对象的形状**：有哪些属性、各是什么类型。它只在编译期存在，运行时被擦除。

**【作用与意义】**
这是 TS 中使用频率最高的概念之一，意义在于**建立契约**：

- 前后端约定：后端返回的用户对象有哪些字段，写成 interface，前端全程有提示
- 团队协作：你写的函数接收 `User` 类型，别人传错对象立刻报错
- 重构安全：给 `User` 加个必填字段，所有构造 User 的地方都会被编译器找出来

```typescript
interface User {
  id: number;
  name: string;
  email?: string;           // ?：可选属性 —— 有些用户没填邮箱
  readonly createdAt: Date; // readonly：只读 —— 创建时间不允许被改
}

const user: User = {
  id: 1,
  name: "小明",
  createdAt: new Date(),
};
// user.createdAt = new Date(); // 报错
```

可选属性（`?`）的意义：表达"这个字段可能存在也可能不存在"，访问时编译器会强制你处理 undefined 的情况。只读属性（`readonly`）的意义：防止不该被修改的数据被意外改写。

### 6.1 接口继承（extends）

**【是什么】**
一个接口可以继承另一个接口，自动获得它的所有属性。

**【作用与意义】**
避免重复定义。现实概念天然有层次（动物 → 狗），继承让类型结构映射业务结构，公共属性只维护一份，改一处全生效。

```typescript
interface Animal { name: string; }
interface Dog extends Animal { breed: string; }
```

### 6.2 接口合并（Declaration Merging）

**【是什么】**
同名的多个 interface 会自动合并成一个。

**【作用与意义】**
主要价值是**给第三方库的类型"打补丁"**：比如给浏览器的 `Window` 对象补充你挂载的全局变量。这是 interface 独有的能力（type 做不到），也是库作者偏爱 interface 的原因。

---

## 7. 类型别名（type）

**【是什么】**
用 `type` 给任意类型起一个名字。

**【作用与意义】**
两个核心价值：一是**复用**——复杂的联合类型写一遍、到处用；二是**表达能力**——`type` 能描述 interface 描述不了的东西：联合类型、交叉类型、元组、函数类型、工具类型的运算结果。

```typescript
type ID = number | string;           // 联合类型：接口做不到
type Point = { x: number; y: number }; // 对象形状：和接口效果相同
```

**interface 和 type 怎么选？**

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| 描述对象结构、需要继承/实现 | interface | 语义清晰，支持合并 |
| 联合/交叉/元组/函数类型 | type | interface 表达不了 |
| 写库、希望用户能扩展类型 | interface | 声明合并 |

---

## 8. 类（Class）

**【是什么】**
类是"创建对象的模板"，把数据（属性）和操作数据的方法封装在一起。TS 在 JS 的 class 基础上增加了**访问修饰符**和**接口实现**。

### 8.1 访问修饰符

**【是什么】**
控制类的成员能被谁访问：`public`（公开，默认）、`private`（仅类内部）、`protected`（类内部和子类）。

**【作用与意义】**
这是**封装**的工具：把内部实现细节藏起来，只暴露必要的接口。好处是——类的使用者不会误碰内部状态，类的维护者可以放心改内部实现而不影响外部。比如"密码"字段就应该是 private，不允许外部直接读改。

```typescript
class Person {
  public name: string;        // 谁都能访问
  private age: number;        // 只有类内部能用
  protected id: number;       // 自己和子类能用
  readonly birthYear: number; // 只能读不能改

  constructor(name: string, age: number, id: number) {
    this.name = name;
    this.age = age;
    this.id = id;
    this.birthYear = new Date().getFullYear() - age;
  }
}
```

### 8.2 参数属性简写

**【是什么】**
在构造函数参数前加修饰符，TS 自动声明同名属性并赋值。

**【作用与意义】**
消除样板代码。不用简写的话，每个属性都要"声明一遍、赋值一遍"，又长又容易漏。

```typescript
class User {
  constructor(
    public name: string,
    private password: string,
  ) {} // 自动拥有 name、password 两个属性
}
```

### 8.3 抽象类（abstract）

**【是什么】**
不能被直接实例化的类，可以包含"只有签名没有实现"的抽象方法，强制子类去实现。

**【作用与意义】**
表达"这是一类事物的共同骨架，但具体细节必须由子类补全"。比如所有形状都有面积，但圆和方的算法不同——抽象类既提供公共逻辑，又用编译器强制每个子类实现 `area()`，**防止子类忘记实现关键方法**。

```typescript
abstract class Shape {
  abstract area(): number;   // 子类必须实现
  describe(): string {       // 公共逻辑，子类直接用
    return `面积是 ${this.area()}`;
  }
}

class Circle extends Shape {
  constructor(private radius: number) { super(); }
  area(): number { return Math.PI * this.radius ** 2; }
}
```

### 8.4 实现接口（implements）

**【是什么】**
类用 `implements` 承诺自己满足某个接口的结构。

**【作用与意义】**
让编译器帮你检查"这个类是不是真的符合约定"。团队协作中，接口是合同，implements 是签字——少实现一个方法，编译立刻报错。

```typescript
interface Serializable { toJSON(): string; }

class Account implements Serializable {
  toJSON(): string { return JSON.stringify(this); }
}
```

---

## 9. 数组与元组

### 9.1 数组类型

**【是什么】**
标注"数组里每个元素是什么类型"。

**【作用与意义】**
JS 数组可以混装任何值，运行时 `.map`、`.filter` 链式调用一旦元素类型杂了很难排查。TS 数组保证元素同构，链式调用全程有提示。

```typescript
let nums: number[] = [1, 2, 3];        // 写法一
let names: Array<string> = ["a", "b"]; // 写法二（等价）

let readonlyNums: readonly number[] = [1, 2, 3];
// readonlyNums.push(4); // 报错：只读数组，防止数据被意外修改
```

### 9.2 元组（Tuple）

**【是什么】**
长度固定、每个位置类型固定的数组，如 `[string, number]`。

**【作用与意义】**
表达"位置有意义"的数据：坐标 `[x, y]`、键值对 `[key, value]`、React 的 `useState` 返回值 `[状态, 设置函数]`。位置错了、类型错了都会报错。

```typescript
let pair: [string, number] = ["age", 18];

// 带标签的元组：可读性更好
type Entry = [key: string, value: number];
```

---

## 10. 联合类型与交叉类型

### 10.1 联合类型（|）

**【是什么】**
`A | B` 表示"是 A 或者是 B 之一"。

**【作用与意义】**
现实数据经常"可能是多种形态"：ID 可能是字符串也可能是数字、接口返回可能是成功数据也可能是错误信息。联合类型让这种不确定性**显式化**，并配合类型收窄强制你分情况处理——不会漏掉任何一种情况。

```typescript
type StringOrNumber = string | number;
function printId(id: string | number) { console.log(id); }
```

### 10.2 交叉类型（&）

**【是什么】**
`A & B` 表示"同时满足 A 和 B"，属性取并集。

**【作用与意义】**
用于**组合**多个类型：把零散的"能力"（有名字、有年龄、可序列化）拼装成完整类型，而不是写一个巨型接口。

```typescript
type Named = { name: string };
type Aged = { age: number };
type PersonType = Named & Aged; // 必须同时有 name 和 age
```

---

## 11. 类型收窄（Narrowing）

**【是什么】**
当变量是联合类型时，通过判断语句把类型从"多种可能"缩小到"确定的一种"，这个过程叫收窄。

**【作用与意义】**
联合类型声明了"可能是多种"，但具体写代码时你需要"此刻到底是哪种"才能调对应的方法。收窄是连接两者的桥梁，也是 TS 保证你**每种情况都正确处理**的机制。

```typescript
function handle(input: string | number) {
  if (typeof input === "string") {
    input.toUpperCase(); // 此分支内 input 确定是 string
  }
}
```

### 11.1 四种常用守卫

| 守卫方式 | 适用场景 | 意义 |
| --- | --- | --- |
| `typeof` | 区分原始类型（string/number/boolean） | 最基础的分支判断 |
| `instanceof` | 区分类的实例 | 面向对象代码的类型判断 |
| `"prop" in obj` | 区分不同形状的对象 | 判断对象有没有某个属性 |
| 可辨识联合 | 多个对象类型有共同的字面量字段（如 `kind`） | **实战最常用**，配合 switch 自动穷尽所有情况 |

```typescript
// 可辨识联合（Discriminated Union）—— 业务代码建模状态的首选
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "square": return s.side ** 2;
    // 以后新增 { kind: "triangle" }，忘记处理时编译器会报错
  }
}
```

可辨识联合的意义：用一个公共字段（`kind`）标记"是哪一种"，编译器就能在 switch 的每个 case 里精确知道形状。加新类型时，所有没处理的 switch 都会报错——**重构的保险丝**。

### 11.2 类型断言（as）

**【是什么】**
`value as Type` 告诉编译器："别猜了，我确定它是这个类型。"

**【作用与意义】**
用于你比编译器掌握更多信息的场景（如 DOM 操作，`getElementById` 只返回通用的 Element，但你知道它是 div）。**注意：断言是"关闭检查"而不是"转换数据"，断言错了运行时照样崩。能不用就不用。**

```typescript
const el = document.getElementById("app") as HTMLDivElement;
```

### 11.3 非空断言（!）

**【是什么】**
`value!.prop` 告诉编译器"这个值一定不是 null/undefined"。

**【作用与意义】**
少数场景下确实能简化代码（如刚检查过但编译器没跟踪到），但它同样是绕过检查。**新手规则：能用 `?.` 就不用 `!`。**

---

## 12. 泛型（Generics）

**【是什么】**
泛型是"类型的参数"：先写一个用占位符 `T` 表示类型的模板，使用时再传入具体类型。

**【作用与意义】**
解决"逻辑相同、类型不同"的复用问题。没有泛型只有两条路：为每种类型写一遍代码（重复），或者用 `any`（丢类型）。泛型让你**一次编写、处处复用、类型还不丢**——`Array<T>`、`Promise<T>`、`useState<T>` 全是泛型。读懂泛型，才能读懂现代 TS 项目和第三方库的类型定义。

### 12.1 泛型函数

```typescript
function identity<T>(value: T): T {
  return value;
}
identity<string>("hello"); // 显式指定 T = string
identity(42);              // 自动推断 T = number
```

意义：传进什么类型，就返回什么类型——类型信息从头到尾不丢失。

### 12.2 泛型接口与类

```typescript
// 后端接口的统一响应格式：code/message 固定，data 的类型各接口不同
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

const res: ApiResponse<User> = {
  code: 0,
  data: { id: 1, name: "小明", createdAt: new Date() },
  message: "ok",
};
```

意义：这是实战最高频的泛型用法——**把"变化的类型"抽成参数**，公共结构只定义一次。

### 12.3 泛型约束（extends）

**【是什么】**
`T extends XXX` 限定 T 必须满足某个条件（具有某些属性）。

**【作用与意义】**
没有约束的泛型，编译器对 T 一无所知，什么方法都不能调。约束让函数内部能安全地使用 T 的特定能力（如 `.length`），同时保持对其他部分的通用性。

```typescript
function logLength<T extends { length: number }>(arg: T): T {
  console.log(arg.length); // 有约束，放心用 length
  return arg;
}
logLength("hello");    // 可以
logLength([1, 2, 3]);  // 可以
// logLength(123);     // 报错：number 没有 length
```

### 12.4 keyof 与索引访问类型

**【是什么】**
- `keyof T`：取 T 的所有属性名，组成联合类型（`"name" | "age"`）
- `T[K]`：取 T 中属性 K 的类型

**【作用与意义】**
让"属性名"也成为类型系统的一部分。写"取对象某个属性"的工具函数时，key 只能是真实存在的属性名——拼错属性名编译期就报错，返回值类型还能自动跟随。

```typescript
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: "小明", age: 18 };
getProp(user, "name");  // 返回类型自动是 string
// getProp(user, "xxx"); // 报错：属性不存在
```

### 12.5 泛型默认值

```typescript
interface Page<T = unknown> { list: T[]; total: number; }
// 不传 T 时默认 unknown，调用方更省事
```

---

## 13. 枚举（Enum）

**【是什么】**
给一组相关的常量命名，如方向、状态。

**【作用与意义】**
消灭"魔法值"：代码里不再出现裸的 `0/1/2` 或 `"ACTIVE"` 字符串，而是 `Status.Active`——可读、可跳转、改值只改一处、拼写错误编译期报错。

```typescript
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}
const s: Status = Status.Active;
```

> **现代替代方案**：enum 编译后会生成额外运行时代码，很多团队改用 `as const` 对象，更轻量、类型推断更好、与 JS 生态更兼容：
>
> ```typescript
> const STATUS = { Active: "ACTIVE", Inactive: "INACTIVE" } as const;
> type Status = (typeof STATUS)[keyof typeof STATUS]; // "ACTIVE" | "INACTIVE"
> ```
>
> 读老项目要认识 enum，写新项目推荐 `as const` 方案。

---

## 14. 内置工具类型

**【是什么】**
TS 官方内置的一批"类型变换函数"：输入一个类型，输出加工后的新类型。

**【作用与意义】**
避免重复定义相似的接口。比如"新增用户"和"编辑用户"的字段几乎一样，只是编辑时全部可选——用 `Partial` 一行搞定，源接口改字段，派生类型自动同步。

```typescript
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}
```

| 工具类型 | 作用 | 典型场景与意义 |
| --- | --- | --- |
| `Partial<T>` | 所有属性变可选 | 更新接口：只传要改的字段 |
| `Required<T>` | 所有属性变必填 | 表单校验通过后，数据不再有可选字段 |
| `Readonly<T>` | 所有属性只读 | 防止配置/状态被意外修改 |
| `Pick<T, K>` | 只挑指定属性 | 列表页只要 id 和 title，不取整个大对象 |
| `Omit<T, K>` | 排除指定属性 | "新增用户"类型 = User 去掉后端生成的 id |
| `Record<K, V>` | 构造键值对类型 | 角色 → 权限列表的映射表 |
| `ReturnType<F>` | 取函数返回类型 | 复用别人函数的类型，不用手写 |
| `Parameters<F>` | 取函数参数类型（元组） | 包装/装饰已有函数时保持签名一致 |
| `Exclude<U, X>` | 联合类型中排除 | 从所有状态里排除"已删除" |
| `Extract<U, X>` | 联合类型中提取 | 只保留可编辑的状态 |
| `NonNullable<T>` | 去掉 null/undefined | 断言数据已加载完成后的类型 |
| `Awaited<T>` | 解包 Promise | 拿到异步函数真正返回的类型 |

```typescript
type DraftTodo = Partial<Todo>;                    // 编辑草稿
type TodoPreview = Pick<Todo, "id" | "title">;     // 列表展示
type NewTodo = Omit<Todo, "id" | "createdAt">;     // 提交新增

function getUser() { return { id: 1, name: "a" }; }
type User = ReturnType<typeof getUser>; // 自动获得返回类型
```

---

## 15. 模块与导入导出

**【是什么】**
用 `export` 暴露文件里的内容，用 `import` 引入其他文件的内容。

**【作用与意义】**
模块化是大型项目的基础：每个文件职责单一、互不污染、按需引用。TS 在 JS 模块之上增加了**类型也能导入导出**的能力，让类型定义可以集中管理、全项目共享。

```typescript
// math.ts
export function add(a: number, b: number): number { return a + b; }
export const PI = 3.14;
export default class Calculator {}

// main.ts
import Calculator, { add, PI } from "./math";
import type { User } from "./models";  // 只导入类型
import * as math from "./math";         // 整体导入
```

`import type` 的意义：明确告诉打包工具"这只是类型，编译后请彻底删除"，避免类型导入被误打包进产物，也避免循环依赖问题。**好习惯：导入纯类型时一律写 `import type`。**

---

## 16. 类型声明文件（.d.ts）

**【是什么】**
只包含类型、不包含实现的文件，用来给 JS 代码（尤其是第三方库）"补充类型说明书"。

**【作用与意义】**
npm 上很多老库是纯 JS 写的，直接用会全部变成 `any`。声明文件让你（或社区）事后给库补上类型，享受完整的类型检查和提示。遇到 `Cannot find module 'xxx'` 报错，多半是缺声明文件。

```typescript
// 给无类型的库补类型
declare module "some-js-lib" {
  export function doSomething(input: string): number;
}

// 声明全局变量（如构建工具注入的版本号）
declare const VERSION: string;
```

类型的两个来源：
1. 库自带 `.d.ts`（package.json 里有 `types` 字段）
2. 社区包：`npm install -D @types/库名`（如 `@types/lodash`、`@types/node`）

---

## 17. tsconfig.json 常用配置

**【是什么】**
TS 项目的总配置文件，告诉编译器：检查哪些文件、按什么规则检查、输出成什么样。

**【作用与意义】**
每个选项都对应一类开发体验或代码质量问题，下表解释"为什么需要它"：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

| 配置 | 作用与意义 |
| --- | --- |
| `target` | 编译出的 JS 版本。定低一点兼容老浏览器，定高一点产物更简洁 |
| `module` / `moduleResolution` | 模块系统和查找方式。Vite 项目用 `ESNext` + `bundler`；Node 项目常用 `CommonJS`/`NodeNext` |
| `strict` | 一键开启全部严格检查。**TS 的价值大半在 strict 里，新项目务必开启** |
| `noImplicitAny` | 禁止"推断不出来就偷偷当 any"。是 strict 的一部分 |
| `strictNullChecks` | null/undefined 不再能赋给任意类型。消灭了最多的线上崩溃，也是 strict 的一部分 |
| `esModuleInterop` | 抹平 CommonJS 和 ESM 的导入差异，import 第三方库不踩坑 |
| `skipLibCheck` | 跳过第三方库声明文件的检查，显著加快编译、屏蔽别人库里的类型错误 |
| `outDir` / `rootDir` | 源码和编译产物分离，项目结构干净 |
| `paths` | 路径别名：`@/utils` 代替 `../../../utils`，重构时不用改一堆相对路径 |

---

## 18. 实战常用技巧与最佳实践

### 18.1 可选链（?.）与空值合并（??）

**【是什么】**
- `a?.b?.c`：链条上任何一环是 null/undefined 就短路返回 undefined，不报错
- `a ?? b`：a 是 null/undefined 时才取 b（`0`、`""` 不会触发）

**【作用与意义】**
处理后端返回的深层嵌套数据时，不用再写 `if (a && a.b && a.b.c)`。注意 `??` 和 `||` 的区别：`||` 会把 `0` 和 `""` 也当假值吞掉，数量、开关类字段必须用 `??`。

```typescript
const name = user?.profile?.name ?? "匿名";
```

### 18.2 异步代码的类型

**【是什么】**
`Promise<T>` 表示"未来会产生一个 T 类型的值"，async 函数的返回类型必须写成 `Promise<T>`。

**【作用与意义】**
`await` 之后的数据类型能一路传递下去，接口返回数据的每个字段都有提示。

```typescript
async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("请求失败");
  return res.json() as Promise<User>;
}
```

### 18.3 React 中的常见写法

```typescript
// 组件 props：调用组件时传错属性立刻报错 —— 组件间的契约
interface ButtonProps {
  label: string;
  onClick?: () => void;
  children?: React.ReactNode;
}
function Button({ label, onClick, children }: ButtonProps) { /* ... */ }

// useState：初值为 null 时必须显式给泛型，否则类型被推成 null
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);

// 事件：每个 DOM 元素有对应的事件类型
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value);
};
```

### 18.4 常见错误速查

| 错误信息 | 含义与解决 |
| --- | --- |
| `Object is possibly 'null'` | 值可能是 null，加 `if` 判断或改用 `?.` |
| `Property 'x' does not exist on type 'Y'` | 类型里没这个属性，检查接口定义或拼写 |
| `Type 'A' is not assignable to type 'B'` | 赋值的类型对不上，检查数据结构 |
| `Cannot find module 'xxx'` | 没装依赖，或缺 `@types/xxx` |

### 18.5 十条最佳实践（每条都附"为什么"）

1. **开 `strict: true`** —— TS 的保护大半来自严格模式，关了等于白用
2. **不写 `any`，用 `unknown` 替代** —— any 关闭检查并传染，unknown 强制你处理
3. **能推断就不手写注解** —— 减少噪音，代码更干净
4. **函数参数和公共 API 返回值显式标注** —— 签名就是文档，保护调用方
5. **对象形状用 interface，组合/联合用 type** —— 各用所长
6. **用可辨识联合建模状态** —— 比一堆可选字段清晰，加状态时编译器帮你找漏
7. **少用 `as` 和 `!`** —— 它们都是"关闭检查"，每次用都问自己：真的确定吗
8. **优先 `readonly` 和 `as const`** —— 不可变数据出 bug 的概率低一个数量级
9. **纯类型用 `import type`** —— 帮助打包工具正确擦除类型，避免循环依赖
10. **复杂报错从下往上读** —— 第一条错误往往才是根源，后面的都是连锁反应

---

## 19. 学习路线建议

```
第 1 周：基础类型、注解与推断、函数、数组、接口
        → 目标：能看懂普通 TS 代码，能写带类型的函数

第 2 周：类、联合/交叉类型、类型收窄、枚举
        → 目标：能读懂中型项目的类型定义

第 3 周：泛型、keyof、工具类型
        → 目标：能看懂库的类型声明，会写简单的泛型工具

第 4 周：tsconfig、声明文件、结合 React/Node 实战
        → 目标：能独立搭建 TS 项目并解决常见类型报错
```

**练习方法**：找一个你写过的 JavaScript 小项目，逐步迁移成 TypeScript——每加一个类型，就想一次"这个类型帮我挡住了什么错误"，这是理解类型意义的最快方式。

---

*手册版本：基于 TypeScript 5.x 编写。*
