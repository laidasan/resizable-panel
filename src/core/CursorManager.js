import { Cursor } from "./Cursor.js"
import { CursorState } from "./CursorState.js"
import { ConstraintDirection } from "./ConstraintDirection.js"

const CursorDirectionMap = {
  [ConstraintDirection.None]: Cursor.ColResize,
  [ConstraintDirection.Start]: Cursor.Eresize,
  [ConstraintDirection.End]: Cursor.Wresize
}

const None = 'none'

/**
 * @class CursorManager
 * @classdesc 管理拖曳期間的全域游標樣式，在 document.body 上設定 cursor 與 user-select
 * @param {Document} document - 作用目標的 Document 物件
 * @example
 * const manager = new CursorManager(document)
 * manager.setHover()       // cursor: col-resize
 * manager.setDrag('none')  // cursor: col-resize, user-select: none
 * manager.reset()          // 移除所有樣式
 */
export class CursorManager {

  _document = null
  _state = null

  constructor(document) {
    this._document = document
    this._state = { state: CursorState.Idle, constraintDirection: ConstraintDirection.None }
  }

  /**
   * @returns {void}
   * @description 進入 hover 狀態，設定 col-resize cursor
   * @example
   * manager.setHover() // body.style.cursor = 'col-resize'
   */
  setHover() {
    this._state = { state: CursorState.Horver, constraintDirection: ConstraintDirection.None }
    this._document.body.style.cursor = Cursor.ColResize
  }

  /**
   * @param {ConstraintDirection} constraintDirection - 約束方向
   * @returns {void}
   * @description 進入 drag 狀態，根據約束方向設定對應 cursor，並禁止文字選取
   * @example
   * manager.setDrag('start') // body.style.cursor = 'e-resize'
   */
  setDrag(constraintDirection) {
    this._state = { state: CursorState.Drag, constraintDirection }
    this._document.body.style.cursor = CursorDirectionMap[constraintDirection]
    this._document.body.style.userSelect = None
  }

  /**
   * @returns {void}
   * @description 進入 disabled 狀態，設定 not-allowed cursor
   * @example
   * manager.setDisabled() // body.style.cursor = 'not-allowed'
   */
  setDisabled() {
    this._state = { state: CursorState.Disabled, constraintDirection: ConstraintDirection.None }
    this._document.body.style.cursor = Cursor.NotAllowed
  }

  /**
   * @returns {void}
   * @description 回到 idle 狀態，移除所有 body 樣式修改
   * @example
   * manager.reset() // body.style.cursor = '', body.style.userSelect = ''
   */
  reset() {
    this._state = { state: CursorState.Idle, constraintDirection: ConstraintDirection.None }
    this._document.body.style.cursor = ''
    this._document.body.style.userSelect = ''
  }
}
