/**
 * VoiceGIS Intent Engine
 * Motor de intents local — sin IA externa, procesamiento 100% en el browser.
 * Soporta comandos en español colombiano / español neutro / inglés.
 */

export type GISIntent =
  | "ZOOM_IN"
  | "ZOOM_OUT"
  | "ZOOM_TO_LEVEL"
  | "GO_TO_PLACE"
  | "SHOW_LAYER"
  | "HIDE_LAYER"
  | "TOGGLE_LAYER"
  | "CHANGE_BASEMAP"
  | "MEASURE_DISTANCE"
  | "MEASURE_AREA"
  | "CLEAR_GRAPHICS"
  | "GO_HOME"
  | "SHOW_LEGEND"
  | "HIDE_LEGEND"
  | "SHOW_POPUP"
  | "CLOSE_POPUP"
  | "ROTATE_NORTH"
  | "TILT_MAP"
  | "SHOW_LAYERS_LIST"
  | "SELECT_FEATURE"
  | "UNKNOWN";

export interface ParsedIntent {
  intent: GISIntent;
  confidence: number; // 0-1
  entities: Record<string, string>;
  rawText: string;
  suggestion?: string;
}

export type BasemapId =
  | "satellite"
  | "hybrid"
  | "streets"
  | "topographic"
  | "gray"
  | "dark-gray"
  | "oceans"
  | "osm"
  | "terrain";

interface IntentPattern {
  intent: GISIntent;
  patterns: RegExp[];
  extractors?: Record<string, RegExp>;
  confidence: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // ── ZOOM ──────────────────────────────────────────────────────────
  {
    intent: "ZOOM_IN",
    confidence: 0.95,
    patterns: [
      /acercar|acércate|zoom\s*in|ampliar|amplíame|más\s*cerca|aumentar\s*zoom|acerca\s*(más|el\s*mapa)?/i,
      /zoom\s*in|zoom\s*más/i,
    ],
  },
  {
    intent: "ZOOM_OUT",
    confidence: 0.95,
    patterns: [
      /alejar|aléjate|zoom\s*out|reducir|redúceme|más\s*lejos|disminuir\s*zoom|aleja\s*(más|el\s*mapa)?/i,
      /zoom\s*out|zoom\s*menos/i,
    ],
  },
  {
    intent: "ZOOM_TO_LEVEL",
    confidence: 0.92,
    patterns: [
      /zoom\s*(al?\s*)?nivel\s*(\d+)|nivel\s*(\d+)\s*de\s*zoom|escala\s*(\d+)/i,
      /ir\s*a\s*nivel\s*(\d+)/i,
    ],
    extractors: {
      level: /(\d+)/,
    },
  },

  // ── NAVEGACIÓN ────────────────────────────────────────────────────
  {
    intent: "GO_TO_PLACE",
    confidence: 0.88,
    patterns: [
      /ir\s*a\s*(.+)|navegar\s*a\s*(.+)|llevarme\s*a\s*(.+)|busca\s*(.+)|muéstrame\s*(.+)|ve\s*a\s*(.+)|centra\s*(el\s*mapa\s*en\s*)?(.+)/i,
      /show\s*me\s*(.+)|go\s*to\s*(.+)|navigate\s*to\s*(.+)/i,
    ],
    extractors: {
      place:
        /(?:ir\s*a|navegar\s*a|llevarme\s*a|busca|muéstrame|ve\s*a|centra\s*(?:el\s*mapa\s*en)?|show\s*me|go\s*to|navigate\s*to)\s*(.+)/i,
    },
  },
  {
    intent: "GO_HOME",
    confidence: 0.97,
    patterns: [
      /volver\s*al?\s*(inicio|home|principio|extent\s*inicial|extensión\s*inicial)|vista\s*inicial|extensión\s*completa|ir\s*al?\s*home/i,
      /go\s*home|initial\s*extent|reset\s*view/i,
    ],
  },

