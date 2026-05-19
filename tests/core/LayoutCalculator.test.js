import { describe, it, expect, beforeEach } from 'vitest'
import { LayoutCalculator } from '../../src/core/LayoutCalculator.js'
import { UnitConverter } from '../../src/core/UnitConverter.js'

function makePanelData(id, { defaultSize, minSize = '0%', maxSize = '100%' } = {}) {
  return {
    id,
    element: null,
    config: { id, element: null, defaultSize, minSize, maxSize, disabled: false },
    constraints: { minSize: 0, maxSize: 100 }
  }
}

function makePanelDataWithConstraints(id, { defaultSize, minSize = 0, maxSize = 100 } = {}) {
  return {
    id,
    element: null,
    config: { id, element: null, defaultSize, minSize: `${minSize}%`, maxSize: `${maxSize}%`, disabled: false },
    constraints: { minSize, maxSize }
  }
}

function layoutSum(layout) {
  return Object.values(layout).reduce((sum, v) => sum + v, 0)
}

describe('LayoutCalculator', () => {
  let calculator

  beforeEach(() => {
    const unitConverter = new UnitConverter()
    calculator = new LayoutCalculator(unitConverter)
  })

  describe('layoutsEqual', () => {
    it('完全相同 → true', () => {
      expect(calculator.layoutsEqual({ a: 50, b: 50 }, { a: 50, b: 50 })).toBe(true)
    })

    it('空 layout → true', () => {
      expect(calculator.layoutsEqual({}, {})).toBe(true)
    })

    it('浮點微差（小數第四位以下）→ true', () => {
      expect(calculator.layoutsEqual(
        { a: 49.9999, b: 50.0001 },
        { a: 50, b: 50 }
      )).toBe(true)
    })

    it('實質差異 → false', () => {
      expect(calculator.layoutsEqual({ a: 48, b: 52 }, { a: 50, b: 50 })).toBe(false)
    })

    it('小數第三位差異 → false', () => {
      expect(calculator.layoutsEqual(
        { a: 49.999, b: 50.001 },
        { a: 50, b: 50 }
      )).toBe(false)
    })

    it('key 數量不同 → false', () => {
      expect(calculator.layoutsEqual({ a: 50, b: 50 }, { a: 100 })).toBe(false)
    })

    it('key 名稱不同 → false', () => {
      expect(calculator.layoutsEqual({ a: 50, b: 50 }, { c: 50, d: 50 })).toBe(false)
    })

    it('空 vs 非空 → false', () => {
      expect(calculator.layoutsEqual({}, { a: 100 })).toBe(false)
    })
  })

  describe('calculateInitialLayout', () => {
    describe('均分', () => {
      it('2 panels 無 defaultSize → 各 50%', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout).toEqual({ a: 50, b: 50 })
      })

      it('3 panels 無 defaultSize → 各 33.333%', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b'),
          makePanelDataWithConstraints('c')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layoutSum(layout)).toBeCloseTo(100, 5)
        expect(layout.a).toBeCloseTo(33.333, 2)
        expect(layout.b).toBeCloseTo(33.333, 2)
        expect(layout.c).toBeCloseTo(33.333, 2)
      })

      it('均分後受 min/max clamp', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 60 }),
          makePanelDataWithConstraints('b')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(60)
        expect(layout.b).toBe(40)
        expect(layoutSum(layout)).toBe(100)
      })
    })

    describe('有 defaultSize', () => {
      it('defaultSize 加總 = 100% → 直接使用', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '70%' }),
          makePanelDataWithConstraints('b', { defaultSize: '30%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout).toEqual({ a: 70, b: 30 })
      })

      it('defaultSize 加總 ≠ 100% → 按比例 normalize', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '30%' }),
          makePanelDataWithConstraints('b', { defaultSize: '40%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layoutSum(layout)).toBeCloseTo(100, 5)
        expect(layout.a).toBeCloseTo(42.857, 2)
        expect(layout.b).toBeCloseTo(57.143, 2)
      })

      it('defaultSize 受 min clamp', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '20%', minSize: 30 }),
          makePanelDataWithConstraints('b', { defaultSize: '80%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBeGreaterThanOrEqual(30)
        expect(layoutSum(layout)).toBeCloseTo(100, 5)
      })

      it('defaultSize 受 max clamp', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '80%', maxSize: 60 }),
          makePanelDataWithConstraints('b', { defaultSize: '20%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBeLessThanOrEqual(60)
        expect(layoutSum(layout)).toBeCloseTo(100, 5)
      })
    })

    describe('混合（部分有 defaultSize）', () => {
      it('一個有 defaultSize、一個沒有 → 沒有的拿剩餘', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '70%' }),
          makePanelDataWithConstraints('b')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(70)
        expect(layout.b).toBe(30)
        expect(layoutSum(layout)).toBe(100)
      })

      it('兩個有 defaultSize、一個沒有 → 沒有的拿剩餘', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '40%' }),
          makePanelDataWithConstraints('b'),
          makePanelDataWithConstraints('c', { defaultSize: '30%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(40)
        expect(layout.c).toBe(30)
        expect(layout.b).toBe(30)
        expect(layoutSum(layout)).toBe(100)
      })

      it('剩餘空間由多個無 defaultSize panel 均分', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '40%' }),
          makePanelDataWithConstraints('b'),
          makePanelDataWithConstraints('c')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(40)
        expect(layout.b).toBe(30)
        expect(layout.c).toBe(30)
        expect(layoutSum(layout)).toBe(100)
      })
    })

    describe('defaultSize 為 px', () => {
      it('px 轉為百分比後分配', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '200px' }),
          makePanelDataWithConstraints('b')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(20)
        expect(layout.b).toBe(80)
        expect(layoutSum(layout)).toBe(100)
      })

      it('混合 px 和 % defaultSize → normalize 到 100%', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '300px' }),
          makePanelDataWithConstraints('b', { defaultSize: '40%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBeCloseTo(42.857, 2)
        expect(layout.b).toBeCloseTo(57.143, 2)
        expect(layoutSum(layout)).toBeCloseTo(100, 5)
      })

      it('px defaultSize + 無 defaultSize → 無 defaultSize 拿剩餘', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '300px' }),
          makePanelDataWithConstraints('b')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(30)
        expect(layout.b).toBe(70)
        expect(layoutSum(layout)).toBe(100)
      })
    })

    describe('約束衝突', () => {
      it('minSize 加總 > 100% → best-effort clamp，按 DOM 順序優先', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 60 }),
          makePanelDataWithConstraints('b', { minSize: 60 })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(60)
        expect(layout.b).toBe(40)
        expect(layoutSum(layout)).toBe(100)
      })

      it('minSize 加總剛好 100% → 各自取 minSize', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 40 }),
          makePanelDataWithConstraints('b', { minSize: 60 })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBeGreaterThanOrEqual(40)
        expect(layout.b).toBeGreaterThanOrEqual(60)
        expect(layoutSum(layout)).toBe(100)
      })
    })
  })

  describe('adjustLayoutByDelta', () => {
    describe('基本 delta 調整', () => {
      it('正 delta → boundaryIndex 左側增大，右側縮小', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b')
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, 10, 0, panels)

        expect(layout.a).toBe(60)
        expect(layout.b).toBe(40)
        expect(layoutSum(layout)).toBe(100)
      })

      it('負 delta → boundaryIndex 左側縮小，右側增大', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b')
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, -10, 0, panels)

        expect(layout.a).toBe(40)
        expect(layout.b).toBe(60)
        expect(layoutSum(layout)).toBe(100)
      })

      it('delta = 0 → layout 不變', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b')
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, 0, 0, panels)

        expect(layout).toEqual(baseLayout)
      })
    })

    describe('雙向 clamp', () => {
      it('正 delta 使右側碰 minSize → clamp', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b', { minSize: 30 })
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, 30, 0, panels)

        expect(layout.b).toBe(30)
        expect(layout.a).toBe(70)
        expect(layoutSum(layout)).toBe(100)
      })

      it('負 delta 使左側碰 minSize → clamp', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 20 }),
          makePanelDataWithConstraints('b')
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, -40, 0, panels)

        expect(layout.a).toBe(20)
        expect(layout.b).toBe(80)
        expect(layoutSum(layout)).toBe(100)
      })

      it('正 delta 使左側碰 maxSize → clamp', () => {
        const panels = [
          makePanelDataWithConstraints('a', { maxSize: 60 }),
          makePanelDataWithConstraints('b')
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, 20, 0, panels)

        expect(layout.a).toBe(60)
        expect(layout.b).toBe(40)
        expect(layoutSum(layout)).toBe(100)
      })
    })

    describe('delta 基於 baseLayout', () => {
      it('多次呼叫以同一 baseLayout，結果一致（非累計）', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b')
        ]
        const baseLayout = { a: 50, b: 50 }

        const layout1 = calculator.adjustLayoutByDelta(baseLayout, 10, 0, panels)
        const layout2 = calculator.adjustLayoutByDelta(baseLayout, 10, 0, panels)

        expect(layout1).toEqual(layout2)
      })
    })

    describe('無法套用', () => {
      it('左側已達 maxSize，正 delta 無法套用 → 回傳 baseLayout', () => {
        const panels = [
          makePanelDataWithConstraints('a', { maxSize: 50 }),
          makePanelDataWithConstraints('b', { minSize: 50 })
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, 10, 0, panels)

        expect(layout).toEqual(baseLayout)
      })

      it('右側已達 maxSize，負 delta 無法套用 → 回傳 baseLayout', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 50 }),
          makePanelDataWithConstraints('b', { maxSize: 50 })
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, -10, 0, panels)

        expect(layout).toEqual(baseLayout)
      })
    })

    describe('100% 不變式', () => {
      it('大 delta clamp 後加總仍為 100%', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 10, maxSize: 90 }),
          makePanelDataWithConstraints('b', { minSize: 10, maxSize: 90 })
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, 60, 0, panels)

        expect(layoutSum(layout)).toBe(100)
      })
    })

    describe('多 panel（boundaryIndex > 0）', () => {
      it('3 panels, boundaryIndex=1 → 調整 panel[1] 和 panel[2]', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b'),
          makePanelDataWithConstraints('c')
        ]
        const baseLayout = { a: 33, b: 34, c: 33 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, 10, 1, panels)

        expect(layout.a).toBe(33)
        expect(layout.b).toBe(44)
        expect(layout.c).toBe(23)
        expect(layoutSum(layout)).toBe(100)
      })

      it('3 panels, boundaryIndex=0 → 調整 panel[0] 和 panel[1]', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b'),
          makePanelDataWithConstraints('c')
        ]
        const baseLayout = { a: 33, b: 34, c: 33 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, 10, 0, panels)

        expect(layout.a).toBe(43)
        expect(layout.b).toBe(24)
        expect(layout.c).toBe(33)
        expect(layoutSum(layout)).toBe(100)
      })
    })
  })

  describe('validateLayout', () => {
    describe('約束合法', () => {
      it('layout 符合所有約束 → 原樣回傳', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 20, maxSize: 80 }),
          makePanelDataWithConstraints('b', { minSize: 20, maxSize: 80 })
        ]
        const layout = { a: 50, b: 50 }
        const result = calculator.validateLayout(layout, panels)

        expect(result).toEqual(layout)
      })
    })

    describe('約束不合法', () => {
      it('panel 低於 minSize → clamp 到 minSize，重分配剩餘', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 40 }),
          makePanelDataWithConstraints('b')
        ]
        const layout = { a: 30, b: 70 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(40)
        expect(result.b).toBe(60)
        expect(layoutSum(result)).toBe(100)
      })

      it('panel 超過 maxSize → clamp 到 maxSize，重分配剩餘', () => {
        const panels = [
          makePanelDataWithConstraints('a', { maxSize: 60 }),
          makePanelDataWithConstraints('b')
        ]
        const layout = { a: 80, b: 20 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(60)
        expect(result.b).toBe(40)
        expect(layoutSum(result)).toBe(100)
      })

      it('多 panel 同時違規 → 按 DOM 順序 clamp + 重分配', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 30 }),
          makePanelDataWithConstraints('b', { minSize: 30 }),
          makePanelDataWithConstraints('c')
        ]
        const layout = { a: 10, b: 10, c: 80 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBeGreaterThanOrEqual(30)
        expect(result.b).toBeGreaterThanOrEqual(30)
        expect(layoutSum(result)).toBeCloseTo(100, 5)
      })
    })

    describe('衝突處理', () => {
      it('minSize 加總 > 100% → best-effort clamp，永遠回傳合法 Layout', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 60 }),
          makePanelDataWithConstraints('b', { minSize: 60 })
        ]
        const layout = { a: 50, b: 50 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(60)
        expect(result.b).toBe(40)
        expect(layoutSum(result)).toBe(100)
      })
    })
  })
})
