# v1 系統分析 / 架構設計

> 版本：v1 — 2 Panel + 基礎拖曳
> 建立日期：2026-05-14
> 對應規格：`V1-SPEC.md`

---

## 架構決策

- 核心邏輯以純 JS class 實作，不依賴 Vue API
- 模組以 OOP 開發，遵守 SOLID 原則
- 各模組職責獨立，Manager 作為 orchestrator 協調各模組
- 元件層（Vue SFC）為薄膠水層，透過 callback 機制接收 Manager 的狀態變化
- 使用者直接操作 Manager，未來再用 Facade 包一層元件（PanelGroup）

---

## Class Diagram

```mermaid
classDiagram
    direction TB

    class ResizablePanelManager {
        -_config : GroupConfig
        -_panels : PanelData[]
        -_layout : Layout
        -_layoutCalculator : LayoutCalculator
        -_hitRegionDetector : HitRegionDetector
        -_cursorManager : CursorManager
        -_resizeObserver : ResizeObserver
        -_eventListeners : Map
        -_active : boolean
        -_dragState : DragState
        +registerPanel(config: PanelConfig) string
        +unRegisterPanel(panelId: string) void
        +on(event: string, callback: Function) void
        +off(event: string, callback: Function) void
        +activate() LayoutResult
        +deactivate() void
        +getLayout() LayoutResult
    }

    class LayoutCalculator {
        -_unitConverter : UnitConverter
        +calculateInitialLayout(panels: PanelData[], availableSize: number) Layout
        +adjustLayoutByDelta(baseLayout: Layout, delta: number, boundaryIndex: number, panels: PanelData[]) Layout
        +validateLayout(layout: Layout, panels: PanelData[]) Layout
        +layoutsEqual(a: Layout, b: Layout) boolean
    }

    class UnitConverter {
        +parse(size: number | string) ParsedSize
        +toPercent(parsedSize: ParsedSize, availableSize: number) number
    }

    class HitRegionDetector {
        -_resizeTargetMinimumSize : ~coarse: number, fine: number~
        +detect(pointerX: number, pointerY: number, panels: PanelData[]) HitResult
        +getMargin() number
        +isCoarsePointer() boolean
    }

    class CursorManager {
        -_state : CursorState
        +setHover() void
        +setDrag(constraintDirection: ConstraintDirection) void
        +setDisabled() void
        +reset() void
    }

    class Panel {
        <<Vue SFC>>
        -size : number
        -outerStyle : object
        +panelId : string
    }

    ResizablePanelManager *-- LayoutCalculator : 組合
    ResizablePanelManager *-- HitRegionDetector : 組合
    ResizablePanelManager *-- CursorManager : 組合
    Panel --o ResizablePanelManager : 聚合
    LayoutCalculator --> UnitConverter : 依賴
```

### ResizablePanelManager

```mermaid
classDiagram
    direction TB

    class ResizablePanelManager {
        -_config : GroupConfig
        -_panels : PanelData[]
        -_layout : Layout
        -_layoutCalculator : LayoutCalculator
        -_hitRegionDetector : HitRegionDetector
        -_cursorManager : CursorManager
        -_resizeObserver : ResizeObserver
        -_eventListeners : Map
        -_active : boolean
        -_dragState : DragState
        +registerPanel(config: PanelConfig) string
        +unRegisterPanel(panelId: string) void
        +on(event: string, callback: Function) void
        +off(event: string, callback: Function) void
        +activate() LayoutResult
        +deactivate() void
        +getLayout() LayoutResult
    }

    class DragState {
        <<internal>>
        +dragging : boolean
        +initialLayout : Layout | null
        +pointerDownAt : ~x: number, y: number~ | null
        +activeBoundaryIndex : number | null
    }

    class GroupConfig {
        <<input>>
        +element : HTMLElement
        +disabled : boolean
        +disableCursor : boolean
        +resizeTargetMinimumSize : ~coarse: number, fine: number~
    }

    class PanelConfig {
        <<input>>
        +id : string
        +element : HTMLElement
        +defaultSize : number | string
        +minSize : number | string
        +maxSize : number | string
        +disabled : boolean
    }

    class PanelData {
        <<internal>>
        +id : string
        +element : HTMLElement
        +config : PanelConfig
        +constraints : PanelConstraints
    }

    class PanelConstraints {
        <<internal>>
        +minSize : number
        +maxSize : number
    }

    class Layout {
        <<internal / plain object>>
        +[panelId] : number
    }

    class LayoutResult {
        <<callback payload / plain object>>
        +[panelId] : ~size: number, element: HTMLElement~
    }

    ResizablePanelManager --> GroupConfig
    ResizablePanelManager --> PanelData
    ResizablePanelManager --> Layout
    ResizablePanelManager --> LayoutResult
    ResizablePanelManager --> DragState
    PanelData --> PanelConfig
    PanelData --> PanelConstraints
    DragState --> Layout
```

