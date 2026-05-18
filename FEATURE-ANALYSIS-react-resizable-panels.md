# react-resizable-panels 完整功能分析

> 分析來源：[react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) source code
> 分析日期：2026-05-08

---

## 元件結構

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 1 | PanelGroup 元件 | 容器，管理 layout、事件、panel 註冊 | `lib/components/group/Group.tsx` |
| 2 | Panel 元件 | 內容承載，雙層 div（外層 flex 控制 + 內層 content） | `lib/components/panel/Panel.tsx` |
| 3 | Separator 元件 | 可視化拖曳把手，支援 slot 自訂內容 | `lib/components/separator/Separator.tsx` |
| 4 | Panel 註冊/反註冊 | provide/inject 機制，mount 註冊、unmount 清除 | `Panel.tsx` + `GroupContext` |
| 5 | Separator 註冊/反註冊 | 同上，並訂閱互動狀態變化（drag/hover） | `Separator.tsx` + `GroupContext` |

### 元件 Props 詳細

#### PanelGroup

| Prop | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `children` | ReactNode | — | Panel 和 Separator 元件 |
| `className` | string | — | CSS class |
| `defaultLayout` | Layout | — | 初始 layout `{panelId: percentage}` |
| `disableCursor` | boolean | false | 關閉 cursor 樣式管理 |
| `disabled` | boolean | false | 停用所有 resize 互動 |
| `elementRef` | Ref | — | DOM ref |
| `groupRef` | Ref | — | imperative API ref |
| `id` | string \| number | auto | 唯一識別（fallback useId） |
| `onLayoutChange` | function | — | 拖曳中每幀觸發 |
| `onLayoutChanged` | function | — | 拖曳結束觸發一次 |
| `orientation` | "horizontal" \| "vertical" | "horizontal" | 排列方向 |
| `resizeTargetMinimumSize` | {coarse, fine} | {20, 10} | 命中區域大小（px） |
| `style` | CSSProperties | — | 自訂樣式（display/flex-direction/overflow 鎖定） |

#### Panel

| Prop | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `children` | ReactNode | — | 內容 |
| `className` | string | — | 作用在內層 div |
| `collapsedSize` | number \| string | "0%" | 收合時的尺寸 |
| `collapsible` | boolean | false | 是否允許收合/展開 |
| `defaultSize` | number \| string | — | 初始尺寸 |
| `disabled` | boolean | false | 停用此 panel 的 resize |
| `elementRef` | Ref | — | DOM ref |
| `groupResizeBehavior` | "preserve-relative-size" \| "preserve-pixel-size" | "preserve-relative-size" | 容器 resize 時的行為 |
| `id` | string \| number | auto | 唯一識別 |
| `maxSize` | number \| string | "100%" | 最大尺寸 |
| `minSize` | number \| string | "0%" | 最小尺寸 |
| `onResize` | function | — | 尺寸變化回調（含 prevSize） |
| `panelRef` | Ref | — | imperative API ref |
| `style` | CSSProperties | — | 作用在內層 div |

#### Separator

| Prop | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `children` | ReactNode | — | 自訂把手內容 |
| `className` | string | — | CSS class |
| `disabled` | boolean | false | 停用此 separator |
| `disableDoubleClick` | boolean | false | 停用雙擊重置 |
| `elementRef` | Ref | — | DOM ref |
| `id` | string \| number | auto | 唯一識別 |
| `style` | CSSProperties | — | 自訂樣式（flexGrow/flexShrink 鎖定） |

---

## Layout 計算

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 6 | 初始 layout 分配 | 有 defaultSize 的先分配，剩餘空間均分給無 defaultSize 的 panel | `calculateDefaultLayout.ts` |
| 7 | Layout 總和 = 100% 不變式 | 永遠維持百分比加總等於 100，違反時回退到上一個合法 layout | `adjustLayoutByDelta.ts` |
| 8 | 雙向 clamp | 調整一側時反向檢查另一側約束，確保雙向都不違反 min/max | `adjustLayoutByDelta.ts` |
| 9 | N panel delta 傳播 | 拖曳一個 separator 可影響多個相鄰 panel，delta 逐步傳播直到被吸收 | `adjustLayoutByDelta.ts` |

