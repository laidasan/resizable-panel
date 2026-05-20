# Task 06-1: 重構 validateLayout 邏輯

> 狀態：verified
> 依賴：無（在既有 LayoutCalculator 上修改）
> 決策文件：`issue-layout-consistency.md`
> SPEC 修訂：`V1-SPEC.md` §3.2（修訂版）、§3.4（修訂版）

---

## 目標

將 `_applyConstraints` 從現有的「clamp → 從後往前強制重分配」改為原版 react-resizable-panels `validatePanelGroupLayout` 的策略，使 validateLayout 與 adjustLayoutByDelta 的約束處理一致，消除拖曳跳變問題。

---

## 變更範圍

### 檔案

| 檔案 | 變更類型 |
|------|---------|
| `src/core/LayoutCalculator.js` | 修改 `_applyConstraints`、新增 `_validatePanelSize`、移除 3 個方法 |
| `tests/core/LayoutCalculator.test.js` | 修改 validateLayout 測試案例 |

### 移除方法

- `_redistributeOverflow` — 溢出量重分配入口
- `_shrinkPanels` — 從後往前縮減（含第二輪強制突破 minSize）
- `_growPanels` — 從後往前擴增

### 新增方法

- `_validatePanelSize(size, constraints)` — 單一 panel 的約束驗證（對應原版 `validatePanelSize`）

### 修改方法

- `_applyConstraints(layout, panels)` — 重寫為新邏輯

---

## 新邏輯：`_applyConstraints`

### 流程

```
1. normalize — 加總 ≠ 100% 時，等比例縮放回 100%
2. clamp — 每個 panel 依序用 _validatePanelSize clamp，累積 remainingSize
3. 重分配 — 從 index 0 開始，將 remainingSize 塞回可接受的 panel
```

### `_validatePanelSize` 行為

```
if size < minSize → size = minSize
size = Math.min(maxSize, size)
```

當 minSize > maxSize 時，maxSize 勝出（與 `_clampValue` 一致）。

### remainingSize 語意

- 正值：clamp 砍掉的量 > 撐起的量，多出空間需要塞回去
- 負值：clamp 撐起的量 > 砍掉的量，空間不足需要扣回來
- 零：剛好平衡，跳過重分配

### 重分配行為

從 index 0 往後遍歷，嘗試把 remainingSize 加到每個 panel（正或負），受 `_validatePanelSize` 約束。用完即 break。若所有 panel 都無法吸收，remainingSize 殘留，加總 ≠ 100%（SPEC §3.2 修訂版允許）。

---

## TDD 測試案例

### 保留（行為不變，預期結果不變）

- [x] `validateLayout_Should_ReturnOriginalLayout_When_AllConstraintsSatisfied`
- [x] `validateLayout_Should_ClampToMinAndRedistribute_When_PanelBelowMinSize`
- [x] `validateLayout_Should_ClampToMaxAndRedistribute_When_PanelAboveMaxSize`
- [x] `validateLayout_Should_ClampByDomOrder_When_MultiplePanelsViolateConstraints`

### 修改（行為改變，已更新預期結果）

- [x] `validateLayout_Should_RespectBothMinSizes_When_MinSizeSumExceeds100`（原 `ReturnValidLayout`）
  - 舊預期：`a=60, b=40`（強制突破 b 的 minSize，加總 = 100%）
  - 新預期：`a=60, b=60`（兩者都 respect minSize，加總 = 120%）

- [x] `calculateInitialLayout_Should_RespectBothMinSizes_When_MinSizeSumExceeds100`（原 `PrioritizeByDomOrder`）
  - 舊預期：`a=60, b=40`（加總 = 100%）
  - 新預期：`a=60, b=60`（加總 = 120%）

### 新增

- [x] `validateLayout_Should_NormalizeTo100_When_LayoutSumIsNot100`
  - 情境：`{ a: 40, b: 40 }` 加總 80% → normalize → `{ a: 50, b: 50 }`

- [x] `validateLayout_Should_RedistributeFromIndex0_When_ClampProducesPositiveRemaining`
  - 情境：3 panels `[50, 30, 20]`，Panel A maxSize=35 → A 被砍到 35，多出 15 → B 吸收

- [x] `validateLayout_Should_RedistributeFromIndex0_When_ClampProducesNegativeRemaining`
  - 情境：3 panels `[10, 10, 80]`，A/B minSize=40，C 無約束 → A/B 撐到 40，C 從 80 扣到 20

- [x] `validateLayout_Should_LetMaxSizeWin_When_MinSizeExceedsMaxSize`
  - 情境：Panel A minSize=80, maxSize=60 → 回傳 60

- [x] `validateLayout_Should_AllowSumOver100_When_ConstraintsCannotBeSatisfied`
  - 情境：兩個 panel minSize=60 → 加總 = 120%

- [x] `validateLayout_Should_AllowSumUnder100_When_MaxSizesSumBelow100`
  - 情境：Panel A/B maxSize=40 → 加總 = 80%

---

## 實作順序

1. 先寫新增 + 修改的測試案例（測試先行）
2. 新增 `_validatePanelSize`
3. 重寫 `_applyConstraints`（normalize → clamp → 重分配）
4. 移除 `_redistributeOverflow`、`_shrinkPanels`、`_growPanels`
5. 驗證所有測試通過
6. `calculateInitialLayout` 內部呼叫 `_applyConstraints`，確認初始化路徑也正確

---

## 驗收條件

- 所有保留 + 修改 + 新增的測試案例通過
- `_shrinkPanels`、`_growPanels`、`_redistributeOverflow` 已移除，無殘留引用
- `_applyConstraints` 與 `_clampValue`（adjustLayoutByDelta 使用）對 min/max 衝突的處理一致（maxSize 勝出）
- Playground Group3、Group6 的拖曳跳變問題消失
