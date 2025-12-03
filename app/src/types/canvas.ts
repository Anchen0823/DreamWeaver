/**
 * 画布元素基础接口
 * 所有画布元素都继承此接口
 */
export interface BaseElement {
  // 唯一标识符
  id: string
  
  // 元素类型
  type: ElementType
  
  // 位置坐标（相对于画布左上角）
  x: number
  y: number
  
  // 尺寸
  width: number
  height: number
  
  // 旋转角度（单位：度，未来扩展）
  rotation?: number
  
  // 是否锁定（未来扩展）
  locked?: boolean
  
  // 是否可见（未来扩展）
  visible?: boolean
  
  // 图层顺序（z-index，未来扩展）
  zIndex?: number
}

/**
 * 元素类型
 */
export type ElementType = 
  | 'rectangle'           // 矩形
  | 'rounded-rectangle'   // 圆角矩形
  | 'circle'              // 圆形
  | 'triangle'            // 三角形
  | 'image'               // 图片
  | 'text'                // 富文本
  | 'brush'               // 画笔痕迹
  | 'group'               // 组合（未来扩展）

/**
 * 图形元素接口
 */
export interface ShapeElement extends BaseElement {
  type: 'rectangle' | 'rounded-rectangle' | 'circle' | 'triangle'
  
  // 背景色（CSS颜色值）
  backgroundColor: string
  
  // 边框宽度（像素）
  borderWidth: number
  
  // 边框颜色（CSS颜色值）
  borderColor: string
  
  // 圆角半径（仅圆角矩形使用，单位：像素）
  borderRadius?: number
}

/**
 * 图片元素接口
 */
export interface ImageElement extends BaseElement {
  type: 'image'
  
  // 图片URL（base64 或 外部URL）
  src: string
  
  // 图片原始宽度
  originalWidth: number
  
  // 图片原始高度
  originalHeight: number
  
  // 滤镜类型
  filter?: 'none' | 'grayscale' | 'blur' | 'contrast'
  
  // 滤镜强度（0-100，仅用于某些滤镜）
  filterIntensity?: number
}

/**
 * 文本元素接口
 */
export interface TextElement extends BaseElement {
  type: 'text'
  
  // 文本内容
  content: string
  
  // 字体族
  fontFamily: string
  
  // 字号（像素）
  fontSize: number
  
  // 文字颜色
  color: string
  
  // 背景色（可选）
  backgroundColor?: string
  
  // 文本样式
  bold?: boolean        // 加粗
  italic?: boolean      // 斜体
  underline?: boolean   // 下划线
  strikethrough?: boolean // 删除线
  
  // 对齐方式
  textAlign?: 'left' | 'center' | 'right'
  
  // 行高
  lineHeight?: number
}

/**
 * 画笔痕迹点坐标
 */
export interface BrushPoint {
  x: number  // X坐标（相对于元素左上角）
  y: number  // Y坐标（相对于元素左上角）
  pressure?: number  // 压力值（0-1，可选，用于未来支持压感）
}

/**
 * 画笔痕迹元素接口
 */
export interface BrushElement extends BaseElement {
  type: 'brush'
  
  // 路径点数组（相对于元素左上角的坐标）
  points: BrushPoint[]
  
  // 画笔颜色（CSS颜色值）
  color: string
  
  // 画笔宽度（像素）
  strokeWidth: number
  
  // 画笔样式（可选）
  lineCap?: 'butt' | 'round' | 'square'  // 线帽样式
  lineJoin?: 'miter' | 'round' | 'bevel'  // 连接样式
}

/**
 * 组合元素接口
 */
export interface GroupElement extends BaseElement {
  type: 'group'
  
  // 子元素列表
  children: CanvasElement[]
}

/**
 * 画布元素联合类型
 */
export type CanvasElement = ShapeElement | ImageElement | TextElement | BrushElement | GroupElement

/**
 * 画布配置接口
 */
export interface CanvasConfig {
  // 画布宽度（像素）
  width: number
  
  // 画布高度（像素）
  height: number
  
  // 画布背景色
  backgroundColor?: string
  
  // 是否无限画布（未来扩展）
  infinite?: boolean
}

/**
 * 视口状态接口
 */
export interface ViewportState {
  // 缩放比例（1.0 为原始大小）
  zoom: number
  
  // 视口偏移量（像素）
  offsetX: number
  offsetY: number
  
  // 最小缩放比例
  minZoom?: number
  
  // 最大缩放比例
  maxZoom?: number
}

/**
 * 画布状态接口
 */
export interface CanvasState {
  // 画布配置
  config: CanvasConfig
  
  // 视口状态
  viewport: ViewportState
  
  // 所有画布元素
  elements: CanvasElement[]
  
  // 选中的元素ID列表
  selectedElementIds: string[]
}