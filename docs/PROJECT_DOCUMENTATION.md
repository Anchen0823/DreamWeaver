# DreamWeaver 项目完整文档

## 一、背景与目标

### 1. 项目背景

本项目是"画布产品课程"的结项作业，旨在从零到一实现一个简化版画布产品（参考 Figma、Excalidraw、Canva 等）。通过自主实现核心渲染与交互逻辑，深入理解图形渲染、交互设计与状态管理。

### 2. 项目目标

**技术目标：**

- 自主实现画布核心逻辑（渲染引擎、事件系统、状态管理）
- 掌握图形渲染技术（DOM/Canvas）
- 理解复杂交互设计（无限画布、选区、拖拽、缩放等）
- 实践数据持久化方案（本地存储/后端）

**工程目标：**

- 遵循规范的 Git 工作流与项目管理
- 撰写清晰的技术文档
- 体验完整的软件开发周期

**学习目标：**

- 提升复杂需求的分析与拆解能力
- 锻炼架构设计与技术选型能力
- 学习性能优化策略与实践

### 3. 项目代号

DreamWeaver - 寓意"编织梦想的画布"，期望通过这个项目编织出功能完备的画布产品。

## 二、MVP 范围与需求拆解

### 1. MVP 范围定义

MVP（最小可行产品）聚焦于实现所有 P0 核心功能，确保主链路稳定可用。在 MVP 基础上，再尝试进阶挑战。核心原则：优先保证 P0 功能的稳定性和性能，一个稳定可靠的 MVP 比充满 Bug 的复杂功能更有价值。

### 2. P0 需求拆解

**【P0-1】基础渲染**

**图形渲染**
- 支持至少 3 种图形：矩形、圆角矩形、圆形、三角形等
- 图形属性：
  - background（背景色）
  - borderWidth（边框宽度）
  - borderColor（边框颜色）

**图片渲染**
- 支持格式：PNG、JPEG
- 支持 3 种简单滤镜（如：灰度、模糊、对比度）

**富文本渲染**
- 文本属性：
  - fontFamily（字体）
  - fontSize（字号）
  - color（颜色）
  - background（背景色）
  - bold、italic、underline、strikethrough（BIUS）

**【P0-2】画布交互**

**无限画布**
- 缩放（鼠标滚轮/手势）
- 滚动（拖拽画布）
- 拖拽画布视图

**选区功能**
- 点击选中单个元素
- 框选选中多个元素

**数据持久化**
- 每次操作后自动保存
- 刷新页面后数据恢复

**快捷键**
- 复制选中元素（Ctrl+C / Cmd+C）
- 粘贴（Ctrl+V / Cmd+V）
- 粘贴后刷新页面数据仍存在

**【P0-3】调参工具栏**

**浮动工具栏**
- 选中文本元素：显示文本属性设置（字体、字号、颜色、背景色、BIUS）
- 选中图形元素：显示图形属性设置（背景色、边框宽度、边框颜色）
- 选中图片元素：显示图片属性设置（滤镜等）

**【P0-4】元素编辑**

**文本编辑**
- 双击文本进入编辑模式
- 支持输入/删除文本内容

**元素操作**
- 删除选中元素（单个或多个）
- 拖拽选中元素（单个或多个）
- 缩放选中元素（单个或多个）

**【P0-5】性能优化**

**性能要求**
- 画布存在 100 个元素，打开页面到渲染完成 < 3s

## 三、技术选型与架构设计

### 1. 技术选型

我选择了 Vue + DOM。结合查找的资料以及自己的经验，有以下原因：

1. 我目前对两种渲染方式都不熟悉，DOM 方案更接近传统网页开发，调试更直观，有助于我快速上手，保证 MVP 的稳定性。
2. 项目要求的富文本编辑在 DOM 中实现比 Canvas 简单得多。
3. 虽然 Canvas 性能上限高，但 MVP 的性能要求 DOM 可以满足。
4. 框架选择了 Vue，因为我在上学期的学校课程项目中使用过 Vue 制作 Web 应用，有了一些经验。

**技术栈详情：**
- **前端框架**: Vue 3.5.22 (Composition API)
- **类型系统**: TypeScript 5.9
- **状态管理**: Pinia 3.0.3
- **构建工具**: Vite 7.1.11
- **代码规范**: ESLint + Prettier

