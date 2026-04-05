import { useState, useEffect, useRef } from 'react';
import { GameState } from '@/pages/Index';
import Icon from '@/components/ui/icon';

interface Props {
  gameState: GameState;
  onDialog: () => void;
  onMenu: () => void;
  onHover: () => void;
  playBeep: (freq: number, dur: number, type?: OscillatorType, vol?: number) => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
  color: string;
}

interface LogEntry {
  time: string;
  msg: string;
  type: 'info' | 'warn' | 'danger';
}

const SCENE_STEPS = [
  {
    desc: 'Вы стоите на пустой улице. Разбитый асфальт, опрокинутые машины. Тишина давит на уши.',
    action: 'Идти вперёд',
    next: 1,
    log: { msg: 'Передвижение: Восточный квартал', type: 'info' as const },
  },
  {
    desc: 'Сломанный фонарь мерцает. За углом — силуэт. Он не движется. Он смотрит на вас.',
    action: 'Подойти ближе',
    next: 2,
    log: { msg: 'ВНИМАНИЕ: Обнаружен объект', type: 'warn' as const },
  },
  {
    desc: 'Силуэт поворачивается. Красные точки там, где должны быть глаза. Голос в голове: "TY ZNAESH GDE MY".',
    action: 'Поговорить с силуэтом',
    next: 'dialog',
    log: { msg: 'КОНТАКТ УСТАНОВЛЕН', type: 'danger' as const },
  },
];

const PARTICLES_COLORS = ['rgba(57,255,20,0.6)', 'rgba(57,255,20,0.3)', 'rgba(200,255,100,0.4)', 'rgba(100,200,50,0.5)'];

