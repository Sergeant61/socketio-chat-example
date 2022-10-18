import express from 'express';
import _http from 'http';
import socket from 'socket.io';
import randomId from 'random-id';
import { LoremIpsum } from "lorem-ipsum";
import dayjs from 'dayjs';
import fs from 'fs';
const users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'));

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4
  },
  wordsPerSentence: {
    max: 16,
    min: 4
  }
});

const app = express();
const http = _http.Server(app);
const io = socket(http);

app.get('/', function (req, res) {
  res.sendfile('index.html');
});

const sessionIds = [];

io.on('connection', function (socket) {
  socket.on('join', function (sessionId) {
    let id = randomId();

    if (sessionIds.includes(sessionId)) {
      id = sessionId;
    } else {
      sessionIds.push(id);
    }

    socket.join(id, async () => {
      socket.on('send-message', (message) => {
        io.to(id).emit('messages', [{ ...generateMessages(1), ...{ type: 'text', ...message } }]);
      });

      io.to(id).emit('messages', generateMessages(id, 5));

      for (let index = 0; index < 500; index++) {
        await sleep(getRandomInt(200, 300));
        io.to(id).emit('messages', generateMessages(id, 1));
      }
    });

    io.emit('rooms', sessionIds);
  });
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});

const generateMessages = (sessionId, len = 1) => {
  const messages = [];
  const types = ["text", "image"];

  for (let i = 0; i < len; i++) {
    const type = types[getRandomInt(0, 1)];
    const user = users[getRandomInt(0, users.length - 1)];

    messages.push({
      "_id": randomId(10),
      "sessionId": sessionId,
      "type": type,
      "user": user,
      "payload": type === 'text' ? {
        "text": lorem.generateSentences(getRandomInt(1, 10))
      } : {
        "fileUrl": "https://picsum.photos/1024/1024"
      },
      "isWhisper": false,
      "status": "sent",
      "createdAt": dayjs().add(getRandomInt(-60 * 60, 60 * 60), 'seconds').toDate()
    });
  }

  return messages;
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};