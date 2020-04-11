
<script>
import { TradingView, Datafeed } from 'trader-view'
import { IChartingLibraryWidget, IDatafeed } from 'trader-view'
import {
  chartResolution,
  serverResolution,
  chartStyle
} from '../utils/resolution'
import { LibrarySymbolInfo, Bar } from 'trader-view'
import EchartsLine from './kline-echart'

import stomp from 'webstomp-client'
import SockJS from 'sockjs-client'

export default {
  components:{
    EchartsLine
  },
  data() {
    return {
      showEcharts: false,
      tempStamp: 0,
      tickerCount: 0,
      data: [],
      myChart: null,
      widget: null,
      datafeed: null,
      socket: null,
      klineData: [],
      resolution: '1',
      awaitCount: 0,
      isLoading: false,
      socketJS: null,
      stompClient: null,
      tickerTimestamp: 0,
      historyTimestamp: 0,
      hasSubHistory: false,
      hasMA5: false,
      hasMA10: false,
      hasIndicator: false,
      overrides: {
        // 'mainSeriesProperties.style': chartStyle['Area']
      },
      historySub: null,
      tickerSub: null,
      echartsSeed: [],
      
    }
  },
  watch: {
    echartsSeed: {
      handler(newVal, oldVal){
        this.myChart.setOption({
            series: [{
                data: newVal
            }]
        });
      }
    },
    resolution: {
      handler(newVal, oldVal) {
        console.warn(
          '<<<<<<<<<<<<<<<<--分辨率改变了-->>>>>>>>>>>>>>>>',
          oldVal + '=>' + newVal
        )
        if (this.resolution == '1') {
          this.widget.onChartReady(() => {
            this.widget.applyOverrides({
              'mainSeriesProperties.style': chartStyle['Area']
            })
          })
        } else {
          this.widget.onChartReady(() => {
            this.widget.applyOverrides({
              'mainSeriesProperties.style': chartStyle['Candles']
            })
          })
        }
      },
      deep: true
      // immediate: true
    },
    klineData: {
      handler(newVal, oldVal) {},
      deep: true
    },
    isLoading: {
      handler(newVal, oldVal) {
        console.log('--isLoading--', newVal)
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    initWidgetBtn() {
      if (this.widget) {
        this.widget.headerReady().then(() => {
          const btnTS = this.widget.createButton()
          btnTS.setAttribute('title','btnTS')
          btnTS.addEventListener('click',() => {
            this.showEcharts = !this.showEcharts
          })
          btnTS.textContent = '分时'

          const btnMA5 = this.widget.createButton()
          btnMA5.setAttribute('title', 'My custom button tooltip')
          btnMA5.addEventListener('click', () => {
            if(this.hasMA5==false){
              this.watchWidget(this.initMA5)
            }
            this.hasMA5 = true
            
            if(this.showEcharts){
              this.showEcharts = !this.showEcharts
            }
          })
          btnMA5.textContent = 'MA 5'

          const btnMA10 = this.widget.createButton()
          btnMA10.setAttribute('title', 'My custom button tooltip')
          btnMA10.addEventListener('click', () => {
            if(this.hasMA10==false){
              this.watchWidget(this.initMA10)
            }
            this.hasMA10 = true
            
            if(this.showEcharts){
              this.showEcharts = !this.showEcharts
            }
          })
          btnMA10.textContent = 'MA10'

          const btnBOLL = this.widget.createButton()
          btnBOLL.setAttribute('title', 'My custom button tooltip')
          btnBOLL.addEventListener('click', () => {
            // this.widget.chart().executeActionById('studyHide')
            this.widget.chart().removeAllStudies()

            this.watchWidget(this.initBoll)

            
            if(this.showEcharts){
              this.showEcharts = !this.showEcharts
            }
          })
          btnBOLL.textContent = 'BOLL'

          const btnKDJ = this.widget.createButton()
          btnKDJ.setAttribute('title', 'My custom button tooltip')
          btnKDJ.addEventListener('click', () => {
            // this.widget.chart().executeActionById('studyHide')
            this.widget.chart().removeAllStudies()
              this.watchWidget(this.initKDJ)
              console.log(this.widget.chart().getAllStudies())

            
            if(this.showEcharts){
              this.showEcharts = !this.showEcharts
            }
          })
          btnKDJ.textContent = 'KDJ'

          const btnRSI = this.widget.createButton()
          btnRSI.setAttribute('title', 'My custom button tooltip')
          btnRSI.addEventListener('click', () => {
            // this.widget.chart().executeActionById('studyHide')
            this.widget.chart().removeAllStudies()

              this.watchWidget(this.initRSI)
            

            
            if(this.showEcharts){
              this.showEcharts = !this.showEcharts
            }
          })
          btnRSI.textContent = 'RSI'

          const btnWR = this.widget.createButton()
          btnWR.setAttribute('title', 'My custom button tooltip')
          btnWR.addEventListener('click', () => {
            // this.widget.chart().executeActionById('studyHide')
            this.widget.chart().removeAllStudies()

              this.watchWidget(this.initWR)

            
            if(this.showEcharts){
              this.showEcharts = !this.showEcharts
            }
          })
          btnWR.textContent = 'WR'
        })
      }
    },
    initMA5() {
      this.widget
        .chart()
        .createStudy('Moving Average', false, false, [5], {
          'Plot.linewidth': 4
        })
    },
    initMA10() {
      this.widget
        .chart()
        .createStudy('Moving Average', false, false, [10], {
          'Plot.linewidth': 4
        })
    },
    initBoll() {
      this.widget
        .chart()
        .createStudy('Bollinger Bands %B', false, false, [20, 2])
    },
    initKDJ() {
      this.widget.chart().createStudy('Stochastic', false, false, [14, 1, 3])
    },
    initRSI() {
      this.widget
        .chart()
        .createStudy('Relative Strength Index', false, false, [14])
    },
    initWR() {
      this.widget.chart().createStudy('Williams %R', false, false, [14])
    },
    initWidgetOption() {
      this.widget.applyOverrides(this.overrides)
    },
    /**
     * widgetReady钩子
     */
    watchWidget(func, val) {
      if (this.widget) {
        this.widget.onChartReady(() => {
          func(val)
        })
      }
    },
    /**
     *
     * 订阅历史消息
     */
    subHistory(resolution) {
      this.historySub = this.stompClient.subscribe(
        `/topic/batch.kline.${chartResolution[resolution]}.btcusdt`,
        async msg => {
          let body = JSON.parse(msg.body)
          let context = JSON.parse(body.context)
          let parseData = context.data

          console.warn(body)

          // parseData.forEach((item,index)=>{
          //   this.echartsSeed.push({
          //     name: this.$dayjs(item.timestamp*1000).$d,
          //     value: [this.$dayjs(item.timestamp*1000).format('HH:mm:ss'), item.low]
          //   })
          // })

          this.handleHistory(parseData)
        }
      )
    },
    /**
     *
     * 订阅实时消息
     */ subTicker(resolution) {
      this.tickerSub = this.stompClient.subscribe(
        `/topic/kline.${chartResolution[resolution]}.btcusdt`,
        async msg => {
          let body = JSON.parse(msg.body)
          let context = JSON.parse(body.context)
          let parseData = context.data

          if(this.echartsSeed.length>100){
            this.echartsSeed.shift()
          }

          // console.log(body)
          // if(body.timestamp-this.tempStamp>1000){

            // this.tempStamp = body.timestamp

          //   this.echartsSeed.push({
          //     name: this.$dayjs(body.timestamp*1000).$d,
          //     value: [this.$dayjs(body.timestamp*1000).format('HH:mm:ss'), parseData.low]
          // })
            
          // }

          
          this.handleTicker(parseData)
        }
      )
    },
    /**
     * 处理历史数据
     */
    handleHistory(data) {
      const list = []
      const is1D = this.resolution === 'D'

      for (let i = 0; i < data.length; i++) {
        if (this.historyTimestamp != data[i].timestamp) {
          this.historyTimestamp = data[i].timestamp
          list.push({
            time: data[i].id * 1000,
            open: data[i].open,
            high: data[i].high,
            low: data[i].low,
            close: data[i].close,
            volume: data[i].amount
          })
        }
      }

      list.sort((a, b) => a.time - b.time)

      console.log(list, '历史消息')

      this.klineData = list

      this.isLoading = true
      this.hasSubHistory = true

      // console.log(this.klineData, '历史数据')
    },
    /**
     * 处理实时数据
     */
    handleTicker(data) {
      const is1D = this.resolution === 'D'
      const bar = {
        time: data.id * 1000,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.amount
      }
      if (!this.datafeed) {
        return
      }
      // if(this.tickerTimestamp!=data.timestamp){
      this.datafeed.updateData({
        bars: [bar],
        meta: {
          noData: false
        }
      })
      // console.log(bar, 'ticker')
      // }
    },
    /**
     * 初始化WebSocket
     */
    initSockJs() {
      this.socketJS = new SockJS(
        `http://10.10.10.245:20007/websocket?access_token=0a6df1b5-20d4-44c5-b811-574a64cea210`
      )
      this.stompClient = stomp.over(this.socketJS, { debug: false })

      this.stompClient.connect({}, () => {
        const ps = new Promise((resolve, reject) => {
          this.subTicker(this.resolution)
          resolve()
        })



        ps.then(() => {
          this.subHistory(this.resolution)
        })

        
      })
    },
    /**
     * 异步延迟等待
     */
    delayAwait() {
      return new Promise((resolve, reject) => {
        this.awaitCount++
        console.log(`>> Await count:: ${this.awaitCount * 300}ms`)
        if (this.isLoading) {
          return resolve(this.klineData)
        } else {
          return this.awaitCount < 100 ? reject() : resolve()
        }
      }).catch(() => {
        return new Promise(resolve => {
          setTimeout(resolve, 300)
        }).then(() => this.delayAwait())
      })
    },

    /**
     * 初始化数据源
     */
    initDatafeed() {
      this.datafeed = new Datafeed({
        history: params => {
          return this.getBars(
            params.symbol,
            params.resolution,
            params.from,
            params.to,
            params.firstDataRequest
          ).then(d => d)
        },
        config: () => this.defaultConfig(),
        symbols: () => this.defaultSymbol(),
        time: () => new Promise(resolve => resolve(Date.now()))
        // quotes: () => new Promise(resolve => resolve({s: 'error', errmsg: 'error'}))
      })
    },
    /**
     * 初始化tradingview
     */
    initTradingView() {
      if (!this.datafeed) {
        return
      }
      this.widget = new TradingView({
        // debug: true, // uncomment this line to see Library errors and warnings in the console
        fullscreen: false,
        autosize: true,
        symbol: 'BTC/USDT',
        interval: this.resolution,
        container_id: 'tv_chart_container',

        //	BEWARE: no trailing slash is expected in feed URL
        datafeed: this.datafeed,
        library_path: '/charting_library/',
        locale: 'zh',

        overrides: {
          'mainSeriesProperties.style': 1
        },

        disabled_features: [
          'use_localstorage_for_settings',
          'left_toolbar', //左侧工具栏
          'header_symbol_search',
          'adaptive_logo', //移动端图标
          'property_pages', //指标设置
          'header_widget_dom_node', //顶部工具栏DOM节点

          'header_compare', //比较btn
          'header_settings', //设置btn
          'header_fullscreen_button', //全屏btn
          'header_saveload', //保存&读取btn

          'header_screenshot', //截屏btn
          'header_chart_type', //图表类型btn
          'header_undo_redo', //撤销&取消btn
          'header_interval_dialog_button', //不知道是啥

          'timeframes_toolbar', //底部事件工具栏
          'symbol_search_hot_key', //搜索热键
          // 'volume_force_overlay',//买卖数量和主界面重叠
          'pane_context_menu',
          'timezone_menu',
          // 'symbol_info',
          // 'chart_markup_table',
          // 'control_bar',
          'header_indicators' //指标btn
          //   'study_templates'
          // 'create_volume_indicator_by_default',//默认指标交易量
        ],
        enabled_features: [
          'header_widget', //顶部工具栏
          'header_resolutions' //分辨率
        ],
        charts_storage_url: 'http://saveload.tradingview.com',
        charts_storage_api_version: '1.1',
        client_id: 'tradingview.com',
        user_id: 'public_user_id',
        // debug: true,
        theme: 'Light',
        timezone: 'Asia/Shanghai'
      })

      this.initWidgetBtn()

      this.watchWidget(this.initWidgetOption)
    },
    /**
     * 获取块
     */
    async getBars(symbol, resolution, from, to, isFirst) {
      console.warn('----isFirst----', isFirst)
      if (this.resolution !== resolution && this.socketJS) {
        console.log('切换分辨率', resolution)

        this.resolution = resolution

        const ps = new Promise((resolve, reject) => {
          this.tickerSub.unsubscribe()
          this.subTicker(resolution)

          resolve()
        })

        ps.then(() => {
          this.subHistory(resolution)
        })
      }
      /**
       *
       */

      if (this.isLoading && !this.klineData.length) {
        this.isLoading = false
      }

      const data = await this.delayAwait()

      if (!isFirst) {
        console.warn(data)
        this.klineData = []
        this.awaitCount = 0
        return {
          bars: data
          // meta: {
          //   noData: false
          // }
        }
      }

      if (isFirst) {
        console.warn(data)
        // this.klineData = []
        this.awaitCount = 0
        return {
          bars: data
          // meta: {
          //   noData: true
          // }
        }
      }
    },
    defaultSymbol() {
      return new Promise(resolve => {
        resolve()
      }).then(() => {
        return {
          /**
           * Symbol Name
           */
          name: 'BTC/USDT',
          full_name: 'BTC/USDT',
          // base_name?: [string];
          /**
           * Unique symbol id
           */
          // ticker?: string;
          description: 'BTC/USDT',
          type: 'bitcoin',
          /**
           * @example "1700-0200"
           */
          session: '24x7',
          /**
           * Traded exchange
           * @example "NYSE"
           */
          exchange: 'BTB',
          listed_exchange: 'BTB',
          timezone: 'Asia/Shanghai',
          /**
           * Prices format: "price" or "volume"
           */
          format: 'price',
          /**
           * Code (Tick)
           * @example 8/16/.../256 (1/8/100 1/16/100 ... 1/256/100) or 1/10/.../10000000 (1 0.1 ... 0.0000001)
           */
          pricescale: Math.pow(10, 2),
          /**
           * The number of units that make up one tick.
           * @example For example, U.S. equities are quotes in decimals, and tick in decimals, and can go up +/- .01. So the tick increment is 1. But the e-mini S&P futures contract, though quoted in decimals, goes up in .25 increments, so the tick increment is 25. (see also Tick Size)
           */
          minmov: 1,
          // fractional?: boolean;
          /**
           * @example Quarters of 1/32: pricescale=128, minmovement=1, minmovement2=4
           */
          // minmove2?: number;
          /**
           * false if DWM only
           */
          has_intraday: true,
          /**
           * An array of resolutions which should be enabled in resolutions picker for this symbol.
           */
          supported_resolutions: [
            '1',
            '5',
            '15',
            '30',
            '60',
            'D'
            /*, '1W', '1M'*/
          ],
          /**
           * @example (for ex.: "1,5,60") - only these resolutions will be requested, all others will be built using them if possible
           */
          // intraday_multipliers?: string[];
          // has_seconds?: boolean;
          hase_seconds: true,
          seconds_multipliers: ['1S']

          /**
           * It is an array containing seconds resolutions (in seconds without a postfix) the datafeed builds by itself.
           */
          // seconds_multipliers?: string[];
          // has_daily?: boolean;
          // has_weekly_and_monthly?: boolean;
          // has_empty_bars?: boolean;
          // force_session_rebuild?: boolean;
          // has_no_volume?: boolean;
          /**
           * Integer showing typical volume value decimal places for this symbol
           */
          // volume_precision?: number;
          // data_status?: "streaming" | "endofday" | "pulsed" | "delayed_streaming";
          /**
           * Boolean showing whether this symbol is expired futures contract or not.
           */
          // expired?: boolean;
          /**
           * Unix timestamp of expiration date.
           */
          // expiration_date?: number;
          // sector?: string;
          // industry?: string;
          // currency_code?: string;
        }
      })
    },
    defaultConfig() {
      return new Promise(resolve => {
        resolve()
      }).then(() => {
        return {
          supports_search: true,
          supports_group_request: false,
          supports_marks: false,
          supports_timescale_marks: false,
          supports_time: true,
          // exchanges: [
          //   { value: "", name: "All Exchanges", desc: "" },
          //   { value: "NasdaqNM", name: "NasdaqNM", desc: "NasdaqNM" },
          //   { value: "NYSE", name: "NYSE", desc: "NYSE" },
          //   { value: "NCM", name: "NCM", desc: "NCM" },
          //   { value: "NGM", name: "NGM", desc: "NGM" }
          // ],
          // symbols_types: [
          //   { name: "All types", value: "" },
          //   { name: "Stock", value: "stock" },
          //   { name: "Index", value: "index" }
          // ],
          supported_resolutions: [
            '1',
            '5',
            '15',
            '30',
            '60',
            'D'
            // , '1W', '1M'
          ]
        }
      })
    },

    randomData() {
      let now = +new Date(1997, 9, 3);
      let oneDay = 24 * 3600 * 1000;
      let value = Math.random() * 1000;
      now = new Date(+now + oneDay);
      value = value + Math.random() * 21 - 10;
      return {
          name: now.toString(),
          value: [
              [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('/'),
              Math.round(value)
          ]
      };
    },
    initEchartsData(){
      function randomData() {
          now = new Date(+now + oneDay);
          value = value + Math.random() * 21 - 10;
          return {
              name: now.toString(),
              value: [
                  [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('/'),
                  Math.round(value)
              ]
          };
      }
      var now = +new Date(1997, 9, 3);
      var oneDay = 24 * 3600 * 1000;
      var value = Math.random() * 1000;
      for (var i = 0; i < 1000; i++) {
          this.data.push(randomData());
      }

      setInterval(()=> {

          for (var i = 0; i < 5; i++) {
              this.data.shift();
              this.data.push(randomData());
          }

      }, 1000);
      
    }
  },
  created() {
    this.initDatafeed()
    this.initSockJs()
  },
  mounted() {
    // this.getRealTime()
    // this.initEchartsData()
    // this.initEcharts()
    window.addEventListener(
      'DOMContentLoaded',
      this.initTradingView.bind(this),
      false
    )
  },
  render(){
    const isShow = this.showEcharts
    return (
      <div class="view-container">
        <div class="mask" style={{display: isShow?'none':'block'}}></div> 
        <div id="tv_chart_container" style={{width:'100%',height:'400px'}}></div>
        <div class="echart-container" style={{display: isShow?'block':'none'}}>
          <echarts-line />
        </div>
      </div>
    )
  }
}
</script>

<style lang="scss" scoped>
.mask{
  position: absolute;
      bottom: 4px;
    right: 4px;
    width: 56px;
    height: 25px;
  background-color: #fff;
}
.view-container {
  position: relative;
  top: 0;
  left: 0;
}
#echarts {
  position: absolute;
  background-color: #fff;
  top: 38px;
  left: 0px;
  width: 398px;
  height: 362px;
}
</style>