### UnitConverter

```mermaid
classDiagram
    direction TB

    class UnitConverter {
        +parse(size: number | string) ParsedSize
        +toPercent(parsedSize: ParsedSize, availableSize: number) number
    }

    class ParsedSize {
        <<internal>>
        +value : number
        +unit : CssUnit.Percent | CssUnit.Px
    }

    UnitConverter --> ParsedSize
```

### HitRegionDetector

```mermaid
classDiagram
    direction TB

    class HitRegionDetector {
        -_resizeTargetMinimumSize : ~coarse: number, fine: number~
        +detect(pointerX: number, pointerY: number, panels: PanelData[]) HitResult
        +getMargin() number
        +isCoarsePointer() boolean
    }

    class HitResult {
        <<internal>>
        +hit : boolean
        +boundaryIndex : number | null
    }

    class PanelData {
        <<internal>>
        +id : string
        +element : HTMLElement
        +config : PanelConfig
        +constraints : PanelConstraints
    }

    HitRegionDetector --> HitResult
    HitRegionDetector --> PanelData
```

### CursorManager

```mermaid
classDiagram
    direction TB

    class CursorManager {
        -_state : CursorState
        -_ownerDocument : Document
        +setHover() void
        +setDrag(constraintDirection: ConstraintDirection) void
        +setDisabled() void
        +reset() void
    }

    class CursorState {
        <<internal>>
        +state : 'idle' | 'hover' | 'drag' | 'disabled'
        +constraintDirection : ConstraintDirection
    }

    class ConstraintDirection {
        <<enum-like>>
        'none'
        'start'
        'end'
    }

    CursorManager --> CursorState
    CursorState --> ConstraintDirection
```

---

## 資料結構

### 輸入面（使用者傳入）

#### GroupConfig

Manager 建構時傳入。

| 欄位 | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| element | `HTMLElement` | — | Group 容器的 DOM 參照（必填），ResizeObserver 的監聽目標 |
| disabled | `boolean` | `false` | 停用整組 resize |
| disableCursor | `boolean` | `false` | 關閉游標管理 |
| resizeTargetMinimumSize | `{ coarse: number, fine: number }` | `{ coarse: 20, fine: 10 }` | 命中區域大小（px） |

#### PanelConfig

`registerPanel()` 時傳入。

| 欄位 | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| id | `string` | — | panel 唯一識別（必填） |
| element | `HTMLElement` | — | panel 外層 div 的 DOM 參照（必填），由使用者自行傳入 |
| defaultSize | `number \| string` | `undefined` | 初始尺寸，`50` / `"50%"` / `"200px"` |
| minSize | `number \| string` | `"0%"` | 最小尺寸 |
| maxSize | `number \| string` | `"100%"` | 最大尺寸 |
| disabled | `boolean` | `false` | 停用此 panel 的 resize |

### 內部面（模組之間傳遞）

#### ParsedSize

UnitConverter 解析結果。

| 欄位 | 型別 | 說明 |
|------|------|------|
| value | `number` | 數值 |
| unit | `CssUnit.Percent \| CssUnit.Px` | 單位類型（對應值為 `'%'` / `'px'`） |

#### PanelConstraints

衍生的百分比約束，容器 resize 時從原始 config 重算。

| 欄位 | 型別 | 說明 |
|------|------|------|
| minSize | `number` | 百分比（0-100） |
| maxSize | `number` | 百分比（0-100） |

