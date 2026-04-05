import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState } from '@/pages/Index';
import CityEngine, { HUDData } from './CityEngine';

interface Props {
  gameState: GameState;
  onDialog: () => void;
  onMenu: () => void;
  onHover: () => void;
  playBeep: (freq: number, dur: number, type?: OscillatorType, vol?: number) => void;
}

// ── Messages from shadow, getting more aggressive ──────────
const SHADOW_MESSAGES = [
  null, // 0 — first contact handled by GameWorld
  'иди домой',
  'я сказал — иди домой',
  'ЗАЧЕМ ТЫ ЗДЕСЬ',
  'ты меня злишь',
  'ещё раз и я не остановлюсь',
  'ТЫ НЕ ДОЛЖЕН ЗДЕСЬ БЫТЬ',
  'убирайся. последний раз.',
  '̷̡̫̓у̴̧̛̫̬̓̒̊̕х̵̣̺̟̣̈́̌̃͘о̶̰̠̉̅̿д̵̜̩̈̔̕и̶̭͑',
  null, // 10 — ERROR screen
];

// ── Broken music generator ─────────────────────────────────
function playBrokenMusic(ctx: AudioContext, vol: number) {
  const notes = [261, 293, 329, 349, 392, 440, 494, 523];
  let time = ctx.currentTime;
  for (let i = 0; i < 16; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
    const note = notes[Math.floor(Math.random() * notes.length)];
    osc.frequency.value = note * (Math.random() > 0.3 ? 1 : 0.5);
    const dur = 0.1 + Math.random() * 0.4;
    const gap = Math.random() * 0.2;
    gain.gain.setValueAtTime(0, time + gap);
    gain.gain.linearRampToValueAtTime(vol * 0.15, time + gap + 0.02);
    gain.gain.linearRampToValueAtTime(0, time + gap + dur);
    osc.start(time + gap); osc.stop(time + gap + dur + 0.05);
    time += gap + dur * (Math.random() > 0.5 ? 1 : 0.3);
  }
}

// ── Surreal texts shown in lonely house ──────────────────
const LONELY_TEXTS = [
  'здесь ты в безопасности',
  'вы уже встречались раньше',
  'ОН НЕ ОТРАЖАЕТСЯ В ЗЕРКАЛАХ',
  'если ты слышишь шаги за спиной — не оборачивайся',
  'этот дом не существует на картах',
  'т̵̡̨̻͙̙͖̬̜̙͂̈́̍͐ы̸̛̱̰̝͊ н̶̡̥̱̦͛̑͘е̵͙͊ о̵̺̳̗̆д̴̩̻̯͌̓и̶̙͝н̷̢̼̻̑',
  'ВЫЙДИ ИЗ ЭТОГО ДОМА',
  '............',
  'он уже внутри',
  'номер телефона: 8̸̤̥̑0̶̙̐0̷̪̑-̴̬͝Н̸̗͌Е̷̦͗-̷̺̂З̵̲̌В̷̬̑О̴̠̅Н̶̙̐И̸̤̑',
];

