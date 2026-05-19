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
  }

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
   * @type {function} _checkIsSupportedUnit
   * @param {string} size 
   * @returns {boolean}
   * @description 檢查是否為可支援的單位
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
