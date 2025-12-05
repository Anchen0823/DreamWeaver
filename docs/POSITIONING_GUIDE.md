# 前端图形编辑器定位指南

本文档旨在详细说明项目中各种 UI 元素（工具栏、选中框、图形元素等）的定位机制、坐标系转换逻辑以及常见问题的解决方案。

## 1. 核心坐标系概念

在项目中，我们需要处理两个主要的坐标系：

### A. 屏幕/视口坐标 (Viewport Coordinates)
- **原点**：浏览器可视区域左上角 (0, 0)。
- **单位**：CSS 像素。
- **用途**：
  - 鼠标事件 (`e.clientX`, `e.clientY`)。
  - `fixed` 定位的元素（如底部主工具栏 `Toolbar.vue`）。
  - `getBoundingClientRect()` 返回的值。

### B. 画布坐标 (Canvas Coordinates)
- **原点**：画布的起始点（无限画布的逻辑中心）。
- **变换**：受平移 (`viewportOffsetX/Y`) 和缩放 (`zoom`) 影响。
- **用途**：
  - 图形元素 (`element.x`, `element.y`) 的存储位置。
  - 浮动工具栏（如 `TextToolbar`, `ShapeToolbar`）的 CSS `top/left` 值。

---

## 2. DOM 结构与层叠上下文

理解 DOM 结构对于定位至关重要。所有的画布内容都包裹在具有变换属性的容器中。

```html
<!-- app/src/components/Canvas.vue -->

<!-- 1. 视口容器 (Viewport Container) -->
<div class="canvas-container" style="position: absolute; overflow: hidden;">
  
  <!-- 2. 画布世界 (Canvas World) -->
  <!-- 关键样式: transform: translate(offsetX, offsetY) scale(zoom) -->
  <div class="canvas" style="position: relative;">
    
    <!-- 3. 画布内容 (Canvas Content) -->
    <!-- 这些元素的位置是相对于 "画布世界" 的 -->
    <CanvasElement />   <!-- 图形元素 -->
    <CanvasSelection /> <!-- 选中框 -->
    <ShapeToolbar />    <!-- 浮动工具栏 -->
    
  </div>
</div>

<!-- 4. 固定 UI (Fixed UI) -->
<!-- 独立于画布，直接覆盖在屏幕上 -->
<Toolbar /> <!-- 底部主工具栏 -->
<BrushToolbar /> <!-- 二级菜单 -->
```

---

## 3. 定位策略详解

### 策略一：固定定位 (Fixed Positioning)
适用于：主工具栏 (`Toolbar.vue`)、二级菜单 (`BrushToolbar.vue`)、全局弹窗。

**特点**：
- 使用 CSS `position: fixed`。
- 不受画布平移和缩放的影响。
- **居中技巧**：
  不要依赖父元素的宽度计算。直接使用视口宽度。
  ```javascript
  // 推荐：始终居中
  left: 50%;
  transform: translateX(-50%);
  
  // 或者在 JS 中计算（如涉及复杂对齐）
  const centerX = window.innerWidth / 2;
  ```

### 策略二：画布相对定位 (Canvas-Relative Positioning)
适用于：跟随元素的浮动工具栏 (`ShapeToolbar`, `TextToolbar`)、选中框 (`CanvasSelection`)。

**特点**：
- 元素位于 `.canvas` 容器内。
- 自动继承父容器的 `transform` (平移和缩放)。
- **位置计算公式**：
  ```javascript
  // 目标：将工具栏放在元素上方 70px (屏幕像素) 的位置
  
  const toolbarX = element.x * viewport.scale + (element.width * viewport.scale) / 2;
  const toolbarY = element.y * viewport.scale - (70 / viewport.zoom);
  ```

**关键参数解释**：
1.  **`viewport.scale`** (响应式适配比例):
    *   本项目包含一个特殊的响应式逻辑，将设计稿尺寸 (1280px) 映射到当前屏幕。
    *   元素存储的坐标 (`element.x`) 需要乘以这个比例才能得到当前 DOM 中的实际 CSS 像素值。
    
2.  **`viewport.zoom`** (用户缩放级别):
    *   这是用户滚轮操作产生的缩放。
    *   **为什么偏移量要除以 zoom?**
        *   浮动工具栏在 `.canvas` 内部，它也被缩放了 `zoom` 倍。
        *   如果我们希望工具栏距离元素在屏幕上看起来是固定的 70px。
        *   在缩放后的坐标系中，我们需要移动 `70 / zoom` 个单位，才能在屏幕上呈现出 70px 的距离。
        *   例如：当 `zoom = 2` (放大2倍) 时，移动 35个单位 = 屏幕上的 70px。

---

## 4. 常见问题排查

### Q1: 浮动工具栏在缩放时位置偏移/飞走了？
**原因**：通常是因为在计算偏移量（Offset）时没有除以 `zoom`。
**修正**：
```javascript
// ❌ 错误：在缩放时，间距会变大或变小
const y = element.y - 70; 

// ✅ 正确：抵消缩放影响，保持视觉间距恒定
const y = element.y - (70 / viewport.zoom);
```

### Q2: 鼠标点击位置不准确？
**原因**：没有将屏幕坐标 (`e.clientX`) 正确转换为画布坐标。
**修正**：
使用 `useCanvasInteraction` 或类似的转换逻辑：
```javascript
// 屏幕 -> 画布
const canvasX = (e.clientX - viewportOffsetX) / zoom / scale;
const canvasY = (e.clientY - viewportOffsetY) / zoom / scale;
```

### Q3: 下拉菜单太靠右或位置不对？
**原因**：混用了坐标系。例如，试图用 `getBoundingClientRect()` (屏幕坐标) 去计算一个 `absolute` (相对于父容器) 定位的元素的 `left` 值，却忘了父容器本身可能有 `transform` 或不是 `body`。
**修正**：
- 如果是 `fixed` 元素，直接用 `window.innerWidth` 计算居中。
- 如果是跟随元素，确保参考点都在同一个坐标系下。

## 5. 最佳实践总结

1.  **分层管理**：将“画布内容”和“UI 控件”在 DOM 结构上物理分离。画布内容受 transform 影响，UI 控件（如主工具栏）尽量放在外面使用 fixed。
2.  **跟随 UI 放里面**：如果一个 UI 控件（如选中框）必须严格跟随元素移动和缩放，把它放在 `.canvas` 容器里，让 CSS Transform 帮你处理矩阵变换。
3.  **视觉恒定用除法**：任何放在 `.canvas` 里的元素，如果你希望它的大小或边距在视觉上保持不变（不随画布缩放而变大变小），你需要除以 `zoom`。
    *   例如：调整手柄的大小、边框的粗细、工具栏的垂直间距。


