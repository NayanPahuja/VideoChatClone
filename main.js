let APP_ID = "a1054004224b42529dfef33fba428e85"
let token = null
let uid = String(Math.floor(Math.random() * 1e4))

let client; //like our local stream starts up the agoraRTM server


let channel; //users join this

let localStream;
let remoteStream;
let peerConnection;


const stunServers = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302'
            ]
        }
    ]
};

let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token})

    channel = client.createChannel('main')
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    client.on('MessageFromPeer', handleMessageFromPeer)

    try {
        // Get user media (video only) and display it in the "user-1" element.
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        document.getElementById("user-1").srcObject = localStream;
    } catch (error) {
        console.error("Error accessing local media devices:", error);
    }
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
            peerConnection.addIceCandidate(message.candidate)
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
 
     // Add all tracks from the local stream to the peer connection.
     localStream.getTracks().forEach((track) => {
         peerConnection.addTrack(track, localStream);
     });
 
     // Event listener to handle incoming tracks from the remote peer.
     peerConnection.ontrack = (event) => {
         // Add the incoming tracks to the remote stream for display in the "user-2" element.
         event.streams[0].getTracks().forEach((track) => {
             remoteStream.addTrack(track);
         })
     }
 
     // Event listener to handle ICE candidates (used for NAT traversal).
     peerConnection.onicecandidate = async(event) => {
         if (event.candidate) {
             console.log('New ICE candidate:', event.candidate)
             // ICE candidates will be exchanged between peers to establish a direct connection.
             // In a complete implementation, these candidates would be sent to the remote peer.
         }
     };
}


let createOffer = async(MemberId) => {
   
    await createPeerConnection(MemberId)
    // Create an offer to establish a connection with the remote peer.
    let offer = await peerConnection.createOffer();
    // Set the created offer as the local description for the peer connection.
    await peerConnection.setLocalDescription(offer);
    client.sendMessageToPeer({text :JSON.stringify({'type' : 'offer', 'offer' : offer})},MemberId)//we need to know who to send it to
}

let createAnswer = async(MemberId, offer) => {
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
};
init();