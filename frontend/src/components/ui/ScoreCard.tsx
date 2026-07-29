import { motion } from 'framer-motion'
import { cn, scoreToColor } from '@/lib/utils'

interface ScoreCardProps {
  label: string
  score: number
  icon?: React.ReactNode
  delay?: number
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreCard({ label, score, icon, delay = 0, size = 'md' }: ScoreCardProps) {
  const colorClass = scoreToColor(score)

  const sizes = {
    sm: { text: 'text-xl', label: 'text-xs', ring: 52, stroke: 4 },
    md: { text: 'text-2xl', label: 'text-xs', ring: 64, stroke: 5 },
    lg: { text: 'text-3xl', label: 'text-sm', ring: 80, stroke: 6 },
  }

  const s = sizes[size]
  const radius = (s.ring / 2) - s.stroke * 1.5
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative" style={{ width: s.ring, height: s.ring }}>
        <svg width={s.ring} height={s.ring} className="-rotate-90">
          <circle
            cx={s.ring / 2}
            cy={s.ring / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={s.stroke}
          />
          <motion.circle
            cx={s.ring / 2}
            cy={s.ring / 2}
            r={radius}
            fill="none"
            stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, delay: delay + 0.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon && <div className="text-eva-text-muted mb-0.5">{icon}</div>}
          <span className={cn('font-bold leading-none', s.text, colorClass)}>{score}</span>
        </div>
      </div>
      <span className={cn('text-eva-text-dim text-center', s.label)}>{label}</span>
    </motion.div>
  )
}
