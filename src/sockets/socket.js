import { Server } from 'socket.io';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // We'll restrict this later if needed
      methods: ['GET', 'POST']
    }
  });

  // Basic connection handler (no game logic yet)
  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized!');
  }
  return io;
};
