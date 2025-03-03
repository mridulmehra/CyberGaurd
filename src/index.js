import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import Filter from "bad-words";
import { generateMessage, generateLocationMessage } from "./utils/messages.js";
import { addUser, removeUser, getUser, getUsersInRoom } from "./utils/user.js";

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express
const app = express();
const server = http.createServer(app);

// ✅ Enable CORS for WebSocket (important for deployment)
const io = new Server(server, {
  cors: {
    origin: "*", // Change to your frontend URL after deployment
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());
app.use(cors());

// ✅ Serve frontend (for deployment)
const publicDirectoryPath = path.join(__dirname, "../public");
app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
  console.log("New WebSocket connection");

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) return callback(error);

    socket.join(room);
    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast
      .to(user.room)
      .emit("message", generateMessage("Admin", `${user.username} has joined`));

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    try {
      const user = getUser(socket.id);
      if (!user) return callback("You are not authenticated");

      io.to(user.room).emit("message", generateMessage(user.username, message));
      callback();
    } catch (error) {
      console.error("Error sending message:", error);
      callback("Message could not be delivered");
    }
  });

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    if (!user) return callback("You are not authenticated");

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${coords.Latitude},${coords.Longitude}`
      )
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

// ✅ Set PORT to 3000
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
