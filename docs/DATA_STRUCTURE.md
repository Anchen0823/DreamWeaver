# 数据结构设计

## 📋 更新记录

- **v1.5.0** (2025-12-XX): 实现组合元素功能
  - 新增 GroupElement 接口定义
  - 支持递归树形结构，无限层级嵌套
  - 实现相对坐标系统（子元素相对父组合定位）
  - 实现组合创建功能（useElementGrouping composable）
  - 实现组合解散功能（支持递归解散嵌套组合）
  - 自动计算组合边界框
  - 坐标自动转换（全局坐标 ↔ 相对坐标）
  - 保持元素层级关系
  - 详细的数据结构设计文档

- **v1.4.0** (2025-12-XX): 实现画笔工具功能
  - 新增 BrushElement 接口定义
  - 支持路径点数组存储画笔轨迹
  - 支持画笔颜色、宽度和样式配置
  - 预留压感支持（pressure 字段）
  - 实现画笔绘制功能（useBrushDrawing composable）
  - 实现 SVG path 渲染画笔轨迹
  - 画笔模式下不会选中元素，方便绘制相交笔画
  - 支持从元素框内起笔绘制
  - 绘制完成后保持画笔模式，支持连续绘制
  - 图层面板支持画笔元素缩略图显示

- **v1.3.1** (2025-12-XX): 修复三角形轮廓渲染问题
  - 修复三角形图形元素的轮廓渲染不正确的问题
  - 使用 clip-path 和伪元素实现三角形轮廓
  - 从三角形重心点统一缩放，保持内外三角形相似性
  - 优化预览组件中的三角形轮廓渲染

- **v1.3.0** (2025-12-XX): 添加图层面板和元素调整大小功能
  - 实现左侧图层面板组件（LayersPanel）
  - 实现图层缩略图组件（LayerThumbnail）
  - 支持点击图层选择元素，Ctrl/Cmd 多选
  - 优化元素调整大小交互（角点和边缘拖动）
  - 尺寸标签移至元素下方中心
  - 优化滚动条显示（悬停时显示）
  - 修复三角形缩略图显示问题

- **v1.2.0** (2025-12-XX): 添加工具栏和拖拽绘制功能
  - 实现底部工具栏组件（漂浮卡片样式）
  - 添加Move工具作为默认选择工具
  - 实现拖拽绘制功能（图形、图片、文本）
  - 添加绘制预览（选中框轮廓、尺寸标签）
  - 实现文本字体大小自适应功能
  - 实现复制粘贴功能
  - 优化绘制体验和交互流程

- **v1.1.0** (2025-11-19): 添加响应式布局支持
  - 实现动态缩放比例计算
  - 支持多设备适配（桌面/平板/手机）
  - 优化图形元素渲染（三角形、圆角矩形）
  - 添加媒体查询和断点管理

## 一、核心数据模型概览

DreamWeaver 采用基于 DOM 的渲染方案，核心数据模型围绕**画布元素（Canvas Element）**展开。所有可渲染的元素都遵循统一的基础接口，通过类型区分不同的元素类型。

**🎨 响应式设计特性**：系统支持响应式布局，元素会根据画布实际尺寸自动缩放，保持设计的相对比例和外观。

## 二、当前实现的数据结构

### 1. 基础元素接口 (BaseElement)

所有画布元素的基础属性，定义了元素在画布中的位置、尺寸和通用属性：

```typescript
interface BaseElement {
  id: string              // 唯一标识符
  type: ElementType       // 元素类型
  x: number               // X坐标（像素）
  y: number               // Y坐标（像素）
  width: number           // 宽度（像素）
  height: number          // 高度（像素）
  rotation?: number       // 旋转角度（未来扩展）
  locked?: boolean        // 是否锁定（未来扩展）
  visible?: boolean       // 是否可见（未来扩展）
  zIndex?: number         // 图层顺序（未来扩展）
}
```

### 2. 元素类型枚举

