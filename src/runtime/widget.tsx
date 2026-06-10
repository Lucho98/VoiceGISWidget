/**
 * VoiceGIS Controller Widget
 * ArcGIS Experience Builder — Widget Runtime
 *
 * Stack:
 *  - ArcGIS Maps SDK for JavaScript 4.x (jimu-arcgis)
 *  - Calcite Design System (web components)
 *  - Web Speech API (nativo, sin IA externa)
 *  - React (jimu-core)
 *
 * Autor: Luis Fernando Posada 
 */

import { React, jsx } from "jimu-core";

const { useState, useCallback, useRef, useEffect } = React;

// ExB SDK types — disponibles en el entorno ExB
import { type AllWidgetProps } from "jimu-core";
import { JimuMapViewComponent } from "jimu-arcgis";
import type { JimuMapView } from "jimu-arcgis";

import type { IMConfig } from "../config";
import { useVoiceEngine } from "./useVoiceEngine";
import { parseIntent, buildTTSResponse, type ParsedIntent } from "./intentEngine";
import { executeGISAction, findBestLayerMatch, listLayerNames } from "./mapController";
import { VoiceOrb } from "./VoiceOrb";
import { CommandPanel } from "./CommandPanel";

// ── Tipos locales ─────────────────────────────────────────────────────────

interface CommandEntry {
  id: string;
  transcript: string;
  intent: ParsedIntent;
  timestamp: Date;
  success: boolean;
  message: string;
}

