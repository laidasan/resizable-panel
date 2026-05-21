# Group 1 流程規格

> 情境：Group 1 — 佔滿視窗 + px minSize
> 目的：以具體數值追蹤 activate → 拖曳 → resize 三階段的完整計算流程

---

## Panel 配置

```js
{ id: 'a', defaultSize: '60%', minSize: '200px', maxSize: '50%' }
{ id: 'b', defaultSize: '40%', minSize: '150px' }
```

> Panel A 的 defaultSize(60%) > maxSize(50%)，初始化時必定被 clamp。
> Panel B 的 maxSize 未指定，預設為 100%。

---

## 1. activate() 流程

假設視窗寬度 1440px。

### 1-1. `_getAvailableSize()`

```
body padding: 24px × 2 = 48px
group border: 2px × 2 = 4px (box-sizing: border-box)
availableSize = 1440 - 48 - 4 = 1388px
```

### 1-2. `_computeAllConstraints(1388)`

| Panel | minSize 原始值 | minSize % | maxSize 原始值 | maxSize % |
|-------|--------------|-----------|---------------|-----------|
| A | 200px | 200 / 1388 * 100 = 14.409% | 50% | 50% |
| B | 150px | 150 / 1388 * 100 = 10.806% | (預設 100%) | 100% |

### 1-3. `calculateInitialLayout(panels, 1388)`

#### `_partitionByDefaultSize`

兩個 panel 都有 defaultSize：

- A: parse('60%') → toPercent → 60
- B: parse('40%') → toPercent → 40
- nonDefaultPanelDataList: []（空）

#### `_allocateDefaultSizes`

```
entries: [['a', 60], ['b', 40]]
usedPercent: 100, remaining: 0
rawLayout = { a: 60, b: 40 }
```

#### `_normalizeLayout({ a: 60, b: 40 })`

```
total = 100, formatNumber(100) = 100
needsNormalize = false → 原樣回傳
```

#### `_applyConstraints({ a: 60, b: 40 }, panels)`

**第一輪 — clamp：**

| Panel | unsafeSize | constraints | _validatePanelSize | safeSize | remainingSize |
|-------|-----------|-------------|-------------------|----------|---------------|
| A | 60 | min=14.409, max=50 | max(60,14.409)=60 → min(60,50)=50 | 50 | +10 |
| B | 40 | min=10.806, max=100 | max(40,10.806)=40 → min(40,100)=40 | 40 | +10 |

remainingSize = 10（A 被 maxSize 砍掉 10，需要塞回去）

**第二輪 — 重分配（從 index 0）：**

| Panel | prevSize | unsafeSize | _validatePanelSize | safeSize | 吸收？ |
|-------|---------|-----------|-------------------|----------|-------|
| A | 50 | 50+10=60 | min(max(60,14.409),50)=50 | 50=prevSize | 不吸收（已在 maxSize） |
| B | 40 | 40+10=50 | min(max(50,10.806),100)=50 | 50!=40 | 吸收 10 |

remainingSize = 0 → break

### 1-4. 結果

```
layout = { a: 50, b: 50 }
```

Panel A 的 defaultSize(60%) 被 maxSize(50%) clamp，多出的 10% 重分配給 B。

---

## 2. 拖曳流程

### 起始狀態

```
layout = { a: 50, b: 50 }
availableSize = 1388px
Panel A constraints: { minSize: 14.409, maxSize: 50 }
Panel B constraints: { minSize: 10.806, maxSize: 100 }
```

Panel A 寬度 = 694px，Panel B 寬度 = 694px。

### 2-1. pointerdown — 命中偵測

使用者在邊界附近按下滑鼠。

```
_resolveDragTarget(event):
  active=true, disabled=false → canDrag=true
  hitRegionDetector.detect(clientX, clientY, panels) → { hit: true, boundaryIndex: 0 }
  leftPanel=A, rightPanel=B, 兩者 disabled=false → 有效拖曳目標
```

建立 DragState：

```js
_dragState = {
  dragging: true,
  initialLayout: { a: 50, b: 50 },
  pointerDownAt: { x: 694, y: ... },
  activeBoundaryIndex: 0
}
```

設定拖曳 cursor：`cursorManager.setDrag(ConstraintDirection.None)`
觸發 LayoutChange 事件。

### 2-2. pointermove — 情境 A：往右拖 100px（試圖放大 A）

```
deltaPixels = 794 - 694 = +100
deltaPercent = (100 / 1388) * 100 = +7.205%
```

`adjustLayoutByDelta({ a: 50, b: 50 }, +7.205, 0, panels)`：

