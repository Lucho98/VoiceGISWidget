import { React, jsx, Immutable } from "jimu-core";
import type { AllWidgetSettingProps } from "jimu-for-builder";
import {
  MapWidgetSelector,
  SettingSection,
  SettingRow,
} from "jimu-ui/advanced/setting-components";
import { Switch, NumericInput } from "jimu-ui";
import type { Config, IMConfig } from "../config";

const DEFAULT_CONFIG_VALUES: Config = {
  voiceLanguage: "es-CO",
  voiceFeedback: true,
  feedbackVolume: 0.8,
  activationWord: "",
  showCommandList: false,
  animationStyle: "siri",
  widgetPosition: "bottom-right",
  primaryColor: "#0079c1",
  zoomStep: 2,
};

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const { id, config, onSettingChange, useMapWidgetIds } = props;

  const cfg = config ?? Immutable(DEFAULT_CONFIG_VALUES);

  const updateConfig = <K extends keyof Config>(key: K, value: Config[K]) => {
    const newConfig = (config || Immutable(DEFAULT_CONFIG_VALUES)).set(key, value);
    onSettingChange({ id, config: newConfig });
  };

  return (
    <div style={{ padding: "0 0 16px 0" }}>

      <SettingSection title="Mapa de destino">
        <SettingRow flow="wrap" label="Widget de mapa">
          <MapWidgetSelector
            onSelect={(ids: string[]) => {
              onSettingChange({ id, useMapWidgetIds: ids });
            }}
            useMapWidgetIds={useMapWidgetIds}
          />
        </SettingRow>
        <SettingRow>
          <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
            Selecciona el widget de mapa que el control por voz va a manipular.
          </p>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Configuración de voz">
        <SettingRow flow="wrap" label="Idioma de reconocimiento">
          <select
            value={cfg.voiceLanguage}
            onChange={(e) =>
              updateConfig("voiceLanguage", e.target.value as IMConfig["voiceLanguage"])
            }
            style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
          >
            <option value="es-CO">Español Colombia (es-CO)</option>
            <option value="es-ES">Español España (es-ES)</option>
            <option value="en-US">English US (en-US)</option>
          </select>
        </SettingRow>

        <SettingRow label="Respuesta por voz (TTS)">
          <Switch
            checked={cfg.voiceFeedback}
            onChange={(e) => updateConfig("voiceFeedback", e.target.checked)}
          />
        </SettingRow>

        {cfg.voiceFeedback && (
          <SettingRow flow="wrap" label={`Volumen (${Math.round(cfg.feedbackVolume * 100)}%)`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={cfg.feedbackVolume}
              onChange={(e) => updateConfig("feedbackVolume", parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </SettingRow>
        )}
      </SettingSection>

      <SettingSection title="Comportamiento">
        <SettingRow flow="wrap" label="Paso de zoom por comando">
          <NumericInput
            value={cfg.zoomStep}
            min={1}
            max={5}
            step={1}
            onAcceptValue={(value) => updateConfig("zoomStep", Number(value))}
          />
        </SettingRow>

        <SettingRow label="Mostrar comandos al inicio">
          <Switch
            checked={cfg.showCommandList}
            onChange={(e) => updateConfig("showCommandList", e.target.checked)}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Apariencia">
        <SettingRow flow="wrap" label="Estilo de animación">
          <select
            value={cfg.animationStyle}
            onChange={(e) =>
              updateConfig("animationStyle", e.target.value as IMConfig["animationStyle"])
            }
            style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
          >
            <option value="siri">Siri</option>
            <option value="pulse">Pulso</option>
            <option value="wave">Onda</option>
          </select>
        </SettingRow>

        <SettingRow flow="wrap" label="Color principal">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="color"
              value={cfg.primaryColor}
              onChange={(e) => updateConfig("primaryColor", e.target.value)}
              style={{ width: 40, height: 32, border: "none", borderRadius: 4, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, color: "#555" }}>{cfg.primaryColor}</span>
          </div>
        </SettingRow>
      </SettingSection>

      <SettingSection title="">
        <SettingRow>
          <p style={{ fontSize: 11, color: "#888", margin: 0 }}>
            Web Speech API — Sin IA externa. Compatible con Chrome, Edge y Safari.
          </p>
        </SettingRow>
      </SettingSection>

    </div>
  );
}
