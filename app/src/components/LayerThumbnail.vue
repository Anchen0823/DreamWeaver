<template>
  <div class="layer-thumbnail-wrapper">
    <!-- 图形元素缩略图 -->
    <template v-if="isShape">
      <div
        class="thumbnail-shape"
        :class="element.type"
        :style="shapeStyle"
      ></div>
    </template>
    
    <!-- 图片元素缩略图 -->
    <template v-else-if="element.type === 'image'">
      <img
        :src="(element as ImageElement).src"
        class="thumbnail-image"
        :alt="element.id"
      />
    </template>
    
    <!-- 文本元素缩略图 -->
    <template v-else-if="element.type === 'text'">
      <div
        class="thumbnail-text"
        :style="textStyle"
      >
        {{ getTextPreview(element as TextElement) }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CanvasElement, ShapeElement, ImageElement, TextElement } from '../types/canvas'

interface Props {
  element: CanvasElement
}

const props = defineProps<Props>()

const isShape = computed(() => {
  return props.element.type === 'rectangle' || 
         props.element.type === 'rounded-rectangle' || 
         props.element.type === 'circle' || 
         props.element.type === 'triangle'
})

// 计算图形样式
const shapeStyle = computed(() => {
  if (!isShape.value) return {}
  
  const shape = props.element as ShapeElement
  const maxSize = 40
  const scale = Math.min(maxSize / props.element.width, maxSize / props.element.height, 1)
  
  const scaledWidth = props.element.width * scale
  const scaledHeight = props.element.height * scale
  
  // 三角形需要特殊处理 - 使用 clip-path 更可靠
  if (props.element.type === 'triangle') {
    // 使用 clip-path 创建三角形（向下指向）
    const clipPath = `polygon(50% 0%, 0% 100%, 100% 100%)`
    return {
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`,
      backgroundColor: shape.backgroundColor,
      clipPath: clipPath,
      WebkitClipPath: clipPath, // Safari 兼容
      border: 'none',
      borderWidth: '0'
    }
  }
  
  return {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    backgroundColor: shape.backgroundColor,
    borderWidth: `${(shape.borderWidth || 0) * scale}px`,
    borderStyle: shape.borderWidth ? 'solid' : 'none',
    borderColor: shape.borderColor,
    borderRadius: shape.borderRadius ? `${shape.borderRadius * scale}px` : '0px'
  }
})

// 计算文本样式
const textStyle = computed(() => {
  if (props.element.type !== 'text') return {}
  
  const text = props.element as TextElement
  const scale = Math.min(40 / props.element.width, 40 / props.element.height, 1)
  
  return {
    fontSize: `${(text.fontSize || 14) * scale}px`,
    color: text.color,
    backgroundColor: text.backgroundColor || 'transparent',
    fontWeight: text.bold ? 'bold' : 'normal',
    fontStyle: text.italic ? 'italic' : 'normal',
    textDecoration: [
      text.underline ? 'underline' : '',
      text.strikethrough ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none',
    fontFamily: text.fontFamily || 'sans-serif',
    textAlign: text.textAlign || 'left',
    lineHeight: text.lineHeight || 1.5,
    padding: `${2 * scale}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: text.textAlign === 'center' ? 'center' : text.textAlign === 'right' ? 'flex-end' : 'flex-start'
  }
})

// 获取文本预览
const getTextPreview = (text: TextElement): string => {
  if (!text.content || text.content.trim() === '') {
    return '文本'
  }
  // 只显示前几个字符
  return text.content.substring(0, 10) + (text.content.length > 10 ? '...' : '')
}
</script>

<style scoped>
.layer-thumbnail-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.thumbnail-shape {
  box-sizing: border-box;
}

.thumbnail-shape.rectangle {
  border-radius: 0;
}

.thumbnail-shape.rounded-rectangle {
  border-radius: 4px;
}

.thumbnail-shape.circle {
  border-radius: 50%;
}

.thumbnail-shape.triangle {
  /* 使用 clip-path，不需要特殊样式 */
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.thumbnail-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}
</style>

