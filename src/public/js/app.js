const socket = io(); //알아서 socekt.io 서버를 찾는다.

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;

let roomName;
function addMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}
function handleMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  socket.emit("new_message", input.value, roomName, () => {
    addMessage(`You: ${input.value}`);
    input.value = "";
  });
}

function handleRoomSubmit(event) {
  event.preventDefault();
  const nickname = document.getElementById("nickname");
  const roomnum = document.getElementById("roomnum");
  socket.emit("enter_room", nickname.value, roomnum.value, () => {
    welcome.hidden = true;
    room.hidden = false;
  }); //우리가 원하는 event를 보내면 된다.
  const h3 = room.querySelector("h3");
  roomName = roomnum.value;
  h3.innerText = `Room ${roomName}`;
  roomnum.value = "";
}

form.addEventListener("submit", handleRoomSubmit);
const msgForm = room.querySelector("#msg");
msgForm.addEventListener("submit", handleMessageSubmit);
socket.on("welcome", (user, newCount) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  addMessage(`${user} joined`);
});
socket.on("bye", (left, newCount) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  addMessage(`${left} left`);
});
socket.on("new_message", (msg) => {
  addMessage(msg);
});
socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerHTML = "";
  if (rooms.length === 0) {
    return;
  }
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = room;
    roomList.append(li);
  });
});
