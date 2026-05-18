import sqlite3
import os
from config import Config


def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(Config.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def dict_factory(cursor, row):
    """将查询结果转为字典"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def get_db_connection_dict():
    """获取返回字典的数据库连接"""
    conn = sqlite3.connect(Config.SQLITE_DB_PATH)
    conn.row_factory = dict_factory
    return conn


def init_db():
    """初始化数据库（建表 + 插入演示数据）"""
    conn = sqlite3.connect(Config.SQLITE_DB_PATH)
    try:
        cursor = conn.cursor()

        # 用户表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 文章表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT '未分类',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 检查是否已有演示数据
        cursor.execute("SELECT COUNT(*) FROM articles")
        if cursor.fetchone()[0] == 0:
            demo_articles = [
                (
                    'Vue3 入门指南',
                    'Vue3 是前端开发中非常流行的框架，本文将带你快速上手...\n\n## 1. 创建项目\n```bash\nnpm create vue@latest\n```\n\n## 2. 组合式 API\nVue3 引入了 Composition API，让代码组织更灵活。',
                    '前端',
                    '2026-04-20 10:00:00'
                ),
                (
                    'Python Flask 搭建博客后端',
                    'Flask 是一个轻量级的 Python Web 框架，非常适合快速开发...\n\n## 安装\n```bash\npip install flask\n```\n\n## 快速开始\n```python\nfrom flask import Flask\napp = Flask(__name__)\n```',
                    '后端',
                    '2026-04-18 14:30:00'
                ),
                (
                    'MySQL 数据库设计基础',
                    '数据库设计是后端开发的核心技能之一...\n\n## 三大范式\n1. 第一范式：原子性\n2. 第二范式：非主属性完全依赖主键\n3. 第三范式：消除传递依赖',
                    '数据库',
                    '2026-04-15 09:00:00'
                )
            ]
            cursor.executemany(
                "INSERT INTO articles (title, content, category, created_at) VALUES (?, ?, ?, ?)",
                demo_articles
            )

        conn.commit()
    finally:
        conn.close()
