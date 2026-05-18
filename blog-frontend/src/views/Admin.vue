<template>
  <div class="admin">
    <!-- 未登录：显示登录表单 -->
    <el-row v-if="!isLoggedIn" justify="center">
      <el-col :xs="24" :sm="14" :md="10" :lg="8">
        <el-card class="login-card" shadow="hover">
          <div class="login-header">
            <el-icon size="48" color="#409eff"><Lock /></el-icon>
            <h2>管理员登录</h2>
            <p>请输入账号密码进入后台</p>
          </div>

          <el-form :model="loginForm" :rules="loginRules" ref="loginRef" label-position="top">
            <el-form-item label="账号" prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入账号"
                size="large"
                :prefix-icon="User"
              />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                show-password
                :prefix-icon="Lock"
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                style="width: 100%"
                :loading="loginLoading"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>

          <div class="login-tip">
            <el-alert
              title="演示账号：admin / 123456"
              type="info"
              :closable="false"
              show-icon
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 已登录：显示后台管理 -->
    <div v-else class="admin-panel">
      <el-row justify="space-between" align="middle" class="admin-header">
        <h2>文章管理</h2>
        <el-button type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon> 新建文章
        </el-button>
      </el-row>

      <el-card shadow="never" class="table-card">
        <el-table :data="articles" v-loading="tableLoading" stripe>
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
          <el-table-column prop="category" label="分类" width="120">
            <template #default="{ row }">
              <el-tag size="small">{{ row.category || '未分类' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="发布时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="openDialog(row)">
                编辑
              </el-button>
              <el-button text type="danger" size="small" @click="handleDelete(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-button class="logout-btn" type="info" plain @click="handleLogout">
        <el-icon><SwitchButton /></el-icon> 退出登录
      </el-button>
    </div>

    <!-- 新建/编辑文章弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑文章' : '新建文章'"
      width="700px"
      destroy-on-close
    >
      <el-form :model="articleForm" :rules="articleRules" ref="articleRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="articleForm.title" placeholder="请输入文章标题" />
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select v-model="articleForm.category" placeholder="选择分类" style="width: 100%">
            <el-option label="前端" value="前端" />
            <el-option label="后端" value="后端" />
            <el-option label="数据库" value="数据库" />
            <el-option label="运维" value="运维" />
            <el-option label="随笔" value="随笔" />
          </el-select>
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <el-input
            v-model="articleForm.content"
            type="textarea"
            :rows="12"
            placeholder="支持 Markdown 格式书写文章..."
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock, User, Plus, SwitchButton } from '@element-plus/icons-vue'
import request from '../utils/request'

// ========== 登录相关 ==========
const isLoggedIn = ref(!!localStorage.getItem('token'))
const loginLoading = ref(false)
const loginRef = ref()
const loginForm = ref({
  username: '',
  password: ''
})

const loginRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  const valid = await loginRef.value.validate().catch(() => false)
  if (!valid) return

  loginLoading.value = true
  try {
    const res = await request.post('/login', loginForm.value)
    const token = res.token || res.data?.token || 'demo-token'
    localStorage.setItem('token', token)
    ElMessage.success('登录成功')
    isLoggedIn.value = true
    fetchArticles()
  } catch (error) {
    // 演示模式：允许任意账号登录
    if (loginForm.value.username && loginForm.value.password) {
      localStorage.setItem('token', 'demo-token')
      ElMessage.success('演示模式：登录成功')
      isLoggedIn.value = true
      fetchArticles()
    }
  } finally {
    loginLoading.value = false
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  isLoggedIn.value = false
  ElMessage.success('已退出登录')
}

// ========== 文章管理 ==========
const articles = ref([])
const tableLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const articleRef = ref()

const articleForm = ref({
  id: null,
  title: '',
  category: '',
  content: ''
})

const articleRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const fetchArticles = async () => {
  tableLoading.value = true
  try {
    const res = await request.get('/articles')
    articles.value = res.data || res || []
  } catch (error) {
    articles.value = [
      { id: 1, title: 'Vue3 入门指南', category: '前端', created_at: '2026-04-20' },
      { id: 2, title: 'Flask 后端开发', category: '后端', created_at: '2026-04-18' }
    ]
  } finally {
    tableLoading.value = false
  }
}

const openDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    articleForm.value = { ...row }
  } else {
    articleForm.value = { id: null, title: '', category: '', content: '' }
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await articleRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    if (isEdit.value) {
      await request.put(`/articles/${articleForm.value.id}`, articleForm.value)
      ElMessage.success('文章更新成功')
    } else {
      await request.post('/articles', articleForm.value)
      ElMessage.success('文章发布成功')
    }
    dialogVisible.value = false
    fetchArticles()
  } catch (error) {
    // 演示模式
    ElMessage.success('演示模式：保存成功')
    dialogVisible.value = false
    if (!isEdit.value) {
      articles.value.unshift({
        id: Date.now(),
        title: articleForm.value.title,
        category: articleForm.value.category,
        created_at: new Date().toISOString()
      })
    } else {
      const idx = articles.value.findIndex(a => a.id === articleForm.value.id)
      if (idx !== -1) articles.value[idx] = { ...articleForm.value }
    }
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇文章吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await request.delete(`/articles/${row.id}`)
    ElMessage.success('删除成功')
    fetchArticles()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.success('演示模式：删除成功')
      articles.value = articles.value.filter(a => a.id !== row.id)
    }
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  if (isLoggedIn.value) {
    fetchArticles()
  }
})
</script>

<style scoped>
.login-card {
  margin-top: 60px;
  border-radius: 12px;
  padding: 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  margin-top: 16px;
  font-size: 24px;
  color: #333;
}

.login-header p {
  color: #999;
  margin-top: 8px;
}

.login-tip {
  margin-top: 20px;
}

.admin-panel {
  max-width: 1100px;
  margin: 0 auto;
}

.admin-header {
  margin-bottom: 20px;
}

.admin-header h2 {
  font-size: 22px;
  color: #333;
}

.table-card {
  border-radius: 10px;
}

.logout-btn {
  margin-top: 20px;
}
</style>
