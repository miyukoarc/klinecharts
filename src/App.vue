<template>
  <div id="app">
    <!-- <div id="tv_chart_container">
    </div> -->
    <kline-chart/>
  </div>
</template>

<script>
import {KlineCharts} from './views/Kline.js'
import KlineChart from './views/Kline.vue'
export default {
  components: {
    KlineChart
  },
  data(){
    return{}
  },
  mounted(){
  },
  // mixins: [KlineCharts]
}
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

</style>
