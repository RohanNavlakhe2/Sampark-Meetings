const http = require('http')
const express = require('express')
const {v4:uuidv4} = require('uuid')
const socketio = require('socket.io')
const {ExpressPeerServer} = require('peer')
//load mongoose.js so that it could run and establish connection with db
require('./db/mongoose')
const Participant = require('./models/participant-model')

const app = express()

//const server = http.Server(app)
const server = http.createServer(app)
const io = socketio(server)
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path:"/peerjs"
});
/*const peerServer = ExpressPeerServer(server, {
    debug: true,
});*/


app.use('/peerjs',peerServer)
app.use(express.static('public'))
app.set('view engine','ejs')


app.get('',(req,res) => {
    res.render('index',{newRoomId:uuidv4()})

})

app.get('/joinroom/:roomId',(req,res) => {
    console.log(`/joinroom = ${req.params.roomId}`)
    res.render('room',{roomId:req.params.roomId})
})

io.on('connection',(socket) => {
    console.log('New Connection')

    socket.on('new-user',async (newUserId,roomId) => {
        console.log("New user at Room : "+roomId)
        const participants = await Participant.find({roomId})
        const newParticipant = Participant({name:`User${newUserId}`,peerId:newUserId,roomId})
        await newParticipant.save()
        socket.join(roomId)
        socket.emit('welcome',`Welcome to the Room`,participants)
        //socket.broadcast.to(roomId).emit('message',newUserId)
    })
})

server.listen(process.env.PORT,()=>{
    console.log('server started')
})