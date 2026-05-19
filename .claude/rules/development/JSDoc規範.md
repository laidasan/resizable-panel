# JSDoc 規範

## 適用範圍

- Public 函式與 Private 函式都需要撰寫 JSDoc

## 必要標籤

- `@description` — 函式功能說明，所有需要描述的函式都使用此標籤（不使用無標籤的開頭描述）
- `@param` — 參數型別與說明
- `@returns` — 回傳型別與說明
- `@example` — 使用範例，展示輸入與預期輸出

## 標籤順序

- Public 函式：`@param` → `@returns` → `@description` → `@example`
- Private 函式：`@private` → `@param` → `@returns` → `@description` → `@example`

## Private 函式

- 加上 `@private` 標籤
- `@private` 寫在 `@description` 之前

## Class 層級

- 使用 `@class` + `@classdesc` 描述模組職責
- 使用 `@param` 描述 constructor 參數
- 提供 class 層級的 `@example` 展示基本用法

## 資料結構

- 使用 `@typedef` 定義模組相關的資料結構（如 Layout、PanelData）
- typedef 放在檔案底部，與 class 定義分離
