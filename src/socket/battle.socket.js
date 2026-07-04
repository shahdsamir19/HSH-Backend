import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import User from '../models/user.model.js';
import Question from '../models/Question.model.js';
import Battle from '../models/Battle.model.js';
import BattlePlayer from '../models/BattlePlayer.model.js';
import { onlineUsers } from './presence.socket.js';
import { checkAndAwardBadge } from '../services/badge.service.js';
import { isStage1Completed, getUnlockedStage } from '../services/Progress.service.js';

// Matchmaking queue: [{ userId, socketId, xp, username }]
const matchmakingQueue = [];

// Track active battle states in memory
const activeBattles = new Map();

// Track pending lobbies (friend invite system)
const pendingLobbies = new Map();

function calculateRank(xp) {
  if (xp >= 2900) return 'Digital Safety Hero';
  if (xp >= 1900) return 'Cyber Guardian';
  if (xp >= 1400) return 'Firewall Defender';
  if (xp >= 900) return 'Phishing Hunter';
  if (xp >= 400) return 'Password Protector';
  return 'Cyber Rookie';
}

function getHigherScorePlayer(battle) {
  const [p1, p2] = battle.players;
  if (p1.score > p2.score) return p1.userId;
  if (p2.score > p1.score) return p2.userId;
  return null;
}

function getHigherShieldPlayer(battle) {
  const [p1, p2] = battle.players;
  if (p1.shield > p2.shield) return p1.userId;
  if (p2.shield > p1.shield) return p2.userId;
  return null;
}

function getOutbreakWinner(battle) {
  const counts = {};
  battle.players.forEach(p => { counts[p.userId] = 0; });
  battle.grid.forEach(zone => {
    if (zone.status === 'cleaned' && zone.owner) {
      counts[zone.owner] = (counts[zone.owner] || 0) + 1;
    }
  });
  const [p1, p2] = battle.players;
  if (counts[p1.userId] > counts[p2.userId]) return p1.userId;
  if (counts[p2.userId] > counts[p1.userId]) return p2.userId;
  return null;
}

function getHigherHpPlayer(battle) {
  const [p1, p2] = battle.players;
  if (p1.hp > p2.hp) return p1.userId;
  if (p2.hp > p1.hp) return p2.userId;
  return null;
}

function emitShieldsUpdate(io, roomCode, battle) {
  const playerShields = {};
  battle.players.forEach(p => { playerShields[p.userId] = p.shield; });
  io.to(roomCode).emit('shield-update', { playerShields });
}

function emitDuelUpdate(io, roomCode, battle) {
  const playersMap = {};
  battle.players.forEach(p => {
    playersMap[p.userId] = {
      hp: p.hp,
      combo: p.combo,
      shieldActive: p.shieldActive,
      powerups: p.powerups
    };
  });
  io.to(roomCode).emit('duel-update', { players: playersMap });
}

