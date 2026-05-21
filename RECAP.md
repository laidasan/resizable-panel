# Session Recap

> 更新日期：2026-05-20（Session 6）

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
- [x] **v1 TDD 開發 — Task 03 HitRegionDetector 完成**
- [x] **v1 TDD 開發 — Task 04 CursorManager 完成**
- [x] **v1 TDD 開發 — Task 05 ResizablePanelManager Phase 1（靜態邏輯）完成**
- [x] **v1 TDD 開發 — Task 05 ResizablePanelManager Phase 2-4（activate/deactivate、拖曳三階段、ResizeObserver）完成**
- [x] **Playground 手動測試環境建立**（`playground/` 目錄，Vite dev server）
- [x] **ResizablePanelManager code check 修正**（5 項違規全部修正完成）
- [x] **v1 TDD 開發 — Task 06-1 validateLayout 重構**（實作 + 單元測試驗證通過）
- [x] **CSS 策略決策**：採用原版 flex-grow 方式（flex-basis:0 + flex-grow:N）
- [x] **Playground 新增 Flex 版 Demo**（Group 1F-6F + Group 7/7F 約束衝突對照）
- [x] **Group 1 流程規格文件**（`flowSpec.md`：activate → 拖曳 → resize 完整計算追蹤）
- [x] **LayoutCalculator `_applyConstraints` 語意化重構**（拆為 `_clampAllPanels` reduce + `_redistributeRemaining` forEach pipeline）
- [x] **Playground 新增 Group 8 Demo**（Panel 動態顯示/隱藏：deactivate → register/unRegister → activate 循環）
- [x] **v1 開發 — Task 06 Panel Vue SFC 完成**（元件實作 + Playground 串接驗證通過）
- [ ] **v1 開發 — Task 07 ConstraintStrategy 策略模式重構**（進行中）

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
| ResizablePanelManager | orchestrator，協調各模組，對外提供 API |
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
| 03 | `tasks/03-HitRegionDetector.md` | HitRegionDetector | 無 | done |
| 04 | `tasks/04-CursorManager.md` | CursorManager | 無 | done |
| 05 | `tasks/05-ResizablePanelManager.md` | ResizablePanelManager | 全部 | done |
| 06-1 | `tasks/06-1-重構-validateLayout-logic.md` | LayoutCalculator 重構 | 02 | done (verified) |
| 06 | `tasks/06-Panel-Vue-SFC.md` | Panel (Vue SFC) | Manager | done |
| 07 | `tasks/07-ConstraintStrategy.md` | ConstraintStrategy 重構 | LayoutCalculator | in progress |

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

## HitRegionDetector 設計決策（2026-05-19）

| 項目 | 決定 |
|------|------|
| detect 移除 groupRect 參數 | v1 簽章簡化為 `(pointerX, pointerY, panels)`。原版 react-resizable-panels 的命中判定完全依賴 panel element 的 `getBoundingClientRect()`，group 層級不參與座標計算。詳見 SA 設計決策記錄 |

---

## 待討論議題

### Functional 重構 — 第三類迴圈（`_shrinkPanels` / `_growPanels`）

LayoutCalculator 的 `for` 迴圈已分三類處理：
- **第一類（直接對應）**：已改為 `R.all`、`R.partition`、`R.map` — 完成
- **第二類（reduce 模式）**：已改為 `R.map` + `R.fromPairs` — 完成
- **第三類（有狀態 + 反向遍歷 + 提前終止）**：`_shrinkPanels` / `_growPanels` — 暫不調整

第三類的考量：`R.reduceRight` + `{ result, remaining }` accumulator 可行，但失去提前終止能力（需靠 `R.reduced()` 或跳過），accumulator 結構較複雜，不見得比 `for` 更好讀。待後續討論。

---

## Task 05 測試策略決策（2026-05-20）

ResizablePanelManager 依據是否涉及 DOM layout 拆為兩層測試：

| 層級 | Phase | 測什麼 | 環境 |
|------|-------|--------|------|
| Unit test (Vitest + jsdom) | Phase 1 | 靜態邏輯：constructor、registerPanel/unRegisterPanel、on/off、Event、getLayout | jsdom |
| Manager E2E (Cypress) | Phase 2-4 | 純 HTML + Manager JS API → 拖曳、resize、生命週期 | 真實瀏覽器 |
| Vue SFC E2E (Cypress) | Task 6 後 | Vue 元件 mount → 拖曳 → Panel 渲染正確 | 真實瀏覽器 |

