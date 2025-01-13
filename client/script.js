const messageElement = document.querySelector('.message'); //для изменения сообщения для игроков
const cellEllements = document.querySelectorAll(".cell") //для обновления поля

let field = ["", "", "", "", "", "", "", "", "",];
let symbol = null;
let turn = null;
let IsGameActive = false; //блочит возможность ходить, если не его ход


let ws = new WebSocket("ws://localhost:8080"); //связывает сервер и клиентов

ws.onmessage = message => { //Слушаем сервер
    const response = JSON.parse(message.data); 
  
    if (response.method === "join") { //Новое соединение
      symbol = response.symbol;
      turn = response.turn;
      IsGameActive = symbol === turn;
      updateMessage();
    }  

    if (response.method === "update") { //После каждого хода обновляем
        field = response.field;
        turn = response.turn;
        IsGameActive = symbol === turn;
        updateBoard();
        updateMessage();
    }

    if (response.method === "result") { //Если выпала победа на сервере
        field = response.field;
        updateBoard();
        IsGameActive = false;
        setTimeout(() => {
            messageElement.textContent = response.message;
          }, 100);
    }

    if (response.method === "left") { //Если один из игроков ливнул
        IsGameActive = false;
        messageElement.textContent = response.message;
    }
};

cellEllements.forEach((cell, index) => cell.addEventListener('click', (event) => {
    makeMove(event.target, index);
  })); //Если игрок кликнул по полю, то проеверяем makeMove

function makeMove(cell, index){ //Игрок делает ход
    if (!IsGameActive || field[index] != "") { //Только тот игрок, что ходит и по пустой клетке
        return;
    }

    IsGameActive = false;
    cell.classList.add(symbol);
    field[index] = symbol;

    ws.send(JSON.stringify({ //отправляем данные на сервер
        "method": "move",
        "symbol": symbol,
        "field": field,
    }));
}

function updateBoard() { //обновляет доску для клиентов
    cellEllements.forEach((cell, index) => {
      cell.classList.remove("X", "O");
      field[index] !== "" && cell.classList.add(field[index]);
    });
  }

function updateMessage() { //Проверяет чей ход и сообщает это клиенту
    if (symbol === turn) {
      messageElement.textContent = "move";
    } else {
      messageElement.textContent = `waiting ${turn}...`;
    }
  }
