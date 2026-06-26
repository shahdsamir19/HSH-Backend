import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import User from '../models/user.model.js';
import Team from '../models/Team.model.js';
import TeamMember from '../models/TeamMember.model.js';
import { onlineUsers } from './presence.socket.js';
import { checkAndAwardBadge } from '../services/badge.service.js';

function formatTeamForClient(teamInstance) {
  if (!teamInstance) return null;
  const json = teamInstance.toJSON ? teamInstance.toJSON() : teamInstance;
  
  if (typeof json.objectives === 'string') {
    try {
      json.objectives = JSON.parse(json.objectives);
    } catch (e) {
      json.objectives = [];
    }
  }
  if (typeof json.clues === 'string') {
    try {
      json.clues = JSON.parse(json.clues);
    } catch (e) {
      json.clues = [];
    }
  }
  if (json.members) {
    json.members = json.members.map(m => ({
      ...m,
      user: m.userId // Map userId to user field for frontend compatibility
    }));
  }
  return json;
}

function calculateRank(xp) {
  if (xp >= 2900) return 'Digital Safety Hero';
  if (xp >= 1900) return 'Cyber Guardian';
  if (xp >= 1400) return 'Firewall Defender';
  if (xp >= 900) return 'Phishing Hunter';
  if (xp >= 400) return 'Password Protector';
  return 'Cyber Rookie';
}

