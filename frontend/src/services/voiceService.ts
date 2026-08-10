/**
 * VoiceService — Handles microphone capture, Web Speech API recognition,
 * and audio level metering. Architecture allows swapping to Whisper STT
 * or OpenAI Realtime API via the backend proxy.
 */

// ── Web Speech API type declarations (not in all TS lib versions) ─────────────
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
declare let SpeechRecognition: { new (): ISpeechRecognition };
declare let webkitSpeechRecognition: { new (): ISpeechRecognition };
// ─────────────────────────────────────────────────────────────────────────────

type StatusCallback = (status: "listening" | "idle") => void;
type TranscriptCallback = (text: string, isFinal: boolean) => void;
type LevelCallback = (level: number) => void;
type ErrorCallback = (error: string) => void;

export class VoiceService {
  private recognition: ISpeechRecognition | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationFrame: number = 0;
  private isListening = false;

  private onStatus: StatusCallback = () => {};
  private onTranscript: TranscriptCallback = () => {};
  private onLevel: LevelCallback = () => {};
  private onError: ErrorCallback = () => {};

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRec: { new (): ISpeechRecognition } | undefined =
      ((window as unknown as Record<string, unknown>).SpeechRecognition as {
        new (): ISpeechRecognition;
      }) ||
      ((window as unknown as Record<string, unknown>)
        .webkitSpeechRecognition as { new (): ISpeechRecognition });

    if (!SpeechRec) {
      console.warn("[VoiceService] Web Speech API not supported");
      return;
    }

    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStatus("listening");
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Auto-restart to keep continuous listening
        try {
          this.recognition?.start();
        } catch {
          // Ignore if already starting
        }
      } else {
        this.onStatus("idle");
      }
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        this.onTranscript(final.trim(), true);
      } else if (interim) {
        this.onTranscript(interim.trim(), false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") return;
      if (event.error === "aborted") return;
      // 'network' error is common when Chrome can't reach Google's speech servers.
      // Stop listening silently and let the user fall back to typing.
      if (event.error === "network") {
        this.isListening = false;
        this.onStatus("idle");
        this.onError(
          "Microphone voice recognition requires internet access to Google servers. Please type your message instead.",
        );
        return;
      }
      // 'not-allowed' — microphone permission denied
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        this.isListening = false;
        this.onStatus("idle");
        this.onError(
          "Microphone access was denied. Please allow microphone access in your browser settings.",
        );
        return;
      }
      this.onError(`Speech recognition error: ${event.error}`);
    };
  }

  setCallbacks(callbacks: {
    onStatus?: StatusCallback;
    onTranscript?: TranscriptCallback;
    onLevel?: LevelCallback;
    onError?: ErrorCallback;
  }) {
    if (callbacks.onStatus) this.onStatus = callbacks.onStatus;
    if (callbacks.onTranscript) this.onTranscript = callbacks.onTranscript;
    if (callbacks.onLevel) this.onLevel = callbacks.onLevel;
    if (callbacks.onError) this.onError = callbacks.onError;
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // Set up audio level metering
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.startLevelMeter();

      if (this.recognition) {
        this.isListening = true;
        this.recognition.start();
      } else {
        this.onError("Speech recognition not supported in this browser");
      }
    } catch (err) {
      this.onError(
        err instanceof Error
          ? `Microphone access denied: ${err.message}`
          : "Could not access microphone",
      );
    }
  }

  stopListening() {
    this.isListening = false;
    cancelAnimationFrame(this.animationFrame);

    try {
      this.recognition?.stop();
    } catch {
      // already stopped
    }

    this.microphone?.disconnect();
    this.audioContext?.close();
    this.stream?.getTracks().forEach((t) => t.stop());

    this.analyser = null;
    this.microphone = null;
    this.audioContext = null;
    this.stream = null;

    this.onLevel(0);
    this.onStatus("idle");
  }

  private startLevelMeter() {
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);

    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      this.onLevel(Math.min(1, avg / 128));
      this.animationFrame = requestAnimationFrame(tick);
    };

    this.animationFrame = requestAnimationFrame(tick);
  }

  get supported(): boolean {
    const w = window as unknown as Record<string, unknown>;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }
}

// Singleton instance
export const voiceService = new VoiceService();
