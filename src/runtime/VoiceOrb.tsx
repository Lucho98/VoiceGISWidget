/**
 * VoiceOrb — Componente visual tipo Siri
 * Usa Calcite Design System + CSS puro para las animaciones.
 * Sin dependencias de animación externas.
 */

import { React, jsx } from "jimu-core";
import type { VoiceState } from "./useVoiceEngine";

const { useMemo } = React;

interface VoiceOrbProps {
  state: VoiceState;
  audioLevel: number; // 0-100
  onClick: () => void;
  primaryColor?: string;
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  audioLevel,
  onClick,
  primaryColor = "#0079c1",
  size = 64,
}) => {
  const scale = useMemo(() => {
    if (state !== "listening") return 1;
    return 1 + (audioLevel / 100) * 0.4;
  }, [state, audioLevel]);

  const stateColors: Record<VoiceState, { bg: string; glow: string; ring: string }> = {
    idle: {
      bg: primaryColor,
      glow: `${primaryColor}44`,
      ring: `${primaryColor}66`,
    },
    listening: {
      bg: "#e83e3e",
      glow: "#e83e3e55",
      ring: "#e83e3e88",
    },
    processing: {
      bg: "#f5a623",
      glow: "#f5a62355",
      ring: "#f5a62388",
    },
    speaking: {
      bg: "#28a745",
      glow: "#28a74555",
      ring: "#28a74588",
    },
    error: {
      bg: "#dc3545",
      glow: "#dc354555",
      ring: "#dc354588",
    },
  };

  const colors = stateColors[state];

  const icon = {
    idle: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
      </svg>
    ),
    listening: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <rect x="2" y="9" width="3" height="9" rx="1.5"/>
        <rect x="7" y="5" width="3" height="17" rx="1.5"/>
        <rect x="12" y="1" width="3" height="22" rx="1.5"/>
        <rect x="17" y="5" width="3" height="17" rx="1.5"/>
      </svg>
    ),
    processing: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
    speaking: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
    ),
    error: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      aria-label={getAriaLabel(state)}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        background: "none",
        padding: 0,
        outline: "none",
        transition: "transform 0.15s ease",
      }}
    >
      {/* Outer glow ring — animado en listening */}
      <span
        style={{
          position: "absolute",
          inset: -8,
          borderRadius: "50%",
          background: colors.ring,
          animation:
            state === "listening" || state === "speaking"
              ? "voiceRing 1.5s ease-in-out infinite"
              : "none",
          opacity: state === "idle" ? 0 : 1,
          transition: "opacity 0.3s ease, background 0.3s ease",
        }}
      />

      {/* Glow difuso */}
      <span
        style={{
          position: "absolute",
          inset: -4,
          borderRadius: "50%",
          background: colors.glow,
          filter: "blur(8px)",
          transition: "background 0.3s ease",
        }}
      />

      {/* Orb principal */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${lighten(colors.bg, 40)}, ${colors.bg})`,
          boxShadow: `0 4px 20px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale})`,
          transition: "transform 0.08s ease, background 0.3s ease, box-shadow 0.3s ease",
          animation:
            state === "processing"
              ? "voicePulse 1s ease-in-out infinite"
              : "none",
        }}
      >
        {icon[state]}
      </span>

      {/* Waveform bars - solo en listening */}
      {state === "listening" && (
        <span
          style={{
            position: "absolute",
            bottom: -24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 3,
            alignItems: "center",
          }}
        >
          {[0.4, 0.7, 1, 0.7, 0.4].map((multiplier, i) => (
            <span
              key={i}
              style={{
                width: 3,
                borderRadius: 2,
                background: "#e83e3e",
                height: Math.max(4, (audioLevel / 100) * 16 * multiplier + 4),
                animation: `voiceBar${i} 0.5s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
                transition: "height 0.08s ease",
              }}
            />
          ))}
        </span>
      )}

      <style>{`
        @keyframes voiceRing {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.2; }
        }
        @keyframes voicePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes voiceBar0 { 0%,100%{height:4px} 50%{height:10px} }
        @keyframes voiceBar1 { 0%,100%{height:6px} 50%{height:14px} }
        @keyframes voiceBar2 { 0%,100%{height:8px} 50%{height:18px} }
        @keyframes voiceBar3 { 0%,100%{height:6px} 50%{height:14px} }
        @keyframes voiceBar4 { 0%,100%{height:4px} 50%{height:10px} }
      `}</style>
    </button>
  );
};

function getAriaLabel(state: VoiceState): string {
  const labels: Record<VoiceState, string> = {
    idle: "Activar control por voz",
    listening: "Escuchando... haga clic para detener",
    processing: "Procesando comando",
    speaking: "Reproduciendo respuesta",
    error: "Error en control por voz. Haga clic para reintentar",
  };
  return labels[state];
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
  const b = Math.min(255, (num & 0x0000ff) + amount);
  return `rgb(${r},${g},${b})`;
}

export default VoiceOrb;