| 步驟 | 計算 | 結果 |
|------|------|------|
| leftClamped | clamp(50+7.205, 14.409, 50) | 50（被 maxSize 卡住） |
| rightClamped | clamp(50-7.205, 10.806, 100) | 42.795 |
| leftDelta | 50-50 | 0 |
| rightDelta | 42.795-50 | -7.205 |
| actualDelta | \|0\| <= \|7.205\| → leftDelta | 0 |

```
candidate = { a: 50, b: 50 }
layoutsEqual(candidate, baseLayout) → true → hasChanged=false
回傳 baseLayout
```

**結果：layout 不變。** A 已在 maxSize，無法往右拖。

Constraint direction：`leftAtMax=true` → `ConstraintDirection.End`（cursor 提示只能往左）

### 2-3. pointermove — 情境 B：往左拖 200px（縮小 A）

```
deltaPixels = 494 - 694 = -200
deltaPercent = (-200 / 1388) * 100 = -14.409%
```

`adjustLayoutByDelta({ a: 50, b: 50 }, -14.409, 0, panels)`：

| 步驟 | 計算 | 結果 |
|------|------|------|
| leftClamped | clamp(50-14.409, 14.409, 50) | 35.591 |
| rightClamped | clamp(50+14.409, 10.806, 100) | 64.409 |
| leftDelta | 35.591-50 | -14.409 |
| rightDelta | 64.409-50 | +14.409 |
| actualDelta | \|14.409\| <= \|14.409\| → leftDelta | -14.409 |

```
candidate = { a: 35.591, b: 64.409 }
layoutsEqual(candidate, baseLayout) → false → hasChanged=true
```

**結果：`{ a: 35.591, b: 64.409 }`**，加總 = 100%

Constraint direction：A 不在 min 也不在 max → `ConstraintDirection.None`

### 2-4. pointermove — 情境 C：往左拖 500px（超過 A 的 minSize）

```
deltaPixels = 194 - 694 = -500
deltaPercent = (-500 / 1388) * 100 = -36.024%
```

`adjustLayoutByDelta({ a: 50, b: 50 }, -36.024, 0, panels)`：

| 步驟 | 計算 | 結果 |
|------|------|------|
| leftClamped | clamp(50-36.024, 14.409, 50) | 14.409（被 minSize 卡住） |
| rightClamped | clamp(50+36.024, 10.806, 100) | 86.024 |
| leftDelta | 14.409-50 | -35.591 |
| rightDelta | 86.024-50 | +36.024 |
| actualDelta | \|35.591\| <= \|36.024\| → leftDelta | -35.591 |

```
candidate = { a: 14.409, b: 85.591 }
hasChanged = true
```

**結果：`{ a: 14.409, b: 85.591 }`**，加總 = 100%。A 被 clamp 到 minSize。

Constraint direction：`leftAtMin=true` → `ConstraintDirection.Start`（cursor 提示只能往右）

### 2-5. pointerup — 結束拖曳

```
_endDrag():
  resetDragState()
  cursorManager.reset()
  emit(DragEnd, layoutResult)
```

### 2-6. 拖曳摘要

| 方向 | 能否拖動 | 原因 | cursor |
|-----|---------|------|--------|
| 往右（放大 A） | 不能 | A 初始就在 maxSize 50% | End |
| 往左（縮小 A） | 可以 | A 可從 50% 縮到 14.409% | None → Start |

> A 在 activate 後就已卡在 maxSize 邊界（defaultSize 60% > maxSize 50%），
> 使用者只有「往左縮小 A」可操作。

---

## 3. resize 流程（ResizeObserver）

接續拖曳後的 layout。以下假設拖曳結束時 `layout = { a: 35, b: 65 }`。

### ResizeObserver callback

```js
_handleResize(entries):
  width = entry.contentRect.width
  if (width !== 0):
    _computeAllConstraints(width)       // 重算 px → % 約束
    validateLayout(layout, panels)      // 驗證既有 layout
    if (layoutChanged): emit(LayoutChange)
```

### 3-1. 情境 A：溫和縮放 — 視窗 900px（約束收緊但 layout 仍合法）

**availableSize = 848px**

#### `_computeAllConstraints(848)`

| Panel | minSize % | maxSize % |
|-------|-----------|-----------|
| A | 200/848*100 = 23.585% | 50% |
| B | 150/848*100 = 17.689% | 100% |

#### `validateLayout({ a: 35, b: 65 })`

**第一輪 — clamp：**

| Panel | unsafeSize | constraints | safeSize | 變化？ |
|-------|-----------|-------------|----------|-------|
| A | 35 | [23.585, 50] | 35 | 無 |
| B | 65 | [17.689, 100] | 65 | 無 |

remainingSize = 0 → 跳過重分配

```
layoutsEqual → true → 不觸發事件
```

**結果：layout 不變 `{ a: 35, b: 65 }`**

### 3-2. 情境 B：約束收緊 — 視窗 500px（layout 違規，需修正）

