import { isNil } from 'ramda'
import { isFunction } from '../tools/typer'

const CoarsePointer = '(pointer: coarse)'

/**
 * @class HitRegionDetector
 * @classdesc 判斷指標座標是否落在兩個 panel 的邊界命中區域內，支援粗指標（觸控）與細指標（滑鼠）
 * @param {ResizeTargetMinimumSize} [resizeTargetMinimumSize={ coarse: 20, fine: 10 }] - 命中區域大小（px）
 * @example
 * const detector = new HitRegionDetector()
 * const result = detector.detect(200, 50, panels)
 * // { hit: true, boundaryIndex: 0 }
 */
export class HitRegionDetector {
  static DefaultResizeTargetMinimumSize = { coarse: 20, fine: 10 }

  _resizeTargetMinimumSize = null
  _isCoarse = false

  constructor(resizeTargetMinimumSize) {
    this._resizeTargetMinimumSize = isNil(resizeTargetMinimumSize)
      ? HitRegionDetector.DefaultResizeTargetMinimumSize
      : resizeTargetMinimumSize

    this._isCoarse = this._detectCoarsePointer()
  }

  /**
   * @param {number} pointerX - 指標 X 座標
   * @param {number} pointerY - 指標 Y 座標
   * @param {PanelData[]} panels - panel 資料陣列
   * @returns {HitResult} 命中判定結果
   * @description 判斷指標座標是否落在邊界 ± margin 範圍內。 只有兩個 panel 時，邊界為 panels[0] 的右邊緣，只比對 X 座標
   * @example
   * detector.detect(200, 50, panels) // { hit: true, boundaryIndex: 0 }
   * detector.detect(100, 50, panels) // { hit: false, boundaryIndex: null }
   */
  detect(pointerX, pointerY, panels) {
    const boundaryX = this._calculateBoundaryX(panels)
    const margin = this.getMargin()
    const isHit = Math.abs(pointerX - boundaryX) <= margin

    const result = isHit
      ? { hit: true, boundaryIndex: 0 }
      : { hit: false, boundaryIndex: null }

    return result
  }

  /**
   * @returns {number} 當前指標類型對應的命中區域 margin（px）
   * @description 根據指標類型回傳對應的 margin 值，粗指標回傳 coarse，細指標回傳 fine
   * @example
   * detector.getMargin() // 10 (fine pointer)
   */
  getMargin() {
    return this._isCoarse
      ? this._resizeTargetMinimumSize.coarse
      : this._resizeTargetMinimumSize.fine
  }

  /**
   * @returns {boolean} 是否為粗指標（觸控設備）
   * @description 回傳建構時偵測的指標類型結果
   * @example
   * detector.isCoarsePointer() // false
   */
  isCoarsePointer() {
    return this._isCoarse
  }

  /**
   * @private
   * @returns {boolean} 是否為粗指標
   * @description 使用 matchMedia('(pointer: coarse)') 偵測，matchMedia 不可用時 fallback 為 false（fine）
   */
  _detectCoarsePointer() {
    const isMatchMediaAvailable = isFunction(window.matchMedia)

    return isMatchMediaAvailable
      ? window.matchMedia(CoarsePointer).matches
      : false
  }

  /**
   * @private
   * @param {PanelData[]} panels - panel 資料陣列
   * @returns {number} 邊界 X 座標
   * @description 從第一個 panel 的右邊緣取得邊界 X 座標
   */
  _calculateBoundaryX(panels) {
    return panels[0].element.getBoundingClientRect().right
  }
}

/**
 * @typedef {Object} ResizeTargetMinimumSize
 * @property {number} coarse - 粗指標（觸控）的命中區域大小（px）
 * @property {number} fine - 細指標（滑鼠）的命中區域大小（px）
 */

/**
 * @typedef {Object} HitResult
 * @property {boolean} hit - 是否命中邊界區域
 * @property {number|null} boundaryIndex - 命中的邊界索引，未命中時為 null
 */