**理由**：
- Phase 2-4 的拖曳流程與 ResizeObserver 重度依賴真實 layout（getBoundingClientRect、offsetLeft、容器寬度），在 jsdom 中全部 mock 掉測試信心度低、維護成本高
- Manager 是對外發佈的獨立 API（使用者可不透過 Vue SFC 直接操作），與 Vue SFC 保護的是不同的使用者契約，各自需要 E2E
- Manager E2E 先做；Vue SFC E2E 等 Task 6 完成後再做

### Phase 1 完成內容（23 個測試通過）

- Constructor — groupConfig + 可選 panelConfigs，初始化子模組、DragState、_active = false
- registerPanel — 儲存 PanelData（constraints 為 null，activate 時才計算），回傳 panelId
- unRegisterPanel — 依 id 移除，找不到不報錯
- on / off — Map-based 事件機制，off 以參照比對移除
- Event — 靜態 + getter 雙重存取
- getLayout — 未 activate 回傳 null
- _toLayoutResult — 內部 Layout → LayoutResult 轉換

### 新增檔案

- `src/core/Event.js` — Event enum（LayoutChange / DragEnd）
- `src/core/ResizablePanelManager.js` — Manager 主體
- `tests/core/ResizablePanelManager.test.js` — Phase 1 單元測試

---

## ResizablePanelManager Code Check（2026-05-20） — 已完成

對 `ResizablePanelManager.js` 進行編碼風格規則檢查，5 項違規全部修正完成：

| # | 違規項目 | 修正摘要 |
|---|---------|---------|
| 1 | 單一出口原則 | 7 個 early return 消除：反轉條件、if-else chain、抽出 `_resolveDragTarget` |
| 2 | 語意化封裝 | `event.buttons === 0` → `PointerButtonNone` 常數 |
| 3 | 純函式原則 | `R.append`、`R.sortBy`、`R.map` 取代 in-place mutation |
| 4 | Ramda 一致性 | `_toLayoutResult` 改用 `R.map` + `R.fromPairs`；`registerPanel` 改用 `R.append`；`forEach` 保留原生 |
| 5 | JSDoc @example | 22 個 private 方法全部補上 `@example` |

---

## Playground 手動測試環境（2026-05-20）

- `playground/` 目錄下建立了 Manager 手動測試頁面（純 HTML + Manager JS API）
- 使用 Vite dev server，啟動指令於 `playground/` 目錄，port 3001
- 5 組 demo 覆蓋不同情境：佔滿視窗+px minSize、固定寬度+純%、混合單位、3 panels、窄範圍約束

---

## react-resizable-panels 差異分析（2026-05-20）

對照原版原始碼，確認以下差異並處理：

### 已補上

| 差異 | 修正 |
|------|------|
| 未忽略右鍵 pointerdown/pointerup | 新增 `_isNonPrimaryMouseButton` 檢查 |
| 未忽略已 preventDefault 的事件 | pointerdown/pointermove/pointerup 加 `event.defaultPrevented` guard |
| 缺 `pointerleave` 處理 | 新增 `_handlePointerLeave`：拖曳中以邊界座標更新 layout |
| 缺 `pointerout` 處理 | 新增 `_handlePointerOut`：指標移到 iframe 時 reset hover cursor |

### 已確認為 v1 設計決策，不需處理

| 差異 | 說明 |
|------|------|
| 缺 `dblclick` 雙擊回 defaultSize | v1 SPEC 未列入 |
| 缺 `keydown` 鍵盤操作 | v1 SPEC 未列入 |
| 每個 manager 獨立綁 listener | v1 不需多 group 共用 listener 的 reference count 機制 |
| `setPointerCapture` 設在 `event.target` | 原版設在 separator element，v1 無 separator 概念 |

### 待評估（v2+）

| 差異 | 說明 | 分析文件 |
|------|------|---------|
| `preserve-pixel-size` resize 策略 | v1 SPEC 明確只支援 `preserve-relative-size`，pixel 保持列入後續版本 | `preserve-pixel-size-規劃.md` |

### 移除項目

- `static Event = Event` 移除，統一由 instance getter 存取

---

## validateLayout 邏輯重構決策（2026-05-20）

### 問題

`validateLayout`（resize / 初始化）與 `adjustLayoutByDelta`（拖曳）對 min/max 約束衝突的處理不一致，導致拖曳瞬間 layout 跳變。詳見 `issue-layout-consistency.md`。

### 決策

將 `_applyConstraints` 改為原版 `validatePanelGroupLayout` 的策略：

