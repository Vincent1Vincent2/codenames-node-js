document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  const regCont = document.getElementById("registration");
  const registrationForm = document.getElementById("registrationForm");
  const nameInput = document.getElementById("nameInput");

  registrationForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (name) {
      socket.emit("register", name);
      regCont.style.display = "none";
    }
  });

  socket.on("updateUserList", (users) => {
    const redUserList = document.getElementById("redUser");
    const blueUserList = document.getElementById("blueUser");

    // Clear the current lists
    redUserList.innerHTML = "";
    blueUserList.innerHTML = "";

    users.forEach((user, index) => {
      const userElement = document.createElement("li");
      userElement.textContent = user.name;

      if (index % 2 === 0) {
        redUserList.appendChild(userElement);
      } else {
        blueUserList.appendChild(userElement);
      }
    });
  });

  socket.on("cards", (cards) => {
    const cardGrid = document.getElementById("cards");

    if (!cardGrid) {
      console.error("Card grid element not found");
      return;
    }

    cardGrid.innerHTML = "";

    cards.forEach((cardData) => {
      const cardElement = document.createElement("div");
      cardElement.textContent = cardData.word;
      cardElement.classList.add("card");

      if (cardData.color === true && cardData.death === false) {
        cardElement.style.color = "#A52A2A";
      } else if (cardData.death === true) {
        cardElement.style.color = "gray";
      } else if (cardData.color === false && cardData.death === false) {
        cardElement.style.color = "#5D3FD3";
      }

      cardElement.addEventListener("click", () => {
        socket.emit("selectWord", cardData.id);
        socket.emit("death", cardData.id);
      });

      cardGrid.appendChild(cardElement);
    });
  });

  socket.on("points", (points) => {
    const red = document.getElementById("redPoints");
    const blue = document.getElementById("bluePoints");

    red.textContent = points.redPoints;
    blue.textContent = points.bluePoints;
  });
});
