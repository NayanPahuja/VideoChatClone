let APP_ID = "a1054004224b42529dfef33fba428e85"
let token = null
let uid = String(Math.floor(Math.random() * 1e4))

let client; //like our local stream starts up the agoraRTM server

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomID = urlParams.get('room')

let channel; //users join this

let localStream;
let remoteStream;
let peerConnection;

if(!roomID)  {
    window.location = 'lobby.html'
}

const stunServers = {
    iceServers: [
        {
            urls:['stun:stun1.l.google.com:19302']
        }
    ]
};


let constraints = {
    video:{
        width:{min:640,ideal:1920,max:1920},
        height: {min:480,ideal:1080,max:1080}

    },
    audio: true
}

let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token})

    channel = client.createChannel(roomID)
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    client.on('MessageFromPeer', handleMessageFromPeer)
    channel.on('MemberLeft',handleUserLeft)
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById("user-1").srcObject = localStream;
}

let handleUserLeft = (MemberId) => {
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallFrame')
}

let handleMessageFromPeer = async (message, MemberId) => {

    message = JSON.parse(message.text)
    if(message.type === 'offer'){
        createAnswer(MemberId,message.offer)
    }
    if(message.type === 'answer'){
        addAnswer(message.answer)

    }
    if(message.type === 'candidate'){
        if(peerConnection){
            await peerConnection.addIceCandidate(message.candidate)
        }

    }
};

let handleUserJoined = async (MemberId) => {
    console.log('A new user joined the channel:', MemberId)
    createOffer(MemberId)
}


let createPeerConnection = async(MemberId) => {
     // Create a new RTCPeerConnection object with the specified STUN servers.
     peerConnection = new RTCPeerConnection(stunServers);

     // Create a new MediaStream to hold the remote video and display it in the "user-2" element.
     remoteStream = new MediaStream();
     document.getElementById('user-2').srcObject = remoteStream;
     document.getElementById('user-2').style.display = 'block'

     document.getElementById('user-1').classList.add('smallFrame')
    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("user-1").srcObject = localStream;
    }
     // Add all tracks from the local stream to the peer connection.
     localStream.getTracks().forEach((track) => {
         peerConnection.addTrack(track, localStream);
     });
 
     // Event listener to handle incoming tracks from the remote peer.
     peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }
 
     // Event listener to handle ICE candidates (used for NAT traversal).
     peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            await client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, MemberId)
        }
    }
}


let createOffer = async(MemberId) => {
   
    await createPeerConnection(MemberId)
    // Create an offer to establish a connection with the remote peer.
    let offer = await peerConnection.createOffer();
    // Set the created offer as the local description for the peer connection.
    await peerConnection.setLocalDescription(offer);
    client.sendMessageToPeer({text :JSON.stringify({'type' : 'offer', 'offer' : offer})},MemberId)//we need to know who to send it to
}

let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId)
}
let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async() => {
    await channel.leave();
    await client.logout();
}


//for user closing the window
window.addEventListener('beforeunload', leaveChannel)


let toggleCamera = async() =>{
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video')

    if(videoTrack.enabled){
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255,80,80,1)'
    }
    else{
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179,102,249,0.9)'
    }
}

document.getElementById('camera-btn').addEventListener('click',toggleCamera)


let toggleMic = async() =>{
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')

    if(audioTrack.enabled){
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255,80,80,1)'
    }
    else{
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179,102,249,0.9)'
    }
}

document.getElementById('mic-btn').addEventListener('click',toggleMic)

init();