```typescript
type ElementType = 
  | 'rectangle'           // 矩形
  | 'rounded-rectangle'   // 圆角矩形
  | 'circle'              // 圆形
  | 'triangle'            // 三角形
  | 'image'               // 图片
  | 'text'                // 富文本
  | 'brush'               // 画笔痕迹
  | 'group'               // 组合（未来扩展）
```

### 3. 图形元素接口 (ShapeElement)

```typescript
interface ShapeElement extends BaseElement {
  type: 'rectangle' | 'rounded-rectangle' | 'circle' | 'triangle'
  backgroundColor: string    // 背景色（CSS颜色值）
  borderWidth: number        // 边框宽度（像素）
  borderColor: string        // 边框颜色（CSS颜色值）
  borderRadius?: number      // 圆角半径（仅圆角矩形使用）
}
```

### 4. 图片元素接口 (ImageElement)

```typescript
interface ImageElement extends BaseElement {
  type: 'image'
  src: string                    // 图片URL（base64 或 外部URL 或 /public路径）
  originalWidth: number          // 图片原始宽度
  originalHeight: number         // 图片原始高度
  filter?: 'none' | 'grayscale' | 'blur' | 'contrast'  // 滤镜类型
  filterIntensity?: number        // 滤镜强度（0-100）
}
```

### 5. 文本元素接口 (TextElement)

```typescript
interface TextElement extends BaseElement {
  type: 'text'
  content: string                 // 文本内容
  fontFamily: string              // 字体族
  fontSize: number                // 字号（像素）
  color: string                   // 文字颜色
  backgroundColor?: string        // 背景色（可选，默认透明）
  bold?: boolean                 // 加粗
  italic?: boolean               // 斜体
  underline?: boolean            // 下划线
  strikethrough?: boolean         // 删除线
  textAlign?: 'left' | 'center' | 'right'  // 对齐方式
  lineHeight?: number             // 行高
}
```

### 6. 画笔痕迹元素接口 (BrushElement)

```typescript
// 画笔痕迹点坐标
interface BrushPoint {
  x: number      // X坐标（相对于元素左上角）
  y: number      // Y坐标（相对于元素左上角）
  pressure?: number  // 压力值（0-1，可选，用于未来支持压感）
}

// 画笔痕迹元素
interface BrushElement extends BaseElement {
  type: 'brush'
  points: BrushPoint[]            // 路径点数组（相对于元素左上角的坐标）
  color: string                   // 画笔颜色（CSS颜色值）
  strokeWidth: number              // 画笔宽度（像素）
  lineCap?: 'butt' | 'round' | 'square'  // 线帽样式（可选）
  lineJoin?: 'miter' | 'round' | 'bevel' // 连接样式（可选）
}
```

**说明**：
- `points` 数组存储画笔轨迹的所有点，每个点的坐标相对于元素的左上角（`x`, `y`）
- `width` 和 `height` 应该根据 `points` 的边界框自动计算
- `lineCap` 和 `lineJoin` 用于控制画笔线条的样式，默认为 `'round'`
- `pressure` 字段预留用于未来支持压感笔设备

### 7. 组合元素接口 (GroupElement)

```typescript
interface GroupElement extends BaseElement {
  type: 'group'
  children: CanvasElement[]       // 子元素列表（支持任意嵌套）
}
```

**设计原则**：

#### 7.1 递归树形结构
- 组合元素可以包含任意类型的子元素，包括其他组合元素
- 支持无限层级嵌套，形成树形结构
- `CanvasElement` 联合类型包含 `GroupElement`，实现递归定义

#### 7.2 相对坐标系统
- **组合元素坐标**：`x`, `y` 是组合左上角相对于父容器（画布或父组合）的坐标
- **子元素坐标**：`children` 中每个子元素的 `x`, `y` 是相对于组合左上角的坐标
- **边界框计算**：组合的 `width` 和 `height` 由所有子元素的边界框自动计算

#### 7.3 坐标转换规则

