import { useState, useEffect } from 'react';

interface Props {
  onStart: () => void;
  onSettings: () => void;
  onHover: () => void;
}

const GLITCH_CHARS = '!@#$%^&*[]{}|<>?/\\~`';

const glitchText = (text: string): string => {
  return text.split('').map(c => {
    if (c === ' ' || Math.random() > 0.15) return c;
    return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
  }).join('');
};

const MENU_ITEMS = [
  { id: 'start', label: 'НОВАЯ ИГРА', sub: 'SECTOR-7 // ЗАПУСТИТЬ СИМУЛЯЦИЮ' },
  { id: 'load', label: 'ЗАГРУЗИТЬ', sub: 'ФАЙЛ СОХРАНЕНИЯ НЕ НАЙДЕН' },
  { id: 'settings', label: 'НАСТРОЙКИ', sub: 'ЗВУК // УПРАВЛЕНИЕ // ДИСПЛЕЙ' },
  { id: 'quit', label: 'ВЫХОД', sub: 'ЗАВЕРШИТЬ СЕАНС' },
];

const MainMenu = ({ onStart, onSettings, onHover }: Props) => {
  const [title, setTitle] = useState('ЗОНА ОТЧУЖДЕНИЯ');
  const [active, setActive] = useState<string | null>(null);
  const [bootDone, setBootDone] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  const BOOT_SEQUENCE = [
    'ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ...',
    'ЗАГРУЗКА МОДУЛЕЙ СРЕДЫ... [OK]',
    'ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ... [OK]',
    'ОБНАРУЖЕНЫ АНОМАЛИИ В СЕКТОРЕ-7',
    'ПРЕДУПРЕЖДЕНИЕ: КОНТАКТ С НЕИЗВЕСТНЫМ ОБЪЕКТОМ',
    'ЗАПУСК ПРОТОКОЛА ВЫЖИВАНИЯ...',
    '> ГОТОВ К РАБОТЕ',
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_SEQUENCE.length) {
        setBootLines(prev => [...prev, BOOT_SEQUENCE[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setBootDone(true), 500);
      }
    }, 280);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!bootDone) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
      if (Math.random() < 0.3) {
        setTitle(glitchText('ЗОНА ОТЧУЖДЕНИЯ'));
        setTimeout(() => setTitle('ЗОНА ОТЧУЖДЕНИЯ'), 120);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [bootDone]);

  const handleClick = (id: string) => {
    if (id === 'start') onStart();
    if (id === 'settings') onSettings();
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #050d05 0%, #0a1a0a 40%, #060e06 100%)' }}>

      {/* Polygon city bg image */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `url(https://cdn.poehali.dev/projects/30fce2d3-4117-40b9-b69c-30a2be0b4bc8/files/b7b8d8d7-6dfd-451d-b387-76b18f9f411e.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          filter: 'saturate(0.3) hue-rotate(100deg)',
        }}
      />

      {/* Green scanline fog */}
      <div className="fog-layer absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{ background: 'linear-gradient(0deg, rgba(10,60,10,0.7) 0%, transparent 100%)' }} />

      {/* Rain effect */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-px bg-green-900 opacity-20 animate-rain-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 100}%`,
            height: `${40 + Math.random() * 60}px`,
            animationDuration: `${0.8 + Math.random() * 1.5}s`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Boot terminal */}
      {!bootDone && (
        <div className="terminal-box p-6 w-full max-w-2xl mx-8 animate-fade-in font-terminal text-xs"
          style={{ color: 'var(--color-green-dim)' }}>
          <div className="mb-3 text-xs" style={{ color: 'var(--color-green)', opacity: 0.6 }}>
            SECTOR-7 SURVIVAL PROTOCOL v2.4.1
          </div>
          {bootLines.map((line, i) => (
            <div key={i} className="mb-1"
              style={{ color: line.includes('ПРЕДУПРЕЖДЕНИЕ') || line.includes('АНОМАЛИИ') ? 'var(--color-red)' : line.includes('OK') || line.includes('ГОТОВ') ? 'var(--color-green)' : 'var(--color-green-dim)' }}>
              {line}
            </div>
          ))}
          <div className="cursor-blink mt-2" style={{ color: 'var(--color-green-dim)' }} />
        </div>
      )}

      {/* Main content */}
      {bootDone && (
        <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-8 animate-scale-in">

          {/* Title */}
          <div className="mb-2 text-center">
            <div className="font-terminal text-xs mb-3 tracking-widest"
              style={{ color: 'var(--color-green-dim)' }}>
              ◄ SECTOR-7 SURVIVAL PROTOCOL v2.4.1 ►
            </div>
            <h1
              className="glitch-text font-display text-6xl md:text-8xl tracking-wider mb-1"
              data-text={title}
              style={{
                color: 'var(--color-green)',
                textShadow: '0 0 30px rgba(57,255,20,0.6), 0 0 60px rgba(57,255,20,0.2)',
                lineHeight: 1,
              }}
            >
              {title}
            </h1>
            <div className="font-header text-lg tracking-[0.4em] mt-2"
              style={{ color: 'var(--color-green-dim)', letterSpacing: '0.5em' }}>
              ABANDONED CITY
            </div>
          </div>

          {/* Divider */}
          <div className="w-full my-8 flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-green-dim))' }} />
            <div className="font-terminal text-xs" style={{ color: 'var(--color-green-dim)' }}>[ МЕНЮ ]</div>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--color-green-dim), transparent)' }} />
          </div>

          {/* Menu items */}
          <div className="w-full terminal-box p-4">
            {MENU_ITEMS.map((item) => (
              <div
                key={item.id}
                className={`menu-item ${active === item.id ? 'active' : ''} ${item.id === 'load' ? 'opacity-40 cursor-not-allowed' : ''}`}
                onMouseEnter={() => { setActive(item.id); onHover(); }}
                onMouseLeave={() => setActive(null)}
                onClick={() => item.id !== 'load' && handleClick(item.id)}
              >
                <div className="flex-1">
                  <span className="font-terminal text-base tracking-widest">{item.label}</span>
                  <span className="ml-4 text-xs opacity-50 font-terminal">{item.sub}</span>
                </div>
                {active === item.id && item.id !== 'load' && (
                  <div className="text-xs font-terminal animate-fade-in"
                    style={{ color: 'var(--color-green)' }}>
                    [ENTER]
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 font-terminal text-xs text-center"
            style={{ color: 'var(--color-green-dim)', opacity: 0.4 }}>
            {tick % 2 === 0 ? '■' : '□'} СИСТЕМА АКТИВНА // {new Date().toLocaleTimeString('ru-RU')} // МСК
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
