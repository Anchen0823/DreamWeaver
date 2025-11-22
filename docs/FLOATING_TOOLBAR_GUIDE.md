# 浮动调参栏实现指南

本文档基于文本浮动调参栏（`TextToolbar.vue`）的实现，为图形和照片调参栏提供参考。

## 目录

- [架构概述](#架构概述)
- [组件结构](#组件结构)
- [在 Canvas 中集成](#在-canvas-中集成)
- [位置计算](#位置计算)
- [属性更新处理](#属性更新处理)
- [样式规范](#样式规范)
- [实现示例](#实现示例)

## 架构概述

浮动调参栏是一个**独立的 Vue 组件**，当选中特定类型的元素时显示在元素上方。它具有以下特点：

- **条件显示**：仅在单选对应类型元素时显示
- **动态定位**：跟随元素位置和视口缩放自动调整
- **事件驱动**：通过 emit 事件向上传递属性变更
- **阻止冒泡**：防止工具栏交互影响画布操作

## 组件结构

### 1. 组件文件结构

```
src/components/
  ├── TextToolbar.vue      # 文本调参栏（参考实现）
  ├── ShapeToolbar.vue     # 图形调参栏（待实现）
  └── ImageToolbar.vue     # 照片调参栏（待实现）
```

### 2. 组件 Props

```typescript
const props = defineProps<{
  // 元素数据（对应类型的元素）
  element: ElementType | null
  
  // 是否可见
  visible: boolean
  
  // 工具栏位置（画布坐标系）
  position: { x: number; y: number }
  
  // 视口缩放比例（可选）
  scale?: number
}>()
```

### 3. 组件 Emits

```typescript
const emit = defineEmits<{
  // 为每个可调整的属性定义更新事件
  'update:propertyName': [value: PropertyType]
  // 例如：
  // 'update:backgroundColor': [value: string]
  // 'update:borderWidth': [value: number]
  // 'update:borderRadius': [value: number]
}>()
```

## 在 Canvas 中集成

### 1. 导入组件

```vue
<script setup lang="ts">
import ShapeToolbar from './ShapeToolbar.vue'
import ImageToolbar from './ImageToolbar.vue'
</script>
```

### 2. 添加计算属性

```typescript
// 选中的图形元素（单选且为图形类型时）
const selectedShapeElement = computed<ShapeElement | null>(() => {
  if (selection.selectedElementIds.value.length !== 1) {
    return null
  }
  const elementId = selection.selectedElementIds.value[0]
  const element = elements.value.find(el => el.id === elementId)
  return element && (element.type === 'rectangle' || 
                     element.type === 'rounded-rectangle' || 
                     element.type === 'circle' || 
                     element.type === 'triangle') 
    ? (element as ShapeElement) 
    : null
})

// 是否显示图形工具栏
const showShapeToolbar = computed(() => {
  return selectedShapeElement.value !== null
})

// 图形工具栏位置
const shapeToolbarPosition = computed(() => {
  if (!selectedShapeElement.value) {
    return { x: 0, y: 0 }
  }
  
  const element = selectedShapeElement.value
  
  // 使用画布坐标系，与选中框的计算方式一致
  // 工具栏显示在元素上方居中
  const toolbarX = element.x * viewport.scale.value + (element.width * viewport.scale.value) / 2
  const toolbarY = element.y * viewport.scale.value - 70 / viewport.zoom.value // 元素上方 70px（屏幕像素）
  
  return { x: toolbarX, y: toolbarY }
})
```

### 3. 添加属性更新处理函数

```typescript
// 处理图形属性更新
const handleShapePropertyUpdate = (property: string, value: any) => {
  if (!selectedShapeElement.value) {
    return
  }
  
  const elementId = selectedShapeElement.value.id
  const elementIndex = elements.value.findIndex(el => el.id === elementId)
  if (elementIndex === -1) {
    return
  }
  
  const element = elements.value[elementIndex] as ShapeElement
  
  // 创建新数组以确保响应式更新
  const newElements = [...elements.value]
  newElements[elementIndex] = {
    ...element,
    [property]: value
  }
  
  elements.value = newElements
}
```

### 4. 在模板中添加工具栏

```vue
<template>
  <div class="canvas">
    <!-- ... 其他内容 ... -->
    
    <!-- 图形浮动工具栏 -->
    <ShapeToolbar
      v-if="showShapeToolbar && selectedShapeElement"
      :element="selectedShapeElement"
      :visible="showShapeToolbar"
      :position="shapeToolbarPosition"
      :scale="viewport.scale.value"
      @update:background-color="handleShapePropertyUpdate('backgroundColor', $event)"
      @update:border-width="handleShapePropertyUpdate('borderWidth', $event)"
      @update:border-color="handleShapePropertyUpdate('borderColor', $event)"
      @update:border-radius="handleShapePropertyUpdate('borderRadius', $event)"
    />
    
    <!-- 照片浮动工具栏 -->
    <ImageToolbar
      v-if="showImageToolbar && selectedImageElement"
      :element="selectedImageElement"
      :visible="showImageToolbar"
      :position="imageToolbarPosition"
      :scale="viewport.scale.value"
      @update:filter="handleImagePropertyUpdate('filter', $event)"
      @update:filter-intensity="handleImagePropertyUpdate('filterIntensity', $event)"
    />
  </div>
</template>
```

## 位置计算

### 关键点

1. **使用画布坐标系**：位置计算需要考虑视口缩放（`viewport.scale.value`）
2. **居中显示**：工具栏在元素上方水平居中
3. **垂直偏移**：元素上方固定距离（如 70px），需要考虑缩放

### 位置计算公式

```typescript
const toolbarPosition = computed(() => {
  if (!selectedElement.value) {
    return { x: 0, y: 0 }
  }
  
  const element = selectedElement.value
  
  // X 坐标：元素中心点
  const toolbarX = element.x * viewport.scale.value + 
                   (element.width * viewport.scale.value) / 2
  
  // Y 坐标：元素上方 70px（屏幕像素），需要除以 zoom 转换为画布坐标
  const toolbarY = element.y * viewport.scale.value - 
                   70 / viewport.zoom.value
  
  return { x: toolbarX, y: toolbarY }
})
```

### 注意事项

- `element.x` 和 `element.y` 是画布坐标系中的位置
- `viewport.scale.value` 是当前视口的缩放比例
- `viewport.zoom.value` 是缩放倍数，用于将屏幕像素转换为画布坐标
- 工具栏使用 `transform: translateX(-50%)` 实现水平居中

## 属性更新处理

### 通用更新函数

```typescript
// 处理元素属性更新（通用函数）
const handleElementPropertyUpdate = (
  elementId: string,
  property: string,
  value: any
) => {
  const elementIndex = elements.value.findIndex(el => el.id === elementId)
  if (elementIndex === -1) {
    return
  }
  
  const element = elements.value[elementIndex]
  
  // 创建新数组以确保响应式更新
  const newElements = [...elements.value]
  newElements[elementIndex] = {
    ...element,
    [property]: value
  }
  
  elements.value = newElements
}
```

### 类型特定的更新函数

```typescript
// 图形属性更新
const handleShapePropertyUpdate = (property: string, value: any) => {
  if (!selectedShapeElement.value) return
  handleElementPropertyUpdate(
    selectedShapeElement.value.id,
    property,
    value
  )
}

// 照片属性更新
const handleImagePropertyUpdate = (property: string, value: any) => {
  if (!selectedImageElement.value) return
  handleElementPropertyUpdate(
    selectedImageElement.value.id,
    property,
    value
  )
}
```

## 样式规范

### 基础样式

```css
.toolbar {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10002; /* 确保在元素上方 */
  transform: translateX(-50%); /* 水平居中 */
  pointer-events: auto; /* 允许交互 */
}
```

### 阻止事件冒泡

```vue
<template>
  <div 
    class="toolbar"
    :style="toolbarStyle"
    @mousedown.stop
    @click.stop
  >
    <!-- 工具栏内容 -->
  </div>
</template>
```

**重要**：必须添加 `@mousedown.stop` 和 `@click.stop`，防止工具栏的交互触发画布的拖拽或选择操作。

### 组件分组

```css
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e5e5;
  margin: 0 4px;
}
```

## 实现示例

### 图形调参栏示例（ShapeToolbar.vue）

```vue
<template>
  <div 
    v-if="visible"
    class="shape-toolbar"
    :style="toolbarStyle"
    @mousedown.stop
    @click.stop
  >
    <!-- 背景色 -->
    <div class="toolbar-group">
      <ColorPicker
        :model-value="element.backgroundColor"
        @update:model-value="handleBackgroundColorChange"
        title="背景颜色"
      />
    </div>
    
    <!-- 分隔线 -->
    <div class="toolbar-divider"></div>
    
    <!-- 边框宽度 -->
    <div class="toolbar-group">
      <input
        type="number"
        :value="element.borderWidth"
        @input="handleBorderWidthChange"
        min="0"
        max="20"
        class="toolbar-input"
      />
      <span class="toolbar-label">px</span>
    </div>
    
    <!-- 边框颜色 -->
    <div class="toolbar-group">
      <ColorPicker
        :model-value="element.borderColor"
        @update:model-value="handleBorderColorChange"
        title="边框颜色"
      />
    </div>
    
    <!-- 圆角半径（仅圆角矩形） -->
    <div v-if="element.type === 'rounded-rectangle'" class="toolbar-group">
      <input
        type="number"
        :value="element.borderRadius || 0"
        @input="handleBorderRadiusChange"
        min="0"
        max="50"
        class="toolbar-input"
      />
      <span class="toolbar-label">px</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ShapeElement } from '../types/canvas'
import ColorPicker from './ColorPicker.vue'

const props = defineProps<{
  element: ShapeElement | null
  visible: boolean
  position: { x: number; y: number }
  scale?: number
}>()

const emit = defineEmits<{
  'update:backgroundColor': [value: string]
  'update:borderWidth': [value: number]
  'update:borderColor': [value: string]
  'update:borderRadius': [value: number]
}>()

const toolbarStyle = computed(() => {
  return {
    left: `${props.position.x}px`,
    top: `${props.position.y}px`
  }
})

const handleBackgroundColorChange = (value: string) => {
  emit('update:backgroundColor', value)
}

const handleBorderWidthChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value) && value >= 0 && value <= 20) {
    emit('update:borderWidth', value)
  }
}

const handleBorderColorChange = (value: string) => {
  emit('update:borderColor', value)
}

const handleBorderRadiusChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value) && value >= 0 && value <= 50) {
    emit('update:borderRadius', value)
  }
}
</script>

<style scoped>
/* 复用 TextToolbar 的样式 */
.shape-toolbar {
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

.toolbar-input {
  width: 60px;
  padding: 4px 8px;
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
</style>
```

### 照片调参栏示例（ImageToolbar.vue）

```vue
<template>
  <div 
    v-if="visible"
    class="image-toolbar"
    :style="toolbarStyle"
    @mousedown.stop
    @click.stop
  >
    <!-- 滤镜选择 -->
    <div class="toolbar-group">
      <select 
        :value="element.filter || 'none'"
        @change="handleFilterChange"
        class="toolbar-select"
      >
        <option value="none">无滤镜</option>
        <option value="grayscale">灰度</option>
        <option value="blur">模糊</option>
        <option value="contrast">对比度</option>
      </select>
    </div>
    
    <!-- 滤镜强度（某些滤镜需要） -->
    <div 
      v-if="element.filter && element.filter !== 'none'"
      class="toolbar-group"
    >
      <input
        type="number"
        :value="element.filterIntensity || 0"
        @input="handleFilterIntensityChange"
        min="0"
        max="100"
        class="toolbar-input"
      />
      <span class="toolbar-label">%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ImageElement } from '../types/canvas'

const props = defineProps<{
  element: ImageElement | null
  visible: boolean
  position: { x: number; y: number }
  scale?: number
}>()

const emit = defineEmits<{
  'update:filter': [value: 'none' | 'grayscale' | 'blur' | 'contrast']
  'update:filterIntensity': [value: number]
}>()

const toolbarStyle = computed(() => {
  return {
    left: `${props.position.x}px`,
    top: `${props.position.y}px`
  }
})

const handleFilterChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  emit('update:filter', target.value as any)
}

const handleFilterIntensityChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  if (!isNaN(value) && value >= 0 && value <= 100) {
    emit('update:filterIntensity', value)
  }
}
</script>

<style scoped>
/* 样式同 ShapeToolbar */
.image-toolbar {
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

.toolbar-input {
  width: 60px;
  padding: 4px 8px;
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
</style>
```

## 最佳实践

### 1. 条件渲染

始终使用 `v-if` 进行条件渲染，确保只在需要时创建组件：

```vue
<ShapeToolbar
  v-if="showShapeToolbar && selectedShapeElement"
  :element="selectedShapeElement"
  ...
/>
```

### 2. 事件处理

- 使用 `@mousedown.stop` 和 `@click.stop` 阻止事件冒泡
- 在输入框中同时监听 `@input` 和 `@change` 事件以获得更好的响应性
- 对数值输入进行验证和范围限制

### 3. 响应式更新

- 使用计算属性计算位置和样式
- 属性更新时创建新数组以确保 Vue 的响应式系统正确检测变化

### 4. 样式一致性

- 复用 `TextToolbar` 的样式类名和结构
- 保持工具栏的外观和交互体验一致
- 使用相同的 z-index 层级（10002）

### 5. 类型安全

- 使用 TypeScript 类型定义确保类型安全
- 为 props 和 emits 定义明确的类型
- 使用类型断言时确保类型正确

## 常见问题

### Q: 工具栏位置不正确？

A: 检查位置计算是否考虑了视口缩放，确保使用 `viewport.scale.value` 和 `viewport.zoom.value`。

### Q: 工具栏交互影响画布操作？

A: 确保添加了 `@mousedown.stop` 和 `@click.stop` 事件修饰符。

### Q: 属性更新不生效？

A: 确保在更新时创建新数组，而不是直接修改原数组，以触发 Vue 的响应式更新。

### Q: 多个工具栏同时显示？

A: 确保每个工具栏的显示条件互斥，使用不同的计算属性控制显示。

## 参考文件

- `app/src/components/TextToolbar.vue` - 文本调参栏参考实现
- `app/src/components/Canvas.vue` - 集成示例
- `app/src/types/canvas.ts` - 元素类型定义

