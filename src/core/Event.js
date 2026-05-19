/**
 * @enum {string}
 * @readonly
 * @property {string} LayoutChange - 拖曳中每幀觸發
 * @property {string} LayoutChanged - 拖曳結束觸發
 * @description ResizableGroupManager 事件類型
 */
export const Event = Object.freeze({
  LayoutChange: 'layoutChange',
  LayoutChanged: 'layoutChanged'
})
