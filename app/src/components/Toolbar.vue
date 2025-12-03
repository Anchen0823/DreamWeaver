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

      <!-- 画笔工具 -->
      <div class="tool-group">
        <button 
          class="tool-button"
          :class="{ active: activeTool === 'brush' }"
          @click="handleSelectBrush"
          title="画笔"
        >
          <BrushIcon />
          <span class="tool-name">画笔</span>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="toolbar-divider"></div>

      <!-- 图形工具（下拉菜单） -->
      <div class="tool-group shape-group" ref="shapeGroupRef">
        <button 
          ref="shapeButtonRef"
          class="tool-button"
          :class="{ active: isShapeToolActive }"
          @click="handleShapeButtonClick"
          title="图形"
        >
          <component :is="currentShapeIcon" />
          <span class="tool-name">{{ currentShapeLabel }}</span>
        </button>
        <button 
          ref="shapeArrowRef"
          class="tool-button-arrow"
          :class="{ active: showShapeDropdown || isShapeToolActive }"
          @click="toggleShapeDropdown"
          title="选择图形"
        >
          <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
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

    <!-- 画笔工具栏（二级栏） -->
    <BrushToolbar
      v-if="activeTool === 'brush'"
      :color="brushColor || '#000000'"
      :stroke-width="brushStrokeWidth || 2"
      :visible="activeTool === 'brush'"
      @update:color="handleBrushColorChange"
      @update:stroke-width="handleBrushStrokeWidthChange"
    />

    <!-- 图形下拉菜单 -->
    <ShapeDropdown
      :visible="showShapeDropdown"
      :active-tool="activeTool"
      :position="shapeDropdownPosition"
      @select-shape="handleShapeDropdownSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { ElementType } from '../types/canvas'
import MoveIcon from './icons/MoveIcon.vue'
import RectangleIcon from './icons/RectangleIcon.vue'
import RoundedRectangleIcon from './icons/RoundedRectangleIcon.vue'
import CircleIcon from './icons/CircleIcon.vue'
import TriangleIcon from './icons/TriangleIcon.vue'
import ImageIcon from './icons/ImageIcon.vue'
import TextIcon from './icons/TextIcon.vue'
import BrushIcon from './icons/BrushIcon.vue'
import BrushToolbar from './BrushToolbar.vue'
import ShapeDropdown from './ShapeDropdown.vue'

// 定义props和事件
const props = defineProps<{
  activeTool?: string | null
  brushColor?: string
  brushStrokeWidth?: number
}>()

const emit = defineEmits<{
  'update:activeTool': [tool: string | null]
  'image-selected': [src: string, width: number, height: number]
  'brush-color-change': [color: string]
  'brush-stroke-width-change': [width: number]
}>()

const fileInputRef = ref<HTMLInputElement>()
const shapeGroupRef = ref<HTMLElement>()
const shapeButtonRef = ref<HTMLButtonElement>()
const shapeArrowRef = ref<HTMLButtonElement>()
const showShapeDropdown = ref(false)
const shapeDropdownPosition = ref({ x: 0, y: 0 })

// 图形工具配置
const shapeConfig = {
  'rectangle': { icon: RectangleIcon, label: '矩形' },
  'rounded-rectangle': { icon: RoundedRectangleIcon, label: '圆角矩形' },
  'circle': { icon: CircleIcon, label: '圆形' },
  'triangle': { icon: TriangleIcon, label: '三角形' },
}

// 当前选中的图形图标和标签
const currentShapeIcon = computed(() => {
  const shapeType = getCurrentShapeType()
  return shapeConfig[shapeType as keyof typeof shapeConfig]?.icon || RectangleIcon
})

const currentShapeLabel = computed(() => {
  const shapeType = getCurrentShapeType()
  return shapeConfig[shapeType as keyof typeof shapeConfig]?.label || '图形'
})

// 判断是否是图形工具激活
const isShapeToolActive = computed(() => {
  return props.activeTool === 'rectangle' || 
         props.activeTool === 'rounded-rectangle' || 
         props.activeTool === 'circle' || 
         props.activeTool === 'triangle'
})