### 2. 架构设计

将系统分为 5 个主要模块：

**1. 状态管理层**

- **职责**：作为"唯一数据源"，存储和管理完整的 CanvasState。
- **实现**：使用 Vue 3 Composition API 的 `ref` 和 `reactive` 管理状态，通过 composables 封装状态逻辑。
- **工作**：提供用于修改状态的 actions（例如 `addElement`, `updateElementPosition`, `setZoom`）。

**2. 渲染层**

- **职责**：响应式地将"状态"渲染为 DOM 节点。
- **实现**：创建 `<Canvas>` 组件和 `<CanvasElement>` 组件。
  - 从 composables 中 computed 出需要渲染的元素列表。
  - 使用 `v-for` 遍历列表，为每个 CanvasElement 渲染一个对应的 DOM 节点。
  - 利用 CSS transform 属性来高效地应用元素的位置 (translate) 和缩放 (scale)。
- **关键点**：渲染层只读取状态，绝不直接修改 DOM。

**3. 交互层**

- **职责**：监听用户输入（鼠标、滚轮、键盘），解析这些输入，并调用状态层的 actions 来更新状态。
- **实现**：多个 composables 处理不同交互：
  - `useCanvasInteraction`: 处理画布拖拽、滚轮缩放
  - `useElementSelection`: 处理元素选择和框选
  - `useElementDrag`: 处理元素拖拽移动
  - `useElementZoom`: 处理元素缩放
  - `useResize`: 处理元素调整大小
  - `useDrawing`: 处理拖拽绘制新元素
  - `useBrushDrawing`: 处理画笔绘制
  - `useElementGrouping`: 处理元素组合和解散
- **事件解析**：
  - `wheel` -> 调用 `viewport.setZoom()`
  - `mousedown` (在空白处) + `mousemove` -> status 变为 `boxSelecting` -> 更新选区矩形。
  - `mousedown` (在元素上) + `mousemove` -> status 变为 `dragging` -> 调用 `updateElementPosition()`。

**4. UI 工具栏**

- **职责**：根据当前选中的元素，显示对应的浮动工具栏。
- **实现**：多个工具栏组件（`TextToolbar`, `ShapeToolbar`, `ImageToolbar`）。
  - 读取 composables 中的 `selectedElementIds`。
  - 如果只选中一个文本元素，它就渲染 `<TextToolbar>`。
  - 工具栏上的按钮被点击时（例如"加粗"），它会调用更新函数修改元素属性。

**5. 持久化层**

- **职责**：自动保存画布状态到浏览器，并在刷新后恢复。
- **实现**：
  - 使用 `usePersistence` composable 管理持久化逻辑。
  - 使用 IndexedDB 存储数据（通过 `persistenceService`）。
  - 使用 Vue 的 `watch` 监听状态变更。
  - 当状态变更时，使用防抖策略（1秒延迟），将整个状态序列化为 JSON 并存入 IndexedDB。

## 四、核心数据结构与关键流程

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
  rotation?: number        // 旋转角度（未来扩展）
  locked?: boolean         // 是否锁定（未来扩展）
  visible?: boolean        // 是否可见（未来扩展）
  zIndex?: number         // 图层顺序（未来扩展）
}
```

### 2. 元素类型枚举

```typescript
type ElementType = 
  | 'rectangle'           // 矩形
  | 'rounded-rectangle'    // 圆角矩形
  | 'circle'              // 圆形
  | 'triangle'            // 三角形
  | 'image'               // 图片
  | 'text'                // 富文本
  | 'brush'               // 画笔痕迹
  | 'group'               // 组合
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
  backgroundColor?: string         // 背景色（可选，默认透明）
  bold?: boolean                  // 加粗
  italic?: boolean                // 斜体
  underline?: boolean             // 下划线
  strikethrough?: boolean         // 删除线
  textAlign?: 'left' | 'center' | 'right'  // 对齐方式
  lineHeight?: number             // 行高
}
```

### 6. 画笔痕迹元素接口 (BrushElement)

```typescript
interface BrushPoint {
  x: number      // X坐标（相对于元素左上角）
  y: number      // Y坐标（相对于元素左上角）
  pressure?: number  // 压力值（0-1，可选，用于未来支持压感）
}

