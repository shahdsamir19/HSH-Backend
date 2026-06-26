export default function setupCommunity(io, socket) {
  // Add listeners for community events if needed
  socket.on('join-community', () => {
    socket.join('community-room');
  });

  socket.on('leave-community', () => {
    socket.leave('community-room');
  });

  socket.on('new-achievement-unlocked', ({ username, badgeName }) => {
    // Broadcast achievement globally to all online kids for positive reinforcement!
    socket.broadcast.emit('new-achievement-announcement', {
      username,
      badgeName,
      timestamp: new Date()
    });
  });
}
