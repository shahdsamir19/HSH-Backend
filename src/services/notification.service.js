import Notification from '../models/Notification.model.js';

export const createNotification = async (userId, title, message, icon = '🔔', io = null) => {
  try {
    const notif = await Notification.create({
      userId,
      title,
      message,
      icon
    });

    if (io) {
      // Emit to this specific user via their socket room (each user joined to their userId string room)
      io.to(userId.toString()).emit('new-notification', notif);
    }
    return notif;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
};