export default function setupBattle(io, socket) {
  
  socket.on('join-matchmaking', async ({ userId }) => {
    try {
      const resolvedId = userId || socket.userId;
      if (!resolvedId) return;

      // Ensure user is not already in queue or in battle
      if (matchmakingQueue.some(p => p.userId === resolvedId.toString())) return;
      if (Array.from(activeBattles.values()).some(b => b.players.some(p => p.userId === resolvedId.toString()))) return;

      const user = await User.findByPk(resolvedId);
      if (!user) return;

      const userStage = await getUnlockedStage(user);
      if (userStage < 1) {
        socket.emit('arena-locked', { message: 'Complete Stage 1 (Levels 1–4) to unlock the Cyber Arena.' });
        return;
      }

      // Update player presence status to 'Searching'
      await user.update({ status: 'Searching' });

      const presencePlayer = onlineUsers.get(resolvedId.toString());
      if (presencePlayer) {
        presencePlayer.status = 'Searching';
        onlineUsers.set(resolvedId.toString(), presencePlayer);
      }
      io.emit('presence-update', Array.from(onlineUsers.values()));

      // Put in queue
      matchmakingQueue.push({
        userId: resolvedId.toString(),
        socketId: socket.id,
        xp: user.xp,
        username: `${user.firstName} ${user.lastName}`,
        rank: user.rank,
        avatar: user.avatar,
        stage: userStage
      });

      socket.emit('matchmaking-started', { estimatedWaitTime: 12, rank: user.rank });

      // Try matchmaking
      await checkAndMatch(io);
    } catch (err) {
      console.error('Error in join-matchmaking:', err);
    }
  });

  socket.on('cancel-matchmaking', async () => {
    try {
      const idx = matchmakingQueue.findIndex(p => p.socketId === socket.id);
      if (idx > -1) {
        const player = matchmakingQueue[idx];
        matchmakingQueue.splice(idx, 1);

        const user = await User.findByPk(player.userId);
        if (user) {
          await user.update({ status: 'Online' });
        }

        const presencePlayer = onlineUsers.get(player.userId);
        if (presencePlayer) {
          presencePlayer.status = 'Online';
          onlineUsers.set(player.userId, presencePlayer);
        }
        io.emit('presence-update', Array.from(onlineUsers.values()));
        socket.emit('matchmaking-cancelled');
      }
    } catch (err) {
      console.error('Error cancelling matchmaking:', err);
    }
  });

  // =============================================
  // FRIEND INVITE & LOBBY SYSTEM
  // =============================================

  socket.on('invite-friend', async ({ friendId, username }) => {
    try {
      const inviterId = socket.userId;
      if (!inviterId) return;

      // Stage 1 lock check
      const inviterUser = await User.findByPk(inviterId);
      const inviterStage = await getUnlockedStage(inviterUser);
      if (!inviterUser || inviterStage < 1) {
        socket.emit('arena-locked', { message: 'Complete Stage 1 (Levels 1–4) to unlock the Cyber Arena.' });
        return;
      }

      const inviterData = onlineUsers.get(inviterId);
      if (!inviterData) return;

      const friendIdStr = friendId.toString();
      const receiver = onlineUsers.get(friendIdStr);
      if (!receiver) {
        socket.emit('invite-sent', { status: 'error', message: 'Player is offline.' });
        return;
      }

      if (friendIdStr === inviterId) {
        socket.emit('invite-sent', { status: 'error', message: 'Cannot invite yourself.' });
        return;
      }

      if (['Battle', 'Lobby', 'Mission'].includes(receiver.status)) {
        socket.emit('invite-sent', { status: 'error', message: 'Player is already in a match or lobby.' });
        return;
      }

      const roomId = 'LOBBY_' + uuidv4().substring(0, 8).toUpperCase();
      const lobby = {
        roomId,
        inviterId,
        inviterSocketId: socket.id,
        inviterName: inviterData.username,
        inviterAvatar: inviterData.avatar || '👤',
        invitedId: friendIdStr,
        players: [
          { id: inviterId, socketId: socket.id, username: inviterData.username, avatar: inviterData.avatar || '👤', isReady: false, isHost: true }
        ],
        timeout: null
      };

      pendingLobbies.set(roomId, lobby);
      socket.join(roomId);

      // Auto-expire after 60 seconds
      lobby.timeout = setTimeout(() => {
        if (pendingLobbies.has(roomId)) {
          pendingLobbies.delete(roomId);
          socket.emit('invite-expired', { roomId, message: 'Invitation expired after 60 seconds.' });
          const receiverSock = io.sockets.sockets.get(receiver.socketId);
          if (receiverSock) receiverSock.emit('invite-expired', { roomId });
        }
      }, 60000);

      socket.emit('invite-sent', { status: 'ok', roomId, friendName: username });
      socket.emit('lobby-state', { players: lobby.players, roomId });
      io.to(friendIdStr).emit('game-invite', {
        roomId,
        inviterId,
        inviterName: inviterData.username,
        inviterAvatar: inviterData.avatar || '👤'
      });
    } catch (err) {
      console.error('Error in invite-friend:', err);
    }
  });

  socket.on('accept-invite', async ({ roomId }) => {
    try {
      const joinerId = socket.userId;
      if (!joinerId) return;

      const lobby = pendingLobbies.get(roomId);
      if (!lobby) {
        socket.emit('lobby-cancelled', { message: 'Lobby not found or expired.' });
        return;
      }

      if (joinerId.toString() !== lobby.invitedId) return;
      if (lobby.timeout) clearTimeout(lobby.timeout);

      const joinerData = onlineUsers.get(joinerId);
      if (!joinerData) return;

      lobby.players.push({
        id: joinerId,
        socketId: socket.id,
        username: joinerData.username,
        avatar: joinerData.avatar || '👤',
        isReady: false,
        isHost: false
      });

      socket.join(roomId);

      await User.update({ status: 'Lobby' }, { where: { id: { [Op.in]: lobby.players.map(p => p.id) } } });
      lobby.players.forEach(p => {
        const pres = onlineUsers.get(p.id);
        if (pres) { pres.status = 'Lobby'; onlineUsers.set(p.id, pres); }
      });
      io.emit('presence-update', Array.from(onlineUsers.values()));

      io.to(lobby.inviterId).emit('invite-accepted', { roomId, joinerName: joinerData.username });
      io.to(roomId).emit('lobby-state', { players: lobby.players, roomId });
      io.to(roomId).emit('player-joined', lobby.players[1]);
    } catch (err) {
      console.error('Error in accept-invite:', err);
    }
  });

  socket.on('join-lobby', ({ roomId }) => {
    try {
      if (!roomId) return;
      const lobby = pendingLobbies.get(roomId);
      if (!lobby) {
        socket.emit('lobby-cancelled', { message: 'Lobby not found or has already started.' });
        return;
      }
      socket.join(roomId);
      socket.emit('lobby-state', { players: lobby.players, roomId });
    } catch (err) {
      console.error('Error in join-lobby:', err);
    }
  });

  socket.on('decline-invite', ({ roomId }) => {
    try {
      const lobby = pendingLobbies.get(roomId);
      if (!lobby) return;
      if (lobby.timeout) clearTimeout(lobby.timeout);
      pendingLobbies.delete(roomId);
      io.to(lobby.inviterId).emit('invite-declined', { roomId, message: 'Your invitation was declined.' });
    } catch (err) {
      console.error('Error in decline-invite:', err);
    }
  });

  socket.on('set-ready', async ({ roomId, ready }) => {
    try {
      const lobby = pendingLobbies.get(roomId);
      if (!lobby) return;

      const playerIdStr = socket.userId?.toString();
      if (!playerIdStr) return;

      lobby.players = lobby.players.map(p => {
        if (p.id.toString() === playerIdStr) p.isReady = ready;
        return p;
      });

      io.to(roomId).emit('player-ready', { userId: playerIdStr, ready });

      if (lobby.players.length === 2 && lobby.players.every(p => p.isReady)) {
        pendingLobbies.delete(roomId);

        const p1Data = onlineUsers.get(lobby.players[0].id) || {};
        const p2Data = onlineUsers.get(lobby.players[1].id) || {};

        const p1 = {
          userId: lobby.players[0].id,
          username: lobby.players[0].username,
          socketId: lobby.players[0].socketId,
          avatar: p1Data.avatar || '👤',
          rank: p1Data.rank || 'Cyber Rookie'
        };
        const p2 = {
          userId: lobby.players[1].id,
          username: lobby.players[1].username,
          socketId: lobby.players[1].socketId,
          avatar: p2Data.avatar || '👤',
          rank: p2Data.rank || 'Cyber Rookie'
        };

        await startMultiplayerMatch(io, roomId, p1, p2);
      }
    } catch (err) {
      console.error('Error in set-ready:', err);
    }
  });

  socket.on('cancel-lobby', async ({ roomId }) => {
    try {
      const lobby = pendingLobbies.get(roomId);
      if (!lobby) return;
      if (lobby.timeout) clearTimeout(lobby.timeout);
      pendingLobbies.delete(roomId);

      io.to(roomId).emit('lobby-cancelled', { message: 'Lobby was cancelled.' });

      const ids = lobby.players.map(p => p.id);
      await User.update({ status: 'Online' }, { where: { id: { [Op.in]: ids } } });
      ids.forEach(id => {
        const pres = onlineUsers.get(id);
        if (pres) { pres.status = 'Online'; onlineUsers.set(id, pres); }
      });
      io.emit('presence-update', Array.from(onlineUsers.values()));
    } catch (err) {
      console.error('Error in cancel-lobby:', err);
    }
  });

  // =============================================
  // END INVITE/LOBBY SYSTEM
  // =============================================

  // Detective Mode start investigation ready trigger
  socket.on('start-investigation', ({ roomCode }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle || battle.gameMode !== 'detective') return;

      // Guard: if investigation already started, ignore duplicate events
      if (battle.investigationStarted) return;

      const player = battle.players.find(p => p.socketId === socket.id);
      if (!player || player.readyForInvestigation) return; // already marked ready

      player.readyForInvestigation = true;
      io.to(roomCode).emit('opponent-ready-status', { userId: player.userId, ready: true });

      const allReady = battle.players.every(p => p.readyForInvestigation);
      if (allReady) {
        // Lock immediately so no second invocation can slip through
        battle.investigationStarted = true;
        io.to(roomCode).emit('investigation-countdown-start');
        setTimeout(() => {
          runDetectiveMode(io, roomCode);
        }, 3000);
      }
    } catch (e) {
      console.error('Error in start-investigation:', e);
    }
  });

  // Detective Mode solve submission
  socket.on('submit-detective-report', async ({ roomCode, report }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle || battle.gameMode !== 'detective') return;

      const player = battle.players.find(p => p.socketId === socket.id);
      if (!player || player.answered) return;

      const scenario = battle.questions[0];
      
      let expectedTimeline = [];
      let expectedPreventive = [];
      
      if (battle.scenarioName === 'Case File #001') {
        expectedTimeline = ['phishing-email', 'unsafe-site', 'weak-password', 'no-2fa'];
        expectedPreventive = ['strong-pw', '2fa', 'verify-url', 'no-links'];
      } else if (battle.scenarioName === 'Case File #002') {
        expectedTimeline = ['usb', 'exe', 'site', 'dl', 'email', 'ignore', 'activate', 'encrypt'];
        expectedPreventive = ['pwd', 'twofa', 'usb', 'sites', 'fw', 'patch', 'alerts', 'av'];
      } else if (battle.scenarioName === 'Case File #003') {
        expectedTimeline = ['weak_password', '2fa_off', 'public_link', 'ignored_warning', 'third_party_app'];
        expectedPreventive = ['vpn', '2fa', 'strong_pw', 'verify_links', 'no_public_wifi'];
      } else {
        // Fallback for unknown scenario
        expectedTimeline = report.timeline || [];
        expectedPreventive = report.preventiveActions || [];
      }

      let timelineCorrect = true;
      if (report.timeline && report.timeline.length === expectedTimeline.length) {
        for (let i = 0; i < expectedTimeline.length; i++) {
          const item = report.timeline[i] ? report.timeline[i].toLowerCase() : '';
          if (item !== expectedTimeline[i]) {
            timelineCorrect = false;
          }
        }
      } else {
        timelineCorrect = false;
      }

      const chosenPreventive = report.preventiveActions || [];
      const preventiveCorrect = expectedPreventive.every(p => chosenPreventive.includes(p));

      // Root cause check (looser match based on scenario answer)
      let isRootCauseCorrect = false;
      if (report.rootCause) {
        const rc = report.rootCause.toLowerCase();
        isRootCauseCorrect = (scenario.correctAnswer.toLowerCase() === rc) || rc.includes('phish') || rc === 'b' || rc === 'c';
      }

      const allCorrect = isRootCauseCorrect && timelineCorrect && preventiveCorrect;

      if (allCorrect) {
        socket.emit('report-result', { correct: true });
        io.to(roomCode).emit('opponent-report-submitted', { userId: player.userId });

        // Award +10 XP for correct final solution (rule: correct final solution)
        try {
          const u = await User.findByPk(player.userId);
          if (u) {
            await u.update({ xp: u.xp + 10, score: u.score + 10 });
          }
        } catch (xpErr) {
          console.error('Error awarding solution XP:', xpErr);
        }
      } else {
        socket.emit('report-result', { 
          correct: false, 
          message: 'Incorrect root cause analysis, timeline order, or preventive measures. Review evidence!' 
        });
      }
    } catch (err) {
      console.error('Error in submit-detective-report:', err);
    }
  });

  // Clue found event (+5 XP per clue, synced to both xp and score)
  socket.on('clue-found', async ({ roomCode, progress, clueId }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle) return;
      const player = battle.players.find(p => p.socketId === socket.id);
      if (player) {
        player.score = Math.max(player.score, progress);
        io.to(roomCode).emit('score-update', battle.players.map(p => ({ userId: p.userId, score: p.score })));
        socket.to(roomCode).emit('opponent-clue-found', { userId: player.userId, progress, clueId });

        // Award +5 XP for finding a clue (rule: every clue found)
        try {
          const u = await User.findByPk(player.userId);
          if (u) {
            await u.update({ xp: u.xp + 5, score: u.score + 5 });
          }
        } catch (xpErr) {
          console.error('Error awarding clue XP:', xpErr);
        }
      }
    } catch (e) {
      console.error('Error clue-found:', e);
    }
  });

  // Timeline updated socket event
  socket.on('timeline-updated', ({ roomCode }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle) return;
      const player = battle.players.find(p => p.socketId === socket.id);
      if (player) {
        socket.to(roomCode).emit('opponent-timeline-updated', { userId: player.userId });
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Recovery progress event
  socket.on('recovery-progress', ({ roomCode, step }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle) return;
      const player = battle.players.find(p => p.socketId === socket.id);
      if (player) {
        socket.to(roomCode).emit('opponent-recovery-progress', { userId: player.userId, step });
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Player state/status change sync
  socket.on('status-changed', ({ roomCode, state }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle) return;
      const player = battle.players.find(p => p.socketId === socket.id);
      if (player) {
        player.state = state;
        socket.to(roomCode).emit('opponent-status-changed', { userId: player.userId, state });
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Recovery wizard completed
  socket.on('finish-recovery', async ({ roomCode }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle || battle.gameMode !== 'detective') return;

      const player = battle.players.find(p => p.socketId === socket.id);
      if (!player) return;

      player.answered = true;
      player.score = 100;
      clearInterval(battle.intervalId);

      io.to(roomCode).emit('score-update', battle.players.map(p => ({ userId: p.userId, score: p.score })));
      await endBattleNormally(io, roomCode, player.userId);
    } catch (err) {
      console.error('Error in finish-recovery:', err);
    }
  });

  // CTF flag submission
  socket.on('submit-ctf-flag', async ({ roomCode, answer }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle || battle.gameMode !== 'ctf') return;

      const player = battle.players.find(p => p.socketId === socket.id);
      if (!player || player.answered) return;

      const question = battle.questions[battle.currentQuestionIndex];
      const isCorrect = question.correctAnswer.toLowerCase() === answer.trim().toLowerCase();

      if (isCorrect) {
        player.answered = true;
        const isGolden = battle.currentQuestionIndex === 2; // 3rd is golden
        const pts = isGolden ? 2 : 1;
        player.fragments += pts;
        player.score += pts * 20;

        const playerFragments = {};
        battle.players.forEach(p => { playerFragments[p.userId] = p.fragments; });

        io.to(roomCode).emit('fragment-earned', {
          username: player.username,
          playerFragments
        });

        if (player.fragments >= 5) {
          clearInterval(battle.intervalId);
          await endBattleNormally(io, roomCode, player.userId);
        }
      }
    } catch (err) {
      console.error('Error in submit-ctf-flag:', err);
    }
  });

  // City Defense Allow/Block action
  socket.on('defend-action', async ({ roomCode, action }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle || battle.gameMode !== 'defense') return;

      const player = battle.players.find(p => p.socketId === socket.id);
      if (!player || player.answered) return;

      player.answered = true;
      const question = battle.questions[battle.waveIndex];
      const isCorrect = question.correctAnswer.toUpperCase() === action.toUpperCase();

      if (isCorrect) {
        player.score += 10;
        player.shield = Math.min(100, player.shield + 10);
      } else {
        player.shield = Math.max(0, player.shield - 20);
      }

      emitShieldsUpdate(io, roomCode, battle);

      if (player.shield <= 0) {
        clearInterval(battle.intervalId);
        const opponent = battle.players.find(p => p.userId !== player.userId);
        await endBattleNormally(io, roomCode, opponent ? opponent.userId : null);
      }
    } catch (err) {
      console.error('Error in defend-action:', err);
    }
  });

  // Outbreak clean zone request
  socket.on('request-clean-zone', ({ roomCode, zoneIndex }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle || battle.gameMode !== 'outbreak') return;

      const player = battle.players.find(p => p.socketId === socket.id);
      if (!player) return;

      const zone = battle.grid[zoneIndex];
      if (!zone || zone.status === 'cleaned') return;

      const randomQuestion = battle.questions[Math.floor(Math.random() * battle.questions.length)];
      player.currentZoneIndex = zoneIndex;
      player.currentQuestion = randomQuestion;

      socket.emit('clean-zone-challenge', {
        zoneIndex,
        questionText: randomQuestion.questionText,
        options: {
          A: randomQuestion.optionA,
          B: randomQuestion.optionB,
          C: randomQuestion.optionC,
          D: randomQuestion.optionD
        }
      });
    } catch (err) {
      console.error('Error in request-clean-zone:', err);
    }
  });

  // Outbreak submit clean zone
  socket.on('submit-clean-zone', async ({ roomCode, zoneIndex, answer }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle || battle.gameMode !== 'outbreak') return;

      const player = battle.players.find(p => p.socketId === socket.id);
      if (!player || player.currentZoneIndex !== zoneIndex) return;

      const zone = battle.grid[zoneIndex];
      if (!zone || zone.status === 'cleaned') return;

      const isCorrect = player.currentQuestion?.correctAnswer.toLowerCase() === answer.toLowerCase();
      player.currentZoneIndex = null;
      player.currentQuestion = null;

      if (isCorrect) {
        zone.status = 'cleaned';
        zone.owner = player.userId;
        player.score += 20;

        io.to(roomCode).emit('outbreak-map-update', { grid: battle.grid });
      } else {
        socket.emit('clean-zone-result', { correct: false, message: 'Decontamination failed! Try another zone.' });
      }
    } catch (err) {
      console.error('Error in submit-clean-zone:', err);
    }
  });

  // Duel submit answer
  socket.on('submit-duel-answer', async ({ roomCode, answer }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle || battle.gameMode !== 'duel') return;

      const player = battle.players.find(p => p.socketId === socket.id);
      if (!player || player.answered) return;

      player.answered = true;
      const question = battle.questions[battle.currentQuestionIndex];
      const isCorrect = question.correctAnswer.toLowerCase() === answer.toLowerCase();

      if (isCorrect) {
        player.score += 10;
        player.combo += 1;

        const opponent = battle.players.find(p => p.userId !== player.userId);
        if (opponent) {
          let damage = 20;
          if (player.combo >= 3) {
            damage = 35; // combo bonus
            player.combo = 0;
          }

          if (opponent.shieldActive) {
            opponent.shieldActive = false;
            damage = 0;
          } else {
            opponent.hp = Math.max(0, opponent.hp - damage);
          }

          // 40% chance powerup
          if (Math.random() < 0.4) {
            const list = ['firewall-shield', 'system-patch', 'cyber-blast'];
            const got = list[Math.floor(Math.random() * list.length)];
            player.powerups.push(got);
          }

          emitDuelUpdate(io, roomCode, battle);

          if (opponent.hp <= 0) {
            clearInterval(battle.intervalId);
            await endBattleNormally(io, roomCode, player.userId);
          }
        }
      } else {
        player.combo = 0;
        emitDuelUpdate(io, roomCode, battle);
      }
    } catch (err) {
      console.error('Error in submit-duel-answer:', err);
    }
  });

  // Duel activate power-up
  socket.on('activate-powerup', async ({ roomCode, powerup }) => {
    try {
      const battle = activeBattles.get(roomCode);
      if (!battle || battle.gameMode !== 'duel') return;

      const player = battle.players.find(p => p.socketId === socket.id);
      if (!player) return;

      const idx = player.powerups.indexOf(powerup);
      if (idx > -1) {
        player.powerups.splice(idx, 1);

        if (powerup === 'firewall-shield') {
          player.shieldActive = true;
        } else if (powerup === 'system-patch') {
          player.hp = Math.min(100, player.hp + 25);
        } else if (powerup === 'cyber-blast') {
          const opponent = battle.players.find(p => p.userId !== player.userId);
          if (opponent) {
            if (opponent.shieldActive) {
              opponent.shieldActive = false;
            } else {
              opponent.hp = Math.max(0, opponent.hp - 20);
            }
          }
        }

        emitDuelUpdate(io, roomCode, battle);

        const opponent = battle.players.find(p => p.userId !== player.userId);
        if (opponent && opponent.hp <= 0) {
          clearInterval(battle.intervalId);
          await endBattleNormally(io, roomCode, player.userId);
        }
      }
    } catch (err) {
      console.error('Error activating powerup:', err);
    }
  });

  socket.on('send-reaction', ({ roomCode, emoji }) => {
    socket.to(roomCode).emit('reaction-received', emoji);
  });

  socket.on('leave-room', async ({ roomCode }) => {
    try {
      await handleDisconnectOrLeave(io, socket, roomCode);
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const qIdx = matchmakingQueue.findIndex(p => p.socketId === socket.id);
      if (qIdx > -1) {
        matchmakingQueue.splice(qIdx, 1);
      }

      for (const [roomCode, battle] of activeBattles.entries()) {
        if (battle.players.some(p => p.socketId === socket.id)) {
          await handleDisconnectOrLeave(io, socket, roomCode);
          break;
        }
      }
    } catch (err) {
      console.error('Error in battle disconnect:', err);
    }
  });
}

