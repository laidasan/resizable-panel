# Task 02: LayoutCalculator

> 狀態：pending
> 依賴：Task 01 — UnitConverter
> 對應 SA 章節：Class Diagram — LayoutCalculator、設計決策 — 約束衝突解決策略 / 事件去重與浮點容差

---

## 模組描述

純 JS class，負責所有 layout 數學計算。包含初始 layout 分配、拖曳 delta 調整、約束驗證、layout 相等比較。內部依賴 UnitConverter 進行單位轉換。

### Public API

| 方法 | 簽章 | 說明 |
|------|------|------|
| calculateInitialLayout | `(panels: PanelData[], availableSize: number) → Layout` | 根據 panel 配置計算初始 layout |
| adjustLayoutByDelta | `(baseLayout: Layout, delta: number, panels: PanelData[]) → Layout` | 基於 baseLayout + delta 計算新 layout |
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

## TODO

### calculateInitialLayout

- [ ] **均分** — 所有 panel 都沒有 defaultSize 時，均分 100%
- [ ] **有 defaultSize** — 按 defaultSize 分配，受 min/max clamp
- [ ] **混合** — 部分有 defaultSize、部分沒有，沒有的均分剩餘
- [ ] **defaultSize 為 px** — 透過 UnitConverter 轉為百分比後分配
- [ ] **約束衝突** — minSize 加總 > 100% 時，按 DOM 順序處理，無法滿足則回退

### adjustLayoutByDelta

- [ ] **基本 delta 調整** — 正 delta（右移）：左 panel 增大，右 panel 縮小
- [ ] **雙向 clamp** — 調整時同時檢查兩側 panel 的 min/max 約束
- [ ] **delta 基於 baseLayout** — 非累計式計算，避免浮點漂移
- [ ] **約束碰壁** — delta 導致某側 panel 碰到約束時，clamp 到極限值
- [ ] **100% 不變式** — 任何 delta 調整後加總 = 100%

### validateLayout

- [ ] **約束仍合法** — layout 符合所有 panel 約束時，原樣回傳
- [ ] **約束不合法** — 容器 resize 導致 px 約束換算後 layout 違規，自動 clamp
- [ ] **衝突回退** — clamp 後無法滿足 100% 時，回退到上一個合法 layout（或拋出/標記）

### layoutsEqual

- [ ] **完全相同** — `{ a: 50, b: 50 }` vs `{ a: 50, b: 50 }` → true
- [ ] **浮點微差** — `{ a: 49.99999, b: 50.00001 }` vs `{ a: 50, b: 50 }` → true
- [ ] **實質差異** — `{ a: 48, b: 52 }` vs `{ a: 50, b: 50 }` → false
- [ ] **不同 key** — panel id 不同 → false
