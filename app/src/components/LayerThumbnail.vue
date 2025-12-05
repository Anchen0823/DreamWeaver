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
    
    <!-- 画笔元素缩略图 -->
    <template v-else-if="element.type === 'brush'">
      <svg
        :style="brushSvgStyle"
        class="thumbnail-brush"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          :d="brushPath"
          :stroke="brushColor"
          :stroke-width="brushStrokeWidth"
          :stroke-linecap="brushLineCap"
          :stroke-linejoin="brushLineJoin"
          fill="none"
        />
      </svg>
    </template>

    <!-- 组合元素 -->
    <template v-else-if="element.type === 'group'">
      <div class="thumbnail-group" :style="groupContainerStyle">
        <div 
          v-for="child in (element as GroupElement).children" 
          :key="child.id"
          class="group-child-element"
          :style="getChildElementStyle(child)"
        >
          <!-- 递归渲染子元素 -->
          <div
            v-if="isShapeElement(child)"
            class="child-shape"
            :class="child.type"
            :style="getChildShapeStyle(child as ShapeElement)"
          ></div>
          <img
            v-else-if="child.type === 'image'"
            :src="(child as ImageElement).src"
            class="child-image"
            :alt="child.id"
          />
          <div
            v-else-if="child.type === 'text'"
            class="child-text"
            :style="getChildTextStyle(child as TextElement)"
          >
            {{ getTextPreview(child as TextElement) }}
          </div>
          <svg
            v-else-if="child.type === 'brush'"
            class="child-brush"
            :viewBox="`0 0 ${child.width} ${child.height}`"
            preserveAspectRatio="none"
          >
            <path
              :d="getChildBrushPath(child as BrushElement)"
              :stroke="(child as BrushElement).color"
              :stroke-width="(child as BrushElement).strokeWidth"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          </svg>
          <!-- 嵌套组合 -->
          <LayerThumbnail
            v-else-if="child.type === 'group'"
            :element="child"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CanvasElement, ShapeElement, ImageElement, TextElement, BrushElement, GroupElement } from '../types/canvas'

interface Props {
  element: CanvasElement
}

const props = defineProps<Props>()

// 声明组件名称以支持递归
defineOptions({
  name: 'LayerThumbnail'
})

const isShape = computed(() => {
  return props.element.type === 'rectangle' || 
         props.element.type === 'rounded-rectangle' || 
         props.element.type === 'circle' || 
         props.element.type === 'triangle'
})

// 判断是否是图形元素
const isShapeElement = (el: CanvasElement) => {
  return el.type === 'rectangle' || 
         el.type === 'rounded-rectangle' || 
         el.type === 'circle' || 
         el.type === 'triangle'
}

// 组合容器样式
const groupContainerStyle = computed(() => {
  if (props.element.type !== 'group') return {}
  
  const maxSize = 40
  const group = props.element as GroupElement
  const scale = Math.min(maxSize / group.width, maxSize / group.height)
  
  return {
    width: `${group.width * scale}px`,
    height: `${group.height * scale}px`,
    position: 'relative' as const,
    overflow: 'hidden' as const
  }
})

// 获取子元素定位样式
const getChildElementStyle = (child: CanvasElement) => {
  if (props.element.type !== 'group') return {}
  
  const maxSize = 40
  const group = props.element as GroupElement
  const scale = Math.min(maxSize / group.width, maxSize / group.height)
  
  return {
    position: 'absolute' as const,
    left: `${child.x * scale}px`,
    top: `${child.y * scale}px`,
    width: `${child.width * scale}px`,
    height: `${child.height * scale}px`
  }
}

// 获取子图形样式
const getChildShapeStyle = (shape: ShapeElement) => {
  const style: any = {
    width: '100%',
    height: '100%',
    backgroundColor: shape.backgroundColor,
    boxSizing: 'border-box'
  }
  
  if (shape.borderWidth && shape.borderWidth > 0) {
    if (props.element.type === 'group') {
      const maxSize = 40
      const group = props.element as GroupElement
      const scale = Math.min(maxSize / group.width, maxSize / group.height)
      style.border = `${Math.max(0.5, shape.borderWidth * scale)}px solid ${shape.borderColor}`
    }
  }
  
  if (shape.type === 'rounded-rectangle' && shape.borderRadius) {
    if (props.element.type === 'group') {
      const maxSize = 40
      const group = props.element as GroupElement
      const scale = Math.min(maxSize / group.width, maxSize / group.height)
      style.borderRadius = `${shape.borderRadius * scale}px`
    }
  } else if (shape.type === 'circle') {
    style.borderRadius = '50%'
  } else if (shape.type === 'triangle') {
    style.border = 'none'
    style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)'
  }
  
  return style
}

