import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { SessionStatus } from '@/types'

interface AudioVisualizerProps {
  audioLevel: number
  status: SessionStatus
  bars?: number
}

export function AudioVisualizer({ audioLevel, status, bars = 32 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const barHeights = useRef<number[]>(new Array(bars).fill(0))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = canvas.width / bars - 2
      const isActive = status === 'listening' || status === 'speaking'
      const color = status === 'listening' ? '#22d3ee' : status === 'speaking' ? '#a855f7' : '#6366f1'

      for (let i = 0; i < bars; i++) {
        const target = isActive
          ? Math.max(4, audioLevel * canvas.height * (0.3 + Math.random() * 0.7))
          : 4
        barHeights.current[i] += (target - barHeights.current[i]) * 0.3

        const h = barHeights.current[i]
        const x = i * (barWidth + 2)
        const y = (canvas.height - h) / 2

        const gradient = ctx.createLinearGradient(x, y, x, y + h)
        gradient.addColorStop(0, `${color}33`)
        gradient.addColorStop(0.5, color)
        gradient.addColorStop(1, `${color}33`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, h, 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [audioLevel, status, bars])

  return (
    <motion.div
      animate={{ opacity: status === 'idle' || status === 'paused' ? 0.3 : 1 }}
      transition={{ duration: 0.3 }}
      className="w-full h-12"
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </motion.div>
  )
}
