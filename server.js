import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));
app.get('/', (req, res) => res.redirect('/host.html'));

// ======= Estado en memoria =======
const rooms = new Map();
const genPIN = () => Math.floor(100000 + Math.random()*900000).toString();

function createRoom({ title, timeLimit, basePoints, questions, hostSocketId }) {
  const code = genPIN();
  rooms.set(code, {
    code,
    title: title || 'PartyQuiz',
    timeLimit: Math.max(5, Number(timeLimit)||20),
    basePoints: Math.max(100, Number(basePoints)||1000),
    questions: Array.isArray(questions) ? questions : [],
    currentIndex: -1,
    hostId: hostSocketId,
    players: new Map(),
    questionStartAt: null,
    revealTimeoutId: null,
    nextTimeoutId: null,
    revealed: false
  });
  return rooms.get(code);
}

function getPublicPlayers(room){
  return [...room.players.values()].map(p=> ({ name: p.name, score: p.score }));
}

function clearTimers(room){
  if(room.revealTimeoutId){ clearTimeout(room.revealTimeoutId); room.revealTimeoutId = null; }
  if(room.nextTimeoutId){ clearTimeout(room.nextTimeoutId); room.nextTimeoutId = null; }
}

function revealAndScore(code){
  const room = rooms.get(code);
  if(!room || room.revealed) return;
  const q = room.questions[room.currentIndex];
  if(!q) return;
  room.revealed = true;

  room.players.forEach(p => {
    p.correct = (p.choice === q.answer);
    if(p.correct){
      const gained = Math.round(room.basePoints * (p.timeLeft / room.timeLimit));
      p.score += gained;
    }
  });

  const scoreboard = [...room.players.values()]
    .sort((a,b)=> b.score - a.score)
    .map(p=> ({ name:p.name, score:p.score, correct:p.correct, timeLeft:p.timeLeft }));

  io.to(code).emit('game:reveal', { correct: q.answer, scoreboard });
}

function startNextQuestion(code){
  const room = rooms.get(code);
  if(!room) return;
  clearTimers(room);
  room.currentIndex += 1;
  room.revealed = false;

  if(room.currentIndex >= room.questions.length){
    const scoreboard = [...room.players.values()]
      .sort((a,b)=> b.score - a.score)
      .map(p=>({ name:p.name, score:p.score }));
    const podium = scoreboard.slice(0,3);
    io.to(code).emit('game:over', { podium, scoreboard });
    return;
  }

  room.players.forEach(p => { p.answered = false; p.choice = null; p.timeLeft=0; p.correct=false; });
  const q = room.questions[room.currentIndex];
  room.questionStartAt = Date.now();

  io.to(code).emit('game:question', {
    index: room.currentIndex,
    total: room.questions.length,
    text: q.text,
    options: q.options,
    timeLimit: room.timeLimit,
    title: room.title
  });

  room.revealTimeoutId = setTimeout(() => {
    revealAndScore(code);
    room.nextTimeoutId = setTimeout(() => startNextQuestion(code), 3000);
  }, room.timeLimit * 1000);
}

app.get('/debug/rooms', (req, res) => {
  const snapshot = {};
  for (const [code, room] of rooms) {
    snapshot[code] = {
      title: room.title,
      players: [...room.players.values()].map(p => ({ name: p.name, score: p.score })),
      currentIndex: room.currentIndex,
      qCount: room.questions.length,
      revealed: room.revealed
    };
  }
  res.json(snapshot);
});

io.on('connection', (socket) => {
  socket.on('host:create_room', (payload, ack) => {
    try {
      const room = createRoom({ ...payload, hostSocketId: socket.id });
      socket.join(room.code);
      ack?.({ ok: true, code: room.code });
      io.to(room.code).emit('room:update', { title: room.title, players: getPublicPlayers(room) });
    } catch (e) {
      ack?.({ ok: false, error: 'No se pudo crear la sala' });
    }
  });

  socket.on('player:join', ({ code, name }, ack) => {
    const room = rooms.get(code);
    if(!room) return ack?.({ ok:false, error:'PIN inválido' });
    if([...room.players.values()].some(p => p.name.toLowerCase() === String(name).trim().toLowerCase())) {
      return ack?.({ ok:false, error:'Nombre ya en uso' });
    }
    socket.join(code);
    room.players.set(socket.id, { name: String(name).trim().slice(0,18), score: 0, answered: false, choice: null, timeLeft: 0, correct:false });
    ack?.({ ok:true, title: room.title });
    io.to(code).emit('room:update', { title: room.title, players: getPublicPlayers(room) });
  });

  socket.on('presenter:join', ({ code }, ack) => {
    const room = rooms.get(code);
    if(!room) return ack?.({ ok:false, error:'Sala no encontrada' });
    socket.join(code);
    ack?.({ ok:true });
  });

  socket.on('host:start_question', ({ code }, ack) => {
    const room = rooms.get(code);
    if(!room) return ack?.({ ok:false, error:'Sala no encontrada' });
    if(room.hostId !== socket.id) return ack?.({ ok:false, error:'No eres el host' });
    startNextQuestion(code);
    ack?.({ ok:true });
  });

  socket.on('player:answer', ({ code, choice }, ack) => {
    const room = rooms.get(code);
    if(!room) return ack?.({ ok:false, error:'Sala no encontrada' });
    const player = room.players.get(socket.id);
    if(!player) return ack?.({ ok:false, error:'Jugador no registrado' });
    if(player.answered) return ack?.({ ok:false, error:'Ya respondiste' });

    const elapsed = Math.max(0, (Date.now() - (room.questionStartAt||Date.now()))/1000);
    const timeLeft = Math.max(0, Math.round(room.timeLimit - elapsed));
    player.answered = true;
    player.choice = Number(choice);
    player.timeLeft = timeLeft;
    ack?.({ ok:true });

    const answeredCount = [...room.players.values()].filter(p=>p.answered).length;
    io.to(code).emit('game:answered_count', { answered: answeredCount, total: room.players.size });
  });


  socket.on('disconnect', () => {
    for(const [code, room] of rooms){
      if(room.hostId === socket.id){
        io.to(code).emit('room:closed');
        rooms.delete(code);
      } else if(room.players.has(socket.id)){
        room.players.delete(socket.id);
        io.to(code).emit('room:update', { title: room.title, players: getPublicPlayers(room) });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`PartyQuiz listo en http://localhost:${PORT}`));
