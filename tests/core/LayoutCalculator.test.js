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
    it('layoutsEqual_Should_ReturnTrue_When_LayoutsAreIdentical', () => {
      expect(calculator.layoutsEqual({ a: 50, b: 50 }, { a: 50, b: 50 })).toBe(true)
    })

    it('layoutsEqual_Should_ReturnTrue_When_BothLayoutsAreEmpty', () => {
      expect(calculator.layoutsEqual({}, {})).toBe(true)
    })

    it('layoutsEqual_Should_ReturnTrue_When_DifferenceIsBelowFourthDecimal', () => {
      expect(calculator.layoutsEqual(
        { a: 49.9999, b: 50.0001 },
        { a: 50, b: 50 }
      )).toBe(true)
    })

    it('layoutsEqual_Should_ReturnFalse_When_ValuesHaveSubstantialDifference', () => {
      expect(calculator.layoutsEqual({ a: 48, b: 52 }, { a: 50, b: 50 })).toBe(false)
    })

    it('layoutsEqual_Should_ReturnFalse_When_DifferenceIsAtThirdDecimal', () => {
      expect(calculator.layoutsEqual(
        { a: 49.999, b: 50.001 },
        { a: 50, b: 50 }
      )).toBe(false)
    })

    it('layoutsEqual_Should_ReturnFalse_When_KeyCountDiffers', () => {
      expect(calculator.layoutsEqual({ a: 50, b: 50 }, { a: 100 })).toBe(false)
    })

    it('layoutsEqual_Should_ReturnFalse_When_KeyNamesDiffer', () => {
      expect(calculator.layoutsEqual({ a: 50, b: 50 }, { c: 50, d: 50 })).toBe(false)
    })

    it('layoutsEqual_Should_ReturnFalse_When_OneLayoutIsEmpty', () => {
      expect(calculator.layoutsEqual({}, { a: 100 })).toBe(false)
    })
  })

  describe('calculateInitialLayout', () => {
    describe('均分', () => {
      it('calculateInitialLayout_Should_ReturnEqualSplit_When_TwoPanelsWithoutDefaultSize', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout).toEqual({ a: 50, b: 50 })
      })

      it('calculateInitialLayout_Should_ReturnEqualSplit_When_ThreePanelsWithoutDefaultSize', () => {
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

      it('calculateInitialLayout_Should_ClampToMinSize_When_EqualSplitViolatesConstraints', () => {
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
      it('calculateInitialLayout_Should_UseDefaultSizes_When_SumEquals100', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '70%' }),
          makePanelDataWithConstraints('b', { defaultSize: '30%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout).toEqual({ a: 70, b: 30 })
      })

      it('calculateInitialLayout_Should_NormalizeProportionally_When_DefaultSizeSumIsNot100', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '30%' }),
          makePanelDataWithConstraints('b', { defaultSize: '40%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layoutSum(layout)).toBeCloseTo(100, 5)
        expect(layout.a).toBeCloseTo(42.857, 2)
        expect(layout.b).toBeCloseTo(57.143, 2)
      })

      it('calculateInitialLayout_Should_ClampToMinSize_When_DefaultSizeBelowMin', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '20%', minSize: 30 }),
          makePanelDataWithConstraints('b', { defaultSize: '80%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBeGreaterThanOrEqual(30)
        expect(layoutSum(layout)).toBeCloseTo(100, 5)
      })

      it('calculateInitialLayout_Should_ClampToMaxSize_When_DefaultSizeAboveMax', () => {
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
      it('calculateInitialLayout_Should_AssignRemainder_When_OnePanelHasNoDefaultSize', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '70%' }),
          makePanelDataWithConstraints('b')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(70)
        expect(layout.b).toBe(30)
        expect(layoutSum(layout)).toBe(100)
      })

      it('calculateInitialLayout_Should_AssignRemainder_When_TwoHaveDefaultSizeAndOneDoesNot', () => {
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

      it('calculateInitialLayout_Should_SplitRemainderEqually_When_MultiplePanelsHaveNoDefaultSize', () => {
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
      it('calculateInitialLayout_Should_ConvertToPercent_When_DefaultSizeIsPx', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '200px' }),
          makePanelDataWithConstraints('b')
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(20)
        expect(layout.b).toBe(80)
        expect(layoutSum(layout)).toBe(100)
      })

      it('calculateInitialLayout_Should_NormalizeTo100_When_MixingPxAndPercentDefaultSize', () => {
        const panels = [
          makePanelDataWithConstraints('a', { defaultSize: '300px' }),
          makePanelDataWithConstraints('b', { defaultSize: '40%' })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBeCloseTo(42.857, 2)
        expect(layout.b).toBeCloseTo(57.143, 2)
        expect(layoutSum(layout)).toBeCloseTo(100, 5)
      })

      it('calculateInitialLayout_Should_AssignRemainder_When_PxDefaultSizeWithNoDefaultSizePanel', () => {
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
      it('calculateInitialLayout_Should_RespectBothMinSizes_When_MinSizeSumExceeds100', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 60 }),
          makePanelDataWithConstraints('b', { minSize: 60 })
        ]
        const layout = calculator.calculateInitialLayout(panels, 1000)

        expect(layout.a).toBe(60)
        expect(layout.b).toBe(60)
        expect(layoutSum(layout)).toBe(120)
      })

      it('calculateInitialLayout_Should_UseMinSizes_When_MinSizeSumEquals100', () => {
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
      it('adjustLayoutByDelta_Should_GrowLeftShrinkRight_When_DeltaIsPositive', () => {
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

      it('adjustLayoutByDelta_Should_ShrinkLeftGrowRight_When_DeltaIsNegative', () => {
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

      it('adjustLayoutByDelta_Should_ReturnSameLayout_When_DeltaIsZero', () => {
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
      it('adjustLayoutByDelta_Should_ClampRightToMinSize_When_PositiveDeltaExceedsRightCapacity', () => {
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

      it('adjustLayoutByDelta_Should_ClampLeftToMinSize_When_NegativeDeltaExceedsLeftCapacity', () => {
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

      it('adjustLayoutByDelta_Should_ClampLeftToMaxSize_When_PositiveDeltaExceedsLeftMaxCapacity', () => {
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
      it('adjustLayoutByDelta_Should_ReturnConsistentResult_When_CalledMultipleTimesWithSameBaseLayout', () => {
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
      it('adjustLayoutByDelta_Should_ReturnBaseLayout_When_LeftAlreadyAtMaxAndDeltaIsPositive', () => {
        const panels = [
          makePanelDataWithConstraints('a', { maxSize: 50 }),
          makePanelDataWithConstraints('b', { minSize: 50 })
        ]
        const baseLayout = { a: 50, b: 50 }
        const layout = calculator.adjustLayoutByDelta(baseLayout, 10, 0, panels)

        expect(layout).toEqual(baseLayout)
      })

      it('adjustLayoutByDelta_Should_ReturnBaseLayout_When_RightAlreadyAtMaxAndDeltaIsNegative', () => {
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
      it('adjustLayoutByDelta_Should_MaintainSumOf100_When_LargeDeltaIsClamped', () => {
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
      it('adjustLayoutByDelta_Should_AdjustMiddleAndRight_When_BoundaryIndexIs1', () => {
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

      it('adjustLayoutByDelta_Should_AdjustLeftAndMiddle_When_BoundaryIndexIs0', () => {
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
      it('validateLayout_Should_ReturnOriginalLayout_When_AllConstraintsSatisfied', () => {
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
      it('validateLayout_Should_ClampToMinAndRedistribute_When_PanelBelowMinSize', () => {
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

      it('validateLayout_Should_ClampToMaxAndRedistribute_When_PanelAboveMaxSize', () => {
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

      it('validateLayout_Should_ClampByDomOrder_When_MultiplePanelsViolateConstraints', () => {
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
      it('validateLayout_Should_RespectBothMinSizes_When_MinSizeSumExceeds100', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 60 }),
          makePanelDataWithConstraints('b', { minSize: 60 })
        ]
        const layout = { a: 50, b: 50 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(60)
        expect(result.b).toBe(60)
        expect(layoutSum(result)).toBe(120)
      })
    })

    describe('normalize', () => {
      it('validateLayout_Should_NormalizeTo100_When_LayoutSumIsNot100', () => {
        const panels = [
          makePanelDataWithConstraints('a'),
          makePanelDataWithConstraints('b')
        ]
        const layout = { a: 40, b: 40 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(50)
        expect(result.b).toBe(50)
        expect(layoutSum(result)).toBe(100)
      })
    })

    describe('重分配方向', () => {
      it('validateLayout_Should_RedistributeFromIndex0_When_ClampProducesPositiveRemaining', () => {
        const panels = [
          makePanelDataWithConstraints('a', { maxSize: 35 }),
          makePanelDataWithConstraints('b', { minSize: 10, maxSize: 60 }),
          makePanelDataWithConstraints('c', { minSize: 10, maxSize: 50 })
        ]
        const layout = { a: 50, b: 30, c: 20 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(35)
        expect(result.b).toBe(45)
        expect(result.c).toBe(20)
        expect(layoutSum(result)).toBe(100)
      })

      it('validateLayout_Should_RedistributeFromIndex0_When_ClampProducesNegativeRemaining', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 40 }),
          makePanelDataWithConstraints('b', { minSize: 40 }),
          makePanelDataWithConstraints('c')
        ]
        const layout = { a: 10, b: 10, c: 80 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(40)
        expect(result.b).toBe(40)
        expect(result.c).toBe(20)
        expect(layoutSum(result)).toBe(100)
      })
    })

    describe('minSize > maxSize 衝突', () => {
      it('validateLayout_Should_LetMaxSizeWin_When_MinSizeExceedsMaxSize', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 80, maxSize: 60 }),
          makePanelDataWithConstraints('b')
        ]
        const layout = { a: 50, b: 50 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(60)
      })
    })

    describe('加總 ≠ 100% 的極端情境', () => {
      it('validateLayout_Should_AllowSumOver100_When_ConstraintsCannotBeSatisfied', () => {
        const panels = [
          makePanelDataWithConstraints('a', { minSize: 60 }),
          makePanelDataWithConstraints('b', { minSize: 60 })
        ]
        const layout = { a: 60, b: 60 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(60)
        expect(result.b).toBe(60)
        expect(layoutSum(result)).toBe(120)
      })

      it('validateLayout_Should_AllowSumUnder100_When_MaxSizesSumBelow100', () => {
        const panels = [
          makePanelDataWithConstraints('a', { maxSize: 40 }),
          makePanelDataWithConstraints('b', { maxSize: 40 })
        ]
        const layout = { a: 50, b: 50 }
        const result = calculator.validateLayout(layout, panels)

        expect(result.a).toBe(40)
        expect(result.b).toBe(40)
        expect(layoutSum(result)).toBe(80)
      })
    })
  })
})
