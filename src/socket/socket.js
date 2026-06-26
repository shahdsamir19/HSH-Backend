import { Server } from 'socket.io';
import setupPresence from './presence.socket.js';
import setupMission from './mission.socket.js';
import setupBattle from './battle.socket.js';
import setupCommunity from './community.socket.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Restrict in production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Register all Cyber Arena socket handlers
    setupPresence(io, socket);
    setupMission(io, socket);
    setupBattle(io, socket);
    setupCommunity(io, socket);

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  console.log('✅ Socket.IO initialized with Cyber Arena handlers');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized!');
  }
  return io;
};