export default function setupMission(io, socket) {
  
  socket.on('create-team', async ({ userId, missionName }) => {
    try {
      if (!userId || !missionName) return;

      const user = await User.findByPk(userId);
      if (!user) return;

      const roomCode = 'TEAM_' + uuidv4().substring(0, 6).toUpperCase();

      // Seed objectives based on mission name
      let objectives = [];
      if (missionName === 'Save Cyber City') {
        objectives = [
          { id: 'city_1', title: 'Decode phishing virus trace clues', isCompleted: false },
          { id: 'city_2', title: 'Bypass firewall with key override', isCompleted: false },
          { id: 'city_3', title: 'Decrypt city mainframe database', isCompleted: false }
        ];
      } else if (missionName === 'Malware Investigation') {
        objectives = [
          { id: 'mal_1', title: 'Find device infection origin IP', isCompleted: false },
          { id: 'mal_2', title: 'Isolate malware code using regex match', isCompleted: false },
          { id: 'mal_3', title: 'Inject antivirus vaccine patch', isCompleted: false }
        ];
      } else { // Data Rescue Mission
        objectives = [
          { id: 'rescue_1', title: 'Collect missing data backup archives', isCompleted: false },
          { id: 'rescue_2', title: 'Restore recovery key sequence', isCompleted: false },
          { id: 'rescue_3', title: 'Setup account 2FA credentials', isCompleted: false }
        ];
      }

      const team = await Team.create({
        roomCode,
        missionName,
        status: 'Lobby',
        objectives: JSON.stringify(objectives),
        clues: JSON.stringify([]),
        score: 0,
        progress: 0
      });

      await TeamMember.create({
        teamId: team.id,
        userId: user.id,
        username: `${user.firstName} ${user.lastName}`,
        isLeader: true,
        isReady: true
      });

      socket.join(roomCode);
      socket.currentTeamCode = roomCode;

      // Update player presence status
      await user.update({ status: 'Mission' });

      const pres = onlineUsers.get(userId.toString());
      if (pres) {
        pres.status = 'Mission';
        onlineUsers.set(userId.toString(), pres);
      }
      io.emit('presence-update', Array.from(onlineUsers.values()));

      const createdTeam = await Team.findOne({
        where: { roomCode },
        include: ['members']
      });

      socket.emit('team-created', { roomCode, team: formatTeamForClient(createdTeam) });
    } catch (err) {
      console.error('Error in create-team socket:', err);
    }
  });

  socket.on('join-team', async ({ userId, roomCode }) => {
    try {
      if (!userId || !roomCode) return;

      const user = await User.findByPk(userId);
      if (!user) return;

      const team = await Team.findOne({
        where: { roomCode, status: 'Lobby' },
        include: ['members']
      });
      if (!team) {
        socket.emit('join-team-failed', { message: 'Team lobby not found or mission already started.' });
        return;
      }

      // Check if user is already a member
      const isMember = team.members.some(m => m.userId.toString() === userId.toString());
      if (!isMember) {
        await TeamMember.create({
          teamId: team.id,
          userId: user.id,
          username: `${user.firstName} ${user.lastName}`,
          isLeader: false,
          isReady: false
        });
      }

      socket.join(roomCode);
      socket.currentTeamCode = roomCode;

      // Update player presence
      await user.update({ status: 'Mission' });

      const pres = onlineUsers.get(userId.toString());
      if (pres) {
        pres.status = 'Mission';
        onlineUsers.set(userId.toString(), pres);
      }
      io.emit('presence-update', Array.from(onlineUsers.values()));

      const updatedTeam = await Team.findOne({
        where: { roomCode },
        include: ['members']
      });

      io.to(roomCode).emit('team-updated', formatTeamForClient(updatedTeam));
    } catch (err) {
      console.error('Error in join-team socket:', err);
    }
  });

  socket.on('toggle-ready', async ({ roomCode }) => {
    try {
      const team = await Team.findOne({
        where: { roomCode },
        include: ['members']
      });
      if (!team) return;

      // Identify by socket.userId (set in auth middleware)
      const member = team.members.find(m => m.userId.toString() === socket.userId?.toString());
      if (!member) return;

      // Authoritatively mark this player as Ready (never toggle back to false via this event)
      if (!member.isReady) {
        await member.update({ isReady: true });
      }

      const updatedTeam = await Team.findOne({
        where: { roomCode },
        include: ['members']
      });

      io.to(roomCode).emit('team-updated', formatTeamForClient(updatedTeam));

      // Auto-start mission when ALL members are ready (minimum 2 players)
      const allReady = updatedTeam.members.every(m => m.isReady);
      if (allReady && updatedTeam.members.length >= 2 && updatedTeam.status === 'Lobby') {
        await updatedTeam.update({ status: 'Active' });
        const activeTeam = await Team.findOne({
          where: { roomCode },
          include: ['members']
        });
        io.to(roomCode).emit('mission-started', formatTeamForClient(activeTeam));
      }
    } catch (err) {
      console.error('Error toggling ready:', err);
    }
  });

  socket.on('start-mission', async ({ roomCode }) => {
    try {
      const team = await Team.findOne({
        where: { roomCode, status: 'Lobby' },
        include: ['members']
      });
      if (!team) return;

      // Ensure everyone is ready
      const allReady = team.members.every(m => m.isReady);
      if (!allReady) {
        socket.emit('start-failed', { message: 'All players must be ready!' });
        return;
      }

      await team.update({ status: 'Active' });

      const activeTeam = await Team.findOne({
        where: { roomCode },
        include: ['members']
      });

      io.to(roomCode).emit('mission-started', formatTeamForClient(activeTeam));
    } catch (err) {
      console.error('Error starting mission:', err);
    }
  });

  socket.on('send-mission-chat', async ({ roomCode, message }) => {
    try {
      const username = socket.username || 'Player';
      io.to(roomCode).emit('mission-chat-message', {
        username,
        message,
        timestamp: new Date()
      });

      // Also add to activity feed
      io.to(roomCode).emit('mission-activity', {
        type: 'chat',
        message: `${username}: ${message}`
      });
    } catch (err) {
      console.error('Error in mission chat:', err);
    }
  });

  socket.on('complete-puzzle', async ({ roomCode, objectiveId, clueText }) => {
    try {
      const team = await Team.findOne({
        where: { roomCode, status: 'Active' },
        include: ['members']
      });
      if (!team) return;

      let objectives = JSON.parse(team.objectives || '[]');
      const objective = objectives.find(o => o.id === objectiveId);
      if (!objective || objective.isCompleted) return;

      objective.isCompleted = true;
      let clues = JSON.parse(team.clues || '[]');
      if (clueText) {
        clues.push(clueText);
      }

      // Calculate progress (each objective completed adds 33.3%)
      const completedCount = objectives.filter(o => o.isCompleted).length;
      const progress = Math.round((completedCount / objectives.length) * 100);
      const score = team.score + 100;

      await team.update({
        objectives: JSON.stringify(objectives),
        clues: JSON.stringify(clues),
        progress,
        score
      });

      // Broadcast activity and update
      io.to(roomCode).emit('mission-activity', {
        type: 'objective',
        message: `Objective Completed: "${objective.title}"`
      });

      if (clueText) {
        io.to(roomCode).emit('mission-activity', {
          type: 'clue',
          message: `New Clue Discovered: "${clueText}"`
        });
      }

      const updatedTeam = await Team.findOne({
        where: { roomCode },
        include: ['members']
      });
      io.to(roomCode).emit('team-updated', formatTeamForClient(updatedTeam));

      // Check if mission is complete
      if (progress >= 100) {
        await team.update({ status: 'Finished' });

        // Award rewards
        const xpEarned = 100;
        await Promise.all(team.members.map(async (m) => {
          const user = await User.findByPk(m.userId);
          if (user) {
            const newXp = user.xp + xpEarned;
            await user.update({
              xp: newXp,
              rank: calculateRank(newXp),
              status: 'Online'
            });

            // Award badges
            if (team.missionName === 'Save Cyber City') {
              await checkAndAwardBadge(m.userId, 'Cyber Detective', io);
            } else if (team.missionName === 'Malware Investigation') {
              await checkAndAwardBadge(m.userId, 'Firewall Defender', io);
            }
            await checkAndAwardBadge(m.userId, 'Team Hero', io);

            const pres = onlineUsers.get(m.userId.toString());
            if (pres) {
              pres.status = 'Online';
              pres.xp = user.xp;
              pres.rank = user.rank;
              onlineUsers.set(m.userId.toString(), pres);
            }
          }
        }));

        io.emit('presence-update', Array.from(onlineUsers.values()));

        const finishedTeam = await Team.findOne({
          where: { roomCode },
          include: ['members']
        });

        io.to(roomCode).emit('mission-finished', {
          team: formatTeamForClient(finishedTeam),
          xpEarned,
          success: true
        });
      }
    } catch (err) {
      console.error('Error completing puzzle:', err);
    }
  });

  socket.on('leave-team', async ({ roomCode }) => {
    try {
      await handleLeaveTeam(io, socket, roomCode);
    } catch (err) {
      console.error('Error in leave-team socket:', err);
    }
  });

  socket.on('disconnect', async () => {
    try {
      if (socket.currentTeamCode) {
        await handleLeaveTeam(io, socket, socket.currentTeamCode);
      }
    } catch (err) {
      console.error('Error in mission disconnect:', err);
    }
  });
}

