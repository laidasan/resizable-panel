import { keys, values, isNil, all, map, partition, fromPairs, sum } from 'ramda'

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
  static Percision = 3

  _unitConverter = null

  constructor(unitConverter) {
    this._unitConverter = unitConverter
  }

  /**
   * @description 驗證 layout 是否符合所有 panel 約束，不符合時自動修正。
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
   * @description 根據 panel 配置計算初始 layout。
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
    const { defaultSizePanels, nonDefaultPanelDataList } = this._partitionByDefaultSize(panels, availableSize)

    const rawLayout = this._allocateDefaultSizes(defaultSizePanels, nonDefaultPanelDataList)
    const normalizedLayout = this._normalizeLayout(rawLayout)

    return this._applyConstraints(normalizedLayout, panels)
  }


  /**
   * @private
   * @description 分配初始尺寸。有 defaultSize 的 panel 按指定百分比分配，
   * 無 defaultSize 的 panel 均分剩餘空間。
   *
   * 回傳的 layout 加總不保證為 100%（後續由 _normalizeLayout 處理）。
   *
   * @param {Array<{ panel: PanelData, percent: number }>} defaultSizePanels - 有 defaultSize 的 panel（已轉為百分比）
   * @param {PanelData[]} nonDefaultPanelDataList - 無 defaultSize 的 panel
   * @returns {Layout} 未 normalize 的初始 layout
   *
   * @example
   * // defaultSizePanels: [{ panel: panelA, percent: 70 }], nonDefaultPanelDataList: [panelB]
   * this._allocateDefaultSizes(defaultSizePanels, nonDefaultPanelDataList)
   * // => { a: 70, b: 30 }
   *
   * @example
   * // 全部無 defaultSize
   * this._allocateDefaultSizes([], [panelA, panelB])
   * // => { a: 50, b: 50 }
   */
  _allocateDefaultSizes(defaultSizePanels, nonDefaultPanelDataList) {
    const defaultSizePanelEntries = map(({ panel, percent }) => [panel.id, percent])(defaultSizePanels)
    const usedPercent = sum(map(({ percent }) => percent)(defaultSizePanels))

    const remaining = 100 - usedPercent
    const remaingEachPercent = nonDefaultPanelDataList.length > 0 ? remaining / nonDefaultPanelDataList.length : 0
    const remainingPanelEntries = map(panel => [panel.id, remaingEachPercent])(nonDefaultPanelDataList)

    return fromPairs([...defaultSizePanelEntries, ...remainingPanelEntries])
  }

  /**
   * @private
   * @description 將 layout 按比例縮放，使加總等於 100%。
   * 若加總已為 100%（含浮點容差）或為 0，則原樣回傳。
   *
   * @param {Layout} layout - 待 normalize 的 layout
   * @returns {Layout} 加總為 100% 的 layout
   *
   * @example
   * this._normalizeLayout({ a: 30, b: 40 })
   * // => { a: 42.857, b: 57.143 }  （按 30:40 比例 normalize）
   *
   * @example
   * // 已為 100% → 原樣回傳
   * this._normalizeLayout({ a: 60, b: 40 })
   * // => { a: 60, b: 40 }
   */
  _normalizeLayout(layout) {
    const total = values(layout).reduce((sum, v) => sum + v, 0)
    const needsNormalize = total !== 0 && this._formatNumber(total) !== 100

    return needsNormalize
      ? map(v => v * (100 / total))(layout)
      : layout
  }

  /**
   * @private
   * @description 將數值四捨五入到 Percision 位小數，用於浮點容差比較。
   *
   * @param {number} number - 待格式化的數值
   * @returns {number} 四捨五入後的數值
   *
   * @example
   * this._formatNumber(49.9999) // => 50
   * this._formatNumber(50.0004) // => 50
   * this._formatNumber(50.001)  // => 50.001
   */
  _formatNumber(number) {
    return parseFloat(number.toFixed(LayoutCalculator.Percision))
  }

  /**
   * @private
   * @description 套用 min/max 約束並確保加總為 100%。
   *
   * 流程：
   * 1. 每個 panel 先 clamp 到自身 min/max 範圍
   * 2. 若 clamp 後加總 ≠ 100%，透過 _redistributeOverflow 重分配溢出量
   *
   * @param {Layout} layout - 待套用約束的 layout
   * @param {PanelData[]} panels - panel 資料陣列，順序依 DOM 位置
   * @returns {Layout} 符合約束且加總為 100% 的 layout
   *
   * @example
   * // panel a minSize=40，layout 中 a=30 違規
   * this._applyConstraints({ a: 30, b: 70 }, panels)
   * // => { a: 40, b: 60 }
   */
  _applyConstraints(layout, panels) {
    const clampedEntries = map(panel => [
      panel.id,
      this._clampValue(layout[panel.id], panel.constraints.minSize, panel.constraints.maxSize)
    ])(panels)
    const result = fromPairs(clampedEntries)

    const overflowSize = sum(values(result)) - 100

    return this._formatNumber(overflowSize) !== 0
      ? this._redistributeOverflow(result, panels, overflowSize)
      : result
  }

  /**
   * @private
   * @description 將數值限制在 [min, max] 範圍內。
   *
   * @param {number} value - 待限制的數值
   * @param {number} min - 下限
   * @param {number} max - 上限
   * @returns {number} 限制後的數值
   *
   * @example
   * this._clampValue(120, 0, 100) // => 100
   * this._clampValue(-5, 0, 100)  // => 0
   * this._clampValue(50, 0, 100)  // => 50
   */
  _clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  /**
   * @description 基於 baseLayout + delta 計算新 layout，只調整 boundaryIndex 相鄰的兩個 panel。
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

    const leftClamped = this._clampValue(leftBase + delta, leftPanel.constraints.minSize, leftPanel.constraints.maxSize)
    const rightClamped = this._clampValue(rightBase - delta, rightPanel.constraints.minSize, rightPanel.constraints.maxSize)

    const leftDelta = leftClamped - leftBase
    const rightDelta = rightClamped - rightBase

    const canApply = leftDelta !== 0 || rightDelta !== 0
    const actualDelta = Math.abs(leftDelta) <= Math.abs(rightDelta)
      ? leftDelta
      : -rightDelta

    const candidate = { ...baseLayout }
    candidate[leftId] = leftBase + actualDelta
    candidate[rightId] = rightBase - actualDelta

    const hasChanged = canApply && !this.layoutsEqual(candidate, baseLayout)
    const result = hasChanged ? candidate : baseLayout

    return result
  }

  /**
   * @description 比較兩個 layout 是否相等，使用 toFixed(3) 浮點容差。
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

    const sameLength = keysA.length === keysB.length
    const allValuesEqual = all(id =>
      !isNil(b[id]) && this._formatNumber(a[id]) === this._formatNumber(b[id])
    )(keysA)

    const result = sameLength && allValuesEqual

    return result
  }

  /**
   * @private
   * @description 將 panels 依據是否有 defaultSize 分為兩組。
   * 有 defaultSize 的 panel 會透過 UnitConverter 將原始值轉為百分比。
   *
   * @param {PanelData[]} panels - panel 資料陣列
   * @param {number} availableSize - 容器可用尺寸（px），用於 px → % 轉換
   * @returns {{ defaultSizePanels: Array<{ panel: PanelData, percent: number }>, nonDefaultPanelDataList: PanelData[] }}
   *
   * @example
   * // panelA.config.defaultSize = '200px', panelB.config.defaultSize = undefined
   * this._partitionByDefaultSize([panelA, panelB], 1000)
   * // => {
   * //   defaultSizePanels: [{ panel: panelA, percent: 20 }],
   * //   nonDefaultPanelDataList: [panelB]
   * // }
   */
  _partitionByDefaultSize(panels, availableSize) {
    const hasDefaultSize = panel => !isNil(panel.config.defaultSize)
    const toPercentEntry = panel => {
      const parsed = this._unitConverter.parse(panel.config.defaultSize)
      const percent = this._unitConverter.toPercent(parsed, availableSize)

      return { panel, percent }
    }

    const [withDefaultRaw, nonDefaultPanelDataList] = partition(hasDefaultSize)(panels)
    const defaultSizePanels = map(toPercentEntry)(withDefaultRaw)

    return { defaultSizePanels, nonDefaultPanelDataList }
  }


  /**
   * @private
   * @description 將 clamp 後的溢出量重分配給可調整的 panel。
   * overflowSize > 0 時縮減 panel，overflow < 0 時擴增 panel。
   *
   * @param {Layout} layout - clamp 後的 layout（加總 ≠ 100%）
   * @param {PanelData[]} panels - panel 資料陣列，順序依 DOM 位置
   * @param {number} overflowSize - 溢出量（正值 = 需縮減，負值 = 需擴增）
   * @returns {Layout} 重分配後的新 layout（加總 = 100%）
   */
  _redistributeOverflow(layout, panels, overflowSize) {
    const result = overflowSize > 0
      ? this._shrinkPanels(layout, panels, overflowSize)
      : this._growPanels(layout, panels, -overflowSize)

    return result
  }

  /**
   * @private
   * @description 從後往前縮減 panel 尺寸以消化溢出量。
   *
   * 兩輪處理：
   * 1. 第一輪：只扣除各 panel 在 minSize 以上的可縮減量（respect 約束）
   * 2. 第二輪：若仍有溢出，強制扣除（突破 minSize，DOM 順序前面的優先保留）
   *
   * @param {Layout} layout - 需要縮減的 layout
   * @param {PanelData[]} panels - panel 資料陣列，順序依 DOM 位置
   * @param {number} overflowSize - 需縮減的總量（正值）
   * @returns {Layout} 縮減後的新 layout
   *
   * @example
   * // panel a=60(min=40), panel b=60(min=60), overflowSize=20
   * this._shrinkPanels({ a: 60, b: 60 }, panels, 20)
   * // => { a: 40, b: 60 }  （a 有 20 的可縮減量，優先從後往前但 b 不可縮所以扣 a）
   */
  _shrinkPanels(layout, panels, overflowSize) {
    const result = { ...layout }
    let remaining = overflowSize

    for (let i = panels.length - 1; i >= 0 && this._formatNumber(remaining) !== 0; i--) {
      const panel = panels[i]
      const currentSize = result[panel.id]
      const canShrink = currentSize - panel.constraints.minSize
      const shrink = Math.min(remaining, canShrink)

      result[panel.id] = currentSize - shrink
      remaining -= shrink
    }

    for (let i = panels.length - 1; i >= 0 && this._formatNumber(remaining) !== 0; i--) {
      const panel = panels[i]
      const currentSize = result[panel.id]
      const shrink = Math.min(remaining, currentSize)

      result[panel.id] = currentSize - shrink
      remaining -= shrink
    }

    return result
  }

  /**
   * @private
   * @description 從後往前擴增 panel 尺寸以填補不足量。
   * 每個 panel 最多擴增到自身 maxSize。
   *
   * @param {Layout} layout - 需要擴增的 layout
   * @param {PanelData[]} panels - panel 資料陣列，順序依 DOM 位置
   * @param {number} deficit - 需擴增的總量（正值）
   * @returns {Layout} 擴增後的新 layout
   *
   * @example
   * // panel a=30(max=100), panel b=30(max=50), deficit=40
   * this._growPanels({ a: 30, b: 30 }, panels, 40)
   * // => { a: 50, b: 50 }  （b 先吸收 20 到 max，a 再吸收 20）
   */
  _growPanels(layout, panels, deficit) {
    const result = { ...layout }
    let remaining = deficit

    for (let i = panels.length - 1; i >= 0 && this._formatNumber(remaining) !== 0; i--) {
      const panel = panels[i]
      const currentSize = result[panel.id]
      const canGrow = panel.constraints.maxSize - currentSize
      const grow = Math.min(remaining, canGrow)

      result[panel.id] = currentSize + grow
      remaining -= grow
    }

    return result
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
