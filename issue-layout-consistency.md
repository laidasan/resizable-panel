# Issue: validateLayout 與 adjustLayoutByDelta 的約束處理不一致

> 發現日期：2026-05-20

---

## 問題摘要

`validateLayout`（resize / 初始化路徑）與 `adjustLayoutByDelta`（拖曳路徑）對 min/max 約束衝突的處理策略不一致，導致兩類問題：

1. **拖曳跳變** — 拖曳瞬間 layout 突然跳到不同的值
2. **resize 縮減順序** — 容器縮小時的 panel 縮減策略不夠合理

---

## 問題 1: 拖曳跳變

### 現象

activate() 後 layout 正常，但一開始拖曳，panel 尺寸瞬間跳變。

### 復現情境 A — Group3（視窗 436px）

配置：
```js
{ id: 'a', defaultSize: '50%', minSize: '300px', maxSize: '60%' }
{ id: 'b', defaultSize: '50%', minSize: '200px', maxSize: '70%' }
```

- activate() → `a: 81.3%, b: 18.7%`
- 拖曳瞬間 → `a: 60%, b: 40%`

**原因**：容器過小導致 Panel A 的 `minSize(81.3%) > maxSize(60%)`。`_applyConstraints` 允許 minSize 突破 maxSize 來維持 100% 不變式，但 `adjustLayoutByDelta` 的 `_clampValue` 用 `Math.min(Math.max(v, min), max)` 讓 maxSize 勝出，A 被壓回 60%。

### 復現情境 B — Group6（視窗 1134px）

配置：
```js
{ id: 'a', minSize: '800px' }
{ id: 'b', defaultSize: '480px', minSize: '306px', maxSize: '480px' }
```

- activate() → `a: 74.9%, b: 25.1%`
- 拖曳縮小 B 到一定閥值 → 跳變為 `a: 71.3%, b: 28.7%`

**原因**：`_applyConstraints` 的第二輪強制突破讓 B 被壓到 minSize 以下（26.06% < minSize 28.28%）。`adjustLayoutByDelta` 的 `_clampValue` 嚴格 respect minSize，把 B 從 26.06% 矯正回 28.28%，使用者想縮小 B 卻看到 B 反而變大。

### 根本原因

兩條路徑對約束衝突的處理不一致：

| 路徑 | minSize > maxSize 時 | panel 低於 minSize 時 |
|------|---------------------|---------------------|
| `_applyConstraints`（validateLayout） | minSize 勝出，突破 maxSize | 允許（第二輪強制突破） |
| `_clampValue`（adjustLayoutByDelta） | maxSize 勝出 | 強制拉回 minSize |

---

## 問題 2: resize 縮減順序

### 現象

容器縮小時，`_shrinkPanels` 一律從最後一個 panel 開始往前扣。在某些配置下，這導致約束衝突（panel 被壓到 minSize 以下），進而觸發問題 1 的跳變。

### 期望行為

resize 時，先嘗試處理前面的 panel，再處理後面的 panel（逐一依序處理），而不是一律從後面開始扣。

---

## 與原版 react-resizable-panels 的對比

原版在相同情境下的行為：

| | 原版 | 我們 |
|---|---|---|
| 約束衝突處理 | maxSize 永遠勝出（`validatePanelSize` 先 clamp min 再 Math.min(max)） | minSize 可突破 maxSize（保證 100% 不變式） |
| resize 結果 | 靜默產出加總 > 100% 的 layout（panel 溢出容器） | 加總 = 100%，但可能突破 minSize |
| 拖曳跳變？ | 不會（初始 layout 已是 maxSize 狀態） | 會（兩條路徑不一致） |
| 拖曳可操作性 | 可能無反應（panel 已在約束邊界） | 可操作但有跳變 |

兩邊都不理想，只是壞的方式不同。

---

## 待討論方向

1. **resize 縮減順序調整** — 先處理 Panel A 再處理 Panel B，逐一依序
2. **拖曳跳變修正** — 目標：不跳變
