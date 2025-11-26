import type { Ref } from 'vue'
import type { CanvasElement } from '../types/canvas'
import type { useViewport } from './useViewport'
import type { useCanvasInteraction } from './useCanvasInteraction'
import type { useElementSelection } from './useElementSelection'
import type { useClipboard } from './useClipboard'
import type { useDrawing } from './useDrawing'
import type { useTextEditing } from './useTextEditing'
import type { useResize } from './useResize'
import type { useElementDrag } from './useElementDrag'
import { screenToCanvas } from '../utils/coordinate-utils'

/**
 * 画布事件处理 Composable
 * 统一处理鼠标、键盘等事件
 */
export function useCanvasEvents(
  containerRef: Ref<HTMLElement | undefined>,
  elements: { value: CanvasElement[] },
  activeTool: Ref<string | null | undefined>,
  viewport: ReturnType<typeof useViewport>,
  interaction: ReturnType<typeof useCanvasInteraction>,
  selection: ReturnType<typeof useElementSelection>,
  clipboard: ReturnType<typeof useClipboard>,
  drawing: ReturnType<typeof useDrawing>,
  textEditing: ReturnType<typeof useTextEditing>,
  resize: ReturnType<typeof useResize>,
  elementDrag: ReturnType<typeof useElementDrag>,
  onToolChange: (tool: string | null) => void
) {
  // 处理容器鼠标按下事件
  const handleContainerMouseDown = (e: MouseEvent) => {
    // 如果正在编辑文本，不处理其他鼠标事件
    if (textEditing.isEditingText.value) {
      const target = e.target as HTMLElement
      // 如果点击的是文本编辑输入框，不处理
      if (target.closest('.text-edit-input')) {
        return
      }
      // 否则保存并退出编辑模式
      if (textEditing.editingTextElementId.value) {
        textEditing.handleTextEditSave(textEditing.editingTextElementId.value)
      }
      return
    }
    
    // 如果点击的是元素，不触发绘制或框选
    const target = e.target as HTMLElement
    if (target.closest('.element') && !target.closest('.preview')) {
      return
    }

    // 如果点击的是文本工具栏，不触发框选
    if (target.closest('.text-toolbar')) {
      return
    }

    // 如果有激活的工具，开始绘制
    const tool = activeTool.value
    if (tool && (tool === 'rectangle' || tool === 'rounded-rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'text' || tool === 'image')) {
      if (e.button === 0) {
        // 图片工具需要先选择图片
        if (tool === 'image' && !drawing.pendingImageData.value) {
          e.preventDefault()
          return
        }
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        
        // 转换为画布坐标
        const canvasPos = screenToCanvas(
          e.clientX,
          e.clientY,
          rect,
          viewport.viewportOffsetX.value,
          viewport.viewportOffsetY.value,
          viewport.zoom.value,
          viewport.scale.value
        )
        
        // 开始绘制
        drawing.startDrawing(tool, canvasPos, drawing.pendingImageData.value)
        
        e.preventDefault()
        return
      }
    }

    // 先尝试处理画布拖拽
    const handled = interaction.handleMouseDown(e)
    if (handled) {
      return
    }

    // 左键处理框选
    if (e.button === 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      selection.startSelection(x, y, e.ctrlKey || e.metaKey)
      e.preventDefault()
    }
  }

  // 处理容器鼠标移动事件
  const handleContainerMouseMove = (e: MouseEvent) => {
    // 如果正在调整大小，优先处理调整大小
    if (resize.isResizing.value && containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      resize.updateResize(e.clientX, e.clientY, rect)
      e.preventDefault()
      return
    }

    // 如果正在拖拽元素，优先处理元素拖拽
    if (elementDrag.isDragging.value && containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      elementDrag.updateDrag(e.clientX, e.clientY, rect)
      e.preventDefault()
      return
    }

    // 更新鼠标位置（用于粘贴）
    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      const canvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        rect,
        viewport.viewportOffsetX.value,
        viewport.viewportOffsetY.value,
        viewport.zoom.value,
        viewport.scale.value
      )
      clipboard.updateMousePosition(canvasPos.x, canvasPos.y)
      
      // 如果正在绘制，更新预览元素
      if (drawing.isDrawing.value) {
        drawing.updateDrawing(canvasPos)
      }
    }

    // 如果正在绘制，不处理其他交互
    if (drawing.isDrawing.value) {
      e.preventDefault()
      return
    }

    // 处理画布拖拽
    const dragHandled = interaction.handleMouseMove(e)
    if (dragHandled) {
      return
    }

    // 处理框选
    if (selection.isSelecting.value) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      selection.updateSelectionPosition(x, y)
      selection.updateSelectionFromRect()
      e.preventDefault()
    }
  }

  // 处理容器鼠标释放事件
  const handleContainerMouseUp = (e?: MouseEvent) => {
    // 如果正在调整大小，结束调整大小
    if (resize.isResizing.value) {
      resize.endResize()
      if (e) {
        e.preventDefault()
      }
      return
    }

    // 如果正在拖拽元素，结束元素拖拽
    if (elementDrag.isDragging.value) {
      elementDrag.endDrag()
      if (e) {
        e.preventDefault()
      }
      return
    }

    // 如果正在绘制，完成绘制
    if (drawing.isDrawing.value) {
      const newElement = drawing.finishDrawing()
      
      if (e && newElement) {
        elements.value.push(newElement)
        
        // 如果是文本元素，标记为新创建的并自动进入编辑模式
        if (newElement.type === 'text') {
          textEditing.markAsNewlyCreated(newElement.id)
          // 选中新创建的元素
          selection.selectedElementIds.value = [newElement.id]
          // 自动进入编辑模式
          textEditing.autoStartEditing(newElement.id)
        } else {
          // 选中新创建的元素
          selection.selectedElementIds.value = [newElement.id]
        }
        
        // 绘制完成后，自动切换回move状态（取消工具选择）
        onToolChange(null)
      }
      
      if (e) {
        e.preventDefault()
      }
      return
    }

    // 结束画布拖拽
    const dragHandled = interaction.handleMouseUp()
    if (dragHandled) {
      return
    }

    // 结束框选
    selection.endSelection()
  }

  // 处理容器滚轮事件
  const handleContainerWheel = (e: WheelEvent) => {
    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      interaction.handleWheel(e, rect)
    }
  }

  // 处理键盘按下事件
  const handleKeyDown = (e: KeyboardEvent) => {
    // 如果正在编辑文本，不处理其他键盘事件
    if (textEditing.isEditingText.value) {
      // 只处理 Esc 键（已在 textarea 上处理）
      return
    }
    
    // 处理空格键
    const spaceHandled = interaction.handleKeyDown(e)
    if (spaceHandled) {
      return
    }

    // Ctrl/Cmd + C: 复制
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      if (selection.selectedElementIds.value.length > 0) {
        clipboard.copySelectedElements(selection.selectedElementIds.value, elements.value)
        e.preventDefault()
      }
      return
    }

    // Ctrl/Cmd + V: 粘贴
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      if (clipboard.clipboard.value.length > 0) {
        const newElements = clipboard.pasteElements(elements.value, selection.selectedElementIds)
        elements.value.push(...newElements)
        e.preventDefault()
      }
      return
    }

    // Delete/Backspace: 删除选中元素
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // 如果正在编辑文本（焦点在输入框内），不处理删除
      const activeElement = document.activeElement
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        (activeElement instanceof HTMLElement && activeElement.isContentEditable)
      )) {
        return
      }

      if (selection.selectedElementIds.value.length > 0) {
        // 从元素数组中移除选中的元素
        const selectedIds = selection.selectedElementIds.value
        elements.value = elements.value.filter(element => !selectedIds.includes(element.id))
        
        // 清空选中状态
        selection.selectedElementIds.value = []
        
        e.preventDefault()
      }
      return
    }
  }

  // 处理键盘释放事件
  const handleKeyUp = (e: KeyboardEvent) => {
    interaction.handleKeyUp(e)
  }

  return {
    handleContainerMouseDown,
    handleContainerMouseMove,
    handleContainerMouseUp,
    handleContainerWheel,
    handleKeyDown,
    handleKeyUp
  }
}

