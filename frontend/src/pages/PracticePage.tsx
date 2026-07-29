import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Square, Send, BookOpen, ArrowLeft } from 'lucide-react'
import { EvaCore } from '@/components/eva/EvaCore'
import { AudioVisualizer } from '@/components/eva/AudioVisualizer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useVoice } from '@/hooks/useVoice'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { sessionsApi } from '@/lib/api'
import { practiceTypeLabel, cn } from '@/lib/utils'
import type { PracticeType, Message } from '@/types'

const practiceTypes: {
  id: PracticeType
  label: string
  icon: string
  description: string
  skills: string[]
  color: string
}[] = [
  {
    id: 'casual_conversation',
    label: 'Casual Conversation',
    icon: '☕',
    description: 'Chat about everyday topics naturally',
    skills: ['Fluency', 'Vocabulary', 'Confidence'],
    color: 'from-blue-500/20 to-blue-600/5',
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    icon: '📖',
    description: 'Narrate stories and experiences',
    skills: ['Coherence', 'Vocabulary', 'Grammar'],
    color: 'from-purple-500/20 to-purple-600/5',
  },
  {
    id: 'public_speaking',
    label: 'Public Speaking',
    icon: '🎤',
    description: 'Practice speaking to an audience',
    skills: ['Confidence', 'Structure', 'Clarity'],
    color: 'from-rose-500/20 to-rose-600/5',
  },
  {
    id: 'debate_practice',
    label: 'Debate Practice',
    icon: '⚔️',
    description: 'Argue positions and counter arguments',
    skills: ['Argumentation', 'Vocabulary', 'Fluency'],
    color: 'from-orange-500/20 to-orange-600/5',
  },
  {
    id: 'office_english',
    label: 'Office English',
    icon: '🏢',
    description: 'Professional workplace communication',
    skills: ['Formal English', 'Emails', 'Meetings'],
    color: 'from-teal-500/20 to-teal-600/5',
  },
  {
    id: 'travel_english',
    label: 'Travel English',
    icon: '✈️',
    description: 'Navigate travel situations confidently',
    skills: ['Practical', 'Pronunciation', 'Fluency'],
    color: 'from-cyan-500/20 to-cyan-600/5',
  },
  {
    id: 'presentation_practice',
    label: 'Presentations',
    icon: '📊',
    description: 'Deliver compelling presentations',
    skills: ['Structure', 'Delivery', 'Clarity'],
    color: 'from-indigo-500/20 to-indigo-600/5',
  },
  {
    id: 'vocabulary_builder',
    label: 'Vocabulary Builder',
    icon: '📚',
    description: 'Expand your English vocabulary',
    skills: ['Word Range', 'Usage', 'Pronunciation'],
    color: 'from-amber-500/20 to-amber-600/5',
  },
  {
    id: 'grammar_practice',
    label: 'Grammar Practice',
    icon: '✏️',
    description: 'Master English grammar rules',
    skills: ['Accuracy', 'Tenses', 'Structure'],
    color: 'from-green-500/20 to-green-600/5',
  },
]

type Phase = 'select' | 'active'