// 获取子文本样式
const getChildTextStyle = (text: TextElement) => {
  if (props.element.type !== 'group') return {}
  
  const maxSize = 40
  const group = props.element as GroupElement
  const scale = Math.min(maxSize / group.width, maxSize / group.height)
  
  return {
    width: '100%',
    height: '100%',
    fontSize: `${Math.max(4, (text.fontSize || 14) * scale)}px`,
    color: text.color,
    backgroundColor: text.backgroundColor || 'transparent',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: text.textAlign === 'center' ? 'center' : text.textAlign === 'right' ? 'flex-end' : 'flex-start',
    fontWeight: text.bold ? 'bold' : 'normal',
    fontStyle: text.italic ? 'italic' : 'normal',
    fontFamily: text.fontFamily || 'sans-serif'
  }
}

// 获取子画笔路径
const getChildBrushPath = (brush: BrushElement) => {
  if (brush.points.length === 0) return ''
  
  const firstPoint = brush.points[0]
  if (!firstPoint) return ''
  
  if (brush.points.length === 1) {
    const p = firstPoint
    const r = brush.strokeWidth / 2
    return `M ${p.x} ${p.y} m -${r}, 0 a ${r},${r} 0 1,0 ${brush.strokeWidth},0 a ${r},${r} 0 1,0 -${brush.strokeWidth},0`
  }
  
  let path = `M ${firstPoint.x} ${firstPoint.y}`
  for (let i = 1; i < brush.points.length; i++) {
    const point = brush.points[i]
    if (point) {
      path += ` L ${point.x} ${point.y}`
    }
  }
  return path
}

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

// 画笔元素相关计算属性
const brushElement = computed(() => {
  if (props.element.type !== 'brush') return null
  return props.element as BrushElement
})

const brushPath = computed(() => {
  if (!brushElement.value || brushElement.value.points.length === 0) {
    return ''
  }
  
  const points = brushElement.value.points
  const maxSize = 40
  const scale = Math.min(maxSize / props.element.width, maxSize / props.element.height, 1)
  
  const firstPoint = points[0]
  if (!firstPoint) return ''
  
  if (points.length === 1) {
    // 单个点，绘制一个小圆
    const scaledWidth = brushElement.value.strokeWidth * scale
    return `M ${firstPoint.x * scale} ${firstPoint.y * scale} m -${scaledWidth / 2}, 0 a ${scaledWidth / 2},${scaledWidth / 2} 0 1,0 ${scaledWidth},0 a ${scaledWidth / 2},${scaledWidth / 2} 0 1,0 -${scaledWidth},0`
  }
  
  // 多个点，使用路径连接
  let path = `M ${firstPoint.x * scale} ${firstPoint.y * scale}`
  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    if (point) {
      path += ` L ${point.x * scale} ${point.y * scale}`
    }
  }
  
  return path
})

const brushColor = computed(() => {
  return brushElement.value?.color || '#ff6b6b'
})

const brushStrokeWidth = computed(() => {
  if (!brushElement.value) return 2
  const maxSize = 40
  const scale = Math.min(maxSize / props.element.width, maxSize / props.element.height, 1)
  return Math.max(1, brushElement.value.strokeWidth * scale)
})

const brushLineCap = computed(() => {
  return brushElement.value?.lineCap || 'round'
})

const brushLineJoin = computed(() => {
  return brushElement.value?.lineJoin || 'round'
})

const brushSvgStyle = computed(() => {
  const maxSize = 40
  const aspectRatio = props.element.width / props.element.height
  
  let width = maxSize
  let height = maxSize
  
  if (aspectRatio > 1) {
    height = maxSize / aspectRatio
  } else {
    width = maxSize * aspectRatio
  }
  
  return {
    width: `${width}px`,
    height: `${height}px`
  }
})
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

.thumbnail-brush {
  display: block;
}

.thumbnail-group {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #fafafa;
}

.group-child-element {
  position: absolute;
  pointer-events: none;
}

.child-shape {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.child-shape.circle {
  border-radius: 50%;
}

.child-shape.triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.child-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.child-text {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 2px;
}

.child-brush {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

