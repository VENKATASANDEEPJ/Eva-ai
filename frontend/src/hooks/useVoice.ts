import { useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useUIStore } from "@/stores/uiStore";
import { voiceService } from "@/services/voiceService";
import { ttsService } from "@/services/ttsService";
import { chatApi } from "@/lib/api";
import type { Message } from "@/types";

export function useVoice() {
  const store = useSessionStore();
  const { addToast } = useUIStore();

  // Keep refs to everything so callbacks never go stale
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  });

  const processingRef = useRef(false);

  // ── Handle a user message (voice or text) ─────────────────────────────────
  const handleUserMessage = useCallback(
    async (text: string) => {
      const s = storeRef.current;
      const session = s.activeSession;

      if (!session || !text.trim()) return;
      if (processingRef.current) return; // prevent double-fire

      processingRef.current = true;
      voiceService.stopListening();
      s.setStatus("thinking");
      s.setIsProcessing(true);
      s.setTranscript("");
      s.setInterimTranscript("");

      // Show user message immediately
      const userMsg: Message = {
        id: Math.random().toString(36).slice(2) + Date.now(),
        sessionId: session.id,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };
      s.addMessage(userMsg);
      s.setEvaTyping(true);

      try {
        const response = await chatApi.sendMessage(session.id, text);
        const { evaMessage, corrections, vocabulary } = response.data.data;

        s.setEvaTyping(false);

        const evaMsg: Message = {
          id: Math.random().toString(36).slice(2) + Date.now(),
          sessionId: session.id,
          role: "eva",
          content: evaMessage,
          timestamp: new Date().toISOString(),
          corrections: corrections || [],
          vocabulary: vocabulary || [],
        };
        s.addMessage(evaMsg);
        s.setCurrentEvaMessage(evaMessage);

        // Speak Eva's response
        s.setStatus("speaking");
        await ttsService.speak(evaMessage);

        // Resume listening after Eva finishes speaking
        s.setIsProcessing(false);
        processingRef.current = false;
        if (storeRef.current.activeSession) {
          await voiceService.startListening();
        }
      } catch (err) {
        console.error("[useVoice] handleUserMessage error:", err);
        s.setEvaTyping(false);
        s.setIsProcessing(false);
        s.setStatus("idle");
        processingRef.current = false;
        addToast(
          "error",
          "Connection Error",
          "Could not reach Eva. Please try again.",
        );
      }
    },
    [addToast],
  );

  // ── Wire up voice service callbacks once ──────────────────────────────────
  useEffect(() => {
    voiceService.setCallbacks({
      onStatus: (status) => {
        const s = storeRef.current;
        if (status === "listening") {
          s.setStatus("listening");
          s.setIsRecording(true);
        } else {
          s.setIsRecording(false);
        }
      },

      // Called every time we get a final transcript
      onTranscript: (text, isFinal) => {
        const s = storeRef.current;
        if (!isFinal) {
          s.setInterimTranscript(text);
          return;
        }
        // Final transcript — clear interim and send immediately
        s.setInterimTranscript("");
        s.setTranscript("");
        if (text.trim() && !processingRef.current) {
          handleUserMessage(text.trim());
        }
      },

      onLevel: (level) => storeRef.current.setAudioLevel(level),

      onError: (err) => {
        addToast("error", "Voice Error", err);
        storeRef.current.setStatus("idle");
        storeRef.current.setIsRecording(false);
      },
    });

    ttsService.setCallbacks({
      onStart: () => {
        storeRef.current.setIsSpeaking(true);
        storeRef.current.setStatus("speaking");
      },
      onEnd: () => {
        storeRef.current.setIsSpeaking(false);
        if (storeRef.current.activeSession) {
          storeRef.current.setStatus("listening");
        } else {
          storeRef.current.setStatus("idle");
        }
      },
    });

    return () => {
      voiceService.stopListening();
      ttsService.stop();
    };
  }, [handleUserMessage]);

  // ── Public API ────────────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (!voiceService.supported) {
      addToast(
        "warning",
        "Not Supported",
        "Voice recognition needs Chrome or Edge.",
      );
      return;
    }
    processingRef.current = false;
    await voiceService.startListening();
  }, [addToast]);

  const stopListening = useCallback(() => {
    voiceService.stopListening();
    storeRef.current.setStatus("idle");
    storeRef.current.setIsRecording(false);
  }, []);

  const sendTextMessage = useCallback(
    (text: string) => {
      handleUserMessage(text);
    },
    [handleUserMessage],
  );

  const stopSpeaking = useCallback(() => {
    ttsService.stop();
    storeRef.current.setIsSpeaking(false);
    storeRef.current.setStatus("idle");
  }, []);

  return {
    status: store.status,
    isRecording: store.isRecording,
    startListening,
    stopListening,
    sendTextMessage,
    stopSpeaking,
    isSupported: voiceService.supported,
  };
}
