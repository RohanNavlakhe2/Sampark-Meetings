
// 1. when a user toggle his video,make change in all other peers screen.
// 2.  while calling the peers,caller peer should pass his name and videoStatus.Name will be shown
// on other side peer's screen (currently we're showing newuser) and based on the videoStatus
// will decide whether to show thumbnail or video.



let socket,peer

//var peer = new Peer({host:'0.peerjs.com',port:443})
//var peer = new Peer({host:'9000-black-scallop-94kkam9v.ws-us14.gitpod.io',port:9000,path:"/",secure:true})
//var peer = new Peer({host:'/',port:'443',path:"/peerjs"/*,secure:true*/})
//var peer = new Peer({host:'sampark-live-meet.herokuapp.com',port:'443',path:"/peerjs"/*,secure:true*/})

const $videoContainer = document.querySelector('#video-grid')
const myModal = new bootstrap.Modal(document.getElementById('usernameModal'))
const toast = new bootstrap.Toast(document.getElementById('liveToast'))
const toastContent = document.getElementById('toastContent')
let myStreamToPassToRemote
let localStream
//let connectedPeers = []
let username




myModal.show()
 

const continueWithUsername = () => {
    const name = document.querySelector('#usernameField').value
    if (name === '') {
        showToast('Please provide your name')
        return
    }

    username = name
    console.log('New Username : ' + username + " Room Id : " + room)
    myModal.hide()

    socket = io()
    peer = new Peer()

    getAudioVideo()

    peer.on('open', (peerId) => {
        console.log('on peer open')
        socket.emit('new-user', peerId, room, username)
    })

    peer.on('connection', function(conn) {
        conn.on('data', function(data){
            toggleVideoAndThumbnailBasedOnVideoStatus(data.peerId,data.videoStatus)
            toggleMicIcon(data.peerId,data.micStatus)
            //console.log(`Video of User ${data.username} is ${data.videoStatus}`);
        });
    });


    socket.on('notifyingVideoStatusToAll',(data) => {
        toggleVideoAndThumbnailBasedOnVideoStatus(data.peerId,data.videoStatus)
        //console.log(`Video Status of peer ${data.peerId} ${data.videoStatus}`)
    })

    socket.on('notifyingMicStatusToAll',(data) => {
       toggleMicIcon(data.peerId,data.micStatus)
    })

    socket.on('user-disconnected', (peerId, leftUsername) => {
        showToast(`${leftUsername} left the meeting`)
        removeUserView(peerId)
        /*if (connectedPeers[[peerId]]) {
            console.log('calling on close of peer : ' + peerId)
            connectedPeers[peerId].close()
        }*/
    })

}

