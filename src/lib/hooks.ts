import { useEffect, useRef, useState } from 'react'

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true })
  useEffect(() => {
    let live = true
    setState({ loading: true })
    load().then(
      (data) => live && setState({ data, loading: false }),
      (e: Error) => live && setState({ error: e.message, loading: false }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

function setMeta(selector: string, attr: string, value: string, create?: () => Element) {
  let el = document.head.querySelector(selector)
  if (!el && create) {
    el = create()
    document.head.appendChild(el)
  }
  el?.setAttribute(attr, value)
}

/** Keeps title, description, canonical and share tags in step with the route. */
export function usePageMeta(title: string, description: string, opts: { noindex?: boolean } = {}) {
  const { noindex = false } = opts
  useEffect(() => {
    document.title = title
    const url = `${window.location.origin}${window.location.pathname}`
    const make = (tag: string, attrs: Record<string, string>) => () => {
      const el = document.createElement(tag)
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
      return el
    }
    setMeta('meta[name="description"]', 'content', description)
    setMeta('link[rel="canonical"]', 'href', url, make('link', { rel: 'canonical' }))
    setMeta('meta[property="og:url"]', 'content', url, make('meta', { property: 'og:url' }))
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[name="twitter:title"]', 'content', title)
    setMeta('meta[name="twitter:description"]', 'content', description)
    const robots = document.head.querySelector('meta[name="robots"]')
    if (noindex) setMeta('meta[name="robots"]', 'content', 'noindex', make('meta', { name: 'robots' }))
    else robots?.remove()
  }, [title, description, noindex])
}

/** 0..1 progress of an element travelling through the viewport. */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setProgress(1)
      return
    }
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = (vh * 0.85 - r.top) / (vh * 0.55 + r.height * 0.5)
      setProgress(Math.min(1, Math.max(0, p)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return [ref, progress] as const
}

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, shown] as const
}
