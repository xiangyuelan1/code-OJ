import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

interface OnlineUser {
  userId: string;
  socketId: string;
  username: string;
  connectedAt: string;
  lastActivity: string;
}

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
  onlineUsers: OnlineUser[];
  matchStatus: any;
  matchFound: any;
  matchEvents: any[];
  error: string | null;

  connect: (token: string) => void;
  disconnect: () => void;
  emitMatchJoin: (type: string) => void;
  emitMatchCancel: () => void;
  emitMatchAnswer: (data: { matchId: string; problemIndex: number; answer: string; time: number }) => void;
  emitSurrender: (matchId: string) => void;
  emitSettlementRequest: (matchId: string) => void;
  emitSettlementReject: (matchId: string) => void;
  emitExamHeartbeat: (examId: string) => void;
  sendHeartbeat: () => void;
  clearError: () => void;
  clearMatchFound: () => void;
  pushMatchEvent: (event: any) => void;
  clearMatchEvents: () => void;
}

let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

function startHeartbeat() {
  if (heartbeatIntervalId) return;
  heartbeatIntervalId = setInterval(() => {
    useSocketStore.getState().sendHeartbeat();
  }, 30000);
}

function stopHeartbeat() {
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineCount: 0,
  onlineUsers: [],
  matchStatus: null,
  matchFound: null,
  matchEvents: [],
  error: null,

  connect: (token: string) => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) {
      return;
    }

    if (existingSocket) {
      existingSocket.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 20
    });

    socket.on('connect', () => {
      console.log('WebSocket连接成功');
      set({ isConnected: true, error: null });
      startHeartbeat();
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket连接断开:', reason);
      set({ isConnected: false });
      stopHeartbeat();
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket连接错误:', error);
      set({ error: '连接失败，请重新登录', isConnected: false });
    });

    socket.on('online:count', (count: number) => {
      set({ onlineCount: count });
    });

    socket.on('online:users', (users: OnlineUser[]) => {
      set({ onlineUsers: users });
    });

    socket.on('match:status', (status: any) => {
      set({ matchStatus: status });
    });

    socket.on('match:found', (data: any) => {
      console.log('匹配成功:', data);
      set({ matchFound: data });
    });

    socket.on('match:error', (error: string) => {
      set({ error });
    });

    socket.on('match:answer', (data: any) => {
      get().pushMatchEvent({ type: 'answer', ...data });
    });

    socket.on('match:surrender', (data: any) => {
      get().pushMatchEvent({ type: 'surrender', ...data });
    });

    socket.on('match:settlement-request', (data: any) => {
      get().pushMatchEvent({ type: 'settlement-request', ...data });
    });

    socket.on('match:settlement-agreed', (data: any) => {
      get().pushMatchEvent({ type: 'settlement-agreed', ...data });
    });

    socket.on('match:settlement-rejected', (data: any) => {
      get().pushMatchEvent({ type: 'settlement-rejected', ...data });
    });

    socket.on('exam:warning', (data: any) => {
      console.warn('考试警告:', data);
    });

    set({ socket });
  },

  disconnect: () => {
    stopHeartbeat();
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  emitMatchJoin: (type: string) => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit('match:join', { type });
    }
  },

  emitMatchCancel: () => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit('match:cancel');
    }
  },

  emitMatchAnswer: (data) => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit('match:answer', data);
    }
  },

  emitSurrender: (matchId: string) => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit('match:surrender', matchId);
    }
  },

  emitSettlementRequest: (matchId: string) => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit('match:settlement-request', matchId);
    }
  },

  emitSettlementReject: (matchId: string) => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit('match:settlement-reject', matchId);
    }
  },

  emitExamHeartbeat: (examId: string) => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit('exam:heartbeat', { examId });
    }
  },

  sendHeartbeat: () => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit('heartbeat');
    }
  },

  clearError: () => set({ error: null }),
  clearMatchFound: () => set({ matchFound: null }),
  pushMatchEvent: (event: any) => set((state) => ({ matchEvents: [...state.matchEvents.slice(-49), event] })),
  clearMatchEvents: () => set({ matchEvents: [] })
}));
