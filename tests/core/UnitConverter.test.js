import { describe, it, expect, beforeEach } from 'vitest'
import { UnitConverter } from '../../src/core/UnitConverter.js'

describe('UnitConverter', () => {
  let converter

  beforeEach(() => {
    converter = new UnitConverter()
  })

  describe('parse', () => {
    describe('百分比解析', () => {
      it('parse_Should_ReturnPercent_When_InputIsNumber', () => {
        expect(converter.parse(50)).toEqual({ value: 50, unit: '%' })
      })

      it('parse_Should_ReturnPercent_When_InputIsNumericString', () => {
        expect(converter.parse('50')).toEqual({ value: 50, unit: '%' })
      })

      it('parse_Should_ReturnPercent_When_InputHasPercentSuffix', () => {
        expect(converter.parse('50%')).toEqual({ value: 50, unit: '%' })
      })
    })

    describe('px 解析', () => {
      it('parse_Should_ReturnPx_When_InputHasPxSuffix', () => {
        expect(converter.parse('200px')).toEqual({ value: 200, unit: 'px' })
      })
    })

    describe('邊界與異常輸入', () => {
      it('parse_Should_ReturnZeroPercent_When_InputIsZero', () => {
        expect(converter.parse(0)).toEqual({ value: 0, unit: '%' })
      })

      it('parse_Should_ReturnZeroPercent_When_InputIsZeroString', () => {
        expect(converter.parse('0')).toEqual({ value: 0, unit: '%' })
      })

      it('parse_Should_ReturnZeroPercent_When_InputIsZeroPercentString', () => {
        expect(converter.parse('0%')).toEqual({ value: 0, unit: '%' })
      })

      it('parse_Should_ReturnZeroPx_When_InputIsZeroPxString', () => {
        expect(converter.parse('0px')).toEqual({ value: 0, unit: 'px' })
      })

      it('parse_Should_ReturnDecimalPercent_When_InputIsDecimalPercentString', () => {
        expect(converter.parse('33.33%')).toEqual({ value: 33.33, unit: '%' })
      })

      it('parse_Should_ReturnDecimalPx_When_InputIsDecimalPxString', () => {
        expect(converter.parse('150.5px')).toEqual({ value: 150.5, unit: 'px' })
      })

      it('parse_Should_ReturnNegativePercent_When_InputIsNegativeNumber', () => {
        expect(converter.parse(-10)).toEqual({ value: -10, unit: '%' })
      })

      it('parse_Should_ReturnNegativePercent_When_InputIsNegativePercentString', () => {
        expect(converter.parse('-5%')).toEqual({ value: -5, unit: '%' })
      })

      it('parse_Should_ReturnNegativePx_When_InputIsNegativePxString', () => {
        expect(converter.parse('-100px')).toEqual({ value: -100, unit: 'px' })
      })

      it('parse_Should_ReturnZeroPercent_When_InputIsNonNumericString', () => {
        expect(converter.parse('abc')).toEqual({ value: 0, unit: '%' })
      })

      it('parse_Should_ReturnZeroPercent_When_InputIsEmptyString', () => {
        expect(converter.parse('')).toEqual({ value: 0, unit: '%' })
      })

      it('parse_Should_ThrowError_When_UnitIsEm', () => {
        expect(() => converter.parse('200em')).toThrow()
      })

      it('parse_Should_ThrowError_When_UnitIsVw', () => {
        expect(() => converter.parse('50vw')).toThrow()
      })

      it('parse_Should_ThrowError_When_UnitIsRem', () => {
        expect(() => converter.parse('100rem')).toThrow()
      })
    })
  })

  describe('toPercent', () => {
    describe('百分比輸入', () => {
      it('toPercent_Should_ReturnValue_When_UnitIsPercent', () => {
        expect(converter.toPercent({ value: 50, unit: '%' }, 1000)).toBe(50)
      })

      it('toPercent_Should_IgnoreAvailableSize_When_UnitIsPercent', () => {
        expect(converter.toPercent({ value: 50, unit: '%' }, 0)).toBe(50)
      })
    })

    describe('px 輸入', () => {
      it('toPercent_Should_Return20Percent_When_200pxWith1000AvailableSize', () => {
        expect(converter.toPercent({ value: 200, unit: 'px' }, 1000)).toBe(20)
      })

      it('toPercent_Should_Return40Percent_When_200pxWith500AvailableSize', () => {
        expect(converter.toPercent({ value: 200, unit: 'px' }, 500)).toBe(40)
      })
    })

    describe('邊界情況', () => {
      it('toPercent_Should_ReturnZero_When_AvailableSizeIsZero', () => {
        expect(converter.toPercent({ value: 200, unit: 'px' }, 0)).toBe(0)
      })

      it('toPercent_Should_NotClamp_When_ResultExceeds100', () => {
        expect(converter.toPercent({ value: 600, unit: 'px' }, 500)).toBe(120)
      })

      it('toPercent_Should_ReturnNegative_When_PxValueIsNegative', () => {
        expect(converter.toPercent({ value: -100, unit: 'px' }, 1000)).toBe(-10)
      })
    })
  })
})
