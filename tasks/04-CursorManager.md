# Task 04: CursorManager

> 狀態：done
> 依賴：無
> 對應 SA 章節：Class Diagram — CursorManager、資料結構 — CursorState / ConstraintDirection、Spec §6

---

## 模組描述

純 JS class，負責拖曳期間的全域游標樣式管理。狀態切換（idle / hover / drag / disabled）時，在 document.body 上設定對應的 cursor 與 user-select 樣式。

### Public API

| 方法 | 簽章 | 說明 |
|------|------|------|
| setHover | `() → void` | 進入 hover 狀態，設定 `col-resize` cursor |
| setDrag | `(constraintDirection: ConstraintDirection) → void` | 進入 drag 狀態，根據約束方向設定 cursor |
| setDisabled | `() → void` | 進入 disabled 狀態，設定 `not-allowed` cursor |
| reset | `() → void` | 回到 idle 狀態，移除所有樣式 |

### 相關資料結構

```js
// CursorState
{ state: 'idle' | 'hover' | 'drag' | 'disabled', constraintDirection: ConstraintDirection }

// ConstraintDirection
'none' | 'start' | 'end'

// Cursor 映射
// idle       → 不設定
// hover      → col-resize
// drag+none  → col-resize
// drag+start → e-resize
// drag+end   → w-resize
// disabled   → not-allowed
```

---

## 驗收條件

- 各狀態切換正確設定 document.body 的 cursor 樣式
- drag 狀態時設定 `user-select: none`，reset 時移除
- cursor 映射與 SA 定義一致（Spec §6.2）

---

## TODO

### 狀態切換與 cursor 設定

- [x] **setHover** — body.style.cursor = 'col-resize'
- [x] **setDrag('none')** — body.style.cursor = 'col-resize'
- [x] **setDrag('start')** — body.style.cursor = 'e-resize'
- [x] **setDrag('end')** — body.style.cursor = 'w-resize'
- [x] **setDisabled** — body.style.cursor = 'not-allowed'
- [x] **reset** — 移除 cursor 設定，回到 idle

### user-select 控制

- [x] **drag 進入** — body.style.userSelect = 'none'（禁止文字選取）
- [x] **reset** — 移除 userSelect 設定

### 內部狀態管理

- [x] **CursorState 追蹤** — 內部正確維護 state 與 constraintDirection
- [x] **重複呼叫** — 同狀態重複呼叫不產生副作用
- [x] **樣式還原** — reset 時完整還原所有 body 樣式修改，不遺漏
