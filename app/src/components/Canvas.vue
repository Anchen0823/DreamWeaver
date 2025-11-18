<template>
  <div class="canvas" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }">
    <div
      v-for="shape in shapes"
      :key="shape.id"
      :class="['shape', shape.type]"
      :style="getShapeStyle(shape)"
    >
      <!-- 形状内容 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface Shape {
  id: string
  type: 'rectangle' | 'rounded-rectangle' | 'circle' | 'triangle'
  x: number
  y: number
  width: number
  height: number
  backgroundColor: string
  borderWidth: number
  borderColor: string
  borderRadius?: number // 仅圆角矩形使用
}

const canvasWidth = ref(800)
const canvasHeight = ref(600)

const shapes = ref<Shape[]>([
  {
    id: 'rect1',
    type: 'rectangle',
    x: 50,
    y: 50,
    width: 100,
    height: 80,
    backgroundColor: '#ff6b6b',
    borderWidth: 2,
    borderColor: '#ff4757'
  },
  {
    id: 'rounded-rect1',
    type: 'rounded-rectangle',
    x: 200,
    y: 50,
    width: 120,
    height: 80,
    backgroundColor: '#4ecdc4',
    borderWidth: 3,
    borderColor: '#26d0ce',
    borderRadius: 10
  },
  {
    id: 'circle1',
    type: 'circle',
    x: 400,
    y: 50,
    width: 80,
    height: 80,
    backgroundColor: '#45b7d1',
    borderWidth: 2,
    borderColor: '#3a9fbf'
  },
  {
    id: 'triangle1',
    type: 'triangle',
    x: 550,
    y: 50,
    width: 100,
    height: 80,
    backgroundColor: '#96ceb4',
    borderWidth: 2,
    borderColor: '#88c5a8'
  }
])

const getShapeStyle = (shape: Shape): Record<string, string | number> => {
  const baseStyle = {
    position: 'absolute',
    left: shape.x + 'px',
    top: shape.y + 'px',
    width: shape.width + 'px',
    height: shape.height + 'px',
    backgroundColor: shape.backgroundColor,
    borderWidth: shape.borderWidth + 'px',
    borderStyle: 'solid',
    borderColor: shape.borderColor,
    boxSizing: 'border-box'
  }

  if (shape.type === 'rounded-rectangle') {
    return {
      ...baseStyle,
      borderRadius: (shape.borderRadius || 0) + 'px'
    }
  }

  if (shape.type === 'circle') {
    return {
      ...baseStyle,
      borderRadius: '50%'
    }
  }

  if (shape.type === 'triangle') {
    return {
      ...baseStyle,
      width: '0',
      height: '0',
      backgroundColor: 'transparent',
      border: 'none',
      borderLeft: `${shape.width / 2}px solid transparent`,
      borderRight: `${shape.width / 2}px solid transparent`,
      borderBottom: `${shape.height}px solid ${shape.backgroundColor}`,
      borderTopWidth: '0'
    }
  }

  return baseStyle
}
</script>

<style scoped>
.canvas {
  position: relative;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  margin: 20px auto;
  overflow: hidden;
}

.shape {
  cursor: pointer;
}

.shape:hover {
  opacity: 0.8;
}
</style>