interface BrushElement extends BaseElement {
  type: 'brush'
  points: BrushPoint[]            // 路径点数组
  color: string                   // 画笔颜色
  strokeWidth: number              // 画笔宽度
  lineCap?: 'butt' | 'round' | 'square'
  lineJoin?: 'miter' | 'round' | 'bevel'
}
```

### 7. 组合元素接口 (GroupElement)

```typescript
interface GroupElement extends BaseElement {
  type: 'group'
  children: CanvasElement[]       // 子元素列表（支持递归嵌套）
}
```

**设计原则**：
- **递归树形结构**：支持无限层级嵌套
- **相对坐标系统**：子元素坐标相对于组合左上角
- **边界框自动计算**：组合尺寸由子元素决定
- **坐标自动转换**：组合/解散时自动处理坐标转换

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

### 10. 视口状态接口

```typescript
interface ViewportState {
  zoom: number            // 缩放比例（1.0 为原始大小）
  offsetX: number         // 视口X轴偏移量（像素）
  offsetY: number         // 视口Y轴偏移量（像素）
  minZoom?: number        // 最小缩放比例
  maxZoom?: number        // 最大缩放比例
}
```

### 11. 画布状态接口

```typescript
interface CanvasState {
  config: CanvasConfig           // 画布配置
  viewport: ViewportState        // 视口状态
  elements: CanvasElement[]      // 所有画布元素
  selectedElementIds: string[]   // 选中的元素ID列表
}
```

## 五、性能优化方案以及效果

### 1. 已实现的优化策略

#### 1.1 响应式系统优化

**策略**：使用 Vue 3 的响应式系统，通过 `computed` 属性缓存计算结果，避免不必要的重新计算。

**实现**：
- 元素样式计算封装在 `style-calculator.ts` 中，使用纯函数，便于缓存
- 视口样式通过 `computed` 属性计算，只在依赖变化时重新计算
- 选中状态通过 `isElementSelected` 函数快速判断，避免遍历

**效果**：减少了不必要的 DOM 更新，提升了渲染性能。

#### 1.2 事件处理优化

**策略**：使用事件委托和防抖/节流策略优化高频事件处理。

**实现**：
- 画布交互事件统一在容器层处理，避免为每个元素绑定事件
- 持久化保存使用防抖策略（1秒延迟），避免频繁写入 IndexedDB
- 鼠标移动事件通过 `requestAnimationFrame` 优化

**效果**：减少了事件处理开销，提升了交互流畅度。

#### 1.3 数据结构优化

**策略**：使用 ID 数组存储选中状态，避免存储完整对象引用。

**实现**：
- `selectedElementIds` 使用字符串数组，查找效率 O(1)
- 元素更新时创建新数组，确保 Vue 响应式系统正确检测变化
- 使用 Map 结构缓存元素查找（未来优化方向）

**效果**：减少了内存占用，提升了状态更新效率。

#### 1.4 渲染优化

**策略**：使用 CSS transform 进行位置和缩放变换，利用 GPU 加速。

**实现**：
- 元素位置通过 `transform: translate()` 实现，而非修改 `left/top`
- 画布缩放通过 `transform: scale()` 实现
- 使用 `will-change` 提示浏览器优化（未来优化方向）

**效果**：利用 GPU 加速，提升了渲染性能。

#### 1.5 代码拆分优化

**策略**：将大型组件拆分为多个 composables，提升代码可维护性和可测试性。

**实现**：
- `Canvas.vue` 从 1054 行减少到约 250 行（减少约 76%）
- 功能模块化：`useViewport`, `useCanvasInteraction`, `useElementSelection`, `useBrushDrawing`, `useElementGrouping` 等
- 工具函数独立：`style-calculator.ts`, `coordinate-utils.ts`

**效果**：提升了代码可维护性，便于后续性能优化和功能扩展。

#### 1.6 组合元素优化

**策略**：使用深拷贝和递归算法实现组合元素的创建和解散。

**实现**：
- 使用 `JSON.parse(JSON.stringify())` 进行深拷贝，避免引用问题
- 递归处理嵌套组合，支持无限层级
- 坐标转换使用简单的加减运算，计算效率高
- 保持元素层级关系，避免重新排序

**效果**：组合/解散操作流畅，支持复杂的嵌套结构。

### 2. 性能测试结果

**当前性能表现**：
- **小规模场景**（< 50 个元素）：渲染流畅，交互响应迅速
- **中等规模场景**（50-100 个元素）：渲染时间约 1-2 秒，交互基本流畅
- **大规模场景**（> 100 个元素）：需要进一步优化

**性能瓶颈分析**：
1. **DOM 节点数量**：每个元素对应一个 DOM 节点，100 个元素需要创建 100 个 DOM 节点
2. **样式计算**：每个元素都需要计算样式，计算量随元素数量线性增长
3. **事件监听**：虽然使用了事件委托，但大量元素仍会影响事件处理性能
4. **递归渲染**：组合元素的递归渲染可能增加渲染开销，需要测试和优化

### 3. 未来优化方向

#### 3.1 虚拟滚动/渲染优化

**目标**：只渲染视口内的元素，减少 DOM 节点数量。

**实现思路**：
- 计算视口范围（考虑缩放和偏移）
- 过滤出视口内的元素进行渲染
- 使用 `IntersectionObserver` API 检测元素可见性

**预期效果**：100 个元素场景下，只渲染 10-20 个可见元素，大幅提升性能。

#### 3.2 操作性能优化

**目标**：优化拖拽、缩放等高频操作的性能。

**实现思路**：
- 使用 `requestAnimationFrame` 节流鼠标移动事件
- 拖拽时临时禁用选中框重绘
- 批量更新元素位置，减少重排次数

**预期效果**：拖拽操作 FPS 提升至 50+。

#### 3.3 数据持久化优化

**目标**：优化 IndexedDB 写入性能。

**实现思路**：
- 使用批量写入策略
- 压缩存储数据
- 异步保存，不阻塞主线程

**预期效果**：保存操作耗时减少 50%+。

#### 3.4 组合元素渲染优化

**目标**：优化组合元素的递归渲染性能。

**实现思路**：
- 使用 `v-once` 指令优化静态组合
- 缓存组合边界框计算结果
- 扁平化渲染：将嵌套组合展开为扁平列表（可选）
- 对深层嵌套（> 5 层）进行警告提示

**预期效果**：深层嵌套组合渲染性能提升 30%+。

## 六、遇到的问题与解决方案

### 1. 多层坐标系统转换问题

**问题描述：**

画布需要处理三层坐标系统：
- **响应式缩放 (scale)**：基于窗口大小的自适应缩放
- **用户缩放 (zoom)**：用户通过滚轮控制的缩放（0.1x - 5x）
- **视口偏移 (viewportOffsetX/Y)**：画布拖拽产生的偏移

框选时，需要将屏幕坐标（鼠标位置）转换为画布逻辑坐标（元素存储坐标），涉及这三层转换。

**解决方案：**

在 `updateSelectionFromRect()` 中统一处理坐标转换：

```typescript
// 转换为画布坐标（考虑视口偏移和缩放）
const canvasRectLeft = (rectLeft - viewport.viewportOffsetX.value) / viewport.zoom.value / viewport.scale.value
const canvasRectTop = (rectTop - viewport.viewportOffsetY.value) / viewport.zoom.value / viewport.scale.value
const canvasRectRight = (rectRight - viewport.viewportOffsetX.value) / viewport.zoom.value / viewport.scale.value
const canvasRectBottom = (rectBottom - viewport.viewportOffsetY.value) / viewport.zoom.value / viewport.scale.value
```

**关键点**：
- 转换公式：画布坐标 = (屏幕坐标 - 视口偏移) / 用户缩放 / 响应式缩放
- 先减去视口偏移，再除以缩放比例
- 顺序错误会导致坐标计算偏差
- 框选框样式也需要同样的转换逻辑

**相关代码位置**：
- `app/src/composables/useElementSelection.ts` (第 104-107 行)
- `app/src/utils/coordinate-utils.ts` (坐标转换工具函数)

### 2. 三角形轮廓渲染问题

**问题描述：**

三角形元素使用 `clip-path` 实现形状，但边框渲染存在问题：
- 使用 `border` 属性无法正确显示三角形边框
- 内外三角形缩放不一致，导致边框粗细不均匀

**解决方案：**

使用 `clip-path` 和伪元素实现三角形轮廓：

```typescript
// 使用 clip-path 和伪元素实现三角形轮廓
const clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)' // 向下指向的三角形

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

