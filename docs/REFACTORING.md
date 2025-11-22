# 代码重构优化总结

## 重构概述

本次重构将原本 1054 行的单文件组件 `Canvas.vue` 拆分为多个可复用的 composables 和工具函数，大幅提升了代码的可维护性和可测试性。

## 重构内容

### 1. 创建 Composables

#### `useViewport.ts` - 视口状态管理
- **职责**: 管理画布的缩放、偏移、网格等视口相关状态
- **提取的状态**:
  - `zoom`, `viewportOffsetX`, `viewportOffsetY`
  - `actualCanvasWidth`, `actualCanvasHeight`, `scale`
  - `gridSize`
- **提取的计算属性**:
  - `canvasStyle` - 画布样式
  - `gridBackgroundStyle` - 网格背景样式
- **提取的方法**:
  - `updateCanvasSize()` - 更新画布尺寸
  - `setZoom()` - 设置缩放
  - `adjustZoom()` - 调整缩放
  - `moveViewport()` - 移动视口

#### `useCanvasInteraction.ts` - 画布交互管理
- **职责**: 处理鼠标拖拽、滚轮缩放等交互逻辑
- **提取的状态**:
  - `isDragging` - 拖拽状态
  - `isSpacePressed` - 空格键状态
- **提取的方法**:
  - `handleMouseDown()` - 处理鼠标按下
  - `handleMouseMove()` - 处理鼠标移动
  - `handleMouseUp()` - 处理鼠标释放
  - `handleWheel()` - 处理滚轮事件
  - `handleKeyDown()` - 处理键盘按下
  - `handleKeyUp()` - 处理键盘释放

#### `useElementSelection.ts` - 元素选择管理
- **职责**: 处理元素的选择、框选等逻辑
- **提取的状态**:
  - `selectedElementIds` - 选中的元素ID列表
  - `isSelecting` - 框选状态
  - 框选相关的坐标状态
- **提取的方法**:
  - `isElementSelected()` - 检查元素是否被选中
  - `handleElementMouseDown()` - 处理元素鼠标按下
  - `startSelection()` - 开始框选
  - `updateSelectionPosition()` - 更新框选位置
  - `updateSelectionFromRect()` - 根据框选框更新选中元素
  - `endSelection()` - 结束框选
  - `getSelectionBoxStyle()` - 获取选中框样式
  - `getSelectionRectStyle()` - 获取框选框样式

#### `useClipboard.ts` - 剪贴板管理
- **职责**: 处理元素的复制粘贴逻辑
- **提取的状态**:
  - `clipboard` - 剪贴板数据
  - `mouseX`, `mouseY` - 鼠标位置
- **提取的方法**:
  - `copySelectedElements()` - 复制选中的元素
  - `pasteElements()` - 粘贴元素
  - `updateMousePosition()` - 更新鼠标位置
  - `deepCloneElement()` - 深拷贝元素
  - `generateNewElementId()` - 生成新的元素ID

### 2. 创建工具函数

#### `style-calculator.ts` - 样式计算工具
- **职责**: 统一处理各种元素的样式计算逻辑
- **提取的函数**:
  - `getBaseStyle()` - 获取基础样式
  - `getShapeStyle()` - 获取图形样式
  - `getImageStyle()` - 获取图片样式
  - `getTextStyle()` - 获取文本样式
  - `getTextElementStyle()` - 获取文本元素容器样式
  - `getElementStyle()` - 统一获取元素样式
  - `formatTextContent()` - 格式化文本内容

#### `coordinate-utils.ts` - 坐标转换工具
- **职责**: 处理画布坐标和屏幕坐标之间的转换
- **提取的函数**:
  - `screenToCanvas()` - 屏幕坐标转画布坐标
  - `canvasToScreen()` - 画布坐标转屏幕坐标

#### `mock-data.ts` - 测试数据
- **职责**: 存储测试用的画布元素数据
- **提取的数据**:
  - `mockElements` - 测试元素数组

### 3. 重构主组件

重构后的 `Canvas.vue` 从 1054 行减少到约 250 行，主要变化：

- **代码行数**: 从 1054 行减少到约 250 行（减少约 76%）
- **职责清晰**: 组件只负责组合各个 composables 和渲染
- **可测试性**: 各个功能模块可以独立测试
- **可维护性**: 代码结构清晰，易于理解和修改

## 重构优势

### 1. 代码组织更清晰
- 按功能模块拆分，每个 composable 职责单一
- 工具函数独立，便于复用

### 2. 可维护性提升
- 修改某个功能时，只需关注对应的 composable
- 减少了代码耦合，降低了修改风险

### 3. 可测试性提升
- 每个 composable 可以独立测试
- 工具函数可以单独进行单元测试

### 4. 可复用性提升
- composables 可以在其他组件中复用
- 工具函数可以在整个项目中复用

### 5. 类型安全
- 所有 composables 和工具函数都有完整的 TypeScript 类型定义
- 编译时就能发现类型错误

## 后续优化建议

### 1. 性能优化
- [ ] 添加防抖/节流处理（如滚轮缩放、鼠标移动）
- [ ] 实现虚拟滚动/渲染优化（大量元素时）
- [ ] 使用 `requestAnimationFrame` 优化动画

### 2. 功能扩展
- [ ] 添加撤销/重做功能（可以使用命令模式）
- [ ] 添加元素拖拽移动功能
- [ ] 添加元素缩放功能
- [ ] 添加元素旋转功能

### 3. 代码质量
- [ ] 添加单元测试
- [ ] 添加 E2E 测试
- [ ] 完善错误处理
- [ ] 添加日志记录

### 4. 状态管理
- [ ] 考虑使用 Pinia store 管理全局状态
- [ ] 实现数据持久化（IndexedDB）

## 文件结构

```
app/src/
├── components/
│   └── Canvas.vue          # 主组件（重构后约 250 行）
├── composables/            # 新增目录
│   ├── useViewport.ts       # 视口管理
│   ├── useCanvasInteraction.ts  # 画布交互
│   ├── useElementSelection.ts    # 元素选择
│   └── useClipboard.ts      # 剪贴板管理
├── utils/                   # 新增目录
│   ├── style-calculator.ts # 样式计算
│   ├── coordinate-utils.ts  # 坐标转换
│   └── mock-data.ts        # 测试数据
└── types/
    └── canvas.ts           # 类型定义
```

## 总结

本次重构成功将大型单文件组件拆分为多个可复用的模块，大幅提升了代码的可维护性和可测试性。重构后的代码结构清晰，职责分明，为后续的功能扩展和性能优化打下了良好的基础。

