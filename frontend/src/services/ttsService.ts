/**
 * TTSService — Text-to-Speech via OpenAI TTS API (backend proxy).
 * Falls back to Web Speech API for development without API keys.
 */

import { api } from "@/lib/api";

type OnStartCallback = () => void;
type OnEndCallback = () => void;

export class TTSService {
  private audio: HTMLAudioElement | null = null;
  private synth: SpeechSynthesis | null = null;
  private onStart: OnStartCallback = () => {};
  private onEnd: OnEndCallback = () => {};
  private useWebFallback = false;

  constructor() {
    this.synth = window.speechSynthesis || null;
  }

  setCallbacks(callbacks: {
    onStart?: OnStartCallback;
    onEnd?: OnEndCallback;
  }) {
    if (callbacks.onStart) this.onStart = callbacks.onStart;
    if (callbacks.onEnd) this.onEnd = callbacks.onEnd;
  }

  async speak(text: string, voice = "nova"): Promise<void> {
    this.stop();

    // Strip any residual Markdown before speaking — protects both OpenAI TTS
    // and the Web Speech API fallback from reading symbols aloud.

    const clean = text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*(.*?)\*\*/gs, "$1")
      .replace(/\*(.*?)\*/gs, "$1")
      .replace(/__(.*?)__/gs, "$1")
      .replace(/_(.*?)_/gs, "$1")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^\s*[-*•]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/[*#_~]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return;

    try {
      const response = await api.post(
        "/tts/generate",
        { text: clean, voice },
        { responseType: "blob" },
      );

      const blob = new Blob([response.data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      this.audio = new Audio(url);
      this.audio.onplay = () => this.onStart();
      this.audio.onended = () => {
        URL.revokeObjectURL(url);
        this.audio = null;
        this.onEnd();
      };
      this.audio.onerror = () => {
        URL.revokeObjectURL(url);
        this.audio = null;
        this.useWebFallback = true;
        this.speakWeb(clean);
      };

      await this.audio.play();
    } catch {
      this.useWebFallback = true;
      return this.speakWeb(clean);
    }
  }

  private speakWeb(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      // Try to use a natural-sounding voice
      const voices = this.synth.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Neural") ||
            v.name.includes("Samantha")),
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => this.onStart();
      utterance.onend = () => {
        this.onEnd();
        resolve();
      };
      utterance.onerror = () => resolve();

      this.synth.speak(utterance);
    });
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    if (this.synth?.speaking) {
      this.synth.cancel();
    }
  }

  get isSpeaking(): boolean {
    return !!(this.audio && !this.audio.paused) || !!this.synth?.speaking;
  }
}

export const ttsService = new TTSService();