**组合创建时**（全局坐标 → 相对坐标）：
```typescript
// 1. 计算组合的边界框
const minX = Math.min(...selectedElements.map(el => el.x))
const minY = Math.min(...selectedElements.map(el => el.y))
const maxX = Math.max(...selectedElements.map(el => el.x + el.width))
const maxY = Math.max(...selectedElements.map(el => el.y + el.height))

// 2. 组合元素的位置和尺寸
groupElement.x = minX
groupElement.y = minY
groupElement.width = maxX - minX
groupElement.height = maxY - minY

// 3. 子元素坐标转换为相对坐标
child.x = child.x - groupElement.x
child.y = child.y - groupElement.y
```

**组合解散时**（相对坐标 → 全局坐标）：
```typescript
// 子元素坐标转换回全局坐标
child.x = child.x + groupElement.x
child.y = child.y + groupElement.y
```

#### 7.4 层级管理
- 组合元素在元素列表中占据一个位置，保持原有元素的层级关系
- 组合内部的子元素层级由 `children` 数组的顺序决定（数组靠后的元素在上层）
- 移动组合时，所有子元素随之移动（保持相对位置）
- 组合的变换（移动、缩放、旋转）会影响所有子元素

#### 7.5 递归渲染
- 渲染组合时递归渲染所有子元素
- 子元素继承父组合的变换矩阵（坐标偏移、缩放、旋转等）
- 支持嵌套组合的多层变换叠加

### 8. 画布元素联合类型

```typescript
type CanvasElement = ShapeElement | ImageElement | TextElement | BrushElement | GroupElement
```

### 9. 画布配置接口

```typescript
interface CanvasConfig {
  width: number           // 画布宽度（像素）
  height: number          // 画布高度（像素）
  backgroundColor?: string // 画布背景色
  infinite?: boolean      // 是否无限画布（未来扩展）
}
```

### 10. 视口状态接口（未来扩展）

```typescript
interface ViewportState {
  zoom: number            // 缩放比例（1.0 为原始大小）
  offsetX: number          // 视口X轴偏移量（像素）
  offsetY: number         // 视口Y轴偏移量（像素）
  minZoom?: number        // 最小缩放比例
  maxZoom?: number        // 最大缩放比例
}
```

### 11. 画布状态接口（未来扩展）

```typescript
interface CanvasState {
  config: CanvasConfig           // 画布配置
  viewport: ViewportState        // 视口状态
  elements: CanvasElement[]      // 所有画布元素
  selectedElementIds: string[]   // 选中的元素ID列表
}
```

## 三、响应式设计机制

### 1. 缩放比例计算

系统通过动态计算缩放比例来实现响应式布局：

```typescript
// 设计稿基准宽度（1280px）
const DESIGN_WIDTH = 1280

// 实时计算缩放比例
scale = actualCanvasWidth / DESIGN_WIDTH
```

### 2. 元素尺寸转换

所有元素尺寸都会基于缩放比例进行转换：

```typescript
// 位置坐标
actualX = element.x * scale
actualY = element.y * scale

// 尺寸
actualWidth = element.width * scale
actualHeight = element.height * scale

// 字体大小
actualFontSize = element.fontSize * scale
```

### 3. 响应式断点

系统支持三种主要屏幕尺寸：

- **桌面端** (> 768px): 完整功能显示
- **平板端** (≤ 768px): 优化间距和字体
- **手机端** (≤ 480px): 最小化布局，圆角边框

### 4. 保持绝对值的属性

以下属性在缩放时保持绝对像素值：
- `borderWidth`: 边框宽度（UI一致性）
- `borderRadius`: 圆角半径（视觉效果）
- `filterIntensity`: 滤镜强度（效果强度）
- `originalWidth/originalHeight`: 图片原始尺寸（用于计算比例）

## 四、数据结构设计原则

### 1. 可扩展性
- 使用联合类型（Union Types）支持多种元素类型
- 通过接口继承实现属性复用
- 预留可选属性支持未来功能扩展

### 2. 类型安全
- 所有数据结构使用 TypeScript 接口定义
- 通过类型守卫区分不同元素类型
- 避免使用 `any` 类型

