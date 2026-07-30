import { useTheme } from '../context/ThemeContext';

/**
 * ThemeToggle — Neumorphic-style vertical toggle switch untuk dark/light mode.
 * Reusable, tinggal import dan pakai <ThemeToggle /> di mana saja.
 *
 * Props:
 *  - size: 'sm' | 'md' | 'lg' (default: 'md')
 *  - showLabel: boolean (default: true)
 *  - style: object (override container style)
 */
const ThemeToggle = ({ size = 'md', showLabel = true, style = {} }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // ========== Size Presets ==========
  const sizes = {
    sm: { outer: 64, inner: 44, track: 28, thumb: 22, thumbRadius: 8, outerRadius: 16, trackRadius: 14, iconSize: '0.75rem' },
    md: { outer: 90, inner: 64, track: 38, thumb: 30, thumbRadius: 11, outerRadius: 22, trackRadius: 19, iconSize: '1rem' },
    lg: { outer: 120, inner: 84, track: 50, thumb: 40, thumbRadius: 14, outerRadius: 28, trackRadius: 25, iconSize: '1.3rem' },
  };
  const s = sizes[size] || sizes.md;

  // ========== Neumorphic Colors ==========
  const colors = isDark
    ? {
        outerBg: '#2A2A2A',
        shadowLight: 'rgba(60, 60, 60, 0.6)',
        shadowDark: 'rgba(0, 0, 0, 0.7)',
        trackBg: '#F97316',
        trackBorder: '#EA580C',
        thumbBg: '#FFFFFF',
        thumbShadowOuter: 'rgba(0,0,0,0.25)',
        thumbShadowInner: 'rgba(255,255,255,0.8)',
        labelColor: '#E5E7EB',
        sublabelColor: '#9CA3AF',
      }
    : {
        outerBg: '#E8ECF1',
        shadowLight: 'rgba(255, 255, 255, 0.85)',
        shadowDark: 'rgba(174, 182, 197, 0.5)',
        trackBg: '#D1D5DB',
        trackBorder: '#B0B8C4',
        thumbBg: '#FFFFFF',
        thumbShadowOuter: 'rgba(0,0,0,0.12)',
        thumbShadowInner: 'rgba(255,255,255,0.9)',
        labelColor: '#374151',
        sublabelColor: '#6B7280',
      };

  // ========== Track height & thumb position ==========
  const trackHeight = s.inner + 16; // Total track capsule height
  const thumbTravel = trackHeight - s.thumb - 8; // Travel distance for the thumb
  const thumbTop = isDark ? 4 : thumbTravel; // Dark = top (ON), Light = bottom (OFF)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        ...style,
      }}
    >
      {/* Neumorphic Outer Container */}
      <div
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTheme();
          }
        }}
        style={{
          width: `${s.outer}px`,
          height: `${s.outer * 1.45}px`,
          borderRadius: `${s.outerRadius}px`,
          background: colors.outerBg,
          boxShadow: `
            8px 8px 16px ${colors.shadowDark},
            -8px -8px 16px ${colors.shadowLight},
            inset 0 0 0 transparent
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
          outline: 'none',
          position: 'relative',
        }}
      >
        {/* Inner Inset Track */}
        <div
          style={{
            width: `${s.track}px`,
            height: `${trackHeight}px`,
            borderRadius: `${s.trackRadius}px`,
            background: colors.trackBg,
            border: `2px solid ${colors.trackBorder}`,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `inset 2px 2px 6px rgba(0,0,0,0.15)`,
            transition: 'background 0.4s ease, border-color 0.4s ease',
          }}
        >
          {/* Thumb */}
          <div
            style={{
              position: 'absolute',
              width: `${s.thumb}px`,
              height: `${s.thumb}px`,
              borderRadius: `${s.thumbRadius}px`,
              background: colors.thumbBg,
              left: '50%',
              transform: 'translateX(-50%)',
              top: `${thumbTop}px`,
              boxShadow: `
                0 3px 8px ${colors.thumbShadowOuter},
                inset 0 -2px 4px rgba(0,0,0,0.08),
                inset 0 2px 4px ${colors.thumbShadowInner}
              `,
              transition: 'top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: s.iconSize,
            }}
          >
            {isDark ? '🌙' : '☀️'}
          </div>
        </div>
      </div>

      {/* Optional Label */}
      {showLabel && (
        <div style={{ textAlign: 'center', lineHeight: 1.4 }}>
          <div
            style={{
              fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
              fontWeight: 800,
              color: colors.labelColor,
              transition: 'color 0.3s ease',
            }}
          >
            {isDark ? 'Mode Gelap' : 'Mode Terang'}
          </div>
          <div
            style={{
              fontSize: size === 'sm' ? '0.6rem' : '0.7rem',
              fontWeight: 600,
              color: colors.sublabelColor,
              transition: 'color 0.3s ease',
            }}
          >
            Ketuk untuk ganti
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
