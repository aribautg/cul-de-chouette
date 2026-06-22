import { GameRoom } from './GameRoom.js';

/**
 * Gère la création, recherche et suppression des salles.
 */
export class RoomManager {
  constructor() {
    this.rooms = new Map(); // code → GameRoom
    this.playerToRoom = new Map(); // socketId → roomCode
  }

  _generateCode() {
    const words = ['CHOUETTE', 'VELUTE', 'SIROP', 'GRAAL', 'SLOUBI', 'KADOC', 'PERCEVAL', 'EXCALIBUR', 'GRELOT', 'FLAN'];
    const word = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    const code = `${word}-${num}`;
    // Vérifier unicité
    if (this.rooms.has(code)) return this._generateCode();
    return code;
  }

  createRoom(config) {
    const code = this._generateCode();
    const room = new GameRoom(code, config);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code.toUpperCase()) || null;
  }

  getRoomByPlayer(socketId) {
    const code = this.playerToRoom.get(socketId);
    return code ? this.rooms.get(code) : null;
  }

  removeRoom(code) {
    const room = this.rooms.get(code);
    if (room) {
      room.players.forEach(p => this.playerToRoom.delete(p.id));
      this.rooms.delete(code);
    }
  }

  registerPlayerInRoom(socketId, roomCode) {
    this.playerToRoom.set(socketId, roomCode);
  }

  unregisterPlayer(socketId) {
    this.playerToRoom.delete(socketId);
  }

  getRoomCount() {
    return this.rooms.size;
  }

  getTotalPlayers() {
    let count = 0;
    this.rooms.forEach(r => count += r.players.length);
    return count;
  }
}
