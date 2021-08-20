const mongoose = require('mongoose')

const participantSchema = new mongoose.Schema({
    name:{
        type:String,
        trim:true
    },
    peerId:{
        required:true,
        type:String
    },
    roomId:{
        required:true,
        type:String
    }
})

const Participant = mongoose.model('Participant',participantSchema)

module.exports = Participant