### 3. 响应式设计考虑
- 数据存储使用设计稿原始尺寸，渲染时动态计算实际尺寸
- 缩放比例实时计算，支持窗口大小变化
- 保持关键视觉属性（如边框宽度）的绝对值，确保UI一致性

### 4. 性能考虑
- 元素ID使用字符串，便于快速查找
- 选中状态使用ID数组，避免存储完整对象引用
- 响应式计算优化，避免频繁重绘
- 支持按需加载（未来扩展）

### 5. 组合元素设计考虑
- **递归结构**：支持无限层级嵌套，适用于复杂的设计场景
- **相对坐标系**：简化子元素的定位计算，组合移动时子元素自动跟随
- **边界框自动计算**：组合尺寸由子元素决定，保证视觉一致性
- **坐标转换**：组合/解散时自动处理坐标转换，对用户透明
- **层级保持**：创建组合时保持原有元素的层级关系
- **深拷贝处理**：避免引用问题，确保数据独立性
- **递归渲染**：支持嵌套组合的多层变换叠加
- **未来扩展**：预留空间支持组合整体变换（缩放、旋转）和深层选择

## 五、当前实现状态

### ✅ 已实现
- BaseElement 基础接口定义
- ShapeElement 图形元素接口（矩形、圆角矩形、圆形、三角形）
- ImageElement 图片元素接口（支持PNG、JPEG，3种滤镜）
- TextElement 文本元素接口（支持BIUS样式，字体大小自适应）
- BrushElement 画笔痕迹元素接口（支持路径点数组、画笔颜色和宽度）
- **GroupElement 组合元素接口**（支持递归嵌套、相对坐标系统、层级管理）
- CanvasElement 联合类型
- CanvasConfig 画布配置接口
- **响应式布局系统**（动态缩放、媒体查询、多设备适配）
- **工具栏系统**（Move工具、图形工具、图片工具、文本工具、画笔工具）
- **拖拽绘制功能**（实时预览、选中框轮廓、尺寸标签）
- **画笔绘制功能**（路径点记录、SVG渲染、连续绘制）
- **复制粘贴功能**（支持多选元素）
- **组合/解散功能**（支持多选元素组合、递归解散、坐标转换）
- **三角形轮廓渲染**（使用 clip-path 和伪元素，从重心点缩放保持相似性）

### ⏳ 待实现
- ViewportState 视口状态管理（目前使用简化实现）
- CanvasState 完整画布状态管理
- 数据持久化结构
- 高级响应式特性（自定义断点、设备特定样式）
- **画笔工具栏**（用于设置画笔颜色、宽度等属性）
- **橡皮工具实现**（擦除画笔痕迹的功能）
- **压感支持**（利用 pressure 字段实现压感笔设备支持）
- **组合元素变换**（组合整体缩放、旋转等操作）
- **深层选择支持**（在组合内部直接选择子元素）

## 六、数据示例

### 📝 数据存储说明

**重要**：数据中存储的是设计稿的原始尺寸（基于1280px宽度设计稿），实际渲染时会根据画布当前尺寸进行缩放。

### 图形元素示例
```json
{
  "id": "rect1",
  "type": "rectangle",
  "x": 50,
  "y": 50,
  "width": 100,
  "height": 80,
  "backgroundColor": "#ff6b6b",
  "borderWidth": 2,
  "borderColor": "#ff4757"
}
```

### 图片元素示例
```json
{
  "id": "image1",
  "type": "image",
  "x": 50,
  "y": 200,
  "width": 150,
  "height": 100,
  "src": "/test1.jpg",
  "originalWidth": 150,
  "originalHeight": 100,
  "filter": "none"
}
```

### 文本元素示例
```json
{
  "id": "text1",
  "type": "text",
  "x": 250,
  "y": 200,
  "width": 200,
  "height": 60,
  "content": "Hello DreamWeaver!",
  "fontFamily": "Arial, sans-serif",
  "fontSize": 24,
  "color": "#333333",
  "bold": true,
  "italic": false,
  "underline": false,
  "strikethrough": false,
  "textAlign": "left",
  "lineHeight": 1.5
}
```