const GameWorld = ({ gameState, onDialog, onMenu, onHover, playBeep }: Props) => {
  const [step, setStep] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '00:00', msg: 'Система активирована', type: 'info' },
    { time: '00:01', msg: 'GPS сигнал потерян', type: 'warn' },
  ]);
  const [showEntity, setShowEntity] = useState(false);
  const [lightFlicker, setLightFlicker] = useState(false);
  const particleId = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const newP: Particle = {
        id: particleId.current++,
        x: 10 + Math.random() * 80,
        y: 60 + Math.random() * 35,
        size: 2 + Math.random() * 4,
        dur: 3 + Math.random() * 4,
        delay: Math.random() * 2,
        color: PARTICLES_COLORS[Math.floor(Math.random() * PARTICLES_COLORS.length)],
      };
      setParticles(prev => [...prev.slice(-25), newP]);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (step >= 1) setShowEntity(true);
    const fl = setInterval(() => {
      setLightFlicker(prev => !prev);
      setTimeout(() => setLightFlicker(false), 80 + Math.random() * 120);
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(fl);
  }, [step]);

  const addLog = (entry: LogEntry) => {
    setLogs(prev => [...prev.slice(-8), entry]);
  };

  const handleAction = () => {
    const current = SCENE_STEPS[step];
    if (!current) return;

    const now = new Date();
    const timeStr = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    addLog({ time: timeStr, ...current.log });

    if (current.next === 'dialog') {
      playBeep(150, 0.3, 'sawtooth', 0.2);
      setTimeout(() => playBeep(100, 0.5, 'sawtooth', 0.15), 200);
      setTimeout(onDialog, 800);
    } else {
      playBeep(300, 0.1, 'square', 0.1);
      setStep(current.next as number);
    }
  };

  const scene = SCENE_STEPS[step];

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#060e06' }}>

      {/* Background city image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(https://cdn.poehali.dev/projects/30fce2d3-4117-40b9-b69c-30a2be0b4bc8/files/b7b8d8d7-6dfd-451d-b387-76b18f9f411e.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `brightness(${lightFlicker ? 0.6 : 0.4}) saturate(0.2) hue-rotate(80deg)`,
          transition: 'filter 0.05s',
        }}
      />

      {/* Fog layers */}
      <div className="fog-layer absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: 'linear-gradient(0deg, rgba(5,20,5,0.95) 0%, rgba(5,20,5,0.4) 60%, transparent 100%)' }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 70%, rgba(10,30,10,0.3) 0%, transparent 70%)' }} />

      {/* Dynamic light cone (flickering lamp) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '45%',
          top: '20%',
          width: '200px',
          height: '300px',
          background: `radial-gradient(ellipse at top, rgba(200,255,150,${lightFlicker ? 0.12 : 0.06}) 0%, transparent 70%)`,
          transform: 'translateX(-50%)',
          transition: 'background 0.05s',
        }}
      />

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="particle absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}

      {/* Entity silhouette */}
      {showEntity && (
        <div
          className="entity-silhouette absolute pointer-events-none"
          style={{ right: '15%', bottom: '30%', width: '80px', height: '180px' }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(https://cdn.poehali.dev/projects/30fce2d3-4117-40b9-b69c-30a2be0b4bc8/files/0c57a719-cc08-480d-82d5-56e680c5ed97.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.15) saturate(0) drop-shadow(0 0 12px rgba(255,20,20,0.8))',
              clipPath: 'polygon(30% 0%, 70% 0%, 85% 15%, 90% 40%, 80% 65%, 70% 100%, 30% 100%, 20% 65%, 10% 40%, 15% 15%)',
            }}
          />
          {/* Red eyes */}
          <div className="absolute" style={{ top: '18%', left: '30%', display: 'flex', gap: '14px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff2020', boxShadow: '0 0 8px 3px rgba(255,20,20,0.8)', animation: 'entity-pulse 2s ease-in-out infinite' }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff2020', boxShadow: '0 0 8px 3px rgba(255,20,20,0.8)', animation: 'entity-pulse 2s ease-in-out infinite', animationDelay: '0.3s' }} />
          </div>
        </div>
      )}

      {/* HUD Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex items-start justify-between">
        <div className="terminal-box px-4 py-2">
          <div className="font-terminal text-xs mb-1" style={{ color: 'var(--color-green-dim)', opacity: 0.6 }}>ЛОКАЦИЯ</div>
          <div className="font-terminal text-sm" style={{ color: 'var(--color-green)' }}>{gameState.location}</div>
        </div>
        <div className="terminal-box px-4 py-2 text-right">
          <div className="font-terminal text-xs mb-1" style={{ color: 'var(--color-green-dim)', opacity: 0.6 }}>ЗДОРОВЬЕ</div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-black border border-red-900">
              <div className="health-fill h-full" style={{ width: `${gameState.health}%` }} />
            </div>
            <span className="font-terminal text-sm" style={{ color: '#ff6b00' }}>{gameState.health}%</span>
          </div>
        </div>
      </div>

      {/* Log panel */}
      <div className="absolute top-20 right-4 z-20 terminal-box p-3 w-64 max-h-40 overflow-hidden">
        <div className="font-terminal text-xs mb-2" style={{ color: 'var(--color-green-dim)', opacity: 0.5 }}>// СИСТЕМНЫЙ ЛОГ</div>
        <div className="game-scroll overflow-y-auto max-h-28">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 text-xs font-terminal mb-1">
              <span style={{ color: 'var(--color-green-dim)', opacity: 0.5 }}>{log.time}</span>
              <span style={{ color: log.type === 'danger' ? 'var(--color-red)' : log.type === 'warn' ? 'var(--color-yellow)' : 'var(--color-green-dim)' }}>
                {log.msg}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main narrative panel */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
        <div className="terminal-box terminal-box-glow p-6 max-w-3xl mx-auto">
          {/* Scene text */}
          <div className="font-terminal text-sm leading-relaxed mb-6"
            style={{ color: 'var(--color-green)', textShadow: '0 0 8px rgba(57,255,20,0.3)' }}>
            {scene?.desc || 'Цель выполнена. Контакт установлен.'}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            {scene && (
              <button
                className="font-terminal text-sm px-6 py-3 border transition-all duration-200 hover:scale-105"
                style={{
                  borderColor: 'var(--color-green)',
                  color: 'var(--color-dark)',
                  background: 'var(--color-green)',
                  textShadow: 'none',
                  boxShadow: '0 0 20px rgba(57,255,20,0.4)',
                }}
                onClick={handleAction}
                onMouseEnter={onHover}
              >
                &gt; {scene.action}
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                className="font-terminal text-xs px-3 py-2 border border-opacity-30 transition-colors"
                style={{ borderColor: 'var(--color-green-dim)', color: 'var(--color-green-dim)' }}
                onMouseEnter={onHover}
                onClick={onMenu}
              >
                <Icon name="ArrowLeft" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameWorld;
