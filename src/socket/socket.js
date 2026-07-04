import { Server } from 'socket.io';
import setupPresence from './presence.socket.js';
import setupMission from './mission.socket.js';
import setupBattle from './battle.socket.js';
import setupCommunity from './community.socket.js';

import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Restrict in production
      methods: ['GET', 'POST']
    }
  });

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET || 'secret123', async (err, decoded) => {
        if (err) {
          console.warn('Socket token verification failed:', err.message);
          return next();
        }
        socket.userId = decoded.id?.toString();
        try {
          const user = await User.findByPk(decoded.id);
          if (user) {
            socket.username = `${user.firstName} ${user.lastName}`;
          }
        } catch (e) {
          console.error('Error fetching user for socket auth:', e);
        }
        next();
      });
    } else {
      next();
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
