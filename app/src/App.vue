<script setup lang="ts">
import { ref } from 'vue'
import Canvas from './components/Canvas.vue'
import Toolbar from './components/Toolbar.vue'

const canvasRef = ref<InstanceType<typeof Canvas>>()
const activeTool = ref<string | null>(null)

// 处理activeTool更新
const handleActiveToolUpdate = (tool: string | null) => {
  activeTool.value = tool
}

// 处理图片选择
const handleImageSelected = (src: string, width: number, height: number) => {
  canvasRef.value?.handleImageSelected(src, width, height)
}
</script>

<template>
  <div class="app">
    <Canvas 
      ref="canvasRef" 
      :active-tool="activeTool"
      @update:active-tool="handleActiveToolUpdate"
    />
    <Toolbar 
      :active-tool="activeTool"
      @update:active-tool="handleActiveToolUpdate"
      @image-selected="handleImageSelected"
    />
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
  position: relative;
}
</style>

