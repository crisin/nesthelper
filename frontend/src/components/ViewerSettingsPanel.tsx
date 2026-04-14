import { useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import type {
  ViewerSettings,
  ViewerSettingsSetter,
  ViewerFont,
  ViewerSpacing,
  ViewerThemeKey,
  ViewerBgMode,
} from '../hooks/useViewerSettings'
import {
  VIEWER_THEMES,
  VIEWER_FONTS,
  VIEWER_SPACINGS,
} from '../hooks/useViewerSettings'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ViewerSettingsPanelProps {
  s:           ViewerSettings
  set:         ViewerSettingsSetter
  reset:       () => void
  imgUrl?:     string | null
  /** True when the panel sits over a blurred cover/ambient background */
  isOverlay:   boolean
  borderColor: string
}

type Tab = 'text' | 'bg' | 'effects'

// ─── Component ────────────────────────────────────────────────────────────────

export default function ViewerSettingsPanel({
  s, set, reset, imgUrl, isOverlay, borderColor,
}: ViewerSettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('text')

  // ── Style helpers ────────────────────────────────────────────────────────

  const panelText  = isOverlay ? '#fff'                       : 'inherit'
  const labelStyle = { color: panelText, opacity: 0.38 } as const

  function chipStyle(active: boolean): React.CSSProperties {
    if (active) return isOverlay
      ? { background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.35)', opacity: 1, color: panelText }
      : { background: 'var(--color-surface-overlay)', borderColor, opacity: 1 }
    return { background: 'transparent', borderColor: 'transparent', opacity: 0.5, color: panelText }
  }

  function sliderRow(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (n: number) => void,
    display?: string,
  ) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest w-20 flex-shrink-0" style={labelStyle}>
          {label}
        </span>
        <div className="flex items-center gap-2.5 flex-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 h-0.5 accent-current cursor-pointer"
          />
          <span className="text-[11px] tabular-nums w-10 text-right" style={{ opacity: 0.5, color: panelText }}>
            {display ?? value}
          </span>
        </div>
      </div>
    )
  }

  // ── Tab nav ──────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'text',    label: 'Schrift'      },
    { key: 'bg',      label: 'Hintergrund'  },
    { key: 'effects', label: 'Effekte'      },
  ]

  function tabStyle(t: Tab): React.CSSProperties {
    const active = tab === t
    return isOverlay
      ? {
          color: active ? '#fff' : 'rgba(255,255,255,0.45)',
          borderBottom: active ? '2px solid rgba(255,255,255,0.7)' : '2px solid transparent',
        }
      : {
          color: active ? 'var(--color-foreground)' : 'var(--color-foreground-muted)',
          borderBottom: active ? `2px solid ${borderColor}` : '2px solid transparent',
        }
  }

  // ── Custom color picker helper ────────────────────────────────────────────

  const pickerBg   = s.customBg   || VIEWER_THEMES[s.theme].bg   || '#f9f9f7'
  const pickerText = s.customText || VIEWER_THEMES[s.theme].text || '#0e0e0e'

  function ColorPicker({
    label, value, pickerValue, settingKey,
  }: {
    label: string
    value: string
    pickerValue: string
    settingKey: 'customBg' | 'customText'
  }) {
    return (
      <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ opacity: 0.75, color: panelText }}>
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => set(settingKey, e.target.value)}
          className="w-5 h-5 rounded-full cursor-pointer p-0 border-0 flex-shrink-0"
        />
        {label}
        {value && (
          <button
            onClick={() => set(settingKey, '')}
            className="opacity-50 hover:opacity-100 transition-opacity"
            title="Zurücksetzen"
          >
            <X size={10} strokeWidth={2} />
          </button>
        )}
      </label>
    )
  }

  // ── Tab: Text ────────────────────────────────────────────────────────────

  function TextTab() {
    return (
      <div className="space-y-3.5">
        {/* Font family */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest w-20 flex-shrink-0" style={labelStyle}>Schrift</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(VIEWER_FONTS) as ViewerFont[]).map((key) => (
              <button
                key={key}
                onClick={() => set('font', key)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                style={{ ...chipStyle(s.font === key), fontFamily: VIEWER_FONTS[key].stack }}
              >
                {VIEWER_FONTS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Font size */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest w-20 flex-shrink-0" style={labelStyle}>Größe</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => set('fontSize', Math.max(0.65, +(s.fontSize - 0.1).toFixed(2)))}
              disabled={s.fontSize <= 0.65}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold disabled:opacity-25 transition-opacity hover:opacity-80"
              style={{ color: panelText }}
            >
              A−
            </button>
            <button
              onClick={() => set('fontSize', 1)}
              className="px-1.5 h-7 flex items-center text-[11px] tabular-nums min-w-[38px] justify-center rounded-lg"
              style={{ opacity: 0.5, color: panelText }}
            >
              {Math.round(s.fontSize * 100)}%
            </button>
            <button
              onClick={() => set('fontSize', Math.min(2.5, +(s.fontSize + 0.1).toFixed(2)))}
              disabled={s.fontSize >= 2.5}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold disabled:opacity-25 transition-opacity hover:opacity-80"
              style={{ color: panelText }}
            >
              A+
            </button>
          </div>
        </div>

        {/* Font weight */}
        {sliderRow('Stärke', s.fontWeight, 100, 900, 100, (v) => set('fontWeight', v), String(s.fontWeight))}

        {/* Spacing */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest w-20 flex-shrink-0" style={labelStyle}>Abstand</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(VIEWER_SPACINGS) as ViewerSpacing[]).map((key) => (
              <button
                key={key}
                onClick={() => set('spacing', key)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                style={chipStyle(s.spacing === key)}
              >
                {VIEWER_SPACINGS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Text align */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest w-20 flex-shrink-0" style={labelStyle}>Ausricht.</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => set('textAlign', 'left')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
              style={chipStyle(s.textAlign === 'left')}
            >
              Links
            </button>
            <button
              onClick={() => set('textAlign', 'center')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
              style={chipStyle(s.textAlign === 'center')}
            >
              Zentriert
            </button>
          </div>
        </div>

        {/* Letter spacing */}
        {sliderRow(
          'Buchst.-abst.',
          s.letterSpacing,
          0, 0.12, 0.01,
          (v) => set('letterSpacing', v),
          s.letterSpacing === 0 ? 'Normal' : `+${(s.letterSpacing * 100).toFixed(0)}`,
        )}
      </div>
    )
  }

  // ── Tab: Background ──────────────────────────────────────────────────────

  function BgTab() {
    const bgModes: { key: ViewerBgMode; label: string; disabled?: boolean }[] = [
      { key: 'solid',   label: 'Einfarbig' },
      { key: 'cover',   label: 'Coverbild', disabled: !imgUrl },
      { key: 'ambient', label: 'Ambient',   disabled: !imgUrl },
    ]

    return (
      <div className="space-y-3.5">
        {/* Mode picker */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest w-20 flex-shrink-0" style={labelStyle}>Modus</span>
          <div className="flex flex-wrap gap-1.5">
            {bgModes.map(({ key, label, disabled }) => (
              <button
                key={key}
                onClick={() => !disabled && set('bgMode', key)}
                disabled={disabled}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border disabled:opacity-25"
                style={chipStyle(s.bgMode === key)}
                title={disabled ? 'Kein Coverbild verfügbar' : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Solid mode: theme + custom colors */}
        {s.bgMode === 'solid' && (
          <>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-20 flex-shrink-0" style={labelStyle}>Thema</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VIEWER_THEMES) as ViewerThemeKey[]).map((key) => {
                  const t = VIEWER_THEMES[key]
                  return (
                    <button
                      key={key}
                      onClick={() => set('theme', key)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                      style={chipStyle(s.theme === key)}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 border"
                        style={{
                          background: key === 'auto'
                            ? 'conic-gradient(#e0e0e0 180deg, #1a1a1a 180deg)'
                            : t.swatch,
                          borderColor: key === 'auto' ? 'var(--color-edge)' : t.swatch + 'cc',
                        }}
                      />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-20 flex-shrink-0" style={labelStyle}>Farben</span>
              <div className="flex items-center gap-4">
                <ColorPicker label="BG"   value={s.customBg}   pickerValue={pickerBg}   settingKey="customBg"   />
                <ColorPicker label="Text" value={s.customText} pickerValue={pickerText} settingKey="customText" />
              </div>
            </div>
          </>
        )}

        {/* Cover/Ambient mode: blur + dim */}
        {s.bgMode !== 'solid' && (
          <>
            {sliderRow(
              'Unschärfe',
              s.bgBlur,
              0, 48, 1,
              (v) => set('bgBlur', v),
              `${s.bgBlur}px`,
            )}
            {sliderRow(
              s.bgMode === 'cover' ? 'Abdunkeln' : 'Stärke',
              s.bgDim,
              0, 0.95, 0.05,
              (v) => set('bgDim', v),
              `${Math.round(s.bgDim * 100)}%`,
            )}
            {/* Text color override */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-20 flex-shrink-0" style={labelStyle}>Text</span>
              <ColorPicker label="Farbe" value={s.customText} pickerValue={pickerText} settingKey="customText" />
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Tab: Effects ─────────────────────────────────────────────────────────

  function EffectsTab() {
    function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
      return (
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs" style={{ color: panelText, opacity: 0.8 }}>{label}</span>
          <button
            onClick={() => onChange(!value)}
            className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
            style={{
              background: value
                ? (isOverlay ? 'rgba(255,255,255,0.7)' : borderColor)
                : (isOverlay ? 'rgba(255,255,255,0.15)' : 'var(--color-surface-overlay)'),
            }}
            role="switch"
            aria-checked={value}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
              style={{
                background: value
                  ? (isOverlay ? '#000' : 'var(--color-foreground)')
                  : (isOverlay ? 'rgba(255,255,255,0.5)' : 'var(--color-foreground-muted)'),
                transform: value ? 'translateX(16px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-3.5">
        {sliderRow(
          'Inaktiv-Opazität',
          s.inactiveOpacity,
          0, 1, 0.05,
          (v) => set('inactiveOpacity', v),
          `${Math.round(s.inactiveOpacity * 100)}%`,
        )}
        <ToggleRow
          label="Leuchten auf aktiver Zeile"
          value={s.activeGlow}
          onChange={(v) => set('activeGlow', v)}
        />
        <ToggleRow
          label="Abschnitts-Labels anzeigen"
          value={s.showSections}
          onChange={(v) => set('showSections', v)}
        />
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* Tab nav */}
      <div className="flex items-center gap-0 border-b mb-3.5" style={{ borderColor: isOverlay ? 'rgba(255,255,255,0.15)' : borderColor }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-3 py-2 text-[11px] font-semibold transition-colors"
            style={tabStyle(key)}
          >
            {label}
          </button>
        ))}
        {/* Reset button */}
        <button
          onClick={reset}
          className="ml-auto px-2 py-2 transition-opacity hover:opacity-100"
          style={{ opacity: 0.3, color: panelText }}
          title="Einstellungen zurücksetzen"
        >
          <RotateCcw size={11} strokeWidth={2} />
        </button>
      </div>

      {/* Tab content */}
      {tab === 'text'    && <TextTab />}
      {tab === 'bg'      && <BgTab />}
      {tab === 'effects' && <EffectsTab />}
    </div>
  )
}
