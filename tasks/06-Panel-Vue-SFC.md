# Task 06: Panel Vue SFC

> 狀態：pending
> 依賴：Task 05 — ResizableGroupManager
> 對應 SA 章節：Class Diagram — Panel、Spec §1

---

## 模組描述

薄膠水層 Vue SFC（Options API），負責向 Manager 註冊自身、透過 callback 接收 layout 變化並更新渲染。Panel 不持有約束邏輯，純粹接收 Manager 算好的百分比並設定 CSS。

### 元件結構

```js
// Props
panelId: string

// Data
size: number         // 從 callback 接收的百分比值

// Computed
outerStyle: object   // 根據 size 產生 flex 相關 CSS
```

### DOM 結構

雙層 div：
- 外層 div — flex 佈局控制（由 Manager 控制尺寸）
- 內層 div — 使用者內容區域（slot），內建 overflow 處理

---

## 驗收條件

- callback 接收 layout 變化後，data.size 更新 → Vue 重新渲染
- outerStyle computed 正確產生 CSS
- 雙層 div 結構符合 Spec §1
- Options API 撰寫，不使用 Composition API

---

## TODO

- [ ] **元件結構** — 雙層 div + slot，外層受控、內層自訂
- [ ] **props 定義** — panelId (string, required)
- [ ] **data** — size 初始值
- [ ] **computed — outerStyle** — 根據 size 產生 flex CSS 樣式
- [ ] **callback 接收** — Manager 的 LayoutChange callback 更新 data.size
- [ ] **overflow 處理** — 內層 div 的 overflow 樣式
