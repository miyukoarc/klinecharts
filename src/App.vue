<template>
  <div id="app">
    <div id="tv_chart_container">
    </div>
  </div>
</template>

<script>
import {KlineCharts} from './views/Kline'
export default {
  data(){
    return{}
  },
  mounted(){
  },
  mixins: [KlineCharts]
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
