# Task 02: LayoutCalculator

> 狀態：done
> 依賴：Task 01 — UnitConverter
> 對應 SA 章節：Class Diagram — LayoutCalculator、設計決策 — 約束衝突解決策略 / 事件去重與浮點容差

---

## 模組描述

純 JS class，負責所有 layout 數學計算。包含初始 layout 分配、拖曳 delta 調整、約束驗證、layout 相等比較。內部依賴 UnitConverter 進行單位轉換。

### Public API

| 方法 | 簽章 | 說明 |
|------|------|------|
| calculateInitialLayout | `(panels: PanelData[], availableSize: number) → Layout` | 根據 panel 配置計算初始 layout |
| adjustLayoutByDelta | `(baseLayout: Layout, delta: number, boundaryIndex: number, panels: PanelData[]) → Layout` | 基於 baseLayout + delta 計算新 layout（boundaryIndex 指定拖曳的邊界） |
| validateLayout | `(layout: Layout, panels: PanelData[]) → Layout` | 驗證並修正 layout 使其符合約束 |
| layoutsEqual | `(a: Layout, b: Layout) → boolean` | 含浮點容差的 layout 比較 |

### 相關資料結構

```js
// Layout — plain object
{ [panelId: string]: number }  // 值為百分比 0-100，加總 = 100

// PanelData
{ id, element, config: PanelConfig, constraints: PanelConstraints }

// PanelConstraints（百分比）
{ minSize: number, maxSize: number }
```

---

## 驗收條件

- 所有計算結果滿足 100% 總和不變式（Spec §3.2）
- 雙向約束 clamp 正確運作（Spec §3.3）
- 約束衝突按 DOM 順序處理（Spec §3.4、SA 約束衝突解決策略）
- layoutsEqual 使用浮點容差，避免誤判

---

## 設計決策（2026-05-19 確認）

1. **defaultSize 加總 ≠ 100%** — 按比例 normalize 到 100%（沿用 react-resizable-panels 做法）
2. **adjustLayoutByDelta 簽章** — 加入 `boundaryIndex` 參數，預留多 panel 彈性。v1 兩個 panel 只有 boundaryIndex=0
3. **validateLayout 衝突處理** — best-effort clamp + 重分配剩餘空間，永遠回傳合法 Layout，不 throw、不回傳 null
4. **adjustLayoutByDelta 衝突處理** — 無法完整套用 delta 時回傳 `baseLayout`（全有或全無）

---

## TODO

### calculateInitialLayout

- [x] **均分** — 所有 panel 都沒有 defaultSize 時，均分 100%
- [x] **有 defaultSize** — 按 defaultSize 分配，加總 ≠ 100% 時按比例 normalize，受 min/max clamp
- [x] **混合** — 部分有 defaultSize、部分沒有，沒有的均分剩餘
- [x] **defaultSize 為 px** — 透過 UnitConverter 轉為百分比後分配
- [x] **約束衝突** — minSize 加總 > 100% 時，按 DOM 順序處理，後面的 panel 讓步

### adjustLayoutByDelta

- [x] **基本 delta 調整** — 正 delta（右移）：boundaryIndex 左側 panel 增大，右側 panel 縮小
- [x] **雙向 clamp** — 調整時同時檢查兩側 panel 的 min/max 約束
- [x] **delta 基於 baseLayout** — 非累計式計算，避免浮點漂移
- [x] **約束碰壁** — delta 導致某側 panel 碰到約束時，clamp 到極限值
- [x] **無法套用** — delta 完全無法套用時回傳 baseLayout
- [x] **100% 不變式** — 任何 delta 調整後加總 = 100%
- [x] **多 panel** — boundaryIndex 指定拖曳邊界，只調整相鄰兩個 panel

### validateLayout

- [x] **約束仍合法** — layout 符合所有 panel 約束時，原樣回傳
- [x] **約束不合法** — 容器 resize 導致 px 約束換算後 layout 違規，自動 clamp
- [x] **衝突處理** — best-effort clamp + 重分配剩餘空間，永遠回傳合法 Layout

### layoutsEqual

- [x] **完全相同** — `{ a: 50, b: 50 }` vs `{ a: 50, b: 50 }` → true
- [x] **浮點微差** — `{ a: 49.99999, b: 50.00001 }` vs `{ a: 50, b: 50 }` → true（toFixed(3) 後比較）
- [x] **實質差異** — `{ a: 48, b: 52 }` vs `{ a: 50, b: 50 }` → false
- [x] **不同 key** — panel id 不同 → false
