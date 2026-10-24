/** Official SIIR lockup: symbol plus wordmark (public/logo.webp, transparent, 900x277). */
export function Logo({ height = 34 }: { height?: number }) {
  return <img className="logo" src="/logo.webp" width={Math.round((height * 900) / 277)} height={height} alt="SIIR" decoding="async" />
}

/** Symbol only, for tight spaces (public/logo-symbol.webp, 256x256). */
export function LogoMark({ size = 32 }: { size?: number }) {
  return <img className="logo-mark" src="/logo-symbol.webp" width={size} height={size} alt="SIIR" decoding="async" />
}
