var pc;
var localStream;
var remoteStream;
var peerConnection;
var localVideo = document.querySelector("#localVideo");
var remoteVideo = document.querySelector("#remoteVideo");
var callBtn = document.getElementById("btnCall");
var username;
var pcConfig = {
  iceServers: [
    {
     "url": "stun:stun.immusservices.com:5349"
    },
    {
      'url': 'turn:turn.immusservices.com:5349',
        'credential': '123456',
        'username': 'shiva'
    }
  ]
};

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(pcConfig);
  peerConnection.onicecandidate = function(event) {
    if (event.candidate) {
      // send local ICE node to remote
      socket.emit("addCandidate", {
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
        username
      });
      console.log("sending ice data to  " + username);
    } else {
      console.log("end of candidate");
    }
  };
  peerConnection.onaddstream = function(event) {
    console.log("on stream", event);
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
  };
  peerConnection.onremovestream = () => console.log("stream removed");
}
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

var socket = io.connect();
var name = prompt("Enter username: ");
socket.emit("username", name);

socket.on("incomingCall", data => {
  username = data.username;
  console.log("incomingCall from ", username, data);
  createPeerConnection();
  peerConnection.addStream(localStream);
  peerConnection
    .setRemoteDescription(new RTCSessionDescription(data.description))
    .then(() => {
      peerConnection
        .createAnswer()
        .then(description => {
          console.log("local answer description set");
          peerConnection.setLocalDescription(description);
          socket.emit("acceptCall", { description, username: data.username });
        })
        .catch(console.error);
    });
});

socket.on("remoteICECandidate", message => {
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: message.label,
    candidate: message.candidate
  });
  peerConnection.addIceCandidate(candidate);
  console.log("remoteIceData", message);
});

socket.on("callAnswered", data => {
  peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.description)
  );
});

socket.on("log", console.log);

navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true
  })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  })
  .catch(function(e) {
    alert("getUserMedia() error: " + e.name);
  });

callBtn.addEventListener("click", e => {
  console.log("call");
  createPeerConnection();
  username = prompt("Who to call?");
  peerConnection.addStream(localStream);
  peerConnection.createOffer(
    description => {
      peerConnection.setLocalDescription(description);
      socket.emit("call", { description, description.username });
    },
    err => console.error(err),
    sdpConstraints
  );
});
