import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './RoomManager.js';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // En production : restreindre à novagogia.fr
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager();

// === API REST (pour vérifier le status) ===
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    rooms: roomManager.getRoomCount(),
    players: roomManager.getTotalPlayers()
  });
});

// Debug : lister les salles ouvertes
app.get('/rooms', (req, res) => {
  const rooms = [];
  roomManager.rooms.forEach((room, code) => {
    rooms.push({
      code,
      players: room.players.length,
      started: room.started,
      host: room.getPlayerName(room.hostId)
    });
  });
  res.json({ rooms });
});

// === SOCKET.IO ===
io.on('connection', (socket) => {
  console.log(`[+] Joueur connecté: ${socket.id}`);

  // --- Créer une salle ---
  socket.on('room:create', (data, callback) => {
    const { playerName, avatarId, difficulty, allowNegativeScores } = data;
    const room = roomManager.createRoom({
      difficulty,
      allowNegativeScores,
      hostId: socket.id
    });

    room.addPlayer(socket.id, playerName, avatarId);
    roomManager.registerPlayerInRoom(socket.id, room.code);
    socket.join(room.code);

    console.log(`[ROOM] ${playerName} crée la salle ${room.code}`);
    callback({ success: true, roomCode: room.code, playerId: socket.id });
  });

  // --- Rejoindre une salle ---
  socket.on('room:join', (data, callback) => {
    const { roomCode, playerName, avatarId } = data;
    const room = roomManager.getRoom(roomCode);

    if (!room) {
      callback({ success: false, error: 'Salle introuvable. Vérifiez le code.' });
      return;
    }
    if (room.started) {
      callback({ success: false, error: 'La partie a déjà commencé.' });
      return;
    }
    if (room.players.length >= 16) {
      callback({ success: false, error: 'Salle pleine (16 joueurs max).' });
      return;
    }

    room.addPlayer(socket.id, playerName, avatarId);
    roomManager.registerPlayerInRoom(socket.id, room.code);
    socket.join(room.code);

    console.log(`[ROOM] ${playerName} rejoint ${room.code}`);
    callback({ success: true, roomCode: room.code, playerId: socket.id });

    // Notifier tous les joueurs de la salle
    io.to(room.code).emit('room:playerJoined', {
      players: room.getPlayersInfo(),
      newPlayer: { id: socket.id, name: playerName, avatarId }
    });
  });

  // --- Lancer la partie ---
  socket.on('game:start', (data, callback) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room) { callback({ success: false, error: 'Salle introuvable.' }); return; }
    if (room.hostId !== socket.id) { callback({ success: false, error: 'Seul l\'hôte peut lancer.' }); return; }
    if (room.players.length < 2) { callback({ success: false, error: 'Il faut au moins 2 joueurs.' }); return; }

    room.startGame();
    console.log(`[GAME] Partie lancée dans ${room.code} (${room.players.length} joueurs)`);

    io.to(room.code).emit('game:started', {
      players: room.getPlayersInfo(),
      difficulty: room.difficulty,
      currentPlayerIndex: 0,
      turnNumber: 1
    });

    callback({ success: true });
  });

  // --- Lancer les dés (chouettes) ---
  socket.on('game:rollChouettes', (data, callback) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room || !room.started) return;
    if (room.getCurrentPlayerId() !== socket.id) {
      callback({ success: false, error: 'Ce n\'est pas votre tour.' });
      return;
    }

    const result = room.rollChouettes();
    io.to(room.code).emit('game:chouettesRolled', {
      dice: result,
      playerId: socket.id
    });
    callback({ success: true, dice: result });
  });

  // --- Lancer le cul ---
  socket.on('game:rollCul', (data, callback) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room || !room.started) return;
    if (room.getCurrentPlayerId() !== socket.id) {
      callback({ success: false, error: 'Ce n\'est pas votre tour.' });
      return;
    }

    const result = room.rollCul();
    io.to(room.code).emit('game:culRolled', {
      die: result.die,
      allDice: result.allDice,
      combination: result.combination
    });
    callback({ success: true, ...result });
  });

  // --- Buzz (réaction rapide) ---
  socket.on('game:buzz', (data) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room || !room.started) return;

    const result = room.registerBuzz(socket.id, Date.now());
    if (result) {
      io.to(room.code).emit('game:buzzRegistered', {
        playerId: socket.id,
        position: result.position,
        playerName: result.playerName
      });

      // Si le buzz est résolu (tous ont buzzé ou timeout)
      if (result.resolved) {
        io.to(room.code).emit('game:buzzResolved', result.resolution);
      }
    }
  });

  // --- Action de jeu (sirop, encaisser, soufflette, etc.) ---
  socket.on('game:action', (data, callback) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room || !room.started) return;

    const result = room.handleAction(socket.id, data.action, data.params);
    if (result.broadcast) {
      io.to(room.code).emit('game:actionResult', result);
    }
    if (callback) callback(result);
  });

  // --- Tour suivant ---
  socket.on('game:nextTurn', () => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room || !room.started) return;
    if (room.hostId !== socket.id && room.getCurrentPlayerId() !== socket.id) return;

    const turnInfo = room.nextTurn();
    io.to(room.code).emit('game:turnStarted', turnInfo);
  });

  // --- WebRTC Signaling ---
  socket.on('webrtc:offer', ({ targetId, offer }) => {
    io.to(targetId).emit('webrtc:offer', { fromId: socket.id, offer });
  });

  socket.on('webrtc:answer', ({ targetId, answer }) => {
    io.to(targetId).emit('webrtc:answer', { fromId: socket.id, answer });
  });

  socket.on('webrtc:ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc:ice-candidate', { fromId: socket.id, candidate });
  });

  // --- Déconnexion ---
  socket.on('disconnect', () => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (room) {
      const playerName = room.getPlayerName(socket.id);
      room.removePlayer(socket.id);
      roomManager.unregisterPlayer(socket.id);
      console.log(`[-] ${playerName} quitte ${room.code}`);

      if (room.players.length === 0) {
        roomManager.removeRoom(room.code);
        console.log(`[ROOM] Salle ${room.code} supprimée (vide)`);
      } else {
        // Si l'hôte quitte, transférer
        if (room.hostId === socket.id) {
          room.hostId = room.players[0].id;
        }
        io.to(room.code).emit('room:playerLeft', {
          playerId: socket.id,
          playerName,
          players: room.getPlayersInfo(),
          newHostId: room.hostId
        });
      }
    }
    console.log(`[-] Joueur déconnecté: ${socket.id}`);
  });
});

// === DÉMARRAGE ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n⚔️  Serveur Cul de Chouette en ligne sur le port ${PORT}\n`);
});
