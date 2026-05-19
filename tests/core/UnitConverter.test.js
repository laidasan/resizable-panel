import { describe, it, expect, beforeEach } from 'vitest'
import { UnitConverter } from '../../src/core/UnitConverter.js'

describe('UnitConverter', () => {
  let converter

  beforeEach(() => {
    converter = new UnitConverter()
  })

  describe('parse', () => {
    describe('百分比解析', () => {
      it('純數字 → percent', () => {
        expect(converter.parse(50)).toEqual({ value: 50, unit: '%' })
      })

      it('字串數字 → percent', () => {
        expect(converter.parse('50')).toEqual({ value: 50, unit: '%' })
      })

      it('帶 % 字串 → percent', () => {
        expect(converter.parse('50%')).toEqual({ value: 50, unit: '%' })
      })
    })

    describe('px 解析', () => {
      it('帶 px 字串 → px', () => {
        expect(converter.parse('200px')).toEqual({ value: 200, unit: 'px' })
      })
    })

    describe('邊界與異常輸入', () => {
      it('0 → percent', () => {
        expect(converter.parse(0)).toEqual({ value: 0, unit: '%' })
      })

      it('"0" → percent', () => {
        expect(converter.parse('0')).toEqual({ value: 0, unit: '%' })
      })

      it('"0%" → percent', () => {
        expect(converter.parse('0%')).toEqual({ value: 0, unit: '%' })
      })

      it('"0px" → px', () => {
        expect(converter.parse('0px')).toEqual({ value: 0, unit: 'px' })
      })

      it('小數百分比 "33.33%" → percent', () => {
        expect(converter.parse('33.33%')).toEqual({ value: 33.33, unit: '%' })
      })

      it('小數 px "150.5px" → px', () => {
        expect(converter.parse('150.5px')).toEqual({ value: 150.5, unit: 'px' })
      })

      it('負數純數字照常解析', () => {
        expect(converter.parse(-10)).toEqual({ value: -10, unit: '%' })
      })

      it('負數百分比字串照常解析', () => {
        expect(converter.parse('-5%')).toEqual({ value: -5, unit: '%' })
      })

      it('負數 px 字串照常解析', () => {
        expect(converter.parse('-100px')).toEqual({ value: -100, unit: 'px' })
      })

      it('非數字字串 → NaN 轉為 0, 單位為 percent', () => {
        expect(converter.parse('abc')).toEqual({ value: 0, unit: '%' })
      })

      it('空字串 → NaN 轉為 0, 單位為 percent', () => {
        expect(converter.parse('')).toEqual({ value: 0, unit: '%' })
      })

      it('不支援的單位 "200em" → throw Error', () => {
        expect(() => converter.parse('200em')).toThrow()
      })

      it('不支援的單位 "50vw" → throw Error', () => {
        expect(() => converter.parse('50vw')).toThrow()
      })

      it('不支援的單位 "100rem" → throw Error', () => {
        expect(() => converter.parse('100rem')).toThrow()
      })
    })
  })

  describe('toPercent', () => {
    describe('百分比輸入', () => {
      it('直接回傳 value', () => {
        expect(converter.toPercent({ value: 50, unit: '%' }, 1000)).toBe(50)
      })

      it('availableSize 不影響結果', () => {
        expect(converter.toPercent({ value: 50, unit: '%' }, 0)).toBe(50)
      })
    })

    describe('px 輸入', () => {
      it('200px / 1000 = 20%', () => {
        expect(converter.toPercent({ value: 200, unit: 'px' }, 1000)).toBe(20)
      })

      it('200px / 500 = 40%', () => {
        expect(converter.toPercent({ value: 200, unit: 'px' }, 500)).toBe(40)
      })
    })

    describe('邊界情況', () => {
      it('px 輸入 + availableSize=0 → 回傳 0', () => {
        expect(converter.toPercent({ value: 200, unit: 'px' }, 0)).toBe(0)
      })

      it('轉換結果超過 100 → 不 clamp, 直接回傳', () => {
        expect(converter.toPercent({ value: 600, unit: 'px' }, 500)).toBe(120)
      })

      it('負數 px → 不 clamp, 直接回傳負值', () => {
        expect(converter.toPercent({ value: -100, unit: 'px' }, 1000)).toBe(-10)
      })
    })
  })
})
