const socket = io(); //알아서 socekt.io 서버를 찾는다.

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const welcome = document.getElementById("welcome");
const call = document.getElementById("call");

call.hidden = true;

//varaibles

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

//function

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices(); //모든 연결된 디바이스를 가지고옴
    const cameras = devices.filter((device) => device.kind === "videoinput"); //전체 카메라만을 가지고옴
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      //전체 카메라를 가지고 셀렉트 js를 완성시킴
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label == camera.label) {
        option.selected = true;
      }
      cameraSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}
async function getMedia(deviceId) {
  const initialConstraints = {
    //내가 원하는 카메라를 선택하기 위해 인자를 넣어주고 그에 맞는 변수들을 생성해준다.
    audio: true,
    video: { facingMode: "user" },
    //selfie
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      //카메라 스위치 할때마다 카메라 정보를 가져와서 select의 크기가 점점 커지는 것을 방지하기
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
  muted = !muted;
}
function handelCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Camera On";
    cameraOff = true;
  }
}
async function handleCameraChange() {
  await getMedia(cameraSelect.value);
  //내가 카메라를 바꿔도 peer에게 카메라 정보까지 이미 보냈기 때문에 이에 대한 정보의 업데이트 또한 필요하다.
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");

    videoSender.replaceTrack(videoTrack);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handelCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

const welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}
async function handleRoom(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value);

  roomName = input.value;
}
welcomeForm.addEventListener("submit", handleRoom);

//Socket code

socket.on("welcome", async () => {
  const offer = await myPeerConnection.createOffer(); //step3.연결에 필요한 설정값 전달
  myPeerConnection.setLocalDescription(offer); //step4.
  console.log("sent the offer");
  socket.emit("offer", offer, roomName); //step5. offer를 전달
}); //1번 브라우저

socket.on("offer", async (offer) => {
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer); //step6. peer B에서 offer를 받음
  const answer = await myPeerConnection.createAnswer(); //step7
  myPeerConnection.setLocalDescription(answer); //step8
  socket.emit("answer", answer, roomName); //step9 서버로 answer를 보냄 (roomName : 방 모두에 알려야함)
  console.log("sent the answer");
}); //2번 부라우저

socket.on("answer", (answer) => {
  //step10
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
}); //1번 브라우저

socket.on("ice", (ice) => {
  //step13
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});
//RTC Code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection(); //step1. peerConnection을 모두에게 공유
  iceServers: [ //장치에게 우리의 공용주소를 알려줌: stun server
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
      ],
    },
  ];
  myPeerConnection.addEventListener("icecandidate", handleIce); //step11
  myPeerConnection.addEventListener("addstream", handleAddStream); //step14
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream)); //Step2. stream 데이터를 연결 안에다가 넣어줌
}

function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName); //step12
}
function handleAddStream(data) {
  const peersFace = document.getElementById("peersFace");
  peersFace.srcObject = data.stream;
}
