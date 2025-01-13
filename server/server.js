const express = require("express"); //для работы сервера
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static(path.join(__dirname, "..", "client")));
app.listen(3000);

const httpServer = http.createServer();
const wss = new WebSocket.Server({ server: httpServer});
httpServer.listen(8080);

const clientConnection = {}; //Все подключения
const opponents = {}; //Все, что уже играют
let clientIdWaitMatch = []; //Кто ждёт игру

wss.on("connection", connection => { //Новое подключение
    const clientId = createClientId(); //Нумеруем нового клиента
    clientConnection[clientId] = connection;

    matchClients(clientId); //Пытаемся связать

    connection.on("message", message => { //Если клиент походил и сервер получил от него сообщение
        const result = JSON.parse(message);
        if (result.method === "move"){
            moveHandler(result, clientId);
        }
    });

    connection.on("close", () => { //Если кто-то ливнул
        closeClient(connection, clientId);
    });
});

function matchClients(clientId){ //Соединяем клиентов
    clientIdWaitMatch.push(clientId); //Закидываем в массив ожидания

    if (clientIdWaitMatch.length < 2) return; //Если недостаточно ожидающих для игры, то ждём дальше

    const firstClientId = clientIdWaitMatch.shift(); //Иначе берём двоих и связываем
    const secondClientId = clientIdWaitMatch.shift();

    opponents[firstClientId] = secondClientId;
    opponents[secondClientId] = firstClientId;

    clientConnection[firstClientId].send(JSON.stringify({ //Первый клиент X
        method: "join",
        symbol: "X",
        turn: "X",
    }));

    clientConnection[secondClientId].send(JSON.stringify({ //Второй О
        method: "join",
        symbol: "O",
        turn: "X",
    }));
}

function moveHandler(result, clientId){ //Если ходим, то всегда проверяем
    const opponentClientId = opponents[clientId];

    if (checkWin(result.field)) { //Возвращаем клиентам инфу о победе, если есть она. Или о ничье.
        [clientId, opponentClientId].forEach(cId => {
            clientConnection[cId].send(JSON.stringify({
              method: "result",
              message: `Player ${result.symbol} win`,
              field: result.field,
            }));
        });
        return;
    }

    if (checkDraw(result.field)) {
        [clientId, opponentClientId].forEach(cId => {
            clientConnection[cId].send(JSON.stringify({
              method: "result",
              message: "Draw",
              field: result.field,
            }));
        });
        return;
    }

    [clientId, opponentClientId].forEach(cId => { //Иначе просто обновляем всем поля и передаём ход
        clientConnection[cId].send(JSON.stringify({
          method: "update",
          turn: result.symbol === "X" ? "O" : "X",
          field: result.field,
        }));
    });    
}

function closeClient(connection, clientId) { //Если кто-то ливнул, то нужно это учесть
    connection.close(); //Просто закрываем подключение
    const isLeftUnmachedClient = clientIdWaitMatch.some(unmatchedClientId => unmatchedClientId === clientId); //Если ливнул ожидающий
  
    if (isLeftUnmachedClient) {
        clientIdWaitMatch = clientIdWaitMatch.filter(unmatchedClientId => unmatchedClientId !== clientId);
    } else { //Иначе нужно собщеть оппоненту, что его соперник ливнул.
      const opponentClientId = opponents[clientId];
      clientConnection[opponentClientId].send(JSON.stringify({
        method: "left",
        message: "opponent left",
      }));
    }
}

const winCombo = [ //Все комбинации для победы
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6] 
];

function checkWin(field){ //Проверка победы
    return winCombo.some(combo => {
        const [first, second, third] = combo;
        return field[first] != "" && field[first] === field[second] && field[first] == field[third]; //если найдётся такое поля, что равны комбинации победы, то объявляем победу
    });
}

function checkDraw(field){ //Если все поля заняты, но так и не выпала победа
    return field.every(symbol => symbol === "X" || symbol === "O");
}

let clientIdCounter = 0;
function createClientId(){ //Считаем подключения
    clientIdCounter++;
    return clientIdCounter;
}
