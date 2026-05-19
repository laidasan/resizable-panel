# 架構決策記錄

> 記錄設計過程中的重要決策，包含背景、選項分析與最終決定。

---

## 001 — ResizeObserver 觀察範圍：只觀察 Group 容器

**日期**：2026-05-19

**背景**：

ResizeObserver 需要偵測容器尺寸變化以觸發 layout 重算。需決定觀察範圍是「Group 容器」還是「Group 容器 + 個別 Panel」。

**react-resizable-panels 的做法**：

觀察兩種對象：
1. **Group 容器** — 容器尺寸變化時重算約束（px → % 換算會變）→ 重算 layout → 觸發 change 事件
2. **有註冊 `onResize` callback 的個別 Panel** — 通知 Panel 其實際渲染尺寸（像素值 + 百分比），用途是讓 Panel 能拿到自己的實際像素尺寸

**決定**：v1 只觀察 Group 容器。

**理由**：

- Panel 尺寸由 Manager 透過百分比控制（CSS `flex-basis` 或 `width`），Panel 尺寸變化只會因為兩件事發生：
  1. Group 容器尺寸變化（已觀察）
  2. Manager 主動重算 layout（Manager 自己觸發，不需要 ResizeObserver）
- 不會出現「Panel 尺寸變了但 Group 沒變、Manager 也沒動」的情況
- v1 的 Panel 是純渲染層，只接收 Manager 算好的百分比，不需要知道自己的像素尺寸
- 使用者從外部直接操作 Panel CSS（DevTools、外部程式碼）不在設計契約內

**排除的例外情境**：

- 外部程式碼直接修改 Panel 的 style — 不屬於元件庫的使用契約，不處理

**未來擴展**：

- 若 v2 需要 Panel 層級的 `onResize` callback（讓 Panel 取得實際像素尺寸），可擴展 ResizeObserver 觀察個別 Panel，不影響現有架構
