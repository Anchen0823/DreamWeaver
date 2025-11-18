# DreamWeaver (画布产品课程项目)
A canvas app for ByteDance campus
## 1. 项目简介



本项目是“画布产品课程”的结项作业，旨在从零到一实现一个简化版的画布产品 (如 Figma, Excalidraw)。项目代号 "DreamWeaver"，将重点探索图形渲染、交互设计与状态管理的核心逻辑。

**技术栈**: Vue 3 + TypeScript + DOM 

## 2. 如何启动项目



1.  **环境要求**:
    * Node.js (建议 v18+)
    * pnpm (或 npm / yarn)

2.  **克隆仓库**:
    ```bash
    git clone [https://github.com/Anchen0823/DreamWeaver]
    cd DreamWeaver
    ```

3.  **安装依赖**:
    ```bash
    npm install
    ```

4.  **启动本地开发环境**:
    ```bash
    npm run dev
    ```

5.  在浏览器中打开 [[待补充](http://localhost:5173/)] (或提示的地址)。

## 3. 主要目录结构说明

```
DreamWeaver/
├── app/                    # 主应用目录
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   │   └── Canvas.vue  # 画布组件
│   │   ├── stores/         # Pinia 状态管理（待实现）
│   │   ├── types/          # TypeScript 类型定义（待实现）
│   │   ├── App.vue         # 根组件
│   │   └── main.ts         # 入口文件
│   ├── public/             # 静态资源
│   └── package.json        # 项目配置
├── docs/                   # 文档目录
│   └── DATA_STRUCTURE.md   # 数据结构设计文档
└── README.md               # 项目说明
```




## 4. 已实现功能列表



### 第 1 周 (2025-11-21)
* [必做] 完成项目规划与技术选型 (Vue 3 + DOM)
* [必做] 搭建项目框架 (Vite + TS + Pinia + ESLint)
* [必做] 完成核心数据结构设计
* [必做] 实现基础渲染 Demo (渲染一个矩形)

### 第 2 周 (2025-11-28)
* [ ] (待办)

### 第 3 周 (2025-12-05)
* [ ] (待办)

---

### 进阶挑战 (Challenges)
* [ ] (待办)



## 5. 关键脚本说明



* `npm run dev`: 启动本地开发服务器
* `npm run build`: 构建生产环境代码
* `npm run lint`: 运行代码规范检查