import type { CanvasElement } from '../types/canvas'

/**
 * 画布数据接口
 */
export interface CanvasData {
  // 画布元素
  elements: CanvasElement[]
  // 视口状态
  viewport: {
    zoom: number
    offsetX: number
    offsetY: number
  }
  // 保存时间戳
  savedAt: number
}

/**
 * IndexedDB 数据库名称和版本
 */
const DB_NAME = 'DreamWeaver'
const DB_VERSION = 1
const STORE_NAME = 'canvasData'

/**
 * IndexedDB 存储工具类
 */
class PersistenceService {
  private db: IDBDatabase | null = null

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('无法打开 IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }

  /**
   * 深拷贝并序列化数据，确保数据可以被 IndexedDB 存储
   */
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
      console.error('数据内容:', data)
      throw new Error(`数据序列化失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 保存画布数据
   */
  async save(data: CanvasData): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        
        // 序列化数据，确保可被 IndexedDB 存储
        const serializedData = this.serializeData(data)
        
        const dataToSave = {
          id: 'current',
          ...serializedData,
          savedAt: Date.now()
        }

        const request = store.put(dataToSave)

        request.onerror = () => {
          reject(new Error('保存数据失败'))
        }

        request.onsuccess = () => {
          resolve()
        }
      } catch (error) {
        reject(error instanceof Error ? error : new Error('保存数据失败'))
      }
    })
  }

  /**
   * 加载画布数据
   */
  async load(): Promise<CanvasData | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get('current')

      request.onerror = () => {
        reject(new Error('加载数据失败'))
      }

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          resolve({
            elements: result.elements || [],
            viewport: result.viewport || {
              zoom: 1,
              offsetX: 0,
              offsetY: 0
            },
            savedAt: result.savedAt || Date.now()
          })
        } else {
          resolve(null)
        }
      }
    })
  }

  /**
   * 清除所有数据
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onerror = () => {
        reject(new Error('清除数据失败'))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }
}

// 导出单例
export const persistenceService = new PersistenceService()