  // ── CAPAS ─────────────────────────────────────────────────────────
  {
    intent: "SHOW_LAYER",
    confidence: 0.9,
    patterns: [
      /(?:mostrar|muestre|activar|active|habilitar|habilite|enciende|encienda|prende|prenda|prender)\s*(?:la\s*)?capa\s*(?:de\s*)?(.+)?/i,
      /show\s*layer(?:\s+(.+))?|enable\s*layer(?:\s+(.+))?/i,
    ],
    extractors: {
      layerName:
        /(?:mostrar|muestre|activar|active|habilitar|habilite|enciende|encienda|prende|prenda|prender)\s*(?:la\s*)?capa\s*(?:de\s*)?(.+)|(?:show|enable)\s*layer\s*(.+)/i,
    },
  },
  {
    intent: "HIDE_LAYER",
    confidence: 0.9,
    patterns: [
      /(?:ocultar|oculte|desactivar|desactive|deshabilitar|deshabilite|apaga|apague|apagar)\s*(?:la\s*)?capa\s*(?:de\s*)?(.+)?/i,
      /hide\s*layer(?:\s+(.+))?|disable\s*layer(?:\s+(.+))?/i,
    ],
    extractors: {
      layerName:
        /(?:ocultar|oculte|desactivar|desactive|deshabilitar|deshabilite|apaga|apague|apagar)\s*(?:la\s*)?capa\s*(?:de\s*)?(.+)|(?:hide|disable)\s*layer\s*(.+)/i,
    },
  },
  {
    intent: "TOGGLE_LAYER",
    confidence: 0.85,
    patterns: [
      /alternar\s*(la\s*)?capa\s*(?:de\s*)?(.+)?|toggle\s*(la\s*)?capa\s*(?:de\s*)?(.+)?/i,
    ],
    extractors: {
      layerName:
        /(?:alternar|toggle)\s*(?:la\s*)?capa\s*(?:de\s*)?(.+)/i,
    },
  },
  {
    intent: "SHOW_LAYERS_LIST",
    confidence: 0.93,
    patterns: [
      /mostrar\s*(la\s*)?lista\s*de\s*capas|ver\s*(las\s*)?capas|listar\s*capas/i,
      /cu[aá]les?\s*(son\s*(las\s*)?|hay\s*|tengo\s*|tiene\s*)?capas|qu[eé]\s*capas\s*(hay|tengo|existen|tiene|están)?/i,
      /capas\s*disponibles|dime\s*(las\s*)?capas|cuántas\s*capas/i,
      /show\s*layers|list\s*layers|what\s*layers/i,
    ],
  },

  // ── MAPA BASE ─────────────────────────────────────────────────────
  {
    intent: "CHANGE_BASEMAP",
    confidence: 0.91,
    patterns: [
      /cambiar\s*(a\s*)?(mapa\s*base|basemap)\s*(.+)?|mapa\s*base\s*(.+)|pon\s*(el\s*)?(satélite|satélital|satelite|imagen|imágenes|calles|topográfico|topografico|gris|oscuro|marino)|modo\s*(satélite|satelite|calle|nocturno|noche|oscuro|día)/i,
      /change\s*basemap\s*(.+)?|switch\s*to\s*(.+)\s*map/i,
      /^(satélite|satelite|satélital|satelital|imagen|imágenes|imagenes|híbrido|hibrido|calles|carreteras|topográfico|topografico|terreno|gris|oscuro|nocturno|noche|marino|océano|oceano|openstreetmap|osm)$/i,
    ],
    extractors: {
      basemap:
        /(?:cambiar\s*(?:a\s*)?(?:mapa\s*base|basemap)\s*|mapa\s*base\s*|pon\s*(?:el\s*)?|modo\s*|change\s*basemap\s*|switch\s*to\s*)(.+?)(?:\s*map)?$|(satélite|satelite|satélital|satelital|imagen|imágenes|imagenes|híbrido|hibrido|calles|carreteras|topográfico|topografico|terreno|gris|oscuro|nocturno|noche|marino|océano|oceano|openstreetmap|osm)/i,
    },
  },