const getAudioVideo = () => {
    navigator.mediaDevices
        .getUserMedia({video: true, audio: true})
        .then((stream) => {
            myStreamToPassToRemote = stream
            /*const */
            localStream = stream.clone()

            //making local stream audio and video disabled
            //local stream is used to show user his/her own video preview
            //so for local stream audio will always be off otherwise we will hear our own voice
            //and video state of local stream will be same as remote stream (which we're
            //passing to other users).Means if user clicks of start video  btn
            // then user will be able to see his/her preview

            localStream.getAudioTracks()[0].enabled = false;
            localStream.getVideoTracks()[0].enabled = false;
            initVideoStream(localStream, prepareVideoElement(),peer.id,username)

            //mute the audio and stop the video (means other users neither hear your voice not see you)
            mute()
            stopVideo()

            //Provide your own stream if you're a new joiner (when someone calls for your stream)
            peer.on('call', function (call) {
                console.log('Got call from peer ', call.metadata.username)
                //stopVideo()
                call.answer(stream); // Answer the call with an A/V stream.
                giveAudioVideoStatusToCallingPeer(call.peer)
                const videoElement = prepareVideoElement()
                let tempPeerId;

                call.on('stream', function (remoteStream) {
                    console.log('Gave answer and got stream')
                    //const newVideoElement = document.createElement('video')
                    // Show stream in some video/canvas element.
                    if(tempPeerId === undefined){
                        initVideoStream(remoteStream, videoElement,call.peer,call.metadata.username)
                        toggleVideoAndThumbnailBasedOnVideoStatus(call.peer,call.metadata.videoStatus)
                        toggleMicIcon(call.peer,call.metadata.micStatus)
                        tempPeerId = call.peer
                    }

                });

                /*call.on('close', () => {
                    videoElement.remove()
                })

                connectedPeers[call.peer] = call*/

            });

            //Get stream from new joiner
            /*socket.on('message',(newJoinerId) => {
                console.log("A user has joined the conference : ",newJoinerId)
                 showToast('New user has joined.Plz click on Allow to get user in')
                newpeerId = newJoinerId
                var call = peer.call(newJoinerId,stream);
                const videoElement = prepareVideoElement()
                call.on('stream', function(remoteStream) {
                    console.log('call.on(stream) 2: ',remoteStream)
                    // Show stream in some video/canvas element.
                    initVideoStream(remoteStream,videoElement)
                });
            })*/

            socket.on('welcome', (msg, participants) => {
                showToast(msg)
                if (participants.length > 0) {
                    participants.forEach((participant) => {
                        console.log('Call To Participant : ' + participant.peerId)
                        var call = peer.call(participant.peerId, stream,{metadata:{
                            username,videoStatus:myStreamToPassToRemote.getVideoTracks()[0].enabled,
                                micStatus:myStreamToPassToRemote.getAudioTracks()[0].enabled
                        }
                        });
                        const videoElement = prepareVideoElement()
                        let tempPeerId

                        call.on('stream', function (remoteStream) {
                            console.log('Got Stream in answer')
                            // Show stream in some video/canvas element.
                            //console.log(`stream aspect ratio.. : ${remoteStream.getVideoTracks()[0].getSettings().aspectRatio}`)
                            if(tempPeerId === undefined){
                                initVideoStream(remoteStream, videoElement,participant.peerId,participant.name)
                                tempPeerId = participant.peerId
                            }

                        });

                       /* call.on('close', () => {
                            console.log('on close called,removing video')
                            videoElement.remove()
                        })

                        connectedPeers[participant.peerId] = call*/

                    })
                }
            })

            socket.on('message',(msg) => {
                showToast(msg)
            })
        })
}

const giveAudioVideoStatusToCallingPeer = (callingPeerId) => {
    var conn = peer.connect(callingPeerId)
    // on open will be launch when you successfully connect to PeerServer
    conn.on('open', function(){
        // here you have conn.id
        conn.send({username,peerId:peer.id,videoStatus:myStreamToPassToRemote.getVideoTracks()[0].enabled,
            micStatus:myStreamToPassToRemote.getAudioTracks()[0].enabled});
    });
}

/*const initVideoStream = (stream, video) => {
    video.srcObject = stream
    /!*if ('srcObject' in video) {
      video.srcObject = stream
    } else {
      video.src = window.URL.createObjectURL(stream) // for older browsers
    }*!/
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })

    $videoContainer.append(video)
}*/


//Creates a section with Thumbnail image and user video
const initVideoStream = (stream, video, peerId,username) => {
    console.log('init video stream')
    //video.srcObject = stream
    video.id = `user-video-${peerId}`
    //video.display = 'none'
    if ('srcObject' in video) {
      video.srcObject = stream
    } else {
      video.src = window.URL.createObjectURL(stream) // for older browsers
    }
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })

    createUserView(peerId,video,username)

}

const createUserView = (peerId,video,username) => {
    const userDiv = `<div class="bg-light m-2" id="user-div-${peerId}">
                    <div id="video-div-${peerId}">
                        <img id="user-thumbnail-${peerId}" src="/img/user_thumbnail.png" alt="" width="300"
                             height="200">
                  </div>

                    <span>
                    <h5 class="text-danger d-inline-block">${username}</h5>
                     <i class="fas fa-microphone-slash" id="peer-microphone-${peerId}"></i>
                    </span>
                </div>`

    const userDivHtml = document.createElement('div')
    userDivHtml.id = `${peerId}`
    userDivHtml.innerHTML = userDiv.trim()


    $videoContainer.append(userDivHtml)
    const videoDiv = document.getElementById( `video-div-${peerId}`)
    video.style.display = 'none'
    video.width = 300
    video.height = 200
    videoDiv.append(video)
}

const removeUserView = (peerId) => {
    const userToRemove = document.getElementById(peerId)
    userToRemove.parentNode.removeChild(userToRemove)
}

