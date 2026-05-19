import { describe, it, expect, beforeEach } from 'vitest'
import { CursorManager } from '../../src/core/CursorManager.js'

function createMockDocument() {
  return {
    body: {
      style: {
        cursor: '',
        userSelect: ''
      }
    }
  }
}

describe('CursorManager', () => {
  let manager
  let mockDocument

  beforeEach(() => {
    mockDocument = createMockDocument()
    manager = new CursorManager(mockDocument)
  })

  describe('狀態切換與 cursor 設定', () => {
    it('setHover_Should_SetColResizeCursor_When_Called', () => {
      manager.setHover()

      expect(mockDocument.body.style.cursor).toBe('col-resize')
    })

    it('setDrag_Should_SetColResizeCursor_When_DirectionIsNone', () => {
      manager.setDrag('none')

      expect(mockDocument.body.style.cursor).toBe('col-resize')
    })

    it('setDrag_Should_SetEResizeCursor_When_DirectionIsStart', () => {
      manager.setDrag('start')

      expect(mockDocument.body.style.cursor).toBe('e-resize')
    })

    it('setDrag_Should_SetWResizeCursor_When_DirectionIsEnd', () => {
      manager.setDrag('end')

      expect(mockDocument.body.style.cursor).toBe('w-resize')
    })

    it('setDisabled_Should_SetNotAllowedCursor_When_Called', () => {
      manager.setDisabled()

      expect(mockDocument.body.style.cursor).toBe('not-allowed')
    })

    it('reset_Should_RemoveCursor_When_Called', () => {
      manager.setHover()
      manager.reset()

      expect(mockDocument.body.style.cursor).toBe('')
    })
  })

  describe('user-select 控制', () => {
    it('setDrag_Should_DisableUserSelect_When_Called', () => {
      manager.setDrag('none')

      expect(mockDocument.body.style.userSelect).toBe('none')
    })

    it('reset_Should_RemoveUserSelect_When_CalledAfterDrag', () => {
      manager.setDrag('none')
      manager.reset()

      expect(mockDocument.body.style.userSelect).toBe('')
    })

    it('setHover_Should_NotSetUserSelect_When_Called', () => {
      manager.setHover()

      expect(mockDocument.body.style.userSelect).toBe('')
    })

    it('setDisabled_Should_NotSetUserSelect_When_Called', () => {
      manager.setDisabled()

      expect(mockDocument.body.style.userSelect).toBe('')
    })
  })

  describe('內部狀態管理', () => {
    it('reset_Should_SetIdleState_When_Called', () => {
      manager.setDrag('start')
      manager.reset()
      manager.reset()

      expect(mockDocument.body.style.cursor).toBe('')
      expect(mockDocument.body.style.userSelect).toBe('')
    })

    it('setHover_Should_NotChangeBehavior_When_CalledMultipleTimes', () => {
      manager.setHover()
      manager.setHover()

      expect(mockDocument.body.style.cursor).toBe('col-resize')
    })

    it('setDrag_Should_NotChangeBehavior_When_CalledMultipleTimes', () => {
      manager.setDrag('none')
      manager.setDrag('none')

      expect(mockDocument.body.style.cursor).toBe('col-resize')
      expect(mockDocument.body.style.userSelect).toBe('none')
    })

    it('reset_Should_RestoreAllStyles_When_CalledAfterDrag', () => {
      manager.setDrag('start')
      manager.reset()

      expect(mockDocument.body.style.cursor).toBe('')
      expect(mockDocument.body.style.userSelect).toBe('')
    })

    it('setDrag_Should_UpdateCursor_When_DirectionChanges', () => {
      manager.setDrag('none')
      manager.setDrag('start')

      expect(mockDocument.body.style.cursor).toBe('e-resize')
    })
  })
})