export function PracticePage() {
  const [phase, setPhase] = useState<Phase>('select')
  const [selectedType, setSelectedType] = useState<PracticeType | null>(null)
  const [starting, setStarting] = useState(false)

  const { status, messages, audioLevel, isRecording, startSession, endSession, reset } = useSessionStore()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const { startListening, stopListening, sendTextMessage, isSupported } = useVoice()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStart = async (type: PracticeType) => {
    setSelectedType(type)
    setStarting(true)
    try {
      const res = await sessionsApi.create({ mode: 'practice', practiceType: type })
      startSession({
        ...res.data.data,
        messages: [],
        mode: 'practice',
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        userId: user?.id ?? '',
      })
      setPhase('active')
      await startListening()
      addToast('success', 'Practice Started', `Let's work on ${practiceTypeLabel(type)}!`)
    } catch {
      addToast('error', 'Error', 'Could not start practice session.')
    } finally {
      setStarting(false)
    }
  }

  const handleEnd = () => {
    stopListening()
    endSession()
    setPhase('select')
    setSelectedType(null)
    addToast('success', 'Session Complete', 'Great work! Keep it up.')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
      <AnimatePresence mode="wait">
        {phase === 'select' && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-eva-text mb-1">Daily Practice</h2>
              <p className="text-sm text-eva-text-dim">Choose a practice mode and Eva will guide you through it.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {practiceTypes.map((pt, i) => (
                <motion.button
                  key={pt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleStart(pt.id)}
                  disabled={starting}
                  className={cn(
                    'group relative overflow-hidden p-5 rounded-2xl border border-eva-border/50',
                    'bg-eva-surface/50 hover:border-eva-accent/40 transition-all duration-200 text-left',
                    'disabled:opacity-60 disabled:cursor-not-allowed'
                  )}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${pt.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="text-3xl mb-3">{pt.icon}</div>
                    <h3 className="text-sm font-semibold text-eva-text mb-1">{pt.label}</h3>
                    <p className="text-xs text-eva-text-muted mb-3 leading-relaxed">{pt.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {pt.skills.map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-eva-text-muted">{s}</span>
                      ))}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'active' && selectedType && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ActivePractice
              status={status}
              audioLevel={audioLevel}
              messages={messages}
              isRecording={isRecording}
              selectedType={selectedType}
              messagesEndRef={messagesEndRef}
              onToggleMic={() => isRecording ? stopListening() : startListening()}
              onSendText={sendTextMessage}
              onEnd={handleEnd}
              isSupported={isSupported}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActivePractice({
  status, audioLevel, messages, isRecording, selectedType,
  messagesEndRef, onToggleMic, onSendText, onEnd, isSupported
}: {
  status: import('@/types').SessionStatus
  audioLevel: number
  messages: Message[]
  isRecording: boolean
  selectedType: PracticeType
  messagesEndRef: React.RefObject<HTMLDivElement>
  onToggleMic: () => void
  onSendText: (t: string) => void
  onEnd: () => void
  isSupported: boolean
}) {
  const [textInput, setTextInput] = useState('')

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
      {/* Control panel */}
      <div className="flex flex-col items-center gap-4 lg:w-64 flex-shrink-0">
        <div className="glass-panel rounded-2xl p-5 w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-eva-text">
            <BookOpen size={15} className="text-eva-accent" />
            {practiceTypeLabel(selectedType)}
          </div>
          <EvaCore status={status} audioLevel={audioLevel} size="md" />
          <AudioVisualizer audioLevel={audioLevel} status={status} />
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
            icon={<Square size={15} />}
          >
            End Session
          </Button>
        </div>
        <Card className="w-full text-xs text-eva-text-muted">
          <p className="font-medium text-eva-text-dim mb-1">Practice Tips</p>
          <ul className="space-y-1 text-[11px]">
            <li>• Speak in complete sentences</li>
            <li>• Don't worry about mistakes</li>
            <li>• Ask Eva to slow down if needed</li>
            <li>• Request explanations anytime</li>
          </ul>
        </Card>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="text-4xl">{practiceTypes.find(p => p.id === selectedType)?.icon}</div>
              <p className="text-eva-text-dim text-sm font-medium">{practiceTypeLabel(selectedType)}</p>
              <p className="text-xs text-eva-text-muted">Eva will guide the session. Just start speaking!</p>
            </div>
          )}
          {messages.map((msg) => (
            <PracticeMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
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
            placeholder="Type or use mic to respond..."
            className="flex-1 bg-eva-surface border border-eva-border rounded-xl px-3 py-2 text-sm text-eva-text placeholder:text-eva-text-muted focus:outline-none focus:border-eva-accent/50"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!textInput.trim()}
            onClick={() => { if (textInput.trim()) { onSendText(textInput.trim()); setTextInput('') } }}
            icon={<Send size={14} />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

function PracticeMessage({ message }: { message: Message }) {
  const isEva = message.role === 'eva'
  const [showCorrections, setShowCorrections] = useState(false)
  const hasCorrections = (message.corrections?.length ?? 0) > 0

  return (
    <div className={cn('flex gap-2.5', isEva ? '' : 'justify-end')}>
      {isEva && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5">
          E
        </div>
      )}
      <div className="max-w-[80%] space-y-1.5">
        <div className={cn(
          'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
          isEva
            ? 'bg-eva-panel border border-eva-border/50 text-eva-text rounded-tl-sm'
            : 'bg-eva-accent/15 border border-eva-accent/25 text-eva-text rounded-tr-sm'
        )}>
          {message.content}
        </div>
        {hasCorrections && (
          <div>
            <button
              onClick={() => setShowCorrections(!showCorrections)}
              className="text-[10px] text-eva-amber flex items-center gap-1 ml-1"
            >
              {showCorrections ? '▲' : '▼'} {message.corrections!.length} correction{message.corrections!.length > 1 ? 's' : ''}
            </button>
            <AnimatePresence>
              {showCorrections && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  {message.corrections!.map((c, i) => (
                    <div key={i} className="mt-1 p-2 rounded-lg bg-eva-amber/5 border border-eva-amber/15 text-[11px]">
                      <span className="line-through text-eva-red/60">{c.original}</span>
                      <span className="text-eva-green mx-2">→ {c.corrected}</span>
                      <p className="text-eva-text-muted mt-0.5">{c.explanation}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