#### PanelData

Manager 內部管理的 panel 完整資料。

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | `string` | panel 識別 |
| element | `HTMLElement` | DOM 參照 |
| config | `PanelConfig` | 原始配置（保留原始值，px 重算時需要） |
| constraints | `PanelConstraints` | 衍生百分比約束 |

#### Layout

```js
{ [panelId: string]: number }
```

值為百分比（0-100），所有值加總 = 100。使用 plain object。Panel 順序由 Manager 內部的 `_panels` 陣列維護（基於 DOM 位置排序），Layout 本身不保證順序。

#### HitResult

HitRegionDetector 的判定結果。

| 欄位 | 型別 | 說明 |
|------|------|------|
| hit | `boolean` | 是否命中邊界區域 |
| boundaryIndex | `number \| null` | 命中的邊界索引，未命中時為 `null`。v1 只有 0 或 null（兩個 panel 只有一條邊界） |

#### ConstraintDirection

拖曳時的約束方向，CursorManager 用來決定顯示哪種 cursor。

| 值 | 說明 |
|------|------|
| `'none'` | 兩側都可移動 |
| `'start'` | 起始側碰到約束（水平 = 左側碰到 min/max） |
| `'end'` | 結束側碰到約束（水平 = 右側碰到 min/max） |

#### CursorState

CursorManager 的內部狀態。

| 欄位 | 型別 | 說明 |
|------|------|------|
| state | `'idle' \| 'hover' \| 'drag' \| 'disabled'` | 當前互動狀態 |
| constraintDirection | `ConstraintDirection` | 拖曳時的約束方向，非 drag 狀態時為 `'none'` |

Cursor 映射：

| state | constraintDirection | cursor |
|-------|-------------------|--------|
| idle | — | 不設定 |
| hover | — | `col-resize` |
| drag | none | `col-resize` |
| drag | start | `e-resize` |
| drag | end | `w-resize` |
| disabled | — | `not-allowed` |

#### LayoutResult

Callback 傳出用的 enriched payload，與內部 Layout（純百分比）區分。

```js
{
  [panelId: string]: {
    size: number,        // 百分比（0-100）
    element: HTMLElement  // panel 的 DOM 參照
  }
}
```

#### DragState

Manager 的拖曳狀態，pointerdown 時建立，pointerup 時重置。

| 欄位 | 型別 | 說明 |
|------|------|------|
| dragging | `boolean` | 是否正在拖曳 |
| initialLayout | `Layout \| null` | 拖曳開始時的 layout 快照，delta 計算的基準 |
| pointerDownAt | `{ x: number, y: number } \| null` | 拖曳起始指標位置 |
| activeBoundaryIndex | `number \| null` | 當前拖曳的邊界索引 |

### 事件型別

透過 `on(event, callback)` / `off(event, callback)` 註冊與取消。

| 事件名稱 | Callback 簽章 | 觸發時機 |
|----------|------|---------|
| `Event.LayoutChange` | `(layoutResult: LayoutResult) => void` | 拖曳中每幀 |
| `Event.DragEnd` | `(layoutResult: LayoutResult) => void` | 拖曳結束 |

### Public API

| 方法 | 回傳值 | 說明 |
|------|--------|------|
| `constructor(options)` | — | 建立 Manager，接收 `{ groupConfig: GroupConfig, panelConfigs?: PanelConfig[] }` |
| `registerPanel(config: PanelConfig)` | `string` | 註冊 panel，回傳 panelId。只做註冊，不觸發重算 |
| `unRegisterPanel(panelId: string)` | `void` | 反註冊 panel |
| `on(event: string, callback: Function)` | `void` | 註冊事件監聽 |
| `off(event: string, callback: Function)` | `void` | 取消事件監聽，需傳入原始 callback 參照 |
| `activate()` | `LayoutResult` | 計算初始 layout、啟動 ResizeObserver 與 pointer 事件監聽、回傳初始 LayoutResult |
| `deactivate()` | `void` | 停止計算、停止 ResizeObserver、移除 pointer 事件監聽。已註冊的 panels 保留 |
| `getLayout()` | `LayoutResult` | 取得當前 layout |

---

## 使用範例

