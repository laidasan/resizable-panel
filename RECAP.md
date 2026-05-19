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
- [x] v1 SA（系統分析/架構設計）
- [x] v1 TDD 開發順序規劃 + Task 拆分
- [x] **v1 TDD 開發 — Task 01 UnitConverter 完成**
- [x] **v1 TDD 開發 — Task 02 LayoutCalculator 完成**

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

### 測試組織

- 測試與原始碼分離，目錄結構鏡像對映
- 範例：`src/core/UnitConverter.js` → `tests/core/UnitConverter.test.js`

---

## SA 完成摘要

SA 已通過完整性檢視（Spec 8 個章節逐條比對），詳見 `V1-SA.md`。

### 五個核心模組

| 模組 | 職責 |
|------|------|
| ResizableGroupManager | orchestrator，協調各模組，對外提供 API |
| LayoutCalculator | layout 數學（初始分配、delta 調整、雙向 clamp、100% 不變式、layoutsEqual 含浮點容差） |
| UnitConverter | 單位解析（%、px）與轉換 |
| HitRegionDetector | 命中區域判定（座標比對，即時計算）、粗/細指標偵測 |
| CursorManager | 拖曳期間全域樣式管理（cursor + user-select），作用於 document.body |

### SA 涵蓋範圍

- Class Diagram（含 DragState）
- 資料結構（輸入面 + 內部面，共 11 種）
- Public API + 使用範例（3 個場景）
- 互動流程（事件綁定策略、拖曳三階段含 iframe 偵測、ResizeObserver）
- 設計決策（17 項）

### 設計決策

- **Panel 不持有約束配置** — Panel 是純渲染層，只接收算好的百分比
- **Panel 順序基於 DOM 位置** — offsetLeft/offsetTop 排序
- **原始值與衍生值分離** — 容器 resize 時從原始值重算
- **Layout 用 plain object** — `{ [panelId]: number }`
- **HitResult 用 boundaryIndex** — 命中「邊界」而非 panel
- **registerPanel 回傳 panelId** + unRegisterPanel API
- **registerPanel 職責單一** — 只做註冊，不觸發重算（SRP）
- **內部 Layout 與 Callback LayoutResult 分離**
- **activate / deactivate 生命週期** — 可重複循環，panels 保留
- **事件機制 on / off** — 在 activate/deactivate 循環中保留
- **Group 容器元素顯式傳入** — 作為 ResizeObserver 監聽目標
- **Constructor 支援可選 panelConfigs**
- **Panel 更新機制延後** — 目前只確認 callback payload 結構
- **ResizeObserver 只觀察 Group 容器** — 決策記錄見 `ADR-ResizeObserver-觀察範圍.md`
- **Hit Region 即時計算** — v1 不做預算 cache，座標比對
- **拖曳 delta 基於 baseLayout** — 非累計式，避免浮點誤差漂移
- **setPointerCapture 延遲到 pointermove** — 避免影響 click 事件
- **拖曳期間禁止文字選取** — CursorManager 在 document.body 加 user-select: none
- **iframe 指標釋放偵測** — pointermove 中檢查 event.buttons === 0
- **約束衝突按 DOM 順序處理** — 靠前 panel 優先，級聯剩餘，無法滿足 100% 則回退
- **事件去重含浮點容差** — LayoutCalculator.layoutsEqual() 比較，相同則不觸發

---

## 關鍵文件索引

| 文件 | 用途 |
|------|------|
| `PROJECT-CONTEXT.md` | 專案目標、決策記錄、版本規劃、進度 |
| `FEATURE-ANALYSIS-react-resizable-panels.md` | react-resizable-panels 72 項功能分析 |
| `V1-SPEC.md` | v1 功能規格（需求面，8 個章節） |
| `V1-SA.md` | v1 系統分析 / 架構設計（完成） |
| `ADR-ResizeObserver-觀察範圍.md` | 架構決策：ResizeObserver 只觀察 Group 容器 |
| `.claude/rules/development/TDD開發原則.md` | TDD 開發流程規範 |
| `.claude/rules/development/程式開發原則.md` | SOLID、OOP、Facade 原則 |

---

## Playground 測試

`playground/` 目錄下有一個 getter + computed 的測試實驗，用於驗證 Vue 2 的 reactivity 行為：

- **結論**：純 JS class 的 getter 放在 `data()` 內 → computed 會更新；不放在 `data()` 或放在 `setup()` return → 不會更新
- **確認了 callback 機制的必要性**：Manager 狀態變化需要透過 callback 寫入 Panel 的 `data`，才能觸發 Vue 重新渲染

---

## TDD 開發計畫

開發順序（bottom-up，無依賴 → 有依賴）：

| 順序 | Task | 模組 | 依賴 | 狀態 |
|------|------|------|------|------|
| 01 | `tasks/01-UnitConverter.md` | UnitConverter | 無 | done |
| 02 | `tasks/02-LayoutCalculator.md` | LayoutCalculator | UnitConverter | done |
| 03 | `tasks/03-HitRegionDetector.md` | HitRegionDetector | 無 | pending |
| 04 | `tasks/04-CursorManager.md` | CursorManager | 無 | pending |
| 05 | `tasks/05-ResizableGroupManager.md` | ResizableGroupManager | 全部 | pending |
| 06 | `tasks/06-Panel-Vue-SFC.md` | Panel (Vue SFC) | Manager | pending |

Task 02-04 之間無依賴，完成 01 後可平行開發。

---

## UnitConverter 邊界行為決策（2026-05-19）

參考 react-resizable-panels 原始碼後，確認以下處理策略：

| 項目 | 決定 |
|------|------|
| parseFloat 得到 NaN | 轉為 0 |
| 純數字 / 字串無單位 | 視為 %（與原版不同，原版純數字 = px） |
| 負數 | parse 層不攔截，交由下游 clamp |
| 不支援的單位 | throw Error |
| availableSize = 0 | 回退預設，容器可見時重算 |
| 轉換結果超 0-100 | 不 clamp，直接回傳（SRP，clamp 是 LayoutCalculator 職責） |

決策已記錄至 `V1-SA.md`（UnitConverter 邊界行為章節），Task 已更新至 `tasks/01-UnitConverter.md`。

---

## LayoutCalculator 設計決策（2026-05-19）

| 項目 | 決定 |
|------|------|
| defaultSize 加總 ≠ 100% | 按比例 normalize 到 100%（沿用 react-resizable-panels） |
| adjustLayoutByDelta 簽章 | 加入 `boundaryIndex` 參數，預留多 panel 彈性 |
| validateLayout 衝突處理 | best-effort clamp + 重分配，永遠回傳合法 Layout |
| adjustLayoutByDelta 衝突處理 | 無法完整套用 delta 時回傳 baseLayout（全有或全無） |
| 浮點容差策略 | `toFixed(3)` 後比較（沿用 react-resizable-panels） |
| 約束衝突優先序 | 第一輪 clamp 到 min/max，overflow 從後往前扣（DOM 順序前面的優先） |

---

## 下次 Session 接續點

1. **開始 Task 03 — HitRegionDetector TDD 開發**（無依賴）
2. Task 04（CursorManager）也無依賴，可平行開發

---

## 相關資源（外部）

| 資源 | 位置 |
|------|------|
| react-resizable-panels 原始碼 | `/Documents/source/react-resizable-panels/` |
| sidePanelDemo（先前原型） | `/Documents/tutorial/resizable-panels-tutorial/sidePanelDemo/` |
