import { keys, values, isNil } from 'ramda'

/**
 * @class LayoutCalculator
 * @classdesc Layout 數學計算模組。負責初始 layout 分配、拖曳 delta 調整、約束驗證、layout 相等比較。
 *
 * 約束衝突解決策略：按 DOM 順序（panels 陣列順序）優先滿足前面的 panel，
 * 後面的 panel 承擔剩餘空間，即使無法滿足自身約束。
 *
 * 浮點容差策略：以 toFixed(3) 四捨五入後比較，避免計算過程中的微小誤差導致誤判。
 *
 * @param {import('./UnitConverter.js').UnitConverter} unitConverter - 單位轉換器實例
 *
 * @example
 * const calculator = new LayoutCalculator(new UnitConverter())
 *
 * const panels = [
 *   { id: 'main', config: { defaultSize: '70%' }, constraints: { minSize: 30, maxSize: 100 } },
 *   { id: 'side', config: { defaultSize: '30%' }, constraints: { minSize: 0, maxSize: 100 } }
 * ]
 *
 * const layout = calculator.calculateInitialLayout(panels, 1000)
 * // => { main: 70, side: 30 }
 */
export class LayoutCalculator {
  static PRECISION = 3

  _unitConverter = null

  constructor(unitConverter) {
    this._unitConverter = unitConverter
  }

  /**
   * 根據 panel 配置計算初始 layout。
   *
   * 流程：
   * 1. 有 defaultSize 的 panel 按指定值分配（px 透過 UnitConverter 轉為百分比）
   * 2. 無 defaultSize 的 panel 均分剩餘空間；若全無 defaultSize 則均分 100%
   * 3. 加總 ≠ 100% 時按比例 normalize
   * 4. 套用 min/max 約束（DOM 順序優先）
   *
   * @param {PanelData[]} panels - panel 資料陣列，順序依 DOM 位置
   * @param {number} availableSize - 容器可用尺寸（px），用於 px 單位轉換
   * @returns {Layout} 初始 layout，所有值加總 = 100
   *
   * @example
   * // 均分
   * calculator.calculateInitialLayout([panelA, panelB], 1000)
   * // => { a: 50, b: 50 }
   *
   * @example
   * // 有 defaultSize + normalize
   * // panelA.config.defaultSize = '30%', panelB.config.defaultSize = '40%'
   * calculator.calculateInitialLayout([panelA, panelB], 1000)
   * // => { a: 42.857, b: 57.143 }  （30:40 比例 normalize 到 100%）
   *
   * @example
   * // 混合：panelA 有 defaultSize '70%'，panelB 無
   * calculator.calculateInitialLayout([panelA, panelB], 1000)
   * // => { a: 70, b: 30 }
   *
   * @example
   * // px 單位：panelA.config.defaultSize = '200px'，容器 1000px
   * calculator.calculateInitialLayout([panelA, panelB], 1000)
   * // => { a: 20, b: 80 }
   */
  calculateInitialLayout(panels, availableSize) {
    const { withDefault, withoutDefault } = this._partitionByDefaultSize(panels, availableSize)

    let layout = this._allocateDefaultSizes(withDefault, withoutDefault)
    layout = this._normalizeLayout(layout)
    layout = this._applyConstraints(layout, panels)

    return layout
  }

