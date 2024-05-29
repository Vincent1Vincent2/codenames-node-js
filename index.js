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

const getPoints = async () => {
  const redPoints = await prisma.card.findMany({
    where: {
      color: true,
      active: true,
      chosen: true,
    },
  });

  const bluePoints = await prisma.card.findMany({
    where: {
      color: false,
      active: true,
      chosen: true,
    },
  });

  return {
    bluePoints: bluePoints.length,
    redPoints: redPoints.length,
  };
};

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
      io.emit("cards", cards);

      socket.on("selectWord", async (cardId) => {
        const user = await prisma.user.findUnique({
          where: { id: socket.id },
        });
        const card = await prisma.card.findUnique({ where: { id: cardId } });

        if (card.color === true && user.team === true && card.death === false) {
          await prisma.card.update({
            where: { id: card.id },
            data: { chosen: true },
          });
        }
        if (
          card.color === false &&
          user.team === false &&
          card.death === false
        ) {
          await prisma.card.update({
            where: { id: card.id },
            data: { chosen: true },
          });
        }

        const points = await getPoints();
        io.emit("points", points);
        io.emit("cards", cards);
      });

      const points = await getPoints();
      io.emit("points", points);
      console.log(points);
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

const main = async () => {
  try {
    const points = await getPoints();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();
