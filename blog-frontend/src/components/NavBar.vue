<template>
  <el-menu
    :default-active="activeIndex"
    class="navbar"
    mode="horizontal"
    router
    background-color="#fff"
    text-color="#333"
    active-text-color="#409eff"
  >
    <div class="logo">
      <el-icon size="24"><Document /></el-icon>
      <span>我的博客</span>
    </div>
    <div class="menu-items">
      <el-menu-item index="/">
        <el-icon><HomeFilled /></el-icon>
        <span>首页</span>
      </el-menu-item>
      <el-menu-item index="/about">
        <el-icon><UserFilled /></el-icon>
        <span>关于我</span>
      </el-menu-item>
      <el-menu-item index="/admin">
        <el-icon><Setting /></el-icon>
        <span>后台管理</span>
      </el-menu-item>
    </div>
  </el-menu>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Document, HomeFilled, UserFilled, Setting } from '@element-plus/icons-vue'

const route = useRoute()
const activeIndex = ref('/')

watch(
  () => route.path,
  (path) => {
    activeIndex.value = path
  },
  { immediate: true }
)
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}

.menu-items {
  display: flex;
}
</style>