const GameWorld = ({ onDialog, onMenu, onHover, playBeep }: Props) => {
  const [contactCount, setContactCount] = useState(0);
  const [shadowMsg, setShadowMsg] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [inLonelyHouse, setInLonelyHouse] = useState(false);
  const [lonelyText, setLonelyText] = useState('');
  const [vignette, setVignette] = useState(0);
  const [isLooking, setIsLooking] = useState(false);
  const [hint, setHint] = useState(true);

  const contactFired = useRef(false);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const lonelyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const musicIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const contactCountRef   = useRef(0);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const W = window as Window & { webkitAudioContext?: typeof AudioContext };
      audioCtxRef.current = new (W.AudioContext || W.webkitAudioContext!)();
    }
    return audioCtxRef.current;
  }, []);

  const handleHUDUpdate = useCallback((data: HUDData) => {
    setVignette(Math.max(0, Math.min(1, (14 - data.shadowDist) / 12)));
    setIsLooking(data.isLooking);
    setInLonelyHouse(data.inLonelyHouse);
    if (data.isLooking && data.shadowDist < 10) {
      playBeep(60, 0.25, 'sine', 0.04);
    }
  }, [playBeep]);

  // Lonely house effects
  useEffect(() => {
    if (inLonelyHouse) {
      setHint(false);
      // broken music loop
      const ctx = getCtx();
      playBrokenMusic(ctx, 1);
      musicIntervalRef.current = setInterval(() => playBrokenMusic(ctx, 1), 3500);
      // text rotation
      let ti = 0;
      setLonelyText(LONELY_TEXTS[0]);
      lonelyIntervalRef.current = setInterval(() => {
        ti = (ti + 1) % LONELY_TEXTS.length;
        setLonelyText(LONELY_TEXTS[ti]);
      }, 2800);
    } else {
      if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
      if (lonelyIntervalRef.current) clearInterval(lonelyIntervalRef.current);
      setLonelyText('');
    }
    return () => {
      if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
      if (lonelyIntervalRef.current) clearInterval(lonelyIntervalRef.current);
    };
  }, [inLonelyHouse, getCtx]);

  const handleEntityContact = useCallback(() => {
    if (contactFired.current) return;
    contactFired.current = true;

    const newCount = contactCountRef.current + 1;
    contactCountRef.current = newCount;
    setContactCount(newCount);

    playBeep(80, 0.5, 'sawtooth', 0.18);
    setTimeout(() => playBeep(55, 0.8, 'sawtooth', 0.12), 400);

    if (newCount >= 10) {
      // Error screen
      setShowError(true);
      return;
    }

    if (newCount === 3) {
      // Shadow asks to quit
      setShadowMsg('пожалуйста. выйди из игры.');
      setTimeout(() => { setShadowMsg(null); onMenu(); }, 3500);
      return;
    }

    const msg = SHADOW_MESSAGES[newCount] ?? null;
    if (msg) {
      setShadowMsg(msg);
      setTimeout(() => {
        setShadowMsg(null);
        onMenu();
      }, 2800);
    } else {
      onMenu();
    }
  }, [playBeep, onMenu]);

  // Watch for contactCount change to allow re-trigger
  useEffect(() => {
    if (contactCount > 0) {
      const t = setTimeout(() => { contactFired.current = false; }, 3500);
      return () => clearTimeout(t);
    }
  }, [contactCount]);

  if (showError) {
    return (
      <div
        className="relative w-full h-full flex flex-col items-center justify-center"
        style={{ background: '#000', fontFamily: 'monospace' }}
      >
        <div style={{ color: '#c8c8c8', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '1.5rem', opacity: 0.5 }}>
          CRITICAL ERROR — PROCESS 7734 FAILED
        </div>
        <div style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
          stand_rp.exe has stopped working
        </div>
        <div style={{ color: '#808080', fontSize: '0.72rem', marginBottom: '2.5rem', lineHeight: 1.8, textAlign: 'center', maxWidth: '420px' }}>
          Exception: 0xC000001D — ILLEGAL_INSTRUCTION<br />
          Module: shadow_entity.dll + 0x0000000<br />
          <span style={{ color: '#c04040' }}>он слишком близко</span><br />
          Stack trace corrupted. Memory address: 0xDEADFACE<br />
          <span style={{ opacity: 0.4 }}>Вы не должны были подходить 10 раз.</span>
        </div>
        <button
          onClick={() => { setShowError(false); contactCountRef.current = 0; setContactCount(0); onMenu(); }}
          style={{ color: '#606060', background: 'none', border: '1px solid #303030', padding: '0.5rem 1.5rem', cursor: 'pointer', fontSize: '0.72rem', letterSpacing: '0.15em' }}
        >
          закрыть
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">

      <CityEngine
        onEntityContact={handleEntityContact}
        onHUDUpdate={handleHUDUpdate}
        contactCount={contactCount}
      />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10 transition-all duration-700"
        style={{ background: `radial-gradient(ellipse at center, transparent ${38 - vignette * 22}%, rgba(20,10,3,${0.38 + vignette * 0.5}) 100%)` }} />

      {/* Film grain */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-5"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* Looking-back flash */}
      {isLooking && (
        <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'rgba(0,0,0,0.15)' }} />
      )}

      {/* Shadow message overlay */}
      {shadowMsg && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none animate-fade-in">
          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: contactCount >= 7 ? '1.6rem' : '1.1rem',
            color: contactCount >= 7 ? '#ff3030' : 'rgba(240,220,180,0.9)',
            textAlign: 'center',
            textShadow: contactCount >= 7 ? '0 0 20px rgba(255,0,0,0.6)' : 'none',
            letterSpacing: '0.1em',
            maxWidth: '80%',
            padding: '1rem',
            background: 'rgba(0,0,0,0.5)',
          }}>
            {shadowMsg}
          </div>
        </div>
      )}

      {/* Lonely house overlay */}
      {inLonelyHouse && lonelyText && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none animate-fade-in"
          style={{ background: 'linear-gradient(0deg, rgba(10,5,0,0.85) 0%, transparent 100%)', padding: '3rem 2rem 2rem' }}>
          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '0.85rem',
            color: 'rgba(220,200,150,0.8)',
            letterSpacing: '0.15em',
            textAlign: 'center',
          }}>
            {lonelyText}
          </div>
        </div>
      )}

      {/* Whisper when looking at shadow */}
      {isLooking && !shadowMsg && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 animate-fade-in text-center"
          style={{ fontFamily: '"Courier New", monospace', color: 'rgba(255,255,255,0.12)', fontSize: '0.9rem', letterSpacing: '0.3em' }}>
          он видит тебя
        </div>
      )}

      {/* Controls hint */}
      {hint && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center"
          style={{ fontFamily: '"Courier New", monospace', fontSize: '0.65rem', color: 'rgba(80,55,25,0.45)', letterSpacing: '0.18em' }}>
          клик — захват мыши · WASD — движение · мышь — обзор · ESC — выход
        </div>
      )}

      {/* Back to menu */}
      <div className="absolute top-5 left-5 z-20">
        <button
          style={{ fontFamily: '"Courier New", monospace', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'rgba(80,55,25,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={onMenu} onMouseEnter={onHover}
        >← меню</button>
      </div>

      {/* Contact counter (subtle) */}
      {contactCount > 0 && (
        <div className="absolute top-5 right-5 z-20 pointer-events-none"
          style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', color: `rgba(${120 + contactCount * 13},${80 - contactCount * 7},30,0.45)`, letterSpacing: '0.2em' }}>
          встреч: {contactCount}/10
        </div>
      )}
    </div>
  );
};

export default GameWorld;
