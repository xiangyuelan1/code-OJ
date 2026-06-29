/**
 * 柯德活体形象 —— 突破边界、穿越组件的存在
 * 
 * 设计理念：柯德不被限制在任何卡片或区域内，而是作为一个"活在页面之上"的角色，
 * 在用户滚动时出现在不同的锚点位置，以各种姿态（探头、坐着、飞行、指向等）
 * 与页面布局产生视觉交互，打破 UI 的第四面墙。
 * 
 * 技术实现：
 * - IntersectionObserver 监听锚点可见性
 * - CSS transform + transition 实现丝滑的姿态切换
 * - will-change 优化合成层性能
 * - prefers-reduced-motion 无障碍支持
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// ══════════════════════════════════════════════════════════════
// 类型定义
// ══════════════════════════════════════════════════════════════

/** 柯德的姿态枚举 */
type CoderPose = 'peeking' | 'sitting' | 'leaning' | 'waving' | 'flying' | 'pointing';

/** 锚点配置：定义柯德在页面的哪个位置、以什么姿态出现 */
interface AnchorConfig {
  id: string;
  pose: CoderPose;
  /** 相对于锚点元素的定位偏移 */
  offsetX: number;
  offsetY: number;
  /** 角色面朝方向 */
  flipX?: boolean;
}

/** 当前活跃的展示状态 */
interface ActiveDisplay {
  pose: CoderPose;
  anchorRect: DOMRect;
  config: AnchorConfig;
}

// ══════════════════════════════════════════════════════════════
// 锚点配置表
// ══════════════════════════════════════════════════════════════

const ANCHOR_CONFIGS: AnchorConfig[] = [
  // hero 区域底部边缘：柯德坐在边缘，双腿悬空
  { id: 'coder-anchor-hero-bottom', pose: 'sitting', offsetX: 60, offsetY: -20 },
  // "认识柯德" 区域：飞入
  { id: 'coder-anchor-meet', pose: 'flying', offsetX: -80, offsetY: 20, flipX: true },
  // 统计卡片区域：探头偷看
  { id: 'coder-anchor-stats', pose: 'peeking', offsetX: 40, offsetY: -36 },
  // 每日挑战区域：指向内容
  { id: 'coder-anchor-daily', pose: 'pointing', offsetX: -70, offsetY: 10 },
  // 页面底部：挥手告别
  { id: 'coder-anchor-footer', pose: 'waving', offsetX: 50, offsetY: -40 },
  // 已登录 - 欢迎卡片：靠着
  { id: 'coder-anchor-welcome', pose: 'leaning', offsetX: -60, offsetY: 20, flipX: true },
];

// ══════════════════════════════════════════════════════════════
// SVG 姿态组件
// ══════════════════════════════════════════════════════════════

/** 共享 SVG defs - 渐变和滤镜 */
function SharedDefs() {
  return (
    <defs>
      <linearGradient id="cl-head-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#4f46e5" />
      </linearGradient>
      <linearGradient id="cl-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5b21b6" />
        <stop offset="100%" stopColor="#3730a3" />
      </linearGradient>
      <radialGradient id="cl-orb-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="70%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#5b21b6" />
      </radialGradient>
      <filter id="cl-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="cl-orb-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* 整体投影滤镜 - 增加深度感 */}
      <filter id="cl-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.5" />
      </filter>
    </defs>
  );
}

/** 头部通用绘制（含天线、眼睛、嘴巴） */
function CoderHead({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      {/* 头部圆形 */}
      <circle cx="0" cy="0" r="18" fill="url(#cl-head-grad)" stroke="#6d28d9" strokeWidth="0.8" />
      {/* 高光 */}
      <ellipse cx="-6" cy="-7" rx="8" ry="5" fill="white" opacity="0.06" />
      {/* 天线 */}
      <line x1="0" y1="-18" x2="0" y2="-26" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="0" cy="-28" r="3" fill="url(#cl-orb-grad)" filter="url(#cl-orb-glow)" />
      <circle cx="-1" cy="-29" r="1" fill="white" opacity="0.7" />
      {/* 眼睛 */}
      <circle cx="-6" cy="-1" r="3" fill="#06b6d4" filter="url(#cl-eye-glow)" className="coder-living-eye" />
      <circle cx="-6" cy="-1" r="1.3" fill="white" opacity="0.9" />
      <circle cx="6" cy="-1" r="3" fill="#06b6d4" filter="url(#cl-eye-glow)" className="coder-living-eye" />
      <circle cx="6" cy="-1" r="1.3" fill="white" opacity="0.9" />
      {/* 微笑 */}
      <path d="M-4 5 Q0 9, 4 5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* 耳部装饰 */}
      <circle cx="-18" cy="0" r="2.2" fill="#5b21b6" stroke="#7c3aed" strokeWidth="0.6" />
      <circle cx="-18" cy="0" r="0.9" fill="#06b6d4" opacity="0.6" />
      <circle cx="18" cy="0" r="2.2" fill="#5b21b6" stroke="#7c3aed" strokeWidth="0.6" />
      <circle cx="18" cy="0" r="0.9" fill="#06b6d4" opacity="0.6" />
    </g>
  );
}

