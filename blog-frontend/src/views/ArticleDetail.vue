<template>
  <div class="article-detail" v-loading="loading">
    <el-button text class="back-btn" @click="router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回列表
    </el-button>

    <el-card v-if="article" class="article-card">
      <div class="article-meta">
        <el-tag type="primary">{{ article.category || '未分类' }}</el-tag>
        <span class="article-date">
          <el-icon><Clock /></el-icon>
          {{ formatDate(article.created_at) }}
        </span>
      </div>

      <h1 class="article-title">{{ article.title }}</h1>

      <el-divider />

      <div class="article-content" v-html="renderMarkdown(article.content)"></div>
    </el-card>

    <el-empty v-else-if="!loading" description="文章不存在或已删除" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Clock } from '@element-plus/icons-vue'
import request from '../utils/request'

const route = useRoute()
const router = useRouter()
const article = ref(null)
const loading = ref(false)

const fetchArticle = async () => {
  const id = route.params.id
  loading.value = true
  try {
    const res = await request.get(`/articles/${id}`)
    article.value = res.data || res
  } catch (error) {
    console.error('获取文章详情失败:', error)
    // 演示数据
    article.value = {
      id: id,
      title: '示例文章标题',
      content: '<p>这是一段示例文章内容。当后端服务未启动时，会显示此演示数据。</p><p>你可以使用 <strong>HTML</strong> 或 <code>Markdown</code> 来渲染文章内容。</p><p>后端联调成功后，这里会显示真实的数据库内容。</p>',
      category: '示例分类',
      created_at: '2026-04-20'
    }
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 简单的 Markdown 转 HTML（实际项目可用 marked 库）
const renderMarkdown = (content) => {
  if (!content) return ''
  // 如果后端已经返回 HTML，直接显示
  if (content.startsWith('<')) return content
  // 简单处理：换行转 <br>，代码块等
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

onMounted(() => {
  fetchArticle()
})
</script>

<style scoped>
.article-detail {
  max-width: 900px;
  margin: 0 auto;
}

.back-btn {
  margin-bottom: 16px;
  color: #666;
}

.article-card {
  border-radius: 12px;
  padding: 20px;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.article-date {
  font-size: 14px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-title {
  font-size: 28px;
  color: #333;
  line-height: 1.4;
  margin-bottom: 8px;
}

.article-content {
  font-size: 16px;
  line-height: 1.8;
  color: #444;
}

.article-content :deep(pre) {
  background: #f4f4f5;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.article-content :deep(code) {
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.article-content :deep(pre code) {
  background: none;
  padding: 0;
}

.article-content :deep(p) {
  margin-bottom: 16px;
}
</style>