### Delta 傳播演算法（adjustLayoutByDelta）

1. **Collapsible snap 偵測** — 拖曳朝收合方向時，在 halfway point 預調 delta
2. **計算反向可用 delta** — 反向 panel 們能釋放多少空間
3. **主要調整** — 將 delta 套用到反向 panel（受各自約束限制）
4. **次要調整** — 將被吸收的量加到 pivot panel
5. **Fallback 調整** — 剩餘 delta 分配給同向其他 panel
6. **驗證** — 確認 layout 加總 = 100%，否則回退

---

## 單位支援

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 10 | % 百分比 | 內部模型基礎單位，`"33"` 或 `"33%"` | `parseSizeAndUnit.ts` |
| 11 | px 像素 | `200`（純數字預設 px）或 `"200px"` | `sizeStyleToPixels.ts` |
| 12 | em | 相對 panel 元素的 computed font-size | `convertEmToPixels()` |
| 13 | rem | 相對 `document.documentElement` font-size | `convertRemToPixels()` |
| 14 | vh / vw | 視窗高度/寬度百分比 | `convertVhToPixels()` / `convertVwToPixels()` |
| 15 | 原始值/衍生值兩層結構 | 原始值（使用者傳入）不動，衍生值（純 %）隨容器 resize 重算 | `calculatePanelConstraints.ts` |

### 轉換路徑

```
使用者傳入值（如 "200px"）
  → parseSizeAndUnit() → { value: 200, unit: "px" }
  → sizeStyleToPixels() → 200（px）
  → (px / availableSize) * 100 → 衍生 %
```

---

## 拖曳互動

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 16 | Pointer Events 拖曳 | pointerdown/move/up 三階段 | `onDocumentPointer*.ts` |
| 17 | 命中區域判定 | Separator DOMRect 擴展 + panel 邊界 gap 區域 | `calculateHitRegions.ts` |
| 18 | 粗/細指標自適應 | 觸控裝置 20px vs 滑鼠 10px 命中區域，透過 `matchMedia("(pointer:coarse)")` 偵測 | `isCoarsePointer()` |
| 19 | hover 游標回饋 | 靠近可拖曳區域時顯示 resize cursor | `onDocumentPointerMove.ts` |
| 20 | 拖曳期間全域 cursor | 設在 document.body 上，防止移出區域時 cursor 跳回 | `updateCursorStyle.ts` |
| 21 | 拖曳期間禁止文字選取 | `document.body.style.userSelect = "none"` | `onDocumentPointerDown.ts` |
| 22 | 雙擊重置 | 雙擊 separator 還原 panel 到 defaultSize | `onDocumentDoubleClick.ts` |

### 事件綁定策略

- 所有事件綁在 `document` 上（不綁在元素上）
- pointerdown / pointerup 使用 capture phase，避免被 `stopPropagation` 攔截
- 同一 document 下多個 Group 共用事件 listener（reference counting）

---

## 方向支援

| # | 功能 | 說明 |
|---|------|------|
| 23 | 水平排列（預設） | `flexDirection: row`，cursor `ew-resize`，`touchAction: pan-y` |
| 24 | 垂直排列 | `flexDirection: column`，cursor `ns-resize`，`touchAction: pan-x` |
| 25 | Separator orientation | Group 水平 → Separator `aria-orientation="vertical"`（反向） |

---

## Collapsible

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 26 | 拖曳收合 | 拖曳過 halfway point（`(collapsedSize + minSize) / 2`）時 snap 到 collapsedSize | `adjustLayoutByDelta.ts` |
| 27 | 收合/展開記憶 | 收合前記住尺寸（`expandToSize`），展開時恢復；若無記憶則 fallback 到 minSize | `validatePanelSize.ts` |
| 28 | 程式化收合/展開 | imperative API：`collapse()` / `expand()` | `getImperativePanelMethods.ts` |

### Collapsible 行為範例

```
minSize: 10%, collapsedSize: 0%, halfway = 5%
- 拖到 6% → 停在 minSize（10%）
- 拖到 4% → snap 到 collapsedSize（0%）
```

---

