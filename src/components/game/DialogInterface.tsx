import { useState, useEffect, useRef } from 'react';
import { GameState } from '@/pages/Index';

interface Props {
  gameState: GameState;
  onClose: () => void;
  onHover: () => void;
  playBeep: (freq: number, dur: number, type?: OscillatorType, vol?: number) => void;
}

interface Message {
  id: number;
  from: 'player' | 'entity';
  text: string;
  typing?: boolean;
}

const ENTITY_NAME = 'SH4D0W_ENTITY_7';

const DIALOG_TREE: Record<number, { options: { text: string; next: number }[]; response: string }> = {
  0: {
    response: 'TY... ZNAESH... GDE MY... DA... TY UZHE ZDES...',
    options: [
      { text: 'Где я нахожусь?', next: 1 },
      { text: 'Ты кто такой?', next: 2 },
      { text: 'Уйди от меня.', next: 3 },
    ],
  },
  1: {
    response: 'ZONA_7... ZABYTA... MIROM... NO NE NAMI... MY ZHDEM... VAS...',
    options: [
      { text: 'Кого "нас"?', next: 4 },
      { text: 'Как мне выбраться?', next: 5 },
    ],
  },
  2: {
    response: 'YA... OSTATOK... PROTOKOL VYZHIVANIYA... SEKTOR_7... YA_BY_TYE_VY...',
    options: [
      { text: 'Ты был человеком?', next: 6 },
      { text: 'Что произошло здесь?', next: 5 },
    ],
  },
  3: {
    response: 'NET... TY NE MOZHESH UYTI... TY UZHE CHAST ZONY... PRINYAT ETO...',
    options: [
      { text: 'Никогда.', next: 5 },
      { text: 'Расскажи мне больше.', next: 2 },
    ],
  },
  4: {
    response: 'VAS... PRISHELSHY... TYE KTO SLYSHAT SIGNAL... SIGNAL ZOVYOT VAS SYUDA...',
    options: [
      { text: 'Что за сигнал?', next: 7 },
      { text: '[Молчание]', next: 5 },
    ],
  },
  5: {
    response: 'VYHOD... NET... VYHODA... TOLKO VNUTR... GLUBZHE... V TEMNOTU...',
    options: [
      { text: 'Это угроза?', next: 8 },
      { text: '[Завершить диалог]', next: -1 },
    ],
  },
  6: {
    response: 'CHELOVEK... DA... DAVNO... TEPER YA... SOVSEM DRUGOE... LUCHSHE...',
    options: [
      { text: 'Что с тобой случилось?', next: 5 },
      { text: '[Завершить диалог]', next: -1 },
    ],
  },
  7: {
    response: 'SIGNAL... 3.7KHz... IZ CENTRA ZONY... ON ZOVYOT... IDTE TUDA... NE BOISYES...',
    options: [
      { text: 'Я найду источник.', next: 8 },
      { text: 'Это ловушка.', next: 5 },
    ],
  },
  8: {
    response: '... ... ... UDACHI... VY VAM PONАДОBIТСЯ... ...SH4D0W_DISCONNECTED...',
    options: [
      { text: '[Завершить диалог]', next: -1 },
    ],
  },
};

const typeText = (text: string, onChar: (t: string) => void, onDone: () => void) => {
  let i = 0;
  const interval = setInterval(() => {
    if (i < text.length) {
      onChar(text.slice(0, i + 1));
      i++;
    } else {
      clearInterval(interval);
      onDone();
    }
  }, 35);
  return () => clearInterval(interval);
};

