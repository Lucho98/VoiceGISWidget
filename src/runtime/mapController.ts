import { loadArcGISJSAPIModule } from 'jimu-core'
import { type ParsedIntent, normalizeBasemap } from "./intentEngine"

export type AnyView = __esri.MapView | __esri.SceneView

// Track ArcGIS widget instances per view to avoid duplicates
const measurementWidgets = new WeakMap<AnyView, any>()
const legendWidgets = new WeakMap<AnyView, any>()

export interface ActionResult {
  success: boolean
  message: string
  detail?: string
}

export async function executeGISAction(
  view: AnyView,
  intent: ParsedIntent
): Promise<ActionResult> {
  try {
    switch (intent.intent) {
      case "ZOOM_IN":
        return await zoomIn(view, 2)

      case "ZOOM_OUT":
        return await zoomOut(view, 2)

      case "ZOOM_TO_LEVEL": {
        const level = parseInt(intent.entities.level ?? "10", 10)
        return await zoomToLevel(view, level)
      }

      case "GO_TO_PLACE": {
        const place = intent.entities.place
        if (!place) return fail("No se detectó un lugar en el comando")
        return await goToPlace(view, place)
      }

      case "GO_HOME":
        return await goHome(view)

      case "SHOW_LAYER": {
        const name = intent.entities.layerName
        if (!name) return fail("No se detectó el nombre de la capa")
        return setLayerVisibility(view, name, true)
      }

      case "HIDE_LAYER": {
        const name = intent.entities.layerName
        if (!name) return fail("No se detectó el nombre de la capa")
        return setLayerVisibility(view, name, false)
      }

      case "TOGGLE_LAYER": {
        const name = intent.entities.layerName
        if (!name) return fail("No se detectó el nombre de la capa")
        return toggleLayer(view, name)
      }

      case "CHANGE_BASEMAP": {
        const raw = intent.entities.basemap ?? "streets"
        return changeBasemap(view, raw)
      }

      case "ROTATE_NORTH":
        return await rotateNorth(view)

      case "TILT_MAP":
        return await tiltMap(view)

      case "CLEAR_GRAPHICS":
        return clearGraphics(view)

      case "SHOW_LAYERS_LIST":
        return listLayers(view)

      case "MEASURE_DISTANCE":
        return await measureDistance(view)

      case "MEASURE_AREA":
        return await measureArea(view)

      case "SHOW_LEGEND":
        return await showLegend(view)

      case "HIDE_LEGEND":
        return hideLegend(view)

      case "CLOSE_POPUP":
        return closePopup(view)

      case "UNKNOWN":
        return fail(intent.suggestion ?? "Comando no reconocido")

      default:
        return fail(`Acción "${intent.intent}" no implementada aún`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return fail(`Error ejecutando acción: ${msg}`)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ok(message: string, detail?: string): ActionResult {
  return { success: true, message, detail }
}
function fail(message: string, detail?: string): ActionResult {
  return { success: false, message, detail }
}

async function zoomIn(view: AnyView, delta = 2): Promise<ActionResult> {
  const current = view.zoom
  await view.goTo({ zoom: current + delta }, { animate: true, duration: 600 })
  return ok(`Zoom: ${Math.round(view.zoom)}`)
}

async function zoomOut(view: AnyView, delta = 2): Promise<ActionResult> {
  const current = view.zoom
  await view.goTo({ zoom: Math.max(1, current - delta) }, { animate: true, duration: 600 })
  return ok(`Zoom: ${Math.round(view.zoom)}`)
}

async function zoomToLevel(view: AnyView, level: number): Promise<ActionResult> {
  const clamped = Math.min(23, Math.max(1, level))
  await view.goTo({ zoom: clamped }, { animate: true, duration: 800 })
  return ok(`Zoom al nivel ${clamped}`)
}

async function goToPlace(view: AnyView, placeName: string): Promise<ActionResult> {
  const GEOCODER_URL = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer"
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locator = await loadArcGISJSAPIModule('esri/rest/locator') as any
    const result = await locator.addressToLocations(GEOCODER_URL, {
      address: { SingleLine: placeName },
      maxLocations: 1,
      outFields: ["*"],
    })

    if (!result || result.length === 0) {
      return fail(`No se encontró: "${placeName}"`)
    }

    const loc = result[0]
    await view.goTo(
      { target: loc.location, zoom: 14 },
      { animate: true, duration: 1200 }
    )
    return ok(`Navegando a ${loc.address ?? placeName}`)
  } catch {
    return fail(`Error al buscar "${placeName}". Verifica la conexión.`)
  }
}

async function goHome(view: AnyView): Promise<ActionResult> {
  await view.goTo(
    { center: [-74.297, 4.142], zoom: 6 },
    { animate: true, duration: 1000 }
  )
  return ok("Vista inicial restaurada")
}

function setLayerVisibility(
  view: AnyView,
  nameQuery: string,
  visible: boolean
): ActionResult {
  const layer = findLayerByName(view, nameQuery)
  if (!layer) {
    return fail(`No se encontró la capa "${nameQuery}"`, listLayerNames(view))
  }
  layer.visible = visible
  return ok(
    `Capa "${layer.title}" ${visible ? "activada" : "ocultada"}`,
    layer.id
  )
}

function toggleLayer(view: AnyView, nameQuery: string): ActionResult {
  const layer = findLayerByName(view, nameQuery)
  if (!layer) {
    return fail(`No se encontró la capa "${nameQuery}"`, listLayerNames(view))
  }
  layer.visible = !layer.visible
  return ok(`Capa "${layer.title}" ${layer.visible ? "activada" : "ocultada"}`)
}

function changeBasemap(view: AnyView, rawBasemap: string): ActionResult {
  const basemapId = normalizeBasemap(rawBasemap)
  // ArcGIS JS API 4.x acepta string directamente en view.map.basemap
  ;(view.map as any).basemap = basemapId
  return ok(`Mapa base cambiado a "${basemapId}"`)
}

async function rotateNorth(view: AnyView): Promise<ActionResult> {
  await view.goTo({ rotation: 0 }, { animate: true, duration: 500 })
  return ok("Mapa orientado al norte")
}

async function tiltMap(view: AnyView): Promise<ActionResult> {
  if ("tilt" in view) {
    await (view as __esri.SceneView).goTo({ tilt: 45 }, { animate: true })
    return ok("Vista 3D activada")
  }
  return fail("El mapa actual no soporta vista 3D (usa un SceneView)")
}

function clearGraphics(view: AnyView): ActionResult {
  view.graphics.removeAll()
  return ok("Gráficos eliminados del mapa")
}

function listLayers(view: AnyView): ActionResult {
  const names = listLayerNames(view)
  return ok(`Capas disponibles: ${names || "ninguna"}`)
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar tildes
    .replace(/\b(la|el|los|las|de|del|una|un|esa|ese|esos|esas|al|lo|se)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function layerMatchScore(queryText: string, layerTitle: string): number {
  const q = normalizeText(queryText)
  const t = normalizeText(layerTitle)
  if (!q || !t) return 0
  if (q === t) return 1.0
  if (t.includes(q) || q.includes(t)) return 0.9
  const qWords = q.split(" ").filter((w) => w.length > 1)
  const tWords = t.split(" ").filter((w) => w.length > 1)
  if (qWords.length === 0 || tWords.length === 0) return 0
  let matches = 0
  for (const qw of qWords) {
    if (tWords.some((tw) => tw.includes(qw) || qw.includes(tw))) matches++
  }
  return matches / Math.max(qWords.length, tWords.length)
}

function findLayerByName(view: AnyView, query: string): __esri.Layer | undefined {
  const q = normalizeText(query)
  if (!q) return undefined

  let found = view.map.allLayers.find((l) => l.title && normalizeText(l.title) === q)
  if (found) return found

  found = view.map.allLayers.find((l) => {
    if (!l.title) return false
    const t = normalizeText(l.title)
    return t.includes(q) || q.includes(t)
  })
  if (found) return found

  const qWords = q.split(" ").filter((w) => w.length > 1)
  return view.map.allLayers.find((l) => {
    if (!l.title) return false
    const tWords = normalizeText(l.title).split(" ").filter((w) => w.length > 1)
    return qWords.some((qw) => tWords.some((tw) => tw.includes(qw) || qw.includes(tw)))
  })
}

export function findBestLayerMatch(view: AnyView, text: string): __esri.Layer | undefined {
  let bestLayer: __esri.Layer | undefined
  let bestScore = 0
  view.map.allLayers.forEach((layer) => {
    if (!layer.title) return
    const score = layerMatchScore(text, layer.title)
    if (score > bestScore) {
      bestScore = score
      bestLayer = layer
    }
  })
  return bestScore >= 0.25 ? bestLayer : undefined
}

export function listLayerNames(view: AnyView): string {
  return view.map.allLayers
    .map((l) => l.title)
    .filter(Boolean)
    .join(", ")
}

async function measureDistance(view: AnyView): Promise<ActionResult> {
  try {
    const Measurement = await loadArcGISJSAPIModule('esri/widgets/Measurement') as any
    let meas = measurementWidgets.get(view)
    if (!meas) {
      meas = new Measurement({ view })
      view.ui.add(meas, 'bottom-left')
      measurementWidgets.set(view, meas)
    }
    meas.activeTool = 'distance'
    return ok("Medición de distancia activada. Haz clic en el mapa para medir.")
  } catch {
    return fail("No se pudo activar la herramienta de medición")
  }
}

async function measureArea(view: AnyView): Promise<ActionResult> {
  try {
    const Measurement = await loadArcGISJSAPIModule('esri/widgets/Measurement') as any
    let meas = measurementWidgets.get(view)
    if (!meas) {
      meas = new Measurement({ view })
      view.ui.add(meas, 'bottom-left')
      measurementWidgets.set(view, meas)
    }
    meas.activeTool = 'area'
    return ok("Medición de área activada. Haz clic en el mapa para medir.")
  } catch {
    return fail("No se pudo activar la herramienta de medición")
  }
}

async function showLegend(view: AnyView): Promise<ActionResult> {
  try {
    if (legendWidgets.get(view)) return ok("La leyenda ya está visible")
    const Legend = await loadArcGISJSAPIModule('esri/widgets/Legend') as any
    const legend = new Legend({ view })
    view.ui.add(legend, 'bottom-right')
    legendWidgets.set(view, legend)
    return ok("Leyenda mostrada")
  } catch {
    return fail("No se pudo mostrar la leyenda")
  }
}

function hideLegend(view: AnyView): ActionResult {
  const legend = legendWidgets.get(view)
  if (legend) {
    view.ui.remove(legend)
    legend.destroy()
    legendWidgets.delete(view)
    return ok("Leyenda ocultada")
  }
  return ok("La leyenda no estaba visible")
}

function closePopup(view: AnyView): ActionResult {
  const popup = (view as any).popup
  if (popup?.visible) {
    popup.close()
    return ok("Ventana de información cerrada")
  }
  return ok("No había ventana de información abierta")
}
