/**
 * CommandPanel — Panel de comandos disponibles + historial
 * Usa Calcite Design System web components
 */

import { React, jsx } from "jimu-core";
import type { ParsedIntent } from "./intentEngine";

interface CommandEntry {
  id: string;
  transcript: string;
  intent: ParsedIntent;
  timestamp: Date;
  success: boolean;
  message: string;
}

interface CommandPanelProps {
  history: CommandEntry[];
  isOpen: boolean;
  onClose: () => void;
}

const COMMAND_EXAMPLES = [
  { category: "Zoom", icon: "zoom-in-fixed", examples: ["Acercar", "Alejar", "Zoom nivel 10"] },
  { category: "Navegación", icon: "map-pin", examples: ["Ir a Bogotá", "Buscar Medellín", "Vista inicial"] },
  { category: "Capas", icon: "layers", examples: ["Mostrar capa de veredas", "Ocultar capa de vías", "Prender capa de lotes", "Apagar capa de lotes", "Lista de capas"] },
  { category: "Mapa Base", icon: "basemap", examples: ["Satélite", "Topográfico", "Oscuro", "Pon el satélite", "Modo nocturno", "Cambiar a calles"] },
  { category: "Análisis", icon: "measure", examples: ["Medir distancia", "Medir área", "Limpiar mapa"] },
  { category: "Vista", icon: "3d-glasses", examples: ["Norte arriba", "Vista 3D", "Mostrar leyenda", "Ocultar leyenda", "Cerrar popup"] },
];

export const CommandPanel: React.FC<CommandPanelProps> = ({
  history,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <calcite-panel
      heading="Voice GIS Controller"
      description="Comandos disponibles e historial"
      style={{
        position: "absolute",
        bottom: 90,
        right: 16,
        width: 340,
        maxHeight: "70vh",
        zIndex: 1000,
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <calcite-action
        slot="header-actions-end"
        icon="x"
        text="Cerrar"
        onClick={onClose}
      />

      <calcite-tabs layout="center" style={{ padding: "0" }}>
        <calcite-tab-nav slot="title-group">
          <calcite-tab-title selected>Comandos</calcite-tab-title>
          <calcite-tab-title>Historial</calcite-tab-title>
        </calcite-tab-nav>

        {/* Tab: Comandos disponibles */}
        <calcite-tab selected>
          <div style={{ padding: "8px 0" }}>
            {COMMAND_EXAMPLES.map((group) => (
              <calcite-block
                key={group.category}
                heading={group.category}
                collapsible
                style={{ margin: "0 0 4px 0" }}
              >
                <calcite-icon slot="icon" icon={group.icon} scale="s" />
                <div style={{ padding: "4px 0" }}>
                  {group.examples.map((ex) => (
                    <calcite-chip
                      key={ex}
                      label={ex}
                      icon="microphone"
                      scale="s"
                      style={{ margin: "3px", cursor: "default" }}
                      appearance="outline"
                    >
                      {ex}
                    </calcite-chip>
                  ))}
                </div>
              </calcite-block>
            ))}
          </div>
        </calcite-tab>

        {/* Tab: Historial */}
        <calcite-tab>
          <div style={{ padding: "8px" }}>
            {history.length === 0 ? (
              <calcite-notice open icon="information" color="blue" style={{ margin: "8px 0" }}>
                <div slot="message">
                  Aún no hay comandos ejecutados. Di algo al micrófono para comenzar.
                </div>
              </calcite-notice>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...history].reverse().map((entry) => (
                  <calcite-card key={entry.id} style={{ borderRadius: 8 }}>
                    <div slot="heading" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <calcite-icon
                        icon={entry.success ? "check-circle" : "exclamation-mark-triangle"}
                        scale="s"
                        style={{ color: entry.success ? "#28a745" : "#dc3545" }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {entry.transcript}
                      </span>
                    </div>
                    <div slot="description" style={{ fontSize: 11, color: "#666" }}>
                      <span style={{
                        background: getIntentColor(entry.intent.intent),
                        color: "white",
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontSize: 10,
                        marginRight: 6,
                      }}>
                        {entry.intent.intent}
                      </span>
                      {entry.message}
                    </div>
                    <div slot="footer-start" style={{ fontSize: 10, color: "#999" }}>
                      {entry.timestamp.toLocaleTimeString("es-CO")}
                    </div>
                    <div slot="footer-end" style={{ fontSize: 10, color: "#999" }}>
                      {Math.round(entry.intent.confidence * 100)}% confianza
                    </div>
                  </calcite-card>
                ))}
              </div>
            )}
          </div>
        </calcite-tab>
      </calcite-tabs>

      <div slot="footer" style={{ display: "flex", justifyContent: "center", padding: "8px", gap: 8 }}>
        <calcite-chip label="Web Speech API" icon="information" scale="s" appearance="outline">
          Web Speech API — Sin IA externa
        </calcite-chip>
        <calcite-chip label="ArcGIS SDK" icon="globe" scale="s" appearance="outline">
          ArcGIS SDK 5.0
        </calcite-chip>
      </div>
    </calcite-panel>
  );
};

function getIntentColor(intent: string): string {
  if (intent.includes("ZOOM")) return "#0079c1";
  if (intent.includes("LAYER")) return "#6a4fd8";
  if (intent.includes("GO")) return "#00897b";
  if (intent.includes("BASEMAP")) return "#e65100";
  if (intent.includes("MEASURE")) return "#6d4c41";
  if (intent.includes("UNKNOWN")) return "#dc3545";
  return "#555";
}

export default CommandPanel;
