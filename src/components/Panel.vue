<template>
  <div :style="outerStyle">
    <div class="resizable-panel__content">
      <slot />
    </div>
  </div>
</template>

<script>
/**
 * @class Panel
 * @classdesc Resizable panel 元件，純渲染層。接收 Manager 算好的百分比，透過 flex CSS 控制尺寸。
 * 雙層 div 結構：外層由 Manager 控制尺寸（flex），內層為使用者內容區域（slot + overflow）。
 *
 * @param {string} panelId - panel 識別 ID
 * @param {number} size - Manager 計算後的百分比值，作為 flex-grow 使用
 *
 * @example
 * <Panel panelId="main" :size="panelLayout.main">
 *   <p>Content here</p>
 * </Panel>
 */
export default {
  name: 'Panel',

  props: {
    panelId: {
      type: String,
      required: true
    },

    size: {
      type: Number,
      default: 0
    }
  },

  computed: {
    /**
     * @returns {Object} flex CSS 樣式物件
     * @description 根據 size 產生外層 div 的 flex 佈局樣式
     * @example
     * // size = 70
     * // outerStyle => { flexBasis: 0, flexGrow: 70, flexShrink: 1 }
     */
    outerStyle() {
      return {
        flexBasis: 0,
        flexGrow: this.size,
        flexShrink: 1
      }
    }
  }
}
</script>