### 画笔痕迹元素示例
```json
{
  "id": "brush1",
  "type": "brush",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 150,
  "points": [
    { "x": 0, "y": 0 },
    { "x": 50, "y": 30 },
    { "x": 100, "y": 50 },
    { "x": 150, "y": 80 },
    { "x": 200, "y": 100 },
    { "x": 180, "y": 130 },
    { "x": 150, "y": 150 }
  ],
  "color": "#ff6b6b",
  "strokeWidth": 5,
  "lineCap": "round",
  "lineJoin": "round"
}
```

**说明**：
- `points` 数组中的坐标是相对于元素左上角（`x`, `y`）的偏移量
- `width` 和 `height` 应该根据 `points` 的边界框自动计算（包含画笔宽度的一半作为边距）
- `lineCap` 和 `lineJoin` 默认为 `'round'`，提供平滑的画笔效果

### 组合元素示例
```json
{
  "id": "group1",
  "type": "group",
  "name": "Group 1",
  "x": 50,
  "y": 50,
  "width": 250,
  "height": 200,
  "children": [
    {
      "id": "rect1",
      "type": "rectangle",
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 80,
      "backgroundColor": "#ff6b6b",
      "borderWidth": 2,
      "borderColor": "#ff4757"
    },
    {
      "id": "circle1",
      "type": "circle",
      "x": 150,
      "y": 100,
      "width": 100,
      "height": 100,
      "backgroundColor": "#4ecdc4",
      "borderWidth": 2,
      "borderColor": "#45b7aa"
    }
  ]
}
```

**说明**：
- 组合元素的 `x`, `y` 是相对于画布（或父组合）的坐标
- 子元素的 `x`, `y` 是相对于组合左上角的坐标
- `width` 和 `height` 是组合的边界框尺寸（由子元素自动计算）
- 子元素可以是任意类型，包括其他组合元素

### 嵌套组合元素示例
```json
{
  "id": "group2",
  "type": "group",
  "name": "Nested Group",
  "x": 100,
  "y": 100,
  "width": 300,
  "height": 250,
  "children": [
    {
      "id": "text1",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 200,
      "height": 50,
      "content": "Nested Structure",
      "fontFamily": "Arial, sans-serif",
      "fontSize": 18,
      "color": "#333333"
    },
    {
      "id": "group1",
      "type": "group",
      "name": "Sub Group",
      "x": 0,
      "y": 70,
      "width": 250,
      "height": 180,
      "children": [
        {
          "id": "rect2",
          "type": "rectangle",
          "x": 0,
          "y": 0,
          "width": 120,
          "height": 80,
          "backgroundColor": "#a29bfe",
          "borderWidth": 2,
          "borderColor": "#6c5ce7"
        },
        {
          "id": "image1",
          "type": "image",
          "x": 130,
          "y": 40,
          "width": 120,
          "height": 90,
          "src": "/test1.jpg",
          "originalWidth": 120,
          "originalHeight": 90
        }
      ]
    }
  ]
}
```

**说明**：
- 支持多层嵌套组合，理论上无限制
- 每一层的坐标都是相对于其直接父容器
- 绝对坐标计算：递归累加所有父级的偏移量
  - `rect2` 的绝对坐标 = `100 + 0 + 0, 100 + 70 + 0` = `(100, 170)`
  - `image1` 的绝对坐标 = `100 + 0 + 130, 100 + 70 + 40` = `(230, 210)`

## 七、技术实现细节

### 响应式渲染流程

1. **初始化**: 监听窗口resize事件，获取画布实际尺寸
2. **计算缩放**: `scale = actualWidth / DESIGN_WIDTH`
3. **元素渲染**: 所有尺寸属性乘以scale进行渲染
4. **性能优化**: 使用Vue响应式系统，只在尺寸变化时重新计算

### 样式计算示例

#### 三角形元素渲染（v1.3.1+）

三角形使用 `clip-path` 和伪元素实现轮廓渲染：