async function checkAndMatch(io) {
  if (matchmakingQueue.length < 2) return;

  matchmakingQueue.sort((a, b) => a.xp - b.xp);

  while (matchmakingQueue.length >= 2) {
    const player1 = matchmakingQueue.shift();
    const player2 = matchmakingQueue.shift();

    const roomCode = 'ROOM_' + uuidv4().substring(0, 8).toUpperCase();

    const s1 = io.sockets.sockets.get(player1.socketId);
    const s2 = io.sockets.sockets.get(player2.socketId);

    if (s1) s1.join(roomCode);
    if (s2) s2.join(roomCode);

    // Update users statuses in PostgreSQL
    await User.update(
      { status: 'Battle' },
      { where: { id: { [Op.in]: [player1.userId, player2.userId] } } }
    );

    [player1, player2].forEach(p => {
      const pres = onlineUsers.get(p.userId);
      if (pres) {
        pres.status = 'Battle';
        onlineUsers.set(p.userId, pres);
      }
    });
    io.emit('presence-update', Array.from(onlineUsers.values()));

    // Determine selected scenario based on lowest unlocked stage
    const gameMode = 'detective';
    const selectedStage = Math.min(player1.stage || 1, player2.stage || 1);
    const caseFilter = `Case File #00${selectedStage}`;

    // Fetch questions for mode
    const questions = await Question.findAll({ where: { gameMode } });
    let selectedQuestions = questions.filter(q => q.questionText.includes(caseFilter));
    
    // Fallback if not found
    if (selectedQuestions.length === 0) {
      selectedQuestions = questions.slice(0, 1);
    }

    const battle = await Battle.create({
      roomCode,
      gameMode,
      status: 'Active',
      scenarioName: gameMode === 'detective' ? 'Log Anomaly' : '',
      currentQuestionIndex: 0
    });

    await BattlePlayer.create({ battleId: battle.id, userId: player1.userId, username: player1.username, socketId: player1.socketId });
    await BattlePlayer.create({ battleId: battle.id, userId: player2.userId, username: player2.username, socketId: player2.socketId });

    // Seed/Randomize detective configuration for this match
    const detectiveConfig = {
      phonePosition: Math.floor(Math.random() * 4), // 0: desk, 1: bed, 2: backpack, 3: drawer
      laptopWallpaper: ['dark', 'neon-blue', 'retro', 'hacker'][Math.floor(Math.random() * 4)],
      musicId: Math.floor(Math.random() * 3) + 1,
      emailShuffled: [0, 1, 2, 3].sort(() => Math.random() - 0.5),
      chatShuffled: [0, 1, 2].sort(() => Math.random() - 0.5),
      drawerShuffled: [0, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5)
    };

    const battleState = {
      battleId: battle.id,
      roomCode,
      gameMode,
      detectiveConfig,
      players: [
        { userId: player1.userId, socketId: player1.socketId, username: player1.username, score: 0, hp: 100, shield: 100, fragments: 0, combo: 0, shieldActive: false, powerups: [], currentZoneIndex: null, answered: false, state: 'Idle' },
        { userId: player2.userId, socketId: player2.socketId, username: player2.username, score: 0, hp: 100, shield: 100, fragments: 0, combo: 0, shieldActive: false, powerups: [], currentZoneIndex: null, answered: false, state: 'Idle' }
      ],
      questions: selectedQuestions,
      currentQuestionIndex: 0,
      secondsLeft: 15,
      intervalId: null,
      grid: Array(9).fill(null).map((_, i) => ({ zoneIndex: i, status: Math.random() > 0.4 ? 'infected' : 'cleaned', owner: null })),
      waveIndex: 0,
      totalWaves: 8
    };

    activeBattles.set(roomCode, battleState);

    io.to(roomCode).emit('match-found', {
      roomCode,
      gameMode,
      detectiveConfig,
      player1: { id: player1.userId, username: player1.username, avatar: player1.avatar, rank: player1.rank },
      player2: { id: player2.userId, username: player2.username, avatar: player2.avatar, rank: player2.rank }
    });

    setTimeout(() => {
      startBattleLoop(io, roomCode);
    }, 4000);
  }
}

