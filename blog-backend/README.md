# 博客后端（Flask + SQLite）

个人博客系统的后端部分，基于 Python Flask 框架开发，使用 SQLite 数据库存储数据，无需额外安装数据库。

## 技术栈

| 技术 | 版本 | 说明 |
|:---|:---|:---|
| Python | 3.10+ | 编程语言 |
| Flask | 3.0+ | Web 框架 |
| Flask-CORS | 4.0+ | 跨域支持 |
| Flask-JWT-Extended | 4.6+ | JWT 登录认证 |
| Werkzeug | 3.1+ | 密码哈希 |
| SQLite | - | 内置数据库，免安装 |

## 项目结构

```
blog-backend/
├── app.py              # Flask 主应用（6 个接口）
├── models.py           # 数据库模型（SQLite 建表 + 连接）
├── config.py           # 配置文件
├── requirements.txt    # Python 依赖
├── blog.db             # SQLite 数据库文件（自动生成）
└── sql/
    └── init.sql        # 建表 SQL（参考用）
```

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 启动服务

```bash
python app.py
```

服务运行在 `http://localhost:5001`

首次启动会自动创建数据库文件 `blog.db` 并插入 3 篇演示文章。

## API 接口

### 公开接口（无需登录）

| 方法 | 路径 | 功能 | 参数 |
|:---|:---|:---|:---|
| GET | `/api/articles` | 获取文章列表 | - |
| GET | `/api/articles/<id>` | 获取文章详情 | 路径参数 `id` |
| POST | `/api/login` | 管理员登录 | `username`, `password` |

### 需登录接口（Header 带 `Authorization: Bearer <token>`）

| 方法 | 路径 | 功能 | 参数 |
|:---|:---|:---|:---|
| POST | `/api/articles` | 新建文章 | `title`, `content`, `category` |
| PUT | `/api/articles/<id>` | 编辑文章 | `title`, `content`, `category` |
| DELETE | `/api/articles/<id>` | 删除文章 | 路径参数 `id` |

### 登录示例

```bash
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

返回：

```json
{
  "code": 200,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "admin"
}
```

## 配置说明

修改 `config.py` 可调整以下配置：

| 配置项 | 默认值 | 说明 |
|:---|:---|:---|
| `SQLITE_DB_PATH` | `blog.db` | 数据库文件路径 |
| `JWT_SECRET_KEY` | 随机字符串 | JWT 加密密钥 |
| `ADMIN_USERNAME` | `admin` | 管理员账号 |
| `ADMIN_PASSWORD` | `123456` | 管理员密码 |

**注意**：首次登录时，如果数据库中没有该用户，会自动创建管理员账号。

## 数据库

使用 SQLite，数据存储在本地 `blog.db` 文件中。

- 两张表：`users`（用户表）、`articles`（文章表）
- 如需重置数据，直接删除 `blog.db` 文件，重启服务即可自动重建

## 常见问题

**端口被占用？**

修改 `app.py` 最后一行：

```python
app.run(host='0.0.0.0', port=5001, debug=True)
```

同时记得修改前端 `vite.config.js` 里的代理地址。

**跨域问题？**

已内置 `Flask-CORS` 处理，前端默认无需额外配置。
