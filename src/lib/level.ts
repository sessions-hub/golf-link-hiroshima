export const LEVELS = [
  { level: 1, name: 'PUBLIC',   minPt: 0    },
  { level: 2, name: 'MEMBER',   minPt: 250  },
  { level: 3, name: 'CLASSIC',  minPt: 500  },
  { level: 4, name: 'CHAMPION', minPt: 2000 },
  { level: 5, name: 'LEGEND',   minPt: 5000 },
] as const

export interface LevelInfo {
  level: number
  name: string
  next: { level: number; name: string; minPt: number } | null
  progress: number
  ptToNext: number
}

export function getLevelInfo(points: number): LevelInfo {
  let current: typeof LEVELS[number] = LEVELS[0]
  for (const lv of LEVELS) {
    if (points >= lv.minPt) current = lv
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null
  const progress = next
    ? Math.min(1, (points - current.minPt) / (next.minPt - current.minPt))
    : 1
  const ptToNext = next ? next.minPt - points : 0
  return { level: current.level, name: current.name, next, progress, ptToNext }
}