// Start a match between two players from the friend invite lobby (quiz mode)
async function startMultiplayerMatch(io, roomId, p1, p2) {
  try {
    const s1 = io.sockets.sockets.get(p1.socketId);
    const s2 = io.sockets.sockets.get(p2.socketId);
    if (s1) s1.join(roomId);
    if (s2) s2.join(roomId);

    await User.update(
      { status: 'Battle' },
      { where: { id: { [Op.in]: [p1.userId, p2.userId] } } }
    );
    [p1, p2].forEach(p => {
      const pres = onlineUsers.get(p.userId);
      if (pres) { pres.status = 'Battle'; onlineUsers.set(p.userId, pres); }
    });
    io.emit('presence-update', Array.from(onlineUsers.values()));

    // Fetch stages for both players
    const u1 = await User.findByPk(p1.userId);
    const u2 = await User.findByPk(p2.userId);
    const stage1 = await getUnlockedStage(u1);
    const stage2 = await getUnlockedStage(u2);
    
    const selectedStage = Math.min(stage1 || 1, stage2 || 1);
    const caseFilter = `Case File #00${selectedStage}`;

    const gameMode = 'detective';
    const questions = await Question.findAll({ where: { gameMode } });
    let selectedQuestions = questions.filter(q => q.questionText.includes(caseFilter));
    
    if (selectedQuestions.length === 0) {
      selectedQuestions = questions.slice(0, 1);
    }

    const battle = await Battle.create({
      roomCode: roomId,
      gameMode: 'detective',
      status: 'Active',
      scenarioName: selectedQuestions[0].questionText.split(':')[0], // e.g., 'Case File #001'
      currentQuestionIndex: 0
    });

    await BattlePlayer.create({ battleId: battle.id, userId: p1.userId, username: p1.username, socketId: p1.socketId });
    await BattlePlayer.create({ battleId: battle.id, userId: p2.userId, username: p2.username, socketId: p2.socketId });

    const detectiveConfig = {
      phonePosition: Math.floor(Math.random() * 4),
      laptopWallpaper: ['dark', 'neon-blue', 'retro', 'hacker'][Math.floor(Math.random() * 4)],
      musicId: Math.floor(Math.random() * 3) + 1,
      emailShuffled: [0, 1, 2, 3].sort(() => Math.random() - 0.5),
      chatShuffled: [0, 1, 2].sort(() => Math.random() - 0.5),
      drawerShuffled: [0, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5)
    };

    const battleState = {
      battleId: battle.id,
      roomCode: roomId,
      gameMode: 'detective',
      detectiveConfig,
      players: [
        { userId: p1.userId, socketId: p1.socketId, username: p1.username, score: 0, hp: 100, shield: 100, fragments: 0, combo: 0, shieldActive: false, powerups: [], currentZoneIndex: null, answered: false, state: 'Idle' },
        { userId: p2.userId, socketId: p2.socketId, username: p2.username, score: 0, hp: 100, shield: 100, fragments: 0, combo: 0, shieldActive: false, powerups: [], currentZoneIndex: null, answered: false, state: 'Idle' }
      ],
      questions: selectedQuestions,
      currentQuestionIndex: 0,
      secondsLeft: 15,
      intervalId: null,
      grid: Array(9).fill(null).map((_, i) => ({ zoneIndex: i, status: Math.random() > 0.4 ? 'infected' : 'cleaned', owner: null })),
      waveIndex: 0,
      totalWaves: 8
    };

    activeBattles.set(roomId, battleState);

    // Emit challenge-started (so UI knows friend invite started)
    io.to(roomId).emit('challenge-started', {
      roomId,
      gameMode: 'detective',
      player1: { id: p1.userId, username: p1.username, avatar: p1.avatar, rank: p1.rank },
      player2: { id: p2.userId, username: p2.username, avatar: p2.avatar, rank: p2.rank }
    });

    // Also emit match-found just in case clients expect it
    io.to(roomId).emit('match-found', {
      roomCode: roomId,
      gameMode: 'detective',
      detectiveConfig,
      player1: { id: p1.userId, username: p1.username, avatar: p1.avatar, rank: p1.rank },
      player2: { id: p2.userId, username: p2.username, avatar: p2.avatar, rank: p2.rank }
    });

    setTimeout(() => {
      startBattleLoop(io, roomId);
    }, 3000);
  } catch (err) {
    console.error('Error starting multiplayer match:', err);
  }
}

