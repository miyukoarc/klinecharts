export const MixItem = {
    data (){
        return{
            msg: 'mix item'
        }
    },
    methods: {
      alertMsg (){
          console.log(this.msg)
      }  
    },
    mounted () {
        this.alertMsg()
        console.log(this.msg+'1')
    }
}