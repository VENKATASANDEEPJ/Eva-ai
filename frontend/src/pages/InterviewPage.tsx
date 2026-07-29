import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase,
  Mic,
  MicOff,
  Square,
  ChevronRight,
  Award,
  Send,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { EvaCore } from '@/components/eva/EvaCore'
import { AudioVisualizer } from '@/components/eva/AudioVisualizer'
import { ScoreCard } from '@/components/ui/ScoreCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useVoice } from '@/hooks/useVoice'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { interviewApi, sessionsApi } from '@/lib/api'
import { interviewRoleLabel, cn } from '@/lib/utils'
import type { InterviewRole, InterviewReport, Message } from '@/types'

const roles: { id: InterviewRole; label: string; icon: string; tags: string[] }[] = [
  { id: 'software_engineer', label: 'Software Engineer', icon: '💻', tags: ['Algorithms', 'System Design', 'Coding'] },
  { id: 'frontend_developer', label: 'Frontend Developer', icon: '🎨', tags: ['React', 'CSS', 'Performance'] },
  { id: 'backend_developer', label: 'Backend Developer', icon: '⚙️', tags: ['APIs', 'Databases', 'Scalability'] },
  { id: 'fullstack_developer', label: 'Full Stack Developer', icon: '🔄', tags: ['Frontend', 'Backend', 'DevOps'] },
  { id: 'data_scientist', label: 'Data Scientist', icon: '📊', tags: ['ML', 'Statistics', 'Python'] },
  { id: 'hr', label: 'HR Interview', icon: '🤝', tags: ['Culture Fit', 'Motivation', 'Goals'] },
  { id: 'behavioral', label: 'Behavioral', icon: '🧠', tags: ['STAR Method', 'Soft Skills', 'Teamwork'] },
]

type Phase = 'setup' | 'active' | 'report'

export function InterviewPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [selectedRole, setSelectedRole] = useState<InterviewRole | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [report, setReport] = useState<InterviewReport | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  const { status, messages, audioLevel, isRecording, startSession, endSession } = useSessionStore()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const { startListening, stopListening, sendTextMessage, isSupported } = useVoice()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStart = async () => {
    if (!selectedRole) return
    setStarting(true)
    try {
      const res = await interviewApi.start(selectedRole)
      const data = res.data.data
      setSessionId(data.sessionId)

      // Also create a sessions record
      const sessRes = await sessionsApi.create({ mode: 'interview', interviewRole: selectedRole })
      startSession({
        ...sessRes.data.data,
        messages: [],
        mode: 'interview',
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        userId: user?.id ?? '',
      })

      setPhase('active')
      await startListening()
      addToast('success', 'Interview Started', `Good luck with your ${interviewRoleLabel(selectedRole)} interview!`)
    } catch {
      addToast('error', 'Error', 'Could not start interview. Please try again.')
    } finally {
      setStarting(false)
    }
  }

  const handleEndInterview = async () => {
    stopListening()
    setGeneratingReport(true)
    try {
      if (sessionId) {
        const res = await interviewApi.generateReport(sessionId)
        setReport(res.data.data)
        setReportOpen(true)
      }
      endSession()
      setPhase('report')
    } catch {
      addToast('error', 'Error', 'Could not generate report. Your session has been saved.')
      endSession()
      setPhase('setup')
    } finally {
      setGeneratingReport(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SetupPhase
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
              onStart={handleStart}
              starting={starting}
            />
          </motion.div>
        )}

        {phase === 'active' && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ActivePhase
              status={status}
              audioLevel={audioLevel}
              messages={messages}
              isRecording={isRecording}
              messagesEndRef={messagesEndRef}
              selectedRole={selectedRole}
              onToggleMic={() => isRecording ? stopListening() : startListening()}
              onSendText={sendTextMessage}
              onEnd={handleEndInterview}
              generatingReport={generatingReport}
              isSupported={isSupported}
            />
          </motion.div>
        )}

        {phase === 'report' && !reportOpen && (
          <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center py-16 space-y-4">
              <Award size={48} className="text-eva-accent mx-auto" />
              <h2 className="text-2xl font-bold text-eva-text">Interview Complete!</h2>
              <p className="text-eva-text-dim">Your performance report is ready.</p>
              <div className="flex gap-3 justify-center mt-6">
                <Button variant="primary" onClick={() => setReportOpen(true)} icon={<FileText size={16} />}>
                  View Report
                </Button>
                <Button variant="secondary" onClick={() => { setPhase('setup'); setSelectedRole(null) }}>
                  New Interview
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      {report && (
        <ReportModal report={report} isOpen={reportOpen} onClose={() => setReportOpen(false)} onNew={() => { setReportOpen(false); setPhase('setup'); setSelectedRole(null) }} />
      )}
    </div>
  )
}