async function startBattleLoop(io, roomCode) {
  const battle = activeBattles.get(roomCode);
  if (!battle) return;

  if (battle.gameMode === 'detective') {
    const scenario = battle.questions[0];
    const metadata = JSON.parse(scenario ? scenario.metadata : '{}');
    io.to(roomCode).emit('detective-briefing', {
      scenarioName: metadata.victim || 'Confidential Case',
      questionText: scenario ? scenario.questionText : '',
      detectiveConfig: battle.detectiveConfig
    });
  } else if (battle.gameMode === 'ctf') {
    runCtfMode(io, roomCode);
  } else if (battle.gameMode === 'defense') {
    runDefenseMode(io, roomCode);
  } else if (battle.gameMode === 'outbreak') {
    runOutbreakMode(io, roomCode);
  } else {
    runDuelMode(io, roomCode);
  }
}

function runDetectiveMode(io, roomCode) {
  const battle = activeBattles.get(roomCode);
  if (!battle || battle.gameMode !== 'detective') return;

  const scenario = battle.questions[0];
  const metadata = JSON.parse(scenario ? scenario.metadata : '{}');

  // Emit detective-start to ALL players so the room opens on both clients simultaneously
  io.to(roomCode).emit('detective-start', {
    scenarioName: metadata.victim || 'Confidential Case',
    questionText: scenario ? scenario.questionText : '',
    options: {
      A: scenario ? scenario.optionA : '',
      B: scenario ? scenario.optionB : '',
      C: scenario ? scenario.optionC : '',
      D: scenario ? scenario.optionD : ''
    },
    detectiveConfig: battle.detectiveConfig
  });
}

