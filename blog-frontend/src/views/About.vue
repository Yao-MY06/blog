<template>
  <div class="about">
    <el-row justify="center">
      <el-col :xs="24" :sm="20" :md="16" :lg="12">
        <el-card class="about-card" shadow="hover">
          <div class="profile">
            <el-avatar :size="100" :src="avatarUrl" />
            <h2>关于我</h2>
            <p class="subtitle">热爱技术，乐于分享</p>
          </div>

          <el-divider />

          <div class="info-section">
            <h3><el-icon><User /></el-icon> 个人简介</h3>
            <p>
              你好！我是一名热爱编程的学生/开发者。
              这个博客是我用 <strong>Vue3 + Flask + MySQL</strong> 从零搭建的全栈项目，
              用来记录学习笔记、技术心得和生活感悟。
            </p>
          </div>

          <el-divider />

          <div class="info-section">
            <h3><el-icon><Monitor /></el-icon> 技术栈</h3>
            <div class="tags">
              <el-tag type="primary" size="large">Vue3</el-tag>
              <el-tag type="success" size="large">Vite</el-tag>
              <el-tag type="warning" size="large">Element Plus</el-tag>
              <el-tag type="danger" size="large">Python</el-tag>
              <el-tag type="info" size="large">Flask</el-tag>
              <el-tag type="primary" size="large">MySQL</el-tag>
            </div>
          </div>

          <el-divider />

          <div class="info-section">
            <h3><el-icon><Message /></el-icon> 联系方式</h3>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="邮箱">your-email@example.com</el-descriptions-item>
              <el-descriptions-item label="GitHub">github.com/yourname</el-descriptions-item>
              <el-descriptions-item label="位置">中国</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { User, Monitor, Message } from '@element-plus/icons-vue'

const avatarUrl = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
</script>

<style scoped>
.about {
  padding: 20px 0;
}

.about-card {
  border-radius: 12px;
  padding: 20px;
}

.profile {
  text-align: center;
  padding: 20px 0;
}

.profile h2 {
  margin-top: 16px;
  font-size: 24px;
  color: #333;
}

.subtitle {
  color: #999;
  margin-top: 8px;
  font-size: 16px;
}

.info-section {
  padding: 10px 0;
}

.info-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
}

.info-section p {
  line-height: 1.8;
  color: #555;
  font-size: 15px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
