import { describe, test, expect, vi } from 'vitest'
import { ResizableGroupManager } from '../../src/core/ResizableGroupManager.js'
import { Event } from '../../src/core/Event.js'

// --- helpers ---

function createGroupElement() {
  const element = document.createElement('div')
  return element
}

function createPanelElement() {
  const element = document.createElement('div')
  return element
}

function createGroupConfig(overrides = {}) {
  return {
    element: createGroupElement(),
    disabled: false,
    disableCursor: false,
    ...overrides
  }
}

function createPanelConfig(id, overrides = {}) {
  return {
    id,
    element: createPanelElement(),
    defaultSize: undefined,
    minSize: '0%',
    maxSize: '100%',
    disabled: false,
    ...overrides
  }
}

function createManager(options = {}) {
  const groupConfig = options.groupConfig || createGroupConfig()
  const panelConfigs = options.panelConfigs || undefined

  return new ResizableGroupManager({ groupConfig, panelConfigs })
}

// --- tests ---

describe('Constructor', () => {
  test('constructor_Should_InitializeInactive_When_Created', () => {
    const manager = createManager()

    expect(manager._active).toBe(false)
  })

  test('constructor_Should_HaveEmptyPanels_When_NoPanelConfigsProvided', () => {
    const manager = createManager()

    expect(manager._panels).toEqual([])
  })

  test('constructor_Should_RegisterPanels_When_PanelConfigsProvided', () => {
    const panelConfigs = [
      createPanelConfig('main'),
      createPanelConfig('side')
    ]
    const manager = createManager({ panelConfigs })

    expect(manager._panels).toHaveLength(2)
    expect(manager._panels[0].id).toBe('main')
    expect(manager._panels[1].id).toBe('side')
  })

  test('constructor_Should_PreserveOriginalConfig_When_PanelConfigsProvided', () => {
    const panelConfig = createPanelConfig('main', { defaultSize: '200px', minSize: '100px' })
    const manager = createManager({ panelConfigs: [panelConfig] })

    expect(manager._panels[0].config).toBe(panelConfig)
  })

  test('constructor_Should_SetConstraintsNull_When_PanelRegistered', () => {
    const panelConfigs = [createPanelConfig('main')]
    const manager = createManager({ panelConfigs })

    expect(manager._panels[0].constraints).toBeNull()
  })

  test('constructor_Should_InitializeEmptyLayout_When_Created', () => {
    const manager = createManager()

    expect(manager._layout).toBeNull()
  })

  test('constructor_Should_InitializeDragState_When_Created', () => {
    const manager = createManager()

    expect(manager._dragState).toEqual({
      dragging: false,
      initialLayout: null,
      pointerDownAt: null,
      activeBoundaryIndex: null
    })
  })
})

describe('registerPanel', () => {
  test('registerPanel_Should_ReturnPanelId_When_ConfigProvided', () => {
    const manager = createManager()
    const config = createPanelConfig('main')

    const panelId = manager.registerPanel(config)

    expect(panelId).toBe('main')
  })

  test('registerPanel_Should_StorePanelData_When_Called', () => {
    const manager = createManager()
    const config = createPanelConfig('main')

    manager.registerPanel(config)

    expect(manager._panels).toHaveLength(1)
    expect(manager._panels[0].id).toBe('main')
    expect(manager._panels[0].element).toBe(config.element)
    expect(manager._panels[0].config).toBe(config)
    expect(manager._panels[0].constraints).toBeNull()
  })

  test('registerPanel_Should_AcceptMultiplePanels_When_CalledMultipleTimes', () => {
    const manager = createManager()

    manager.registerPanel(createPanelConfig('main'))
    manager.registerPanel(createPanelConfig('side'))

    expect(manager._panels).toHaveLength(2)
    expect(manager._panels[0].id).toBe('main')
    expect(manager._panels[1].id).toBe('side')
  })
})

