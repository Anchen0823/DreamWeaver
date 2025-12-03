<template>
  <template v-if="isDrawing && previewElement">
    <div
      :class="['element', 'preview', previewElement.type]"
      :style="elementStyle"
    >
      <!-- 图片预览 -->
      <template v-if="previewElement.type === 'image'">
        <img
          :src="(previewElement as ImageElement).src"
          :alt="previewElement.id"
          :style="imageStyle"
          class="image-content"
        />
      </template>
      
      <!-- 文本预览：绘制时不显示文本内容，只显示空框 -->
      <template v-else-if="previewElement.type === 'text'">
        <!-- 预览时不显示文本内容 -->
      </template>
    </div>
    
    <!-- 预览选中框轮廓 -->
    <div
      v-if="previewElement && previewElement.width > 0 && previewElement.height > 0"
      class="preview-selection-box"
      :style="previewSelectionBoxStyle"
    ></div>
    
    <!-- 尺寸标签 -->
    <div
      v-if="previewElement && previewElement.width > 0 && previewElement.height > 0"
      class="size-label"
      :style="sizeLabelStyle"
    >
      {{ formattedSize }}
    </div>
  </template>
  
  <!-- 画笔预览 -->
  <template v-if="isBrushDrawing && brushPreviewElement">
    <CanvasElement
      :element="brushPreviewElement"
      :scale="viewport.scale.value"
      :is-selected="false"
      :is-editing="false"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CanvasElement as CanvasElementType, ImageElement } from '../types/canvas'
import { getElementStyle, getImageStyle } from '../utils/style-calculator'
import type { useDrawing } from '../composables/useDrawing'
import type { useBrushDrawing } from '../composables/useBrushDrawing'
import type { useViewport } from '../composables/useViewport'
import CanvasElement from './CanvasElement.vue'

interface Props {
  drawing: ReturnType<typeof useDrawing>
  brushDrawing?: ReturnType<typeof useBrushDrawing> | null
  viewport: ReturnType<typeof useViewport>
}

const props = defineProps<Props>()

const isDrawing = computed(() => props.drawing.isDrawing.value)
const previewElement = computed(() => props.drawing.previewElement.value)

const isBrushDrawing = computed(() => props.brushDrawing?.isDrawing.value ?? false)
const brushPreviewElement = computed(() => props.brushDrawing?.currentBrushElement.value ?? null)

const elementStyle = computed(() => {
  if (!previewElement.value) return {}
  return getElementStyle(previewElement.value, props.viewport.scale.value)
})

const imageStyle = computed(() => {
  if (!previewElement.value || previewElement.value.type !== 'image') return {}
  return getImageStyle(previewElement.value as ImageElement)
})

const previewSelectionBoxStyle = computed(() => {
  return props.drawing.getPreviewSelectionBoxStyle()
})

const sizeLabelStyle = computed(() => {
  return props.drawing.sizeLabelStyle.value
})

const formattedSize = computed(() => {
  return props.drawing.formatSize(previewElement.value)
})
</script>

<style scoped>
.element.preview {
  opacity: 0.7;
  pointer-events: none;
  z-index: 10000;
}

/* 预览中的三角形轮廓渲染 */
.element.preview.triangle {
  position: relative;
  background-color: transparent !important;
}

.element.preview.triangle::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  -webkit-clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  background-color: var(--border-color, transparent);
  z-index: 1;
}

.element.preview.triangle::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: 50% 66.67%;
  transform: scale(var(--scale-ratio, 1));
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  -webkit-clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  background-color: var(--background-color, transparent);
  z-index: 2;
}

.image-content {
  display: block;
  user-select: none;
  pointer-events: none;
}

.preview-selection-box {
  border: 2px solid #4a90e2;
  border-radius: 2px;
  background-color: transparent;
  box-shadow: 0 0 0 1px rgba(74, 144, 226, 0.2);
  pointer-events: none;
}

.size-label {
  position: absolute;
  background: #4a90e2;
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10001;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>

