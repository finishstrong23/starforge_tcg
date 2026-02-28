/**
 * STARFORGE TCG - Game Over Overlay Component
 *
 * Professional game end screen with:
 * - Animated particle background (gold for victory, red for defeat)
 * - SVG trophy/skull icon instead of emoji
 * - Text entrance animation with glow
 * - Backdrop blur and vignette
 */

import React, { useEffect, useMemo } from 'react';
import { SoundManager } from '../../audio';

interface GameOverlayProps {
  winnerId?: string;
  onPlayAgain: () => void;
  isCampaign?: boolean;
}

// Generate deterministic floating particles
function generateParticles(count: number, isVictory: boolean) {
  return Array.from({ length: count }, (_, i) => {
    const s1 = Math.sin(i * 127.1 + 37) * 43758.5453;
    const r1 = s1 - Math.floor(s1);
    const s2 = Math.sin(i * 269.3 + 71) * 43758.5453;
    const r2 = s2 - Math.floor(s2);
    const s3 = Math.sin(i * 419.7 + 13) * 43758.5453;
    const r3 = s3 - Math.floor(s3);

    const colors = isVictory
      ? ['#ffcc00', '#ffdd44', '#ffaa00', '#00ff88', '#88ffaa']
      : ['#ff4444', '#ff6644', '#cc2222', '#ff8844', '#aa1111'];

    return {
      x: r1 * 100,
      startY: 100 + r2 * 20,
      size: 2 + r3 * 4,
      duration: 3 + r1 * 4,
      delay: r2 * 5,
      color: colors[i % colors.length],
      drift: (r3 - 0.5) * 30,
    };
  });
}

const VictoryIcon: React.FC = () => (
  <svg width="100" height="100" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="go_gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffdd44" />
        <stop offset="50%" stopColor="#cc9900" />
        <stop offset="100%" stopColor="#aa7700" />
      </linearGradient>
      <radialGradient id="go_glow" cx="0.5" cy="0.4" r="0.5">
        <stop offset="0%" stopColor="#ffcc00" stopOpacity="0.3" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    {/* Glow */}
    <circle cx="50" cy="50" r="45" fill="url(#go_glow)" />
    {/* Trophy cup */}
    <path d="M 30 30 L 70 30 L 65 60 Q 63 68 55 70 L 55 78 L 62 82 L 62 86 L 38 86 L 38 82 L 45 78 L 45 70 Q 37 68 35 60 Z"
      fill="url(#go_gold)" stroke="#ffee88" strokeWidth="1.5" />
    {/* Cup handles */}
    <path d="M 30 32 Q 18 38 22 52 Q 24 58 32 56" fill="none" stroke="#cc9900" strokeWidth="3" strokeLinecap="round" />
    <path d="M 70 32 Q 82 38 78 52 Q 76 58 68 56" fill="none" stroke="#cc9900" strokeWidth="3" strokeLinecap="round" />
    {/* Star on cup */}
    <polygon points="50,38 53,46 61,46 55,51 57,59 50,54 43,59 45,51 39,46 47,46"
      fill="#ffee88" opacity="0.8" />
    {/* Shine */}
    <path d="M 38 34 Q 42 40 40 50" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
  </svg>
);

