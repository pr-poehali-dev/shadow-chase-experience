import { useState, useCallback, useRef } from 'react';
import { GameState } from '@/pages/Index';
import CityEngine from './CityEngine';
import * as THREE from 'three';
import Icon from '@/components/ui/icon';

interface Props {
  gameState: GameState;
  onDialog: () => void;
  onMenu: () => void;
  onHover: () => void;
  playBeep: (freq: number, dur: number, type?: OscillatorType, vol?: number) => void;
}

const GameWorld = ({ onDialog, onMenu, onHover, playBeep }: Props) => {
  const [pos, setPos] = useState({ x: 0, z: 0 });
  const [fps, setFps] = useState(60);
  const [hint, setHint] = useState(true);
  const [entityNear, setEntityNear] = useState(false);
  const contactFired = useRef(false);

  const handleHUDUpdate = useCallback((data: { pos: THREE.Vector3; fps: number }) => {
    setPos({ x: Math.round(data.pos.x), z: Math.round(data.pos.z) });
    setFps(data.fps);
  }, []);

  const handleEntityContact = useCallback(() => {
    if (contactFired.current) return;
    contactFired.current = true;
    setEntityNear(true);
    playBeep(120, 0.5, 'sawtooth', 0.2);
    setTimeout(() => playBeep(90, 0.8, 'sawtooth', 0.15), 400);
    setHint(false);
  }, [playBeep]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">

      {/* Three.js canvas */}
      <CityEngine
        onEntityContact={handleEntityContact}
        onHUDUpdate={handleHUDUpdate}
      />

      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)' }} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%)' }} />

      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="relative w-5 h-5">
          <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2" style={{ background: 'rgba(57,255,20,0.7)' }} />
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ background: 'rgba(57,255,20,0.7)' }} />
          <div className="absolute inset-0 m-auto w-1 h-1 rounded-full" style={{ background: 'rgba(57,255,20,0.5)' }} />
        </div>
      </div>

      {/* HUD: top left */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="terminal-box px-3 py-2">
          <div className="font-terminal text-xs mb-1" style={{ color: 'var(--color-green-dim)', opacity: 0.5 }}>ЛОКАЦИЯ</div>
          <div className="font-terminal text-sm" style={{ color: 'var(--color-green)' }}>
            СЕКТОР-7 // X:{pos.x} Z:{pos.z}
          </div>
        </div>
      </div>

      {/* HUD: top right */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none">
        <div className="terminal-box px-3 py-2 text-right">
          <div className="font-terminal text-xs" style={{ color: 'var(--color-green-dim)', opacity: 0.4 }}>{fps} FPS</div>
          <div className="flex items-center gap-2 mt-1 justify-end">
            <div className="w-24 h-2 bg-black border border-red-900">
              <div className="health-fill h-full" style={{ width: '85%' }} />
            </div>
            <span className="font-terminal text-xs" style={{ color: '#ff6b00' }}>85%</span>
          </div>
        </div>
      </div>

      {/* Entity contact prompt */}
      {entityNear && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
          <div className="terminal-box terminal-box-glow px-6 py-4 text-center"
            style={{ borderColor: 'rgba(255,32,32,0.6)', boxShadow: '0 0 30px rgba(255,20,20,0.3)' }}>
            <div className="font-terminal text-xs mb-2" style={{ color: 'var(--color-red)', opacity: 0.7 }}>ОБНАРУЖЕН КОНТАКТ</div>
            <div className="font-display text-2xl mb-3" style={{ color: 'var(--color-red)' }}>ЧТО-ТО ЗДЕСЬ...</div>
            <button
              className="font-terminal text-sm px-6 py-2 pointer-events-auto"
              style={{ background: 'var(--color-red)', color: '#fff', boxShadow: '0 0 20px rgba(255,20,20,0.5)' }}
              onClick={() => { onHover(); onDialog(); }}
              onMouseEnter={onHover}
            >
              [E] ВСТУПИТЬ В КОНТАКТ
            </button>
          </div>
        </div>
      )}

      {/* Controls hint */}
      {hint && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-fade-in pointer-events-none">
          <div className="terminal-box px-5 py-3 text-center">
            <div className="font-terminal text-xs" style={{ color: 'var(--color-green-dim)', opacity: 0.7 }}>
              КЛИКНИТЕ → захват мыши &nbsp;|&nbsp; WASD — движение &nbsp;|&nbsp; МЫШЬ — обзор &nbsp;|&nbsp; ESC — выход
            </div>
          </div>
        </div>
      )}

      {/* Back to menu */}
      <div className="absolute bottom-4 left-4 z-20">
        <button
          className="terminal-box px-3 py-2 font-terminal text-xs transition-all"
          style={{ color: 'var(--color-green-dim)', borderColor: 'var(--color-green-dim)' }}
          onClick={onMenu}
          onMouseEnter={onHover}
        >
          <Icon name="ArrowLeft" size={12} className="inline mr-1" />
          МЕНЮ
        </button>
      </div>
    </div>
  );
};

export default GameWorld;