**相关代码位置**：
- `app/src/utils/style-calculator.ts` (三角形样式计算)
- `app/src/components/CanvasElement.vue` (三角形渲染)

### 3. 数据持久化序列化问题

**问题描述：**

使用 IndexedDB 存储数据时，Vue 的响应式对象（Proxy）无法直接序列化，导致存储失败。

**解决方案：**

在保存前对数据进行序列化处理：

```typescript
private serializeData(data: CanvasData): any {
  try {
    // 使用 JSON 序列化/反序列化来创建一个完全可序列化的副本
    // 这样可以移除任何 Vue ref、Proxy 或其他不可序列化的对象
    const dataToSerialize = {
      elements: Array.isArray(data.elements) ? data.elements : [],
      viewport: {
        zoom: Number(data.viewport?.zoom) || 1,
        offsetX: Number(data.viewport?.offsetX) || 0,
        offsetY: Number(data.viewport?.offsetY) || 0
      },
      savedAt: data.savedAt || Date.now()
    }
    
    const serialized = JSON.parse(JSON.stringify(dataToSerialize))
    return serialized
  } catch (error) {
    console.error('序列化数据失败:', error)
    throw new Error(`数据序列化失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
```

**关键点**：
- 使用 `JSON.parse(JSON.stringify())` 深拷贝并移除 Proxy
- 确保所有数据都是可序列化的基本类型
- 添加错误处理，避免序列化失败导致数据丢失

**相关代码位置**：
- `app/src/utils/persistence.ts` (第 60-81 行)

### 4. 浮动工具栏位置计算问题

**问题描述：**

浮动工具栏需要跟随元素位置和视口缩放自动调整，但位置计算需要考虑多层坐标转换。

**解决方案：**

统一使用画布坐标系计算工具栏位置：

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

**关键点**：
- 使用 `viewport.scale.value` 处理响应式缩放
- 使用 `viewport.zoom.value` 处理用户缩放
- 工具栏使用 `transform: translateX(-50%)` 实现水平居中
- 必须添加 `@mousedown.stop` 和 `@click.stop` 阻止事件冒泡

**相关代码位置**：
- `app/src/components/Canvas.vue` (工具栏位置计算)
- `docs/FLOATING_TOOLBAR_GUIDE.md` (实现指南)

### 5. 元素拖拽与画布拖拽冲突问题

**问题描述：**

当按住空格键拖拽画布时，如果鼠标经过元素，可能会误触发元素拖拽。

**解决方案：**

在事件处理中区分画布拖拽和元素拖拽：

```typescript
// 在 useCanvasInteraction 中处理画布拖拽
const handleMouseDown = (e: MouseEvent) => {
  // 如果按住空格键或中键，启动画布拖拽
  if (isSpacePressed.value || e.button === 1) {
    // 画布拖拽逻辑
    return
  }
  
  // 否则交给元素拖拽处理
}