  /**
   * 基於 baseLayout + delta 計算新 layout，只調整 boundaryIndex 相鄰的兩個 panel。
   *
   * delta 始終以 baseLayout 為基準（非累計式），避免浮點誤差漂移。
   * 兩側 panel 同時受 min/max 約束，取較小的可用 delta。
   * 無法套用任何 delta 時回傳 baseLayout（全有或全無）。
   *
   * @param {Layout} baseLayout - 拖曳開始時的 layout 快照
   * @param {number} delta - 百分比偏移量。正值 = 左側增大/右側縮小，負值 = 反向
   * @param {number} boundaryIndex - 拖曳的邊界索引。調整 panels[boundaryIndex] 與 panels[boundaryIndex + 1]
   * @param {PanelData[]} panels - panel 資料陣列，順序依 DOM 位置
   * @returns {Layout} 調整後的 layout（加總 = 100），或無法套用時回傳 baseLayout
   *
   * @example
   * // 基本正 delta
   * calculator.adjustLayoutByDelta({ a: 50, b: 50 }, 10, 0, panels)
   * // => { a: 60, b: 40 }
   *
   * @example
   * // 碰到約束 clamp：panelB.constraints.minSize = 30
   * calculator.adjustLayoutByDelta({ a: 50, b: 50 }, 30, 0, panels)
   * // => { a: 70, b: 30 }
   *
   * @example
   * // 無法套用（兩側都已在極限）
   * calculator.adjustLayoutByDelta({ a: 50, b: 50 }, 10, 0, panels)
   * // => { a: 50, b: 50 }  （回傳 baseLayout）
   *
   * @example
   * // 3 panels, boundaryIndex=1 → 只調整 panel[1] 和 panel[2]
   * calculator.adjustLayoutByDelta({ a: 33, b: 34, c: 33 }, 10, 1, panels)
   * // => { a: 33, b: 44, c: 23 }
   */
  adjustLayoutByDelta(baseLayout, delta, boundaryIndex, panels) {
    const leftPanel = panels[boundaryIndex]
    const rightPanel = panels[boundaryIndex + 1]
    const leftId = leftPanel.id
    const rightId = rightPanel.id

    const leftBase = baseLayout[leftId]
    const rightBase = baseLayout[rightId]

    let leftNew = leftBase + delta
    let rightNew = rightBase - delta

    leftNew = this._clampValue(leftNew, leftPanel.constraints.minSize, leftPanel.constraints.maxSize)
    rightNew = this._clampValue(rightNew, rightPanel.constraints.minSize, rightPanel.constraints.maxSize)

    const leftDelta = leftNew - leftBase
    const rightDelta = rightNew - rightBase

    if (leftDelta === 0 && rightDelta === 0) {
      return baseLayout
    }

    const actualDelta = Math.abs(leftDelta) <= Math.abs(rightDelta)
      ? leftDelta
      : -rightDelta

    const result = { ...baseLayout }
    result[leftId] = leftBase + actualDelta
    result[rightId] = rightBase - actualDelta

    if (this.layoutsEqual(result, baseLayout)) {
      return baseLayout
    }

    return result
  }

  /**
   * 驗證 layout 是否符合所有 panel 約束，不符合時自動修正。
   *
   * 適用場景：容器 resize 後 px 約束的百分比等價值改變，既有 layout 可能違規。
   * 永遠回傳合法 Layout（best-effort clamp），不 throw、不回傳 null。
   *
   * @param {Layout} layout - 待驗證的 layout
   * @param {PanelData[]} panels - panel 資料陣列，順序依 DOM 位置
   * @returns {Layout} 合法的 layout（加總 = 100）。若原本合法則值不變
   *
   * @example
   * // 合法 → 原樣回傳
   * calculator.validateLayout({ a: 50, b: 50 }, panels)
   * // => { a: 50, b: 50 }
   *
   * @example
   * // panel a minSize=40，layout 中 a=30 違規 → clamp 並重分配
   * calculator.validateLayout({ a: 30, b: 70 }, panels)
   * // => { a: 40, b: 60 }
   *
   * @example
   * // 衝突：兩個 panel minSize=60（加總 120%）→ DOM 順序前面的優先
   * calculator.validateLayout({ a: 50, b: 50 }, panels)
   * // => { a: 60, b: 40 }
   */
  validateLayout(layout, panels) {
    return this._applyConstraints(layout, panels)
  }

  /**
   * 比較兩個 layout 是否相等，使用 toFixed(3) 浮點容差。
   *
   * 比較邏輯：每個值先 toFixed(3) 再 parseFloat，然後以 === 比較。
   * 例如 49.9999 和 50.0001 四捨五入後都是 50.000，判定相等。
   *
   * @param {Layout} a - layout A
   * @param {Layout} b - layout B
   * @returns {boolean} 兩個 layout 是否相等
   *
   * @example
   * calculator.layoutsEqual({ a: 50, b: 50 }, { a: 50, b: 50 })
   * // => true
   *
   * @example
   * // 浮點微差 → true
   * calculator.layoutsEqual({ a: 49.9999, b: 50.0001 }, { a: 50, b: 50 })
   * // => true
   *
   * @example
   * // 小數第三位差異 → false
   * calculator.layoutsEqual({ a: 49.999, b: 50.001 }, { a: 50, b: 50 })
   * // => false
   *
   * @example
   * // key 不同 → false
   * calculator.layoutsEqual({ a: 50, b: 50 }, { c: 50, d: 50 })
   * // => false
   */
  layoutsEqual(a, b) {
    const keysA = keys(a)
    const keysB = keys(b)

    if (keysA.length !== keysB.length) {
      return false
    }

    for (const id of keysA) {
      if (isNil(b[id]) || this._formatNumber(a[id]) !== this._formatNumber(b[id])) {
        return false
      }
    }

    return true
  }

