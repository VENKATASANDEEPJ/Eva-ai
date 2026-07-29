import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Square,
  Send,
  ChevronDown,
  Lightbulb,
  AlertCircle,
  BookOpen,
} from 'lucide-react'
import { EvaCore } from '@/components/eva/EvaCore'
import { AudioVisualizer } from '@/components/eva/AudioVisualizer'
import { useVoice } from '@/hooks/useVoice'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { sessionsApi } from '@/lib/api'
import { generateId, formatRelativeTime, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Message } from '@/types'

export function ConversationPage() {
  const {
    status,
    messages,
    audioLevel,
    isRecording,
    isSpeaking,
    isProcessing,
    evaTyping,
    activeSession,
    startSession,
    endSession,
    reset,
  } = useSessionStore()

  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const { startListening, stopListening, sendTextMessage, isSupported } = useVoice()

  const [sessionActive, setSessionActive] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [starting, setStarting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, evaTyping])

  const handleStartSession = async () => {
    setStarting(true)
    try {
      const res = await sessionsApi.create({ mode: 'conversation' })
      const session = res.data.data
      startSession({
        ...session,
        messages: [],
        mode: 'conversation',
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        userId: user?.id ?? '',
      })
      setSessionActive(true)
      await startListening()
      addToast('success', 'Session Started', 'Eva is listening. Start talking!')
    } catch {
      addToast('error', 'Error', 'Could not start session. Check your connection.')
    } finally {
      setStarting(false)
    }
  }

  const handleEndSession = async () => {
    stopListening()
    if (activeSession) {
      try {
        await sessionsApi.end(activeSession.id, Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000))
      } catch {
        // graceful
      }
    }
    endSession()
    setSessionActive(false)
    addToast('info', 'Session Ended', 'Great practice today!')
  }

  const handleSendText = () => {
    if (!textInput.trim() || !sessionActive) return
    sendTextMessage(textInput.trim())
    setTextInput('')
  }

  const toggleMic = async () => {
    if (isRecording) {
      stopListening()
    } else {
      await startListening()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionActive) {
        stopListening()
        reset()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden">
      {/* Left: Eva Core */}
      <div className="hidden lg:flex flex-col items-center justify-center w-72 xl:w-80 flex-shrink-0 border-r border-eva-border/30 bg-eva-surface/20 px-6 py-8 gap-6">
        <EvaCore status={status} audioLevel={audioLevel} size="lg" showLabel />

        <AudioVisualizer audioLevel={audioLevel} status={status} />

        {sessionActive ? (
          <div className="w-full space-y-3">
            <Button
              variant={isRecording ? 'danger' : 'primary'}
              className="w-full"
              onClick={toggleMic}
              icon={isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            >
              {isRecording ? 'Pause Mic' : 'Resume Mic'}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowTextInput(!showTextInput)}
              icon={<Send size={15} />}
            >
              Type Instead
            </Button>
            <Button
              variant="ghost"
              className="w-full text-eva-red hover:bg-eva-red/10"
              onClick={handleEndSession}
              icon={<Square size={15} />}
            >
              End Session
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleStartSession}
            loading={starting}
            icon={<Mic size={18} />}
          >
            {starting ? 'Starting...' : 'Start Talking'}
          </Button>
        )}

        {!isSupported && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-eva-amber/10 border border-eva-amber/20 text-xs text-eva-amber">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            <span>Voice recognition requires Chrome or Edge browser.</span>
          </div>
        )}
      </div>

      {/* Right: Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4">
          {messages.length === 0 && !sessionActive && (
            <WelcomeState onStart={handleStartSession} starting={starting} isSupported={isSupported} />
          )}

          {messages.length === 0 && sessionActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-3 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-eva-accent/10 flex items-center justify-center">
                <Mic size={28} className="text-eva-accent animate-pulse" />
              </div>
              <p className="text-eva-text-dim">Eva is listening...</p>
              <p className="text-xs text-eva-text-muted">Just start speaking naturally</p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {evaTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Mobile Eva Core strip */}
        <div className="lg:hidden flex items-center gap-4 px-4 py-3 border-t border-eva-border/30 bg-eva-surface/30">
          <EvaCore status={status} audioLevel={audioLevel} size="sm" showLabel={false} />
          <div className="flex-1">
            <AudioVisualizer audioLevel={audioLevel} status={status} bars={20} />
          </div>
          {sessionActive && (
            <button onClick={toggleMic} className={cn('p-3 rounded-xl', isRecording ? 'bg-eva-red/20 text-eva-red' : 'bg-eva-accent/20 text-eva-accent')}>
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>

        {/* Text input */}
        <AnimatePresence>
          {(showTextInput || !isSupported) && sessionActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-eva-border/30 bg-eva-surface/50 px-4 py-3"
            >
              <div className="flex gap-2 max-w-2xl mx-auto">
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendText()}
                  placeholder="Type your message..."
                  disabled={isProcessing || isSpeaking}
                  className="flex-1 bg-eva-surface border border-eva-border rounded-xl px-4 py-2.5 text-sm text-eva-text placeholder:text-eva-text-muted focus:outline-none focus:border-eva-accent/50 disabled:opacity-50"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendText}
                  disabled={!textInput.trim() || isProcessing}
                  icon={<Send size={15} />}
                >
                  Send
                </Button>
                <button
                  onClick={() => setShowTextInput(false)}
                  className="p-2.5 rounded-xl hover:bg-white/5 text-eva-text-muted transition-colors"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile start */}
        {!sessionActive && (
          <div className="lg:hidden border-t border-eva-border/30 p-4">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleStartSession}
              loading={starting}
              icon={<Mic size={18} />}
            >
              Start Talking to Eva
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isEva = message.role === 'eva'
  const [showDetails, setShowDetails] = useState(false)
  const hasCorrections = (message.corrections?.length ?? 0) > 0
  const hasVocab = (message.vocabulary?.length ?? 0) > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn('flex gap-3', isEva ? 'justify-start' : 'justify-end')}
    >
      {isEva && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-1">
          E
        </div>
      )}

      <div className={cn('max-w-[75%] space-y-2', isEva ? '' : 'items-end flex flex-col')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isEva
              ? 'bg-eva-panel border border-eva-border/50 text-eva-text rounded-tl-sm'
              : 'bg-eva-accent/20 border border-eva-accent/30 text-eva-text rounded-tr-sm'
          )}
        >
          {message.content}
        </div>

        <p className="text-[10px] text-eva-text-muted px-1">
          {formatRelativeTime(message.timestamp)}
        </p>

        {/* Grammar corrections */}
        {hasCorrections && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs text-eva-amber hover:text-eva-amber/80 transition-colors"
          >
            <AlertCircle size={11} />
            {message.corrections!.length} correction{message.corrections!.length > 1 ? 's' : ''}
          </button>
        )}

        {hasVocab && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs text-eva-cyan hover:text-eva-cyan/80 transition-colors"
          >
            <BookOpen size={11} />
            {message.vocabulary!.length} new word{message.vocabulary!.length > 1 ? 's' : ''}
          </button>
        )}

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {message.corrections?.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-eva-amber/5 border border-eva-amber/20 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="line-through text-eva-red/70">{c.original}</span>
                    <span className="text-eva-green">→ {c.corrected}</span>
                  </div>
                  <p className="text-eva-text-muted">{c.explanation}</p>
                </div>
              ))}
              {message.vocabulary?.map((v, i) => (
                <div key={i} className="p-3 rounded-xl bg-eva-cyan/5 border border-eva-cyan/20 text-xs space-y-1">
                  <p className="font-semibold text-eva-cyan">{v.word}</p>
                  <p className="text-eva-text-dim">{v.definition}</p>
                  <p className="italic text-eva-text-muted">"{v.example}"</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3 items-end"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
        E
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-eva-panel border border-eva-border/50">
        <div className="flex items-center gap-1.5">
          {[0, 0.2, 0.4].map((d) => (
            <motion.div
              key={d}
              className="w-1.5 h-1.5 rounded-full bg-eva-accent"
              animate={{ y: [-2, 2, -2] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: d }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Welcome State ────────────────────────────────────────────────────────────

function WelcomeState({
  onStart,
  starting,
  isSupported,
}: {
  onStart: () => void
  starting: boolean
  isSupported: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-6 px-4"
    >
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-eva-text">Talk to Eva</h2>
        <p className="text-eva-text-dim max-w-md mx-auto leading-relaxed">
          Eva is your personal AI communication mentor. She'll listen, respond naturally, and help you improve your English through real conversation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg w-full">
        {[
          { icon: '🎤', label: 'Speak naturally', desc: 'No need to script yourself' },
          { icon: '✍️', label: 'Get corrections', desc: 'Polite, contextual feedback' },
          { icon: '📈', label: 'Build fluency', desc: 'Every conversation counts' },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-xl bg-white/3 border border-eva-border/30 text-xs">
            <div className="text-2xl mb-2">{item.icon}</div>
            <p className="font-medium text-eva-text">{item.label}</p>
            <p className="text-eva-text-muted mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="lg:hidden">
        <Button
          variant="primary"
          size="lg"
          onClick={onStart}
          loading={starting}
          icon={<Mic size={20} />}
        >
          Start Talking
        </Button>
      </div>

      {!isSupported && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-eva-amber/10 border border-eva-amber/20 text-sm text-eva-amber max-w-sm">
          <Lightbulb size={14} />
          <span>Use Chrome or Edge for the best voice experience.</span>
        </div>
      )}

      <p className="text-xs text-eva-text-muted">
        Eva remembers context within sessions and grows smarter as you practice.
      </p>
    </motion.div>
  )
}