const DefeatIcon: React.FC = () => (
  <svg width="100" height="100" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="go_red_glow" cx="0.5" cy="0.4" r="0.5">
        <stop offset="0%" stopColor="#ff2244" stopOpacity="0.25" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    {/* Glow */}
    <circle cx="50" cy="50" r="45" fill="url(#go_red_glow)" />
    {/* Skull */}
    <ellipse cx="50" cy="42" rx="22" ry="24" fill="#ddccbb" stroke="#aa9988" strokeWidth="1.5" />
    {/* Eye sockets */}
    <ellipse cx="42" cy="38" rx="6" ry="7" fill="#1a0a0a" />
    <ellipse cx="58" cy="38" rx="6" ry="7" fill="#1a0a0a" />
    {/* Red eye glow */}
    <ellipse cx="42" cy="38" rx="3" ry="3.5" fill="#ff2244" opacity="0.7" />
    <ellipse cx="58" cy="38" rx="3" ry="3.5" fill="#ff2244" opacity="0.7" />
    {/* Nose */}
    <path d="M 48 48 L 50 53 L 52 48" fill="none" stroke="#332211" strokeWidth="1.5" />
    {/* Jaw */}
    <ellipse cx="50" cy="60" rx="14" ry="8" fill="#ccbbaa" stroke="#aa9988" strokeWidth="1" />
    {/* Teeth */}
    {[0, 1, 2, 3, 4, 5].map(i => (
      <rect key={i} x={40 + i * 4} y={56} width={3} height={5} rx="0.5"
        fill="#eeddcc" stroke="#bbaa99" strokeWidth="0.3" />
    ))}
    {/* Crossbones */}
    <line x1="22" y1="72" x2="78" y2="88" stroke="#ccbbaa" strokeWidth="4" strokeLinecap="round" />
    <line x1="78" y1="72" x2="22" y2="88" stroke="#ccbbaa" strokeWidth="4" strokeLinecap="round" />
    {/* Bone ends */}
    {[[22, 72], [78, 72], [22, 88], [78, 88]].map(([bx, by], i) => (
      <circle key={`bone${i}`} cx={bx} cy={by} r="4" fill="#ccbbaa" stroke="#aa9988" strokeWidth="0.5" />
    ))}
  </svg>
);

const DrawIcon: React.FC = () => (
  <svg width="100" height="100" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="go_draw_glow" cx="0.5" cy="0.5" r="0.45">
        <stop offset="0%" stopColor="#ffcc00" stopOpacity="0.2" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#go_draw_glow)" />
    {/* Scale beam */}
    <line x1="25" y1="50" x2="75" y2="50" stroke="#ccaa44" strokeWidth="3" strokeLinecap="round" />
    {/* Center post */}
    <line x1="50" y1="30" x2="50" y2="80" stroke="#ccaa44" strokeWidth="3" strokeLinecap="round" />
    {/* Scale top */}
    <polygon points="46,30 54,30 50,24" fill="#ccaa44" />
    {/* Left pan */}
    <path d="M 25 50 L 20 65 Q 25 70 35 65 Z" fill="#aa8833" stroke="#ccaa44" strokeWidth="1" />
    {/* Right pan */}
    <path d="M 75 50 L 70 65 Q 75 70 85 65 Z" fill="#aa8833" stroke="#ccaa44" strokeWidth="1" />
    {/* Chains */}
    <line x1="25" y1="50" x2="20" y2="65" stroke="#ccaa44" strokeWidth="1" strokeDasharray="2,2" />
    <line x1="25" y1="50" x2="35" y2="65" stroke="#ccaa44" strokeWidth="1" strokeDasharray="2,2" />
    <line x1="75" y1="50" x2="70" y2="65" stroke="#ccaa44" strokeWidth="1" strokeDasharray="2,2" />
    <line x1="75" y1="50" x2="85" y2="65" stroke="#ccaa44" strokeWidth="1" strokeDasharray="2,2" />
    {/* Base */}
    <rect x="40" y="78" width="20" height="4" rx="2" fill="#aa8833" />
  </svg>
);

