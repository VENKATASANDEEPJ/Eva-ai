import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import {
  Flame,
  Trophy,
  BookOpen,
  Clock,
  TrendingUp,
  Star,
  Lock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { progressApi } from '@/lib/api'
import { cn, formatDuration } from '@/lib/utils'
import type { ProgressData, Achievement } from '@/types'

const mockProgress: ProgressData = {
  daily: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    speakingMinutes: Math.floor(10 + Math.random() * 30),
    sessionsCount: Math.floor(1 + Math.random() * 3),
    averageScore: Math.floor(65 + Math.random() * 30),
    wordsLearned: Math.floor(2 + Math.random() * 8),
  })),
  weekly: Array.from({ length: 8 }, (_, i) => ({
    weekStart: new Date(Date.now() - (7 - i) * 7 * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    weekEnd: '',
    totalMinutes: Math.floor(40 + Math.random() * 120),
    averageScore: Math.floor(65 + Math.random() * 25),
    improvement: Math.floor(-5 + Math.random() * 20),
    dominantMode: 'conversation' as const,
  })),
  vocabulary: {
    totalWords: 342,
    wordsThisWeek: 23,
    byDifficulty: { easy: 180, medium: 120, hard: 42 },
    recentWords: [],
  },
  grammar: {
    accuracy: 78,
    accuracyTrend: 5,
    commonMistakes: [
      { rule: 'Present Perfect vs Simple Past', count: 12, example: 'I have went → I went' },
      { rule: 'Articles (a/an/the)', count: 9, example: 'I went to store → I went to the store' },
      { rule: 'Subject-Verb Agreement', count: 7, example: 'She go → She goes' },
    ],
    recentCorrections: [],
  },
  achievements: [
    { id: '1', title: 'First Words', description: 'Complete your first session', icon: '🎯', earnedAt: new Date().toISOString(), progress: 1, target: 1, unlocked: true },
    { id: '2', title: '7-Day Streak', description: 'Practice 7 days in a row', icon: '🔥', progress: 4, target: 7, unlocked: false },
    { id: '3', title: 'Wordsmith', description: 'Learn 100 new words', icon: '📚', progress: 42, target: 100, unlocked: false },
    { id: '4', title: 'Interview Ready', description: 'Complete 5 mock interviews', icon: '💼', progress: 2, target: 5, unlocked: false },
    { id: '5', title: 'Grammar Guru', description: 'Achieve 90%+ grammar accuracy', icon: '✏️', progress: 78, target: 90, unlocked: false },
    { id: '6', title: 'Night Owl', description: 'Practice after 10 PM', icon: '🦉', earnedAt: new Date().toISOString(), progress: 1, target: 1, unlocked: true },
  ],
  streak: {
    current: 4,
    longest: 12,
    thisWeek: [true, true, true, true, false, false, false],
    lastActiveDate: new Date().toISOString(),
  },
}

const radarData = [
  { skill: 'Grammar', value: 78 },
  { skill: 'Vocabulary', value: 65 },
  { skill: 'Fluency', value: 71 },
  { skill: 'Pronunciation', value: 60 },
  { skill: 'Confidence', value: 82 },
  { skill: 'Communication', value: 74 },
]

