const mongoose = require('mongoose')
//mongodb://127.0.0.1:27017/task-manager-db
mongoose.connect(process.env.MONGO_DB,{
    useNewUrlParser:true,
    useUnifiedTopology:true,
    useCreateIndex:true,
    useFindAndModify:false
})