const DialogInterface = ({ onClose, onHover, playBeep }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [node, setNode] = useState(0);
  const [typing, setTyping] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const msgId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addEntityMessage = (node: number) => {
    const data = DIALOG_TREE[node];
    if (!data) return;
    setTyping(true);
    setShowOptions(false);
    setDisplayText('');

    const id = msgId.current++;
    setMessages(prev => [...prev, { id, from: 'entity', text: '', typing: true }]);

    const cleanup = typeText(
      data.response,
      (t) => {
        setDisplayText(t);
        setMessages(prev => prev.map(m => m.id === id ? { ...m, text: t } : m));
        playBeep(80 + Math.random() * 40, 0.02, 'square', 0.04);
      },
      () => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, typing: false } : m));
        setTyping(false);
        setTimeout(() => setShowOptions(true), 300);
      }
    );
    return cleanup;
  };

  useEffect(() => {
    playBeep(100, 0.4, 'sawtooth', 0.15);
    setTimeout(() => addEntityMessage(0), 800);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, displayText]);

  const handleOption = (option: { text: string; next: number }) => {
    onHover();
    playBeep(350, 0.08, 'square', 0.08);

    const id = msgId.current++;
    setMessages(prev => [...prev, { id, from: 'player', text: option.text }]);
    setShowOptions(false);

    if (option.next === -1) {
      setTimeout(() => {
        playBeep(200, 0.3, 'sawtooth', 0.1);
        onClose();
      }, 500);
      return;
    }

    setTimeout(() => addEntityMessage(option.next), 600);
    setNode(option.next);
  };

  return (
    <div className="relative w-full h-full flex flex-col"
      style={{ background: 'radial-gradient(ellipse at center, #0a0f0a 0%, #030603 100%)' }}>

      {/* Background entity image */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(https://cdn.poehali.dev/projects/30fce2d3-4117-40b9-b69c-30a2be0b4bc8/files/0c57a719-cc08-480d-82d5-56e680c5ed97.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(0) blur(3px)',
        }}
      />

      {/* Red vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(60,5,5,0.5) 100%)' }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4">
        <div className="dialog-panel terminal-box px-4 py-2 flex items-center gap-3">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red)', boxShadow: '0 0 8px rgba(255,20,20,0.8)', animation: 'entity-pulse 2s ease-in-out infinite' }} />
          <div>
            <div className="font-terminal text-xs" style={{ color: 'var(--color-red)', opacity: 0.7 }}>НЕИЗВЕСТНЫЙ ОБЪЕКТ</div>
            <div className="font-display text-xl tracking-widest" style={{ color: 'var(--color-red)', textShadow: '0 0 12px rgba(255,20,20,0.6)' }}>
              {SH4D0W_ENTITY_7_DISPLAY()}
            </div>
          </div>
        </div>
        <button
          className="terminal-box px-4 py-2 font-terminal text-xs transition-all hover:border-red-500"
          style={{ color: 'var(--color-green-dim)', borderColor: 'var(--color-green-dim)' }}
          onClick={onClose}
          onMouseEnter={onHover}
        >
          [ПРЕРВАТЬ СЕАНС]
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-6 py-2 game-scroll space-y-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'player' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            {msg.from === 'entity' && (
              <div className="max-w-lg">
                <div className="font-terminal text-xs mb-1" style={{ color: 'var(--color-red)', opacity: 0.6 }}>
                  {ENTITY_NAME}
                </div>
                <div
                  className="terminal-box px-4 py-3 font-terminal text-sm leading-relaxed"
                  style={{
                    borderColor: 'rgba(255,32,32,0.3)',
                    color: '#ff8080',
                    boxShadow: '0 0 20px rgba(255,20,20,0.1)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {msg.text}
                  {msg.typing && <span style={{ color: 'var(--color-red)', animation: 'blink 0.8s step-end infinite' }}>█</span>}
                </div>
              </div>
            )}
            {msg.from === 'player' && (
              <div className="max-w-md">
                <div className="font-terminal text-xs mb-1 text-right" style={{ color: 'var(--color-green-dim)', opacity: 0.6 }}>
                  ИГРОК
                </div>
                <div
                  className="px-4 py-3 font-terminal text-sm"
                  style={{
                    background: 'rgba(57,255,20,0.08)',
                    border: '1px solid rgba(57,255,20,0.3)',
                    color: 'var(--color-green)',
                  }}
                >
                  &gt; {msg.text}
                </div>
              </div>
            )}
          </div>
        ))}

        {typing && messages.length === 0 && (
          <div className="flex justify-start animate-fade-in">
            <div className="terminal-box px-4 py-3 font-terminal text-sm" style={{ borderColor: 'rgba(255,32,32,0.3)', color: '#ff8080' }}>
              <span style={{ animation: 'blink 0.5s step-end infinite' }}>█ █ █</span>
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="relative z-10 px-6 pb-6 pt-4">
        {showOptions && (
          <div className="dialog-panel terminal-box p-4 space-y-2">
            <div className="font-terminal text-xs mb-3" style={{ color: 'var(--color-green-dim)', opacity: 0.5 }}>
              // ВЫБЕРИТЕ ОТВЕТ:
            </div>
            {DIALOG_TREE[node]?.options.map((opt, i) => (
              <button
                key={i}
                className="block w-full text-left font-terminal text-sm px-4 py-3 border transition-all duration-200"
                style={{
                  borderColor: 'rgba(57,255,20,0.2)',
                  color: 'var(--color-green-dim)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  onHover();
                  (e.target as HTMLElement).style.background = 'rgba(57,255,20,0.08)';
                  (e.target as HTMLElement).style.color = 'var(--color-green)';
                  (e.target as HTMLElement).style.borderColor = 'rgba(57,255,20,0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = 'transparent';
                  (e.target as HTMLElement).style.color = 'var(--color-green-dim)';
                  (e.target as HTMLElement).style.borderColor = 'rgba(57,255,20,0.2)';
                }}
                onClick={() => handleOption(opt)}
              >
                [{i + 1}] {opt.text}
              </button>
            ))}
          </div>
        )}

        {!showOptions && typing && (
          <div className="text-center font-terminal text-xs cursor-blink" style={{ color: 'var(--color-red)', opacity: 0.5 }}>
            ПОЛУЧЕНИЕ СИГНАЛА
          </div>
        )}
      </div>
    </div>
  );
};

function SH4D0W_ENTITY_7_DISPLAY() {
  return ENTITY_NAME;
}

export default DialogInterface;
