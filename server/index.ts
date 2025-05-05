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
const roomMap: Map<string, string[]> = new Map();

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);
  socket.on("join-room", (roomId: string) => {
    const roomExists = roomMap.get(roomId);
    if (!roomExists) roomMap.set(roomId, []);
    const roomUsers = roomMap.get(roomId)!;
    if (!roomUsers.includes(socket.id)) roomUsers.push(socket.id);
    console.log(roomUsers);
    socket.join(roomId);
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
    socket.on("user-left", (roomId: string) => {
      console.log("User Left 2", socket.id);
      const room = roomMap.get(roomId);
      if (!room) return;
      const roomUsers = roomMap.get(roomId)!;
      roomMap.set(
        roomId,
        roomUsers.filter((id) => id !== socket.id)
      );
      socket.to(roomId).emit("user-left", socket.id);
      socket.leave(roomId);
    });
  });
  socket.on("disconnect", () => {
    const allRooms = Array.from(roomMap.keys());
    allRooms.forEach((roomId) => {
      const roomUsers = roomMap.get(roomId)!;
      if (!roomUsers.includes(socket.id)) return;
      roomMap.set(
        roomId,
        roomUsers.filter((id) => id !== socket.id)
      );
      socket.to(roomId).emit("user-left", socket.id);
    });
  });
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

server.listen(process.env.PORT || 5000, () => {
  console.log("Server Running On Port", process.env.PORT || 5000);
});
