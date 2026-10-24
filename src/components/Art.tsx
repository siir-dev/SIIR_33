/* 3D art assets live in /public/3d (sliced from the SIIR asset sheet, transparent webp). */

export type Asset3D =
  | 'city'
  | 'astronaut-left'
  | 'astronaut-right'
  | 'planets'
  | 'pillar'
  | 'orb'
  | 'chart'
  | 'icon-eye'
  | 'icon-bars'
  | 'icon-doc'
  | 'icon-people'

const SIZE: Record<Asset3D, [number, number]> = {
  city: [507, 560],
  'astronaut-left': [327, 445],
  'astronaut-right': [354, 465],
  planets: [450, 336],
  pillar: [200, 577],
  orb: [355, 313],
  chart: [396, 417],
  'icon-eye': [112, 114],
  'icon-bars': [114, 114],
  'icon-doc': [112, 114],
  'icon-people': [114, 114],
}

export function Art3D({ name, className = '', eager = false }: { name: Asset3D; className?: string; eager?: boolean }) {
  const [width, height] = SIZE[name]
  return (
    <img
      className={`art3d ${className}`}
      src={`/3d/${name}.webp`}
      width={width}
      height={height}
      alt=""
      aria-hidden="true"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  )
}

const CRYSTALS: Asset3D[] = ['chart', 'astronaut-right', 'pillar']

export function Crystal({ variant }: { variant: number }) {
  const name = CRYSTALS[variant % CRYSTALS.length]
  return <Art3D name={name} className={`art-crystal art-crystal--${name}`} />
}
