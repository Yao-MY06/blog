import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    # SQLite 数据库路径
    SQLITE_DB_PATH = os.path.join(BASE_DIR, 'blog.db')

    # JWT 密钥
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-key-change-in-production')

    # 管理员账号密码（首次运行会自动创建）
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '123456')