async function handleLeaveTeam(io, socket, roomCode) {
  const team = await Team.findOne({
    where: { roomCode },
    include: ['members']
  });
  if (!team) return;

  const userId = socket.userId;
  if (!userId) return;

  // Find member
  const member = team.members.find(m => m.userId.toString() === userId.toString());
  if (member) {
    const isLeader = member.isLeader;
    const username = member.username;
    
    await member.destroy();

    socket.leave(roomCode);
    socket.currentTeamCode = null;

    // Set user online status
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({ status: 'Online' });
    }

    const pres = onlineUsers.get(userId);
    if (pres) {
      pres.status = 'Online';
      onlineUsers.set(userId, pres);
    }

    io.to(roomCode).emit('mission-activity', {
      type: 'leave',
      message: `${username} left the team.`
    });

    const remainingMembers = await TeamMember.findAll({ where: { teamId: team.id } });
    if (remainingMembers.length === 0) {
      // Delete empty team
      await team.destroy();
    } else {
      // Re-assign leader if needed
      if (isLeader) {
        await remainingMembers[0].update({ isLeader: true, isReady: true });
      }
      const updatedTeam = await Team.findOne({
        where: { roomCode },
        include: ['members']
      });
      io.to(roomCode).emit('team-updated', formatTeamForClient(updatedTeam));
    }
  }

  io.emit('presence-update', Array.from(onlineUsers.values()));
}
