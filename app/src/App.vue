<script setup lang="ts">
import { ref, computed } from 'vue'
import Canvas from './components/Canvas.vue'
import Toolbar from './components/Toolbar.vue'
import LayersPanel from './components/LayersPanel.vue'

const canvasRef = ref<InstanceType<typeof Canvas>>()
const activeTool = ref<string | null>(null)
const brushColor = ref('#ff6b6b')
const brushStrokeWidth = ref(5)

// 处理activeTool更新
const handleActiveToolUpdate = (tool: string | null) => {
  activeTool.value = tool
}

// 处理画笔颜色变更
const handleBrushColorChange = (color: string) => {
  brushColor.value = color
  canvasRef.value?.updateBrushColor(color)
}

// 处理画笔宽度变更
const handleBrushStrokeWidthChange = (width: number) => {
  brushStrokeWidth.value = width
  canvasRef.value?.updateBrushStrokeWidth(width)
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

// 处理图层排序
const handleReorderElement = (fromIndex: number, toIndex: number) => {
  canvasRef.value?.reorderElement(fromIndex, toIndex)
}
</script>

<template>
  <div class="app">
    <LayersPanel
      :elements="elements"
      :selected-element-ids="selectedElementIds"
      @select-element="handleLayerSelect"
      @reorder-element="handleReorderElement"
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
      :brush-color="brushColor"
      :brush-stroke-width="brushStrokeWidth"
      @update:active-tool="handleActiveToolUpdate"
      @image-selected="handleImageSelected"
      @brush-color-change="handleBrushColorChange"
      @brush-stroke-width-change="handleBrushStrokeWidthChange"
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

