import { useState } from 'react';
import { GameState } from '@/pages/Index';
import Icon from '@/components/ui/icon';

interface Props {
  gameState: GameState;
  onSave: (s: GameState) => void;
  onBack: () => void;
  onHover: () => void;
}

const SettingsPanel = ({ gameState, onSave, onBack, onHover }: Props) => {
  const [local, setLocal] = useState({ ...gameState });

  const update = (key: keyof GameState, val: boolean | number) => {
    setLocal(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #050d05 0%, #030603 100%)' }}>

      <div className="w-full max-w-lg px-8 animate-scale-in">
        <div className="font-terminal text-xs mb-2 tracking-widest" style={{ color: 'var(--color-green-dim)', opacity: 0.5 }}>
          // СИСТЕМНЫЕ НАСТРОЙКИ
        </div>
        <h2 className="font-display text-5xl mb-8 tracking-widest" style={{ color: 'var(--color-green)', textShadow: '0 0 20px rgba(57,255,20,0.4)' }}>
          НАСТРОЙКИ
        </h2>

        <div className="terminal-box p-6 space-y-6">

          {/* Sound toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-terminal text-sm" style={{ color: 'var(--color-green)' }}>ЗВУК</div>
              <div className="font-terminal text-xs mt-1" style={{ color: 'var(--color-green-dim)', opacity: 0.5 }}>Все звуковые эффекты</div>
            </div>
            <button
              className="font-terminal text-sm px-4 py-2 border transition-all"
              style={{
                borderColor: local.soundEnabled ? 'var(--color-green)' : 'var(--color-green-dim)',
                color: local.soundEnabled ? 'var(--color-green)' : 'var(--color-green-dim)',
                background: local.soundEnabled ? 'rgba(57,255,20,0.1)' : 'transparent',
                boxShadow: local.soundEnabled ? '0 0 12px rgba(57,255,20,0.2)' : 'none',
              }}
              onClick={() => update('soundEnabled', !local.soundEnabled)}
              onMouseEnter={onHover}
            >
              {local.soundEnabled ? '[ВКЛ]' : '[ВЫКЛ]'}
            </button>
          </div>

          {/* Music volume */}
          <div>
            <div className="flex justify-between mb-2">
              <div className="font-terminal text-sm" style={{ color: 'var(--color-green)' }}>МУЗЫКА</div>
              <div className="font-terminal text-sm" style={{ color: 'var(--color-green-dim)' }}>{local.musicVolume}%</div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} value={local.musicVolume}
                onChange={e => update('musicVolume', parseInt(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--color-green)' }}
                onMouseEnter={onHover}
              />
            </div>
            <div className="mt-1 h-1" style={{ background: 'rgba(57,255,20,0.1)' }}>
              <div className="h-full" style={{ width: `${local.musicVolume}%`, background: 'var(--color-green)', boxShadow: '0 0 6px rgba(57,255,20,0.4)', transition: 'width 0.1s' }} />
            </div>
          </div>

          {/* SFX volume */}
          <div>
            <div className="flex justify-between mb-2">
              <div className="font-terminal text-sm" style={{ color: 'var(--color-green)' }}>ЭФФЕКТЫ</div>
              <div className="font-terminal text-sm" style={{ color: 'var(--color-green-dim)' }}>{local.sfxVolume}%</div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} value={local.sfxVolume}
                onChange={e => update('sfxVolume', parseInt(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--color-green)' }}
                onMouseEnter={onHover}
              />
            </div>
            <div className="mt-1 h-1" style={{ background: 'rgba(57,255,20,0.1)' }}>
              <div className="h-full" style={{ width: `${local.sfxVolume}%`, background: 'var(--color-green)', boxShadow: '0 0 6px rgba(57,255,20,0.4)', transition: 'width 0.1s' }} />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px" style={{ background: 'rgba(57,255,20,0.15)' }} />

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              className="flex-1 font-terminal text-sm py-3 border transition-all"
              style={{ borderColor: 'var(--color-green-dim)', color: 'var(--color-green-dim)' }}
              onClick={onBack}
              onMouseEnter={onHover}
            >
              <Icon name="ArrowLeft" size={14} className="inline mr-2" />
              НАЗАД
            </button>
            <button
              className="flex-1 font-terminal text-sm py-3 transition-all"
              style={{
                background: 'var(--color-green)',
                color: 'var(--color-dark)',
                boxShadow: '0 0 20px rgba(57,255,20,0.4)',
              }}
              onClick={() => onSave(local)}
              onMouseEnter={onHover}
            >
              <Icon name="Save" size={14} className="inline mr-2" />
              СОХРАНИТЬ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