## 鍵盤支援

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 29 | 方向鍵 resize | ArrowLeft/Right（水平）、Up/Down（垂直）每次 5% | `onDocumentKeyDown.ts` |
| 30 | Home / End | 移到最小 / 最大 | 同上 |
| 31 | Enter 切換收合 | collapsible panel 的 toggle collapse/expand | 同上 |
| 32 | F6 / Shift+F6 | 切換到下一個/上一個 separator | 同上 |

### 鍵盤 vs 拖曳差異

- 鍵盤使用 `trigger="keyboard"`，不套用 halfway-point snap（從收合狀態直接展開）
- 必須 Separator 有 focus 才觸發（Separator 自動設 `tabIndex={0}`）

---

## Imperative API

| # | 功能 | 方法 | 說明 |
|---|------|------|------|
| 33 | Panel: collapse | `collapse()` | 收合到 collapsedSize（需 collapsible） |
| 34 | Panel: expand | `expand()` | 展開到先前尺寸或 minSize |
| 35 | Panel: resize | `resize(size: number \| string)` | 程式化設定尺寸，支援所有單位 |
| 36 | Panel: getSize | `getSize(): {asPercentage, inPixels}` | 取得當前尺寸 |
| 37 | Panel: isCollapsed | `isCollapsed(): boolean` | 查詢是否處於收合狀態 |
| 38 | Group: getLayout | `getLayout(): Layout` | 取得所有 panel 百分比 |
| 39 | Group: setLayout | `setLayout(layout): Layout` | 設定整組 layout（會驗證） |

---

## 容器 Resize 處理

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 40 | ResizeObserver 監聽 | 容器尺寸變化時重算約束 | `mountGroup.ts` |
| 41 | preserve-relative-size | 維持百分比不變（預設）。容器 800→1000px，panel 25% 仍為 25% | `preserveFixedPanelSizes.ts` |
| 42 | preserve-pixel-size | 維持 px 寬度不變。容器 800→1000px，panel 200px 仍為 200px（25%→20%） | 同上 |
| 43 | layout 違反約束時自動修正 | resize 後重新驗證並 clamp，違反時自動修正 | `validatePanelGroupLayout.ts` |

### preserve-pixel-size 限制

至少一個 panel 必須使用 `preserve-relative-size`，用來吸收容器尺寸變化的差異。

---

## 持久化

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 44 | autoSaveId + storage | 自動存/讀 layout，storage key 格式：`react-resizable-panels:{id}:{panelIds}` | `useDefaultLayout.ts` |
| 45 | 自訂 storage 實作 | 只需 `getItem` / `setItem` 介面（如 localStorage、sessionStorage） | 同上 |
| 46 | 條件渲染 layout cache | 不同 panel 組合各自快取 layout，切換組合時自動恢復 | `groups.ts` |
| 47 | Legacy format migration | 支援 v3 layout 格式的自動遷移 | `useDefaultLayout.ts` |

---

## Accessibility（無障礙）

| # | 功能 | 說明 |
|---|------|------|
| 48 | `role="separator"` | Separator 的語意角色 |
| 49 | `aria-valuemin` / `aria-valuemax` / `aria-valuenow` | 當前尺寸與可調範圍 |
| 50 | `aria-controls` | 指向被控制的 panel |
| 51 | `aria-orientation` | separator 的方向（與 Group 反向） |
| 52 | `aria-disabled` | disabled 狀態 |
| 53 | `tabIndex` 管理 | 啟用時 `tabIndex={0}` 可 focus，disabled 時移除 |

---

## Separator 狀態管理

| # | 功能 | 說明 |
|---|------|------|
| 54 | 狀態值 | `inactive` / `hover` / `active` / `focus` / `disabled` |
| 55 | `data-separator` 屬性 | 反映當前狀態，供 CSS 選擇器使用 |
| 56 | disabled（panel / group 層級） | 個別 panel 或整組停用 resize |

### CSS 樣式策略

```css
/* 使用者透過 data-separator 屬性做狀態樣式 */
[data-separator="hover"]  { background: #e0e0e0; }
[data-separator="active"] { background: #bdbdbd; }
```

---

