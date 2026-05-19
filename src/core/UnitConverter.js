import { isEmpty, defaultTo, includes, difference, head, values } from 'ramda'
import { CssUnit } from './CssUnit.js'
import { isNumber, isString, isNotNumber } from '../tools/typer.js'

/**
 * @class UnitConverter
 * @classdesc 負責 CSS 單位的解析與百分比轉換，支援 %、px 單位
 * @example
 * const converter = new UnitConverter()
 * const parsed = converter.parse('200px')  // { value: 200, unit: 'px' }
 * const percent = converter.toPercent(parsed, 1000)  // 20
 */
export class UnitConverter {
  static SupportedUnitList = [CssUnit.Percent, CssUnit.Px]
  static UnSupportedUnitList = difference(values(CssUnit))(UnitConverter.SupportedUnitList)

  _unitRegexp = null
  _unSupportedUnitRegexp = null

  constructor() {
    const units = values(CssUnit).join('|')
    const unSupportedUnits = UnitConverter.UnSupportedUnitList.join('|')

    this._unitRegexp = new RegExp(`(${units})$`)
    this._unSupportedUnitRegexp = new RegExp(`(${unSupportedUnits})$`)
  }

  /**
   * @param {number|string} size - 尺寸值，支援數字、帶單位字串（如 '50%'、'200px'）或純數字字串
   * @returns {ParsedSize} 解析後的尺寸物件
   * @description 將原始尺寸值解析為 { value, unit } 結構。純數字或無單位字串視為百分比；NaN 轉為 0；不支援的單位拋出 Error
   * @example
   * converter.parse(50)       // { value: 50, unit: '%' }
   * converter.parse('200px')  // { value: 200, unit: 'px' }
   * converter.parse('abc')    // { value: 0, unit: '%' }
   * converter.parse('200em')  // throws Error
   */
  parse(size) {
    let result = {}

    if(isNumber(size)) {
      result = { value: size , unit: CssUnit.Percent }
    } else {
      const { isValid: isValidUnit, unit } = this._validateSizeUnit(size)

      if(isValidUnit) {
        const numeric = parseFloat(size)

        result = {
          value: isNotNumber(numeric) ? 0 : numeric,
          unit
        }
      } else {
         throw new Error(`Unsupported unit, Supported units: ${UnitConverter.SupportedUnitList.join(',')}`)
      }
    }

    return result
  }

  /**
   * @param {ParsedSize} parsedSize - parse() 回傳的解析結果
   * @param {number} availableSize - 容器可用空間（px）
   * @returns {number} 百分比值
   * @description 將 ParsedSize 轉換為百分比。百分比單位直接回傳 value；px 單位以 availableSize 換算；availableSize 為 0 時回傳 0。不做 clamp
   * @example
   * converter.toPercent({ value: 50, unit: '%' }, 1000)   // 50
   * converter.toPercent({ value: 200, unit: 'px' }, 1000) // 20
   * converter.toPercent({ value: 200, unit: 'px' }, 0)    // 0
   */
  toPercent(parsedSize, availableSize) {

    let result = 0

    if(parsedSize.unit === CssUnit.Percent) {
      result = parsedSize.value
    } else if(availableSize !== 0) {
      result = (parsedSize.value / availableSize) * 100
    }

    return result
  }

  /**
   * @private
   * @param {string} size - 帶單位的尺寸字串
   * @returns {{ isValid: boolean, unit: string }} isValid 表示單位是否支援，unit 為解析出的單位
   * @description 驗證字串中的 CSS 單位是否在支援清單內。無單位時預設為百分比
   * @example
   * converter._validateSizeUnit('200px')  // { isValid: true, unit: 'px' }
   * converter._validateSizeUnit('50em')   // { isValid: false, unit: 'em' }
   * converter._validateSizeUnit('50')     // { isValid: true, unit: '%' }
   */
  _validateSizeUnit(size) {
    const unitMatchs = defaultTo([])(size.match(this._unitRegexp))
    const unit = defaultTo(CssUnit.Percent)(head(unitMatchs))


    return {
      isValid: !includes(unit)(UnitConverter.UnSupportedUnitList),
      unit
    }
  }
}

/**
 * @typedef {Object} ParsedSize
 * @property {number} value - 解析出的數值
 * @property {string} unit - 單位（'%' 或 'px'）
 */
