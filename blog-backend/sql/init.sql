-- 创建数据库
CREATE DATABASE IF NOT EXISTS blog_db
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE blog_db;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '账号',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL COMMENT '标题',
    content TEXT NOT NULL COMMENT '内容',
    category VARCHAR(50) DEFAULT '未分类' COMMENT '分类',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入演示数据
INSERT IGNORE INTO articles (title, content, category, created_at) VALUES
('Vue3 入门指南', 'Vue3 是前端开发中非常流行的框架，本文将带你快速上手...\n\n## 1. 创建项目\n```bash\nnpm create vue@latest\n```\n\n## 2. 组合式 API\nVue3 引入了 Composition API，让代码组织更灵活。', '前端', '2026-04-20 10:00:00'),
('Python Flask 搭建博客后端', 'Flask 是一个轻量级的 Python Web 框架，非常适合快速开发...\n\n## 安装\n```bash\npip install flask\n```\n\n## 快速开始\n```python\nfrom flask import Flask\napp = Flask(__name__)\n```', '后端', '2026-04-18 14:30:00'),
('MySQL 数据库设计基础', '数据库设计是后端开发的核心技能之一...\n\n## 三大范式\n1. 第一范式：原子性\n2. 第二范式：非主属性完全依赖主键\n3. 第三范式：消除传递依赖', '数据库', '2026-04-15 09:00:00');
