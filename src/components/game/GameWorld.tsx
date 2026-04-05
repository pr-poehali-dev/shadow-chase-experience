import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState } from '@/pages/Index';
import CityEngine from './CityEngine';
import * as THREE from 'three';

interface Props {
  gameState: GameState;
  onDialog: () => void;
  onMenu: () => void;
  onHover: () => void;
  playBeep: (freq: number, dur: number, type?: OscillatorType, vol?: number) => void;
}

const GameWorld = ({ onDialog, onMenu, onHover, playBeep }: Props) => {
  const [hint, setHint] = useState(true);
  const [shadowDist, setShadowDist] = useState(99);
  const [isLooking, setIsLooking] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [vignette, setVignette] = useState(0);
  const contactFired = useRef(false);

  // Vignette intensifies as shadow gets closer
  useEffect(() => {
    const intensity = Math.max(0, Math.min(1, (12 - shadowDist) / 10));
    setVignette(intensity);
  }, [shadowDist]);

  // Play a low drone when looking at shadow
  useEffect(() => {
    if (isLooking) {
      playBeep(60, 0.4, 'sawtooth', 0.06);
    }
  }, [isLooking, playBeep]);

  const handleHUDUpdate = useCallback((data: { pos: THREE.Vector3; fps: number; shadowDist: number; isLooking: boolean }) => {
    setShadowDist(data.shadowDist);
    setIsLooking(data.isLooking);
  }, []);

  const handleEntityContact = useCallback(() => {
    if (contactFired.current) return;
    contactFired.current = true;
    setContactVisible(true);
    setHint(false);
    playBeep(80, 0.6, 'sawtooth', 0.18);
    setTimeout(() => playBeep(55, 1.0, 'sawtooth', 0.12), 500);
  }, [playBeep]);

  // Proximity warning sound
  useEffect(() => {
    if (shadowDist < 6 && shadowDist > 2.5) {
      const interval = setInterval(() => {
        playBeep(80 + (6 - shadowDist) * 10, 0.08, 'sine', 0.04);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [shadowDist, playBeep]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">

      <CityEngine onEntityContact={handleEntityContact} onHUDUpdate={handleHUDUpdate} />

      {/* Dreamcore vignette — gets stronger as shadow approaches */}
      <div
        className="absolute inset-0 pointer-events-none z-10 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at center, transparent ${35 - vignette * 20}%, rgba(30,15,5,${0.4 + vignette * 0.45}) 100%)`,
        }}
      />

      {/* "Looking at shadow" flash */}
      {isLooking && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ background: 'rgba(0,0,0,0.18)', transition: 'opacity 0.2s' }}
        />
      )}

      {/* Subtle film grain */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* "Looking back" whisper text */}
      {isLooking && !contactVisible && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 animate-fade-in text-center"
          style={{ fontFamily: '"Courier New", monospace', color: 'rgba(255,255,255,0.18)', fontSize: '1.1rem', letterSpacing: '0.3em' }}
        >
          там кто-то есть
        </div>
      )}

      {/* Proximity text */}
      {shadowDist < 5 && !contactVisible && (
        <div
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center animate-fade-in"
          style={{ fontFamily: '"Courier New", monospace', color: `rgba(40,20,10,${0.5 + (5 - shadowDist) * 0.12})`, fontSize: '0.7rem', letterSpacing: '0.25em' }}
        >
          не оглядывайся
        </div>
      )}

      {/* Contact prompt */}
      {contactVisible && (
        <div className="absolute inset-0 flex items-center justify-center z-30 animate-fade-in">
          <div
            className="text-center px-12 py-10"
            style={{
              background: 'rgba(15,8,3,0.88)',
              border: '1px solid rgba(150,110,60,0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              style={{ fontFamily: '"Courier New", monospace', fontSize: '0.7rem', letterSpacing: '0.4em', color: 'rgba(180,140,80,0.55)', marginBottom: '1.5rem' }}
            >
              КОНТАКТ УСТАНОВЛЕН
            </div>
            <h2
              style={{ fontFamily: '"Georgia", serif', fontSize: '2rem', fontWeight: 400, color: 'rgba(220,200,160,0.9)', marginBottom: '0.5rem', lineHeight: 1.2 }}
            >
              Оно повернулось
            </h2>
            <p
              style={{ fontFamily: '"Courier New", monospace', fontSize: '0.75rem', color: 'rgba(160,130,80,0.5)', letterSpacing: '0.15em', marginBottom: '2.5rem' }}
            >
              ты знал что нельзя было смотреть
            </p>
            <button
              style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '0.8rem',
                letterSpacing: '0.2em',
                color: 'rgba(220,190,130,0.8)',
                background: 'none',
                border: '1px solid rgba(180,140,80,0.35)',
                padding: '0.7rem 2rem',
                cursor: 'pointer',
              }}
              onClick={() => { onHover(); onDialog(); }}
              onMouseEnter={onHover}
            >
              поговорить с ним
            </button>
          </div>
        </div>
      )}

      {/* Controls hint */}
      {hint && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center animate-fade-in"
          style={{ fontFamily: '"Courier New", monospace', fontSize: '0.65rem', color: 'rgba(80,55,25,0.5)', letterSpacing: '0.2em' }}
        >
          клик — захват мыши &nbsp;·&nbsp; WASD — движение &nbsp;·&nbsp; мышь — обзор &nbsp;·&nbsp; ESC — выход
        </div>
      )}

      {/* Back to menu */}
      <div className="absolute top-5 left-5 z-20">
        <button
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'rgba(80,55,25,0.45)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={onMenu}
          onMouseEnter={onHover}
        >
          ← меню
        </button>
      </div>
    </div>
  );
};

export default GameWorld;
