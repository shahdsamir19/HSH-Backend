import User from '../models/user.model.js';

// Map of userId string -> { socketId, username, status, avatar, xp, rank }
export const onlineUsers = new Map();

export default function setupPresence(io, socket) {
  socket.on('go-online', async ({ userId }) => {
    try {
      if (!userId) return;

      const user = await User.findByPk(userId);
      if (!user) return;

      // Join a private room for this user for direct notifications
      socket.join(userId.toString());
      socket.userId = userId.toString();

      // Check if user is already online, update state
      await user.update({ status: 'Online' });

      onlineUsers.set(userId.toString(), {
        socketId: socket.id,
        userId: userId.toString(),
        username: `${user.firstName} ${user.lastName}`,
        status: 'Online',
        avatar: user.avatar,
        xp: user.xp,
        rank: user.rank
      });

      // Broadcast presence-update
      io.emit('presence-update', Array.from(onlineUsers.values()));
    } catch (err) {
      console.error('Error in go-online socket:', err);
    }
  });

  socket.on('set-status', async ({ status }) => {
    try {
      const userId = socket.userId;
      if (!userId) return;

      const validStatuses = ['Online', 'Idle', 'Searching', 'Battle', 'Mission'];
      if (!validStatuses.includes(status)) return;

      const user = await User.findByPk(userId);
      if (user) {
        await user.update({ status });
      }

      const player = onlineUsers.get(userId);
      if (player) {
        player.status = status;
        onlineUsers.set(userId, player);
      }

      io.emit('presence-update', Array.from(onlineUsers.values()));
    } catch (err) {
      console.error('Error in set-status socket:', err);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const userId = socket.userId;
      if (!userId) return;

      // Check if there are other sockets for this user (in case of multiple tabs)
      const sockets = await io.in(userId).fetchSockets();
      if (sockets.length === 0) {
        // No other active sockets for this user, set offline
        const user = await User.findByPk(userId);
        if (user) {
          await user.update({ status: 'Offline' });
        }
        onlineUsers.delete(userId);
      }
      
      io.emit('presence-update', Array.from(onlineUsers.values()));
    } catch (err) {
      console.error('Error in presence disconnect:', err);
    }
  });
}

