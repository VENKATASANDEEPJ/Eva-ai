import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useUIStore } from '@/stores/uiStore'
import { voiceService } from '@/services/voiceService'
import { ttsService } from '@/services/ttsService'
import { chatApi } from '@/lib/api'
import type { Message } from '@/types'

export function useVoice() {
  const {
    status,
    activeSession,
    isRecording,
    transcript,
    setStatus,
    setIsRecording,
    setIsSpeaking,
    setIsProcessing,
    setAudioLevel,
    setTranscript,
    setInterimTranscript,
    addMessage,
    setEvaTyping,
    setCurrentEvaMessage,
  } = useSessionStore()

  // Keep a ref so callbacks always see the latest session without stale closures
  const activeSessionRef = useRef(activeSession)
  useEffect(() => { activeSessionRef.current = activeSession }, [activeSession])

  const { addToast } = useUIStore()
  const pendingTranscript = useRef('')

  // Initialize voice service callbacks
  useEffect(() => {
    voiceService.setCallbacks({
      onStatus: (s) => {
        if (s === 'listening') {
          setStatus('listening')
          setIsRecording(true)
        } else {
          setIsRecording(false)
        }
      },
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          pendingTranscript.current = text
          setTranscript(text)
          setInterimTranscript('')
        } else {
          setInterimTranscript(text)
        }
      },
      onLevel: (level) => setAudioLevel(level),
      onError: (err) => {
        addToast('error', 'Voice Error', err)
        setStatus('idle')
        setIsRecording(false)
      },
    })

    ttsService.setCallbacks({
      onStart: () => {
        setIsSpeaking(true)
        setStatus('speaking')
      },
      onEnd: () => {
        setIsSpeaking(false)
        // If we were in conversation mode, go back to listening
        if (activeSessionRef.current) {
          setStatus('listening')
        } else {
          setStatus('idle')
        }
      },
    })

    return () => {
      voiceService.stopListening()
      ttsService.stop()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit when final transcript arrives and we have a session
  useEffect(() => {
    if (transcript && activeSessionRef.current && status === 'listening') {
      const text = transcript
      setTranscript('')
      pendingTranscript.current = ''
      handleUserMessage(text)
    }
  }, [transcript]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUserMessage = useCallback(
    async (text: string) => {
      const session = activeSessionRef.current
      if (!session || !text.trim()) return

      // Stop listening while processing
      voiceService.stopListening()
      setStatus('thinking')
      setIsProcessing(true)

      // Add user message to UI immediately
      const userMsg: Message = {
        id: Math.random().toString(36).slice(2),
        sessionId: session.id,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }
      addMessage(userMsg)
      setEvaTyping(true)

      try {
        const response = await chatApi.sendMessage(session.id, text)
        const { evaMessage, corrections, vocabulary } = response.data.data

        setEvaTyping(false)

        // Add Eva's response
        const evaMsg: Message = {
          id: Math.random().toString(36).slice(2),
          sessionId: session.id,
          role: 'eva',
          content: evaMessage,
          timestamp: new Date().toISOString(),
          corrections: corrections || [],
          vocabulary: vocabulary || [],
        }
        addMessage(evaMsg)
        setCurrentEvaMessage(evaMessage)

        // Speak Eva's response
        setStatus('speaking')
        await ttsService.speak(evaMessage)

        // Resume listening
        setIsProcessing(false)
        await voiceService.startListening()
      } catch (err) {
        console.error('[useVoice] Error sending message:', err)
        setEvaTyping(false)
        setIsProcessing(false)
        setStatus('idle')
        addToast('error', 'Connection Error', 'Could not reach Eva. Please try again.')
      }
    },
    [addMessage, addToast, setCurrentEvaMessage, setEvaTyping, setIsProcessing, setStatus]
  )

  const startListening = useCallback(async () => {
    if (!voiceService.supported) {
      addToast('warning', 'Not Supported', 'Voice recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }
    await voiceService.startListening()
  }, [addToast])

  const stopListening = useCallback(() => {
    voiceService.stopListening()
    setStatus('idle')
    setIsRecording(false)
  }, [setIsRecording, setStatus])

  const sendTextMessage = useCallback(
    (text: string) => {
      handleUserMessage(text)
    },
    [handleUserMessage]
  )

  const stopSpeaking = useCallback(() => {
    ttsService.stop()
    setIsSpeaking(false)
    setStatus('idle')
  }, [setIsSpeaking, setStatus])

  return {
    status,
    isRecording,
    startListening,
    stopListening,
    sendTextMessage,
    stopSpeaking,
    isSupported: voiceService.supported,
  }
}
