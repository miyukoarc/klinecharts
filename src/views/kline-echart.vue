
<script>
import stomp from 'webstomp-client'
import SockJS from 'sockjs-client'
import dayjs from 'dayjs'

export default {
  data() {
    return {
      tempStamp: 0,
      symbol: 'btc',
      myChart: null,
      socketJS: null,
      stompClient: null,
      echartsSeed: [],

      options: {
        // title: {
        //   text: 'woshitu'
        // },
        grid: {
          left: '0.5%'
          // right: '0.5%'
        },
        tooltip: {
          alwaysShowContent:true,
          triggerOn: 'none',
          trigger: 'axis',
          formatter: function(params) {
            return (
              dayjs(params[0][0]).format('HH:mm:ss') +
              ':' +
              parseInt(params[0].value[1]).toFixed(2)
            )
          }
          // axisPointer: {
          //   animation: false
          // }
        },

        xAxis: {
          type: 'time',
          splitLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          // axisPointer: {
          //   snap: true
          // },
          boundaryGap: ['0', '20%']
        },
        yAxis: {
          type: 'value',
          scale: true,

          position: 'right',
          // minInterval: 5,
          splitNumber: 4,
          axisTick: {
            show: false
          },
          axisLine: {
            show: false
          },
          axisLabel: {
            show: true,
            inside: false
          },

          splitLine: {
            show: true,
            lineStyle: {
              color: ['#e9e9e9'],
              width: 1,
              type: 'solid'
            }
          }
        },
        // dataZoom: [
        //   {
        //     type: 'inside'
        //   }
        // ],
        series: [
          {
            smooth: true,
            name: '模拟数据',
            type: 'line',
            showSymbol: false,
            hoverAnimation: false,
            itemStyle: {
              color: 'rgb(254, 225, 224)'
            },
            areaStyle: {
              color: this.$echarts.graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: 'rgb(254, 225, 224)'
                },
                {
                  offset: 1,
                  color: 'rgb(240, 240, 240)'
                }
              ])
            },
            data: []
          }
        ]
      }
    }
  },
  watch: {
    echartsSeed: {
      handler(newVal, oldVal) {
        // this.myChart.dispatchAction({
        //   type: 'highlight',
        //   seriesIndex: 0,
        //   dataIndex: newVal.length-1
        // })
        this.myChart.setOption({
          series: [
            {
              data: newVal
            }
          ]
        })
        this.myChart.dispatchAction({
          type: 'showTip',
          seriesIndex: 0,
          dataIndex: newVal.length-1
        })
      },
      deep: true
    }
  },
  methods: {
    handleToggle(symbol) {
      this.symbol = symbol
    },
    initSockJs() {
      this.socketJS = new SockJS(
        `http://10.10.10.245:20007/websocket?access_token=0a6df1b5-20d4-44c5-b811-574a64cea210`
      )

      this.stompClient = stomp.over(this.socketJS, { debug: false })

      this.stompClient.connect({}, () => {
        this.stompClient.subscribe('/topic/option.bbo', msg => {
          const body = JSON.parse(msg.body)

          if (body.context.includes(this.symbol)) {
            // console.log({
            //   name: this.$dayjs(body.timestamp).$d,
            //   value: [
            //     this.$dayjs(body.timestamp).format('YYYY/MM/DD HH:mm:ss'),
            //     body.context.split(':')[1]
            //   ]
            // })

            let item = {
              name: this.$dayjs(body.timestamp).$d,
              value: [
                this.$dayjs(body.timestamp).format('YYYY/MM/DD HH:mm:ss'),
                body.context.split(':')[1]
              ]
            }

            if (this.echartsSeed.length > 50) {
              this.echartsSeed.shift()
              this.echartsSeed
            }

            this.echartsSeed.push(item)
          }
        })
      })
    },
    initEcharts() {
      this.myChart = this.$echarts.init(document.querySelector('#echarts'))

      this.myChart.setOption(this.options, true)
    },
    getRealTimeHistory() {
      fetch(
        `http://10.10.10.245:20007/huobi/getHistoricalTrade?access_token=0a6df1b5-20d4-44c5-b811-574a64cea210&symbol=${this.symbol}usdt&size=300`
      )
        .then(res => res.json())
        .then(async data => {
          await this.handleHistory(data)
        })
        .catch(err => {
          console.warn(err)
        })
    },
    handleHistory(arr) {
      arr.forEach((item, index) => {
        if (this.echartsSeed.length < 50) {
          const currStamp = Math.round(item.timestamp / 1000) * 1000
          // console.log(currStamp)
          if (this.tempStamp !== currStamp) {
            this.tempStamp = currStamp
            // console.log(this.tempStamp)
            // console.log({
            //   name: this.$dayjs(this.tempStamp).$d,
            //   value: [
            //     this.$dayjs(this.tempStamp).format('YYYY/MM/DD HH:mm:ss'),
            //     item.price
            //   ]
            // })
            this.echartsSeed.unshift({
              name: this.$dayjs(this.tempStamp).$d,
              value: [
                this.$dayjs(this.tempStamp).format('YYYY/MM/DD HH:mm:ss'),
                item.price
              ]
            })
          }
        }
      })

      console.log(this.echartsSeed)
    },
    highLightPoint() {
      if (this.myChart) {
        this.myChart.dispatchAction({
          type: 'highlight',
          dataIndex: 51
        })
      }
    }
  },
  created() {
    const ps = new Promise((resolve, reject) => {
      this.getRealTimeHistory()
      resolve()
    })
    ps.then(() => {
      this.initSockJs()
    })
  },
  async mounted() {
    await this.initEcharts()
    this.highLightPoint()
  },
  render(){
    return(
        <div id="echarts"></div>
    )
  }
}
</script>

<style>
</style>