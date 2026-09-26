import type { ReactNode } from 'react'

/** On/off switch. `size="sm"` for nested rows. */
export function Toggle({
  checked,
  onChange,
  size = 'md',
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  size?: 'sm' | 'md'
  /** Accessible name when there is no visible label next to it. */
  label?: string
}) {
  const track = size === 'sm' ? 'w-8 h-4.5' : 'w-10 h-5.5'
  const knob = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'
  const shift = size === 'sm' ? 'translate-x-3.5' : 'translate-x-4.5'
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative ${track} rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-accent' : 'bg-surface-overlay'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 ${knob} rounded-full shadow transition-transform ${
          checked ? `bg-white ${shift}` : 'bg-foreground-subtle translate-x-0'
        }`}
      />
    </button>
  )
}

/** A row of mutually exclusive buttons. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2">
      {options.map(([val, label]) => (
        <button
          key={String(val)}
          onClick={() => onChange(val)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === val
              ? 'bg-accent text-black'
              : 'bg-surface-overlay text-foreground-muted hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** Small uppercase label with an optional value on the right. */
export function FieldLabel({ children, value }: { children: ReactNode; value?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{children}</p>
      {value !== undefined && <span className="text-xs text-foreground-subtle">{value}</span>}
    </div>
  )
}

/** Title + description on the left, a control on the right. */
export function SettingRow({
  title,
  description,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{title}</p>
        {description && <p className="text-xs text-foreground-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}
