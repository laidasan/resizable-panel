/**
 * @enum {string}
 * @readonly
 * @property {string} PreservePixelSize 容器 resize 時保持像素尺寸不變
 * @property {string} PreserveRelativeSize 容器 resize 時保持相對比例不變
 * @description 容器 resize 時的 panel 尺寸保持策略
 */
export const GroupResizeBehavior = Object.freeze({
  PreservePixelSize: 'preserve-pixel-size',
  PreserveRelativeSize: 'preserve-relative-size',
})
