# Task 03: HitRegionDetector

> 狀態：done
> 依賴：無
> 對應 SA 章節：Class Diagram — HitRegionDetector、資料結構 — HitResult、Spec §5.2

---

## 模組描述

純 JS class，負責判斷指標座標是否落在兩個 panel 的邊界命中區域內。支援粗指標（觸控）與細指標（滑鼠）兩種命中範圍。v1 只有兩個 panel，因此只有一條邊界（boundaryIndex = 0）。

### Public API

| 方法 | 簽章 | 說明 |
|------|------|------|
| detect | `(pointerX: number, pointerY: number, panels: PanelData[]) → HitResult` | 判斷指標是否命中邊界 |
| getMargin | `() → number` | 取得當前指標類型對應的命中區域 margin（px） |
| isCoarsePointer | `() → boolean` | 偵測當前是否為粗指標（觸控設備） |

### 相關資料結構

```js
// HitResult
{ hit: boolean, boundaryIndex: number | null }

// Constructor 接收
resizeTargetMinimumSize: { coarse: number, fine: number }  // 預設 { coarse: 20, fine: 10 }
```

---

## 驗收條件

- 指標在邊界命中區域內 → hit = true, boundaryIndex = 0
- 指標在命中區域外 → hit = false, boundaryIndex = null
- 粗/細指標切換正確影響命中範圍
- 命中區域以邊界為中心，向兩側延伸

---

## TODO

### detect

- [x] **命中判定** — 指標座標在邊界 ± margin 範圍內 → `{ hit: true, boundaryIndex: 0 }`
- [x] **未命中** — 指標座標在範圍外 → `{ hit: false, boundaryIndex: null }`
- [x] **邊界位置計算** — 從 panels 的 DOM 位置推算邊界座標（panel[0] 的右邊緣）
- [x] **水平方向** — v1 固定水平排列，只比對 X 座標

### getMargin

- [x] **細指標** — 非觸控設備回傳 fine 值（預設 10）
- [x] **粗指標** — 觸控設備回傳 coarse 值（預設 20）
- [x] **自訂值** — constructor 傳入的 resizeTargetMinimumSize 正確套用

### isCoarsePointer

- [x] **偵測機制** — 使用 `matchMedia('(pointer: coarse)')` 判斷
- [x] **fallback** — matchMedia 不支援時的預設行為（fallback 為 fine）
