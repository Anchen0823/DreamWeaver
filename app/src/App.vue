<script setup lang="ts">
import { ref, computed } from 'vue'
import Canvas from './components/Canvas.vue'
import Toolbar from './components/Toolbar.vue'
import LayersPanel from './components/LayersPanel.vue'

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

// 获取画布元素和选中状态
const elements = computed(() => {
  return canvasRef.value?.elements || []
})

const selectedElementIds = computed(() => {
  return canvasRef.value?.selection?.selectedElementIds.value || []
})

// 处理图层选择
const handleLayerSelect = (elementId: string, ctrlKey: boolean) => {
  if (!canvasRef.value?.selection) return
  
  if (ctrlKey) {
    // Ctrl/Cmd + 点击：多选/取消选中
    const index = canvasRef.value.selection.selectedElementIds.value.indexOf(elementId)
    if (index > -1) {
      canvasRef.value.selection.selectedElementIds.value.splice(index, 1)
    } else {
      canvasRef.value.selection.selectedElementIds.value.push(elementId)
    }
  } else {
    // 普通点击：单选
    canvasRef.value.selection.selectedElementIds.value = [elementId]
  }
}
</script>

<template>
  <div class="app">
    <LayersPanel
      :elements="elements"
      :selected-element-ids="selectedElementIds"
      @select-element="handleLayerSelect"
    />
    <div class="main-content">
      <Canvas 
        ref="canvasRef" 
        :active-tool="activeTool"
        @update:active-tool="handleActiveToolUpdate"
      />
    </div>
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
  background-color: #ffffff;
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
  display: flex;
  flex-direction: row;
}

.main-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-width: 0;
}
</style>