1. 先 normalize（等比例縮放回 100%）
2. clamp 每個 panel 到 min/max，累積 remainingSize（maxSize 永遠勝出）
3. 從 index 0 開始重分配 remainingSize

移除 `_shrinkPanels`、`_growPanels`、`_redistributeOverflow`（含第二輪強制突破 minSize 機制）。

### 取捨

- 得到：兩條路徑約束處理一致（拖曳不跳變）、resize 更平滑
- 放棄：100% 不變式（極端約束衝突時 layout 可能 > 100%）
- 溢出容器：實測 flex 容器下不會溢出，透過 CSS 處理，不在邏輯層處理

### 驗證結果（Session 4）

- 單元測試：46 tests passed
- 殘留引用檢查：`_shrinkPanels` / `_growPanels` / `_redistributeOverflow` 無殘留
- Playground 手動測試（拖曳跳變）：通過

---

## CSS 策略決策（2026-05-20）

### 原版 react-resizable-panels 的方式

Panel 尺寸不用 `width`，而是：
- Panel：`flex-basis: 0` + `flex-grow: <layout 百分比>` + `flex-shrink: 1`
- Group 容器：`display: flex` + `flex-direction: row` + `flex-wrap: nowrap`
- Separator：`flex-basis: auto` + `flex-grow: 0` + `flex-shrink: 0`

### 決策

採用原版 flex-grow 方式。

### 優勢

- `flex-grow` 是比例分配，即使未來加 Separator 佔固定寬度，剩餘空間仍按正確比例分
- 約束衝突（layout 加總 > 100%）時，flex-grow 自動按比例 normalize，視覺上不溢出
- 計算邏輯不受影響，只有最後 CSS 套用方式不同

### Playground Demo

新增 Group 1F-6F（flex 版本，與 width 版本配對對照）及 Group 7/7F（約束衝突專用）。
Group 7 配置：`{ a: minSize 60%, b: minSize 60% }`，activate 即產生 layout 加總 120%。

---

## Group 1 流程規格（2026-05-20）

以 Group 1 配置為情境，完整追蹤 activate → 拖曳 → resize 三階段的計算流程，
含具體數值、每一步的 _applyConstraints / adjustLayoutByDelta 內部計算過程。
詳見 `flowSpec.md`。

---

## 已結案議題（Session 4）

| 議題 | 結論 |
|------|------|
| panel 溢出容器（加總 > 100%） | 實測 width 版本在 flex 容器下也不會溢出。溢出問題透過 CSS 處理即可，不在計算邏輯中額外處理 |
| 第三類迴圈 functional 重構 | `_shrinkPanels` / `_growPanels` 已在 Task 06-1 移除，議題不再存在，結案 |
| Playground 手動測試（拖曳跳變） | Group 3/6 確認通過，Task 06-1 驗收完成 |
| flex-grow Demo 行為確認 | width 版本與 flex 版本行為對照確認完成 |

---

## Task 06 — Panel Vue SFC（Session 5）

### 設計決策

- **Panel 為純 presentational component** — 只接收 `size` prop，不自行向 Manager 註冊 callback
- **資料驅動橋接點在父元件** — 父元件（如 PageLayout.vue）在 `data()` 建立 `panelLayout`，Manager 的 LayoutChange callback 更新此 `data()`，Vue reactivity 接手驅動畫面
- **layoutResult 不直接存入 data** — `layoutResult` 包含 DOM element 引用，Vue 2 會 deep observe 造成效能問題，callback 中只提取 size 數值

### 元件結構

| 項目 | 說明 |
|------|------|
| props | `panelId` (String, required)、`size` (Number, default 0) |
| computed | `outerStyle` — `{ flexBasis: 0, flexGrow: size, flexShrink: 1 }` |
| template | 外層 div（`:style="outerStyle"`）+ 內層 div（`.resizable-panel__content`，overflow: auto）+ `<slot/>` |

### 新增檔案

- `src/components/Panel.vue` — Panel SFC 元件
- `playground/PageLayout.vue` — Manager + Panel SFC 串接驗證範例

### Playground 驗證

PageLayout.vue 展示完整串接流程：mounted 建立 Manager → registerPanel → on(LayoutChange) 更新 data → activate → Panel 透過 prop 接收 size → flex CSS 渲染。Playground 驗證通過。

---

## Session 6 — README 與開發者文件（完成）

### 目標

撰寫 README.md 與 `docs/` 開發者文件，讓使用者和開發者都能快速上手。

### README.md 結構

