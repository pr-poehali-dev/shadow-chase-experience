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

const SHADOW_MESSAGES = [
  null,
  'иди домой',
  'я сказал — иди домой',
  'пожалуйста. выйди из игры.',
  'ЗАЧЕМ ТЫ ЗДЕСЬ',
  'ты меня злишь',
  'ещё раз и я не остановлюсь',
  'ТЫ НЕ ДОЛЖЕН ЗДЕСЬ БЫТЬ',
  'убирайся. последний раз.',
  'у̷̡̛̘͎̖̲̓͐̐̃͠х̵̺̝̈́̌͘о̶̰͉̠̉̅̿д̵͚̩̈̔̕и̶̭͝',
  null,
];

const LONELY_TEXTS = [
  'здесь ты в безопасности',
  'вы уже встречались раньше',
  'ОН НЕ ОТРАЖАЕТСЯ В ЗЕРКАЛАХ',
  'если ты слышишь шаги за спиной — не оборачивайся',
  'этот дом не существует на картах',
  'т̵̡̨̻͙̙͖̬͂̈́̍͐ы̸̛̱̰͊ н̶̡̥͛̑͘е̵͙͊ о̵̺͆д̴̩͌̓и̶̙͝н̷̢̑',
  'выйди из этого дома',
  '............',
  'он уже внутри',
];

function playBrokenMusic(ctx: AudioContext) {
  const notes = [261, 293, 329, 349, 392, 440, 494, 130, 196];
  let time = ctx.currentTime;
  for (let i = 0; i < 18; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)] * (Math.random() > 0.3 ? 1 : 0.5);
    const dur = 0.08 + Math.random() * 0.45;
    const gap = Math.random() * 0.18;
    gain.gain.setValueAtTime(0, time + gap);
    gain.gain.linearRampToValueAtTime(0.12, time + gap + 0.02);
    gain.gain.linearRampToValueAtTime(0, time + gap + dur);
    osc.start(time + gap); osc.stop(time + gap + dur + 0.05);
    time += gap + dur * (Math.random() > 0.5 ? 1 : 0.3);
  }
}

