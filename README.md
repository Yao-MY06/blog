# 个人博客系统

一个前后端分离的个人博客项目，支持文章展示、后台管理、JWT 登录认证等功能。

- **前端**：Vue 3 + Vite + Element Plus
- **后端**：Python Flask + SQLite
- **数据库**：SQLite（零配置，开箱即用）

---

## 项目结构

```
blog/
├── blog-backend/          # 后端（Flask）
│   ├── app.py             # 主应用入口
│   ├── models.py          # 数据库模型
│   ├── config.py          # 配置文件
│   ├── requirements.txt   # Python 依赖
│   ├── blog.db            # SQLite 数据库
│   └── sql/init.sql       # 建表 SQL
│
└── blog-frontend/         # 前端（Vue3）
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── components/    # 公共组件
        ├── router/        # 路由配置
        ├── utils/         # 工具函数
        ├── views/         # 页面视图
        ├── App.vue
        └── main.js
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|:---|:---|:---|
| 前端框架 | Vue 3 | 组合式 API |
| 构建工具 | Vite 5 | 极速开发体验 |
| UI 组件 | Element Plus 2.5 | 桌面端组件库 |
| 路由 | Vue Router 4 | 单页路由 |
| HTTP 请求 | Axios | 封装自动带 Token |
| 后端框架 | Flask 3 | Python Web 框架 |
| 认证 | Flask-JWT-Extended | JWT Token 登录 |
| 跨域 | Flask-CORS | 前后端联调 |
| 数据库 | SQLite | 内置数据库，免安装 |

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/Yao-MY06/blog.git
cd blog
```

### 2. 启动后端

```bash
cd blog-backend
pip install -r requirements.txt
python app.py
```

后端运行在 `http://localhost:5001`

> 首次启动会自动创建 `blog.db` 数据库并插入 3 篇演示文章。

### 3. 启动前端

```bash
cd blog-frontend
npm install
npm run dev
```

前端运行在 `http://localhost:3000`

> 开发环境已配置代理，前端 `/api` 请求会自动转发到后端。

---

## 功能特性

### 访客端
- 浏览博客文章列表
- 查看文章详情
- 关于我页面

### 管理端
- JWT 登录认证
- 发布新文章
- 编辑已有文章
- 删除文章

---

## API 接口

| 方法 | 路径 | 功能 | 认证 |
|:---|:---|:---|:---|
| GET | `/api/articles` | 获取文章列表 | 公开 |
| GET | `/api/articles/<id>` | 获取文章详情 | 公开 |
| POST | `/api/login` | 管理员登录 | 公开 |
| POST | `/api/articles` | 新建文章 | 需登录 |
| PUT | `/api/articles/<id>` | 编辑文章 | 需登录 |
| DELETE | `/api/articles/<id>` | 删除文章 | 需登录 |

---

## 默认账号

| 字段 | 默认值 |
|:---|:---|
| 用户名 | `admin` |
| 密码 | `123456` |

> 首次登录时，如果数据库中无该用户，会自动创建。

---

## 配置说明

### 后端配置（`blog-backend/config.py`）

| 配置项 | 默认值 | 说明 |
|:---|:---|:---|
| `SQLITE_DB_PATH` | `blog.db` | 数据库文件路径 |
| `JWT_SECRET_KEY` | 随机字符串 | JWT 加密密钥 |
| `ADMIN_USERNAME` | `admin` | 管理员账号 |
| `ADMIN_PASSWORD` | `123456` | 管理员密码 |

### 前端代理（`blog-frontend/vite.config.js`）

如果后端端口有变化，修改 `proxy.target` 即可：

```js
proxy: {
  '/api': {
    target: 'http://localhost:5001',
    changeOrigin: true
  }
}
```

---

## 生产部署

### 前端构建

```bash
cd blog-frontend
npm run build
```

构建产物输出到 `blog-frontend/dist/`，可部署到 Nginx / CDN。

### 后端部署

生产环境建议使用 Gunicorn：

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

---

## 注意事项

- 请勿将 `node_modules/` 或 `__pycache__/` 提交到仓库，已配置 `.gitignore`
- 如需重置数据库，直接删除 `blog-backend/blog.db`，重启后端即可
- 生产环境请务必修改 `JWT_SECRET_KEY` 和管理员密码

---

## License

MIT
