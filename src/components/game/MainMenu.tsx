import { useState, useEffect } from 'react';

interface Props {
  onStart: () => void;
  onSettings: () => void;
  onHover: () => void;
}

const MENU_ITEMS = [
  { id: 'start', label: 'Начать прогулку' },
  { id: 'settings', label: 'Настройки' },
  { id: 'quit', label: 'Уйти' },
];

const MainMenu = ({ onStart, onSettings, onHover }: Props) => {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    setTimeout(() => setTitleVisible(true), 300);
    setTimeout(() => setVisible(true), 900);
    const tick = setInterval(() => {
      const now = new Date();
      setTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const handleClick = (id: string) => {
    if (id === 'start') onStart();
    if (id === 'settings') onSettings();
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#c8b89a' }}
    >
      {/* Background image — dreamcore suburb */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(https://cdn.poehali.dev/projects/30fce2d3-4117-40b9-b69c-30a2be0b4bc8/files/ffb85310-77fb-456d-9542-1c15ab31d275.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(0.75) brightness(0.92)',
        }}
      />

      {/* Warm haze overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(220,190,130,0.25) 0%, rgba(180,140,80,0.35) 100%)' }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(60,40,20,0.55) 100%)' }}
      />

      {/* Horizontal lines — mild VHS feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.4) 3px, rgba(0,0,0,0.4) 4px)' }}
      />

      {/* Center card */}
      <div
        className="relative z-10 flex flex-col items-center"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      >
        {/* Clock */}
        <div
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '0.75rem',
            letterSpacing: '0.3em',
            color: 'rgba(80,60,30,0.6)',
            marginBottom: '2rem',
            opacity: titleVisible ? 1 : 0,
            transition: 'opacity 1s ease 0.4s',
          }}
        >
          {timeStr}
        </div>

        {/* Title */}
        <div
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 1.4s ease',
            textAlign: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <h1
            style={{
              fontFamily: '"Georgia", serif',
              fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
              fontWeight: 400,
              color: '#2a1f0e',
              letterSpacing: '0.05em',
              lineHeight: 1.1,
              textShadow: '0 2px 24px rgba(180,140,60,0.3)',
            }}
          >
            Stand&nbsp;RP
          </h1>
          <p
            style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '0.8rem',
              color: 'rgba(80,55,20,0.55)',
              letterSpacing: '0.25em',
              marginTop: '0.6rem',
              textTransform: 'uppercase',
            }}
          >
            ты не один здесь
          </p>
        </div>

        {/* Thin divider */}
        <div
          style={{
            width: '120px',
            height: '1px',
            background: 'rgba(80,55,20,0.25)',
            margin: '2.5rem auto',
          }}
        />

        {/* Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onMouseEnter={() => { setActive(item.id); onHover(); }}
              onMouseLeave={() => setActive(null)}
              onClick={() => handleClick(item.id)}
              style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '1rem',
                letterSpacing: '0.1em',
                color: active === item.id ? '#2a1f0e' : 'rgba(60,40,15,0.55)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.55rem 1.5rem',
                transition: 'all 0.25s ease',
                textDecoration: active === item.id ? 'underline' : 'none',
                textUnderlineOffset: '4px',
                transform: active === item.id ? 'translateX(4px)' : 'translateX(0)',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer hint */}
        <div
          style={{
            marginTop: '4rem',
            fontFamily: '"Courier New", monospace',
            fontSize: '0.65rem',
            color: 'rgba(80,55,20,0.35)',
            letterSpacing: '0.2em',
            textAlign: 'center',
          }}
        >
          не оглядывайся
        </div>
      </div>
    </div>
  );
};

export default MainMenu;