# Session Recap

> 更新日期：2026-05-19

---

## 專案概述

以 react-resizable-panels 為藍本，提煉核心邏輯，實作 Vue 版本的 resizable panel 元件庫，最終獨立發佈為 npm 套件。

---

## 目前進度

- [x] v1 功能範圍確認
- [x] 技術選型
- [x] 專案初始化
- [x] v1 功能規格（Spec）
- [ ] **v1 SA（系統分析/架構設計）— 進行中**
- [ ] v1 TDD 開發

---

## 已完成的關鍵決策

### 技術選型

| 項目 | 決定 |
|------|------|
| 打包工具 | Vite（library mode） |
| 測試框架 | Vitest |
| 套件管理器 | bun |
| 語言 | JavaScript |
| Vue 開發基準 | Vue 2.7 |
| 交付形式 | 編譯產物 + SFC 原始碼（雙軌） |
| Vue 相容範圍 | Vue 2.6 / 2.7 |
| Node 版本 | >= 20.0.0 |

### 架構決策

- 核心邏輯以純 JS class 實作，不依賴 Vue API
- 元件層（Vue SFC）為薄膠水層，純 Options API
- Manager 層不使用 Vue reactivity API（確保 SFC 原始碼在 Vue 2.6 也能用）
- 模組以 OOP 開發，遵守 SOLID 原則
- 使用者直接操作 Manager，未來再用 Facade 包一層方便使用的元件
- 不使用 provide/inject，由使用者主動將 Panel 註冊到 Manager
- 狀態通知採用 callback 機制（Manager 算完新 layout → 呼叫 callback → Panel 更新 data → Vue 重新渲染）

### 開發原則

- TDD：先寫測試再開發（規則檔：`.claude/rules/development/TDD開發原則.md`）
- SOLID + OOP + Facade 模式（規則檔：`.claude/rules/development/程式開發原則.md`）

---

## SA 階段進行中的狀態

### 已完成

- Class Diagram 初版（見 `V1-SA.md`）
- 五個核心模組識別與職責劃分：
  - **ResizableGroupManager** — orchestrator，聚合 Panel，協調各模組
  - **LayoutCalculator** — layout 數學（初始分配、delta 調整、雙向 clamp、100% 不變式）
  - **UnitConverter** — 單位解析（%、px）與轉換
  - **HitRegionDetector** — 命中區域判定、粗/細指標偵測
  - **CursorManager** — cursor 狀態管理（hover / drag / directional / disabled）
- Panel（Vue SFC）不持有 Manager 參照，只需 panelId 和 size（via callback）
- **資料結構定義完成**（見 `V1-SA.md` 資料結構章節）：
  - 輸入面：GroupConfig（含 element）、PanelConfig（含 element）
  - 內部面：ParsedSize、PanelConstraints、PanelData、Layout、HitResult、ConstraintDirection、CursorState、LayoutResult
- **Public API 定義完成**（見 `V1-SA.md` Public API 章節）
- **使用範例完成**（見 `V1-SA.md` 使用範例章節）— 涵蓋三個場景

### 設計決策

- **Panel 不持有約束配置** — defaultSize / minSize / maxSize 在 Manager 層面透過 registerPanel 的 PanelConfig 配置，Panel 是純渲染層，只接收算好的百分比
- **Panel 順序基於 DOM 位置** — Manager 透過 element.offsetLeft/offsetTop 排序，使用者在 registerPanel 時傳入 DOM element
- **原始值與衍生值分離** — PanelData 保留原始 config + 衍生百分比約束，容器 resize 時從原始值重算
- **Layout 用 plain object** — `{ [panelId]: number }`，序列化方便
- **HitResult 用 boundaryIndex** — 命中的是「邊界」而非 panel，v2 擴展時語意清晰
- **registerPanel 回傳 panelId** — Manager 提供 `unRegisterPanel(panelId)` public API，不使用回傳 unregister function 的模式
- **registerPanel 職責單一** — 只做註冊，不觸發 layout 重算（SRP），重算由 activate() 負責
- **內部 Layout 與 Callback LayoutResult 分離** — 內部計算用 `Layout`（`{[panelId]: number}`），callback 傳出用 `LayoutResult`（`{[panelId]: { size, element }}`）
- **activate / deactivate 生命週期** — 可重複循環（SidePanel 展開/收合），deactivate 時已註冊 panels 保留，activate 時重算約束
- **事件機制 on / off** — on 回傳 void，off 需傳入原始 callback 參照，事件註冊在 activate/deactivate 循環中保留
- **Group 容器元素顯式傳入** — GroupConfig 必填 element，作為 ResizeObserver 監聽目標，availableSize 從 Panel 元素加總計算
- **Constructor 支援可選 panelConfigs** — 適用 DOM 已存在的場景（純 JS/HTML、SSR 後），Vue CSR 等場景透過後續 registerPanel 註冊
- **Panel 更新機制延後** — 整體架構完成後再決定 Panel CSS 更新方式，目前只確認 callback payload 結構

---

## 關鍵文件索引

| 文件 | 用途 |
|------|------|
| `PROJECT-CONTEXT.md` | 專案目標、決策記錄、版本規劃、進度 |
| `FEATURE-ANALYSIS-react-resizable-panels.md` | react-resizable-panels 72 項功能分析 |
| `V1-SPEC.md` | v1 功能規格（需求面，8 個章節） |
| `V1-SA.md` | v1 系統分析 / 架構設計（進行中） |
| `.claude/rules/development/TDD開發原則.md` | TDD 開發流程規範 |
| `.claude/rules/development/程式開發原則.md` | SOLID、OOP、Facade 原則 |

---

## Playground 測試

`playground/` 目錄下有一個 getter + computed 的測試實驗，用於驗證 Vue 2 的 reactivity 行為：

- **結論**：純 JS class 的 getter 放在 `data()` 內 → computed 會更新；不放在 `data()` 或放在 `setup()` return → 不會更新
- **確認了 callback 機制的必要性**：Manager 狀態變化需要透過 callback 寫入 Panel 的 `data`，才能觸發 Vue 重新渲染

---

## 下次 Session 接續點

1. **描述互動流程** — 拖曳三階段（pointerdown/move/up）、ResizeObserver 流程、事件綁定策略
2. **確認 SA 是否完整** — 資料結構、Public API、使用範例、設計決策都已定義，檢視是否有遺漏
3. **SA 完成後進入 v1 TDD 開發**

---

## 相關資源（外部）

| 資源 | 位置 |
|------|------|
| react-resizable-panels 原始碼 | `/Documents/source/react-resizable-panels/` |
| sidePanelDemo（先前原型） | `/Documents/tutorial/resizable-panels-tutorial/sidePanelDemo/` |