// ── Widget Principal ──────────────────────────────────────────────────────

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const { config, useMapWidgetIds } = props;

  const mapWidgetId = useMapWidgetIds?.[0];
  const [jimuMapView, setJimuMapView] = useState<JimuMapView | null>(null);
  const view = jimuMapView?.view;

  const [commandHistory, setCommandHistory] = useState<CommandEntry[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    msg: string;
  } | null>(null);
  const [awaitingLayer, setAwaitingLayer] = useState(false);
  const statusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs para romper dependencias circulares voice → onTranscript → voice
  const speakRef = useRef<(text: string, onEnd?: () => void) => void>(() => {});
  const startListeningRef = useRef<() => void>(() => {});
  const pendingLayerActionRef = useRef<{ pendingIntent: "SHOW_LAYER" | "HIDE_LAYER" | "TOGGLE_LAYER" } | null>(null);

  const showStatus = useCallback((msg: string, success = true, ms = 3000) => {
    setStatusMessage(msg);
    setLastResult({ success, msg });
    if (statusTimeout.current) clearTimeout(statusTimeout.current);
    statusTimeout.current = setTimeout(() => {
      setStatusMessage("");
      setLastResult(null);
    }, ms);
  }, []);

  // ── Voice Engine ────────────────────────────────────────────────────────
  const voice = useVoiceEngine({
    language: config?.voiceLanguage ?? "es-CO",
    voiceFeedback: config?.voiceFeedback ?? true,
    feedbackVolume: config?.feedbackVolume ?? 0.8,

    onTranscript: useCallback(
      async (text: string, isFinal: boolean) => {
        if (!isFinal) return;

        if (!view) {
          showStatus("El mapa aún no está listo", false, 3000);
          return;
        }

        const addEntry = (tr: string, intent: ParsedIntent, success: boolean, message: string) => {
          setCommandHistory((prev) => [...prev.slice(-49), {
            id: crypto.randomUUID(), transcript: tr, intent,
            timestamp: new Date(), success, message,
          }]);
        };

        // ── MODO CONVERSACIONAL: esperando nombre de capa ────────────────
        if (pendingLayerActionRef.current) {
          const { pendingIntent } = pendingLayerActionRef.current;
          const layer = findBestLayerMatch(view, text);

          if (layer) {
            pendingLayerActionRef.current = null;
            setAwaitingLayer(false);
            if (pendingIntent === "SHOW_LAYER") layer.visible = true;
            else if (pendingIntent === "HIDE_LAYER") layer.visible = false;
            else layer.visible = !layer.visible;
            const vis = layer.visible ? "activada" : "ocultada";
            const msg = `Capa "${layer.title}" ${vis}`;
            addEntry(text, { intent: pendingIntent, confidence: 0.9, entities: { layerName: layer.title ?? "" }, rawText: text }, true, msg);
            speakRef.current(msg);
            showStatus(msg, true);
          } else {
            // ¿Es un comando diferente? procesarlo y salir del modo conversacional
            const newIntent = parseIntent(text);
            if (newIntent.intent !== "UNKNOWN" && newIntent.confidence >= 0.85) {
              pendingLayerActionRef.current = null;
              setAwaitingLayer(false);
              const result = await executeGISAction(view, newIntent);
              addEntry(text, newIntent, result.success, result.message);
              speakRef.current(buildTTSResponse(newIntent));
              showStatus(result.message, result.success);
            } else {
              // No encontró la capa — preguntar de nuevo
              const names = listLayerNames(view) || "ninguna";
              speakRef.current(
                `No encontré esa capa. Las disponibles son: ${names}. ¿Cuál quieres?`,
                () => startListeningRef.current()
              );
              showStatus("Capa no encontrada, intenta de nuevo", false, 5000);
            }
          }
          return;
        }

        // ── MODO NORMAL ──────────────────────────────────────────────────
        const intent = parseIntent(text);
        const isLayerAction = intent.intent === "SHOW_LAYER" || intent.intent === "HIDE_LAYER" || intent.intent === "TOGGLE_LAYER";

        if (isLayerAction && !intent.entities.layerName) {
          // Comando de capa sin nombre — iniciar diálogo
          const names = listLayerNames(view) || "ninguna";
          const verb = intent.intent === "HIDE_LAYER" ? "ocultar" : intent.intent === "TOGGLE_LAYER" ? "alternar" : "mostrar";
          pendingLayerActionRef.current = { pendingIntent: intent.intent };
          setAwaitingLayer(true);
          speakRef.current(
            `¿Qué capa quieres ${verb}? Las disponibles son: ${names}`,
            () => startListeningRef.current()
          );
          showStatus(`¿Qué capa quieres ${verb}?`, true, 8000);
          return;
        }

        const result = await executeGISAction(view, intent);
        addEntry(text, intent, result.success, result.message);
        // Para SHOW_LAYERS_LIST hablar los nombres reales; para el resto, respuesta TTS normal
        const tts = intent.intent === "SHOW_LAYERS_LIST" ? result.message : buildTTSResponse(intent);
        speakRef.current(tts);
        showStatus(result.message, result.success);
      },
      [view, showStatus]
    ),

    onError: useCallback(
      (error: string) => {
        showStatus(error, false, 4000);
      },
      [showStatus]
    ),
  });

  speakRef.current = voice.speak;
  startListeningRef.current = voice.startListening;

  // ── Manejar click en el orb ─────────────────────────────────────────────
  const handleOrbClick = useCallback(() => {
    if (voice.state === "listening") {
      voice.stopListening();
    } else if (voice.state === "speaking") {
      voice.stopSpeaking();
    } else if (voice.state === "error" || voice.state === "idle") {
      voice.startListening();
    }
  }, [voice]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (statusTimeout.current) clearTimeout(statusTimeout.current);
    };
  }, []);

  // ── No hay mapa seleccionado: modo configuración ───────────────────────
  if (!mapWidgetId) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 12,
          padding: 16,
          textAlign: "center",
        }}
      >
        <calcite-icon icon="microphone" scale="l" style={{ color: "#0079c1" }} />
        <calcite-label scale="l">Voice GIS Controller</calcite-label>
        <p style={{ fontSize: 13, color: "#666", maxWidth: 240 }}>
          Selecciona un widget de mapa en la configuración para habilitar el
          control por voz.
        </p>
        <calcite-notice open icon="information" color="blue">
          <div slot="message">
            Abre la configuración del widget y selecciona el mapa destino.
          </div>
        </calcite-notice>
      </div>
    );
  }

  // ── Browser no soporta Web Speech API ─────────────────────────────────
  if (!voice.isSupported) {
    return (
      <calcite-notice open icon="exclamation-mark-triangle" color="red">
        <div slot="title">Navegador no compatible</div>
        <div slot="message">
          Este widget requiere Chrome, Edge o Safari con Web Speech API habilitada.
        </div>
      </calcite-notice>
    );
  }

  // ── Render principal ───────────────────────────────────────────────────
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Suscripción al MapView del widget de mapa seleccionado */}
      <JimuMapViewComponent
        useMapWidgetId={mapWidgetId}
        onActiveViewChange={(activeView) => setJimuMapView(activeView ?? null)}
      />
      {/* Transcript en tiempo real — flota sobre el orb */}
      {(voice.transcript || voice.interimTranscript) && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(50% + 48px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            color: "white",
            padding: "6px 12px",
            borderRadius: 10,
            fontSize: 12,
            maxWidth: 240,
            backdropFilter: "blur(8px)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            zIndex: 10,
          }}
        >
          <span style={{ opacity: 0.6, fontSize: 10 }}>mic </span>
          <span style={{ opacity: voice.interimTranscript ? 0.6 : 1, fontStyle: voice.interimTranscript ? "italic" : "normal" }}>
            {voice.transcript || voice.interimTranscript}
          </span>
        </div>
      )}

      {/* Mensaje de resultado — flota sobre el orb */}
      {statusMessage && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(50% + 48px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: lastResult?.success ? "#0079c1" : "#d83020",
            color: "white",
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 12,
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Indicador modo conversacional */}
      {awaitingLayer && (
        <div
          style={{
            position: "absolute",
            top: "calc(50% + 52px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0079c1",
            color: "white",
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: 11,
            whiteSpace: "nowrap",
            zIndex: 10,
            animation: "voicePulse 1.5s ease-in-out infinite",
          }}
        >
          Di el nombre de la capa...
        </div>
      )}

      {/* Orb principal */}
      <VoiceOrb
        state={voice.state}
        audioLevel={voice.audioLevel}
        onClick={handleOrbClick}
        primaryColor={config?.primaryColor ?? "#0079c1"}
        size={56}
      />

      {/* Label de estado */}
      <div
        style={{
          textAlign: "center",
          marginTop: 6,
          fontSize: 10,
          color: "#555",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        {getStateLabel(voice.state)}
      </div>

      {/* Botón de historial */}
      <calcite-action
        icon="list"
        text="Historial"
        appearance="transparent"
        scale="s"
        style={{ marginTop: 4 }}
        onClick={() => setIsPanelOpen((p) => !p)}
        indicator={commandHistory.length > 0}
      />

      {/* Panel de comandos e historial */}
      <CommandPanel
        history={commandHistory}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  );
};

function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    idle: "Toca para hablar",
    listening: "Escuchando...",
    processing: "Procesando...",
    speaking: "Respondiendo...",
    error: "Error — toca para reintentar",
  };
  return labels[state] ?? "";
}

export default Widget;
