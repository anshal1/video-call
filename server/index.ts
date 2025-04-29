import E from "express";
import http from "http";
import { Server } from "socket.io";
const app = E();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let roomUsers: string[] = [];

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);
  socket.on("join-room", () => {
    if (!roomUsers.includes(socket.id)) roomUsers.push(socket.id);
    console.log(roomUsers);
    socket.join("video");
    io.to(socket.id).emit(
      "all-users",
      roomUsers.filter((id) => id !== socket.id)
    );
    socket.on(
      "seding-offer",
      ({
        offer,
        sendTo,
      }: {
        offer: RTCSessionDescriptionInit;
        sendTo: string;
      }) => {
        io.to(sendTo).emit("offer-received", { offer, sentBy: socket.id });
      }
    );
    socket.on(
      "sending-answer",
      ({
        answer,
        sentTo,
      }: {
        answer: RTCSessionDescriptionInit;
        sentTo: string;
      }) => {
        io.to(sentTo).emit("answer-received", socket.id, answer);
      }
    );
    socket.on(
      "ice-candiate",
      (iceCandidate: RTCIceCandidate | null, sentTo: string) => {
        io.to(sentTo).emit("ice-candidate", iceCandidate, socket.id);
      }
    );
    socket.on("user-left", () => {
      console.log("User Left 2", socket.id);
      socket.to("video").emit("user-left", socket.id);
      socket.leave("video");
      roomUsers = roomUsers.filter((id) => id !== socket.id);
    });
  });
  socket.on("disconnect", () => {
    roomUsers = roomUsers.filter((id) => id !== socket.id);
    socket.leave("video");
    socket.to("video").emit("user-left", socket.id);
    console.log("User Left", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

server.listen(process.env.PORT || 5000, () => {
  console.log("Server Running On Port", process.env.PORT || 5000);
});
