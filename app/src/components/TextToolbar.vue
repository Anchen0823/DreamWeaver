<template>
  <div 
    v-if="visible"
    class="text-toolbar"
    :style="toolbarStyle"
    @mousedown.stop
    @click.stop
  >
    <!-- 字体族选择 -->
    <div class="toolbar-group">
      <select 
        :value="textElement.fontFamily"
        @change="handleFontFamilyChange"
        class="toolbar-select"
      >
        <option value="Arial, sans-serif">Arial</option>
        <option value="'Times New Roman', serif">Times New Roman</option>
        <option value="'Courier New', monospace">Courier New</option>
        <option value="'Helvetica Neue', sans-serif">Helvetica</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Verdana, sans-serif">Verdana</option>
      </select>
    </div>

    <!-- 字号调整 -->
    <div class="toolbar-group">
      <input
        type="number"
        :value="textElement.fontSize"
        @input="handleFontSizeChange"
        @change="handleFontSizeChange"
        min="8"
        max="200"
        class="toolbar-input"
      />
      <span class="toolbar-label">px</span>
    </div>

    <!-- 文字颜色 -->
    <div class="toolbar-group">
      <ColorPicker
        :model-value="textElement.color"
        @update:model-value="handleColorChange"
        title="文字颜色"
      />
    </div>

    <!-- 背景色 -->
    <div class="toolbar-group">
      <ColorPicker
        :model-value="textElement.backgroundColor || '#ffffff'"
        @update:model-value="handleBackgroundColorChange"
        title="背景颜色"
      />
    </div>

    <!-- 分隔线 -->
    <div class="toolbar-divider"></div>

    <!-- 文本样式按钮 -->
    <div class="toolbar-group">
      <button
        :class="['toolbar-button', { active: textElement.bold }]"
        @click="handleToggleBold"
        title="加粗"
      >
        <strong>B</strong>
      </button>
      <button
        :class="['toolbar-button', { active: textElement.italic }]"
        @click="handleToggleItalic"
        title="斜体"
      >
        <em>I</em>
      </button>
      <button
        :class="['toolbar-button', { active: textElement.underline }]"
        @click="handleToggleUnderline"
        title="下划线"
      >
        <u>U</u>
      </button>
      <button
        :class="['toolbar-button', { active: textElement.strikethrough }]"
        @click="handleToggleStrikethrough"
        title="删除线"
      >
        <s>S</s>
      </button>
    </div>

    <!-- 分隔线 -->
    <div class="toolbar-divider"></div>

    <!-- 对齐方式 -->
    <div class="toolbar-group">
      <button
        :class="['toolbar-button', { active: textElement.textAlign === 'left' }]"
        @click="handleAlignChange('left')"
        title="左对齐"
      >
        ⬅
      </button>
      <button
        :class="['toolbar-button', { active: textElement.textAlign === 'center' }]"
        @click="handleAlignChange('center')"
        title="居中"
      >
        ⬌
      </button>
      <button
        :class="['toolbar-button', { active: textElement.textAlign === 'right' }]"
        @click="handleAlignChange('right')"
        title="右对齐"
      >
        ➡
      </button>
    </div>

    <!-- 行高调整 -->
    <div class="toolbar-group">
      <input
        type="number"
        :value="textElement.lineHeight || 1.5"
        @input="handleLineHeightChange"
        @change="handleLineHeightChange"
        min="0.5"
        max="3"
        step="0.1"
        class="toolbar-input-small"
        title="行高"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TextElement } from '../types/canvas'
import ColorPicker from './ColorPicker.vue'

const props = defineProps<{
  textElement: TextElement | null
  visible: boolean
  position: { x: number; y: number }
  scale?: number
}>()

const emit = defineEmits<{
  'update:fontFamily': [value: string]
  'update:fontSize': [value: number]
  'update:color': [value: string]
  'update:backgroundColor': [value: string]
  'update:bold': [value: boolean]
  'update:italic': [value: boolean]
  'update:underline': [value: boolean]
  'update:strikethrough': [value: boolean]
  'update:textAlign': [value: 'left' | 'center' | 'right']
  'update:lineHeight': [value: number]
}>()

// 工具栏样式（位置）
const toolbarStyle = computed(() => {
  return {
    left: `${props.position.x}px`,
    top: `${props.position.y}px`
  }
})

// 字体族变更
const handleFontFamilyChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  emit('update:fontFamily', target.value)
}

// 字号变更
const handleFontSizeChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value) && value >= 8 && value <= 200) {
    emit('update:fontSize', value)
  }
}

// 颜色变更
const handleColorChange = (value: string) => {
  emit('update:color', value)
}

// 背景色变更
const handleBackgroundColorChange = (value: string) => {
  emit('update:backgroundColor', value)
}

// 切换加粗
const handleToggleBold = () => {
  emit('update:bold', !props.textElement?.bold)
}

// 切换斜体
const handleToggleItalic = () => {
  emit('update:italic', !props.textElement?.italic)
}

// 切换下划线
const handleToggleUnderline = () => {
  emit('update:underline', !props.textElement?.underline)
}

// 切换删除线
const handleToggleStrikethrough = () => {
  emit('update:strikethrough', !props.textElement?.strikethrough)
}

// 对齐方式变更
const handleAlignChange = (align: 'left' | 'center' | 'right') => {
  emit('update:textAlign', align)
}

// 行高变更
const handleLineHeightChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!isNaN(value) && value >= 0.5 && value <= 3) {
    emit('update:lineHeight', value)
  }
}
</script>

<style scoped>
.text-toolbar {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10002;
  transform: translateX(-50%);
  pointer-events: auto;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
  min-width: 100px;
}

.toolbar-select:hover {
  border-color: #999;
}

.toolbar-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.toolbar-input-small {
  width: 50px;
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.toolbar-label {
  font-size: 12px;
  color: #666;
  margin-left: 2px;
}


.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e5e5;
  margin: 0 4px;
}

.toolbar-button {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.toolbar-button:hover {
  background: #f5f5f5;
  border-color: #999;
}

.toolbar-button.active {
  background: #e8f4ff;
  border-color: #4a90e2;
  color: #0066ff;
}

.toolbar-button strong,
.toolbar-button em,
.toolbar-button u,
.toolbar-button s {
  font-style: normal;
  text-decoration: none;
  font-weight: normal;
}

.toolbar-button.active strong {
  font-weight: bold;
}

.toolbar-button.active em {
  font-style: italic;
}

.toolbar-button.active u {
  text-decoration: underline;
}

.toolbar-button.active s {
  text-decoration: line-through;
}
</style>