// 在 useElementDrag 中处理元素拖拽
const handleElementMouseDown = (elementId: string, e: MouseEvent) => {
  e.stopPropagation() // 阻止事件冒泡到画布
  
  // 如果按住空格键，不启动元素拖拽
  if (isSpacePressed.value) {
    return false
  }
  
  // 元素拖拽逻辑
}
```

**关键点**：
- 使用 `e.stopPropagation()` 阻止事件冒泡
- 检查 `isSpacePressed` 状态，避免冲突
- 区分鼠标按键（左键、中键）

**相关代码位置**：
- `app/src/composables/useCanvasInteraction.ts`
- `app/src/composables/useElementDrag.ts`

### 6. 组合元素坐标转换问题

**问题描述：**

组合元素使用相对坐标系统，需要处理多层坐标转换：
- 组合创建时：将子元素从全局坐标转换为相对于组合的坐标
- 组合解散时：将子元素从相对坐标转换回全局坐标
- 嵌套组合：需要递归处理多层坐标转换

**解决方案：**

实现统一的坐标转换逻辑：

```typescript
// 组合创建时（全局坐标 → 相对坐标）
const groupElements = () => {
  // 1. 计算组合的边界框
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  selectedElements.forEach(el => {
    minX = Math.min(minX, el.x)
    minY = Math.min(minY, el.y)
    maxX = Math.max(maxX, el.x + el.width)
    maxY = Math.max(maxY, el.y + el.height)
  })
  
  // 2. 创建组合，子元素坐标转换为相对坐标
  const group: GroupElement = {
    id: generateId(),
    type: 'group',
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    children: selectedElements.map(el => ({
      ...deepClone(el),
      x: el.x - minX,  // 转换为相对坐标
      y: el.y - minY
    }))
  }
}