**availableSize = 448px**

#### `_computeAllConstraints(448)`

| Panel | minSize % | maxSize % | 可用區間 |
|-------|-----------|-----------|---------|
| A | 200/448*100 = 44.643% | 50% | [44.643, 50]（僅 ~5.4% 自由度） |
| B | 150/448*100 = 33.482% | 100% | [33.482, 100] |

#### `validateLayout({ a: 35, b: 65 })`

**第一輪 — clamp：**

| Panel | unsafeSize | constraints | safeSize | remainingSize |
|-------|-----------|-------------|----------|---------------|
| A | 35 | min=44.643 | 44.643（被 minSize 拉上去） | 35-44.643 = -9.643 |
| B | 65 | [33.482, 100] | 65 | -9.643 |

remainingSize = -9.643（A 撐大了，需要從其他 panel 扣回）

**第二輪 — 重分配：**

| Panel | prevSize | unsafeSize | safeSize | 吸收？ |
|-------|---------|-----------|----------|-------|
| A | 44.643 | 44.643-9.643=35 | 44.643（被 minSize 擋回） | 不吸收 |
| B | 65 | 65-9.643=55.357 | 55.357 | 吸收 9.643 |

remainingSize = 0 → break

**結果：`{ a: 44.643, b: 55.357 }`**，加總 = 100%

> A 從 35% 被拉到 44.643%（200px 在 448px 容器下的等價值），B 從 65% 縮為 55.357%。

### 3-3. 情境 C：極端縮放 — 視窗 380px（minSize > maxSize 衝突）

**availableSize = 328px**

接續情境 B 的 layout `{ a: 44.643, b: 55.357 }`。

#### `_computeAllConstraints(328)`

| Panel | minSize % | maxSize % | 衝突？ |
|-------|-----------|-----------|-------|
| A | 200/328*100 = 60.976% | 50% | **minSize(60.976%) > maxSize(50%)** |
| B | 150/328*100 = 45.732% | 100% | 無 |

#### `validateLayout({ a: 44.643, b: 55.357 })`

**第一輪 — clamp：**

| Panel | unsafeSize | _validatePanelSize | safeSize | remainingSize |
|-------|-----------|-------------------|----------|---------------|
| A | 44.643 | max(44.643, 60.976)=60.976 → min(60.976, **50**)=50 | 50（maxSize 勝出） | 44.643-50 = -5.357 |
| B | 55.357 | max(55.357, 45.732)=55.357 → min(55.357, 100)=55.357 | 55.357 | -5.357 |

**第二輪 — 重分配：**

| Panel | prevSize | unsafeSize | safeSize | 吸收？ |
|-------|---------|-----------|----------|-------|
| A | 50 | 50-5.357=44.643 | max(44.643,60.976)=60.976 → min(60.976,50)=50 | 不吸收 |
| B | 55.357 | 55.357-5.357=50 | max(50,45.732)=50 → min(50,100)=50 | 吸收 5.357 |

remainingSize = 0 → break

**結果：`{ a: 50, b: 50 }`**，加總 = 100%

> A 的 minSize(60.976%) > maxSize(50%)，maxSize 勝出，A 鎖在 50%。
> 實際 A = 50% × 328px = 164px，低於配置的 minSize 200px。
> 這是設計取捨：約束衝突時 maxSize 永遠勝出，換取 validateLayout 與 adjustLayoutByDelta 的一致性。

### 3-4. resize 摘要

| 情境 | availableSize | A minSize% | 衝突？ | layout 結果 |
|------|-------------|-----------|-------|------------|
| 溫和 (900px) | 848px | 23.585% | 無 | { a: 35, b: 65 }（不變） |
| 收緊 (500px) | 448px | 44.643% | 無 | { a: 44.643, b: 55.357 } |
| 極端 (380px) | 328px | 60.976% | minSize>maxSize | { a: 50, b: 50 } |

---

## 流程總結

```
activate()
  │
  ├─ computeAllConstraints(1388px)
  │    A: [14.409%, 50%]  B: [10.806%, 100%]
  │
  ├─ calculateInitialLayout
  │    rawLayout { a:60, b:40 } → A 被 maxSize clamp → { a:50, b:50 }
  │
  ├─ 拖曳（往右）→ 無效（A 已在 maxSize）
  │
  ├─ 拖曳（往左 200px）
  │    adjustLayoutByDelta → { a:35.591, b:64.409 }
  │
  ├─ resize 900px → constraints 收緊但 layout 仍合法 → 不變
  │
  ├─ resize 500px → A 低於新 minSize → 拉回 { a:44.643, b:55.357 }
  │
  └─ resize 380px → minSize > maxSize 衝突 → maxSize 勝出 { a:50, b:50 }
```