```typescript
// 三角形元素渲染计算
const clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)' // 向下指向的三角形
const borderWidth = element.borderWidth * scale
const scaledWidth = element.width * scale
const scaledHeight = element.height * scale

// 计算统一的缩放比例（从重心点缩放，保持相似性）
const minDimension = Math.min(scaledWidth, scaledHeight)
const scaleRatio = borderWidth > 0 && minDimension > 0 
  ? Math.max(0, (minDimension - borderWidth * 2) / minDimension) 
  : 1

// CSS样式（通过CSS变量传递）
{
  clipPath: clipPath,
  WebkitClipPath: clipPath, // Safari 兼容
  backgroundColor: 'transparent', // 背景通过伪元素实现
  '--border-width': borderWidth + 'px',
  '--border-color': element.borderColor,
  '--background-color': element.backgroundColor,
  '--scale-ratio': scaleRatio
}
```

**渲染机制**：
- `::before` 伪元素：外层三角形，使用 `borderColor` 作为轮廓
- `::after` 伪元素：内层三角形，使用 `backgroundColor` 作为填充
- 内层三角形从重心点（50%, 66.67%）统一缩放，保持内外三角形相似性
- 缩放比例基于最小尺寸计算，确保边框均匀

#### 其他图形元素渲染

```typescript
// 矩形、圆角矩形、圆形使用标准 CSS 边框
{
  backgroundColor: element.backgroundColor,
  borderWidth: element.borderWidth + 'px',
  borderStyle: 'solid',
  borderColor: element.borderColor
}
```

### 组合元素实现细节

#### 创建组合 (groupElements)

```typescript
// 1. 计算边界框
const bounds = calculateBounds(selectedElements)

// 2. 创建组合元素
const group: GroupElement = {
  id: generateId(),
  type: 'group',
  name: generateDefaultName('group'),
  x: bounds.minX,
  y: bounds.minY,
  width: bounds.maxX - bounds.minX,
  height: bounds.maxY - bounds.minY,
  children: selectedElements.map(el => ({
    ...deepClone(el),
    x: el.x - bounds.minX,
    y: el.y - bounds.minY
  }))
}

// 3. 替换元素列表
// - 移除被组合的元素
// - 在原位置插入组合元素
// - 保持层级顺序
```

#### 解散组合 (ungroupElements)

```typescript
// 1. 递归处理函数
const processList = (list: CanvasElement[]): CanvasElement[] => {
  const result: CanvasElement[] = []
  
  for (const el of list) {
    if (shouldUngroup(el)) {
      // 解散此组合
      const group = el as GroupElement
      const children = group.children.map(child => ({
        ...deepClone(child),
        x: child.x + group.x,  // 转换回全局坐标
        y: child.y + group.y
      }))
      // 递归处理子元素
      result.push(...processList(children))
    } else if (el.type === 'group') {
      // 保留组合，但递归处理其子元素
      result.push({
        ...el,
        children: processList(el.children)
      })
    } else {
      result.push(el)
    }
  }
  
  return result
}

// 2. 应用递归处理
const newElements = processList(elements)
```

#### 组合渲染逻辑

组合元素通过递归渲染实现：

```typescript
// 伪代码示例
function renderElement(element: CanvasElement, parentOffset = {x: 0, y: 0}) {
  const absoluteX = parentOffset.x + element.x
  const absoluteY = parentOffset.y + element.y
  
  if (element.type === 'group') {
    // 渲染组合容器
    const groupOffset = { x: absoluteX, y: absoluteY }
    
    // 递归渲染所有子元素
    element.children.forEach(child => {
      renderElement(child, groupOffset)
    })
  } else {
    // 渲染普通元素
    renderPrimitiveElement(element, absoluteX, absoluteY)
  }
}
```

**关键点**：
- 每层递归累加父级偏移量，计算绝对坐标
- 支持无限层级嵌套
- 变换矩阵逐层叠加（未来支持缩放、旋转时）

### 浏览器兼容性

- 支持所有现代浏览器
- 使用CSS `aspect-ratio` 属性（现代浏览器支持）
- 降级方案：固定高度代替宽高比

