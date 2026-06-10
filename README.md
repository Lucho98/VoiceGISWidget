#  Voice GIS Controller
### ArcGIS Experience Builder Custom Widget

> Control de mapas por voz tipo Siri — sin IA externa, 100% nativo del browser.

---

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| GIS Platform | ArcGIS Maps SDK for JavaScript | **5.0** |
| UI Framework | React | 18 |
| Design System | Calcite Design System | Latest |
| Speech-to-Text | Web Speech API | Nativa (W3C) |
| Text-to-Speech | SpeechSynthesis API | Nativa (W3C) |
| Audio Metering | Web Audio API | Nativa |
| Intent Engine | Regex + Fuzzy match | Local (sin red) |
| ExB SDK | Jimu Core / Jimu ArcGIS | ExB 1.16+ |

---

## Arquitectura
┌─────────────────────────────────────────────────────────┐
│                  widget.tsx (ExB Runtime)               │
│                                                         │
│  ┌─────────────────┐     ┌───────────────────────────┐  │
│  │  useVoiceEngine │     │       VoiceOrb.tsx         │  │
│  │  (Web Speech    │────▶│  (Siri-style animation)    │  │
│  │   API hook)     │     │  (Calcite Design System)   │  │
│  └────────┬────────┘     └───────────────────────────┘  │
│           │ transcript                                   │
│           ▼                                             │
│  ┌─────────────────┐                                    │
│  │  intentEngine   │  ◀── 100% LOCAL, sin IA           │
│  │  (Regex + Fuzzy │                                    │
│  │   NLP en ES/EN) │                                    │
│  └────────┬────────┘                                    │
│           │ ParsedIntent                                │
│           ▼                                             │
│  ┌─────────────────┐     ┌───────────────────────────┐  │
│  │  mapController  │────▶│  ArcGIS Maps SDK 5.0      │  │
│  │  (ArcGIS JS API │     │  MapView / SceneView       │  │
│  │   actions)      │     │  Geocoder / Basemap        │  │
│  └─────────────────┘     └───────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │        CommandPanel (Calcite components)         │    │
│  │   Historial de comandos + Lista de shortcuts    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

---

## Estructura de archivos
voice-gis-controller/
├── manifest.json                   # Registro del widget en ExB
├── icon.svg                        # Ícono del widget
├── translations/
│   ├── es.json                     # i18n Español
│   └── en.json                     # i18n English
└── src/
├── config.ts                   # Tipos de configuración
├── runtime/
│   ├── widget.tsx              # ★ Componente principal (Entry point)
│   ├── useVoiceEngine.ts       # Hook Web Speech API
│   ├── intentEngine.ts         # Motor de intents (NLP local)
│   ├── mapController.ts        # Acciones ArcGIS SDK 5.0
│   ├── VoiceOrb.tsx            # Componente visual tipo Siri
│   └── CommandPanel.tsx        # Panel Calcite de historial
└── setting/
└── setting.tsx             # Panel de configuración ExB

---

## Comandos disponibles (Español)

### Zoom

| Comando | Acción |
|---------|--------|
| "Acercar" / "Ampliar" | Zoom +2 |
| "Alejar" / "Reducir" | Zoom -2 |
| "Zoom nivel 12" | Ir al nivel exacto |

### Navegación

| Comando | Acción |
|---------|--------|
| "Ir a Bogotá" | Geocodifica y navega |
| "Buscar Medellín" | Geocodifica y navega |
| "Vista inicial" / "Ir al home" | Restaura extent inicial |

### Capas

| Comando | Acción |
|---------|--------|
| "Mostrar capa de oleoductos" | `layer.visible = true` |
| "Ocultar capa de veredas" | `layer.visible = false` |
| "Alternar capa de pozos" | Toggle visibilidad |
| "Lista de capas" | Anuncia capas disponibles |

### Mapa Base

| Comando | Acción |
|---------|--------|
| "Satélite" | Basemap satellite |
| "Topográfico" | Basemap topographic |
| "Modo oscuro" / "Nocturno" | Basemap dark-gray |
| "Marino" / "Océano" | Basemap oceans |

### Análisis

| Comando | Acción |
|---------|--------|
| "Medir distancia" | Activa herramienta distancia |
| "Medir área" | Activa herramienta área |
| "Limpiar mapa" | `view.graphics.removeAll()` |

### Vista

| Comando | Acción |
|---------|--------|
| "Norte arriba" | `view.goTo({ rotation: 0 })` |
| "Vista 3D" | `sceneView.goTo({ tilt: 45 })` |
| "Mostrar leyenda" | Abre widget de leyenda |

---

## Instalación en Experience Builder

### Requisitos

- ArcGIS Experience Builder Developer Edition 1.16+
- Node.js 18+
- ArcGIS Maps SDK for JS 5.0

### Pasos

```bash
# 1. Copiar el widget a la carpeta de widgets del cliente
cp -r voice-gis-controller/ \
  <ExB_Install>/client/your-extensions/widgets/

# 2. Iniciar ExB en modo desarrollo
cd <ExB_Install>/client
npm start

# 3. En el builder:
#    Insertar widget → "Voice GIS Controller"
#    Configurar → Seleccionar mapa de destino
#    Publicar → La experiencia queda lista
```

### Dependencias npm requeridas en el entorno ExB

```json
{
  "@esri/calcite-components": "^2.x",
  "@arcgis/core": "^5.0.0"
}
```

---

## Privacidad y permisos

- **Micrófono**: Requerido. El browser pide permiso estándar.
- **Datos de voz**: Procesados **localmente** por el engine del SO (igual que Siri).
- **Sin IA externa**: No hay llamadas a OpenAI, Claude, ni ningún LLM.
- **Geocodificación**: Usa el ArcGIS World Geocoder (requiere token ArcGIS).

---

## Compatibilidad de navegadores

| Navegador | Web Speech API | Recomendado |
|-----------|---------------|-------------|
| Chrome 90+ | ✅ Completo | ⭐ Mejor |
| Edge 90+ | ✅ Completo | ✅ |
| Safari 14.1+ | ✅ Parcial | ✅ |
| Firefox | ❌ No soportado | ❌ |

---

## Roadmap

- [ ] Palabra de activación tipo "Hey Mapa" (siempre escuchando)
- [ ] Comandos de selección espacial por voz
- [ ] Soporte Multi-idioma dinámico
- [ ] Exportar historial de comandos a CSV
- [ ] Comandos de análisis (buffer, intersect) por voz

---

## Autor

**Luis Fernando Posada Mojica**