### 場景 1：純 JS/HTML，DOM 已存在，SidePanel 預設展開

```js
const manager = new ResizablePanelManager({
  groupConfig: {
    element: document.getElementById('group'),
    disabled: false,
    disableCursor: false
  },
  panelConfigs: [
    { id: 'main', element: document.getElementById('main'), defaultSize: '70%', minSize: '30%' },
    { id: 'side', element: document.getElementById('side'), defaultSize: '30%', minSize: '200px' }
  ]
})

manager.on(manager.Event.LayoutChange, function (layoutResult) { /* 每幀更新 */ })
manager.on(manager.Event.DragEnd, function (layoutResult) { /* 拖曳結束 */ })

const layoutResult = manager.activate()
```

### 場景 2：Vue CSR，SidePanel 按鈕觸發展開

```js
// 頁面載入時，先建立 manager（此時 SidePanel 尚未渲染）
const manager = new ResizablePanelManager({
  groupConfig: {
    element: document.getElementById('group'), // Group 容器已存在
    resizeTargetMinimumSize: { coarse: 20, fine: 10 }
  }
})

manager.on(manager.Event.LayoutChange, function (layoutResult) { /* ... */ })

// Vue 元件 methods
methods: {
  openSidePanel() {
    this.showSidePanel = true

    this.$nextTick(() => {
      // DOM 渲染完成後，註冊 panel 並啟動
      manager.registerPanel({ id: 'main', element: this.$refs.main.$el, defaultSize: '70%' })
      manager.registerPanel({ id: 'side', element: this.$refs.side.$el, defaultSize: '30%', minSize: '200px' })
      const layoutResult = manager.activate()
    })
  },

  closeSidePanel() {
    manager.deactivate()
    this.showSidePanel = false
  },

  reopenSidePanel() {
    this.showSidePanel = true
    this.$nextTick(() => {
      // 已註冊的 panels 保留，重新啟動時重算約束
      const layoutResult = manager.activate()
    })
  }
}
```

### 場景 3：動態新增 Panel（v2 展望）

```js
// registerPanel 只做註冊，不觸發重算（遵守 SRP）
manager.registerPanel({ id: 'detail', element: detailEl, defaultSize: '25%' })

// 重算需手動觸發，或未來 Facade 提供便利 API
const layoutResult = manager.activate()
```

### 取消事件監聽

```js
function handleLayoutChange(layoutResult) { /* ... */ }

manager.on(manager.Event.LayoutChange, handleLayoutChange)

// 之後不需要時，傳入原始 callback 參照
manager.off(manager.Event.LayoutChange, handleLayoutChange)
```

---

## 設計決策記錄

### Panel 不持有約束配置

defaultSize / minSize / maxSize 等約束值在 Manager 層面配置（透過 `registerPanel` 的 PanelConfig），不作為 Panel 組件的 props。Panel 是純粹的渲染層，只接收 Manager 算好的百分比並設定 CSS（flexGrow）。

### Panel 順序基於 DOM 位置

Manager 透過 `element.offsetLeft`（水平）/ `element.offsetTop`（垂直）排序已註冊的 panel，與 react-resizable-panels 的做法一致。不依賴註冊順序或顯式 index。

### registerPanel 回傳 panelId + unRegisterPanel API

registerPanel 回傳 panelId（string），Manager 提供 `unRegisterPanel(panelId)` public API 讓使用者反註冊。不使用回傳 unregister function 的模式。

### registerPanel 職責單一

registerPanel 只做「註冊」，不觸發 layout 重算（遵守 SRP）。重算由 `activate()` 負責，或未來 Facade 提供「register + recalculate」的便利 API。

### 內部 Layout 與 Callback LayoutResult 分離

- 內部計算用 `Layout`（`{[panelId]: number}`）— 純百分比，給 LayoutCalculator 用
- Callback 傳出用 `LayoutResult`（`{[panelId]: { size, element }}`）— Manager 包裝後傳給外部消費者，自足不需額外查找

### activate / deactivate 生命週期

