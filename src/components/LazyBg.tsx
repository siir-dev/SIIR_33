import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A section whose photographic background loads only when it is about to scroll into view.
 * CSS backgrounds are fetched as soon as the element is styled, even far below the fold, so three large
 * photos were competing with the hero on slow connections. The `bg-ready` class sets --bg-img.
 */
export function LazyBg({ className = '', id, children }: { className?: string; id?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setReady(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true)
          io.disconnect()
        }
      },
      { rootMargin: '700px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} id={id} className={`${className} ${ready ? 'bg-ready' : ''}`}>
      {children}
    </section>
  )
}