export const GameOverlay: React.FC<GameOverlayProps> = ({
  winnerId,
  onPlayAgain,
  isCampaign = false,
}) => {
  const isVictory = winnerId === 'player';
  const isDraw = !winnerId;
  const particles = useMemo(() => generateParticles(20, isVictory || isDraw), [isVictory, isDraw]);

  useEffect(() => {
    if (isVictory) {
      SoundManager.play('gameWin');
    } else if (!isDraw) {
      SoundManager.play('gameLose');
    }
  }, [isVictory, isDraw]);

  const titleColor = isDraw ? '#ffcc00' : isVictory ? '#00ff88' : '#ff4444';
  const accentColor = isDraw ? '#ffaa00' : isVictory ? '#00cc66' : '#cc2222';

  return (
    <div style={styles.overlay}>
      {/* Inject game over animations */}
      <style>{`
        @keyframes go-particle-rise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-110vh) translateX(var(--go-drift)); opacity: 0; }
        }
        @keyframes go-title-enter {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); letter-spacing: 16px; }
          60% { opacity: 1; transform: translateY(-5px) scale(1.05); letter-spacing: 10px; }
          100% { transform: translateY(0) scale(1); letter-spacing: 8px; }
        }
        @keyframes go-content-fade {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes go-icon-bounce {
          0% { opacity: 0; transform: scale(0.3); }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes go-button-glow {
          0%, 100% { box-shadow: 0 4px 15px ${accentColor}66; }
          50% { box-shadow: 0 4px 25px ${accentColor}aa, 0 0 40px ${accentColor}33; }
        }
      `}</style>

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${p.x}%`,
          bottom: `-${p.size}px`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          borderRadius: '50%',
          background: p.color,
          boxShadow: `0 0 ${p.size}px ${p.color}`,
          animation: `go-particle-rise ${p.duration}s linear ${p.delay}s infinite`,
          pointerEvents: 'none',
          '--go-drift': `${p.drift}px`,
        } as React.CSSProperties} />
      ))}

      {/* Content card */}
      <div style={{
        ...styles.content,
        borderColor: accentColor + '44',
        animation: 'go-content-fade 0.6s ease-out forwards',
      }}>
        {/* Title */}
        <div style={{
          ...styles.title,
          color: titleColor,
          textShadow: `0 0 30px ${titleColor}, 0 0 60px ${titleColor}66`,
          animation: 'go-title-enter 0.8s ease-out forwards',
        }}>
          {isDraw ? 'DRAW' : isVictory ? 'VICTORY' : 'DEFEAT'}
        </div>

        {/* Subtitle */}
        <div style={{
          ...styles.subtitle,
          animation: 'go-content-fade 0.6s ease-out 0.3s forwards',
          opacity: 0,
        }}>
          {isDraw
            ? 'The battle ends in a stalemate'
            : isVictory
            ? 'You have conquered your opponent!'
            : 'Your opponent has triumphed'}
        </div>

        {/* SVG Icon */}
        <div style={{
          ...styles.iconContainer,
          animation: 'go-icon-bounce 0.7s ease-out 0.4s forwards',
          opacity: 0,
        }}>
          {isDraw ? <DrawIcon /> : isVictory ? <VictoryIcon /> : <DefeatIcon />}
        </div>

        {/* Play Again button */}
        <button style={{
          ...styles.button,
          background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
          borderColor: titleColor,
          animation: 'go-content-fade 0.6s ease-out 0.6s forwards, go-button-glow 2s ease-in-out 1.2s infinite',
          opacity: 0,
        }} onClick={onPlayAgain}>
          {isCampaign ? 'Continue' : 'Play Again'}
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(12px)',
    overflow: 'hidden',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '40px 60px',
    background: 'linear-gradient(135deg, rgba(20, 20, 40, 0.95) 0%, rgba(10, 10, 25, 0.95) 100%)',
    borderRadius: '20px',
    border: '2px solid',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
    zIndex: 1001,
  },
  title: {
    fontSize: '56px',
    fontWeight: 'bold',
    letterSpacing: '8px',
    fontFamily: "'Segoe UI', sans-serif",
  },
  subtitle: {
    fontSize: '17px',
    color: '#999999',
    textAlign: 'center',
    letterSpacing: '1px',
  },
  iconContainer: {
    margin: '10px 0',
  },
  button: {
    border: '2px solid',
    borderRadius: '12px',
    padding: '14px 50px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, filter 0.15s ease',
    letterSpacing: '1px',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
};
