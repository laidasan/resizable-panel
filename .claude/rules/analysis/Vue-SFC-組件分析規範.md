# Vue SFC 組件分析規範

以 Vue SFC 分析原則為基礎，進行組件樹分析時遵循以下規範：

## 分析深度
- Mermaid Class Diagram 預設繪製 3 層
- 同時提供完整的遞迴元件樹狀結構供使用者參考
- 若需要展開更多層，由使用者決定

## 分析範圍
- 元件之間的父子 / 引用關係：必要
- mixin / composable：必要
- RemoteProxy 層架構：必要
- Store (Vuex/Pinia)：不納入
- 外部 service / API 呼叫：不納入

## Class Diagram 呈現粒度
- 完整列出每個元件的 props / data / computed / methods
- 以 Vue SFC 分析原則的 class 視角呈現：
  - props / data / computed → 屬性
  - methods → 方法
- 提供分析起點元件的「屬性與方法總表」，以 table 呈現，欄位包含：
  - 名稱、分類（props / data / computed / methods）、來源（定義的原始出處，非中間繼承路徑）
- 在總表下方提供一份單一 Class 的 ClassDiagram，列出該元件所有屬性與方法，不標來源、不加醒目標示

## 關係表示
- class / mixin 實作 interface → 實現（realization，`..|>`）
- interface 繼承 interface → 繼承（inheritance，`--|>`）
- class / mixin 繼承 class / mixin → 繼承（inheritance，`--|>`）
- components 引用 → 組合（composition），關係線不加 label
- emit 事件 → 不納入 Class Diagram

## Mermaid 繪製方向
- 使用 `direction TB` 時，關係描述統一以被繼承 / 被實作者寫在左側，確保 interface 渲染在上方
  - 範例：`InterfaceName <|.. ClassName`（interface 在上，class 在下）
  - 範例：`ParentInterface <|-- ChildInterface`（父 interface 在上）
