import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'

export interface Option<T extends string> {
  value: T
  label: string
}

/** Listbox that matches the site instead of the browser's native dropdown. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  const current = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const choose = (i: number) => {
    onChange(options[i].value)
    setOpen(false)
    root.current?.querySelector('button')?.focus()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return setOpen(false)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setActive(options.findIndex((o) => o.value === value))
        return setOpen(true)
      }
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    }
    if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault()
      choose(active)
    }
  }

  return (
    <div className={`sel ${className}`} ref={root} onKeyDown={onKey}>
      <button
        type="button"
        className="sel-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setActive(options.findIndex((o) => o.value === value))
          setOpen((o) => !o)
        }}
      >
        <span className="sr-only">{label}: </span>
        <span>{current.label}</span>
        <CaretDown size={12} weight="bold" />
      </button>
      {open && (
        <ul className="sel-list" id={id} role="listbox" aria-label={label}>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={i === active ? 'is-active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(i)
              }}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={14} weight="bold" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
