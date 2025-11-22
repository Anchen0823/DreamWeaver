import { ref, watch, type Ref } from 'vue'
import type { CanvasElement } from '../types/canvas'
import { persistenceService, type CanvasData } from '../utils/persistence'

/**
 * 持久化 Composable
 * 提供自动保存和数据恢复功能
 */
export function usePersistence(
  elements: Ref<CanvasElement[]>,
  viewport: {
    zoom: Ref<number>
    viewportOffsetX: Ref<number>
    viewportOffsetY: Ref<number>
  }
) {
  const isInitialized = ref(false)
  const isSaving = ref(false)
  const lastSavedAt = ref<number | null>(null)
  const saveError = ref<string | null>(null)

  // 自动保存的防抖定时器
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  const AUTO_SAVE_DELAY = 1000 // 1秒后自动保存

  /**
   * 保存数据到 IndexedDB
   */
  const save = async (): Promise<void> => {
    try {
      isSaving.value = true
      saveError.value = null

      // 确保数据是可序列化的纯对象
      // elements.value 已经是数组，但我们需要确保它是纯数组而不是 Vue Proxy
      const elementsData = Array.isArray(elements.value) 
        ? elements.value.map(el => ({ ...el })) 
        : []

      const data: CanvasData = {
        elements: elementsData,
        viewport: {
          zoom: Number(viewport.zoom.value) || 1,
          offsetX: Number(viewport.viewportOffsetX.value) || 0,
          offsetY: Number(viewport.viewportOffsetY.value) || 0
        },
        savedAt: Date.now()
      }

      await persistenceService.save(data)
      lastSavedAt.value = data.savedAt
    } catch (error) {
      console.error('保存数据失败:', error)
      saveError.value = error instanceof Error ? error.message : '保存失败'
    } finally {
      isSaving.value = false
    }
  }

  /**
   * 防抖保存
   */
  const debouncedSave = (): void => {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      save()
    }, AUTO_SAVE_DELAY)
  }

  /**
   * 加载数据
   */
  const load = async (): Promise<CanvasData | null> => {
    try {
      const data = await persistenceService.load()
      if (data) {
        // 恢复元素数据
        elements.value = data.elements || []
        
        // 恢复视口状态
        if (data.viewport) {
          viewport.zoom.value = data.viewport.zoom || 1
          viewport.viewportOffsetX.value = data.viewport.offsetX || 0
          viewport.viewportOffsetY.value = data.viewport.offsetY || 0
        }

        lastSavedAt.value = data.savedAt
        return data
      }
      return null
    } catch (error) {
      console.error('加载数据失败:', error)
      saveError.value = error instanceof Error ? error.message : '加载失败'
      return null
    }
  }

  /**
   * 初始化持久化服务
   */
  const init = async (): Promise<void> => {
    if (isInitialized.value) {
      return
    }

    try {
      await persistenceService.init()
      isInitialized.value = true

      // 尝试加载已保存的数据
      await load()
    } catch (error) {
      console.error('初始化持久化服务失败:', error)
      saveError.value = error instanceof Error ? error.message : '初始化失败'
    }
  }

  /**
   * 清除所有保存的数据
   */
  const clear = async (): Promise<void> => {
    try {
      await persistenceService.clear()
      lastSavedAt.value = null
      saveError.value = null
    } catch (error) {
      console.error('清除数据失败:', error)
      saveError.value = error instanceof Error ? error.message : '清除失败'
    }
  }

  // 监听元素变化，自动保存
  watch(
    elements,
    () => {
      if (isInitialized.value) {
        debouncedSave()
      }
    },
    { deep: true }
  )

  // 监听视口变化，自动保存
  watch(
    [viewport.zoom, viewport.viewportOffsetX, viewport.viewportOffsetY],
    () => {
      if (isInitialized.value) {
        debouncedSave()
      }
    }
  )

  return {
    // 状态
    isInitialized,
    isSaving,
    lastSavedAt,
    saveError,
    // 方法
    init,
    save,
    load,
    clear
  }
}

