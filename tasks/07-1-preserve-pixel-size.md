# Task 07-1: preserve-pixel-size

> 狀態：完成
> 依賴：Task 05 — ResizablePanelManager、Task 02 — LayoutCalculator
> 參考：react-resizable-panels `preserveFixedPanelSizes.ts`

---

## 模組描述

容器 resize 時，標記為 `preserve-pixel-size` 的 panel 維持像素尺寸不變，`preserve-relative-size`（預設）的 panel 吸收剩餘空間。此為 per-panel 設定，同一 group 內可混用。

### 問題場景

sidebar 設定 `minSize: '200px'`，容器從 1000px 經歷「縮小 → 放大」：

| 階段 | 容器 | sidebar % | sidebar px | 說明 |
|------|------|----------|-----------|------|
| 初始 | 1000px | 30% | 300px | 使用者拖曳到此位置 |
| 縮小 | 500px | 30% → 40% | 150px → 200px | 被 validateLayout 推到 40% |
| 放大 | 1000px | 40% | 400px | 合法但膨脹，使用者未操作 |

`preserve-pixel-size` 解決此問題：容器放大時 sidebar 維持 300px（30%），不會膨脹。

---

## 驗收條件

- `PanelConfig` 支援可選 `groupResizeBehavior`（`'preserve-pixel-size'` / `'preserve-relative-size'`），預設 `'preserve-relative-size'`
- `LayoutCalculator.preservePixelSizes()` 純數學計算，不依賴 DOM
- 短路條件：prevSize ≤ 0、nextSize ≤ 0、尺寸相等、無 pixel panel、無 flexible panel → 回傳原 layout
- pixel panel 維持像素尺寸，relative panel 按比例瓜分剩餘空間
- 全部為 `preserve-relative-size` 時，行為與現有版本完全一致
- `_handleResize` 流程：`_computeAllConstraints → preservePixelSizes → validateLayout`
- `_lastGroupSize` 在 `activate` 時初始化，每次 resize 後更新
- 現有測試全部通過
- docs/ 開發文件同步更新

---

## 執行流程變化

```
現在：
resize → _computeAllConstraints(width) → validateLayout → 比較 → emit

之後：
resize → _computeAllConstraints(width) → preservePixelSizes(prev, prevSize, nextSize, panels) → validateLayout → 比較 → emit → 更新 _lastGroupSize
```

---

## TODO

### Phase 1 — LayoutCalculator.preservePixelSizes

- [x] **PanelConfig typedef 擴充** — 新增 `groupResizeBehavior` 欄位
- [x] **測試：短路條件** — prevSize ≤ 0、nextSize ≤ 0、尺寸相等、無 pixel panel、無 flexible panel
- [x] **測試：基本場景** — 1 pixel panel + 1 relative panel，容器縮小
- [x] **測試：基本場景** — 1 pixel panel + 1 relative panel，容器放大
- [x] **測試：混用場景** — 多個 pixel panel + 多個 relative panel
- [x] **測試：邊界** — flexible 組原始加總為 0（均分 remainingSize）
- [x] **測試：不做 clamp** — 輸出可能超出 0-100，由 validateLayout 處理
- [x] **實作 preservePixelSizes** — 通過上述所有測試（15 tests passed）

### Phase 2 — Manager 整合

- [x] **_lastGroupSize 欄位** — activate 時初始化，deactivate 時清除
- [x] **_handleResize 調整** — 插入 preservePixelSizes 呼叫，resize 後更新 _lastGroupSize
- [x] **現有測試驗證** — 全部通過（141 tests passed）

### Phase 3 — Playground 驗證

- [x] **pixel-size demo** — 手動 Playground 驗證通過

### Phase 4 — 文件更新

- [x] **docs/LayoutCalculator.md** — 新增 preservePixelSizes 說明
- [x] **docs/ResizablePanelManager.md** — 更新 resize 流程、_lastGroupSize、PanelConfig.groupResizeBehavior
- [x] **preserve-pixel-size-規劃.md** — 狀態更新為完成

---

## 測試策略

- Phase 1 為 LayoutCalculator 單元測試（Vitest）
- Phase 2 為 Manager 整合，現有單元測試驗證行為不變（全部 relative，preservePixelSizes 短路）
- Phase 3 為 Playground 手動驗證
