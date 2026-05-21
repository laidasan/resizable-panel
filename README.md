# vue-resizable-panel

Vue 2 的可拖曳調整大小面板元件庫。核心邏輯以純 JavaScript class 實作，不依賴 Vue API，元件層為薄膠水層。

## Features

- 拖曳調整相鄰 Panel 大小
- 支援 `%` 與 `px` 混合單位設定 `defaultSize`、`minSize`、`maxSize`
- 容器 resize 自動重算 layout（ResizeObserver）
- 約束衝突自動處理（maxSize 優先）
- 拖曳期間自動管理 cursor 樣式與文字選取
- Panel 動態註冊 / 移除
- Per-panel 容器 resize 策略（保持像素尺寸 / 保持相對比例）

## Installation

```bash
npm install vue-resizable-panel
```

## Quick Start

```vue
<template>
  <div ref="panelGroup" class="panel-group">
    <Panel ref="panelA" panelId="a" :size="panelLayout.a">
      <div>Panel A ({{ panelLayout.a.toFixed(1) }}%)</div>
    </Panel>
    <Panel ref="panelB" panelId="b" :size="panelLayout.b">
      <div>Panel B ({{ panelLayout.b.toFixed(1) }}%)</div>
    </Panel>
  </div>
</template>

<script>
import { ResizablePanelManager } from 'vue-resizable-panel/src/core/ResizablePanelManager.js'
import Panel from 'vue-resizable-panel/src/components/Panel.vue'

export default {
  components: { Panel },

  data() {
    return {
      panelLayout: { a: 0, b: 0 }
    }
  },

  created() {
    this._manager = null
  },

  mounted() {
    this._manager = new ResizablePanelManager({
      groupConfig: {
        element: this.$refs.panelGroup,
        disabled: false,
        disableCursor: false
      },
      panelConfigs: [
        { id: 'a', element: this.$refs.panelA.$el, defaultSize: '70%', minSize: '20%' },
        { id: 'b', element: this.$refs.panelB.$el, defaultSize: '30%', minSize: '20%' }
      ]
    })

    this._manager.on(this._manager.Event.LayoutChange, (layoutResult) => {
      this.panelLayout = Object.fromEntries(
        Object.entries(layoutResult).map(([id, { size }]) => [id, size])
      )
    })

    this._manager.activate()
  },

  beforeDestroy() {
    if (this._manager) {
      this._manager.deactivate()
    }
  }
}
</script>

<style>
.panel-group {
  display: flex;
}
</style>
```

### CSS 要求

Group 容器需設定 `display: flex`。Panel 透過 `flex-basis: 0` + `flex-grow` 分配空間，容器的 `flex-direction` 決定排列方向。

## Manager 使用說明

`ResizablePanelManager` 是核心 API，負責 panel 註冊、layout 計算、拖曳與容器 resize 處理。以下以純 JS API 說明，不綁定特定框架。

### 建立 Manager

```js
import { ResizablePanelManager } from 'vue-resizable-panel/src/core/ResizablePanelManager.js'

const manager = new ResizablePanelManager({
  groupConfig: {
    element: document.getElementById('panel-group'),
  },
  panelConfigs: [
    { id: 'main', element: document.getElementById('main'), defaultSize: '70%', minSize: '200px' },
    { id: 'side', element: document.getElementById('side'), defaultSize: '30%', minSize: '20%' },
  ],
})
```

Constructor 接收 `groupConfig`（必要）與 `panelConfigs`（可選）。`panelConfigs` 是語法糖，等同於逐一呼叫 `registerPanel()`。

### Panel 註冊 / 移除

```js
const panelId = manager.registerPanel({
  id: 'extra',
  element: document.getElementById('extra'),
  defaultSize: '20%',
  minSize: '10%',
  maxSize: '50%',
})

manager.unRegisterPanel('extra')
```

`registerPanel()` 只做註冊，不觸發 layout 重算。需在 `activate()` 之前完成註冊。動態增減 panel 時，先 `deactivate()` → 註冊/移除 → 再 `activate()`。

### 生命週期：activate / deactivate

```js
const layoutResult = manager.activate()

manager.deactivate()
```

- `activate()` — 計算初始 layout、啟動 ResizeObserver 與 pointer 事件監聽，回傳初始 `LayoutResult`
- `deactivate()` — 停止計算與監聽，已註冊的 panels 和事件保留
- 可重複呼叫 `activate()` / `deactivate()` 循環

### 事件監聽：on / off

```js
function handleLayoutChange(layoutResult) {
  // layoutResult: { panelId: { size: number, element: HTMLElement } }
}

manager.on(manager.Event.LayoutChange, handleLayoutChange)
manager.on(manager.Event.DragEnd, handleDragEnd)

manager.off(manager.Event.LayoutChange, handleLayoutChange)
```

| 事件 | 觸發時機 | Callback 參數 |
|------|---------|--------------|
| `LayoutChange` | layout 變化時（activate、拖曳、容器 resize） | `LayoutResult` — `{ [panelId]: { size, element } }` |
| `DragEnd` | 拖曳結束時 | `LayoutResult` — 最終 layout |

`off()` 需傳入與 `on()` 相同的 callback 參照。

### 取得當前 Layout

```js
const layoutResult = manager.getLayout()
// 未 activate 時回傳 null
```

## GroupConfig

| 欄位 | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `element` | `HTMLElement` | — (必要) | Group 容器 DOM 元素，作為 ResizeObserver 監聽目標與座標計算基準 |
| `disabled` | `boolean` | `false` | 停用整組 resize，設為 `true` 時 pointerdown 不會觸發拖曳 |
| `disableCursor` | `boolean` | `false` | 關閉游標管理，設為 `true` 時拖曳期間不會修改 cursor 與 user-select 樣式 |
| `resizeTargetMinimumSize` | `{ coarse: number, fine: number }` | `{ coarse: 20, fine: 10 }` | 命中區域大小（px）。`coarse` 用於觸控裝置，`fine` 用於滑鼠 |

## PanelConfig

| 欄位 | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `id` | `string` | — (必要) | Panel 唯一識別，用於 layout 物件的 key |
| `element` | `HTMLElement` | — (必要) | Panel DOM 元素，用於座標計算與排序 |
| `defaultSize` | `string` | — | 初始尺寸，支援 `%` 與 `px`（如 `'70%'`、`'200px'`）。未設定時均分剩餘空間 |
| `minSize` | `string` | `'0%'` | 最小尺寸，支援 `%` 與 `px`。拖曳與容器 resize 時皆受此約束 |
| `maxSize` | `string` | `'100%'` | 最大尺寸，支援 `%` 與 `px`。`minSize` > `maxSize` 衝突時 `maxSize` 勝出 |
| `disabled` | `boolean` | `false` | 停用此 panel 的 resize，相鄰邊界不可拖曳 |
| `groupResizeBehavior` | `string` | `'preserve-relative-size'` | 容器 resize 時的尺寸策略。`'preserve-pixel-size'`：保持像素尺寸不變；`'preserve-relative-size'`：保持相對比例不變 |

## Architecture

深入了解內部架構與模組設計請參考 [Architecture Overview](docs/ArchitectureOverview.md)。
