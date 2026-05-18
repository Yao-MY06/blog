from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

from config import Config
from models import get_db_connection, get_db_connection_dict, init_db

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

CORS(app)
jwt = JWTManager(app)


@app.route('/api/articles', methods=['GET'])
def get_articles():
    """获取所有文章列表"""
    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, content, category, created_at
            FROM articles ORDER BY created_at DESC
        """)
        articles = cursor.fetchall()
        # 给每篇文章加摘要
        for article in articles:
            content = article['content']
            article['summary'] = content[:120] + '...' if len(content) > 120 else content
        return jsonify({'code': 200, 'data': articles})
    finally:
        conn.close()


@app.route('/api/articles/<int:article_id>', methods=['GET'])
def get_article(article_id):
    """获取单篇文章详情"""
    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, content, category, created_at
            FROM articles WHERE id = ?
        """, (article_id,))
        article = cursor.fetchone()
        if article:
            return jsonify({'code': 200, 'data': article})
        return jsonify({'code': 404, 'message': '文章不存在'}), 404
    finally:
        conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    """登录接口"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'code': 400, 'message': '账号和密码不能为空'}), 400

    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        # 如果是预设管理员且数据库中没有，自动创建
        if not user and username == Config.ADMIN_USERNAME:
            password_hash = generate_password_hash(password)
            cursor.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, password_hash)
            )
            conn.commit()
            user = {'id': cursor.lastrowid, 'username': username}
        elif not user:
            return jsonify({'code': 401, 'message': '账号或密码错误'}), 401
        elif not check_password_hash(user['password_hash'], password):
            return jsonify({'code': 401, 'message': '账号或密码错误'}), 401

        token = create_access_token(identity=str(user['id']))
        return jsonify({
            'code': 200,
            'message': '登录成功',
            'token': token,
            'username': user['username']
        })
    finally:
        conn.close()


@app.route('/api/articles', methods=['POST'])
@jwt_required()
def create_article():
    """新建文章（需登录）"""
    data = request.get_json()
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    category = data.get('category', '未分类').strip()

    if not title or not content:
        return jsonify({'code': 400, 'message': '标题和内容不能为空'}), 400

    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO articles (title, content, category)
            VALUES (?, ?, ?)
        """, (title, content, category))
        conn.commit()
        return jsonify({
            'code': 200,
            'message': '文章发布成功',
            'id': cursor.lastrowid
        })
    finally:
        conn.close()


@app.route('/api/articles/<int:article_id>', methods=['PUT'])
@jwt_required()
def update_article(article_id):
    """编辑文章（需登录）"""
    data = request.get_json()
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    category = data.get('category', '未分类').strip()

    if not title or not content:
        return jsonify({'code': 400, 'message': '标题和内容不能为空'}), 400

    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE articles
            SET title = ?, content = ?, category = ?
            WHERE id = ?
        """, (title, content, category, article_id))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'code': 200, 'message': '文章更新成功'})
        return jsonify({'code': 404, 'message': '文章不存在'}), 404
    finally:
        conn.close()


@app.route('/api/articles/<int:article_id>', methods=['DELETE'])
@jwt_required()
def delete_article(article_id):
    """删除文章（需登录）"""
    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM articles WHERE id = ?", (article_id,))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'code': 200, 'message': '文章删除成功'})
        return jsonify({'code': 404, 'message': '文章不存在'}), 404
    finally:
        conn.close()


@app.route('/api/init', methods=['GET'])
def init_database():
    """初始化数据库（首次运行调用）"""
    try:
        init_db()
        return jsonify({'code': 200, 'message': '数据库初始化成功'})
    except Exception as e:
        return jsonify({'code': 500, 'message': f'初始化失败: {str(e)}'}), 500


if __name__ == '__main__':
    print("正在初始化数据库...")
    init_db()
    print("数据库初始化完成，启动服务...")
    print("后端地址: http://localhost:5001")  # 这里也改了
    print("API 文档: http://localhost:5001/api/articles")
    app.run(host='0.0.0.0', port=5001, debug=True)  # 重点：端口改成 5001