<template>
  <div
    class="resizable-panel "
    :style="{ flexGrow: size }"
  >
    <slot />
  </div>
</template>

<script>
/**
 * @author samura.chiu
 * @class Panel
 * @classdesc Resizable panel 元件，純渲染層。接收 Manager 算好的百分比，透過 flex CSS 控制尺寸。
 * @example
 * <Panel :size="panelLayout.main">
 *   <p>Content here</p>
 * </Panel>
 */
export default {
  name: 'Panel',

  props: {
    size: {
      type: Number,
      default: 0
    }
  }
}
</script>

<style lang="scss" scoped>
.resizable-panel {
  flex-basis: 0;
  flex-shrink: 1;
  min-width: 0;
}
</style>
