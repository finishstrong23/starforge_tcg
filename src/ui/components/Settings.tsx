/**
 * STARFORGE TCG - Settings Screen
 *
 * Configurable settings: SFX volume, music volume, mute toggle,
 * animation speed, auto-end turn, and confirm actions.
 * All settings persist to localStorage.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { SoundManager } from '../../audio/SoundManager';
import { hapticTap } from '../capacitor';
import backgroundImg from '../../assets/background.png';

const SETTINGS_KEY = 'starforge_settings';

export type ColorblindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
export type TextSize = 'small' | 'medium' | 'large';

export interface GameSettings {
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  animationSpeed: 'fast' | 'normal' | 'slow';
  autoEndTurn: boolean;
  confirmAttacks: boolean;
  showKeywordTooltips: boolean;
  screenShake: boolean;
  // Accessibility
  colorblindMode: ColorblindMode;
  reducedMotion: boolean;
  textSize: TextSize;
  highContrast: boolean;
  keyboardNavigation: boolean;
  screenReaderHints: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 0.5,
  musicVolume: 0.3,
  muted: false,
  animationSpeed: 'normal',
  autoEndTurn: false,
  confirmAttacks: false,
  showKeywordTooltips: true,
  screenShake: true,
  // Accessibility defaults
  colorblindMode: 'none',
  reducedMotion: false,
  textSize: 'medium',
  highContrast: false,
  keyboardNavigation: false,
  screenReaderHints: false,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Apply audio settings immediately
    SoundManager.volume = settings.sfxVolume;
    SoundManager.musicVolume = settings.musicVolume;
    SoundManager.muted = settings.muted;
  } catch {
    // ignore
  }
}

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);

  // Apply settings on mount
  useEffect(() => {
    SoundManager.volume = settings.sfxVolume;
    SoundManager.musicVolume = settings.musicVolume;
    SoundManager.muted = settings.muted;
  }, []);

  const updateSetting = useCallback(<K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    hapticTap();
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    saveSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Settings</h1>

        {/* Audio Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Audio</h2>

          {/* Mute Toggle */}
          <div style={styles.row}>
            <span style={styles.label}>Sound</span>
            <button
              style={{
                ...styles.toggleButton,
                background: settings.muted ? '#553333' : '#335533',
                borderColor: settings.muted ? '#ff4444' : '#44ff44',
              }}
              onClick={() => updateSetting('muted', !settings.muted)}
            >
              {settings.muted ? 'Muted' : 'On'}
            </button>
          </div>

          {/* SFX Volume */}
          <div style={styles.row}>
            <span style={styles.label}>SFX Volume</span>
            <div style={styles.sliderRow}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.sfxVolume * 100)}
                onChange={e => updateSetting('sfxVolume', parseInt(e.target.value) / 100)}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
          </div>

          {/* Music Volume */}
          <div style={styles.row}>
            <span style={styles.label}>Music Volume</span>
            <div style={styles.sliderRow}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.musicVolume * 100)}
                onChange={e => updateSetting('musicVolume', parseInt(e.target.value) / 100)}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>{Math.round(settings.musicVolume * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Gameplay Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Gameplay</h2>

          {/* Animation Speed */}
          <div style={styles.row}>
            <span style={styles.label}>Animation Speed</span>
            <div style={styles.buttonGroup}>
              {(['fast', 'normal', 'slow'] as const).map(speed => (
                <button
                  key={speed}
                  style={{
                    ...styles.optionButton,
                    ...(settings.animationSpeed === speed ? styles.optionButtonActive : {}),
                  }}
                  onClick={() => updateSetting('animationSpeed', speed)}
                >
                  {speed.charAt(0).toUpperCase() + speed.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Auto End Turn */}
          <div style={styles.row}>
            <span style={styles.label}>Auto-End Turn</span>
            <button
              style={{
                ...styles.toggleButton,
                background: settings.autoEndTurn ? '#335533' : '#333355',
                borderColor: settings.autoEndTurn ? '#44ff44' : '#666688',
              }}
              onClick={() => updateSetting('autoEndTurn', !settings.autoEndTurn)}
            >
              {settings.autoEndTurn ? 'On' : 'Off'}
            </button>
          </div>

          {/* Confirm Attacks */}
          <div style={styles.row}>
            <span style={styles.label}>Confirm Attacks</span>
            <button
              style={{
                ...styles.toggleButton,
                background: settings.confirmAttacks ? '#335533' : '#333355',
                borderColor: settings.confirmAttacks ? '#44ff44' : '#666688',
              }}
              onClick={() => updateSetting('confirmAttacks', !settings.confirmAttacks)}
            >
              {settings.confirmAttacks ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Display Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Display</h2>

          {/* Keyword Tooltips */}
          <div style={styles.row}>
            <span style={styles.label}>Keyword Tooltips</span>
            <button
              style={{
                ...styles.toggleButton,
                background: settings.showKeywordTooltips ? '#335533' : '#333355',
                borderColor: settings.showKeywordTooltips ? '#44ff44' : '#666688',
              }}
              onClick={() => updateSetting('showKeywordTooltips', !settings.showKeywordTooltips)}
            >
              {settings.showKeywordTooltips ? 'On' : 'Off'}
            </button>
          </div>

          {/* Screen Shake */}
          <div style={styles.row}>
            <span style={styles.label}>Screen Shake</span>
            <button
              style={{
                ...styles.toggleButton,
                background: settings.screenShake ? '#335533' : '#333355',
                borderColor: settings.screenShake ? '#44ff44' : '#666688',
              }}
              onClick={() => updateSetting('screenShake', !settings.screenShake)}
            >
              {settings.screenShake ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Accessibility Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Accessibility</h2>

          {/* Colorblind Mode */}
          <div style={styles.row}>
            <span style={styles.label}>Colorblind Mode</span>
            <div style={styles.buttonGroup}>
              {([
                { value: 'none', label: 'Off' },
                { value: 'deuteranopia', label: 'Deutan' },
                { value: 'protanopia', label: 'Protan' },
                { value: 'tritanopia', label: 'Tritan' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  style={{
                    ...styles.optionButton,
                    ...(settings.colorblindMode === opt.value ? styles.optionButtonActive : {}),
                  }}
                  onClick={() => updateSetting('colorblindMode', opt.value)}
                  aria-pressed={settings.colorblindMode === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reduced Motion */}
          <div style={styles.row}>
            <span style={styles.label}>Reduced Motion</span>
            <button
              style={{
                ...styles.toggleButton,
                background: settings.reducedMotion ? '#335533' : '#333355',
                borderColor: settings.reducedMotion ? '#44ff44' : '#666688',
              }}
              onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
              aria-pressed={settings.reducedMotion}
            >
              {settings.reducedMotion ? 'On' : 'Off'}
            </button>
          </div>

          {/* Text Size */}
          <div style={styles.row}>
            <span style={styles.label}>Text Size</span>
            <div style={styles.buttonGroup}>
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  style={{
                    ...styles.optionButton,
                    ...(settings.textSize === size ? styles.optionButtonActive : {}),
                  }}
                  onClick={() => updateSetting('textSize', size)}
                  aria-pressed={settings.textSize === size}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast */}
          <div style={styles.row}>
            <span style={styles.label}>High Contrast</span>
            <button
              style={{
                ...styles.toggleButton,
                background: settings.highContrast ? '#335533' : '#333355',
                borderColor: settings.highContrast ? '#44ff44' : '#666688',
              }}
              onClick={() => updateSetting('highContrast', !settings.highContrast)}
              aria-pressed={settings.highContrast}
            >
              {settings.highContrast ? 'On' : 'Off'}
            </button>
          </div>

          {/* Keyboard Navigation */}
          <div style={styles.row}>
            <span style={styles.label}>Keyboard Navigation</span>
            <button
              style={{
                ...styles.toggleButton,
                background: settings.keyboardNavigation ? '#335533' : '#333355',
                borderColor: settings.keyboardNavigation ? '#44ff44' : '#666688',
              }}
              onClick={() => updateSetting('keyboardNavigation', !settings.keyboardNavigation)}
              aria-pressed={settings.keyboardNavigation}
            >
              {settings.keyboardNavigation ? 'On' : 'Off'}
            </button>
          </div>

          {/* Screen Reader Hints */}
          <div style={styles.row}>
            <span style={styles.label}>Screen Reader Hints</span>
            <button
              style={{
                ...styles.toggleButton,
                background: settings.screenReaderHints ? '#335533' : '#333355',
                borderColor: settings.screenReaderHints ? '#44ff44' : '#666688',
              }}
              onClick={() => updateSetting('screenReaderHints', !settings.screenReaderHints)}
              aria-pressed={settings.screenReaderHints}
            >
              {settings.screenReaderHints ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.resetButton} onClick={resetDefaults}>
            Reset to Defaults
          </button>
          <button style={styles.backButton} onClick={onBack}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 20px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
  } as React.CSSProperties,
  content: {
    maxWidth: '600px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#00ff88',
    textAlign: 'center',
    margin: 0,
    textShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
    letterSpacing: '3px',
  },
  section: {
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '1px solid #333366',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#8888aa',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    margin: '0 0 4px 0',
    borderBottom: '1px solid #333355',
    paddingBottom: '8px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  label: {
    fontSize: '15px',
    color: '#ccccdd',
    fontWeight: 'bold',
    minWidth: '100px',
  },
  toggleButton: {
    padding: '6px 20px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffffff',
    cursor: 'pointer',
    minWidth: '70px',
    textAlign: 'center' as const,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  slider: {
    flex: 1,
    height: '8px',
    cursor: 'pointer',
    accentColor: '#00ff88',
    minHeight: '44px',
  },
  sliderValue: {
    fontSize: '13px',
    color: '#00ff88',
    fontWeight: 'bold',
    minWidth: '40px',
    textAlign: 'right' as const,
  },
  buttonGroup: {
    display: 'flex',
    gap: '6px',
  },
  optionButton: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #444466',
    background: '#222244',
    color: '#8888aa',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  optionButtonActive: {
    background: '#334455',
    borderColor: '#00aaff',
    color: '#00ccff',
    boxShadow: '0 0 8px rgba(0, 170, 255, 0.2)',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  resetButton: {
    background: 'transparent',
    border: '1px solid #555555',
    borderRadius: '10px',
    padding: '12px 24px',
    color: '#888888',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  backButton: {
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 30px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 204, 102, 0.3)',
  },
};