- `activate()` — 計算初始 layout、啟動 ResizeObserver 與 pointer 事件監聽、回傳 LayoutResult
- `deactivate()` — 停止計算與監聽，已註冊的 panels 保留
- 可重複呼叫 activate / deactivate 循環（如 SidePanel 展開/收合）
- deactivate 期間容器大小若改變，activate 時會重算約束（px → % 轉換）

### 事件機制使用 on / off

- `on(event, callback)` 註冊事件，回傳 void
- `off(event, callback)` 取消事件，需傳入原始 callback 參照
- 事件註冊在 activate / deactivate 循環中保留，不需重新註冊

### Group 容器元素顯式傳入

GroupConfig 必填 `element`，作為 ResizeObserver 的監聯目標。availableSize 從 Panel 元素的 offsetWidth 加總計算（排除非 Panel 元素佔的空間），與 react-resizable-panels 策略一致。

### Constructor 支援可選 panelConfigs

Constructor 接收 `{ groupConfig, panelConfigs? }`。panelConfigs 適用於 DOM 已存在的場景（純 JS/HTML、SSR 後）。Vue CSR 等 DOM 未就緒的場景，panel 透過後續 `registerPanel()` 註冊。

### Panel 更新機制延後決策

計算寬度和整體架構完成後，再決定如何更新 Panel 的 CSS（flexGrow）。目前只確認 callback payload 的結構（LayoutResult），具體的 Panel 更新方式留到下一階段。

### 原始值與衍生值分離

PanelData 同時保留原始 config（PanelConfig，含使用者傳入的 `"200px"` 等原始值）和衍生約束（PanelConstraints，全部為百分比）。容器 resize 時，從原始值重新計算衍生約束。

### 約束衝突解決策略

當多個 panel 的約束無法同時滿足時（如 minSize 加總超過 100%），LayoutCalculator 按 `_panels` 陣列順序（即 DOM 位置順序）逐一處理：

1. **順序 clamp**：按 DOM 位置順序（左到右）對每個 panel 套用約束，靠前的 panel 優先滿足自身約束
2. **級聯剩餘**：當前 panel 因 clamp 產生的差額，累計後分配給後續能接受的 panel
3. **回退兜底**：若最終 layout 加總無法等於 100%，拒絕整個操作，回退到上一個合法 layout

此策略同時適用於：初始 layout 計算（`calculateInitialLayout`）、拖曳 delta 調整（`adjustLayoutByDelta`）、ResizeObserver 觸發的約束重算（`validateLayout`）。

### UnitConverter 邊界行為

parse 與 toPercent 的邊界處理策略，參考 react-resizable-panels 後調整：

**parse 層**：
- 使用 `parseFloat()` 解析，結果為 `NaN` 時轉為 `0`
- 純數字（`50`）→ 百分比（與 react-resizable-panels 不同，原版純數字 = px）
- 字串無單位（`"50"`）→ 百分比
- 負數照常解析，parse 層不攔截，交由下游 LayoutCalculator clamp
- 不支援的單位（`"200em"`、`"50vw"` 等）→ throw Error（v1 只支援 `%` 和 `px`）

**toPercent 層**：
- percent 輸入：直接回傳 `value`，不受 `availableSize` 影響
- px 輸入 + `availableSize = 0`：回傳 `0`（無法換算），等容器重新可見時由 Manager 從原始 config 重算
- px 輸入 + `availableSize > 0`：正常換算 `(value / availableSize) × 100`
- 轉換結果超出 0-100 範圍 → 不 clamp，直接回傳。clamp 是 LayoutCalculator 的職責（SRP）

### HitRegionDetector.detect 移除 groupRect 參數

v1 的 `detect` 簽章從 `(pointerX, pointerY, panels, groupRect)` 簡化為 `(pointerX, pointerY, panels)`。

**背景**：SA 原始設計中 `groupRect: DOMRect` 出現在簽章中但未定義具體用途。經調查 react-resizable-panels 原始碼，原版的命中判定完全依賴各 panel element 的 `getBoundingClientRect()` 計算邊界位置與 hit region rect，group 層級的 element 僅用於 stacking order 判斷（`isViableHitTarget`），不參與座標計算，也不以 `DOMRect` 形式傳入。