const muteUnmute = () => {
    const enabled = myStreamToPassToRemote.getAudioTracks()[0].enabled;
    if (enabled) {
        myStreamToPassToRemote.getAudioTracks()[0].enabled = false;
        setUnmuteButton();
    } else {
        setMuteButton();
        myStreamToPassToRemote.getAudioTracks()[0].enabled = true;
    }

    socket.emit('providingMicStatus',{peerId:peer.id,micStatus:myStreamToPassToRemote.getAudioTracks()[0].enabled})

}

const mute = () => {
    const enabled = myStreamToPassToRemote.getAudioTracks()[0].enabled;
    if (enabled) {
        myStreamToPassToRemote.getAudioTracks()[0].enabled = false;
        setUnmuteButton();
    }
}

const playStop = () => {
    let enabled = myStreamToPassToRemote.getVideoTracks()[0].enabled;
    if (enabled) {
        myStreamToPassToRemote.getVideoTracks()[0].enabled = false;
        localStream.getVideoTracks()[0].enabled = false;
        setPlayVideo()
    } else {
        setStopVideo()
        myStreamToPassToRemote.getVideoTracks()[0].enabled = true;
        localStream.getVideoTracks()[0].enabled = true;
    }
    toggleVideoAndThumbnail(peer.id)
    socket.emit('providingVideoStatus',{peerId:peer.id,videoStatus:myStreamToPassToRemote.getVideoTracks()[0].enabled})
}

const stopVideo = () => {
    let enabled = myStreamToPassToRemote.getVideoTracks()[0].enabled;
    if (enabled) {
        myStreamToPassToRemote.getVideoTracks()[0].enabled = false;
        setPlayVideo()
    }
}

const setMuteButton = () => {
    const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `
    document.querySelector('.main__mute_button').innerHTML = html;

    toggleMicIcon(peer.id,true)

   /* const myMic = document.getElementById(`peer-microphone-${peer.id}`)
    myMic.classList.remove('fa-microphone-slash')
    myMic.classList.add('fa-microphone')*/

}

const setUnmuteButton = () => {
    const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `
    document.querySelector('.main__mute_button').innerHTML = html;

    toggleMicIcon(peer.id,false)

  /*  const myMic = document.getElementById(`peer-microphone-${peer.id}`)
    myMic.classList.remove('fa-microphone')
    myMic.classList.add('fa-microphone-slash')*/
}

const toggleMicIcon = (peerId,micStatus) => {
    const mic = document.getElementById(`peer-microphone-${peerId}`)

    if(micStatus){
        mic.classList.remove('fa-microphone-slash')
        mic.classList.add('fa-microphone')
    }else{
        mic.classList.remove('fa-microphone')
        mic.classList.add('fa-microphone-slash')
    }
}

const setStopVideo = () => {
    const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `
    document.querySelector('.main__video_button').innerHTML = html;
}

const setPlayVideo = () => {
    const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `
    document.querySelector('.main__video_button').innerHTML = html;
}

const prepareVideoElement = () => {
    const videoElement = document.createElement('video')
    videoElement.width = 400
    videoElement.height = 300
    return videoElement
}

const toggleVideoAndThumbnail = (peerId) => {
    const userVideo = document.getElementById(`user-video-${peerId}`)
    const userThumbnail = document.getElementById(`user-thumbnail-${peerId}`)

    if(userVideo.style.display === 'none'){
        userVideo.style.display = 'block'
        userThumbnail.style.display = 'none'
    }else{
        userVideo.style.display = 'none'
        userThumbnail.style.display = 'block'
    }
}

const toggleVideoAndThumbnailBasedOnVideoStatus = (peerId,videoStatus) => {
    const userVideo = document.getElementById(`user-video-${peerId}`)
    const userThumbnail = document.getElementById(`user-thumbnail-${peerId}`)

    if(videoStatus){
        userVideo.style.display = 'block'
        userThumbnail.style.display = 'none'
    }else{
        userVideo.style.display = 'none'
        userThumbnail.style.display = 'block'
    }
}

const showToast = (toastMsg) => {
    toastContent.innerText = toastMsg
    toast.show()
}

/*window.addEventListener('beforeunload', function (e) {
    //socket.emit('test','tab or browser closed')
    e.preventDefault();
    e.returnValue = 'rohan';
    return 'rohan'

});*/

/*window.addEventListener("beforeunload", function (e) {
    socket.emit('test','tab or browser closed')
    var confirmationMessage = "\o/";

    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage;                            //Webkit, Safari, Chrome
});*/

/*window.onbeforeunload = function () {
    return "Do you really want to close?";
};*/



