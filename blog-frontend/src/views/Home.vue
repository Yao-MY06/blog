<template>
  <div class="home">
    <!-- 顶部 Banner -->
    <div class="banner">
      <h1>欢迎来到我的博客</h1>
      <p>记录学习、分享技术、沉淀思考</p>
    </div>

    <!-- 文章列表 -->
    <div class="article-list" v-loading="loading">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" v-for="article in articles" :key="article.id">
          <el-card class="article-card" shadow="hover" @click="goToDetail(article.id)">
            <div class="article-header">
              <el-tag size="small" type="primary">{{ article.category || '未分类' }}</el-tag>
              <span class="article-date">{{ formatDate(article.created_at) }}</span>
            </div>
            <h3 class="article-title">{{ article.title }}</h3>
            <p class="article-summary">{{ article.summary || article.content?.substring(0, 80) + '...' }}</p>
            <div class="article-footer">
              <el-button text type="primary" size="small">
                阅读全文 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 空状态 -->
      <el-empty v-if="!loading && articles.length === 0" description="暂无文章" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import request from '../utils/request'

const router = useRouter()
const articles = ref([])
const loading = ref(false)

// 获取文章列表
const fetchArticles = async () => {
  loading.value = true
  try {
    const res = await request.get('/articles')
    articles.value = res.data || res || []
  } catch (error) {
    console.error('获取文章失败:', error)
    // 演示数据（后端没跑时显示）
    articles.value = [
      {
        id: 1,
        title: 'Vue3 入门指南',
        content: 'Vue3 是前端开发中非常流行的框架，本文将带你快速上手...',
        category: '前端',
        created_at: '2026-04-20'
      },
      {
        id: 2,
        title: 'Python Flask 搭建博客后端',
        content: 'Flask 是一个轻量级的 Python Web 框架，非常适合快速开发...',
        category: '后端',
        created_at: '2026-04-18'
      },
      {
        id: 3,
        title: 'MySQL 数据库设计基础',
        content: '数据库设计是后端开发的核心技能之一，良好的设计能让系统更加稳定...',
        category: '数据库',
        created_at: '2026-04-15'
      }
    ]
  } finally {
    loading.value = false
  }
}

const goToDetail = (id) => {
  router.push(`/article/${id}`)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchArticles()
})
</script>

<style scoped>
.banner {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: #fff;
  margin-bottom: 30px;
}

.banner h1 {
  font-size: 36px;
  margin-bottom: 12px;
}

.banner p {
  font-size: 18px;
  opacity: 0.9;
}

.article-list {
  margin-top: 20px;
}

.article-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.2s;
  border-radius: 10px;
}

.article-card:hover {
  transform: translateY(-4px);
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.article-date {
  font-size: 13px;
  color: #999;
}

.article-title {
  font-size: 18px;
  margin-bottom: 10px;
  color: #333;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.article-summary {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.article-footer {
  margin-top: 14px;
  text-align: right;
}
</style>