export function DashboardPage() {
  const [data, setData] = useState<ProgressData>(mockProgress)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    progressApi
      .getOverview()
      .then((res) => setData(res.data.data))
      .catch(() => {/* use mock */})
      .finally(() => setLoading(false))
  }, [])

  const { streak, daily, weekly, vocabulary, grammar, achievements } = data

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBlock icon={<Flame size={18} className="text-eva-amber" />} label="Current Streak" value={`${streak.current} days`} sub={`Best: ${streak.longest}`} color="amber" delay={0} />
        <StatBlock icon={<Clock size={18} className="text-eva-cyan" />} label="Total Speaking" value={formatDuration(daily.reduce((a, d) => a + d.speakingMinutes, 0) * 60)} sub="all time" color="cyan" delay={0.05} />
        <StatBlock icon={<BookOpen size={18} className="text-eva-purple" />} label="Words Learned" value={vocabulary.totalWords.toString()} sub={`+${vocabulary.wordsThisWeek} this week`} color="purple" delay={0.1} />
        <StatBlock icon={<TrendingUp size={18} className="text-eva-green" />} label="Grammar Accuracy" value={`${grammar.accuracy}%`} sub={`+${grammar.accuracyTrend}% this week`} color="green" delay={0.15} />
      </div>

      {/* Weekly streak */}
      <Card delay={0.2}>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
          <div className="flex items-center gap-1 text-xs text-eva-amber">
            <Flame size={12} />
            {streak.current} day streak
          </div>
        </CardHeader>
        <div className="flex items-center gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                  streak.thisWeek[i]
                    ? 'bg-eva-amber text-white shadow-lg shadow-eva-amber/30'
                    : 'bg-eva-surface border border-eva-border/50 text-eva-text-muted'
                )}
              >
                {streak.thisWeek[i] ? '✓' : '·'}
              </div>
              <span className="text-[10px] text-eva-text-muted">{day}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Speaking time chart */}
        <Card delay={0.25}>
          <CardHeader>
            <CardTitle>Daily Speaking Time</CardTitle>
            <Badge variant="accent">14 days</Badge>
          </CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={daily} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="speakGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#818cf8' }}
              />
              <Area type="monotone" dataKey="speakingMinutes" stroke="#6366f1" strokeWidth={2} fill="url(#speakGrad)" name="Minutes" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Score trend */}
        <Card delay={0.3}>
          <CardHeader>
            <CardTitle>Score Trend</CardTitle>
            <Badge variant="success">Weekly avg</Badge>
          </CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="weekStart" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Bar dataKey="averageScore" fill="#10b981" radius={[4, 4, 0, 0]} name="Score" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Skills radar + grammar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar */}
        <Card delay={0.35}>
          <CardHeader>
            <CardTitle>Skill Profile</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: '#475569', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
              <Radar name="Skills" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Common mistakes */}
        <Card delay={0.4}>
          <CardHeader>
            <CardTitle>Grammar Focus Areas</CardTitle>
            <span className="text-xs text-eva-text-muted">{grammar.accuracy}% accuracy</span>
          </CardHeader>
          <div className="space-y-3">
            {grammar.commonMistakes.map((m, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-eva-text-dim">{m.rule}</span>
                  <span className="text-eva-text-muted">{m.count}x</span>
                </div>
                <div className="h-1.5 bg-eva-surface rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, m.count * 5)}%` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-eva-amber to-eva-red"
                  />
                </div>
                <p className="text-[10px] text-eva-text-muted font-mono">{m.example}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Vocabulary breakdown */}
      <Card delay={0.45}>
        <CardHeader>
          <CardTitle>Vocabulary Growth</CardTitle>
          <span className="text-xs text-eva-text-muted">{vocabulary.totalWords} total words</span>
        </CardHeader>
        <div className="flex items-center gap-6">
          {/* Bar */}
          <div className="flex-1 h-4 rounded-full overflow-hidden bg-eva-surface flex">
            {[
              { pct: (vocabulary.byDifficulty.easy / vocabulary.totalWords) * 100, color: 'bg-eva-green', label: 'Easy' },
              { pct: (vocabulary.byDifficulty.medium / vocabulary.totalWords) * 100, color: 'bg-eva-amber', label: 'Medium' },
              { pct: (vocabulary.byDifficulty.hard / vocabulary.totalWords) * 100, color: 'bg-eva-red', label: 'Hard' },
            ].map((seg) => (
              <motion.div
                key={seg.label}
                initial={{ width: 0 }}
                animate={{ width: `${seg.pct}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className={`h-full ${seg.color}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs flex-shrink-0">
            <LegendDot color="bg-eva-green" label={`Easy (${vocabulary.byDifficulty.easy})`} />
            <LegendDot color="bg-eva-amber" label={`Medium (${vocabulary.byDifficulty.medium})`} />
            <LegendDot color="bg-eva-red" label={`Hard (${vocabulary.byDifficulty.hard})`} />
          </div>
        </div>
      </Card>

      {/* Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-eva-amber" />
          <h2 className="text-sm font-semibold text-eva-text">Achievements</h2>
          <Badge variant="warning">{achievements.filter(a => a.unlocked).length}/{achievements.length}</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {achievements.map((a, i) => (
            <AchievementCard key={a.id} achievement={a} delay={i * 0.05} />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatBlock({ icon, label, value, sub, color, delay }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string; delay: number }) {
  const colors: Record<string, string> = {
    amber: 'bg-eva-amber/10 border-eva-amber/20',
    cyan: 'bg-eva-cyan/10 border-eva-cyan/20',
    purple: 'bg-eva-purple/10 border-eva-purple/20',
    green: 'bg-eva-green/10 border-eva-green/20',
  }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={cn('p-4 rounded-2xl border', colors[color])}>
      <div className="flex items-start justify-between mb-2">{icon}<Star size={12} className="text-eva-text-muted opacity-50" /></div>
      <p className="text-xl font-bold text-eva-text">{value}</p>
      <p className="text-xs text-eva-text-muted mt-0.5">{label}</p>
      <p className="text-[10px] text-eva-text-muted mt-0.5 opacity-70">{sub}</p>
    </motion.div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-eva-text-muted">{label}</span>
    </div>
  )
}

function AchievementCard({ achievement: a, delay }: { achievement: Achievement; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={cn(
        'flex flex-col items-center p-3 rounded-xl border text-center gap-1.5',
        a.unlocked
          ? 'border-eva-amber/30 bg-eva-amber/5'
          : 'border-eva-border/30 bg-eva-surface/30 opacity-60'
      )}
    >
      <div className="relative">
        <span className={cn('text-2xl', !a.unlocked && 'grayscale')}>{a.icon}</span>
        {!a.unlocked && <Lock size={10} className="absolute -bottom-1 -right-1 text-eva-text-muted" />}
      </div>
      <p className="text-[10px] font-medium text-eva-text leading-tight">{a.title}</p>
      {!a.unlocked && (
        <div className="w-full h-1 bg-eva-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-eva-accent rounded-full"
            style={{ width: `${(a.progress / a.target) * 100}%` }}
          />
        </div>
      )}
      {a.unlocked && <span className="text-[10px] text-eva-amber">✓ Earned</span>}
    </motion.div>
  )
}
