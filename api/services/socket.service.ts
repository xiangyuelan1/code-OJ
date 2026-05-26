import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { matchService } from './match.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface OnlineUser {
  userId: string;
  socketId: string;
  username: string;
  connectedAt: Date;
  lastActivity: Date;
}

interface WaitingPlayer {
  userId: string;
  username: string;
  socketId: string;
  joinedAt: Date;
}

const onlineUsers = new Map<string, Set<string>>();
const socketToUser = new Map<string, OnlineUser>();
const waitingQueues = new Map<string, WaitingPlayer[]>();

export function setupSocketIO(httpServer: any) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        callback(null, true);
      },
      credentials: true
    }
  });

  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('未提供认证令牌'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error('认证失败'));
    }
  });

  io.on('connection', async (socket: any) => {
    const userId = socket.userId;
    const username = socket.username;

    console.log(`用户 ${username} (${userId}) 连接了`);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true }
      });
    } catch {
      console.warn(`用户 ${userId} 在数据库中不存在，跳过在线状态更新`);
    }

    try {
      await prisma.session.create({
        data: {
          userId,
          socketId: socket.id,
          ip: socket.handshake.address
        }
      });
    } catch {
      console.warn(`创建会话记录失败，用户 ${userId} 可能不存在`);
    }

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    socketToUser.set(socket.id, {
      userId,
      socketId: socket.id,
      username,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    io.emit('online:count', onlineUsers.size);
    io.emit('online:users', getOnlineUsersList());

    socket.on('heartbeat', () => {
      const user = socketToUser.get(socket.id);
      if (user) {
        user.lastActivity = new Date();
      }
    });

    socket.on('match:join', async (data: { type: string }) => {
      await handleMatchJoin(io, socket, data.type);
    });

    socket.on('match:cancel', async () => {
      await handleMatchCancel(io, socket);
    });

    socket.on('match:answer', async (data: { matchId: string; problemIndex: number; answer: string; time: number }) => {
      await handleMatchAnswer(io, socket, data);
    });

    socket.on('match:surrender', async (matchId: string) => {
      await handleSurrender(io, socket, matchId);
    });

    socket.on('match:settlement-request', async (matchId: string) => {
      await handleSettlementRequest(io, socket, matchId);
    });

    socket.on('match:settlement-agree', async (matchId: string) => {
      await handleSettlementAgree(io, socket, matchId);
    });

    socket.on('match:settlement-reject', async (matchId: string) => {
      await handleSettlementReject(io, socket, matchId);
    });

    socket.on('exam:heartbeat', async (data: { examId: string }) => {
      await handleExamHeartbeat(io, socket, data.examId);
    });

    socket.on('disconnect', async () => {
      console.log(`用户 ${username} 断开了连接`);

      if (socket.matchType && waitingQueues.has(socket.matchType)) {
        const queue = waitingQueues.get(socket.matchType)!;
        const idx = queue.findIndex(p => p.userId === userId);
        if (idx !== -1) {
          queue.splice(idx, 1);
        }
        io.emit('match:status', {
          type: socket.matchType,
          waiting: queue.length
        });
      }

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          try {
            await prisma.user.update({
              where: { id: userId },
              data: { isOnline: false }
            });
          } catch {
            console.warn(`用户 ${userId} 在数据库中不存在，跳过离线状态更新`);
          }
        }
      }

      socketToUser.delete(socket.id);

      try {
        await prisma.session.deleteMany({
          where: { socketId: socket.id }
        });
      } catch {
        console.warn(`删除会话记录失败`);
      }

      io.emit('online:count', onlineUsers.size);
      io.emit('online:users', getOnlineUsersList());
    });
  });

  return io;
}

function getOnlineUsersList(): OnlineUser[] {
  const seen = new Set<string>();
  const users: OnlineUser[] = [];
  for (const user of socketToUser.values()) {
    if (!seen.has(user.userId)) {
      seen.add(user.userId);
      users.push(user);
    }
  }
  return users;
}

async function handleMatchJoin(io: SocketIOServer, socket: any, type: string) {
  const userId = socket.userId;
  const username = socket.username;

  if (!waitingQueues.has(type)) {
    waitingQueues.set(type, []);
  }

  const queue = waitingQueues.get(type)!;
  const existingIndex = queue.findIndex(p => p.userId === userId);
  if (existingIndex !== -1) {
    queue.splice(existingIndex, 1);
  }

  const opponent = queue.shift();

  if (opponent && opponent.socketId !== socket.id) {
    try {
      const match = await matchService.createMatch(type, []);
      await matchService.joinMatch(match.id, opponent.userId);
      await matchService.joinMatch(match.id, userId);

      const matchDetails = await matchService.getMatch(match.id);

      const matchRoom = `match-room:${match.id}`;
      io.in(opponent.socketId).socketsJoin(matchRoom);
      io.in(socket.id).socketsJoin(matchRoom);

      io.to(opponent.socketId).emit('match:found', {
        matchId: match.id,
        match: matchDetails,
        opponent: { id: userId, username }
      });

      io.to(socket.id).emit('match:found', {
        matchId: match.id,
        match: matchDetails,
        opponent: { id: opponent.userId, username: opponent.username }
      });

      io.emit('match:status', {
        type,
        waiting: queue.length
      });
    } catch (error: any) {
      console.error('创建比赛失败:', error);
      io.to(socket.id).emit('match:error', '匹配失败，请重试');
      queue.unshift(opponent);
    }
  } else {
    if (opponent) {
      queue.unshift(opponent);
    }
    queue.push({
      userId,
      username,
      socketId: socket.id,
      joinedAt: new Date()
    });

    socket.join(`match:${type}`);
    socket.matchType = type;

    io.to(socket.id).emit('match:status', {
      type,
      waiting: queue.length,
      position: queue.length
    });

    io.emit('match:status', {
      type,
      waiting: queue.length
    });
  }
}

