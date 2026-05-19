import { reject, isNil, append, sortBy, map, fromPairs } from 'ramda'
import { Event } from './Event.js'
import { ConstraintDirection } from './ConstraintDirection.js'
import { UnitConverter } from './UnitConverter.js'
import { LayoutCalculator } from './LayoutCalculator.js'
import { HitRegionDetector } from './HitRegionDetector.js'
import { CursorManager } from './CursorManager.js'

const DefaultMinSize = '0%'
const DefaultMaxSize = '100%'
const PointerButtonNone = 0

/**
 * @class ResizableGroupManager
 * @classdesc Orchestrator，協調 LayoutCalculator、HitRegionDetector、CursorManager、ResizeObserver，
 * 對外提供 panel 管理與事件通知 API。負責拖曳三階段流程與容器 resize 處理。
 *
 * @param {Object} options - 建構選項
 * @param {GroupConfig} options.groupConfig - Group 容器配置
 * @param {PanelConfig[]} [options.panelConfigs] - 初始 panel 配置
 *
 * @example
 * const manager = new ResizableGroupManager({
 *   groupConfig: { element: groupEl, disabled: false, disableCursor: false },
 *   panelConfigs: [
 *     { id: 'main', element: mainEl, defaultSize: '70%', minSize: '30%' },
 *     { id: 'side', element: sideEl, defaultSize: '30%', minSize: '200px' }
 *   ]
 * })
 *
 * manager.on(manager.Event.LayoutChange, (layoutResult) => { })
 * const layoutResult = manager.activate()
 */
export class ResizableGroupManager {
  _config = null
  _panels = []
  _layout = null
  _unitConverter = null
  _layoutCalculator = null
  _hitRegionDetector = null
  _cursorManager = null
  _resizeObserver = null
  _eventListeners = new Map()
  _active = false
  _pointerCaptured = false
  _dragState = {
    dragging: false,
    initialLayout: null,
    pointerDownAt: null,
    activeBoundaryIndex: null
  }
  _boundHandlePointerDown = null
  _boundHandlePointerMove = null
  _boundHandlePointerUp = null

  constructor({ groupConfig, panelConfigs }) {
    this._config = groupConfig

    this._unitConverter = new UnitConverter()
    this._layoutCalculator = new LayoutCalculator(this._unitConverter)
    this._hitRegionDetector = new HitRegionDetector(groupConfig.resizeTargetMinimumSize)
    this._cursorManager = new CursorManager(groupConfig.element.ownerDocument)

    this._boundHandlePointerDown = this._handlePointerDown.bind(this)
    this._boundHandlePointerMove = this._handlePointerMove.bind(this)
    this._boundHandlePointerUp = this._handlePointerUp.bind(this)

    if (panelConfigs) {
      panelConfigs.forEach(config => this.registerPanel(config))
    }
  }

  /**
   * @returns {Event}
   * @description 取得事件類型常數
   */
  get Event() {
    return Event
  }

  /**
   * @param {PanelConfig} config - panel 配置
   * @returns {string} panelId
   * @description 註冊 panel，回傳 panelId。只做註冊，不觸發重算
   * @example
   * manager.registerPanel({ id: 'main', element: mainEl, defaultSize: '70%' })
   */
  registerPanel(config) {
    const panelData = {
      id: config.id,
      element: config.element,
      config,
      constraints: null
    }

    this._panels = append(panelData, this._panels)

    return config.id
  }

  /**
   * @param {string} panelId - panel 識別
   * @returns {void}
   * @description 反註冊 panel
   * @example
   * manager.unRegisterPanel('side')
   */
  unRegisterPanel(panelId) {
    this._panels = reject(panel => panel.id === panelId)(this._panels)
  }

  /**
   * @param {string} event - 事件名稱
   * @param {Function} callback - 事件回呼
   * @returns {void}
   * @description 註冊事件監聽，支援同一事件多個 callback
   * @example
   * manager.on(manager.Event.LayoutChange, (layoutResult) => { })
   */
  on(event, callback) {
    const listeners = this._eventListeners.get(event) || []
    this._eventListeners.set(event, append(callback, listeners))
  }

