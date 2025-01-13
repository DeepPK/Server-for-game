const messageElement = document.querySelector('.message');
const cellEllements = document.querySelectorAll(".cell")

let field = ["", "", "", "", "", "", "", "", "",];
let symbol = null;
let turn = null;
let IsGameActive = false;


let ws = new WebSocket("ws://localhost:8080");

ws.onmessage = message => {
    const response = JSON.parse(message.data);
  
    if (response.method === "join") {
      symbol = response.symbol;
      turn = response.turn;
      IsGameActive = symbol === turn;
      updateMessage();
    }  

    if (response.method === "update") {
        field = response.field;
        turn = response.turn;
        IsGameActive = symbol === turn;
        updateBoard();
        updateMessage();
    }

    if (response.method === "result") {
        field = response.field;
        updateBoard();
        IsGameActive = false;
        setTimeout(() => {
            messageElement.textContent = response.message;
          }, 100);
    }

    if (response.method === "left") {
        IsGameActive = false;
        messageElement.textContent = response.message;
    }
};

cellEllements.forEach((cell, index) => cell.addEventListener('click', (event) => {
    makeMove(event.target, index);
  }));

function makeMove(cell, index){
    if (!IsGameActive || field[index] != "") {
        return;
    }

    IsGameActive = false;
    cell.classList.add(symbol);
    field[index] = symbol;

    ws.send(JSON.stringify({
        "method": "move",
        "symbol": symbol,
        "field": field,
    }));
}

function updateBoard() {
    cellEllements.forEach((cell, index) => {
      cell.classList.remove("X", "O");
      field[index] !== "" && cell.classList.add(field[index]);
    });
  }

function updateMessage() {
    if (symbol === turn) {
      messageElement.textContent = "move";
    } else {
      messageElement.textContent = `waiting ${turn}...`;
    }
  }