function runCtfMode(io, roomCode) {
  const battle = activeBattles.get(roomCode);
  if (!battle) return;

  const runCtfChallenge = () => {
    if (battle.currentQuestionIndex >= battle.questions.length) {
      const winner = getHigherScorePlayer(battle);
      endBattleNormally(io, roomCode, winner);
      return;
    }

    const question = battle.questions[battle.currentQuestionIndex];
    battle.players.forEach(p => { p.answered = false; });
    battle.secondsLeft = 15;

    io.to(roomCode).emit('ctf-challenge', {
      vaultName: ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Omega'][battle.currentQuestionIndex % 5],
      questionText: question.questionText,
      questionIndex: battle.currentQuestionIndex + 1,
      totalQuestions: battle.questions.length
    });

    battle.intervalId = setInterval(() => {
      battle.secondsLeft--;
      if (battle.secondsLeft <= 0) {
        clearInterval(battle.intervalId);
        battle.currentQuestionIndex++;
        setTimeout(runCtfChallenge, 2000);
      }
    }, 1000);
  };

  runCtfChallenge();
}

function runDefenseMode(io, roomCode) {
  const battle = activeBattles.get(roomCode);
  if (!battle) return;

  const sendWave = () => {
    if (battle.waveIndex >= battle.totalWaves) {
      const winner = getHigherShieldPlayer(battle);
      endBattleNormally(io, roomCode, winner);
      return;
    }

    const question = battle.questions[battle.waveIndex];
    battle.players.forEach(p => { p.answered = false; });
    battle.secondsLeft = 3;

    io.to(roomCode).emit('packet-wave', {
      packetText: question.questionText,
      waveIndex: battle.waveIndex + 1,
      totalWaves: battle.totalWaves
    });

    battle.intervalId = setInterval(async () => {
      battle.secondsLeft--;
      if (battle.secondsLeft <= 0) {
        clearInterval(battle.intervalId);

        // Apply damage to unresponsive players
        for (const p of battle.players) {
          if (!p.answered) {
            p.shield = Math.max(0, p.shield - 20);
          }
        }

        emitShieldsUpdate(io, roomCode, battle);

        const dead = battle.players.filter(p => p.shield <= 0);
        if (dead.length > 0) {
          const winner = battle.players.find(p => p.shield > 0)?.userId || null;
          await endBattleNormally(io, roomCode, winner);
          return;
        }

        battle.waveIndex++;
        setTimeout(sendWave, 1500);
      }
    }, 1000);
  };

  sendWave();
}