  /**
   * @param {string} event - 事件名稱
   * @param {Function} callback - 原始 callback 參照
   * @returns {void}
   * @description 取消事件監聽，需傳入原始 callback 參照。找不到時不報錯
   * @example
   * manager.off(manager.Event.LayoutChange, handleLayoutChange)
   */
  off(event, callback) {
    const listeners = this._eventListeners.get(event)

    if (listeners) {
      const filtered = reject(listener => listener === callback)(listeners)
      this._eventListeners.set(event, filtered)
    }
  }

  /**
   * @returns {LayoutResult} 初始 layout
   * @description 計算初始 layout、啟動 ResizeObserver 與 pointer 事件監聽、回傳初始 LayoutResult。
   * 已 active 時再呼叫會先 deactivate 再重新啟動。
   * @example
   * const layoutResult = manager.activate()
   */
  activate() {
    if (this._active) {
      this.deactivate()
    }

    this._sortPanelsByDom()

    const availableSize = this._getAvailableSize()
    this._computeAllConstraints(availableSize)

    this._layout = this._layoutCalculator.calculateInitialLayout(this._panels, availableSize)
    this._active = true

    this._startResizeObserver()
    this._bindPointerEvents()

    return this._toLayoutResult()
  }

  /**
   * @private
   * @returns {void}
   * @description 依 DOM 位置（offsetLeft）排序 panels
   * @example
   * this._sortPanelsByDom()
   * // this._panels 依 element.offsetLeft 升冪重新排列
   */
  _sortPanelsByDom() {
    this._panels = sortBy(panel => panel.element.offsetLeft)(this._panels)
  }

  /**
   * @private
   * @returns {number} 容器可用寬度（px）
   * @description 取得 Group 容器的 clientWidth 作為可用空間
   * @example
   * const availableSize = this._getAvailableSize() // 800
   */
  _getAvailableSize() {
    return this._config.element.clientWidth
  }

  /**
   * @private
   * @param {number} availableSize - 容器可用寬度（px）
   * @returns {void}
   * @description 從原始 PanelConfig 重新推導所有 panel 的 PanelConstraints
   * @example
   * this._computeAllConstraints(800)
   * // this._panels 每個元素的 constraints 被重新計算
   */
  _computeAllConstraints(availableSize) {
    this._panels = map(panel => ({
      ...panel,
      constraints: this._computeConstraints(panel.config, availableSize)
    }))(this._panels)
  }

  /**
   * @private
   * @param {PanelConfig} config - panel 原始配置
   * @param {number} availableSize - 容器可用寬度（px）
   * @returns {PanelConstraints} 衍生百分比約束
   * @description 將 PanelConfig 的 minSize / maxSize 轉換為百分比約束
   * @example
   * this._computeConstraints({ minSize: '200px', maxSize: '80%' }, 1000)
   * // { minSize: 20, maxSize: 80 }
   */
  _computeConstraints(config, availableSize) {
    const minSizeRaw = isNil(config.minSize) ? DefaultMinSize : config.minSize
    const maxSizeRaw = isNil(config.maxSize) ? DefaultMaxSize : config.maxSize

    const minParsed = this._unitConverter.parse(minSizeRaw)
    const maxParsed = this._unitConverter.parse(maxSizeRaw)

    return {
      minSize: this._unitConverter.toPercent(minParsed, availableSize),
      maxSize: this._unitConverter.toPercent(maxParsed, availableSize)
    }
  }

  /**
   * @private
   * @returns {void}
   * @description 建立 ResizeObserver 並開始觀察 Group 容器
   * @example
   * this._startResizeObserver()
   */
  _startResizeObserver() {
    this._resizeObserver = new ResizeObserver(entries => this._handleResize(entries))
    this._resizeObserver.observe(this._config.element)
  }

