<script setup lang="ts">
import Canvas from './components/Canvas.vue'
</script>

<template>
  <div class="app">
    <Canvas />
  </div>
</template>

<style>
/* 全局样式重置，防止滚动条 */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

<style scoped>
.app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