  // ── MEDICIÓN ──────────────────────────────────────────────────────
  {
    intent: "MEASURE_DISTANCE",
    confidence: 0.92,
    patterns: [
      /medir\s*(distancia|longitud|recorrido)|calcular\s*distancia|herramienta\s*de\s*distancia/i,
      /measure\s*(distance|length)|distance\s*tool/i,
    ],
  },
  {
    intent: "MEASURE_AREA",
    confidence: 0.92,
    patterns: [
      /medir\s*(área|superficie|extensión)|calcular\s*(área|superficie)|herramienta\s*de\s*área/i,
      /measure\s*(area|surface)|area\s*tool/i,
    ],
  },
  {
    intent: "CLEAR_GRAPHICS",
    confidence: 0.94,
    patterns: [
      /limpiar\s*(el\s*mapa|gráficos|dibujos|mediciones?)|borrar\s*(todo|gráficos|dibujos|mediciones?)|quitar\s*(marcadores|gráficos)/i,
      /clear\s*(map|graphics|drawings)|erase\s*all/i,
    ],
  },

  // ── UI ────────────────────────────────────────────────────────────
  {
    intent: "SHOW_LEGEND",
    confidence: 0.95,
    patterns: [
      /mostrar\s*(la\s*)?leyenda|ver\s*(la\s*)?leyenda|abrir\s*(la\s*)?leyenda/i,
      /show\s*legend|open\s*legend/i,
    ],
  },
  {
    intent: "HIDE_LEGEND",
    confidence: 0.95,
    patterns: [
      /ocultar\s*(la\s*)?leyenda|cerrar\s*(la\s*)?leyenda|esconder\s*(la\s*)?leyenda/i,
      /hide\s*legend|close\s*legend/i,
    ],
  },
  {
    intent: "CLOSE_POPUP",
    confidence: 0.95,
    patterns: [
      /cerrar\s*(el\s*)?(popup|emergente|ventana|info)|quitar\s*(el\s*)?(popup|emergente)/i,
      /close\s*(popup|info\s*window)/i,
    ],
  },
  {
    intent: "ROTATE_NORTH",
    confidence: 0.96,
    patterns: [
      /rotar\s*(al?\s*)?norte|orientar\s*(al?\s*)?norte|apuntar\s*(al?\s*)?norte|norte\s*arriba/i,
      /rotate\s*north|north\s*up|reset\s*rotation/i,
    ],
  },
  {
    intent: "TILT_MAP",
    confidence: 0.88,
    patterns: [
      /inclinar\s*(el\s*)?mapa|vista\s*(3d|tridimensional)|activar\s*3d|modo\s*3d/i,
      /tilt\s*map|3d\s*(view|mode)/i,
    ],
  },
];

// Normalización de nombres de mapa base
const BASEMAP_ALIASES: Record<string, BasemapId> = {
  satélite: "satellite",
  satelite: "satellite",
  satelital: "satellite",
  "satélital": "satellite",
  imagen: "hybrid",
  imágenes: "hybrid",
  imagenes: "hybrid",
  híbrido: "hybrid",
  hibrido: "hybrid",
  calles: "streets",
  carreteras: "streets",
  vías: "streets",
  street: "streets",
  topográfico: "topographic",
  topografico: "topographic",
  terreno: "terrain",
  montaña: "terrain",
  gris: "gray",
  claro: "gray",
  oscuro: "dark-gray",
  "dark-gray": "dark-gray",
  nocturno: "dark-gray",
  noche: "dark-gray",
  marino: "oceans",
  océano: "oceans",
  oceano: "oceans",
  mar: "oceans",
  openstreetmap: "osm",
  osm: "osm",
};

export function normalizeBasemap(raw: string): BasemapId {
  const lower = raw.trim().toLowerCase();
  for (const [alias, id] of Object.entries(BASEMAP_ALIASES)) {
    if (lower.includes(alias)) return id;
  }
  return "streets"; // default fallback
}

/**
 * Fuzzy match: calculates similarity between two strings (Levenshtein-based).
 */
function fuzzyScore(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  const len = Math.max(s1.length, s2.length);
  if (len === 0) return 1;
  let matches = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) matches++;
  }
  return matches / len;
}

/**
 * Main intent parser — 100% local, no network calls.
 */