**推測的潛在用途與原版處理方式**：
- 快速排除（指標不在 Group 內）— 原版未做此優化
- Y 軸範圍檢查 — 原版透過 hit region rect 自身的高度（來自 panel 的 `getBoundingClientRect()`）判斷，不靠 group rect
- stacking order 判斷 — 原版使用 `groupElement`（DOM 元素），不使用 `groupRect`（DOMRect）

**結論**：v1 不需要 `groupRect`。若未來需要 stacking order 或其他 group 層級判斷，再評估加回。

### 事件去重與浮點容差

Layout 變化前後，Manager 透過 `LayoutCalculator.layoutsEqual(a, b)` 比較，相同則不觸發事件。比較使用浮點容差判定（非 `===`），避免計算過程中的微小誤差（如 49.99999 vs 50.00001）導致不必要的事件觸發。此去重邏輯適用於 pointermove 和 ResizeObserver 兩條路徑。

---

## 模組職責

| 模組 | 層級 | 職責 |
|------|------|------|
| ResizablePanelManager | 純 JS | orchestrator — 協調 layout 計算、拖曳事件、命中偵測、游標管理、ResizeObserver；對外提供 callback 註冊與 panel 管理 API |
| LayoutCalculator | 純 JS | layout 數學 — 初始分配、delta 調整、雙向 clamp、100% 不變式驗證 |
| UnitConverter | 純 JS | 單位解析（%、px）與轉換為百分比 |
| HitRegionDetector | 純 JS | 判斷指標是否在拖曳命中區域內、偵測粗/細指標類型 |
| CursorManager | 純 JS | 管理拖曳期間的全域樣式：cursor 狀態切換（hover / drag / directional / disabled / reset）與 user-select 控制，作用目標為 document.body |
| Panel | Vue SFC | 薄元件 — 向 Manager 註冊、透過 callback 接收 layout 變化、computed 產生 style |

---

## 狀態通知機制

```
Manager 內部狀態變化（拖曳 / ResizeObserver）
  → 計算新 layout
  → 呼叫已註冊的 callback
    → Panel 的 callback 更新 data 內的 size
      → Vue 偵測到 data 變化 → 重新渲染
```

---

## 互動流程

### 事件綁定策略

- Pointer 事件（pointerdown / pointermove / pointerup）綁定在 **document** 層級
- 綁定時機：`activate()` 時註冊，`deactivate()` 時移除
- 好處：拖曳中指標移出 Group 容器甚至移出視窗，仍能持續追蹤

### 拖曳三階段

#### pointerdown — 拖曳開始

```mermaid
flowchart TD
    Entry(["pointerdown 觸發"])
    Entry --> GetPos["取得指標座標<br/>event.clientX / event.clientY"]
    GetPos --> Detect["HitRegionDetector 命中偵測<br/>detect(pointerX, pointerY, panels)"]
    Detect --> HitCheck{命中邊界？}
    HitCheck -- 未命中 --> Ignore(["不處理"])
    HitCheck -- 命中 --> SaveState["記錄 DragState<br/>dragging = true<br/>initialLayout = 當前 layout 快照<br/>pointerDownAt = { x, y }<br/>activeBoundaryIndex = hitResult.boundaryIndex"]
    SaveState --> SetCursor["CursorManager.setDrag()"]
    SetCursor --> EmitStart["觸發 LayoutChange 事件<br/>（通知拖曳開始，傳送當前 LayoutResult）"]
    EmitStart --> Prevent["event.preventDefault()"]
    Prevent --> Return(["等待後續事件"])
```

**命中偵測方式**：座標比對，非 event.target。HitRegionDetector 在 pointerdown 時即時計算各邊界位置，判斷指標座標是否落在命中範圍內。

#### pointermove — 拖曳中

