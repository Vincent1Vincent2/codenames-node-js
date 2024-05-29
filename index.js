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

let cards = [];

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

const generateCards = async () => {
  const activeCards = await prisma.card.findMany({
    where: { active: true },
  });

  if (activeCards.length > 0) {
    return activeCards;
  }

  const allCards = await prisma.card.findMany();
  let selectedWords = allCards.sort(() => 0.5 - Math.random()).slice(0, 25);
  const deathCardIndex = Math.floor(Math.random() * 25);
  selectedWords[deathCardIndex].death = true;
  selectedWords[deathCardIndex].active = true;

  let teamCards = selectedWords.filter((_, index) => index !== deathCardIndex);

  for (let i = 0; i < 12; i++) {
    teamCards[i].color = true; // Red
    teamCards[i].active = true;
  }

  for (let i = 12; i < 24; i++) {
    teamCards[i].color = false; // Blue
    teamCards[i].active = true;
  }

  teamCards = teamCards.map((card) => {
    card.death = false;
    card.chosen = false;
    return card;
  });

  selectedWords = [...teamCards, selectedWords[deathCardIndex]];
  selectedWords = selectedWords.sort(() => 0.5 - Math.random());

  const updatePromises = selectedWords.map((card) =>
    prisma.card.update({
      where: { id: card.id },
      data: {
        color: card.color,
        active: card.active,
        death: card.death,
        chosen: card.chosen,
      },
    })
  );

  await Promise.all(updatePromises);
  return selectedWords;
};

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", async (socket) => {
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

      // Ensure cards are generated and emitted on registration
      if (cards.length === 0) {
        cards = await generateCards();
      }
      socket.emit("cards", cards);

      const points = await getPoints();
      socket.emit("points", points);

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

      socket.on("death", async (cardId) => {
        const user = await prisma.user.findUnique({
          where: { id: socket.id },
        });
        const card = await prisma.card.findUnique({ where: { id: cardId } });
        if (card.death === true) {
          const oppositeTeamCards = await prisma.card.findMany({
            where: { active: true, color: !user.team, death: false },
          });
          const updatePromises = oppositeTeamCards.map((card) =>
            prisma.card.update({
              where: { id: card.id },
              data: { chosen: true },
            })
          );

          await Promise.all(updatePromises);
          const points = await getPoints();
          io.emit("points", points);
        }
      });
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
    cards = await generateCards();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();