export function parseIntent(transcript: string): ParsedIntent {
  const text = transcript.trim();
  let bestMatch: ParsedIntent | null = null;
  let bestScore = 0;

  for (const intentDef of INTENT_PATTERNS) {
    for (const pattern of intentDef.patterns) {
      const match = text.match(pattern);
      if (match) {
        const score = intentDef.confidence;
        if (score > bestScore) {
          bestScore = score;
          const entities: Record<string, string> = {};

          // Extract named entities
          if (intentDef.extractors) {
            for (const [key, extractor] of Object.entries(
              intentDef.extractors
            )) {
              const entityMatch = text.match(extractor);
              if (entityMatch) {
                // Find first non-undefined captured group
                const value = entityMatch
                  .slice(1)
                  .find((g) => g !== undefined);
                if (value) entities[key] = value.trim();
              }
            }
          }

          bestMatch = {
            intent: intentDef.intent,
            confidence: score,
            entities,
            rawText: text,
          };
        }
      }
    }
  }

  if (!bestMatch) {
    return {
      intent: "UNKNOWN",
      confidence: 0,
      entities: {},
      rawText: text,
      suggestion: getSuggestion(text),
    };
  }

  return bestMatch;
}

function getSuggestion(text: string): string {
  const suggestions = [
    'Di "acercar" o "alejar" para zoom',
    'Di "ir a Bogotá" para navegar',
    'Di "mostrar capa de veredas" para capas',
    'Di "satélite" para cambiar mapa base',
    'Di "vista inicial" para resetear el mapa',
  ];
  // Pick a suggestion based on fuzzy match of words in text
  const words = text.toLowerCase().split(" ");
  if (words.some((w) => fuzzyScore(w, "zoom") > 0.7)) return suggestions[0];
  if (words.some((w) => fuzzyScore(w, "ir") > 0.7)) return suggestions[1];
  if (words.some((w) => fuzzyScore(w, "capa") > 0.7)) return suggestions[2];
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

/**
 * Format a response message for TTS.
 */
export function buildTTSResponse(intent: ParsedIntent): string {
  const { entities } = intent;
  switch (intent.intent) {
    case "ZOOM_IN":
      return "Acercando el mapa";
    case "ZOOM_OUT":
      return "Alejando el mapa";
    case "ZOOM_TO_LEVEL":
      return `Yendo al nivel de zoom ${entities.level ?? ""}`;
    case "GO_TO_PLACE":
      return `Buscando ${entities.place ?? "la ubicación"}`;
    case "GO_HOME":
      return "Volviendo a la vista inicial";
    case "SHOW_LAYER":
      return `Mostrando la capa ${entities.layerName ?? ""}`;
    case "HIDE_LAYER":
      return `Ocultando la capa ${entities.layerName ?? ""}`;
    case "TOGGLE_LAYER":
      return `Alternando la capa ${entities.layerName ?? ""}`;
    case "CHANGE_BASEMAP": {
      const basemapLabels: Record<string, string> = {
        satellite: "satélite", hybrid: "imagen híbrida", streets: "calles",
        topographic: "topográfico", gray: "gris", "dark-gray": "oscuro",
        oceans: "marino", osm: "OpenStreetMap", terrain: "terreno",
      }
      const label = basemapLabels[entities.basemap ?? ""] ?? entities.basemap ?? ""
      return `Cambiando al mapa base ${label}`
    }
    case "MEASURE_DISTANCE":
      return "Activando medición de distancia";
    case "MEASURE_AREA":
      return "Activando medición de área";
    case "CLEAR_GRAPHICS":
      return "Limpiando el mapa";
    case "SHOW_LEGEND":
      return "Mostrando la leyenda";
    case "HIDE_LEGEND":
      return "Ocultando la leyenda";
    case "CLOSE_POPUP":
      return "Cerrando la ventana de información";
    case "ROTATE_NORTH":
      return "Orientando el mapa al norte";
    case "TILT_MAP":
      return "Activando vista 3D";
    case "SHOW_LAYERS_LIST":
      return "Mostrando lista de capas";
    case "UNKNOWN":
      return `No entendí el comando. ${intent.suggestion ?? "Intenta de nuevo"}`;
    default:
      return "Ejecutando acción";
  }
}