## 進階 Cursor 管理

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 57 | 方向性 cursor | 碰到約束邊界時顯示 `e-resize` / `w-resize` 等單向 cursor | `getCursorStyle.ts` |
| 58 | CSS Cursor Level 4 偵測 | 支援時用進階 cursor，否則 fallback（如 `ew-resize` → `col-resize`） | `supportsAdvancedCursorStyles.ts` |
| 59 | disableCursor 選項 | Group 層級關閉 cursor 管理 | `Group.tsx` |

### Cursor 狀態對照

| 狀態 | 水平 | 垂直 |
|------|------|------|
| hover | `ew-resize` | `ns-resize` |
| active（無約束） | `ew-resize` | `ns-resize` |
| active（碰到 min） | `e-resize` / `w-resize` | `s-resize` / `n-resize` |
| disabled | `not-allowed` | `not-allowed` |

---

## Edge Cases 處理

| # | 功能 | 說明 | 對應原始碼 |
|---|------|------|-----------|
| 60 | iframe 事件攔截 | 拖曳時透過 `setPointerCapture()` 維持事件流 | `onDocumentPointerMove.ts` |
| 61 | iframe pointerout 特殊處理 | iframe 上的 pointerleave 不會正常觸發，需額外處理 | `onDocumentPointerOut.ts` |
| 62 | buttons === 0 偵測 | pointermove 時若 buttons === 0，代表在 iframe 內放開滑鼠，強制結束拖曳 | `onDocumentPointerMove.ts` |
| 63 | Hidden Group 延遲計算 | `display:none` 時 `defaultLayoutDeferred = true`，可見後才算 layout | `mountGroup.ts` |
| 64 | 條件渲染 panel 增減 | 動態新增/移除 panel 觸發 layout 重算，搭配 layout cache 恢復先前狀態 | `groups.ts` |
| 65 | SSR / Hydration 安全 | `useSyncExternalStore` 避免 server/client mismatch | `useDefaultLayout.ts` |

---

## CSS / 樣式架構

| # | 功能 | 說明 |
|---|------|------|
| 66 | Panel 雙層 div | 外層負責 flex 佈局（flexGrow 動態更新），內層負責 content + overflow |
| 67 | Group 強制樣式 | `display:flex` + `overflow:hidden` + `flexWrap:nowrap`，不可被使用者覆寫 |
| 68 | Separator 強制樣式 | `flexBasis:auto` + `flexGrow:0` + `flexShrink:0` + `touchAction:none` |
| 69 | Panel className/style 作用在內層 | 避免使用者的樣式破壞 flex 佈局 |

### Panel DOM 結構

```html
<div data-panel style="flexGrow: {動態值}; flexBasis: 0; flexShrink: 1; ...">
  <div class="{className}" style="{使用者 style} + overflow:auto + touchAction">
    {children / slot}
  </div>
</div>
```

---

## 事件 / 回調

| # | 功能 | 觸發時機 | Payload |
|---|------|---------|---------|
| 70 | `onLayoutChange` | 拖曳中每幀 | `Layout`（{panelId: percentage}） |
| 71 | `onLayoutChanged` | 拖曳結束 | `Layout` |
| 72 | Panel `onResize` | panel 尺寸任何變化 | `(size: PanelSize, id, prevSize)` |

---

## 全域狀態管理

| 概念 | 說明 |
|------|------|
| Mounted Groups Map | 全域 Map，key 為 RegisteredGroup，value 含 layout、constraints、separator 映射等 |
| Interaction State | module-level 狀態：`inactive` / `hover` / `active`，記錄當前拖曳/hover 資訊 |
| Event Listener Reference Count | 同一 document 下多個 Group 共用 listener，最後一個 Group unmount 時才移除 |

---

## 效能最佳化

| 策略 | 說明 |
|------|------|
| Layout 快取 | 多組 layout 以 panelIds 為 key 快取，避免重複計算 |
| 樣式字串化比對 | Panel style 變化才觸發 re-render |
| ResizeObserver 批次更新 | 單次 resize 事件中批次重算約束 |
| 事件委派 | document 層級單一 listener，hit region 計算決定影響哪個 Group |
| 拖曳狀態不放 reactive | module-level 變數避免 Proxy 開銷（高頻讀取） |

---

## 總計：72 項功能
