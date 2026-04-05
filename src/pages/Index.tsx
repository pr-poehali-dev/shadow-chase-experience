import { useState, useEffect, useRef, useCallback } from 'react';
import MainMenu from '@/components/game/MainMenu';
import GameWorld from '@/components/game/GameWorld';
import DialogInterface from '@/components/game/DialogInterface';
import SettingsPanel from '@/components/game/SettingsPanel';

export type GameScreen = 'menu' | 'game' | 'dialog' | 'settings';

export interface GameState {
  health: number;
  location: string;
  step: number;
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

const Index = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [transitioning, setTransitioning] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    health: 85,
    location: 'СЕКТОР-7 // ВОСТОЧНЫЙ КВАРТАЛ',
    step: 0,
    soundEnabled: true,
    musicVolume: 60,
    sfxVolume: 80,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const WA = window as Window & { webkitAudioContext?: typeof AudioContext };
      audioCtxRef.current = new (WA.AudioContext || WA.webkitAudioContext!)();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback((freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) => {
    if (!gameState.soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + duration);
      gain.gain.setValueAtTime(volume * (gameState.sfxVolume / 100), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('audio error', e);
    }
  }, [gameState.soundEnabled, gameState.sfxVolume, getAudioCtx]);

  const playMenuClick = useCallback(() => playBeep(440, 0.08, 'square', 0.1), [playBeep]);
  const playMenuSelect = useCallback(() => {
    playBeep(220, 0.05, 'square', 0.12);
    setTimeout(() => playBeep(330, 0.1, 'square', 0.12), 80);
    setTimeout(() => playBeep(440, 0.15, 'square', 0.1), 160);
  }, [playBeep]);

  const playAmbientStatic = useCallback(() => {
    if (!gameState.soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.03;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05 * (gameState.sfxVolume / 100), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.warn('static audio error', e);
    }
  }, [gameState.soundEnabled, gameState.sfxVolume, getAudioCtx]);

  const navigate = useCallback((to: GameScreen) => {
    setTransitioning(true);
    playMenuSelect();
    setTimeout(() => {
      setScreen(to);
      setTransitioning(false);
    }, 300);
  }, [screen, playMenuSelect]);

  useEffect(() => {
    if (screen === 'game') {
      const interval = setInterval(() => {
        playAmbientStatic();
      }, 8000 + Math.random() * 5000);
      return () => clearInterval(interval);
    }
  }, [screen, playAmbientStatic]);

  return (
    <div
      className={`
        relative w-screen h-screen overflow-hidden bg-[var(--color-dark)]
        scanlines crt-screen noise
        transition-opacity duration-300
        ${transitioning ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* Static noise overlay */}
      <div className="static-noise absolute inset-0 z-50 pointer-events-none" />

      {/* Vignette */}
      <div
        className="absolute inset-0 z-40 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)' }}
      />

      {screen === 'menu' && (
        <MainMenu
          onStart={() => navigate('game')}
          onSettings={() => navigate('settings')}
          onHover={playMenuClick}
        />
      )}

      {screen === 'game' && (
        <GameWorld
          gameState={gameState}
          onDialog={() => navigate('dialog')}
          onMenu={() => navigate('menu')}
          onHover={playMenuClick}
          playBeep={playBeep}
        />
      )}

      {screen === 'dialog' && (
        <DialogInterface
          gameState={gameState}
          onClose={() => navigate('game')}
          onHover={playMenuClick}
          playBeep={playBeep}
        />
      )}

      {screen === 'settings' && (
        <SettingsPanel
          gameState={gameState}
          onSave={(s) => { setGameState(s); navigate('menu'); }}
          onBack={() => navigate('menu')}
          onHover={playMenuClick}
        />
      )}
    </div>
  );
};

export default Index;