```
README.md
├── 簡介 + 功能摘要
├── Installation
├── Quick Start（Vue 使用範例，精簡自 PageLayout.vue）
├── Architecture Overview
│   ├── 精簡 ClassDiagram（class 名稱 + 關係，不展開屬性方法）
│   └── 各 class 一句話摘要 → 連結 docs/<ClassName>.md
└── Core Flows（泛化流程：activate / 拖曳三階段 / resize）
    └── 連結 docs/flows/flowSpec.md（Group 1 具體數值走讀）
```

### docs/ 目錄結構

```
docs/
├── UnitConverter.md
├── LayoutCalculator.md
├── HitRegionDetector.md
├── CursorManager.md
├── ResizablePanelManager.md
└── flows/
    └── flowSpec.md（從根目錄搬入）
```

### 決策

- ClassDiagram 精簡版放 README（class 名稱 + 關係），完整版放各 class 的 docs 文件
- Core Flows 放泛化流程說明，flowSpec.md 作為帶具體數值的完整走讀範例連結
- `docs/` 不加 dot prefix，符合開源慣例

### 進度

- [x] README.md
- [x] docs/ 各 class 文件（ResizablePanelManager, LayoutCalculator, UnitConverter, HitRegionDetector, CursorManager）
- [x] docs/flows/flowSpec.md（從根目錄複製到 docs/flows/，根目錄原檔保留待確認刪除）

---

## Session 7 — ConstraintStrategy 策略模式重構（進行中）

### 目標

將 LayoutCalculator 的 `_applyConstraints` 抽為可替換策略，支援 collapse 行為（視窗縮小時低 index panel 優先壓縮）。

### 規格摘要

| 項目 | 決定 |
|------|------|
| 影響路徑 | init + resize（經過 `_applyConstraints`） |
| 拖曳路徑 | 不動，碰到 minSize 停住 |
| 架構 | LayoutCalculator 持有 ConstraintStrategy，委派 `_applyConstraints` |
| 現有行為 | 搬入 ProportionalStrategy，行為不變 |
| 新增行為 | CollapseStrategy — DOM 順序，index 小的先被壓縮 |
| collapse 順序 | DOM 順序（index 小 → 先壓縮） |
| panel 壓到 0 | 保留 0 寬，不隱藏 |

### 開發順序

- [ ] 定義 ConstraintStrategy 介面
- [ ] 抽出 ProportionalStrategy（搬現有邏輯，驗證現有測試通過）
- [ ] 實作 CollapseStrategy + 測試
- [ ] LayoutCalculator 接入 strategy，驗證整合
- [ ] Manager 層串接
- [ ] Playground 手動驗證

### Task 文件

`tasks/07-ConstraintStrategy.md`

---

## 待辦（非本次 Session）

1. **Panel Vue SFC 單元測試**（待安裝 `@vue/test-utils@1` 後補上）
2. **評估 preserve-pixel-size 是否納入 v1.x**（分析文件：`preserve-pixel-size-規劃.md`）

---

## 關鍵文件索引（更新）

| 文件 | 用途 |
|------|------|
| `PROJECT-CONTEXT.md` | 專案目標、決策記錄、版本規劃、進度 |
| `FEATURE-ANALYSIS-react-resizable-panels.md` | react-resizable-panels 72 項功能分析 |
| `V1-SPEC.md` | v1 功能規格（需求面，8 個章節） |
| `V1-SA.md` | v1 系統分析 / 架構設計（完成） |
| `ADR-ResizeObserver-觀察範圍.md` | 架構決策：ResizeObserver 只觀察 Group 容器 |
| `issue-layout-consistency.md` | validateLayout 與 adjustLayoutByDelta 不一致問題分析與決策 |
| `docs/flows/flowSpec.md` | Group 1 完整流程規格（activate / 拖曳 / resize 計算追蹤） |
| `.claude/rules/development/TDD開發原則.md` | TDD 開發流程規範 |
| `.claude/rules/development/程式開發原則.md` | SOLID、OOP、Facade 原則 |
| `playground/PageLayout.vue` | Manager + Panel SFC 串接驗證範例 |
| `tasks/07-ConstraintStrategy.md` | ConstraintStrategy 策略模式重構規格 |

---

## 相關資源（外部）

| 資源 | 位置 |
|------|------|
| react-resizable-panels 原始碼 | `/Documents/source/react-resizable-panels/` |
| sidePanelDemo（先前原型） | `/Documents/tutorial/resizable-panels-tutorial/sidePanelDemo/` |