const GameWorld = ({ onMenu, onHover, playBeep }: Props) => {
  const [contactCount, setContactCount] = useState(0);
  const [shadowMsg, setShadowMsg] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [inLonelyHouse, setInLonelyHouse] = useState(false);
  const [lonelyText, setLonelyText] = useState('');
  const [showLonelyLink, setShowLonelyLink] = useState(false);
  const [vignette, setVignette] = useState(0);
  const [isLooking, setIsLooking] = useState(false);
  const [hint, setHint] = useState(true);

  const contactFired    = useRef(false);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const lonelyIntRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const musicIntRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const contactCountRef = useRef(0);
  const wasInLonely     = useRef(false);

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
    if (data.isLooking && data.shadowDist < 12) playBeep(58, 0.2, 'sine', 0.035);
  }, [playBeep]);

  // Lonely house effects
  useEffect(() => {
    if (inLonelyHouse && !wasInLonely.current) {
      wasInLonely.current = true;
      setHint(false);
      setShowLonelyLink(true);
      const ctx = getCtx();
      playBrokenMusic(ctx);
      musicIntRef.current = setInterval(() => playBrokenMusic(ctx), 3800);
      let ti = 0;
      setLonelyText(LONELY_TEXTS[0]);
      lonelyIntRef.current = setInterval(() => {
        ti = (ti + 1) % LONELY_TEXTS.length;
        setLonelyText(LONELY_TEXTS[ti]);
      }, 2600);
    }
    if (!inLonelyHouse && wasInLonely.current) {
      wasInLonely.current = false;
      setShowLonelyLink(false);
      if (musicIntRef.current)  clearInterval(musicIntRef.current);
      if (lonelyIntRef.current) clearInterval(lonelyIntRef.current);
      setLonelyText('');
    }
    return () => {
      if (musicIntRef.current)  clearInterval(musicIntRef.current);
      if (lonelyIntRef.current) clearInterval(lonelyIntRef.current);
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

    if (newCount >= 10) { setShowError(true); return; }

    const msg = SHADOW_MESSAGES[newCount] ?? null;
    if (msg) {
      setShadowMsg(msg);
      setTimeout(() => { setShadowMsg(null); onMenu(); }, newCount >= 7 ? 2200 : 2800);
    } else {
      setTimeout(onMenu, 400);
    }
    setTimeout(() => { contactFired.current = false; }, 4000);
  }, [playBeep, onMenu]);

  if (showError) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center"
        style={{ background: '#000', fontFamily: 'monospace' }}>
        <div style={{ color: '#aaa', fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: '1.5rem', opacity: 0.5 }}>
          CRITICAL ERROR — PROCESS 7734 FAILED
        </div>
        <div style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
          stand_rp.exe has stopped working
        </div>
        <div style={{ color: '#808080', fontSize: '0.72rem', marginBottom: '2.5rem', lineHeight: 2, textAlign: 'center', maxWidth: '420px' }}>
          Exception: 0xC000001D — ILLEGAL_INSTRUCTION<br />
          Module: shadow_entity.dll + 0x0000000<br />
          <span style={{ color: '#c04040' }}>он слишком близко</span><br />
          Stack trace corrupted. Address: 0xDEADFACE<br />
          <span style={{ opacity: 0.35 }}>Вы не должны были подходить 10 раз.</span>
        </div>
        <button
          onClick={() => { setShowError(false); contactCountRef.current = 0; setContactCount(0); onMenu(); }}
          style={{ color: '#555', background: 'none', border: '1px solid #282828', padding: '0.5rem 1.5rem', cursor: 'pointer', fontSize: '0.72rem', letterSpacing: '0.15em' }}
        >закрыть</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">

      <CityEngine onEntityContact={handleEntityContact} onHUDUpdate={handleHUDUpdate} contactCount={contactCount} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10 transition-all duration-700"
        style={{ background: `radial-gradient(ellipse at center, transparent ${40 - vignette * 24}%, rgba(20,10,3,${0.3 + vignette * 0.55}) 100%)` }} />

      {/* Film grain */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {isLooking && (
        <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'rgba(0,0,0,0.12)' }} />
      )}

      {/* Shadow message */}
      {shadowMsg && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none animate-fade-in">
          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: contactCount >= 7 ? '1.8rem' : '1.1rem',
            color: contactCount >= 7 ? '#ff2020' : 'rgba(240,220,180,0.92)',
            textAlign: 'center',
            textShadow: contactCount >= 7 ? '0 0 24px rgba(255,0,0,0.7)' : 'none',
            letterSpacing: '0.1em',
            maxWidth: '80%',
            padding: '1rem 1.5rem',
            background: 'rgba(0,0,0,0.55)',
          }}>
            {shadowMsg}
          </div>
        </div>
      )}

      {/* Lonely house overlay — text + link */}
      {inLonelyHouse && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end"
          style={{ background: 'linear-gradient(0deg, rgba(10,5,0,0.9) 0%, transparent 55%)' }}>
          <div className="pointer-events-auto pb-8 px-8 flex flex-col items-center gap-4">
            {lonelyText && (
              <div className="animate-fade-in text-center" style={{
                fontFamily: '"Courier New", monospace', fontSize: '0.85rem',
                color: 'rgba(220,200,150,0.85)', letterSpacing: '0.15em',
              }}>
                {lonelyText}
              </div>
            )}
            {showLonelyLink && (
              <div className="animate-fade-in text-center border px-6 py-3"
                style={{ borderColor: 'rgba(200,170,100,0.35)', background: 'rgba(0,0,0,0.6)' }}>
                <div style={{ fontFamily: '"Courier New", monospace', fontSize: '0.65rem', color: 'rgba(180,150,80,0.5)', letterSpacing: '0.25em', marginBottom: '0.6rem' }}>
                  ВХОДЯЩЕЕ СООБЩЕНИЕ
                </div>
                <div style={{ fontFamily: '"Courier New", monospace', fontSize: '0.78rem', color: 'rgba(220,200,150,0.7)', marginBottom: '0.8rem' }}>
                  найдено продолжение. открыть?
                </div>
                <a
                  href="https://bald-boy-horror-novel--preview.poehali.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: '"Courier New", monospace', fontSize: '0.75rem',
                    color: 'rgba(230,210,150,0.9)', letterSpacing: '0.15em',
                    textDecoration: 'underline', textUnderlineOffset: '3px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={onHover}
                >
                  → открыть ссылку
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Looking whisper */}
      {isLooking && !shadowMsg && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 animate-fade-in text-center"
          style={{ fontFamily: '"Courier New", monospace', color: 'rgba(255,255,255,0.1)', fontSize: '0.9rem', letterSpacing: '0.3em' }}>
          он видит тебя
        </div>
      )}

      {/* Online counter */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div style={{
          fontFamily: '"Courier New", monospace', fontSize: '0.65rem',
          color: 'rgba(60,40,15,0.5)', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#5a9030', boxShadow: '0 0 4px rgba(80,160,40,0.6)' }} />
          онлайн: 2
        </div>
      </div>

      {/* Controls hint */}
      {hint && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center"
          style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', color: 'rgba(70,50,20,0.42)', letterSpacing: '0.18em' }}>
          клик — захват мыши · WASD — движение · мышь — обзор · ESC — выход
        </div>
      )}

      {/* Back */}
      <div className="absolute top-4 right-4 z-20">
        <button
          style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', letterSpacing: '0.18em', color: 'rgba(70,50,20,0.38)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={onMenu} onMouseEnter={onHover}
        >← меню</button>
      </div>

      {/* Contact counter */}
      {contactCount > 0 && (
        <div className="absolute bottom-5 right-5 z-20 pointer-events-none"
          style={{ fontFamily: '"Courier New", monospace', fontSize: '0.58rem', color: `rgba(${100 + contactCount * 15},${80 - contactCount * 7},20,0.4)`, letterSpacing: '0.18em' }}>
          встреч: {contactCount}/10
        </div>
      )}
    </div>
  );
};

export default GameWorld;
