import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { HitRegionDetector } from '../../src/core/HitRegionDetector.js'

function createMockPanel(rect) {
  return {
    id: `panel-${rect.x}`,
    element: {
      getBoundingClientRect: () => rect
    },
    config: {},
    constraints: {}
  }
}

describe('HitRegionDetector', () => {
  let detector

  beforeEach(() => {
    detector = new HitRegionDetector()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detect', () => {
    describe('命中判定', () => {
      it('detect_Should_ReturnHit_When_PointerIsOnBoundary', () => {
        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = detector.detect(200, 50, panels)

        expect(result).toEqual({ hit: true, boundaryIndex: 0 })
      })

      it('detect_Should_ReturnHit_When_PointerIsWithinMarginLeft', () => {
        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = detector.detect(195, 50, panels)

        expect(result).toEqual({ hit: true, boundaryIndex: 0 })
      })

      it('detect_Should_ReturnHit_When_PointerIsWithinMarginRight', () => {
        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = detector.detect(205, 50, panels)

        expect(result).toEqual({ hit: true, boundaryIndex: 0 })
      })

      it('detect_Should_ReturnHit_When_PointerIsAtMarginEdge', () => {
        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = detector.detect(190, 50, panels)

        expect(result).toEqual({ hit: true, boundaryIndex: 0 })
      })
    })

    describe('未命中', () => {
      it('detect_Should_ReturnMiss_When_PointerIsOutsideMargin', () => {
        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = detector.detect(100, 50, panels)

        expect(result).toEqual({ hit: false, boundaryIndex: null })
      })

      it('detect_Should_ReturnMiss_When_PointerIsBeyondMarginRight', () => {
        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = detector.detect(211, 50, panels)

        expect(result).toEqual({ hit: false, boundaryIndex: null })
      })

      it('detect_Should_ReturnMiss_When_PointerIsBeyondMarginLeft', () => {
        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = detector.detect(189, 50, panels)

        expect(result).toEqual({ hit: false, boundaryIndex: null })
      })
    })

    describe('水平方向（只比對 X 座標）', () => {
      it('detect_Should_ReturnHit_When_PointerYIsOutsidePanelBounds', () => {
        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = detector.detect(200, 999, panels)

        expect(result).toEqual({ hit: true, boundaryIndex: 0 })
      })

      it('detect_Should_ReturnHit_When_PointerYIsNegative', () => {
        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = detector.detect(200, -10, panels)

        expect(result).toEqual({ hit: true, boundaryIndex: 0 })
      })
    })

    describe('粗指標命中範圍', () => {
      it('detect_Should_ReturnHit_When_CoarsePointerWithinLargerMargin', () => {
        vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
        const coarseDetector = new HitRegionDetector()

        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = coarseDetector.detect(185, 50, panels)

        expect(result).toEqual({ hit: true, boundaryIndex: 0 })
      })

      it('detect_Should_ReturnMiss_When_FinePointerAtCoarseOnlyDistance', () => {
        vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
        const fineDetector = new HitRegionDetector()

        const panels = [
          createMockPanel(new DOMRect(0, 0, 200, 100)),
          createMockPanel(new DOMRect(200, 0, 200, 100))
        ]

        const result = fineDetector.detect(185, 50, panels)

        expect(result).toEqual({ hit: false, boundaryIndex: null })
      })
    })
  })

  describe('getMargin', () => {
    it('getMargin_Should_ReturnFineValue_When_FinePointer', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
      const fineDetector = new HitRegionDetector()

      expect(fineDetector.getMargin()).toBe(10)
    })

    it('getMargin_Should_ReturnCoarseValue_When_CoarsePointer', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
      const coarseDetector = new HitRegionDetector()

      expect(coarseDetector.getMargin()).toBe(20)
    })

    it('getMargin_Should_ReturnCustomValue_When_CustomSizeProvided', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
      const customDetector = new HitRegionDetector({ coarse: 30, fine: 15 })

      expect(customDetector.getMargin()).toBe(30)
    })

    it('getMargin_Should_ReturnCustomFineValue_When_CustomSizeProvided', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
      const customDetector = new HitRegionDetector({ coarse: 30, fine: 15 })

      expect(customDetector.getMargin()).toBe(15)
    })
  })

  describe('isCoarsePointer', () => {
    it('isCoarsePointer_Should_ReturnTrue_When_PointerIsCoarse', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
      const coarseDetector = new HitRegionDetector()

      expect(coarseDetector.isCoarsePointer()).toBe(true)
    })

    it('isCoarsePointer_Should_ReturnFalse_When_PointerIsFine', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
      const fineDetector = new HitRegionDetector()

      expect(fineDetector.isCoarsePointer()).toBe(false)
    })

    it('isCoarsePointer_Should_ReturnFalse_When_MatchMediaNotSupported', () => {
      vi.stubGlobal('matchMedia', undefined)
      const fallbackDetector = new HitRegionDetector()

      expect(fallbackDetector.isCoarsePointer()).toBe(false)
    })
  })
})
