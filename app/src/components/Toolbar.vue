<template>
  <div class="toolbar">
    <div class="toolbar-content">
      <!-- Move工具（默认选择工具） -->
      <div class="tool-group">
        <button 
          class="tool-button"
          :class="{ active: !activeTool || activeTool === 'move' }"
          @click="handleSelectMove"
          title="选择/移动"
        >
          <MoveIcon />
          <span class="tool-name">移动</span>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="toolbar-divider"></div>

      <!-- 图形工具组 -->
      <div class="tool-group">
        <div class="tool-label">图形</div>
        <div class="tool-buttons">
          <button 
            class="tool-button"
            :class="{ active: activeTool === 'rectangle' }"
            @click="handleSelectShape('rectangle')"
            title="矩形"
          >
            <RectangleIcon />
            <span class="tool-name">矩形</span>
          </button>
          <button 
            class="tool-button"
            :class="{ active: activeTool === 'rounded-rectangle' }"
            @click="handleSelectShape('rounded-rectangle')"
            title="圆角矩形"
          >
            <RoundedRectangleIcon />
            <span class="tool-name">圆角矩形</span>
          </button>
          <button 
            class="tool-button"
            :class="{ active: activeTool === 'circle' }"
            @click="handleSelectShape('circle')"
            title="圆形"
          >
            <CircleIcon />
            <span class="tool-name">圆形</span>
          </button>
          <button 
            class="tool-button"
            :class="{ active: activeTool === 'triangle' }"
            @click="handleSelectShape('triangle')"
            title="三角形"
          >
            <TriangleIcon />
            <span class="tool-name">三角形</span>
          </button>
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="toolbar-divider"></div>

      <!-- 图片工具 -->
      <div class="tool-group">
        <button 
          class="tool-button"
          :class="{ active: activeTool === 'image' }"
          @click="handleSelectImage"
          title="添加图片"
        >
          <ImageIcon />
          <span class="tool-name">图片</span>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="toolbar-divider"></div>

      <!-- 文本工具 -->
      <div class="tool-group">
        <button 
          class="tool-button"
          :class="{ active: activeTool === 'text' }"
          @click="handleSelectText"
          title="添加文本"
        >
          <TextIcon />
          <span class="tool-name">文本</span>
        </button>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ElementType } from '../types/canvas'
import MoveIcon from './icons/MoveIcon.vue'
import RectangleIcon from './icons/RectangleIcon.vue'
import RoundedRectangleIcon from './icons/RoundedRectangleIcon.vue'
import CircleIcon from './icons/CircleIcon.vue'
import TriangleIcon from './icons/TriangleIcon.vue'
import ImageIcon from './icons/ImageIcon.vue'
import TextIcon from './icons/TextIcon.vue'

// 定义props和事件
const props = defineProps<{
  activeTool?: string | null
}>()

const emit = defineEmits<{
  'update:activeTool': [tool: string | null]
  'image-selected': [src: string, width: number, height: number]
}>()

const fileInputRef = ref<HTMLInputElement>()

// 处理选择Move工具（默认状态）
const handleSelectMove = () => {
  emit('update:activeTool', null)
}

// 处理选择图形工具
const handleSelectShape = (type: ElementType) => {
  const toolType = type as string
  // 如果点击的是已选中的工具，则取消选择
  if (props.activeTool === toolType) {
    emit('update:activeTool', null)
  } else {
    emit('update:activeTool', toolType)
  }
}

// 处理选择图片工具
const handleSelectImage = () => {
  // 如果点击的是已选中的工具，则取消选择
  if (props.activeTool === 'image') {
    emit('update:activeTool', null)
  } else {
    // 先选择图片文件
    fileInputRef.value?.click()
  }
}

// 处理文件选择
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }

  // 检查是否为图片
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件')
    return
  }

  // 读取图片
  const reader = new FileReader()
  reader.onload = (event) => {
    const result = event.target?.result as string
    if (result) {
      // 创建图片对象获取尺寸
      const img = new Image()
      img.onload = () => {
        // 激活图片工具并传递图片数据
        emit('update:activeTool', 'image')
        emit('image-selected', result, img.width, img.height)
        // 清空文件输入
        if (fileInputRef.value) {
          fileInputRef.value.value = ''
        }
      }
      img.src = result
    }
  }
  reader.readAsDataURL(file)
}

// 处理选择文本工具
const handleSelectText = () => {
  // 如果点击的是已选中的工具，则取消选择
  if (props.activeTool === 'text') {
    emit('update:activeTool', null)
  } else {
    emit('update:activeTool', 'text')
  }
}
</script>

<style scoped>
.toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  height: 64px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  min-width: fit-content;
  max-width: calc(100% - 48px);
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: auto;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-label {
  font-size: 12px;
  color: #666;
  margin-right: 4px;
  font-weight: 500;
}

.tool-buttons {
  display: flex;
  gap: 4px;
}

.tool-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  min-width: 64px;
  height: 56px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #333;
}

.tool-button:hover {
  background: #f5f5f5;
}

.tool-button.active {
  background: #e8f4ff;
  color: #0066ff;
}

.tool-button:active {
  transform: scale(0.95);
}

.tool-name {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}

.toolbar-divider {
  width: 1px;
  height: 32px;
  background: #e5e5e5;
  margin: 0 8px;
}

/* 图标样式 */
.tool-button svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar {
    height: 56px;
    padding: 0 16px;
    bottom: 16px;
    border-radius: 10px;
  }

  .toolbar-content {
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .toolbar-content::-webkit-scrollbar {
    display: none;
  }

  .tool-label {
    display: none;
  }

  .tool-button {
    min-width: 56px;
    height: 48px;
    padding: 6px 8px;
  }

  .tool-name {
    font-size: 10px;
  }

  .toolbar-divider {
    height: 24px;
  }
}
</style>
