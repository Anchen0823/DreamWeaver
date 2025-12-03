<template>
  <div
    :class="['element', element.type, { 'selected': isSelected }]"
    :style="elementStyle"
    @mousedown="handleMouseDown"
  >
    <!-- 图形元素 -->
    <template v-if="isShape">
      <!-- 图形通过CSS样式渲染，无需内容 -->
    </template>
    
    <!-- 图片元素 -->
    <template v-else-if="element.type === 'image'">
      <img
        :src="(element as ImageElement).src"
        :alt="element.id"
        :style="imageStyle"
        class="image-content"
      />
    </template>
    
    <!-- 文本元素 -->
    <template v-else-if="element.type === 'text'">
      <div
        v-if="!isEditing"
        :style="textStyle"
        class="text-content"
        v-html="formattedTextContent"
        @dblclick.stop="$emit('textDoubleClick', element.id, $event)"
      ></div>
      <!-- 文本编辑输入框 -->
      <textarea
        v-else
        ref="localTextEditInputRef"
        :value="(element as TextElement).content"
        @blur="$emit('textEditBlur', element.id)"
        @keydown.esc="$emit('textEditCancel')"
        @keydown.ctrl.enter.exact.prevent="$emit('textEditSave', element.id)"
        @keydown.meta.enter.exact.prevent="$emit('textEditSave', element.id)"
        @input="$emit('textEditInput', element.id, ($event.target as HTMLTextAreaElement).value)"
        @mousedown.stop
        @click.stop
        :style="textEditStyle"
        class="text-edit-input"
      ></textarea>
    </template>
    
    <!-- 画笔元素 -->
    <template v-else-if="element.type === 'brush'">
      <svg
        :style="brushSvgStyle"
        class="brush-content"
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CanvasElement, ShapeElement, ImageElement, TextElement, BrushElement } from '../types/canvas'
import { getElementStyle, getImageStyle, getTextStyle, formatTextContent } from '../utils/style-calculator'

interface Props {
  element: CanvasElement
  scale: number
  isSelected: boolean
  isEditing: boolean
  activeTool?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  elementMouseDown: [elementId: string, event: MouseEvent]
  textDoubleClick: [elementId: string, event: MouseEvent]
  textEditInput: [elementId: string, value: string]
  textEditSave: [elementId: string]
  textEditCancel: []
  textEditBlur: [elementId: string]
}>()

const localTextEditInputRef = ref<HTMLTextAreaElement | null>(null)

// 暴露 ref 给父组件
defineExpose({
  textEditInputRef: localTextEditInputRef
})

const isShape = computed(() => {
  return props.element.type === 'rectangle' || 
         props.element.type === 'rounded-rectangle' || 
         props.element.type === 'circle' || 
         props.element.type === 'triangle'
})

const elementStyle = computed(() => {
  return getElementStyle(props.element, props.scale)
})

const imageStyle = computed(() => {
  if (props.element.type !== 'image') return {}
  return getImageStyle(props.element as ImageElement)
})

const textStyle = computed(() => {
  if (props.element.type !== 'text') return {}
  return getTextStyle(props.element as TextElement, props.scale)
})

const formattedTextContent = computed(() => {
  if (props.element.type !== 'text') return ''
  return formatTextContent(props.element as TextElement)
})

const textEditStyle = computed(() => {
  if (props.element.type !== 'text') return {}
  const textStyle = getTextStyle(props.element as TextElement, props.scale)
  return {
    ...textStyle,
    position: 'absolute',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    resize: 'none',
    border: '2px solid #4a90e2',
    outline: 'none',
    padding: textStyle.padding || `${4 * props.scale}px`,
    margin: '0',
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderRadius: '2px',
    background: (props.element as TextElement).backgroundColor || 'transparent',
    zIndex: 10001
  }
})

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
  if (points.length === 1) {
    // 单个点，绘制一个小圆
    return `M ${points[0].x} ${points[0].y} m -${brushElement.value.strokeWidth / 2}, 0 a ${brushElement.value.strokeWidth / 2},${brushElement.value.strokeWidth / 2} 0 1,0 ${brushElement.value.strokeWidth},0 a ${brushElement.value.strokeWidth / 2},${brushElement.value.strokeWidth / 2} 0 1,0 -${brushElement.value.strokeWidth},0`
  }
  
  // 多个点，使用路径连接
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`
  }
  
  return path
})

const brushColor = computed(() => {
  return brushElement.value?.color || '#ff6b6b'
})

const brushStrokeWidth = computed(() => {
  return brushElement.value ? (brushElement.value.strokeWidth * props.scale) : 5
})

const brushLineCap = computed(() => {
  return brushElement.value?.lineCap || 'round'
})

const brushLineJoin = computed(() => {
  return brushElement.value?.lineJoin || 'round'
})

const brushSvgStyle = computed(() => {
  return {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none'
  }
})

// 处理鼠标按下事件
const handleMouseDown = (e: MouseEvent) => {
  // 如果是画笔模式，不阻止事件传播，让事件冒泡到容器以便在元素上绘制
  if (props.activeTool === 'brush') {
    // 不调用 stopPropagation，让事件继续冒泡到容器
    // 这样可以从元素框内起笔
    return
  }
  
  // 其他模式下阻止事件冒泡并正常处理
  e.stopPropagation()
  emit('elementMouseDown', props.element.id, e)
}
</script>

<style scoped>
.element {
  cursor: pointer;
}

.element:hover {
  opacity: 0.9;
}

/* 三角形轮廓渲染 */
.element.triangle {
  position: relative;
  background-color: transparent !important;
}

.element.triangle::before {
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

.element.triangle::after {
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

.text-content {
  user-select: text;
  white-space: pre-wrap;
}

.text-edit-input {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  line-height: inherit;
  text-align: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  cursor: text;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
}

.text-edit-input:focus {
  outline: none;
  box-shadow: none;
}

.brush-content {
  user-select: none;
  pointer-events: none;
}
</style>

