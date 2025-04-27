import 'dotenv/config'
import connectDB from "./db/connection.js"
import app from './app.js'

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server running on port ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("DB connection failed!",err)
})

/*
const app = express()

;( async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(err)=>{
            console.log("Error: ",err)
            throw err
        })

        app.listen(process.env.PORT,(err)=>{
            if(!err){
                console.log(`Server running on Port ${process.env.PORT}`)
            }
            else{
                console.log(err)
            }
        })

    }catch(err){
        console.log(err)
    }
})()

*/


