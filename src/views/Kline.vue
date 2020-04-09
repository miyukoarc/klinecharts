<template>
  <div id="tv_chart_container" style="width:100%;height:400px;">
    <div class="mask"></div>
  </div>
</template>

<script>
import { TradingView, Datafeed } from 'trader-view'
import { IChartingLibraryWidget, IDatafeed } from 'trader-view'
import {
  chartResolution,
  serverResolution,
  chartStyle
} from '../utils/resolution'
import { LibrarySymbolInfo, Bar } from 'trader-view'

import stomp from 'webstomp-client'
import SockJS from 'sockjs-client'

export default {
  data() {
    return {
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
      overrides: {
        'mainSeriesProperties.style': chartStyle['Area'],
      },
      historySub: null,
      tickerSub: null
    }
  },
  watch: {
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
        console.log('--isLoading--',newVal)
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    /**
     * widgetReady钩子
     */
    watchWidget(func) {
      if (this.widget) {
        this.widget.onChartReady(() => {
          this.widget.applyOverrides(this.overrides)
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
          console.log(parseData)
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

      console.log(list,'历史消息')

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
        `http://10.10.10.245:20007/websocket?access_token=8c3b8898-bb27-4d19-92ff-8a564a151f42`
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
            this.hasSubHistory
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
          //   'adaptive_logo',//移动端图标
          'property_pages',
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
          //   'volume_force_overlay',
          'pane_context_menu',
          'timezone_menu',
          'symbol_info',
          'chart_markup_table',
          'control_bar',
          // 'header_indicators' ,//指标btn
          //   'study_templates'
          'create_volume_indicator_by_default',//默认指标交易量
        ],
        enabled_features: [
          'header_widget', //顶部工具栏
          'header_resolutions', //分辨率
          
        ],
        charts_storage_url: 'http://saveload.tradingview.com',
        charts_storage_api_version: '1.1',
        client_id: 'tradingview.com',
        user_id: 'public_user_id',
        // debug: true,
        theme: 'Dark',
        timezone: 'Asia/Shanghai'
      })

      this.watchWidget()
    },
    /**
     * 获取块
     */
    async getBars(symbol, resolution, from, to, isFirst) {
      console.warn('----isFirst----', isFirst)
      if (this.resolution !== resolution && this.socketJS) {
        console.log('切换分辨率', resolution)

        this.resolution = resolution

        const ps = new Promise((resolve,reject)=>{
            this.tickerSub.unsubscribe()
            this.subTicker(resolution)
            
            resolve()
        })

        ps.then(()=>{
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

      if(!isFirst){
        
        console.warn(data)
        this.klineData = []
        this.awaitCount = 0
        return {
          bars: data,
          // meta: {
          //   noData: false
          // }
        }
      }

      if(isFirst){
        this.klineData = []
        this.awaitCount = 0
        return {
          bars: data,
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
          supported_resolutions: ['1', '5', '15', '30', '60', 'D'
          /*, '1W', '1M'*/
          ]
          /**
           * @example (for ex.: "1,5,60") - only these resolutions will be requested, all others will be built using them if possible
           */
          // intraday_multipliers?: string[];
          // has_seconds?: boolean;
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
          supported_resolutions: ['1', '5', '15', '30', '60', 'D'
          // , '1W', '1M'
          ]
        }
      })
    }
  },
  created() {
    this.initDatafeed()
    this.initSockJs()
  },
  mounted() {
    window.addEventListener(
      'DOMContentLoaded',
      this.initTradingView.bind(this),
      false
    )
  }
}
</script>

<style lang="scss" scoped>
</style>