function runOutbreakMode(io, roomCode) {
  const battle = activeBattles.get(roomCode);
  if (!battle) return;

  io.to(roomCode).emit('outbreak-start', { grid: battle.grid });
  battle.secondsLeft = 40;

  battle.intervalId = setInterval(async () => {
    battle.secondsLeft--;

    if (battle.secondsLeft > 0 && battle.secondsLeft % 10 === 0) {
      const cleaned = battle.grid.filter(z => z.status === 'cleaned');
      if (cleaned.length > 0) {
        const rand = cleaned[Math.floor(Math.random() * cleaned.length)];
        rand.status = 'infected';
        rand.owner = null;
        io.to(roomCode).emit('outbreak-map-update', { grid: battle.grid });
      }
    }

    if (battle.secondsLeft <= 0) {
      clearInterval(battle.intervalId);
      const winner = getOutbreakWinner(battle);
      await endBattleNormally(io, roomCode, winner);
    }
  }, 1000);
}

function runDuelMode(io, roomCode) {
  const battle = activeBattles.get(roomCode);
  if (!battle) return;

  const runDuelQuestion = () => {
    if (battle.currentQuestionIndex >= battle.questions.length) {
      const winner = getHigherHpPlayer(battle);
      endBattleNormally(io, roomCode, winner);
      return;
    }

    const question = battle.questions[battle.currentQuestionIndex];
    battle.players.forEach(p => { p.answered = false; });
    battle.secondsLeft = 10;

    io.to(roomCode).emit('duel-question', {
      questionText: question.questionText
    });

    battle.intervalId = setInterval(() => {
      battle.secondsLeft--;
      if (battle.secondsLeft <= 0) {
        clearInterval(battle.intervalId);
        battle.currentQuestionIndex++;
        setTimeout(runDuelQuestion, 2000);
      }
    }, 1000);
  };

  runDuelQuestion();
}

async function endBattleNormally(io, roomCode, winnerId) {
  const battle = activeBattles.get(roomCode);
  if (!battle) return;

  activeBattles.delete(roomCode);
  if (battle.intervalId) clearInterval(battle.intervalId);

  const [p1, p2] = battle.players;
  let winnerUsername = 'Draw';

  let xpP1 = 35;
  let xpP2 = 35;

  if (winnerId === p1.userId) {
    winnerUsername = p1.username;
    xpP1 = 50;
    xpP2 = 20;
  } else if (winnerId === p2.userId) {
    winnerUsername = p2.username;
    xpP1 = 20;
    xpP2 = 50;
  }

  // Save to DB
  await Battle.update({
    status: 'Finished',
    winnerId,
    winnerUsername
  }, {
    where: { id: battle.battleId }
  });

  await BattlePlayer.update({ score: p1.score, hp: p1.hp, shield: p1.shield, fragments: p1.fragments }, { where: { battleId: battle.battleId, userId: p1.userId } });
  await BattlePlayer.update({ score: p2.score, hp: p2.hp, shield: p2.shield, fragments: p2.fragments }, { where: { battleId: battle.battleId, userId: p2.userId } });

  const u1 = await User.findByPk(p1.userId);
  const u2 = await User.findByPk(p2.userId);

  if (u1) {
    const newXp = u1.xp + xpP1;
    // Sync arena XP with website score (unified XP system)
    await u1.update({
      xp: newXp,
      score: u1.score + xpP1,
      rank: calculateRank(newXp),
      status: 'Online',
      wins: winnerId === p1.userId ? u1.wins + 1 : u1.wins,
      losses: winnerId === p2.userId ? u1.losses + 1 : u1.losses
    });
    await checkAndAwardBadge(p1.userId, 'Phishing Hunter', io);
    if (p1.score >= 80) await checkAndAwardBadge(p1.userId, 'Password Master', io);
    if (winnerId === p1.userId) await checkAndAwardBadge(p1.userId, 'Cyber Detective', io);
  }

  if (u2) {
    const newXp = u2.xp + xpP2;
    // Sync arena XP with website score (unified XP system)
    await u2.update({
      xp: newXp,
      score: u2.score + xpP2,
      rank: calculateRank(newXp),
      status: 'Online',
      wins: winnerId === p2.userId ? u2.wins + 1 : u2.wins,
      losses: winnerId === p1.userId ? u2.losses + 1 : u2.losses
    });
    await checkAndAwardBadge(p2.userId, 'Phishing Hunter', io);
    if (p2.score >= 80) await checkAndAwardBadge(p2.userId, 'Password Master', io);
    if (winnerId === p2.userId) await checkAndAwardBadge(p2.userId, 'Cyber Detective', io);
  }

  io.to(p1.socketId).emit('battle-finished', {
    winnerId,
    winnerUsername,
    yourScore: p1.score,
    opponentScore: p2.score,
    xpEarned: xpP1,
    newTotalXP: u1 ? u1.xp : p1.score,
    newRank: u1 ? u1.rank : 'Cyber Rookie'
  });

  io.to(p2.socketId).emit('battle-finished', {
    winnerId,
    winnerUsername,
    yourScore: p2.score,
    opponentScore: p1.score,
    xpEarned: xpP2,
    newTotalXP: u2 ? u2.xp : p2.score,
    newRank: u2 ? u2.rank : 'Cyber Rookie'
  });

  [p1, p2].forEach(async (p) => {
    const s = io.sockets.sockets.get(p.socketId);
    if (s) s.leave(roomCode);

    const pres = onlineUsers.get(p.userId.toString());
    if (pres) {
      pres.status = 'Online';
      if (p.userId === p1.userId && u1) { pres.xp = u1.xp; pres.rank = u1.rank; }
      if (p.userId === p2.userId && u2) { pres.xp = u2.xp; pres.rank = u2.rank; }
      onlineUsers.set(p.userId.toString(), pres);
    }
  });

  io.emit('presence-update', Array.from(onlineUsers.values()));
}

