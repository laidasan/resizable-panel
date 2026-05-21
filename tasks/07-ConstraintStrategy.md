# Task 07 — ConstraintStrategy（策略模式重構）

> 狀態：待開發

---

## 目標

將 LayoutCalculator 的約束分配邏輯（`_applyConstraints`）抽為可替換的策略，支援不同的空間分配行為。

---

## 背景

目前 `_applyConstraints` 使用等比例 normalize → clamp → redistribute 的固定流程。
使用者需要 collapse 行為：視窗縮小時，低 index panel 優先被壓縮，高 index panel 維持 minSize。
兩種行為需要共存且可切換。

---

## 規格

### 影響路徑

| 路徑 | 是否受策略影響 | 說明 |
|------|:-:|------|
| init（`calculateInitialLayout`） | 是 | 經過 `_applyConstraints` |
| resize（`validateLayout`） | 是 | 經過 `_applyConstraints` |
| 拖曳（`adjustLayoutByDelta`） | 否 | 維持現有邏輯，碰到 minSize 就停住 |

### 策略介面

```
ConstraintStrategy.apply(layout, panels) → Layout
```

- 輸入：normalize 前的 layout + panels 陣列（DOM 順序）
- 輸出：套用約束後的 layout

### ProportionalStrategy（現有行為）

將現有 `_applyConstraints` 邏輯搬出：
1. normalize 到 100%
2. clamp 每個 panel 到 min/max
3. 剩餘空間從 index 0 開始 redistribute

行為完全不變，現有測試應全部通過。

### CollapseStrategy（新增）

collapse 順序：DOM 順序（index 小的先被壓縮）。

分配邏輯：
1. 從最高 index 開始，優先保證其 minSize
2. 剩餘空間分配給較低 index 的 panel
3. 空間不足時，低 index panel 被壓縮，最低可到 0
4. panel 壓到 0 時保留 0 寬，不隱藏（不設 `display: none`）

### LayoutCalculator 異動

- constructor 或 setter 接收 ConstraintStrategy 實例
- `_applyConstraints` 委派給 `strategy.apply()`
- 共用方法（`_normalizeLayout`, `_formatNumber`, `_isZero`, `_clampValue`, `_validatePanelSize`, `layoutsEqual`）留在 LayoutCalculator

### Manager 異動

- 決定傳哪個 strategy 給 LayoutCalculator（透過 groupConfig 或 API）

---

## 開發順序

1. 定義 ConstraintStrategy 介面
2. 抽出 ProportionalStrategy（搬現有邏輯，驗證現有測試通過）
3. 實作 CollapseStrategy + 測試
4. LayoutCalculator 接入 strategy，驗證整合
5. Manager 層串接
6. Playground 手動驗證

---

## 測試策略

- ProportionalStrategy：沿用現有 LayoutCalculator 測試（搬移或調整 import）
- CollapseStrategy：新增測試案例
  - 基本 collapse：2 panels，空間不足時 index 0 先縮
  - 多 panel collapse：3+ panels，依序從 index 0 壓縮
  - 邊界：index 0 壓到 0 後，開始壓 index 1
  - 空間充足時：所有 panel 正常分配，不觸發 collapse
  - min/max 約束交互
