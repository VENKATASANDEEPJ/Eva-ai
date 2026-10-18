/**
 * VoiceService — Hybrid STT strategy:
 *
 * 1. Try Web Speech API first (works in Chrome/Edge without any API key,
 *    but needs Google's servers — may fail on some networks).
 * 2. If Web Speech fails with "network" error, fall back to MediaRecorder
 *    + backend Whisper STT (needs OPENAI_API_KEY in backend).
 * 3. If both fail, the UI always has a visible text input so the user
 *    can type.
 *
 * The key insight: Web Speech API works fine on most networks including
 * home wifi. The "network" error usually means the browser can't reach
 * Google's speech servers — in that case we switch to Whisper.
 */

import { api } from "@/lib/api";

type StatusCallback = (status: "listening" | "idle") => void;
type TranscriptCallback = (text: string, isFinal: boolean) => void;
type LevelCallback = (level: number) => void;
type ErrorCallback = (error: string) => void;

// ── Web Speech API type shim ──────────────────────────────────────────────────
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  item(i: number): SpeechRecognitionAlternative;
  [i: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(i: number): SpeechRecognitionResult;
  [i: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
// ─────────────────────────────────────────────────────────────────────────────

export class VoiceService {
  private recognition: ISpeechRecognition | null = null;
  private useWhisperFallback = false;
  private isListeningFlag = false;

  // MediaRecorder (Whisper fallback)
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private recordStart = 0;

  private onStatus: StatusCallback = () => {};
  private onTranscript: TranscriptCallback = () => {};
  private onLevel: LevelCallback = () => {};
  private onError: ErrorCallback = () => {};

  setCallbacks(cb: {
    onStatus?: StatusCallback;
    onTranscript?: TranscriptCallback;
    onLevel?: LevelCallback;
    onError?: ErrorCallback;
  }) {
    if (cb.onStatus) this.onStatus = cb.onStatus;
    if (cb.onTranscript) this.onTranscript = cb.onTranscript;
    if (cb.onLevel) this.onLevel = cb.onLevel;
    if (cb.onError) this.onError = cb.onError;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async startListening(): Promise<void> {
    if (this.isListeningFlag) return;
    this.isListeningFlag = true;

    if (this.useWhisperFallback) {
      await this._startWhisper();
    } else {
      this._startWebSpeech();
    }
  }

  stopListening(): void {
    this.isListeningFlag = false;
    this._stopWebSpeech();
    this._stopWhisper();
    this.onLevel(0);
    this.onStatus("idle");
  }

  get supported(): boolean {
    // Always "supported" — worst case they type
    return true;
  }

  get hasWebSpeech(): boolean {
    const w = window as unknown as Record<string, unknown>;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  // ── Web Speech API ──────────────────────────────────────────────────────────

  private _startWebSpeech(): void {
    const w = window as unknown as Record<
      string,
      { new (): ISpeechRecognition }
    >;
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRec) {
      this.useWhisperFallback = true;
      this._startWhisper();
      return;
    }

    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.onStatus("listening");
    };

    this.recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening
      if (this.isListeningFlag && !this.useWhisperFallback) {
        try {
          this.recognition?.start();
        } catch {
          /* already restarting */
        }
      }
    };

    this.recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "",
        final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      if (final.trim()) this.onTranscript(final.trim(), true);
      else if (interim) this.onTranscript(interim.trim(), false);
    };

    this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "no-speech") return;
      if (e.error === "aborted") return;

      if (e.error === "network") {
        // Switch to Whisper and restart silently
        console.warn(
          "[VoiceService] Web Speech network error — switching to Whisper STT",
        );
        this.useWhisperFallback = true;
        this._stopWebSpeech();
        if (this.isListeningFlag) this._startWhisper();
        return;
      }

      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        this.isListeningFlag = false;
        this.onError(
          "Microphone access denied. Click the 🔒 in the address bar and allow microphone.",
        );
        this.onStatus("idle");
        return;
      }

      // Other errors — just restart
      setTimeout(() => {
        if (this.isListeningFlag && !this.useWhisperFallback) {
          try {
            this.recognition?.start();
          } catch {
            /* ignore */
          }
        }
      }, 500);
    };

    try {
      this.recognition.start();
    } catch {
      this.useWhisperFallback = true;
      this._startWhisper();
    }
  }

  private _stopWebSpeech(): void {
    try {
      this.recognition?.abort();
    } catch {
      /* ignore */
    }
    this.recognition = null;
  }

  // ── Whisper / MediaRecorder fallback ────────────────────────────────────────

  private async _startWhisper(): Promise<void> {
    if (!window.MediaRecorder) {
      this.onError(
        "Your browser does not support audio recording. Please use Chrome or Edge.",
      );
      this.onStatus("idle");
      this.isListeningFlag = false;
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      this.onError(
        "Microphone access denied. Allow microphone permission and try again.",
      );
      this.onStatus("idle");
      this.isListeningFlag = false;
      return;
    }

    // Level metering
    this.audioCtx = new AudioContext();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.7;
    this.audioCtx.createMediaStreamSource(this.stream).connect(this.analyser);
    this._startLevelMeter();
    this._whisperRecord();
  }

  private _whisperRecord(): void {
    if (!this.stream || !this.isListeningFlag) return;

    this.audioChunks = [];
    this.recordStart = Date.now();

    const mime =
      [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

    this.mediaRecorder = new MediaRecorder(
      this.stream,
      mime ? { mimeType: mime } : {},
    );
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => this._whisperSubmit();
    this.mediaRecorder.start(200);

    this.onStatus("listening");
    this._startSilenceDetector();

    // Hard limit 20s
    setTimeout(() => {
      if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop();
    }, 20000);
  }

  private _startLevelMeter(): void {
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.levelTimer = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      this.onLevel(Math.min(1, Math.sqrt(sum / data.length) * 5));
    }, 80);
  }

  private _startSilenceDetector(): void {
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    let hasSpeech = false;

    const interval = setInterval(() => {
      if (!this.analyser || !this.isListeningFlag) {
        clearInterval(interval);
        return;
      }
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);

      if (rms > 0.02) {
        hasSpeech = true;
        clearTimeout(this.silenceTimer!);
        this.silenceTimer = null;
      } else if (hasSpeech && !this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          clearInterval(interval);
          if (this.mediaRecorder?.state === "recording")
            this.mediaRecorder.stop();
        }, 1500);
      }
    }, 100);
  }

  private async _whisperSubmit(): Promise<void> {
    const elapsed = Date.now() - this.recordStart;
    if (elapsed < 500 || this.audioChunks.length === 0) {
      if (this.isListeningFlag) this._whisperRecord();
      return;
    }

    const mime = this._getMime();
    const blob = new Blob(this.audioChunks, { type: mime });
    this.audioChunks = [];

    try {
      const form = new FormData();
      const ext = mime.includes("ogg")
        ? "ogg"
        : mime.includes("mp4")
          ? "mp4"
          : "webm";
      form.append("audio", blob, `recording.${ext}`);
      const res = await api.post("/stt/transcribe", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const text: string = res.data?.data?.transcript ?? "";
      if (text.trim()) this.onTranscript(text.trim(), true);
    } catch (err: unknown) {
      // If STT endpoint returns 503 (no OpenAI key), tell user
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 503) {
        this.onError(
          "Add your OPENAI_API_KEY to backend/.env to enable voice. You can type messages instead.",
        );
        this.isListeningFlag = false;
        this._stopWhisper();
        this.onStatus("idle");
        return;
      }
    }

    if (this.isListeningFlag) this._whisperRecord();
  }

  private _getMime(): string {
    return (
      [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm"
    );
  }

  private _stopWhisper(): void {
    clearInterval(this.levelTimer!);
    this.levelTimer = null;
    clearTimeout(this.silenceTimer!);
    this.silenceTimer = null;
    try {
      this.mediaRecorder?.stop();
    } catch {
      /* ignore */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.analyser?.disconnect();
    this.audioCtx?.close();
    this.stream = null;
    this.analyser = null;
    this.audioCtx = null;
    this.mediaRecorder = null;
  }
}

export const voiceService = new VoiceService();
