import { isEmpty, defaultTo, includes, difference, head, values } from 'ramda'
import { CssUnit } from './CssUnit.js'
import { isNumber, isString, isNotNumber } from '../tools/typer.js'

/**
 * @class UnitConverter
 * @classdesc 單位轉換器
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


    // if (typeof size === 'number') {
      // return { value: size, unit: 'percent' }
    // }

    // const numeric = parseFloat(size)
    // const value = Number.isNaN(numeric) ? 0 : numeric

    // if (size.endsWith('px')) {
    //   return { value, unit: 'px' }
    // }

    // const unsupported = this._getUnsupportedUnit(size)
    // if (unsupported) {
    //   throw new Error(`Unsupported unit "${unsupported}" in "${size}". Supported units: ${SUPPORTED_UNITS.join(', ')}`)
    // }

    // return { value, unit: 'percent' }
  }

  toPercent(parsedSize, availableSize) {

    let result = 0

    if(parsedSize.unit === CssUnit.Percent) {
      result = parsedSize.value
    } else if(availableSize !== 0) {
      result = (parsedSize.value / availableSize) * 100
    }

    return result


    // if (parsedSize.unit === 'percent') {
    //   return parsedSize.value
    // }

    // if (availableSize === 0) {
    //   return 0
    // }

    // return (parsedSize.value / availableSize) * 100
  }

  /**
   * @type {function} _checkIsSupportedUnit
   * @param {string} size 
   * @returns {boolean}
   * @description 檢查是否為可支援的單位
   */
  _validateSizeUnit(size) {
    const unitMatchs = defaultTo([])(size.match(this._unitRegexp))
    const unit = defaultTo(CssUnit.Percent)(head(unitMatchs))

    // const unSupportUnitMatchs = defaultTo([])(size.match(this._unSupportedUnitRegexp))

    return {
      isValid: !includes(unit)(UnitConverter.UnSupportedUnitList),
      unit
    }
  }

  // _getUnsupportedUnit(str) {
  //   const match = str.match(/(rem|em|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/)

  //   return match ? match[1] : null
  // }
}
