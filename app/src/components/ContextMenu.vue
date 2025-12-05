<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu"
      :style="{
        left: position.x + 'px',
        top: position.y + 'px'
      }"
      @click.stop
      @mousedown.stop
    >
      <div class="context-menu-item" @click="handleCopy">
        <span class="menu-icon">📋</span>
        <span class="menu-label">复制</span>
        <span class="menu-shortcut">Ctrl+C</span>
      </div>
      <div 
        class="context-menu-item" 
        :class="{ disabled: !canPaste }"
        @click="handlePaste"
      >
        <span class="menu-icon">📄</span>
        <span class="menu-label">粘贴</span>
        <span class="menu-shortcut">Ctrl+V</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleDelete">
        <span class="menu-icon">🗑️</span>
        <span class="menu-label">删除</span>
        <span class="menu-shortcut">Delete</span>
      </div>
      <div class="context-menu-divider"></div>
      <div 
        class="context-menu-item" 
        :class="{ disabled: !canGroup }"
        @click="handleGroup"
      >
        <span class="menu-icon">📦</span>
        <span class="menu-label">编组</span>
        <span class="menu-shortcut" v-if="canGroup">Ctrl+G</span>
        <span class="menu-hint" v-else>(需选中多个元素)</span>
      </div>
      <div 
        class="context-menu-item" 
        :class="{ disabled: !canUngroup }"
        @click="handleUngroup"
      >
        <span class="menu-icon">📂</span>
        <span class="menu-label">解组</span>
        <span class="menu-shortcut" v-if="canUngroup">Ctrl+Shift+G</span>
        <span class="menu-hint" v-else>(需选中组合元素)</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CanvasElement } from '../types/canvas'

interface Props {
  visible: boolean
  position: { x: number; y: number }
  selectedElements: CanvasElement[]
  hasClipboard: boolean
}

interface Emits {
  (e: 'copy'): void
  (e: 'paste'): void
  (e: 'delete'): void
  (e: 'group'): void
  (e: 'ungroup'): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算是否可以粘贴
const canPaste = computed(() => props.hasClipboard)

// 计算是否可以编组（需要选中至少2个元素）
const canGroup = computed(() => props.selectedElements.length >= 2)

// 计算是否可以解组（需要选中至少1个组合元素）
const canUngroup = computed(() => {
  return props.selectedElements.some(el => el.type === 'group')
})

// 处理复制
const handleCopy = () => {
  emit('copy')
  emit('close')
}

// 处理粘贴
const handlePaste = () => {
  if (!canPaste.value) return
  emit('paste')
  emit('close')
}

// 处理删除
const handleDelete = () => {
  emit('delete')
  emit('close')
}

// 处理编组
const handleGroup = () => {
  if (!canGroup.value) return
  emit('group')
  emit('close')
}

// 处理解组
const handleUngroup = () => {
  if (!canUngroup.value) return
  emit('ungroup')
  emit('close')
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  padding: 4px 0;
  z-index: 10000;
  font-size: 14px;
  user-select: none;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
  gap: 8px;
}

.context-menu-item:hover:not(.disabled) {
  background-color: #f5f5f5;
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.menu-label {
  flex: 1;
  color: #333;
}

.menu-shortcut {
  color: #999;
  font-size: 12px;
  margin-left: auto;
}

.menu-hint {
  color: #999;
  font-size: 11px;
  margin-left: auto;
}

.context-menu-divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 4px 8px;
}
</style>