// 获取当前选中的图形类型
const getCurrentShapeType = (): ElementType => {
  if (props.activeTool === 'rectangle' || 
      props.activeTool === 'rounded-rectangle' || 
      props.activeTool === 'circle' || 
      props.activeTool === 'triangle') {
    return props.activeTool as ElementType
  }
  return 'rectangle' // 默认返回矩形
}

// 处理选择Move工具（默认状态）
const handleSelectMove = () => {
  showShapeDropdown.value = false
  emit('update:activeTool', null)
}

// 处理图形按钮点击
const handleShapeButtonClick = () => {
  // 如果当前没有选中图形工具，选择默认的矩形
  if (!isShapeToolActive.value) {
    emit('update:activeTool', 'rectangle')
  } else {
    // 如果已经选中，取消选择
    emit('update:activeTool', null)
  }
  showShapeDropdown.value = false
}

// 切换图形下拉菜单
const toggleShapeDropdown = async (e?: MouseEvent) => {
  e?.stopPropagation()
  const wasVisible = showShapeDropdown.value
  
  if (!wasVisible && shapeButtonRef.value && shapeGroupRef.value) {
    // 使用图形按钮组的位置，定位到按钮上方
    const groupRect = shapeGroupRef.value.getBoundingClientRect()

    // 计算下拉菜单位置
    // 下拉菜单应该在工具栏上方 8px，使用 bottom 定位
    // 下拉菜单底部距离视口底部 = 窗口高度 - (工具栏顶部 - 8)
    const windowHeight = window.innerHeight
    const dropdownBottom = windowHeight - (groupRect.top - 8)

    shapeDropdownPosition.value = {
      x: 0, // 0 表示使用 CSS left: 50% 居中，参考画笔工具二级菜单
      y: dropdownBottom // 下拉菜单底部距离视口底部的距离
    }
    // 等待 DOM 更新后再显示
    await nextTick()
  }
  
  showShapeDropdown.value = !wasVisible
}

// 处理图形下拉菜单选择
const handleShapeDropdownSelect = (type: ElementType) => {
  const toolType = type as string
  // 如果点击的是已选中的工具，则取消选择
  if (props.activeTool === toolType) {
    emit('update:activeTool', null)
  } else {
    emit('update:activeTool', toolType)
  }
  showShapeDropdown.value = false
}

// 点击外部关闭下拉菜单
const handleClickOutside = (e: MouseEvent) => {
  if (!showShapeDropdown.value) return
  
  const target = e.target as Node
  // 检查点击是否在下拉菜单或按钮组内
  const clickedInsideDropdown = (e.target as HTMLElement)?.closest('.shape-dropdown')
  const clickedInsideButton = shapeGroupRef.value?.contains(target)
  
  if (!clickedInsideDropdown && !clickedInsideButton) {
    showShapeDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

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

// 处理选择画笔工具
const handleSelectBrush = () => {
  // 如果点击的是已选中的工具，则取消选择
  if (props.activeTool === 'brush') {
    emit('update:activeTool', null)
  } else {
    emit('update:activeTool', 'brush')
  }
}

// 处理画笔颜色变更
const handleBrushColorChange = (color: string) => {
  emit('brush-color-change', color)
}

// 处理画笔宽度变更
const handleBrushStrokeWidthChange = (width: number) => {
  emit('brush-stroke-width-change', width)
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
  white-space: nowrap;
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

.shape-group {
  display: flex;
  align-items: center;
  gap: 0;
}

.shape-group .tool-button {
  border-radius: 6px 0 0 6px;
}

.tool-button-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  min-width: 32px;
  height: 56px;
  border: none;
  background: transparent;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #333;
}

.tool-button-arrow:hover {
  background: #f5f5f5;
}

.tool-button-arrow.active {
  background: #e8f4ff;
  color: #0066ff;
}

.tool-button-arrow:active {
  transform: scale(0.95);
}

.dropdown-arrow {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.tool-button-arrow:hover .dropdown-arrow {
  opacity: 1;
}

.tool-name {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
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

  .tool-button-arrow {
    min-width: 28px;
    height: 48px;
    padding: 6px 4px;
  }

  .shape-group {
    gap: 0;
  }
}
</style>