async function handleDisconnectOrLeave(io, socket, roomCode) {
  const battle = activeBattles.get(roomCode);
  if (!battle) return;

  activeBattles.delete(roomCode);
  if (battle.intervalId) clearInterval(battle.intervalId);

  const disconnectingPlayer = battle.players.find(p => p.socketId === socket.id);
  const opponent = battle.players.find(p => p.socketId !== socket.id);

  if (disconnectingPlayer) {
    const uDisconnect = await User.findByPk(disconnectingPlayer.userId);
    if (uDisconnect) {
      await uDisconnect.update({ status: 'Offline', losses: uDisconnect.losses + 1 });
    }
    onlineUsers.delete(disconnectingPlayer.userId);
  }

  if (opponent) {
    const uOpponent = await User.findByPk(opponent.userId);
    let newXp = opponent.score;
    let newRank = 'Cyber Rookie';
    if (uOpponent) {
      const newXpVal = uOpponent.xp + 50;
      await uOpponent.update({
        xp: newXpVal,
        rank: calculateRank(newXpVal),
        wins: uOpponent.wins + 1,
        status: 'Online'
      });
      newXp = newXpVal;
      newRank = uOpponent.rank;

      await checkAndAwardBadge(opponent.userId, 'Phishing Hunter', io);
    }

    const pres = onlineUsers.get(opponent.userId);
    if (pres) {
      pres.status = 'Online';
      pres.xp = newXp;
      pres.rank = newRank;
      onlineUsers.set(opponent.userId, pres);
    }

    io.to(opponent.socketId).emit('opponent-disconnected');
    io.to(opponent.socketId).emit('battle-finished', {
      winnerId: opponent.userId,
      winnerUsername: opponent.username,
      yourScore: opponent.score,
      opponentScore: disconnectingPlayer ? disconnectingPlayer.score : 0,
      xpEarned: 50,
      newTotalXP: newXp,
      newRank
    });

    const sOpp = io.sockets.sockets.get(opponent.socketId);
    if (sOpp) sOpp.leave(roomCode);
  }

  io.emit('presence-update', Array.from(onlineUsers.values()));
}

// =============================================
// QUIZ MODE HELPERS (for friend battles)
// =============================================

function sendQuizQuestion(io, roomCode) {
  const battle = activeBattles.get(roomCode);
  if (!battle || battle.gameMode !== 'quiz') return;

  if (battle.currentQuestionIndex >= battle.questions.length) {
    const winner = battle.players[0].score > battle.players[1].score
      ? battle.players[0]
      : battle.players[0].score < battle.players[1].score
        ? battle.players[1]
        : null;
    endQuizBattle(io, roomCode, winner ? winner.userId : null);
    return;
  }

  const q = battle.questions[battle.currentQuestionIndex];
  battle.secondsLeft = 15;
  battle.players.forEach(p => { p.answered = false; p.hintsUsed = 0; });

  io.to(roomCode).emit('question-sent', {
    questionText: q.questionText,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    questionIndex: battle.currentQuestionIndex + 1,
    totalQuestions: battle.questions.length,
    secondsRemaining: 15
  });

  if (battle.intervalId) clearInterval(battle.intervalId);
  battle.intervalId = setInterval(() => {
    battle.secondsLeft--;
    if (battle.secondsLeft <= 0) {
      clearInterval(battle.intervalId);
      battle.intervalId = null;
      io.to(roomCode).emit('question-ended', {
        correctAnswer: q.correctAnswer,
        playerScores: battle.players.map(p => ({ userId: p.userId, score: p.score }))
      });
      battle.currentQuestionIndex++;
      battle.players.forEach(p => { p.answered = false; p.hintsUsed = 0; });
      if (battle.currentQuestionIndex >= battle.questions.length) {
        const winner = battle.players[0].score > battle.players[1].score
          ? battle.players[0]
          : battle.players[0].score < battle.players[1].score
            ? battle.players[1]
            : null;
        setTimeout(() => endQuizBattle(io, roomCode, winner ? winner.userId : null), 3000);
      } else {
        setTimeout(() => sendQuizQuestion(io, roomCode), 3000);
      }
    }
  }, 1000);
}

function startQuizMode(io, roomCode) {
  const battle = activeBattles.get(roomCode);
  if (!battle) return;
  sendQuizQuestion(io, roomCode);
}

async function endQuizBattle(io, roomCode, winnerId) {
  const battle = activeBattles.get(roomCode);
  if (!battle) return;

  if (battle.intervalId) clearInterval(battle.intervalId);
  activeBattles.delete(roomCode);

  for (const player of battle.players) {
    const isWinner = player.userId === winnerId;
    const xpEarned = isWinner ? player.score + 20 : Math.max(0, player.score - 5);

    try {
      const u = await User.findByPk(player.userId);
      if (u) {
        const newXp = u.xp + xpEarned;
        const newRank = calculateRank(newXp);
        // Sync both xp (arena rank) and score (website progression)
        await u.update({
          xp: newXp,
          score: u.score + xpEarned,
          rank: newRank,
          wins: isWinner ? u.wins + 1 : u.wins,
          losses: isWinner ? u.losses : u.losses + 1,
          status: 'Online'
        });

        if (isWinner) await checkAndAwardBadge(player.userId, 'Cyber Detective', io);
        await checkAndAwardBadge(player.userId, 'Phishing Hunter', io);

        const pres = onlineUsers.get(player.userId);
        if (pres) { pres.status = 'Online'; pres.xp = newXp; pres.rank = newRank; onlineUsers.set(player.userId, pres); }

        const opponentPlayer = battle.players.find(p => p.userId !== player.userId);
        io.to(player.socketId).emit('battle-finished', {
          winnerId,
          winnerUsername: winnerId ? battle.players.find(p => p.userId === winnerId)?.username : null,
          yourScore: player.score,
          opponentScore: opponentPlayer ? opponentPlayer.score : 0,
          xpEarned,
          newTotalXP: newXp,
          newRank
        });
      }
    } catch (err) {
      console.error('Error ending quiz battle for', player.userId, err);
    }
  }

  io.emit('presence-update', Array.from(onlineUsers.values()));
}
