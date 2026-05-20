# Task 05: ResizablePanelManager

> 狀態：pending
> 依賴：Task 01 — UnitConverter、Task 02 — LayoutCalculator、Task 03 — HitRegionDetector、Task 04 — CursorManager
> 對應 SA 章節：Class Diagram — ResizablePanelManager、Public API、互動流程、狀態通知機制

---

## 模組描述

Orchestrator class，協調 LayoutCalculator、HitRegionDetector、CursorManager、ResizeObserver，對外提供 panel 管理與事件通知 API。負責拖曳三階段流程（pointerdown / pointermove / pointerup）與容器 resize 處理。

### Public API

| 方法 | 簽章 | 說明 |
|------|------|------|
| constructor | `(options: { groupConfig: GroupConfig, panelConfigs?: PanelConfig[] })` | 建立 Manager |
| registerPanel | `(config: PanelConfig) → string` | 註冊 panel，回傳 panelId，不觸發重算 |
| unRegisterPanel | `(panelId: string) → void` | 反註冊 panel |
| on | `(event: string, callback: Function) → void` | 註冊事件監聽 |
| off | `(event: string, callback: Function) → void` | 取消事件監聽 |
| activate | `() → LayoutResult` | 計算初始 layout、啟動監聽、回傳 LayoutResult |
| deactivate | `() → void` | 停止監聽，panels 保留 |
| getLayout | `() → LayoutResult` | 取得當前 layout |

### 相關資料結構

```js
// GroupConfig
{ element: HTMLElement, disabled: boolean, disableCursor: boolean, resizeTargetMinimumSize: { coarse, fine } }

// DragState
{ dragging: boolean, initialLayout: Layout | null, pointerDownAt: { x, y } | null, activeBoundaryIndex: number | null }

// LayoutResult（callback payload）
{ [panelId]: { size: number, element: HTMLElement } }

// Event 類型
Event.LayoutChange  — 拖曳中每幀
Event.LayoutChangeEnd — 拖曳結束
```

---

## 驗收條件

- Panel 註冊 / 反註冊正確運作
- activate / deactivate 生命週期可重複循環
- 拖曳三階段流程完整（pointerdown → pointermove → pointerup）
- ResizeObserver 觸發時正確重算約束與 layout
- 事件 on/off 機制正確，去重有效（layoutsEqual）
- disabled 狀態下不響應拖曳
- iframe 指標釋放偵測正確

---

## TODO

### Constructor 與 Panel 管理

- [ ] **constructor** — 接收 groupConfig + 可選 panelConfigs，初始化內部模組
- [ ] **registerPanel** — 儲存 PanelData，回傳 panelId，不觸發重算
- [ ] **unRegisterPanel** — 移除指定 panel
- [ ] **Panel 排序** — 基於 DOM 位置（offsetLeft）排序 _panels 陣列

### 事件機制

- [ ] **on** — 註冊 event callback，支援多個 callback
- [ ] **off** — 以原始 callback 參照取消，找不到時不報錯
- [ ] **事件去重** — layoutsEqual 比較，相同 layout 不觸發
- [ ] **activate/deactivate 保留事件** — deactivate 不清除已註冊的事件

### activate / deactivate 生命週期

- [ ] **activate** — 計算初始 layout、啟動 ResizeObserver、綁定 pointer 事件、回傳 LayoutResult
- [ ] **deactivate** — disconnect ResizeObserver、移除 pointer 事件、reset cursor、panels 保留
- [ ] **重複循環** — 可多次 activate → deactivate → activate
- [ ] **重複 activate** — 已 active 時再呼叫的處理策略

### 拖曳流程 — pointerdown

- [ ] **命中偵測** — 透過 HitRegionDetector.detect() 判斷
- [ ] **建立 DragState** — 命中時記錄 initialLayout、pointerDownAt、activeBoundaryIndex
- [ ] **CursorManager.setDrag()** — 設定拖曳游標
- [ ] **觸發 LayoutChange** — 通知拖曳開始
- [ ] **disabled 檢查** — group disabled 或相鄰 panel disabled 時不啟動拖曳

### 拖曳流程 — pointermove

- [ ] **非拖曳中 — hover 偵測** — 命中邊界時 setHover，離開時 reset
- [ ] **拖曳中 — delta 計算** — (currentPos - pointerDownAt) / groupSize × 100
- [ ] **拖曳中 — layout 更新** — LayoutCalculator.adjustLayoutByDelta()
- [ ] **拖曳中 — 觸發 LayoutChange** — layout 有變化時觸發
- [ ] **拖曳中 — cursor 方向更新** — 約束碰壁時更新 constraintDirection
- [ ] **iframe 偵測** — event.buttons === 0 時強制結束拖曳
- [ ] **setPointerCapture** — 首次 move 時延遲呼叫

### 拖曳流程 — pointerup

- [ ] **重置 DragState** — 所有欄位歸零
- [ ] **CursorManager.reset()** — 還原游標
- [ ] **觸發 LayoutChangeEnd** — 傳送最終 LayoutResult

### ResizeObserver

- [ ] **觀察 Group 容器** — activate 時建立並開始觀察
- [ ] **尺寸為 0 跳過** — 容器隱藏時不處理
- [ ] **重算約束** — 從原始 PanelConfig 重新推導 PanelConstraints（px → %）
- [ ] **validateLayout** — 檢查 layout 是否仍合法，不合法則 clamp
- [ ] **觸發 LayoutChange** — layout 有變化時觸發
- [ ] **deactivate 時 disconnect** — 清理 observer

### LayoutResult 轉換

- [ ] **內部 Layout → LayoutResult** — 包裝為 `{ [panelId]: { size, element } }` 格式