  /**
   * @private
   * @returns {void}
   * @description 在 document 層級綁定 pointer 事件
   * @example
   * this._bindPointerEvents()
   */
  _bindPointerEvents() {
    const doc = this._config.element.ownerDocument
    doc.addEventListener('pointerdown', this._boundHandlePointerDown)
    doc.addEventListener('pointermove', this._boundHandlePointerMove)
    doc.addEventListener('pointerup', this._boundHandlePointerUp)
  }

  /**
   * @private
   * @returns {LayoutResult} 包裝後的 layout
   * @description 將內部 Layout 轉換為 LayoutResult 格式
   * @example
   * this._toLayoutResult()
   * // { main: { size: 70, element: HTMLElement }, side: { size: 30, element: HTMLElement } }
   */
  _toLayoutResult() {
    const entries = map(panel => [
      panel.id,
      { size: this._layout[panel.id], element: panel.element }
    ])(this._panels)

    return fromPairs(entries)
  }

  /**
   * @returns {void}
   * @description 停止計算與監聽，已註冊的 panels 和事件保留。可重複呼叫 activate / deactivate 循環
   * @example
   * manager.deactivate()
   */
  deactivate() {
    this._active = false

    this._stopResizeObserver()
    this._unbindPointerEvents()

    if (!this._config.disableCursor) {
      this._cursorManager.reset()
    }

    this._resetDragState()
  }

