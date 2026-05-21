# Vue Resizable Panel — 專案 Context

> 建立日期：2026-05-08
> 用途：記錄專案目標、討論決策與規劃方向，供跨 session 延續 context

---

## 專案目標

以 [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) 的設計為藍本，**提煉核心邏輯**，實作一個 Vue 版本的 resizable panel 元件庫，最終**獨立發佈為套件**。

不追求與 react-resizable-panels 功能全覆蓋，而是取其設計精髓，按版本逐步擴展功能。

---

## 已確認的決策

### 1. 定位：提煉核心，非完整移植

- 從 react-resizable-panels 的功能中挑選核心功能
- 按版本演進逐步補齊，而非一次到位
- 最終目標是可獨立發佈的 npm 套件

### 2. Vue 2 / Vue 3 雙版本支援策略

- **採用純 Options API**，不依賴 `@vue/composition-api` plugin
- 原生 Vue 2 即可運行，不需要額外 plugin
- Vue 2 和 Vue 3 的 Options API 有高度重疊，以此為共通基礎
- 核心邏輯盡量抽到**純 JS class / 函式**（不依賴 Vue API），元件層只做薄薄的膠水

### 3. 架構參考：sidePanelDemo 的分離模式

已有的 `sidePanelDemo`（位於 `/tutorial/resizable-panels-tutorial/sidePanelDemo/`）展示了核心邏輯與 Vue 元件分離的做法：

- `ResizablePanelManager.js` — 純 JS class，包含所有 resize 邏輯
- `Group.vue` — 薄元件，new Manager → provide context → lifecycle 橋接
- `Panel.vue` — 薄元件，inject context → computed style → 註冊/反註冊

新版本延續這個模式，但從 Composition API 改為 Options API。

### 4. 技術選型

| 項目 | 決定 |
|------|------|
| 打包工具 | Vite（library mode） |
| 測試框架 | Vitest |
| 套件管理器 | bun |
| 語言 | JavaScript |
| Vue 開發基準 | Vue 2.7 |
| Vite 插件 | `@vitejs/plugin-vue2` |
| 交付形式 | 編譯產物 + SFC 原始碼（雙軌） |
| Vue 相容範圍 | Vue 2.6 / 2.7 皆可使用 |

**核心約束：**
- 元件層（SFC）：純 Options API，不使用任何 Vue 2.7 backport 功能（Composition API、defineComponent 等）
- Manager 層：純 JS class / 函式，不依賴 Vue reactivity API（確保 SFC 原始碼在 2.6 也能運作）

### 5. 開發方法論

- 採用 TDD（Test-Driven Development）— 先寫測試再開發
- 詳見 `.claude/rules/development/TDD開發原則.md`

---

## 版本演進規劃（已確認 v1）

### v1：2 Panel + 基礎拖曳（已確認）

**範圍（對應 FEATURE-ANALYSIS 編號）：**

| 分類 | 功能 | 編號 |
|------|------|------|
| 元件結構 | PanelGroup + Panel（雙層 div） | 1, 2, 66-69 |
| 註冊機制 | Panel 註冊/反註冊（provide/inject） | 4 |
| Layout 計算 | 初始分配 + 100% 不變式 + 雙向 clamp | 6, 7, 8 |
| 單位 | % 和 px | 10, 11, 15 |
| 拖曳 | Pointer Events 三階段（down/move/up） | 16 |
| 命中區域 | 邊界 gap 判定（無 Separator 元件） | 17 |
| 指標適應 | coarse/fine 命中區域自適應 | 18 |
| 游標回饋 | hover cursor + 拖曳全域 cursor + userSelect | 19, 20, 21 |
| 容器 Resize | ResizeObserver + preserve-relative-size + 約束修正 | 40, 41, 43 |
| 事件回調 | onLayoutChange（每幀）/ onDragEnd（結束） | 70, 71 |

**刻意排除：**
- Separator 元件（v2）
- 垂直方向
- N Panel（≥3）
- Collapsible
- 鍵盤支援
- Imperative API
- 持久化
- ARIA / Accessibility
- SSR
- em/rem/vh/vw 單位（% 和 px 已涵蓋主要場景）

### v2（暫定方向）：N 個橫向 Panel

- 支援 3 個以上 Panel
- Delta 傳播演算法
- Separator 元件（可視化拖曳把手）
- 條件渲染（動態增減 panel）

### 後續版本（待討論）

- 垂直方向
- Collapsible
- 鍵盤支援 + ARIA
- Imperative API
- 持久化（autoSaveId + storage）
- 進階 cursor
- preserve-pixel-size
- iframe 處理
- SSR

> 版本演進的具體功能分配，待完成規格撰寫後再最終確認。

---

## 相關資源

| 資源 | 位置 | 說明 |
|------|------|------|
| react-resizable-panels 原始碼 | `/Documents/source/react-resizable-panels/` | 參考來源 |
| react-resizable-panels 功能分析 | `./FEATURE-ANALYSIS-react-resizable-panels.md` | 72 項功能完整清單 |
| 教學文件 | `/Documents/tutorial/resizable-panels-tutorial/` | 從零建立 resizable panel 的教學 |
| sidePanelDemo | `/Documents/tutorial/resizable-panels-tutorial/sidePanelDemo/` | 先前提煉的 Vue 版原型（Composition API） |
| sidePanelDemo 實作計畫 | `sidePanelDemo/IMPLEMENTATION-PLAN.md` | Phase 1-5 已完成 |
| sidePanelDemo px 支援規劃 | `sidePanelDemo/PX-UNIT-SUPPORT-PLAN.md` | px 單位支援的詳細設計 |
| sidePanelDemo 使用文件 | `sidePanelDemo/USAGE.md` | 元件 API、使用範例、生命週期流程圖 |

---

## 進度

- [x] v1 功能範圍確認
- [x] 技術選型（Vite + Vitest + bun + JS + Vue 2.7）
- [x] 專案初始化與目錄結構建立
- [x] 撰寫 v1 功能規格（Spec）→ `V1-SPEC.md`
- [ ] v1 SA（系統分析/架構設計）→ `V1-SA.md`（進行中）
- [ ] v1 TDD 開發
