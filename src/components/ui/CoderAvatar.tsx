/**
 * 柯德 (Coder) 数字形象 SVG 组件
 * 平台 AI 助手品牌吉祥物，风格：现代、友好、略带未来感
 */

interface CoderAvatarProps {
  /** SVG 尺寸（px），默认 80 */
  size?: number;
  /** 是否启用悬浮动画，默认 true */
  animated?: boolean;
  /** 表情状态：happy 微笑 / thinking 思考 / excited 兴奋 */
  mood?: 'happy' | 'thinking' | 'excited';
  /** 额外 className */
  className?: string;
}

export function CoderAvatar({ size = 80, animated = true, mood = 'happy', className = '' }: CoderAvatarProps) {
  const animationClass = animated ? 'coder-avatar-float' : '';

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${animationClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="柯德 AI 助手头像"
      >
        <defs>
          {/* 头部渐变：深紫到靛蓝 */}
          <linearGradient id="coder-head-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* 身体渐变 */}
          <linearGradient id="coder-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5b21b6" />
            <stop offset="100%" stopColor="#3730a3" />
          </linearGradient>

          {/* 天线发光球渐变 */}
          <radialGradient id="coder-orb-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="70%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#5b21b6" />
          </radialGradient>

          {/* 眼睛发光效果 */}
          <filter id="coder-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 天线球体发光 */}
          <filter id="coder-orb-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 胸牌全息效果 */}
          <linearGradient id="coder-badge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>

          {/* 电路纹理 pattern */}
          <pattern id="coder-circuit" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6h4M8 6h4M6 0v4M6 8v4" stroke="#a78bfa" strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx="6" cy="6" r="1" fill="#a78bfa" fillOpacity="0.2" />
          </pattern>
        </defs>

        {/* === 身体（圆角肩膀） === */}
        <path
          d="M35 85 C35 78, 40 73, 48 73 L72 73 C80 73, 85 78, 85 85 L85 105 C85 110, 82 113, 77 113 L43 113 C38 113, 35 110, 35 105 Z"
          fill="url(#coder-body-grad)"
          stroke="#6d28d9"
          strokeWidth="0.8"
        />

        {/* 身体电路纹理覆盖 */}
        <path
          d="M35 85 C35 78, 40 73, 48 73 L72 73 C80 73, 85 78, 85 85 L85 105 C85 110, 82 113, 77 113 L43 113 C38 113, 35 110, 35 105 Z"
          fill="url(#coder-circuit)"
          opacity="0.6"
        />

        {/* 身体中央线条装饰 */}
        <line x1="60" y1="76" x2="60" y2="110" stroke="#a78bfa" strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1="48" y1="85" x2="72" y2="85" stroke="#a78bfa" strokeWidth="0.4" strokeOpacity="0.3" />
        <line x1="50" y1="95" x2="70" y2="95" stroke="#a78bfa" strokeWidth="0.4" strokeOpacity="0.3" />

        {/* === 全息胸牌 === */}
        <rect
          x="50" y="87" width="20" height="18" rx="3"
          fill="url(#coder-badge-grad)"
          stroke="#06b6d4"
          strokeWidth="0.6"
          opacity="0.85"
        />
        {/* 胸牌文字「柯」 */}
        <text
          x="60" y="100"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="11"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          柯
        </text>

        {/* === 头部（圆形） === */}
        <circle
          cx="60" cy="45" r="28"
          fill="url(#coder-head-grad)"
          stroke="#6d28d9"
          strokeWidth="1"
        />

        {/* 头部高光 */}
        <ellipse cx="50" cy="34" rx="12" ry="8" fill="white" opacity="0.06" />

        {/* === 天线 === */}
        <line
          x1="60" y1="17" x2="60" y2="8"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* 天线发光球 */}
        <circle
          cx="60" cy="6" r="4"
          fill="url(#coder-orb-grad)"
          filter="url(#coder-orb-glow)"
        />
        {/* 天线球高光点 */}
        <circle cx="58.5" cy="4.5" r="1.2" fill="white" opacity="0.7" />

        {/* === 眼睛 === */}
        {mood === 'thinking' ? (
          <>
            {/* 思考模式：左眼正常，右眼半闭 */}
            <circle cx="50" cy="44" r="4.5" fill="#06b6d4" filter="url(#coder-eye-glow)" />
            <circle cx="50" cy="44" r="2" fill="white" opacity="0.9" />
            <ellipse cx="70" cy="44" rx="4.5" ry="2.5" fill="#06b6d4" filter="url(#coder-eye-glow)" />
            <ellipse cx="70" cy="44" rx="2" ry="1.2" fill="white" opacity="0.9" />
          </>
        ) : (
          <>
            {/* happy / excited：两只明亮大眼 */}
            <circle cx="50" cy="44" r={mood === 'excited' ? 5 : 4.5} fill="#06b6d4" filter="url(#coder-eye-glow)" />
            <circle cx="50" cy="44" r="2" fill="white" opacity="0.9" />
            <circle cx="70" cy="44" r={mood === 'excited' ? 5 : 4.5} fill="#06b6d4" filter="url(#coder-eye-glow)" />
            <circle cx="70" cy="44" r="2" fill="white" opacity="0.9" />
          </>
        )}

        {/* === 嘴巴 === */}
        {mood === 'excited' ? (
          /* 兴奋：张开嘴笑 */
          <path
            d="M54 56 Q60 62, 66 56"
            stroke="#a78bfa"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === 'thinking' ? (
          /* 思考：歪嘴 */
          <path
            d="M55 57 Q60 58, 65 56"
            stroke="#a78bfa"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          /* happy：友好微笑 */
          <path
            d="M54 55 Q60 60, 66 55"
            stroke="#a78bfa"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* === 耳部装饰（头部两侧小圆点） === */}
        <circle cx="32" cy="45" r="3" fill="#5b21b6" stroke="#7c3aed" strokeWidth="0.8" />
        <circle cx="32" cy="45" r="1.2" fill="#06b6d4" opacity="0.6" />
        <circle cx="88" cy="45" r="3" fill="#5b21b6" stroke="#7c3aed" strokeWidth="0.8" />
        <circle cx="88" cy="45" r="1.2" fill="#06b6d4" opacity="0.6" />

        {/* === 面部装饰线条 === */}
        <path d="M38 38 L42 38" stroke="#a78bfa" strokeWidth="0.8" strokeOpacity="0.5" strokeLinecap="round" />
        <path d="M78 38 L82 38" stroke="#a78bfa" strokeWidth="0.8" strokeOpacity="0.5" strokeLinecap="round" />
      </svg>

      {/* 悬浮动画 CSS（通过 style 标签注入，只注入一次） */}
      <style>{`
        @keyframes coder-avatar-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .coder-avatar-float {
          animation: coder-avatar-bob 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