  /**
   * @private
   * @returns {void}
   * @description 斷開 ResizeObserver
   * @example
   * this._stopResizeObserver()
   */
  _stopResizeObserver() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect()
      this._resizeObserver = null
    }
  }

  /**
   * @private
   * @returns {void}
   * @description 從 document 移除 pointer 事件
   * @example
   * this._unbindPointerEvents()
   */
  _unbindPointerEvents() {
    const doc = this._config.element.ownerDocument
    doc.removeEventListener('pointerdown', this._boundHandlePointerDown)
    doc.removeEventListener('pointermove', this._boundHandlePointerMove)
    doc.removeEventListener('pointerup', this._boundHandlePointerUp)
  }

  /**
   * @private
   * @returns {void}
   * @description 重置 DragState 與 pointerCapture 旗標
   * @example
   * this._resetDragState()
   * // this._dragState = { dragging: false, initialLayout: null, pointerDownAt: null, activeBoundaryIndex: null }
   */
  _resetDragState() {
    this._dragState = {
      dragging: false,
      initialLayout: null,
      pointerDownAt: null,
      activeBoundaryIndex: null
    }
    this._pointerCaptured = false
  }

  /**
   * @returns {LayoutResult|null} 當前 layout，未啟動時回傳 null
   * @description 取得當前 layout
   * @example
   * const layoutResult = manager.getLayout()
   */
  getLayout() {
    return this._layout === null
      ? null
      : this._toLayoutResult()
  }

  /**
   * @private
   * @param {PointerEvent} event
   * @returns {void}
   * @description pointerdown handler — 命中偵測、建立 DragState、設定拖曳游標、觸發 LayoutChange
   * @example
   * document.addEventListener('pointerdown', this._boundHandlePointerDown)
   */
  _handlePointerDown(event) {
    const dragTarget = this._resolveDragTarget(event)

    if (dragTarget) {
      this._dragState = {
        dragging: true,
        initialLayout: { ...this._layout },
        pointerDownAt: { x: event.clientX, y: event.clientY },
        activeBoundaryIndex: dragTarget.hitResult.boundaryIndex
      }

      if (!this._config.disableCursor) {
        this._cursorManager.setDrag(ConstraintDirection.None)
      }

      this._emit(Event.LayoutChange, this._toLayoutResult())
      event.preventDefault()
    }
  }

  /**
   * @private
   * @param {PointerEvent} event
   * @returns {DragTarget|null} 命中結果與相鄰 panel，無法拖曳時回傳 null
   * @description 判斷 pointerdown 是否構成有效拖曳目標：檢查 active 狀態、命中偵測、panel disabled
   * @example
   * const dragTarget = this._resolveDragTarget(pointerEvent)
   * // { hitResult, leftPanel, rightPanel } 或 null
   */
  _resolveDragTarget(event) {
    const canDrag = this._active && !this._config.disabled
    let dragTarget = null

    if (canDrag) {
      const hitResult = this._hitRegionDetector.detect(event.clientX, event.clientY, this._panels)

      if (hitResult.hit) {
        const leftPanel = this._panels[hitResult.boundaryIndex]
        const rightPanel = this._panels[hitResult.boundaryIndex + 1]
        const panelsEnabled = !leftPanel.config.disabled && !rightPanel.config.disabled

        if (panelsEnabled) {
          dragTarget = { hitResult, leftPanel, rightPanel }
        }
      }
    }

    return dragTarget
  }

  /**
   * @private
   * @param {string} event - 事件名稱
   * @param {LayoutResult} layoutResult - 事件 payload
   * @returns {void}
   * @description 廣播事件給所有已註冊的 callback
   * @example
   * this._emit(Event.LayoutChange, this._toLayoutResult())
   */
  _emit(event, layoutResult) {
    const listeners = this._eventListeners.get(event) || []
    listeners.forEach(callback => callback(layoutResult))
  }

  /**
   * @private
   * @param {PointerEvent} event
   * @returns {void}
   * @description pointermove handler — 非拖曳中做 hover 偵測；拖曳中計算 delta、更新 layout、偵測 iframe 指標釋放
   * @example
   * document.addEventListener('pointermove', this._boundHandlePointerMove)
   */
  _handlePointerMove(event) {
    if (!this._active) {
      // inactive — no-op
    } else if (!this._dragState.dragging) {
      this._handleHoverDetection(event)
    } else if (event.buttons === PointerButtonNone) {
      this._endDrag()
    } else {
      this._capturePointerOnce(event)
      this._processDragMove(event)
    }
  }

  /**
   * @private
   * @param {PointerEvent} event
   * @returns {void}
   * @description 非拖曳狀態下的 hover 偵測，命中邊界時設定 hover cursor，離開時 reset
   * @example
   * this._handleHoverDetection(pointerEvent)
   */
  _handleHoverDetection(event) {
    if (!this._config.disableCursor) {
      const hitResult = this._hitRegionDetector.detect(event.clientX, event.clientY, this._panels)

      if (hitResult.hit) {
        this._cursorManager.setHover()
      } else {
        this._cursorManager.reset()
      }
    }
  }

  /**
   * @private
   * @param {PointerEvent} event
   * @returns {void}
   * @description 首次 pointermove 時延遲呼叫 setPointerCapture，避免影響 click 事件
   * @example
   * this._capturePointerOnce(pointerEvent)
   */
  _capturePointerOnce(event) {
    if (!this._pointerCaptured) {
      event.target.setPointerCapture(event.pointerId)
      this._pointerCaptured = true
    }
  }

  /**
   * @private
   * @param {PointerEvent} event
   * @returns {void}
   * @description 拖曳中的 delta 計算、layout 更新、cursor 方向更新
   * @example
   * this._processDragMove(pointerEvent)
   */
  _processDragMove(event) {
    const availableSize = this._getAvailableSize()
    const deltaPixels = event.clientX - this._dragState.pointerDownAt.x
    const deltaPercent = (deltaPixels / availableSize) * 100

    const newLayout = this._layoutCalculator.adjustLayoutByDelta(
      this._dragState.initialLayout,
      deltaPercent,
      this._dragState.activeBoundaryIndex,
      this._panels
    )

    const layoutChanged = !this._layoutCalculator.layoutsEqual(newLayout, this._layout)

    if (layoutChanged) {
      this._layout = newLayout
      this._emit(Event.LayoutChange, this._toLayoutResult())
    }

    if (!this._config.disableCursor) {
      const constraintDirection = this._detectConstraintDirection(newLayout)
      this._cursorManager.setDrag(constraintDirection)
    }
  }

  /**
   * @private
   * @param {Layout} layout - 當前 layout
   * @returns {ConstraintDirection} 約束方向
   * @description 偵測拖曳中的約束方向，用於設定方向性 cursor
   * @example
   * this._detectConstraintDirection({ main: 30, side: 70 })
   * // ConstraintDirection.Start（left panel 達到 minSize）
   */
  _detectConstraintDirection(layout) {
    const boundaryIndex = this._dragState.activeBoundaryIndex
    const leftPanel = this._panels[boundaryIndex]
    const rightPanel = this._panels[boundaryIndex + 1]

    const leftSize = layout[leftPanel.id]
    const rightSize = layout[rightPanel.id]

    const leftAtMin = this._roundToFixed(leftSize) <= this._roundToFixed(leftPanel.constraints.minSize)
    const leftAtMax = this._roundToFixed(leftSize) >= this._roundToFixed(leftPanel.constraints.maxSize)
    const rightAtMin = this._roundToFixed(rightSize) <= this._roundToFixed(rightPanel.constraints.minSize)
    const rightAtMax = this._roundToFixed(rightSize) >= this._roundToFixed(rightPanel.constraints.maxSize)

    if (leftAtMin || rightAtMax) {
      return ConstraintDirection.Start
    }

    if (leftAtMax || rightAtMin) {
      return ConstraintDirection.End
    }

    return ConstraintDirection.None
  }

  /**
   * @private
   * @param {number} value - 待格式化的數值
   * @returns {number} 四捨五入到小數第三位的數值
   * @description 浮點容差格式化，與 LayoutCalculator 一致的精度
   * @example
   * this._roundToFixed(33.3335) // 33.334
   */
  _roundToFixed(value) {
    return parseFloat(value.toFixed(LayoutCalculator.Precision))
  }

  /**
   * @private
   * @returns {void}
   * @description 結束拖曳 — 重置 DragState、還原 cursor、觸發 LayoutChanged
   * @example
   * this._endDrag()
   */
  _endDrag() {
    this._resetDragState()

    if (!this._config.disableCursor) {
      this._cursorManager.reset()
    }

    this._emit(Event.LayoutChanged, this._toLayoutResult())
  }

  /**
   * @private
   * @param {PointerEvent} event
   * @returns {void}
   * @description pointerup handler — 拖曳中時結束拖曳
   * @example
   * document.addEventListener('pointerup', this._boundHandlePointerUp)
   */
  _handlePointerUp(event) {
    if (this._dragState.dragging) {
      this._endDrag()
      event.preventDefault()
    }
  }

  /**
   * @private
   * @param {ResizeObserverEntry[]} entries
   * @returns {void}
   * @description ResizeObserver callback — 容器尺寸變化時重算約束、驗證 layout
   * @example
   * new ResizeObserver(entries => this._handleResize(entries))
   */
  _handleResize(entries) {
    const entry = entries[0]
    const { width } = entry.contentRect

    if (width !== 0) {
      this._computeAllConstraints(width)

      const validatedLayout = this._layoutCalculator.validateLayout(this._layout, this._panels)
      const layoutChanged = !this._layoutCalculator.layoutsEqual(validatedLayout, this._layout)

      if (layoutChanged) {
        this._layout = validatedLayout
        this._emit(Event.LayoutChange, this._toLayoutResult())
      }
    }
  }
}

/**
 * @typedef {Object} GroupConfig
 * @property {HTMLElement} element - Group 容器 DOM 參照
 * @property {boolean} [disabled=false] - 停用整組 resize
 * @property {boolean} [disableCursor=false] - 關閉游標管理
 * @property {import('./HitRegionDetector.js').ResizeTargetMinimumSize} [resizeTargetMinimumSize] - 命中區域大小
 */

/**
 * @typedef {Object.<string, {size: number, element: HTMLElement}>} LayoutResult
 * key 為 panelId，value 含百分比 size 與 DOM 參照
 */
