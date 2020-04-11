import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import echarts from 'echarts'
import dayjs from 'dayjs'

import 'echarts/lib/chart/bar'
import "echarts/lib/chart/bar";
import "echarts/lib/chart/line";
import "echarts/lib/chart/pie";
import 'echarts/lib/component/dataZoom'
import 'echarts/lib/component/dataZoomSelect'
import 'echarts/lib/component/dataZoomSlider'
import 'echarts/lib/component/dataZoomInside'
import 'echarts/lib/chart/candlestick'
import "echarts/lib/component/tooltip";
import "echarts/lib/component/legend";
import "echarts/lib/component/markPoint";
import "echarts/lib/component/markLine";
import "echarts/lib/component/graphic";

Vue.config.productionTip = false

Vue.prototype.$echarts = echarts
Vue.prototype.$dayjs = dayjs

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
