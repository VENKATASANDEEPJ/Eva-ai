import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Briefcase, BookOpen, Clock, BarChart2, Search, Filter } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ScoreCard } from '@/components/ui/ScoreCard'
import { Modal } from '@/components/ui/Modal'
import { sessionsApi } from '@/lib/api'
import { formatDate, formatDuration, interviewRoleLabel, practiceTypeLabel, cn } from '@/lib/utils'
import type { ConversationSession, SessionMode } from '@/types'

const modeConfig: Record<SessionMode, { icon: React.ReactNode; label: string; color: string }> = {
  conversation: { icon: <MessageCircle size={14} />, label: 'Conversation', color: 'accent' as const },
  interview: { icon: <Briefcase size={14} />, label: 'Interview', color: 'purple' as const },
  practice: { icon: <BookOpen size={14} />, label: 'Practice', color: 'cyan' as const },
}

const mockSessions: ConversationSession[] = Array.from({ length: 12 }, (_, i) => ({
  id: `session-${i}`,
  userId: 'user-1',
  mode: (['conversation', 'interview', 'practice'] as SessionMode[])[i % 3],
  startedAt: new Date(Date.now() - i * 2 * 86400000).toISOString(),
  endedAt: new Date(Date.now() - i * 2 * 86400000 + 1800000).toISOString(),
  durationSeconds: 600 + Math.floor(Math.random() * 1800),
  messages: [],
  scores: {
    grammar: Math.floor(60 + Math.random() * 35),
    vocabulary: Math.floor(55 + Math.random() * 40),
    fluency: Math.floor(60 + Math.random() * 35),
    confidence: Math.floor(65 + Math.random() * 30),
    communication: Math.floor(60 + Math.random() * 35),
    pronunciation: Math.floor(55 + Math.random() * 40),
    overall: Math.floor(62 + Math.random() * 30),
  },
  feedback: {
    summary: 'Good practice session with clear improvements in fluency.',
    strengths: ['Natural conversation flow', 'Good vocabulary range'],
    improvements: ['Work on article usage', 'Practice complex tenses'],
    suggestions: ['Try debate practice for more challenging vocabulary'],
  },
  interviewRole: i % 3 === 1 ? 'software_engineer' : undefined,
  practiceType: i % 3 === 2 ? 'casual_conversation' : undefined,
}))

export function HistoryPage() {
  const [sessions, setSessions] = useState<ConversationSession[]>(mockSessions)
  const [loading, setLoading] = useState(false)
  const [filterMode, setFilterMode] = useState<SessionMode | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null)

  useEffect(() => {
    setLoading(true)
    sessionsApi
      .list()
      .then((res) => setSessions(res.data.data?.items ?? mockSessions))
      .catch(() => setSessions(mockSessions))
      .finally(() => setLoading(false))
  }, [])

  const filtered = sessions.filter((s) => {
    if (filterMode !== 'all' && s.mode !== filterMode) return false
    return true
  })

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-eva-text mb-1">Session History</h2>
        <p className="text-sm text-eva-text-dim">Review your past conversations and track progress over time.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-eva-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full bg-eva-surface border border-eva-border rounded-xl pl-9 pr-3 py-2 text-sm text-eva-text placeholder:text-eva-text-muted focus:outline-none focus:border-eva-accent/50"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'conversation', 'interview', 'practice'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                filterMode === mode
                  ? 'border-eva-accent/50 bg-eva-accent/10 text-eva-accent'
                  : 'border-eva-border/50 text-eva-text-muted hover:border-eva-border'
              )}
            >
              {mode === 'all' ? 'All' : modeConfig[mode as SessionMode].label}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session, i) => (
            <SessionCard
              key={session.id}
              session={session}
              delay={i * 0.04}
              onClick={() => setSelectedSession(session)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-eva-text-muted">
              <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No sessions found</p>
            </div>
          )}
        </div>
      )}

      {/* Session detail modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  )
}

function SessionCard({ session, delay, onClick }: { session: ConversationSession; delay: number; onClick: () => void }) {
  const cfg = modeConfig[session.mode]
  const overall = session.scores?.overall

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="w-full glass-panel rounded-2xl p-4 flex items-center gap-4 hover:border-eva-accent/30 transition-all text-left group"
    >
      {/* Mode icon */}
      <div className="w-10 h-10 rounded-xl bg-eva-surface flex items-center justify-center flex-shrink-0">
        <span className={cn('text-eva-text-muted', `text-eva-${cfg.color}`)}>
          {cfg.icon}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={cfg.color as 'accent' | 'purple' | 'cyan'}>{cfg.label}</Badge>
          {session.interviewRole && (
            <span className="text-xs text-eva-text-muted">{interviewRoleLabel(session.interviewRole)}</span>
          )}
          {session.practiceType && (
            <span className="text-xs text-eva-text-muted">{practiceTypeLabel(session.practiceType)}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-eva-text-muted">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDuration(session.durationSeconds)}
          </span>
          <span>{formatDate(session.startedAt)}</span>
        </div>
      </div>

      {/* Overall score */}
      {overall !== undefined && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className={cn('text-lg font-bold', overall >= 80 ? 'text-eva-green' : overall >= 60 ? 'text-eva-amber' : 'text-eva-red')}>
              {overall}
            </p>
            <p className="text-[10px] text-eva-text-muted">score</p>
          </div>
          <BarChart2 size={14} className="text-eva-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </motion.button>
  )
}

function SessionDetailModal({ session, isOpen, onClose }: { session: ConversationSession; isOpen: boolean; onClose: () => void }) {
  const cfg = modeConfig[session.mode]
  const scores = session.scores
  const feedback = session.feedback

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Session Details" size="lg">
      <div className="p-6 space-y-5">
        {/* Meta */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={cfg.color as 'accent' | 'purple' | 'cyan'}>{cfg.label}</Badge>
          <span className="text-xs text-eva-text-muted">{formatDate(session.startedAt)}</span>
          <span className="text-xs text-eva-text-muted flex items-center gap-1"><Clock size={10} /> {formatDuration(session.durationSeconds)}</span>
        </div>

        {/* Scores */}
        {scores && (
          <div>
            <h4 className="text-xs font-semibold text-eva-text-muted uppercase tracking-wider mb-3">Scores</h4>
            <div className="flex flex-wrap gap-5 justify-center">
              <ScoreCard label="Grammar" score={scores.grammar} delay={0} size="sm" />
              <ScoreCard label="Vocabulary" score={scores.vocabulary} delay={0.05} size="sm" />
              <ScoreCard label="Fluency" score={scores.fluency} delay={0.1} size="sm" />
              <ScoreCard label="Confidence" score={scores.confidence} delay={0.15} size="sm" />
              <ScoreCard label="Overall" score={scores.overall} delay={0.2} size="md" />
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-eva-surface/50 border border-eva-border/50">
              <p className="text-sm text-eva-text-dim">{feedback.summary}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-eva-green/5 border border-eva-green/20">
                <p className="text-xs font-semibold text-eva-green mb-2">Strengths</p>
                <ul className="space-y-1">
                  {feedback.strengths.map((s, i) => <li key={i} className="text-xs text-eva-text-dim">• {s}</li>)}
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-eva-amber/5 border border-eva-amber/20">
                <p className="text-xs font-semibold text-eva-amber mb-2">Improvements</p>
                <ul className="space-y-1">
                  {feedback.improvements.map((s, i) => <li key={i} className="text-xs text-eva-text-dim">• {s}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
