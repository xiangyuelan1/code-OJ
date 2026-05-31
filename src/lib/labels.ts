export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACCEPTED': return 'text-green-400';
    case 'WRONG_ANSWER': return 'text-red-400';
    case 'TIME_LIMIT_EXCEEDED': return 'text-yellow-400';
    case 'MEMORY_LIMIT_EXCEEDED': return 'text-yellow-400';
    case 'RUNTIME_ERROR': return 'text-orange-400';
    case 'COMPILE_ERROR': return 'text-purple-400';
    case 'PENDING': return 'text-slate-400';
    case 'JUDGING': return 'text-cyan-400';
    default: return 'text-slate-400';
  }
}

export function getStatusName(status: string): string {
  switch (status) {
    case 'ACCEPTED': return '通过';
    case 'WRONG_ANSWER': return '答案错误';
    case 'TIME_LIMIT_EXCEEDED': return '超时';
    case 'MEMORY_LIMIT_EXCEEDED': return '内存超限';
    case 'RUNTIME_ERROR': return '运行错误';
    case 'COMPILE_ERROR': return '编译错误';
    case 'PENDING': return '等待中';
    case 'JUDGING': return '判题中';
    default: return status;
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'ACCEPTED': return 'bg-green-500/20 text-green-400';
    case 'WRONG_ANSWER': return 'bg-red-500/20 text-red-400';
    case 'TIME_LIMIT_EXCEEDED': return 'bg-yellow-500/20 text-yellow-400';
    case 'MEMORY_LIMIT_EXCEEDED': return 'bg-yellow-500/20 text-yellow-400';
    case 'RUNTIME_ERROR': return 'bg-orange-500/20 text-orange-400';
    case 'COMPILE_ERROR': return 'bg-purple-500/20 text-purple-400';
    case 'PENDING': return 'bg-slate-500/20 text-slate-400';
    case 'JUDGING': return 'bg-cyan-500/20 text-cyan-400';
    default: return 'bg-slate-500/20 text-slate-400';
  }
}

export function getDifficultyName(difficulty: string): string {
  switch (difficulty) {
    case 'EASY': return '简单';
    case 'MEDIUM': return '中等';
    case 'HARD': return '困难';
    default: return difficulty;
  }
}

export function getDifficultyBadge(difficulty: string): string {
  switch (difficulty) {
    case 'EASY': return 'bg-green-500/20 text-green-400';
    case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400';
    case 'HARD': return 'bg-red-500/20 text-red-400';
    default: return 'bg-slate-500/20 text-slate-400';
  }
}

export function getDifficultyStyle(difficulty: string): string {
  switch (difficulty) {
    case 'EASY': return 'text-green-400';
    case 'MEDIUM': return 'text-yellow-400';
    case 'HARD': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

export function getTypeLabel(type: string): string {
  switch (type) {
    case 'PROGRAMMING': return '编程题';
    case 'CHOICE': return '选择题';
    case 'FILL_BLANK': return '填空题';
    default: return type;
  }
}

export function getRoleName(role: string): string {
  switch (role) {
    case 'ADMIN': return '管理员';
    case 'TEACHER': return '教师';
    case 'STUDENT': return '学生';
    default: return role;
  }
}

export function getRoleBadge(role: string): string {
  switch (role) {
    case 'ADMIN': return 'bg-red-500/20 text-red-400';
    case 'TEACHER': return 'bg-blue-500/20 text-blue-400';
    case 'STUDENT': return 'bg-green-500/20 text-green-400';
    default: return 'bg-slate-500/20 text-slate-400';
  }
}

export function getRoleIcon(role: string): string {
  switch (role) {
    case 'ADMIN': return '🛡️';
    case 'TEACHER': return '👨‍🏫';
    case 'STUDENT': return '🎓';
    default: return '👤';
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('zh-CN');
}