```mermaid
flowchart TD
    Entry(["pointermove 觸發"])
    Entry --> DragCheck{dragState.dragging?}
    DragCheck -- false --> HoverCheck["HitRegionDetector 命中偵測"]
    HoverCheck --> IsHover{命中邊界？}
    IsHover -- 是 --> SetHover["CursorManager.setHover()"]
    IsHover -- 否 --> ResetCursor["CursorManager.reset()"]
    SetHover --> End1(["結束"])
    ResetCursor --> End1

    DragCheck -- true --> ButtonCheck{event.buttons === 0？<br/>（iframe 內放開指標偵測）}
    ButtonCheck -- 是 --> ForceEnd["強制結束拖曳<br/>（走 pointerup 結束流程）"]
    ForceEnd --> End3(["結束"])
    ButtonCheck -- 否 --> Capture["setPointerCapture()<br/>（首次 move 時延遲呼叫，避免影響 click 事件）"]
    Capture --> CalcDelta["計算 delta（百分比）<br/>(currentPos - pointerDownAt) / groupSize × 100"]
    CalcDelta --> AdjustLayout["LayoutCalculator.adjustLayoutByDelta()<br/>基於 initialLayout + delta 計算新 layout"]
    AdjustLayout --> Changed{layout 有變化？}
    Changed -- 否 --> UpdateCursorFlag["CursorManager.setDrag(constraintDirection)<br/>更新約束方向指標"]
    UpdateCursorFlag --> End2(["結束"])
    Changed -- 是 --> UpdateLayout["更新 _layout"]
    UpdateLayout --> EmitChange["觸發 LayoutChange 事件<br/>傳送新 LayoutResult"]
    EmitChange --> End2
```

**iframe 指標釋放偵測**：使用者在拖曳中將指標移入 `<iframe>` 並放開時，pointerup 不會冒泡到外層 document。透過 pointermove 中檢查 `event.buttons === 0` 偵測此情況，強制走結束流程（重置 DragState、reset cursor、觸發 DragEnd）。

**delta 計算基準**：始終以 `initialLayout + delta` 計算，不累計。避免浮點誤差漂移。

#### pointerup — 拖曳結束

```mermaid
flowchart TD
    Entry(["pointerup 觸發"])
    Entry --> DragCheck{dragState.dragging?}
    DragCheck -- false --> Ignore(["不處理"])
    DragCheck -- true --> ResetState["重置 DragState<br/>dragging = false<br/>initialLayout = null<br/>pointerDownAt = null<br/>activeBoundaryIndex = null"]
    ResetState --> ResetCursor["CursorManager.reset()"]
    ResetCursor --> EmitChanged["觸發 DragEnd 事件<br/>傳送最終 LayoutResult"]
    EmitChanged --> Prevent["event.preventDefault()"]
    Prevent --> Return(["結束"])
```

### ResizeObserver 流程

- 觀察對象：**僅 Group 容器**（決策記錄見 `ADR-ResizeObserver-觀察範圍.md`）
- 註冊時機：`activate()` 時建立並開始觀察
- 移除時機：`deactivate()` 時 `disconnect()`

```mermaid
flowchart TD
    Entry(["ResizeObserver callback 觸發"])
    Entry --> GetSize["取得 Group 容器新尺寸"]
    GetSize --> SizeCheck{尺寸為 0？<br/>（容器被隱藏）}
    SizeCheck -- 是 --> Skip(["跳過，不處理"])
    SizeCheck -- 否 --> RecalcConstraints["從原始 PanelConfig 重算 PanelConstraints<br/>（px → % 換算隨容器尺寸改變）"]
    RecalcConstraints --> ValidateLayout["LayoutCalculator.validateLayout()<br/>驗證當前 layout 是否仍符合新約束"]
    ValidateLayout --> Changed{layout 或約束有變化？}
    Changed -- 否 --> NoOp(["不處理"])
    Changed -- 是 --> UpdateLayout["更新 _layout 與 PanelConstraints"]
    UpdateLayout --> EmitChange["觸發 LayoutChange 事件<br/>傳送新 LayoutResult"]
    EmitChange --> Return(["結束"])
```

**關鍵行為**：container resize 時，pixel 約束（如 `minSize: '200px'`）的百分比等價值會改變。例如 `200px` 在 1000px 容器 = 20%，容器縮為 500px 時 = 40%。`UnitConverter` 從 PanelConfig 的原始值重新推導 PanelConstraints。

---

## 依賴方向

```
Panel → ResizablePanelManager → LayoutCalculator → UnitConverter
                              → HitRegionDetector
                              → CursorManager
```

所有依賴單向向下，無循環依賴。
