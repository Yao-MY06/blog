# 博客前端（Vue3 + Vite + Element Plus）

个人博客系统的前端部分，基于 Vue3 组合式 API 开发，使用 Element Plus 组件库快速构建界面。

## 技术栈

| 技术 | 版本 | 说明 |
|:---|:---|:---|
| Vue | 3.4+ | 前端框架 |
| Vite | 5.0+ | 构建工具 |
| Vue Router | 4.2+ | 路由管理 |
| Element Plus | 2.5+ | UI 组件库 |
| Axios | 1.6+ | HTTP 请求 |

## 项目结构

```
src/
├── components/
│   └── NavBar.vue          # 顶部导航栏
├── router/
│   └── index.js            # 路由配置
├── utils/
│   └── request.js          # Axios 封装（自动带 Token）
├── views/
│   ├── Home.vue            # 首页（文章列表）
│   ├── ArticleDetail.vue   # 文章详情页
│   ├── About.vue           # 关于我
│   └── Admin.vue           # 登录 + 后台管理
├── App.vue                 # 根组件
└── main.js                 # 入口文件
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发启动

```bash
npm run dev
```

默认运行在 `http://localhost:3000`

### 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

## 页面说明

| 页面 | 路径 | 功能 |
|:---|:---|:---|
| 首页 | `/` | 展示所有博客文章卡片列表 |
| 文章详情 | `/article/:id` | 查看单篇文章全文 |
| 关于我 | `/about` | 个人简介、技术栈、联系方式 |
| 后台管理 | `/admin` | 登录 + 文章增删改查 |

## 代理配置

开发时，前端接口请求会自动代理到后端：

```js
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:5001',  // 后端地址
    changeOrigin: true
  }
}
```

如果后端端口变了，修改 `vite.config.js` 里的 `target` 即可。

## 演示数据

当后端服务未启动时，页面会自动显示演示数据，方便独立开发和预览界面效果。
