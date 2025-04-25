import E from "express";
import http from "http";
import { Server } from "socket.io";
const app = E();
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

server.listen(5000, () => {
  console.log("Server Running On Port 3000");
});
