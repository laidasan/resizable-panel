# preserve-pixel-size 規劃

> 建立日期：2026-05-20
> 狀態：待評估
> 關聯：`V1-SPEC.md` 7.2 節、`V1-SA.md` ResizeObserver 流程

---

## 背景

v1 SPEC 明確定義 resize 策略為 **preserve-relative-size**（容器尺寸變化時，各 panel 百分比維持不變）。此策略在 px 約束場景下有已知限制。

### 問題場景

sidebar 設定 `minSize: '200px'`，容器從 1000px 經歷「縮小 → 放大」：

| 階段 | 容器 | sidebar % | sidebar px | 發生了什麼 |
|------|------|----------|-----------|-----------|
| 初始 | 1000px | 30% | 300px | 使用者拖曳到此位置 |
| 縮小 | 500px | 30% → 40% | 150px → 200px | 30% = 150px < min 200px，被 validateLayout 推到 40% |
| 放大 | 1000px | 40% | 400px | 40% 合法，不修正。但 sidebar 從 300px 變成 400px |

**結果**：使用者沒有拖曳，sidebar 卻從 300px 膨脹到 400px，且無法自動回到 300px。原因是 validateLayout 只檢查 constraint 合法性，不知道 40% 是被推上去的還是使用者拖出來的。

---

## react-resizable-panels 的做法

### 設定方式

`groupResizeBehavior` 是 **per-panel 的可選屬性**，預設 `preserve-relative-size`。同一 group 內可混用：

```tsx
<Panel groupResizeBehavior="preserve-pixel-size" />  {/* sidebar，維持 px */}
<Panel />  {/* main，預設 preserve-relative-size，吸收剩餘空間 */}
```

### 實作位置

`lib/global/utils/preserveFixedPanelSizes.ts`

### 演算法

```
輸入：prevLayout, prevGroupSize, nextGroupSize, panels
輸出：newLayout（未驗證，需再過 validateLayout）

1. 遍歷所有 panel，依 groupResizeBehavior 分兩組：
   - pixel 組（preserve-pixel-size）
   - relative 組（preserve-relative-size）

2. pixel 組：
   prevPixels = prevPercent / 100 * prevGroupSize
   newPercent = prevPixels / nextGroupSize * 100

3. relative 組：
   remainingPercent = 100 - pixel 組的 newPercent 加總
   按 relative 組內各 panel 的原百分比比例，瓜分 remainingPercent

4. 回傳 newLayout（交給 validateLayout 做 constraint clamp）
```

### 執行時機

在 ResizeObserver callback 內，位於 **重算 constraints 之後、validateLayout 之前**：

```
resize → 重算 constraints → preserveFixedPanelSizes → validateLayout
```

### 短路條件

- `prevGroupSize <= 0` 或 `nextGroupSize <= 0` → 回傳原 layout
- `prevGroupSize === nextGroupSize` → 回傳原 layout
- 沒有任何 `preserve-pixel-size` 的 panel → 回傳原 layout

---

## 我們的預期工法

### 異動範圍

| 檔案 | 異動 |
|------|------|
| `ResizablePanelManager.js` | 新增 `_groupSize` 欄位，`activate` 時記錄初始值，`_handleResize` 內呼叫 LayoutCalculator 的新方法 |
| `LayoutCalculator.js` | 新增 `preservePixelSizes(prevLayout, prevGroupSize, nextGroupSize, panels)` |
| `PanelConfig` typedef | 新增可選 `groupResizeBehavior`（`'preserve-pixel-size'` / `'preserve-relative-size'`），預設 `preserve-relative-size` |
| 測試 | `LayoutCalculator.test.js` 新增 preservePixelSizes 測試案例 |

### _handleResize 變化

現在：

```
resize → _computeAllConstraints(width) → validateLayout → 比較 → emit
```

之後：

```
resize → _computeAllConstraints(width) → preservePixelSizes → validateLayout → 比較 → emit → 更新 _groupSize
```

### preservePixelSizes 職責

- 純數學計算，不依賴 DOM
- 輸入 prevLayout + 前後容器寬度 + panels（取 groupResizeBehavior 設定）
- 輸出新 layout（未驗證）
- 不做 constraint clamp（SRP，clamp 是 validateLayout 的職責）

### 與現有架構的相容性

- `preserve-relative-size`（預設）行為完全不變，preservePixelSizes 短路回傳原 layout
- 新功能是 opt-in，不影響現有使用者
- 演算法放在 LayoutCalculator 內，與現有的 calculateInitialLayout / adjustLayoutByDelta / validateLayout 同層級

---

## constraints 重算 vs preserve-pixel-size 的區別

兩者在 resize 時同時發生，但作用對象不同：

| | 作用對象 | 做什麼 | 目前狀態 |
|---|---------|--------|---------|
| constraints 重算 | min/max 的百分比邊界 | px 單位的 min/max 重新換算為 % | 已實作 |
| preserve-pixel-size | layout 中各 panel 的百分比值 | 維持各 panel 的像素尺寸不變 | 待實作 |

constraints 重算管的是「邊界在哪」，preserve-pixel-size 管的是「值在哪」。兩者獨立運作，先做 pixel 保持，再做 constraint 驗證。

---

## 待確認事項

- [ ] 是否納入 v1.x 或留到 v2
- [ ] per-panel 混用 vs group-level 統一設定（v1 可先做 group-level 簡化版）
- [ ] 測試案例設計（縮小 → 放大來回、混用場景、極端值）