describe('unRegisterPanel', () => {
  test('unRegisterPanel_Should_RemovePanel_When_IdExists', () => {
    const manager = createManager()
    manager.registerPanel(createPanelConfig('main'))
    manager.registerPanel(createPanelConfig('side'))

    manager.unRegisterPanel('main')

    expect(manager._panels).toHaveLength(1)
    expect(manager._panels[0].id).toBe('side')
  })

  test('unRegisterPanel_Should_NotThrow_When_IdNotFound', () => {
    const manager = createManager()

    expect(() => manager.unRegisterPanel('nonexistent')).not.toThrow()
  })

  test('unRegisterPanel_Should_KeepOtherPanels_When_OneRemoved', () => {
    const manager = createManager()
    manager.registerPanel(createPanelConfig('a'))
    manager.registerPanel(createPanelConfig('b'))
    manager.registerPanel(createPanelConfig('c'))

    manager.unRegisterPanel('b')

    expect(manager._panels).toHaveLength(2)
    expect(manager._panels[0].id).toBe('a')
    expect(manager._panels[1].id).toBe('c')
  })
})

describe('Event', () => {
  test('Event_Should_BeAccessibleFromInstance_When_Created', () => {
    const manager = createManager()

    expect(manager.Event).toBeDefined()
    expect(manager.Event.LayoutChange).toBe(Event.LayoutChange)
    expect(manager.Event.LayoutChanged).toBe(Event.LayoutChanged)
  })

  test('Event_Should_BeAccessibleFromClass_When_Referenced', () => {
    expect(ResizableGroupManager.Event).toBeDefined()
    expect(ResizableGroupManager.Event.LayoutChange).toBe(Event.LayoutChange)
    expect(ResizableGroupManager.Event.LayoutChanged).toBe(Event.LayoutChanged)
  })
})

describe('on', () => {
  test('on_Should_RegisterCallback_When_ValidEventProvided', () => {
    const manager = createManager()
    const callback = vi.fn()

    manager.on(Event.LayoutChange, callback)

    expect(manager._eventListeners.get(Event.LayoutChange)).toContain(callback)
  })

  test('on_Should_SupportMultipleCallbacks_When_SameEventRegistered', () => {
    const manager = createManager()
    const callbackA = vi.fn()
    const callbackB = vi.fn()

    manager.on(Event.LayoutChange, callbackA)
    manager.on(Event.LayoutChange, callbackB)

    const listeners = manager._eventListeners.get(Event.LayoutChange)
    expect(listeners).toHaveLength(2)
    expect(listeners).toContain(callbackA)
    expect(listeners).toContain(callbackB)
  })

  test('on_Should_SeparateByEventType_When_DifferentEventsRegistered', () => {
    const manager = createManager()
    const changeCallback = vi.fn()
    const changedCallback = vi.fn()

    manager.on(Event.LayoutChange, changeCallback)
    manager.on(Event.LayoutChanged, changedCallback)

    expect(manager._eventListeners.get(Event.LayoutChange)).toEqual([changeCallback])
    expect(manager._eventListeners.get(Event.LayoutChanged)).toEqual([changedCallback])
  })
})

describe('off', () => {
  test('off_Should_RemoveCallback_When_ReferenceMatches', () => {
    const manager = createManager()
    const callback = vi.fn()

    manager.on(Event.LayoutChange, callback)
    manager.off(Event.LayoutChange, callback)

    const listeners = manager._eventListeners.get(Event.LayoutChange)
    expect(listeners).toHaveLength(0)
  })

  test('off_Should_NotThrow_When_CallbackNotFound', () => {
    const manager = createManager()
    const unknownCallback = vi.fn()

    expect(() => manager.off(Event.LayoutChange, unknownCallback)).not.toThrow()
  })

  test('off_Should_NotThrow_When_EventTypeNeverRegistered', () => {
    const manager = createManager()
    const callback = vi.fn()

    expect(() => manager.off('unknownEvent', callback)).not.toThrow()
  })

  test('off_Should_OnlyRemoveMatchingCallback_When_MultipleRegistered', () => {
    const manager = createManager()
    const callbackA = vi.fn()
    const callbackB = vi.fn()

    manager.on(Event.LayoutChange, callbackA)
    manager.on(Event.LayoutChange, callbackB)
    manager.off(Event.LayoutChange, callbackA)

    const listeners = manager._eventListeners.get(Event.LayoutChange)
    expect(listeners).toHaveLength(1)
    expect(listeners).toContain(callbackB)
  })
})

describe('getLayout', () => {
  test('getLayout_Should_ReturnNull_When_NotActivated', () => {
    const manager = createManager()

    const result = manager.getLayout()

    expect(result).toBeNull()
  })
})
