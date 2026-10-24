import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react'

export function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}

export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
    if (e.defaultPrevented || modified || href.startsWith('http') || rest.target === '_blank') return
    e.preventDefault()
    const [path, hash] = href.split('#')
    if (path && path !== window.location.pathname) navigate(path)
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 30)
  }
  return <a href={href} onClick={handle} {...rest} />
}
