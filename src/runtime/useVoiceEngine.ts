/**
 * useVoiceEngine — Custom React hook
 * Abstrae Web Speech API (SpeechRecognition + SpeechSynthesis)
 * 100% nativo del browser, sin dependencias externas.
 */

import { React } from "jimu-core";

const { useState, useRef, useCallback, useEffect } = React;

// Web Speech API — no incluidos en el DOM lib de EXB/TypeScript
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

export interface VoiceEngineOptions {
  language?: string; // "es-CO" | "es-ES" | "en-US"
  continuous?: boolean;
  voiceFeedback?: boolean;
  feedbackVolume?: number; // 0-1
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export interface VoiceEngineReturn {
  state: VoiceState;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  audioLevel: number; // 0-100 for visualization
}

function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
    (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition ||
    null
  );
}

export function useVoiceEngine(options: VoiceEngineOptions = {}): VoiceEngineReturn {
  const {
    language = "es-CO",
    continuous = false,
    voiceFeedback = true,
    feedbackVolume = 0.8,
    onTranscript,
    onError,
  } = options;

  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const SpeechRecognitionClass = getSpeechRecognition();
  const isSupported = !!SpeechRecognitionClass && "speechSynthesis" in window;

  // ── Audio Level Meter (para animación visual tipo Siri) ────────────────
  const startAudioMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, avg * 2));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Permiso denegado o no disponible — ignorar, el widget funciona igual
    }
  }, []);

  const stopAudioMeter = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    mediaStreamRef.current = null;
    audioContextRef.current = null;
  }, []);

  // ── Speech Recognition ────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognitionClass || state === "listening") return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setState("listening");
      setTranscript("");
      setInterimTranscript("");
      startAudioMeter();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (interim) setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
        setInterimTranscript("");
        onTranscript?.(final, true);
        setState("processing");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errMap: Record<string, string> = {
        "not-allowed": "Permiso de micrófono denegado",
        "no-speech": "No se detectó voz",
        network: "Error de red",
        aborted: "Reconocimiento cancelado",
        "audio-capture": "No se detectó micrófono",
        "service-not-allowed": "Servicio de voz no disponible",
      };
      const msg = errMap[event.error] ?? `Error: ${event.error}`;
      setState("error");
      onError?.(msg);
      stopAudioMeter();
    };

    recognition.onend = () => {
      setState((s) => (s !== "processing" ? "idle" : s));
      stopAudioMeter();
    };

    recognition.start();
  }, [SpeechRecognitionClass, language, continuous, state, onTranscript, onError, startAudioMeter, stopAudioMeter]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    stopAudioMeter();
    setState("idle");
  }, [stopAudioMeter]);

  // ── Speech Synthesis (TTS) ─────────────────────────────────────────────
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!voiceFeedback || !window.speechSynthesis) {
        onEnd?.();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.volume = feedbackVolume;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Seleccionar voz en español si está disponible
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(
        (v) => v.lang.startsWith("es") && v.localService
      ) ?? voices.find((v) => v.lang.startsWith("es"));
      if (spanishVoice) utterance.voice = spanishVoice;

      utterance.onstart = () => setState("speaking");
      utterance.onend = () => {
        setState("idle");
        onEnd?.();
      };
      utterance.onerror = () => {
        setState("idle");
        onEnd?.();
      };

      synthRef.current = utterance;
      setState("speaking");
      window.speechSynthesis.speak(utterance);
    },
    [voiceFeedback, language, feedbackVolume]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setState("idle");
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      stopAudioMeter();
      window.speechSynthesis?.cancel();
    };
  }, [stopAudioMeter]);

  return {
    state,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    audioLevel,
  };
}