// 组合解散时（相对坐标 → 全局坐标）
const ungroupElements = () => {
  const processList = (list: CanvasElement[]): CanvasElement[] => {
    const result: CanvasElement[] = []
    
    for (const el of list) {
      if (shouldUngroup(el) && el.type === 'group') {
        const group = el as GroupElement
        const children = group.children.map(child => ({
          ...deepClone(child),
          x: child.x + group.x,  // 转换回全局坐标
          y: child.y + group.y
        }))
        // 递归处理子元素
        result.push(...processList(children))
      } else {
        result.push(el)
      }
    }
    
    return result
  }
  
  return processList(elements.value)
}
```

**关键点**：
- 使用边界框算法计算组合的位置和尺寸
- 子元素坐标 = 全局坐标 - 组合左上角坐标
- 使用深拷贝避免引用问题
- 递归处理支持嵌套组合
- 保持元素层级关系

**相关代码位置**：
- `app/src/composables/useElementGrouping.ts` (第 18-116 行)
- `app/src/types/canvas.ts` (第 153-161 行)
- `docs/DATA_STRUCTURE.md` (组合元素详细设计)

## 七、AI 使用方式与反思

### 1. AI 使用场景

#### 1.1 编写 README 文档

**使用方式**：让 AI 根据代码结构和功能实现，生成完整的项目文档。

**效果**：快速生成结构清晰、内容完整的文档，节省了大量时间。

**反思**：AI 生成的文档需要人工审核和补充，特别是技术细节和项目背景。

#### 1.2 编写 Commit Message

**使用方式**：让 AI 根据代码变更生成规范的 commit message。

**效果**：统一了 commit 格式，提升了代码可追溯性。

**反思**：AI 生成的 commit message 有时过于详细或不够准确，需要人工调整。

#### 1.3 代码重构建议

**使用方式**：完成几个功能后，让 AI 阅读代码结构，考虑重构方案。

**效果**：AI 提出了将大型组件拆分为 composables 的建议，大幅提升了代码可维护性。

**反思**：AI 的重构建议需要结合项目实际情况，不能盲目采纳。

#### 1.4 功能实现参考

**使用方式**：完成功能后写文档，供逻辑相似功能参考（如浮动工具栏实现指南）。

**效果**：为后续功能开发提供了清晰的参考，提升了开发效率。

**反思**：文档需要及时更新，保持与代码实现的一致性。

#### 1.5 复杂算法设计

**使用方式**：在实现组合元素功能时，让 AI 协助设计坐标转换算法和递归处理逻辑。

**效果**：AI 提供了清晰的算法思路，帮助理解递归树形结构和相对坐标系统的设计原理。

**反思**：复杂算法需要深入理解原理，不能完全依赖 AI 生成的代码，必须经过仔细验证和测试。

### 2. AI 使用反思

#### 2.1 优势

1. **提升效率**：AI 可以快速生成代码、文档和注释，大幅提升开发效率。
2. **学习辅助**：AI 可以提供技术方案和最佳实践，帮助学习新技术。
3. **代码质量**：AI 可以帮助发现代码问题，提供重构建议。

#### 2.2 局限性

1. **理解偏差**：AI 可能误解需求，生成不符合预期的代码。
2. **技术债务**：AI 生成的代码可能不够优雅，需要人工优化。
3. **依赖风险**：过度依赖 AI 可能影响独立思考和问题解决能力。

#### 2.3 最佳实践

1. **明确需求**：在使用 AI 前，明确需求和约束条件。
2. **代码审查**：AI 生成的代码必须经过人工审查和测试。
3. **持续学习**：将 AI 作为学习工具，而非替代工具。
4. **保持思考**：遇到问题时，先独立思考，再寻求 AI 帮助。

## 八、每周进展

### 第一周 (2025-11-21)

**项目内容**

**PR 链接**：[feat: 项目初始化 - 实现基础画布元素渲染功能](https://github.com/Anchen0823/DreamWeaver/pull/1)

**本周变更摘要**

- 实现了画布图形、图片和文本基础渲染功能。
- 重构了元素数据结构，实现了响应式布局。

**功能演示**

[图片]

**下周计划**

- 实现画布缩放、拖拽、滚动交互功能
- 开发选区功能（点击选中和框选多个元素）
- 搭建浮动工具栏，支持元素属性设置
- 实现文本双击编辑功能
- 支持元素删除、拖拽、缩放操作
- 完成基于 IndexedDB 的数据持久化方案

**风险与阻塞项**

- 100个元素渲染性能优化需要提前规划，确保加载时间
- 无限画布交互逻辑较为复杂，需要仔细设计视口状态管理
- IndexedDB 存储方案的数据结构设计需要完善，确保数据完整性

### 第二周 (2025-11-28)

**项目内容**

**PR 链接**：
- [Feature/canvas interaction](https://github.com/Anchen0823/DreamWeaver/pull/2)
- [Feature/element editing toolbar](https://github.com/Anchen0823/DreamWeaver/pull/3)

**本周变更摘要**

- 实现画布缩放（Ctrl/Cmd + 滚轮，0.1x-5x）、拖拽（空格键 + 左键/中键）、滚动（无限画布，支持垂直和水平滚动）、网格背景
- 实现点击选中单个元素、框选多个元素、选中状态视觉反馈（蓝色选中框）、多选支持（Ctrl/Cmd + 点击或框选）
- 实现底部工具栏，包含 Move 工具、图形工具（矩形、圆角矩形、圆形、三角形）、图片工具、文本工具，支持工具状态管理和绘制完成后自动切换回 Move 工具
- 实现图形/图片/文本拖拽绘制，支持实时预览、尺寸标签显示，图片保持宽高比，文本字体大小自适应
- 实现双击文本进入编辑模式、元素删除（Delete/Backspace）、元素拖拽移动（支持单个或多个元素同时移动）、元素缩放（角点和边缘拖动）
- 实现 Ctrl/Cmd + C 复制选中元素，Ctrl/Cmd + V 粘贴元素（支持多选）
- 实现基于 IndexedDB 的存储方案，支持自动保存和页面刷新后数据恢复
- 实现角点和边缘拖动调整大小、尺寸标签显示、圆形和图片宽高比保持
- 实现左侧图层面板，显示所有画布元素列表、元素缩略图预览、点击图层选择元素（支持 Ctrl/Cmd 多选）、选中状态同步显示
- 实现文本/图形/图片浮动工具栏，支持动态定位、实时修改元素属性

**功能演示**

- 画布交互

[图片]

- 元素编辑

[图片]

[图片]

[图片]

**下周计划**

- 性能优化
  - 优化 100 个元素的渲染性能（目标 <3s）
  - 实现虚拟滚动/渲染优化
  - 操作性能优化（防抖、节流）
- 进阶功能实现
  - 元素旋转功能（⭐️挑战）
  - 撤销/重做功能（⭐️⭐️⭐️挑战）
  - 组合/解组功能（⭐️⭐️挑战）
- 交互体验打磨
  - 优化所有交互细节
  - 添加加载状态和错误处理
  - 优化工具栏和 UI 细节
- 代码质量和测试
  - 代码规范检查和修复
  - 完善 TypeScript 类型定义

**风险与阻塞项**

- 100 个元素渲染性能优化需要提前规划，确保加载时间控制在目标范围内，可能需要实现虚拟滚动或渲染优化策略
- 无限画布交互逻辑较为复杂，需要仔细设计视口状态管理，确保缩放、拖拽、滚动等交互的流畅性和正确性
- IndexedDB 存储方案的数据结构设计需要完善：确保数据完整性，考虑版本迁移和错误恢复机制

### 第三周 (2025-12-05)

**项目内容**

**PR 链接**：待补充

**本周变更摘要**

- 图形渲染优化
  - 修复三角形轮廓渲染问题
  - 使用 clip-path 和伪元素实现三角形轮廓
  - 从三角形重心点统一缩放，保持内外三角形相似性
  - 优化预览组件中的三角形轮廓渲染
- 代码重构优化
  - 将 `Canvas.vue` 从 1054 行拆分为多个 composables（减少约 76%）
  - 创建 `useViewport`, `useCanvasInteraction`, `useElementSelection` 等 composables
  - 提取工具函数到 `style-calculator.ts`, `coordinate-utils.ts`
  - 提升代码可维护性和可测试性
- 画笔工具实现
  - 实现画笔绘制功能（`useBrushDrawing` composable）
  - 支持路径点数组存储画笔轨迹
  - 实现 SVG path 渲染画笔轨迹
  - 画笔模式下不会选中元素，方便绘制相交笔画
  - 支持从元素框内起笔绘制
  - 绘制完成后保持画笔模式，支持连续绘制
  - 图层面板支持画笔元素缩略图显示
- 组合/解组功能实现（⭐️⭐️挑战功能）
  - 实现 GroupElement 接口定义和数据结构
  - 支持递归树形结构，无限层级嵌套
  - 实现相对坐标系统（子元素相对父组合定位）
  - 实现组合创建功能（`useElementGrouping` composable）
  - 实现组合解散功能（支持递归解散嵌套组合）
  - 自动计算组合边界框和坐标转换
  - 保持元素层级关系
- 文档完善
  - 编写数据结构设计文档（`DATA_STRUCTURE.md`）
  - 编写浮动工具栏实现指南（`FLOATING_TOOLBAR_GUIDE.md`）
  - 编写代码重构文档（`REFACTORING.md`）
  - 完善项目 README
  - 更新组合元素数据结构设计文档

**功能演示**

- 画笔工具

[演示图片待补充]

- 组合/解组功能

[演示图片待补充]

**已实现功能亮点**：
- ✅ 画笔绘制：支持自由绘制，路径平滑，可连续绘制
- ✅ 组合元素：支持多选元素组合，递归嵌套，相对坐标系统
- ✅ 解散组合：支持递归解散，自动处理坐标转换
- ✅ 三角形优化：完美的轮廓渲染，边框均匀
- ✅ 代码重构：代码量减少 76%，可维护性大幅提升

**下周计划**

- 性能优化
  - 优化 100 个元素的渲染性能（目标 <3s）
  - 实现虚拟滚动/渲染优化
  - 操作性能优化（防抖、节流）
- 进阶功能实现
  - 元素旋转功能（⭐️挑战）
  - 撤销/重做功能（⭐️⭐️⭐️挑战）
  - 组合元素整体变换（缩放、旋转）
  - 深层选择支持（在组合内部直接选择子元素）
- 画笔工具增强
  - 画笔工具栏（设置画笔颜色、宽度等属性）
  - 橡皮擦工具（擦除画笔痕迹）
  - 压感支持（支持压感笔设备）
- 交互体验打磨
  - 优化所有交互细节
  - 添加加载状态和错误处理
  - 优化工具栏和 UI 细节
- 代码质量和测试
  - 代码规范检查和修复
  - 完善 TypeScript 类型定义
  - 添加单元测试

**风险与阻塞项**

- 100 个元素渲染性能优化需要提前规划，确保加载时间控制在目标范围内，可能需要实现虚拟滚动或渲染优化策略
- 组合元素的递归渲染可能影响性能，需要测试和优化
- 深层嵌套组合的交互逻辑较为复杂，需要仔细设计选择和编辑机制
- 撤销/重做功能需要设计完整的历史记录系统，技术难度较高

---

## 附录

### A. 项目仓库

- **GitHub**: https://github.com/Anchen0823/DreamWeaver

### B. 相关文档

- [数据结构设计文档](./DATA_STRUCTURE.md) - 完整的数据结构设计，包含组合元素详细说明
- [浮动工具栏实现指南](./FLOATING_TOOLBAR_GUIDE.md) - 浮动工具栏实现详解
- [代码重构文档](./REFACTORING.md) - 代码重构过程和最佳实践
- [定位指南](./POSITIONING_GUIDE.md) - 坐标系统和定位逻辑说明

### C. 技术参考

- [Vue 3 官方文档](https://vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)