  _formatNumber(number) {
    return parseFloat(number.toFixed(LayoutCalculator.PRECISION))
  }

  _partitionByDefaultSize(panels, availableSize) {
    const withDefault = []
    const withoutDefault = []

    for (const panel of panels) {
      const rawDefault = panel.config.defaultSize

      if (isNil(rawDefault)) {
        withoutDefault.push(panel)
      } else {
        const parsed = this._unitConverter.parse(rawDefault)
        const percent = this._unitConverter.toPercent(parsed, availableSize)
        withDefault.push({ panel, percent })
      }
    }

    return { withDefault, withoutDefault }
  }

  _allocateDefaultSizes(withDefault, withoutDefault) {
    const result = {}
    let usedPercent = 0

    for (const { panel, percent } of withDefault) {
      result[panel.id] = percent
      usedPercent += percent
    }

    const remaining = 100 - usedPercent
    const count = withoutDefault.length

    if (count > 0) {
      const each = remaining / count
      for (const panel of withoutDefault) {
        result[panel.id] = each
      }
    }

    return result
  }

  _normalizeLayout(layout) {
    const total = values(layout).reduce((sum, v) => sum + v, 0)

    if (total === 0 || this._formatNumber(total) === 100) {
      return layout
    }

    const ratio = 100 / total
    const result = {}

    for (const id of keys(layout)) {
      result[id] = layout[id] * ratio
    }

    return result
  }

  _applyConstraints(layout, panels) {
    const result = {}

    for (const panel of panels) {
      result[panel.id] = this._clampValue(
        layout[panel.id],
        panel.constraints.minSize,
        panel.constraints.maxSize
      )
    }

    let total = values(result).reduce((sum, v) => sum + v, 0)
    let overflow = total - 100

    if (this._formatNumber(overflow) === 0) {
      return result
    }

    if (overflow > 0) {
      for (let i = panels.length - 1; i >= 0 && this._formatNumber(overflow) !== 0; i--) {
        const panel = panels[i]
        const currentSize = result[panel.id]
        const canShrink = currentSize - panel.constraints.minSize
        const shrink = Math.min(overflow, canShrink)

        result[panel.id] = currentSize - shrink
        overflow -= shrink
      }

      for (let i = panels.length - 1; i >= 0 && this._formatNumber(overflow) !== 0; i--) {
        const panel = panels[i]
        const currentSize = result[panel.id]
        const shrink = Math.min(overflow, currentSize)

        result[panel.id] = currentSize - shrink
        overflow -= shrink
      }
    } else {
      for (let i = panels.length - 1; i >= 0 && this._formatNumber(overflow) !== 0; i--) {
        const panel = panels[i]
        const currentSize = result[panel.id]
        const canGrow = panel.constraints.maxSize - currentSize
        const grow = Math.min(-overflow, canGrow)

        result[panel.id] = currentSize + grow
        overflow += grow
      }
    }

    return result
  }

  _clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }
}




/**
 * @typedef {Object} PanelConstraints
 * @property {number} minSize - 最小尺寸（百分比 0-100）
 * @property {number} maxSize - 最大尺寸（百分比 0-100）
 */

/**
 * @typedef {Object} PanelConfig
 * @property {string} id - panel 唯一識別
 * @property {HTMLElement} element - panel DOM 參照
 * @property {number|string} [defaultSize] - 初始尺寸，如 50 / "50%" / "200px"
 * @property {number|string} [minSize="0%"] - 最小尺寸
 * @property {number|string} [maxSize="100%"] - 最大尺寸
 * @property {boolean} [disabled=false] - 是否停用
 */

/**
 * @typedef {Object} PanelData
 * @property {string} id - panel 唯一識別
 * @property {HTMLElement} element - panel DOM 參照
 * @property {PanelConfig} config - 原始配置（保留使用者傳入的原始值）
 * @property {PanelConstraints} constraints - 衍生百分比約束
 */

/**
 * @typedef {Object.<string, number>} Layout
 * key 為 panelId，value 為百分比（0-100），所有值加總 = 100。
 *
 * @example
 * { main: 70, side: 30 }
 */
