import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const server = http.createServer(app);
const io = SocketIO(server);
function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = io;

  // const sids = io.sockets.adapter.sids;
  // const rooms = io.sockets.adapter.rooms;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}
function countRoom(roomName) {
  return io.sockets.adapter.rooms.get(roomName)?.size;
}
io.on("connection", (socket) => {
  socket["nickname"] = "Anonymous";
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });
  socket.on("enter_room", (nickname, roomName, call) => {
    //Emit을 받으면 함수를 호출하고 프론트에서 그 함수를 실행한다.

    socket.join(roomName);
    call();
    socket["nickname"] = nickname;
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    io.sockets.emit("room_change", publicRooms()); //모두에게
  });
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1);
    }
  });
  socket.on("disconnect", () => {
    io.sockets.emit("room_change", publicRooms());
  });
  socket.on("new_message", (msg, roomName, done) => {
    socket.to(roomName).emit("new_message", `${socket.nickname} : ${msg}`);
    done();
  });
});

// const sockets = [];

// wss.on("connection", (socket) => {
//   sockets.push(socket);
//   socket["nickname"] = "Annonymous";
//   console.log("Connected to Browser");
//   socket.on("close", () => console.log("Disconnected from the browser"));
//   socket.on("message", (message) => {
//     const parsed = JSON.parse(message);
//     switch (parsed.type) {
//       case "new_message":
//         sockets.forEach((aSocket) =>
//           aSocket.send(`${socket.nickname} : ${parsed.payload}`)
//         );
//         console.log(socket.nickname);
//       case "nickname":
//         socket["nickname"] = parsed.payload;
//     }
//   });
// });

server.listen(3000, handleListen);
