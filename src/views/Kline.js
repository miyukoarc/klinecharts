import {
  TradingView,
  Datafeed
} from "trader-view";
import {
  IChartingLibraryWidget,
  IDatafeed
} from "trader-view";
import {
  chartResolution,
  serverResolution
} from "../utils/resolution";
import {
  LibrarySymbolInfo,
  Bar
} from 'trader-view'

import stomp from "webstomp-client";
import SockJS from "sockjs-client";

export const KlineCharts = {
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
      isFirstSub: true,
      hasSubHistory: false
    }
  },
  watch: {
    'klineData': {
      handler(newVal, oldVal) {},
      deep: true
    },
    'isLoading': {
      handler(newVal, oldVal) {
        console.log(newVal)
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    /**
     * 
     * 订阅历史消息 
     */
    subHistory(){
      this.stompClient.subscribe(`/topic/batch.kline.${chartResolution[this.resolution]}.btcusdt`,async msg => {
        let body = JSON.parse(msg.body);
        let context = JSON.parse(body.context);
        let parseData = context.data;
        
        this.handleHistory(parseData)
        this.hasSubHistory = true
        // c.forEach((item, index, array) => {
        //   m.push([
        //     new Date(item.timestamp * 1000).toISOString(),
        //     item.open,
        //     item.close,
        //     item.low,
        //     item.high
        //   ]);
        //   console.info(item, '这里是历史数据')
        // });
      });
    }
    /**
     * 
     * 订阅实时消息
     */,
    subTicker(){
      this.stompClient.subscribe(`/topic/kline.${chartResolution[this.resolution]}.btcusdt`,async msg => {

        let body = JSON.parse(msg.body)
        let context = JSON.parse(body.context)
        let parseData = context.data
        console.log(parseData)
        this.handleTicker(parseData)
        this.hasSubHistory = false
        // if (p === c.timestamp) {
        //   return;
        // }
        // p = c.timestamp;
        // m.push([
        //   new Date(c.timestamp * 1000).toISOString(),
        //   c.open,
        //   c.close,
        //   c.low,
        //   c.high
        // ]);
        // if (m.length > 100) {
        //   m.pop();
        // }
        
      })
      
    },
    /**
     * 处理历史数据
    */
   handleHistory(data){
    const list = [];
    const is1D = this.resolution === "D";
    
    for (let i = 0; i < data.length; i++) {
      if(this.historyTimestamp!=data[i].timestamp){
        this.historyTimestamp = data[i].timestamp
        list.push({
          time: is1D ? data[i].id*1000 + 86400000 : data[i].id*1000,
          open: data[i].open,
          high: data[i].high,
          low: data[i].low,
          close: data[i].close,
          volume: data[i].amount,
        });

      }
      
    }
    
    list.sort((a, b) => a.time - b.time);
    
    this.klineData = list;
    this.isLoading = true
    console.log(this.klineData, '历史数据')
   },
   /**
    * 处理实时数据
    */
   handleTicker(data){

    const is1D = this.resolution === "D";
    const bar = {
      time: is1D ? data.id*1000 + 86400000 : data.id*1000,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.amount,
    };
    if (!this.datafeed) {
      return;
    }
    // if(this.tickerTimestamp!=data.timestamp){
      this.tickerTimestamp = data.timestamp
      this.datafeed.updateData({
        bars: [bar],
        meta: {
          noData: false
        },
      });
      console.log(bar,'ticker')
    // }
    
   },
    /**
     * 初始化WebSocket
     */
   initSockJs() {
      this.socketJS = new SockJS(`http://10.10.10.245:20007/websocket?access_token=7b3e23e3-2f4a-4531-8fd0-e4d19faa956f`)
      this.stompClient = stomp.over(this.socketJS,{debug:false})

      this.stompClient.connect({},() => {
        const ps = new Promise((resolve,reject)=>{
          this.subHistory()
          resolve()
        })


        ps.then(()=>{
          this.subTicker()
        })
        /**
         * 订阅历史数据
         */

        
        // this.stompClient.subscribe("/topic/batch.kline.1min.btcusdt",msg => {
        //   let body = JSON.parse(msg.body);
        //   let context = JSON.parse(body.context);
        //   let c = context.data;
          
        //  this.handleHistory(c)
        //  console.log(c)
        //   // c.forEach((item, index, array) => {
        //   //   m.push([
        //   //     new Date(item.timestamp * 1000).toISOString(),
        //   //     item.open,
        //   //     item.close,
        //   //     item.low,
        //   //     item.high
        //   //   ]);
        //   //   console.info(item, '这里是历史数据')
        //   // });
        // });

        /**
         * 订阅实时数据
         */
        
        // this.stompClient.subscribe("/topic/kline.1min.btcusdt", msg => {
        //   if (m.length <= 0) {
        //     return;
        //   }
        //   let body = JSON.parse(msg.body);
        //   let context = JSON.parse(body.context);
        //   let c = context.data;
        //   console.info(c, '这里是实时数据')
        //   this.handleTicker(c)
        //   // if (p === c.timestamp) {
        //   //   return;
        //   // }
        //   // p = c.timestamp;
        //   // m.push([
        //   //   new Date(c.timestamp * 1000).toISOString(),
        //   //   c.open,
        //   //   c.close,
        //   //   c.low,
        //   //   c.high
        //   // ]);
        //   // if (m.length > 100) {
        //   //   m.pop();
        //   // }
          
        // })

      })

    },
    initWebSocket() {

      this.socket = new WebSocket("wss://www.btb.io/websocket/api");

      this.socket.onopen = () => {
        if (!this.socket) return;
        const data = {
          event: "addChannel",
          channel: `market.BTC/USDT.kline.${chartResolution[this.resolution]}`,
        };
        this.socket.send(JSON.stringify(data));
      };

      this.socket.onmessage = (ev) => {
        this.onSocketMessage(ev.data);
      };
    },
    /**
     * 监听WebSocket响应
     * 
     */
    onSocketMessage(msg) {
      try {
        const _msg = JSON.parse(msg)
        const c = `market.BTC/USDT.kline.${chartResolution[this.resolution]}`
        // console.log(!!_msg,!!_msg.data,!this.isLoading , _msg.channel==c)
        if (_msg && _msg.data && !this.isLoading && _msg.channel === c) {
          this.forEachHistoryData(_msg.data)
        }
        if (_msg && _msg.ticker && this.isLoading && _msg.channel === c) {
          this.onTickerData(_msg.ticker)
        }
      } catch (err) {
        console.error(err)
      }
    },
    /**
     * 处理历史数据
     */
    forEachHistoryData(data) {
      const list = [];
      const is1D = this.resolution === "D";
      for (let i = 0; i < data.length; i++) {
        list.push({
          time: is1D ? data[i].time + 86400000 : data[i].time,
          open: data[i].open,
          high: data[i].hight,
          low: data[i].low,
          close: data[i].close,
          volume: data[i].amount,
        });
      }
      list.sort((a, b) => a.time - b.time);
      this.klineData = list;
      this.isLoading = true;
    },
    /**
     * 处理实时数据
     */
    onTickerData(data) {
      const is1D = this.resolution === "D";
      const bar = {
        time: is1D ? data.time + 86400000 : data.time,
        open: data.open,
        high: data.hight,
        low: data.low,
        close: data.close,
        volume: data.amount,
      };
      if (!this.datafeed) {
        return;
      }
      this.datafeed.updateData({
        bars: [bar],
        meta: {
          noData: false
        },
      });
    },
    /**
     * 异步延迟等待
     */
    delayAwait() {
      return new Promise((resolve, reject) => {
        this.awaitCount++;
        console.log(`>> Await count:: ${this.awaitCount * 300}ms`);
        if (this.isLoading) {
          return resolve(this.klineData);
        } else {
          return this.awaitCount < 100 ? reject() : resolve();
        }
      }).catch(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 300);
        }).then(() => this.delayAwait());
      });
    },

    /**
     * 初始化数据源
     */
    initDatafeed() {
      this.datafeed = new Datafeed({
        history: (params) => {
          return this.getBars(
            params.symbol,
            params.resolution,
            params.from,
            params.to,
            this.isFirstSub
          ).then((d) => d);
        },
        config: () => this.defaultConfig(),
        symbols: () => this.defaultSymbol(),
        time: () => new Promise((resolve) => resolve(Date.now())),
        // quotes: () => new Promise(resolve => resolve({s: 'error', errmsg: 'error'}))
      });
    },
    /**
     * 初始化tradingview
     */
    initTradingView() {
      if (!this.datafeed) {
        return;
      }
      this.widget = new TradingView({
        // debug: true, // uncomment this line to see Library errors and warnings in the console
        fullscreen: true,
        symbol: "BTC/USDT",
        interval: this.resolution,
        container_id: "tv_chart_container",

        //	BEWARE: no trailing slash is expected in feed URL
        datafeed: this.datafeed,
        library_path: "/charting_library/",
        locale: "zh",

        disabled_features: ['use_localstorage_for_settings',
          'left_toolbar',
          'header_symbol_search',
          'header_widget_dom_node',
          'header_compare',
          'header_settings',
          'header_fullscreen_button',
          'header_saveload',
          'header_indicators', //指标
          'header_screenshot',
          'header_chart_type',
          'header_undo_redo',
          'header_interval_dialog_button',
          "timeframes_toolbar",
          "volume_force_overlay",
          'control_bar',
          'pane_context_menu',
          'timezone_menu',
          'symbol_info',
          'chart_markup_table'
        ],
        enabled_features: ["study_templates"],
        charts_storage_url: "#",
        charts_storage_api_version: "1.1",
        client_id: "tradingview.com",
        user_id: "public_user_id",
        // debug: true,
        theme: "Dark",
        timezone: "Asia/Shanghai",
      });
    },
    /**
     * 获取块
     */
    async getBars(symbol, resolution, from, to, isFirst) {
      console.log('----isFirst----', isFirst)
      if (this.resolution !== resolution && this.socket) {
        // this.socket.send(
        //   JSON.stringify({
        //     event: 'removeChannel',
        //     channel: `market.BTC/USDT.kline.${chartResolution[this.resolution]}`
        //   })
        // )
        // this.socket.send(
        //   JSON.stringify({
        //     event: 'addChannel',
        //     channel: `market.BTC/USDT.kline.${chartResolution[resolution]}`
        //   })
        // )
        console.log('切换分辨率',resolution)
        this.subHistory()
        this.subTicker()
        this.isFirstSub = false
        this.resolution = resolution
      }
      /**
       * 
       */
      console.log(this.klineData.length)
      // if (this.isLoading && !this.klineData.length) {
      //   this.isLoading = false
      // }
      const data = await this.delayAwait()
      this.klineData = []
      this.awaitCount = 0
      return {
        bars: data,
        meta: {
          noData: !data.length
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
          supported_resolutions: ['1', '5', '15', '30', '60', 'D', '1W', '1M']
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
          supported_resolutions: ['1', '5', '15', '30', '60', 'D', '1W', '1M']
        }
      })
    }
  },
  created() {
    
    this.initDatafeed()
    // this.initWebSocket()
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