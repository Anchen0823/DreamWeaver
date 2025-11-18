# 数据结构设计

## 一、核心数据模型概览

DreamWeaver 采用基于 DOM 的渲染方案，核心数据模型围绕**画布元素（Canvas Element）**展开。所有可渲染的元素都遵循统一的基础接口，通过类型区分不同的元素类型。

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

### 6. 画布元素联合类型

```typescript
type CanvasElement = ShapeElement | ImageElement | TextElement
```

### 7. 画布配置接口

```typescript
interface CanvasConfig {
  width: number           // 画布宽度（像素）
  height: number          // 画布高度（像素）
  backgroundColor?: string // 画布背景色
  infinite?: boolean      // 是否无限画布（未来扩展）
}
```

### 8. 视口状态接口（未来扩展）

```typescript
interface ViewportState {
  zoom: number            // 缩放比例（1.0 为原始大小）
  offsetX: number          // 视口X轴偏移量（像素）
  offsetY: number         // 视口Y轴偏移量（像素）
  minZoom?: number        // 最小缩放比例
  maxZoom?: number        // 最大缩放比例
}
```

### 9. 画布状态接口（未来扩展）

```typescript
interface CanvasState {
  config: CanvasConfig           // 画布配置
  viewport: ViewportState        // 视口状态
  elements: CanvasElement[]      // 所有画布元素
  selectedElementIds: string[]   // 选中的元素ID列表
}
```

## 三、数据结构设计原则

### 1. 可扩展性
- 使用联合类型（Union Types）支持多种元素类型
- 通过接口继承实现属性复用
- 预留可选属性支持未来功能扩展

### 2. 类型安全
- 所有数据结构使用 TypeScript 接口定义
- 通过类型守卫区分不同元素类型
- 避免使用 `any` 类型

### 3. 性能考虑
- 元素ID使用字符串，便于快速查找
- 选中状态使用ID数组，避免存储完整对象引用
- 支持按需加载（未来扩展）

## 四、当前实现状态

### ✅ 已实现
- BaseElement 基础接口定义
- ShapeElement 图形元素接口（矩形、圆角矩形、圆形、三角形）
- ImageElement 图片元素接口（支持PNG、JPEG，3种滤镜）
- TextElement 文本元素接口（支持BIUS样式）
- CanvasElement 联合类型
- CanvasConfig 画布配置接口

### ⏳ 待实现
- ViewportState 视口状态管理
- CanvasState 完整画布状态管理
- GroupElement 组合元素接口
- 数据持久化结构

## 五、数据示例

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