/** 姿态A：探头 - 只有头和抓住边缘的双手可见 */
function PosePeeking() {
  return (
    <svg viewBox="0 0 80 60" width="80" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      <g filter="url(#cl-drop-shadow)">
        {/* 双手抓住底边 */}
        <ellipse cx="25" cy="55" rx="5" ry="3.5" fill="url(#cl-body-grad)" stroke="#6d28d9" strokeWidth="0.6" />
        <ellipse cx="55" cy="55" rx="5" ry="3.5" fill="url(#cl-body-grad)" stroke="#6d28d9" strokeWidth="0.6" />
        {/* 手指细节 */}
        <path d="M22 56 Q23 58, 25 58 Q27 58, 28 56" stroke="#a78bfa" strokeWidth="0.5" fill="none" />
        <path d="M52 56 Q53 58, 55 58 Q57 58, 58 56" stroke="#a78bfa" strokeWidth="0.5" fill="none" />
        {/* 头部 */}
        <CoderHead cx={40} cy={30} scale={1.1} />
      </g>
    </svg>
  );
}

/** 姿态B：坐着 - 坐在边缘，双腿悬空 */
function PoseSitting() {
  return (
    <svg viewBox="0 0 80 110" width="72" height="99" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      <g filter="url(#cl-drop-shadow)">
        {/* 头部 */}
        <CoderHead cx={40} cy={24} />
        {/* 身体 */}
        <path
          d="M28 40 C28 36, 32 33, 37 33 L43 33 C48 33, 52 36, 52 40 L52 60 C52 63, 50 65, 47 65 L33 65 C30 65, 28 63, 28 60 Z"
          fill="url(#cl-body-grad)" stroke="#6d28d9" strokeWidth="0.6"
        />
        {/* 身体电路纹 */}
        <line x1="40" y1="35" x2="40" y2="62" stroke="#a78bfa" strokeWidth="0.4" strokeOpacity="0.4" />
        <line x1="32" y1="45" x2="48" y2="45" stroke="#a78bfa" strokeWidth="0.3" strokeOpacity="0.3" />
        {/* 胸牌 */}
        <rect x="35" y="44" width="10" height="9" rx="2" fill="#06b6d4" fillOpacity="0.3" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.6" />
        <text x="40" y="50" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="5" fontWeight="bold">柯</text>
        {/* 双臂自然放在身体两侧 */}
        <path d="M28 38 Q24 42, 23 50 Q22 54, 25 56" stroke="url(#cl-body-grad)" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M52 38 Q56 42, 57 50 Q58 54, 55 56" stroke="url(#cl-body-grad)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* 悬空的双腿 */}
        <path d="M33 65 L31 85 Q30 90, 33 90" stroke="url(#cl-body-grad)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M47 65 L49 85 Q50 90, 47 90" stroke="url(#cl-body-grad)" strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* 鞋子 */}
        <ellipse cx="33" cy="91" rx="5" ry="3" fill="#3730a3" stroke="#6d28d9" strokeWidth="0.5" />
        <ellipse cx="47" cy="91" rx="5" ry="3" fill="#3730a3" stroke="#6d28d9" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

/** 姿态C：靠着 - 侧身靠在边缘，双臂交叉 */
function PoseLeaning() {
  return (
    <svg viewBox="0 0 70 100" width="63" height="90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      <g filter="url(#cl-drop-shadow)">
        {/* 头部，微微倾斜 */}
        <g transform="rotate(-5, 35, 22)">
          <CoderHead cx={35} cy={22} />
        </g>
        {/* 身体，略微倾斜 */}
        <g transform="rotate(-3, 35, 55)">
          <path
            d="M24 38 C24 34, 28 31, 32 31 L38 31 C42 31, 46 34, 46 38 L46 72 C46 75, 44 77, 41 77 L29 77 C26 77, 24 75, 24 72 Z"
            fill="url(#cl-body-grad)" stroke="#6d28d9" strokeWidth="0.6"
          />
          {/* 电路纹 */}
          <line x1="35" y1="33" x2="35" y2="74" stroke="#a78bfa" strokeWidth="0.4" strokeOpacity="0.4" />
          {/* 交叉双臂 */}
          <path d="M24 46 Q20 48, 19 52 Q18 56, 22 58 L30 56" stroke="url(#cl-body-grad)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M46 46 Q50 48, 51 52 Q52 56, 48 58 L40 56" stroke="url(#cl-body-grad)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          {/* 双腿站立 */}
          <path d="M30 77 L29 92 Q29 96, 32 96" stroke="url(#cl-body-grad)" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M40 77 L41 92 Q41 96, 38 96" stroke="url(#cl-body-grad)" strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* 鞋子 */}
          <ellipse cx="32" cy="97" rx="4.5" ry="2.5" fill="#3730a3" />
          <ellipse cx="38" cy="97" rx="4.5" ry="2.5" fill="#3730a3" />
        </g>
      </g>
    </svg>
  );
}

/** 姿态D：挥手 - 上半身从边缘露出，一只手挥动 */
function PoseWaving() {
  return (
    <svg viewBox="0 0 80 70" width="80" height="70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      <g filter="url(#cl-drop-shadow)">
        {/* 身体上半部分 */}
        <path
          d="M28 42 C28 38, 32 35, 37 35 L43 35 C48 35, 52 38, 52 42 L52 65 L28 65 Z"
          fill="url(#cl-body-grad)" stroke="#6d28d9" strokeWidth="0.6"
        />
        {/* 头部 */}
        <CoderHead cx={40} cy={20} />
        {/* 左臂：自然下垂 */}
        <path d="M28 40 Q24 45, 23 52" stroke="url(#cl-body-grad)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* 右臂：挥手（抬起） */}
        <path d="M52 40 Q58 35, 62 28 Q64 24, 66 22" stroke="url(#cl-body-grad)" strokeWidth="4" strokeLinecap="round" fill="none" className="coder-living-wave" />
        {/* 挥动的手掌 */}
        <ellipse cx="67" cy="20" rx="4" ry="3.5" fill="url(#cl-body-grad)" stroke="#6d28d9" strokeWidth="0.5" className="coder-living-wave" />
      </g>
    </svg>
  );
}

/** 姿态E：飞行 - 全身展开带尾迹 */
function PoseFlying() {
  return (
    <svg viewBox="0 0 120 80" width="108" height="72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      {/* 飞行尾迹 */}
      <path d="M10 45 Q30 42, 45 40" stroke="#a78bfa" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" fill="none" />
      <path d="M5 50 Q25 48, 42 46" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.2" strokeLinecap="round" fill="none" />
      <path d="M15 55 Q32 52, 48 50" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.15" strokeLinecap="round" fill="none" />
      {/* 粒子尾迹 */}
      <circle cx="15" cy="44" r="1.5" fill="#a78bfa" opacity="0.4" className="coder-living-trail-particle" />
      <circle cx="25" cy="48" r="1" fill="#06b6d4" opacity="0.3" className="coder-living-trail-particle" style={{ animationDelay: '0.2s' }} />
      <circle cx="8" cy="52" r="1.2" fill="#7c3aed" opacity="0.35" className="coder-living-trail-particle" style={{ animationDelay: '0.4s' }} />

      <g filter="url(#cl-drop-shadow)" transform="rotate(-15, 70, 40)">
        {/* 头部 */}
        <CoderHead cx={70} cy={28} scale={0.95} />
        {/* 身体 */}
        <path
          d="M58 40 C58 37, 61 35, 65 35 L75 35 C79 35, 82 37, 82 40 L82 58 C82 61, 80 62, 77 62 L63 62 C60 62, 58 61, 58 58 Z"
          fill="url(#cl-body-grad)" stroke="#6d28d9" strokeWidth="0.5"
        />
        {/* 伸展的手臂 - 超人姿势 */}
        <path d="M58 42 Q52 38, 48 35" stroke="url(#cl-body-grad)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M82 42 Q88 38, 92 35" stroke="url(#cl-body-grad)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        {/* 双腿向后伸展 */}
        <path d="M63 62 Q60 68, 58 72" stroke="url(#cl-body-grad)" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M77 62 Q80 68, 82 72" stroke="url(#cl-body-grad)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* 火箭推进效果 */}
        <path d="M68 62 Q70 68, 68 74" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.7" strokeLinecap="round" fill="none" className="coder-living-flame" />
        <path d="M72 62 Q70 70, 72 76" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" fill="none" className="coder-living-flame" style={{ animationDelay: '0.1s' }} />
      </g>
    </svg>
  );
}

/** 姿态F：指向 - 手臂伸出指向内容 */
function PosePointing() {
  return (
    <svg viewBox="0 0 100 90" width="90" height="81" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      <g filter="url(#cl-drop-shadow)">
        {/* 头部 */}
        <CoderHead cx={40} cy={20} />
        {/* 身体 */}
        <path
          d="M28 36 C28 32, 32 29, 36 29 L44 29 C48 29, 52 32, 52 36 L52 62 C52 65, 50 67, 47 67 L33 67 C30 67, 28 65, 28 62 Z"
          fill="url(#cl-body-grad)" stroke="#6d28d9" strokeWidth="0.6"
        />
        {/* 电路纹 */}
        <line x1="40" y1="31" x2="40" y2="64" stroke="#a78bfa" strokeWidth="0.4" strokeOpacity="0.4" />
        {/* 左臂自然 */}
        <path d="M28 38 Q24 44, 23 50 Q22 54, 24 56" stroke="url(#cl-body-grad)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* 右臂指向右方（教师指黑板姿势） */}
        <path d="M52 40 Q60 38, 72 34 Q78 32, 82 30" stroke="url(#cl-body-grad)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* 指向的手 - 食指伸出 */}
        <circle cx="83" cy="29" r="3" fill="url(#cl-body-grad)" stroke="#6d28d9" strokeWidth="0.4" />
        <line x1="86" y1="28" x2="92" y2="26" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
        {/* 指向箭头光效 */}
        <path d="M93 26 L98 25" stroke="#06b6d4" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" className="coder-living-point-glow" />
        {/* 双腿 */}
        <path d="M33 67 L32 82 Q32 86, 35 86" stroke="url(#cl-body-grad)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M47 67 L48 82 Q48 86, 45 86" stroke="url(#cl-body-grad)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <ellipse cx="35" cy="87" rx="4.5" ry="2.5" fill="#3730a3" />
        <ellipse cx="45" cy="87" rx="4.5" ry="2.5" fill="#3730a3" />
      </g>
    </svg>
  );
}

/** 根据姿态枚举渲染对应 SVG */
function renderPose(pose: CoderPose) {
  switch (pose) {
    case 'peeking': return <PosePeeking />;
    case 'sitting': return <PoseSitting />;
    case 'leaning': return <PoseLeaning />;
    case 'waving': return <PoseWaving />;
    case 'flying': return <PoseFlying />;
    case 'pointing': return <PosePointing />;
  }
}

// ══════════════════════════════════════════════════════════════
// 主组件
// ══════════════════════════════════════════════════════════════

export function CoderLivingCharacter() {
  const location = useLocation();
  const [activeDisplay, setActiveDisplay] = useState<ActiveDisplay | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefersReducedMotion = useRef(false);

  // 仅在首页和少数关键页面渲染
  const allowedPaths = ['/', '/starpath', '/learning'];
  const shouldRender = allowedPaths.includes(location.pathname);

  // 检测用户是否偏好减少动画
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  /**
   * 当锚点进入视口时，计算其位置并设置对应的活跃姿态
   * 使用 IntersectionObserver 避免持续监听滚动事件
   */
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    // 找到当前在视口中最靠近中心的锚点
    let bestEntry: IntersectionObserverEntry | null = null;
    let bestDistance = Infinity;

    const viewportCenter = window.innerHeight / 2;

    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const rect = entry.boundingClientRect;
      const entryCenter = rect.top + rect.height / 2;
      const distance = Math.abs(entryCenter - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestEntry = entry;
      }
    }

    if (bestEntry) {
      const anchorId = bestEntry.target.id;
      const config = ANCHOR_CONFIGS.find(c => c.id === anchorId);
      if (config) {
        setActiveDisplay({
          pose: config.pose,
          anchorRect: bestEntry.boundingClientRect,
          config,
        });
        setIsVisible(true);
      }
    } else {
      // 没有任何锚点可见时，淡出
      setIsVisible(false);
    }
  }, []);

  // 建立 IntersectionObserver 监听所有锚点
  useEffect(() => {
    if (!shouldRender) {
      setIsVisible(false);
      return;
    }

    // 延迟建立 observer，确保页面 DOM 已渲染
    const timer = setTimeout(() => {
      const anchors = ANCHOR_CONFIGS
        .map(c => document.getElementById(c.id))
        .filter(Boolean) as HTMLElement[];

      if (anchors.length === 0) return;

      observerRef.current = new IntersectionObserver(handleIntersection, {
        root: null,
        rootMargin: '-10% 0px -10% 0px', // 只在中间80%视口区域触发
        threshold: [0, 0.5, 1],
      });

      anchors.forEach(el => observerRef.current!.observe(el));
    }, 500);

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [shouldRender, handleIntersection, location.pathname]);

  // 滚动时更新位置（用 requestAnimationFrame 节流）
  useEffect(() => {
    if (!shouldRender || !activeDisplay) return;

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // 重新获取当前活跃锚点的位置
        const el = document.getElementById(activeDisplay.config.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          setActiveDisplay(prev => prev ? { ...prev, anchorRect: rect } : null);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [shouldRender, activeDisplay?.config.id]);

  // 点击柯德打开 AI 助手
  const handleClick = useCallback(() => {
    const btn = document.querySelector('[title="柯德 · AI助手"]') as HTMLElement | null;
    btn?.click();
  }, []);

  // 不渲染条件
  if (!shouldRender || !activeDisplay || prefersReducedMotion.current) return null;

  // 计算实际渲染位置
  const { anchorRect, config } = activeDisplay;
  const left = anchorRect.left + config.offsetX;
  const top = anchorRect.top + config.offsetY;

  // 移动端简化：屏幕宽度小于 768px 时只显示部分姿态
  const isMobile = window.innerWidth < 768;
  if (isMobile && !['peeking', 'waving'].includes(activeDisplay.pose)) return null;

  return (
    <>
      {/* 全局动画样式 - 只注入一次 */}
      <style>{`
        /* 眼睛呼吸发光 */
        @keyframes coder-living-eye-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .coder-living-eye {
          animation: coder-living-eye-pulse 3s ease-in-out infinite;
        }

        /* 挥手动画 */
        @keyframes coder-living-wave-motion {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
        .coder-living-wave {
          transform-origin: 52px 40px;
          animation: coder-living-wave-motion 1.2s ease-in-out infinite;
        }

        /* 尾迹粒子 */
        @keyframes coder-living-trail-fade {
          0%, 100% { opacity: 0.4; transform: translateX(0); }
          50% { opacity: 0.1; transform: translateX(-5px); }
        }
        .coder-living-trail-particle {
          animation: coder-living-trail-fade 2s ease-in-out infinite;
        }

        /* 推进火焰 */
        @keyframes coder-living-flame-flicker {
          0%, 100% { opacity: 0.7; transform: scaleY(1); }
          50% { opacity: 0.4; transform: scaleY(1.3); }
        }
        .coder-living-flame {
          transform-origin: center top;
          animation: coder-living-flame-flicker 0.4s ease-in-out infinite;
        }

        /* 指向光效 */
        @keyframes coder-living-point-pulse {
          0%, 100% { opacity: 0.7; transform: translateX(0); }
          50% { opacity: 0.3; transform: translateX(3px); }
        }
        .coder-living-point-glow {
          animation: coder-living-point-pulse 1.5s ease-in-out infinite;
        }

        /* 悬浮时增强发光 */
        .coder-living-hovered .coder-living-eye {
          animation: none;
          opacity: 1;
          filter: brightness(1.5);
        }
        .coder-living-hovered svg {
          filter: drop-shadow(0 0 12px rgba(6, 182, 212, 0.5));
        }

        /* 进出场过渡 */
        .coder-living-container {
          will-change: transform, opacity;
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.4s ease;
        }
        .coder-living-container.entering {
          opacity: 0;
          transform: scale(0.7) translateY(20px);
        }
        .coder-living-container.visible {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
        .coder-living-container.exiting {
          opacity: 0;
          transform: scale(0.8) translateY(-10px);
        }

        /* 悬浮弹跳 */
        @keyframes coder-living-bounce {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.08) translateY(-4px); }
        }
        .coder-living-hovered .coder-living-container {
          animation: coder-living-bounce 0.6s ease-in-out;
        }
      `}</style>

      {/* 角色容器 */}
      <div
        className={`fixed z-50 pointer-events-auto cursor-pointer select-none
          ${isHovered ? 'coder-living-hovered' : ''}
        `}
        style={{
          left: `${Math.max(10, Math.min(left, window.innerWidth - 120))}px`,
          top: `${Math.max(10, Math.min(top, window.innerHeight - 120))}px`,
          transform: config.flipX ? 'scaleX(-1)' : undefined,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        title="点击和柯德聊天"
      >
        <div className={`coder-living-container ${isVisible ? 'visible' : 'entering'}`}>
          {renderPose(activeDisplay.pose)}
        </div>
      </div>
    </>
  );
}
