<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// 仅在三个主 Tab 页显示底部导航
const showTabbar = computed(() => !!route.meta.tabbar)
</script>

<template>
  <router-view />
  <van-tabbar v-if="showTabbar" route placeholder safe-area-inset-bottom>
    <van-tabbar-item to="/" icon="checked">打卡</van-tabbar-item>
    <van-tabbar-item to="/plans" icon="notes-o">计划</van-tabbar-item>
    <van-tabbar-item to="/settings" icon="setting-o">设置</van-tabbar-item>
  </van-tabbar>
</template>
