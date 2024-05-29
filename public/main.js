document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  const regTitle = document.getElementById("regTitle");
  const registrationForm = document.getElementById("registrationForm");
  const nameInput = document.getElementById("nameInput");

  registrationForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (name) {
      socket.emit("register", name);
      registrationForm.style.display = "none";
      regTitle.style.display = "none";
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
      userElement.textContent = user.name + " (" + user.id + ")";

      if (index % 2 === 0) {
        redUserList.appendChild(userElement);
      } else {
        blueUserList.appendChild(userElement);
      }
    });
  });

  socket.on("cards", (cards) => {
    const cardGrid = document.getElementById("cards");

    cardGrid.innerHTML = "";

    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const shuffledCards = shuffle(cards);

    shuffledCards.forEach((cardData) => {
      const cardElement = document.createElement("div");
      cardElement.textContent = cardData.word;
      cardElement.classList.add("card");

      if (cardData.color === true) {
        cardElement.style.color = "red";
      } else {
        cardElement.style.color = "blue";
      }

      cardGrid.appendChild(cardElement);
    });
  });
});
