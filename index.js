require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const prisma = require("./prisma");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;

const cards = [];

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
  console.log("A user connected: " + socket.id);

  socket.on("register", async (name) => {
    try {
      await prisma.user.create({
        data: {
          id: socket.id,
          name: name,
          team: (await prisma.user.count()) % 2 === 0,
          spyMaster: false,
        },
      });

      const users = await prisma.user.findMany();
      io.emit("updateUserList", users);
      const activeCards = await prisma.card.findMany({
        where: { active: true },
      });

      const shuffledCards = shuffle(activeCards);
      cards.push(shuffledCards);
      console.log(cards);
      io.emit("cards", cards);
    } catch (error) {
      console.error("Error registering user:", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected: " + socket.id);

    try {
      await prisma.user.delete({
        where: {
          id: socket.id,
        },
      });

      const users = await prisma.user.findMany();
      io.emit("updateUserList", users);
    } catch (error) {
      console.error("Error disconnecting user:", error);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
