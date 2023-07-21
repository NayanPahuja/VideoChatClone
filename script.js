// Initialize variables to hold local and remote streams and the peer connection object.
let APP_ID = "a1054004224b42529dfef33fba428e85"
let token = null
let uid = String(Math.floor(Math.random() * 1e4))

let client; //like our local stream starts up the agoraRTM server


let channel; //users join this

let localStream;
let remoteStream;
let peerConnection;

// STUN servers configuration to facilitate NAT traversal for WebRTC.
const stunServers = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302'
            ]
        }
    ]
};

// Initialization function.
let init = async () => {

    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid,token})
    //index.html?room=255031
    // channel = client.createChannel(roomID)
    channel = client.createChannel('main')
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    try {
        // Get user media (video only) and display it in the "user-1" element.
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        document.getElementById("user-1").srcObject = localStream;
    } catch (error) {
        console.error("Error accessing local media devices:", error);
    }
    // Start the process of creating an offer to establish a connection.
};
let handleUserJoined = async(MemberID) => {
    console.log('A new user joined the channel: ', MemberID)
    createOffer(MemberID);

}
// Function to create an offer.
let createOffer = async(MemberID) => {
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

    // Create an offer to establish a connection with the remote peer.
    let offer = await peerConnection.createOffer();
    // Set the created offer as the local description for the peer connection.
    await peerConnection.setLocalDescription(offer);
    client.sendMessageToPeer({Text:"Hey!!!"},MemberID)
};

// Call the init() function to start the process of creating an offer.
init();