async function handleMatchCancel(io: SocketIOServer, socket: any) {
  const userId = socket.userId;
  const type = socket.matchType;

  if (type && waitingQueues.has(type)) {
    const queue = waitingQueues.get(type)!;
    const index = queue.findIndex(p => p.userId === userId);
    if (index !== -1) {
      queue.splice(index, 1);
    }
    io.emit('match:status', {
      type,
      waiting: queue.length
    });
  }

  socket.matchStatus = null;
  socket.matchType = null;
  socket.leave(`match:${type}`);
}

/**
 * 处理答题事件：广播答题通知和实时进度更新。
 * 不再广播答案内容（安全），仅通知对方某题已作答。
 */
async function handleMatchAnswer(io: SocketIOServer, socket: any, data: { matchId: string; problemIndex: number; answer: string; time: number }) {
  const matchRoom = `match-room:${data.matchId}`;

  // 广播答题通知（不含答案内容）
  io.to(matchRoom).emit('match:answer', {
    userId: socket.userId,
    username: socket.username,
    problemIndex: data.problemIndex,
    time: data.time
  });

  // 广播双方实时进度
  try {
    const match = await matchService.getMatch(data.matchId);
    if (match?.participants) {
      for (const participant of match.participants) {
        const progress = await matchService.getParticipantProgress(data.matchId, participant.userId);
        io.to(matchRoom).emit('match:progress', progress);
      }
    }
  } catch (e) {
    console.error('获取进度失败:', e);
  }
}

const settlementRequests = new Map<string, Set<string>>();

async function handleSurrender(io: SocketIOServer, socket: any, matchId: string) {
  const matchRoom = `match-room:${matchId}`;
  try {
    await matchService.surrenderMatch(matchId, socket.userId);
  } catch (e) {
    console.error('surrenderMatch error:', e);
  }
  io.to(matchRoom).emit('match:surrender', {
    userId: socket.userId,
    username: socket.username
  });
}

async function handleSettlementRequest(io: SocketIOServer, socket: any, matchId: string) {
  const matchRoom = `match-room:${matchId}`;
  if (!settlementRequests.has(matchId)) {
    settlementRequests.set(matchId, new Set());
  }
  const requests = settlementRequests.get(matchId)!;
  requests.add(socket.userId);

  io.to(matchRoom).emit('match:settlement-request', {
    userId: socket.userId,
    username: socket.username,
    agreedCount: requests.size
  });

  const match = await matchService.getMatch(matchId);
  if (match?.participants?.length && requests.size >= match.participants.length) {
    settlementRequests.delete(matchId);
    io.to(matchRoom).emit('match:settlement-agreed', { matchId });
  }
}

async function handleSettlementAgree(io: SocketIOServer, socket: any, matchId: string) {
  const matchRoom = `match-room:${matchId}`;
  if (!settlementRequests.has(matchId)) {
    settlementRequests.set(matchId, new Set());
  }
  const requests = settlementRequests.get(matchId)!;
  requests.add(socket.userId);

  const match = await matchService.getMatch(matchId);
  if (match?.participants?.length && requests.size >= match.participants.length) {
    settlementRequests.delete(matchId);
    io.to(matchRoom).emit('match:settlement-agreed', { matchId });
  }
}

async function handleSettlementReject(io: SocketIOServer, socket: any, matchId: string) {
  settlementRequests.delete(matchId);
  const matchRoom = `match-room:${matchId}`;
  io.to(matchRoom).emit('match:settlement-rejected', {
    userId: socket.userId,
    username: socket.username
  });
}

async function handleExamHeartbeat(io: SocketIOServer, socket: any, examId: string) {
  socket.join(`exam:${examId}`);

  io.to(`exam:${examId}`).emit('exam:heartbeat', {
    userId: socket.userId,
    timestamp: new Date()
  });
}

export function getOnlineCount(): number {
  return onlineUsers.size;
}

export function getOnlineUsers(): OnlineUser[] {
  return getOnlineUsersList();
}
