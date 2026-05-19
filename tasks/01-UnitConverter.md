# Task 01: UnitConverter

> 狀態：pending
> 依賴：無
> 對應 SA 章節：Class Diagram — UnitConverter、資料結構 — ParsedSize

---

## 模組描述

純 JS class，負責尺寸單位的解析與轉換。將使用者傳入的各種格式（數字、字串百分比、字串 px）解析為統一的 ParsedSize 結構，並提供轉換為百分比的能力。

### Public API

| 方法 | 簽章 | 說明 |
|------|------|------|
| parse | `(size: number \| string) → ParsedSize` | 解析尺寸值為 `{ value, unit }` |
| toPercent | `(parsedSize: ParsedSize, availableSize: number) → number` | 將 ParsedSize 轉換為百分比（0-100） |

### 資料結構

```js
// ParsedSize
{ value: number, unit: 'percent' | 'px' }
```

---

## 驗收條件

- 所有解析規則正確處理（Spec §4.2）
- px → % 轉換正確
- 邊界情況與異常輸入有適當處理

---

## TODO

- [ ] **parse — 百分比解析**
  - 純數字 `50` → `{ value: 50, unit: 'percent' }`
  - 字串數字 `"50"` → `{ value: 50, unit: 'percent' }`
  - 帶 % 字串 `"50%"` → `{ value: 50, unit: 'percent' }`
- [ ] **parse — px 解析**
  - `"200px"` → `{ value: 200, unit: 'px' }`
- [ ] **parse — 邊界/異常輸入**
  - `0`、`"0"`、`"0%"`、`"0px"` 正確處理
  - 小數值 `"33.33%"`、`"150.5px"` 正確處理
  - 無效輸入（負數、非數字字串、不支援的單位）拋出錯誤或有明確行為
- [ ] **toPercent — 百分比輸入**
  - `{ value: 50, unit: 'percent' }` → 直接回傳 50
- [ ] **toPercent — px 輸入**
  - `{ value: 200, unit: 'px' }`, availableSize=1000 → 20
  - `{ value: 200, unit: 'px' }`, availableSize=500 → 40
- [ ] **toPercent — 邊界情況**
  - availableSize=0 時的處理策略
  - 轉換結果超出 0-100 範圍時的處理策略