// ─── Setup Phase ──────────────────────────────────────────────────────────────

function SetupPhase({
  selectedRole,
  onSelectRole,
  onStart,
  starting,
}: {
  selectedRole: InterviewRole | null
  onSelectRole: (r: InterviewRole) => void
  onStart: () => void
  starting: boolean
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-eva-text mb-1">Choose Interview Type</h2>
        <p className="text-sm text-eva-text-dim">Eva will conduct a realistic interview and provide detailed feedback.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {roles.map((role, i) => (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelectRole(role.id)}
            className={cn(
              'p-4 rounded-2xl border text-left transition-all duration-200',
              selectedRole === role.id
                ? 'border-eva-accent/60 bg-eva-accent/8 shadow-lg'
                : 'border-eva-border/50 hover:border-eva-border bg-eva-surface/50'
            )}
          >
            <div className="text-3xl mb-3">{role.icon}</div>
            <p className={cn('text-sm font-semibold mb-2', selectedRole === role.id ? 'text-eva-accent' : 'text-eva-text')}>
              {role.label}
            </p>
            <div className="flex flex-wrap gap-1">
              {role.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-eva-text-muted">{tag}</span>
              ))}
            </div>
          </motion.button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          size="lg"
          disabled={!selectedRole}
          onClick={onStart}
          loading={starting}
          icon={<Mic size={18} />}
        >
          Start Interview
        </Button>
        {selectedRole && (
          <p className="text-sm text-eva-text-dim">
            <span className="text-eva-accent">{interviewRoleLabel(selectedRole)}</span> selected
          </p>
        )}
      </div>

      <Card className="bg-eva-accent/5 border-eva-accent/20">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="text-eva-accent mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-eva-text mb-1">How it works</p>
            <ul className="text-eva-text-dim space-y-1 text-xs list-disc ml-4">
              <li>Eva asks realistic interview questions for your chosen role</li>
              <li>Answer naturally using voice or text</li>
              <li>After 5–10 questions, receive a detailed performance report</li>
              <li>Get scores, strengths, weaknesses, and improvement tips</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ─── Active Phase ─────────────────────────────────────────────────────────────

function ActivePhase({
  status, audioLevel, messages, isRecording, messagesEndRef,
  selectedRole, onToggleMic, onSendText, onEnd, generatingReport, isSupported
}: {
  status: import('@/types').SessionStatus
  audioLevel: number
  messages: Message[]
  isRecording: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
  selectedRole: InterviewRole | null
  onToggleMic: () => void
  onSendText: (t: string) => void
  onEnd: () => void
  generatingReport: boolean
  isSupported: boolean
}) {
  const [textInput, setTextInput] = useState('')

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
      {/* Eva panel */}
      <div className="flex flex-col items-center gap-5 lg:w-72 flex-shrink-0">
        <div className="glass-panel rounded-2xl p-6 w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-eva-text">
            <Briefcase size={16} className="text-eva-accent" />
            {selectedRole ? interviewRoleLabel(selectedRole) : 'Interview'}
          </div>
          <EvaCore status={status} audioLevel={audioLevel} size="md" />
          <AudioVisualizer audioLevel={audioLevel} status={status} />
          <div className="flex flex-col gap-2 w-full">
            <Button
              variant={isRecording ? 'danger' : 'primary'}
              className="w-full"
              onClick={onToggleMic}
              icon={isRecording ? <MicOff size={15} /> : <Mic size={15} />}
            >
              {isRecording ? 'Pause Mic' : 'Resume Mic'}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-eva-red hover:bg-eva-red/10"
              onClick={onEnd}
              loading={generatingReport}
              icon={<Square size={15} />}
            >
              {generatingReport ? 'Generating Report...' : 'End & Get Report'}
            </Button>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-3 w-full text-xs text-eva-text-muted text-center">
          Answer each question naturally. Take a moment to think before responding.
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <InterviewMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Text input */}
        {(!isSupported || true) && (
          <div className="border-t border-eva-border/30 p-3 flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && textInput.trim()) {
                  onSendText(textInput.trim())
                  setTextInput('')
                }
              }}
              placeholder="Type your answer (or use mic)..."
              className="flex-1 bg-eva-surface border border-eva-border rounded-xl px-3 py-2 text-sm text-eva-text placeholder:text-eva-text-muted focus:outline-none focus:border-eva-accent/50"
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!textInput.trim()}
              onClick={() => { if (textInput.trim()) { onSendText(textInput.trim()); setTextInput('') } }}
              icon={<Send size={14} />}
            >
              Answer
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function InterviewMessage({ message }: { message: Message }) {
  const isEva = message.role === 'eva'
  return (
    <div className={cn('flex gap-3', isEva ? '' : 'justify-end')}>
      {isEva && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5">
          E
        </div>
      )}
      <div className={cn(
        'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
        isEva
          ? 'bg-eva-panel border border-eva-border/50 text-eva-text rounded-tl-sm'
          : 'bg-eva-accent/15 border border-eva-accent/25 text-eva-text rounded-tr-sm'
      )}>
        {isEva && <Badge variant="accent" className="mb-2 text-[10px]">Eva</Badge>}
        <p>{message.content}</p>
      </div>
    </div>
  )
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function ReportModal({
  report,
  isOpen,
  onClose,
  onNew,
}: {
  report: InterviewReport
  isOpen: boolean
  onClose: () => void
  onNew: () => void
}) {
  const scores = report.scores
  const recommendationConfig = {
    strong_yes: { label: 'Strong Yes', color: 'text-eva-green', bg: 'bg-eva-green/10 border-eva-green/30' },
    yes: { label: 'Yes', color: 'text-eva-green', bg: 'bg-eva-green/10 border-eva-green/30' },
    maybe: { label: 'Maybe', color: 'text-eva-amber', bg: 'bg-eva-amber/10 border-eva-amber/30' },
    no: { label: 'Needs Work', color: 'text-eva-red', bg: 'bg-eva-red/10 border-eva-red/30' },
  }
  const rec = recommendationConfig[report.recommendation]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Interview Report" size="xl">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-eva-text-muted">{interviewRoleLabel(report.role)}</p>
            <p className="text-xs text-eva-text-muted mt-0.5">{new Date(report.generatedAt).toLocaleDateString()}</p>
          </div>
          <div className={cn('px-4 py-2 rounded-xl border text-sm font-semibold', rec.bg, rec.color)}>
            {rec.label}
          </div>
        </div>

        {/* Scores grid */}
        <div>
          <h3 className="text-sm font-semibold text-eva-text mb-4">Performance Scores</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-4 justify-items-center">
            <ScoreCard label="Grammar" score={scores.grammar} delay={0} />
            <ScoreCard label="Vocabulary" score={scores.vocabulary} delay={0.05} />
            <ScoreCard label="Fluency" score={scores.fluency} delay={0.1} />
            <ScoreCard label="Confidence" score={scores.confidence} delay={0.15} />
            <ScoreCard label="Communication" score={scores.communication} delay={0.2} />
            {scores.technical !== undefined && (
              <ScoreCard label="Technical" score={scores.technical} delay={0.25} />
            )}
            <ScoreCard label="Overall" score={scores.overall} delay={0.3} size="lg" />
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-eva-green/5 border border-eva-green/20">
            <h4 className="text-sm font-semibold text-eva-green mb-3 flex items-center gap-2">
              <span>✅</span> Strengths
            </h4>
            <ul className="space-y-1.5">
              {report.strengths.map((s, i) => (
                <li key={i} className="text-xs text-eva-text-dim flex items-start gap-2">
                  <ChevronRight size={11} className="text-eva-green mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-eva-red/5 border border-eva-red/20">
            <h4 className="text-sm font-semibold text-eva-amber mb-3 flex items-center gap-2">
              <span>⚠️</span> Areas to Improve
            </h4>
            <ul className="space-y-1.5">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-eva-text-dim flex items-start gap-2">
                  <ChevronRight size={11} className="text-eva-amber mt-0.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Suggestions */}
        <div className="p-4 rounded-xl bg-eva-accent/5 border border-eva-accent/20">
          <h4 className="text-sm font-semibold text-eva-accent mb-3">💡 Suggestions</h4>
          <ul className="space-y-1.5">
            {report.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-eva-text-dim flex items-start gap-2">
                <span className="text-eva-accent font-mono mt-0.5">{i + 1}.</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-xl bg-eva-panel border border-eva-border/50">
          <h4 className="text-sm font-semibold text-eva-text mb-2">Overall Summary</h4>
          <p className="text-sm text-eva-text-dim leading-relaxed">{report.overallSummary}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="primary" onClick={onNew} className="flex-1">New Interview</Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
