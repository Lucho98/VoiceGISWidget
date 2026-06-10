import type { ImmutableObject } from 'seamless-immutable'

export interface Config {
  voiceLanguage: "es-CO" | "es-ES" | "en-US";
  voiceFeedback: boolean;
  feedbackVolume: number;
  activationWord: string;
  showCommandList: boolean;
  animationStyle: "siri" | "pulse" | "wave";
  widgetPosition: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  primaryColor: string;
  zoomStep: number;
}

export type IMConfig = ImmutableObject<Config>
