<template>
  <div 
    v-if="visible"
    ref="dropdownRef"
    class="shape-dropdown"
    :style="dropdownStyle"
    @mousedown.stop
    @click.stop
  >
    <div 
      v-for="shape in shapes"
      :key="shape.type"
      class="dropdown-item"
      :class="{ active: isActive(shape.type) }"
      @click="handleSelectShape(shape.type)"
    >
      <component :is="shape.icon" class="dropdown-icon" />
      <span class="dropdown-label">{{ shape.label }}</span>
      <span v-if="shape.shortcut" class="dropdown-shortcut">{{ shape.shortcut }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import type { ElementType } from '../types/canvas'
import RectangleIcon from './icons/RectangleIcon.vue'
import RoundedRectangleIcon from './icons/RoundedRectangleIcon.vue'
import CircleIcon from './icons/CircleIcon.vue'
import TriangleIcon from './icons/TriangleIcon.vue'

const props = defineProps<{
  visible: boolean
  activeTool?: string | null
  position?: { x: number; y: number }
}>()

const emit = defineEmits<{
  'select-shape': [type: ElementType]
}>()

const dropdownRef = ref<HTMLElement>()

// 计算下拉菜单样式
const dropdownStyle = computed(() => {
  if (props.visible && props.position && props.position.y > 0) {
    const style: Record<string, string> = {
      bottom: `${props.position.y}px`,
      transform: 'translateX(-50%)' // 水平居中对齐
    }

    // 如果提供了有效的 x 坐标，使用绝对定位
    // 否则默认居中 (left: 50%)
    if (props.position.x > 0) {
      style.left = `${props.position.x}px`
    } else {
      style.left = '50%'
    }
    
    return style
  }
  // 默认位置（不应该使用，但作为后备）
  return {
    bottom: '96px',
    left: '50%',
    transform: 'translateX(-50%)'
  }
})

const shapes = [
  { type: 'rectangle' as ElementType, label: '矩形', icon: RectangleIcon, shortcut: 'R' },
  { type: 'rounded-rectangle' as ElementType, label: '圆角矩形', icon: RoundedRectangleIcon },
  { type: 'circle' as ElementType, label: '圆形', icon: CircleIcon, shortcut: 'O' },
  { type: 'triangle' as ElementType, label: '三角形', icon: TriangleIcon },
]

const isActive = (type: ElementType) => {
  return props.activeTool === type
}

const handleSelectShape = (type: ElementType) => {
  emit('select-shape', type)
}
</script>

<style scoped>
.shape-dropdown {
  position: fixed;
  background: #2d2d2d;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  min-width: 180px;
  pointer-events: auto;
  display: block;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  color: #e0e0e0;
}

.dropdown-item:hover {
  background: #3d3d3d;
}

.dropdown-item.active {
  background: #0ea5e9;
  color: #ffffff;
}

.dropdown-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.dropdown-label {
  flex: 1;
  font-size: 14px;
  font-weight: 400;
}

.dropdown-shortcut {
  font-size: 12px;
  color: #999;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-family: monospace;
}

.dropdown-item.active .dropdown-shortcut {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .shape-dropdown {
    min-width: 160px;
  }
  
  .dropdown-item {
    padding: 6px 10px;
  }
  
  .dropdown-label {
    font-size: 13px;
  }
  
  .dropdown-shortcut {
    font-size: 11px;
  }
}
</style>

