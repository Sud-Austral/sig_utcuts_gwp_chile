import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import api from '../api/client'

const PRIORITY_COLORS: Record<string, string> = {
  muy_alta: '#16a34a', alta: '#22c55e', media: '#eab308', baja: '#f97316', muy_baja: '#ef4444'
}

interface MapLayer {
  key: string
  label: string
  type: string
  color: string
  file?: string
  apiUrl?: string
  wmsUrl?: string
}

const MAP_LAYERS: MapLayer[] = [
  { key: 'regions', label: 'Regiones', type: 'db', color: '#3b82f6' },
  { key: 'provincias', label: 'Provincias', type: 'geojson', file: 'Provincias.json', color: '#9ca3af' },
  { key: 'communes', label: 'Comunas (Prioridad)', type: 'db', color: '#22c55e' },
  { key: 'viveros_forestales', label: 'Viveros Forestales 2025 (CONAF - Vector)', type: 'geojson', file: 'viveros_forestales.json', color: '#f97316' },
  { key: 'viveros_inscritos_2024', label: 'Viveros SAG 2024 (CIREN - Vector)', type: 'geojson', file: 'viveros_inscritos_2024.json', color: '#a855f7' },
  { key: 'areas_recupera_suelos', label: 'Conservación de Suelos (SIRSD - Vector)', type: 'geojson', file: 'areas_aptas_recuperacion_suelos.json', color: '#fbbf24' },
  { key: 'prog_recuperacion_suelos_degra', label: 'Programas SIRSD (CIREN - Vector)', type: 'geojson-api', apiUrl: '/layers/sirsd_programas/geojson', color: '#fb923c' },
  { key: 'plantaciones_forestales_2022', label: 'Plantaciones Forestales 2022 (INFOR - Vector)', type: 'geojson', file: 'plantaciones_forestales_2022.json', color: '#059669' },
  { key: 'interventions', label: 'Intervenciones Reales', type: 'geojson-api', apiUrl: '/interventions/geojson/all', color: '#e11d48' },
  { key: 'areas_protegidas', label: 'Áreas Protegidas', type: 'geojson', file: 'Areas_Protegidas.json', color: '#10b981' },
  { key: 'sitios_prioritarios', label: 'Sitios Prioritarios', type: 'geojson', file: 'sitios_prior_integrados.json', color: '#84cc16' },
  { key: 'ecmpo', label: 'Espacios ECMPO', type: 'geojson', file: 'ECMPO_geo.json', color: '#06b6d4' },
  { key: 'ecosistemas', label: 'Ecosistemas', type: 'geojson', file: 'Ecosistemas_simplified.json', color: '#b45309' },
]

interface LayerMetadata {
  description: string;
  origin: string;
  year: string;
  category: string;
  geometry: string;
}

const LAYER_METADATA: Record<string, LayerMetadata> = {
  regions: {
    description: 'Límites político-administrativos a nivel regional de la República de Chile, utilizados para el análisis territorial y filtros macro en el Geovisor.',
    origin: 'IDE Chile / Subdere',
    year: '2024',
    category: 'División Político-Administrativa',
    geometry: 'Polígono (MultiPolígono)'
  },
  provincias: {
    description: 'Límites provinciales de Chile que dividen administrativamente las regiones, facilitando la agregación y el análisis intermedio de los datos.',
    origin: 'IDE Chile',
    year: '2024',
    category: 'División Político-Administrativa',
    geometry: 'Polígono (MultiPolígono)'
  },
  communes: {
    description: 'Límites comunales oficiales con clasificación de prioridad territorial basada en vulnerabilidad socioambiental y potencial de restauración en el proyecto.',
    origin: 'IDE Chile / Elaboración propia',
    year: '2025',
    category: 'Priorización Territorial',
    geometry: 'Polígono (MultiPolígono)'
  },
  viveros_forestales: {
    description: 'Catastro nacional de viveros forestales productores de especies nativas y exóticas registrados por CONAF, clave para el abastecimiento de planes de reforestación.',
    origin: 'CONAF',
    year: '2025',
    category: 'Infraestructura Forestal',
    geometry: 'Puntos (Coordenadas)'
  },
  viveros_inscritos_2024: {
    description: 'Registro oficial de viveros y criaderos de plantas comerciales inscritos ante el Servicio Agrícola y Ganadero (SAG) para asegurar la sanidad del material vegetal.',
    origin: 'SAG / CIREN',
    year: '2024',
    category: 'Infraestructura Silvoagropecuaria',
    geometry: 'Puntos (Coordenadas)'
  },
  areas_recupera_suelos: {
    description: 'Zonificación de aptitud y clases de capacidad de uso para la conservación de suelos del SIRSD-S, mostrando las áreas aptas para la postulación a incentivos.',
    origin: 'CIREN / SAG',
    year: '2024',
    category: 'Conservación de Suelos',
    geometry: 'Polígono (MultiPolígono)'
  },
  prog_recuperacion_suelos_degra: {
    description: 'Proyectos y predios beneficiados por el Sistema de Incentivos para la Recuperación de Suelos Degradados (SIRSD) bajo concursos públicos vigentes.',
    origin: 'CIREN / SAG',
    year: '2024',
    category: 'Fomento Agropecuario',
    geometry: 'Polígono (MultiPolígono)'
  },
  plantaciones_forestales_2022: {
    description: 'Actualización cartográfica del catastro de plantaciones forestales por especie de la zona centro-sur del país, elaborado mediante teledetección.',
    origin: 'INFOR',
    year: '2022',
    category: 'Recursos Forestales',
    geometry: 'Polígono (MultiPolígono)'
  },
  interventions: {
    description: 'Intervenciones físicas reales del proyecto (restauración, forestación, conservación, manejo de bosque nativo, etc.) con su geometría asociada. Provienen en vivo de la tabla intervention_geometries, enriquecidas con datos de la intervención y el proyecto.',
    origin: 'CONAF / Elaboración propia',
    year: '2025',
    category: 'Intervenciones UTCUTS',
    geometry: 'Polígono / Punto (GeoJSON)'
  },
  areas_protegidas: {
    description: 'Límites del Sistema Nacional de Áreas Silvestres Protegidas del Estado (SNASPE) que incluyen Parques, Reservas y Monumentos Naturales bajo resguardo oficial.',
    origin: 'MMA / SIMBIO / CONAF',
    year: '2024',
    category: 'Biodiversidad y Conservación',
    geometry: 'Polígono (MultiPolígono)'
  },
  sitios_prioritarios: {
    description: 'Sitios priorizados por su alto valor en biodiversidad a nivel nacional y regional para la conservación de flora y fauna en la Estrategia Nacional de Biodiversidad.',
    origin: 'MMA / SIMBIO',
    year: '2024',
    category: 'Biodiversidad y Conservación',
    geometry: 'Polígono (MultiPolígono)'
  },
  ecmpo: {
    description: 'Espacios Costeros Marinos de Pueblos Originarios delimitados para asegurar el uso consuetudinario y la administración comunitaria costera.',
    origin: 'Subpesca',
    year: '2024',
    category: 'Borde Costero',
    geometry: 'Polígono (MultiPolígono)'
  },
  ecosistemas: {
    description: 'Clasificación simplificada de ecosistemas terrestres presentes en la zona de estudio, útil para caracterizar hábitats y zonas bioclimáticas.',
    origin: 'Ministerio del Medio Ambiente',
    year: '2024',
    category: 'Ecosistemas y Hábitat',
    geometry: 'Polígono (MultiPolígono)'
  }
};

const MAP_REGION_TO_CONAF: Record<string, string> = {
  "01": "TARAPACA",
  "02": "ANTOFAGASTA",
  "03": "ATACAMA",
  "04": "COQUIMBO",
  "05": "VALPARAISO",
  "06": "HIGGINS",
  "07": "MAULE",
  "08": "BIO",
  "09": "ARAUCANIA",
  "10": "LAGOS",
  "11": "AYSEN",
  "12": "MAGALLANES",
  "13": "METROPOLITANA",
  "14": "RIOS",
  "15": "PARINACOTA",
  "16": "ÑUBLE"
}

const MAP_REGION_TO_CIREN: Record<string, string> = {
  "01": "Tarapacá",
  "02": "Antofagasta",
  "03": "Atacama",
  "04": "Coquimbo",
  "05": "Valparaíso",
  "06": "O'Higgins",
  "07": "Maule",
  "08": "Biobío",
  "09": "Araucanía",
  "10": "Los Lagos",
  "11": "Aysén",
  "12": "Magallanes",
  "13": "Metropolitana",
  "14": "Los Ríos",
  "15": "Arica y Parinacota",
  "16": "Ñuble"
}

const SOIL_CONSERVATION_COLORS: Record<string, string> = {
  'MUY ALTAS O MUY INTENSAS MEDIDAS DE CONSERVACION': '#ef4444',
  'ALTAS O INTENSAS MEDIDAS DE CONSERVACION': '#f97316',
  'MODERADAS MEDIDAS DE CONSERVACION': '#eab308',
  'LIGERAS MEDIDAS DE CONSERVACION': '#22c55e',
  'NO CORRESPONDE': '#64748b',
  'SIN INFORMACION': '#475569'
}

function formatLabel(str: string): string {
  if (!str) return ""
  const lower = str.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function getStandardRegion2DigitCode(dbCode: string): string {
  if (!dbCode) return "";
  // Código ya en formato numérico de 1-2 dígitos (viene de Regional.json via codregion)
  if (/^\d{1,2}$/.test(dbCode)) return dbCode.padStart(2, '0');
  if (dbCode === "CL-CO") return "04";
  if (dbCode === "CL-VS") return "05";
  if (dbCode === "CL-ML") return "07";
  if (dbCode === "CL-BI") return "08";

  const match = dbCode.match(/CL-(?:R)?(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    return num.toString().padStart(2, '0');
  }
  return "";
}

function getFeatureBBox(geometry: any): [[number, number], [number, number]] | null {
  if (!geometry || !geometry.coordinates) return null;
  let coords: [number, number][] = [];
  
  const collectCoords = (obj: any) => {
    if (Array.isArray(obj)) {
      if (typeof obj[0] === 'number' && typeof obj[1] === 'number') {
        coords.push(obj as [number, number]);
      } else {
        obj.forEach(collectCoords);
      }
    }
  };
  
  collectCoords(geometry.coordinates);
  if (coords.length === 0) return null;
  
  let minLng = coords[0][0];
  let maxLng = coords[0][0];
  let minLat = coords[0][1];
  let maxLat = coords[0][1];
  
  for (let i = 1; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  
  return [[minLng, minLat], [maxLng, maxLat]];
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [selectedTerritory, setSelectedTerritory] = useState<any>(null)
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null)
  const [layerToggles, setLayerToggles] = useState<Record<string, boolean>>({
    regions: false,
    communes: false,
  })
  const [loadingLayers, setLoadingLayers] = useState<Record<string, boolean>>({})
  const [regionsList, setRegionsList] = useState<{ code: string; name: string }[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [layersList, setLayersList] = useState<MapLayer[]>(MAP_LAYERS)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [selectedConservationFilter, setSelectedConservationFilter] = useState<string>("")
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null)
  const [basemap, setBasemap] = useState<'osm' | 'satellite'>('osm')
  const regionsGeoJSON = useRef<any>(null)

  useEffect(() => {
    if (!mapContainer.current) return
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: { 
        version: 8, 
        sources: {
          'osm-tiles': { 
            type: 'raster', 
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], 
            tileSize: 256, 
            attribution: '© OpenStreetMap contributors' 
          },
          'satellite-tiles': { 
            type: 'raster', 
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], 
            tileSize: 256, 
            attribution: '© Esri, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' 
          }
        }, 
        layers: [
          { id: 'satellite', type: 'raster', source: 'satellite-tiles', layout: { visibility: 'none' } },
          { id: 'osm', type: 'raster', source: 'osm-tiles', layout: { visibility: 'visible' } }
        ] 
      },
      center: [-71.5, -35.0],
      zoom: 5,
    })
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.on('load', () => {
      setLoaded(true)
      loadGeoData()
    })
    return () => { map.current?.remove() }
  }, [])

  useEffect(() => {
    if (!map.current || !loaded) return
    map.current.setLayoutProperty('osm', 'visibility', basemap === 'osm' ? 'visible' : 'none')
    map.current.setLayoutProperty('satellite', 'visibility', basemap === 'satellite' ? 'visible' : 'none')
  }, [basemap, loaded])

  const loadGeoData = async () => {
    try {
      // Regiones: carga desde GeoJSON real (no desde la DB que tiene bounding boxes del seed)
      const regionsFetch = await fetch('/insumos/datos_geo/Regional.json')
      const regionsRaw = await regionsFetch.json()
      // Normalizar: agregar 'code' (codregion con padding) y 'name' (campo Region)
      const regionsData = {
        ...regionsRaw,
        features: regionsRaw.features.map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            code: String(f.properties.codregion).padStart(2, '0'),
            name: f.properties.Region,
          }
        }))
      }
      regionsGeoJSON.current = regionsData
      const list = regionsData.features.map((f: any) => ({
        code: f.properties.code,
        name: f.properties.name
      }))
      const uniqueList = list.filter((v: any, i: any, a: any) => a.findIndex((t: any) => t.code === v.code) === i)
      setRegionsList(uniqueList.sort((a: any, b: any) => a.name.localeCompare(b.name)))
      if (map.current && regionsData.features.length > 0) {
        const vis = layerToggles['regions'] ? 'visible' : 'none'
        map.current.addSource('regions', { type: 'geojson', data: regionsData })
        map.current.addLayer({ id: 'regions-fill', type: 'fill', source: 'regions',
          layout: { 'visibility': vis },
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.15 } })
        map.current.addLayer({ id: 'regions-line', type: 'line', source: 'regions',
          layout: { 'visibility': vis },
          paint: { 'line-color': '#60a5fa', 'line-width': 2 } })
        map.current.on('click', 'regions-fill', (e) => {
          if (e.features && e.features[0]) {
            setSelectedTerritory(null)
            setSelectedIntervention({ type: 'generic', label: 'Región', properties: e.features[0].properties })
          }
        })
        map.current.on('mouseenter', 'regions-fill', () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' })
        map.current.on('mouseleave', 'regions-fill', () => { if (map.current) map.current.getCanvas().style.cursor = '' })
      }

      // Comunas: carga desde GeoJSON real (no desde la DB que tiene bounding boxes del seed)
      const communesFetch = await fetch('/insumos/datos_geo/comunas.json')
      const communesRaw = await communesFetch.json()

      // Priorización: priority_class vive en prioritization_scores y se une a territories.code.
      // Normalizamos AMBOS lados a 5 dígitos porque cod_comuna (mapa) es número (ej. 2101) y
      // territories.code es string que a veces trae el cero adelante (ej. "02101").
      const normCode = (c: any) => String(c ?? '').replace(/\D/g, '').padStart(5, '0')
      const priorityByCode: Record<string, { priority_class: string | null; score_total: number | null }> = {}
      try {
        const rankRes = await api.get('/prioritization/ranking?limit=2000')
        if (Array.isArray(rankRes.data)) {
          rankRes.data.forEach((r: any) => {
            priorityByCode[normCode(r.territory_code)] = {
              priority_class: r.priority_class ?? null,
              score_total: r.score_total ?? null,
            }
          })
        }
        console.log(`[Comunas] priorización cargada: ${Object.keys(priorityByCode).length} comunas con priority_class`)
      } catch (e) {
        console.warn('[Comunas] no se pudo cargar /prioritization/ranking para colorear:', e)
      }

      // Normalizar: 'code', 'name', 'area_ha' + unir priority_class / priority_score por código normalizado
      const communesData = {
        ...communesRaw,
        features: communesRaw.features.map((f: any) => {
          const code = normCode(f.properties.cod_comuna)
          const prio = priorityByCode[code]
          return {
            ...f,
            properties: {
              ...f.properties,
              code,
              name: f.properties.Comuna,
              area_ha: Math.round((f.properties.st_area_sh || 0) / 10000),
              priority_class: prio ? prio.priority_class : null,
              priority_score: prio ? prio.score_total : null,
            }
          }
        })
      }
      if (map.current && communesData.features?.length > 0) {
        const vis = layerToggles['communes'] ? 'visible' : 'none'
        map.current.addSource('communes', { type: 'geojson', data: communesData })
        map.current.addLayer({ id: 'communes-fill', type: 'fill', source: 'communes',
          layout: { 'visibility': vis },
          paint: {
            'fill-color': ['match', ['get', 'priority_class'],
              'muy_alta', '#16a34a', 'alta', '#22c55e', 'media', '#eab308', 'baja', '#f97316', 'muy_baja', '#ef4444', '#64748b'],
            'fill-opacity': 0.5
          } })
        map.current.addLayer({ id: 'communes-line', type: 'line', source: 'communes',
          layout: { 'visibility': vis },
          paint: { 'line-color': '#94a3b8', 'line-width': 1 } })

        map.current.on('click', 'communes-fill', (e) => {
          if (e.features && e.features[0]) {
            setSelectedIntervention(null)
            setSelectedTerritory(e.features[0].properties)
          }
        })
        map.current.on('mouseenter', 'communes-fill', () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' })
        map.current.on('mouseleave', 'communes-fill', () => { if (map.current) map.current.getCanvas().style.cursor = '' })
      }

      reorderMapLayers(layersList)
    } catch (err) {
      console.error('Error loading geo data:', err)
    }
  }

  const reorderMapLayers = (orderedLayers: MapLayer[]) => {
    if (!map.current) return
    const reversed = [...orderedLayers].reverse()
    reversed.forEach(layer => {
      const suffixes = ['fill', 'line', 'circle', 'raster']
      suffixes.forEach(suffix => {
        const layerId = layer.key === 'provincias' && suffix === 'line'
          ? 'provincias-line'
          : layer.key === 'viveros_forestales' && suffix === 'circle'
          ? 'viveros_forestales-circle'
          : layer.key === 'viveros_inscritos_2024' && suffix === 'circle'
          ? 'viveros_inscritos_2024-circle'
          : `${layer.key}-${suffix}`

        if (map.current && map.current.getLayer(layerId)) {
          map.current.moveLayer(layerId)
        }
      })
    })
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newList = [...layersList]
    const draggedItem = newList[draggedIndex]
    newList.splice(draggedIndex, 1)
    newList.splice(index, 0, draggedItem)

    setLayersList(newList)
    setDraggedIndex(null)
    reorderMapLayers(newList)
  }

  const applyRegionFilter = (regionCode: string) => {
    if (!map.current) return

    const reg2Digit = getStandardRegion2DigitCode(regionCode)

    const setLayerFilterSafe = (layerId: string, filterExpr: any) => {
      if (map.current && map.current.getLayer(layerId)) {
        map.current.setFilter(layerId, filterExpr)
      }
    }

    const cirenVal = MAP_REGION_TO_CIREN[reg2Digit] || ""

    // Combined soil filter logic
    let soilFilter: any = null
    if (cirenVal && selectedConservationFilter) {
      soilFilter = ['all',
        ['==', ['to-string', ['get', 'region']], cirenVal],
        ['==', ['to-string', ['get', 'desccons']], selectedConservationFilter]
      ]
    } else if (cirenVal) {
      soilFilter = ['==', ['to-string', ['get', 'region']], cirenVal]
    } else if (selectedConservationFilter) {
      soilFilter = ['==', ['to-string', ['get', 'desccons']], selectedConservationFilter]
    }

    if (!reg2Digit) {
      setLayerFilterSafe('regions-fill', null)
      setLayerFilterSafe('regions-line', null)
      setLayerFilterSafe('provincias-line', null)
      setLayerFilterSafe('communes-fill', null)
      setLayerFilterSafe('communes-line', null)
      setLayerFilterSafe('viveros_forestales-circle', null)
      setLayerFilterSafe('viveros_inscritos_2024-circle', null)
      setLayerFilterSafe('areas_recupera_suelos-fill', soilFilter)
      setLayerFilterSafe('areas_recupera_suelos-line', soilFilter)

      layersList.forEach(layer => {
        if (layer.key === 'areas_recupera_suelos') {
          setLayerFilterSafe(`${layer.key}-fill`, soilFilter)
          setLayerFilterSafe(`${layer.key}-line`, soilFilter)
        } else {
          setLayerFilterSafe(`${layer.key}-fill`, null)
          setLayerFilterSafe(`${layer.key}-line`, null)
        }
        setLayerFilterSafe(`${layer.key}-circle`, null)
      })
      setLayerFilterSafe('interventions-fill', null)
      setLayerFilterSafe('interventions-line', null)
      setLayerFilterSafe('interventions-circle', null)
      return
    }

    const conafVal = MAP_REGION_TO_CONAF[reg2Digit] || ""
    const regNum = parseInt(reg2Digit, 10)

    // Filter regions layer to only show selected region
    const regionsFilter = ['==', ['to-string', ['get', 'code']], regionCode]
    setLayerFilterSafe('regions-fill', regionsFilter)
    setLayerFilterSafe('regions-line', regionsFilter)

    // Filter provincias by codregion
    const provinciasFilter = ['==', ['to-number', ['get', 'codregion']], regNum]
    setLayerFilterSafe('provincias-line', provinciasFilter)

    // Filter communes by first two digits of commune code
    const communesFilter = ['==', ['slice', ['to-string', ['get', 'code']], 0, 2], reg2Digit]
    setLayerFilterSafe('communes-fill', communesFilter)
    setLayerFilterSafe('communes-line', communesFilter)

    if (conafVal) {
      const viverosForestalesFilter = ['in', conafVal, ['upcase', ['to-string', ['get', 'region']]]]
      setLayerFilterSafe('viveros_forestales-circle', viverosForestalesFilter)
    }

    const viverosSagFilter = ['==', ['to-string', ['get', 'codreg']], reg2Digit]
    setLayerFilterSafe('viveros_inscritos_2024-circle', viverosSagFilter)

    setLayerFilterSafe('areas_recupera_suelos-fill', soilFilter)
    setLayerFilterSafe('areas_recupera_suelos-line', soilFilter)

    layersList.forEach(layer => {
      let filter: any = null
      if (layer.key.includes('interventions')) {
        filter = ['==', ['to-string', ['get', 'region_code']], reg2Digit]
      } else if (layer.key === 'viveros_forestales' && conafVal) {
        filter = ['in', conafVal, ['upcase', ['to-string', ['get', 'region']]]]
      } else if (layer.key === 'viveros_inscritos_2024') {
        filter = viverosSagFilter
      } else if (layer.key === 'areas_recupera_suelos') {
        filter = soilFilter
      } else if (layer.key === 'prog_recuperacion_suelos_degra') {
        filter = ['==', ['to-string', ['get', 'codreg']], reg2Digit]
      /*
      } else if (layer.key === 'plantaciones_forestales_2022') {
        filter = ['==', ['to-string', ['get', 'codreg']], reg2Digit]
      */
      } else if (layer.key === 'communes') {
        filter = communesFilter
      } else if (layer.key === 'regions') {
        filter = regionsFilter
      } else if (layer.key === 'provincias') {
        filter = provinciasFilter
      } else if (layer.key === 'sitios_prioritarios' && cirenVal) {
        filter = ['==', ['to-string', ['get', 'Region']], cirenVal]
      }

      if (filter) {
        setLayerFilterSafe(`${layer.key}-fill`, filter)
        setLayerFilterSafe(`${layer.key}-line`, filter)
        setLayerFilterSafe(`${layer.key}-circle`, filter)
      }
    })

    const interventionsFilter = ['==', ['to-string', ['get', 'region_code']], reg2Digit]
    setLayerFilterSafe('interventions-fill', interventionsFilter)
    setLayerFilterSafe('interventions-line', interventionsFilter)
    setLayerFilterSafe('interventions-circle', interventionsFilter)
  }

  useEffect(() => {
    if (loaded) {
      applyRegionFilter(selectedRegion)
      
      if (selectedRegion && regionsGeoJSON.current) {
        const feature = regionsGeoJSON.current.features.find(
          (f: any) => f.properties.code === selectedRegion
        )
        if (feature) {
          const bbox = getFeatureBBox(feature.geometry)
          if (bbox && map.current) {
            map.current.fitBounds(bbox as any, { padding: 40, duration: 1000 })
          }
        }
      } else if (!selectedRegion && map.current) {
        map.current.easeTo({
          center: [-71.5, -35.0],
          zoom: 5,
          duration: 1000
        })
      }
    }
  }, [selectedRegion, loaded, selectedConservationFilter])

  const handleLayerToggle = async (key: string, checked: boolean) => {
    setLayerToggles(prev => ({ ...prev, [key]: checked }))
    if (!map.current) return

    const layerInfo = MAP_LAYERS.find(l => l.key === key)
    if (!layerInfo) return

    const vis = checked ? 'visible' : 'none'

    // If source exists, toggle all layers
    if (map.current.getSource(key)) {
      if (checked) {
        const existingSrc: any = map.current.getSource(key)
        console.log(`[Capa "${layerInfo.label}" (${key})] GeoJSON desplegado:`, existingSrc?._data)
      }
      if (layerInfo.type === 'wms') {
        map.current.setLayoutProperty(`${key}-raster`, 'visibility', vis)
      } else if (key === 'provincias') {
        map.current.setLayoutProperty('provincias-line', 'visibility', vis)
      } else if (key === 'viveros_forestales') {
        map.current.setLayoutProperty('viveros_forestales-circle', 'visibility', vis)
      } else if (key === 'viveros_inscritos_2024') {
        map.current.setLayoutProperty('viveros_inscritos_2024-circle', 'visibility', vis)
      } else if (key === 'areas_recupera_suelos') {
        map.current.setLayoutProperty('areas_recupera_suelos-fill', 'visibility', vis)
        map.current.setLayoutProperty('areas_recupera_suelos-line', 'visibility', vis)
      } else if (key.includes('interventions')) {
        map.current.setLayoutProperty(`${key}-fill`, 'visibility', vis)
        map.current.setLayoutProperty(`${key}-line`, 'visibility', vis)
        map.current.setLayoutProperty(`${key}-circle`, 'visibility', vis)
      } else {
        if (map.current.getLayer(`${key}-fill`)) {
          map.current.setLayoutProperty(`${key}-fill`, 'visibility', vis)
        }
        if (map.current.getLayer(`${key}-line`)) {
          map.current.setLayoutProperty(`${key}-line`, 'visibility', vis)
        }
        if (map.current.getLayer(`${key}-circle`)) {
          map.current.setLayoutProperty(`${key}-circle`, 'visibility', vis)
        }
      }
      reorderMapLayers(layersList)
      applyRegionFilter(selectedRegion)
      return
    }

    // Lazy load the geojson layer from file
    if (checked && layerInfo.type === 'geojson' && layerInfo.file) {
      setLoadingLayers(prev => ({ ...prev, [key]: true }))
      try {
        const fetchRes = await fetch(`/insumos/datos_geo/${layerInfo.file}`)
        if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`)
        const geoData = await fetchRes.json()
        console.log(`[Capa "${layerInfo.label}" (${key})] GeoJSON cargado desde /insumos/datos_geo/${layerInfo.file} — ${geoData?.features?.length ?? 0} features:`, geoData)
        if (map.current && !map.current.getSource(key)) {
          map.current.addSource(key, { type: 'geojson', data: geoData })

          if (key === 'provincias') {
            map.current.addLayer({
              id: 'provincias-line',
              type: 'line',
              source: key,
              paint: { 'line-color': layerInfo.color, 'line-width': 2 }
            })
            map.current.on('click', 'provincias-line', (e) => {
              if (e.features && e.features[0]) {
                setSelectedTerritory(null)
                setSelectedIntervention({ type: 'generic', label: 'Provincia', properties: e.features[0].properties })
              }
            })
            map.current.on('mouseenter', 'provincias-line', () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' })
            map.current.on('mouseleave', 'provincias-line', () => { if (map.current) map.current.getCanvas().style.cursor = '' })
          } else if (key === 'viveros_forestales') {
            map.current.addLayer({
              id: `${key}-circle`,
              type: 'circle',
              source: key,
              paint: {
                'circle-color': layerInfo.color,
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 12, 10],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.85
              }
            })
            
            // Add click/hover handlers for viveros
            map.current.on('click', `${key}-circle`, (e) => {
              if (e.features && e.features[0]) {
                const props = e.features[0].properties
                setSelectedTerritory(null)
                setSelectedIntervention({
                  type: 'vivero_forestal',
                  properties: props
                })
              }
            })
            
            const handleMouseEnter = () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' }
            const handleMouseLeave = () => { if (map.current) map.current.getCanvas().style.cursor = '' }
            map.current.on('mouseenter', `${key}-circle`, handleMouseEnter)
            map.current.on('mouseleave', `${key}-circle`, handleMouseLeave)
          } else if (key === 'viveros_inscritos_2024') {
            map.current.addLayer({
              id: `${key}-circle`,
              type: 'circle',
              source: key,
              paint: {
                'circle-color': layerInfo.color,
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 12, 10],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.85
              }
            })
            
            // Add click/hover handlers for viveros SAG
            map.current.on('click', `${key}-circle`, (e) => {
              if (e.features && e.features[0]) {
                const props = e.features[0].properties
                setSelectedTerritory(null)
                setSelectedIntervention({
                  type: 'vivero_sag',
                  properties: props
                })
              }
            })
            
            const handleMouseEnter = () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' }
            const handleMouseLeave = () => { if (map.current) map.current.getCanvas().style.cursor = '' }
            map.current.on('mouseenter', `${key}-circle`, handleMouseEnter)
            map.current.on('mouseleave', `${key}-circle`, handleMouseLeave)
          } else if (key === 'areas_recupera_suelos') {
            const fillExpression: any = [
              'match',
              ['to-string', ['get', 'desccons']],
              'MUY ALTAS O MUY INTENSAS MEDIDAS DE CONSERVACION', '#ef4444',
              'ALTAS O INTENSAS MEDIDAS DE CONSERVACION', '#f97316',
              'MODERADAS MEDIDAS DE CONSERVACION', '#eab308',
              'LIGERAS MEDIDAS DE CONSERVACION', '#22c55e',
              'NO CORRESPONDE', '#64748b',
              'SIN INFORMACION', '#475569',
              layerInfo.color
            ]

            map.current.addLayer({
              id: `${key}-fill`,
              type: 'fill',
              source: key,
              paint: {
                'fill-color': fillExpression,
                'fill-opacity': 0.45
              }
            })
            map.current.addLayer({
              id: `${key}-line`,
              type: 'line',
              source: key,
              paint: {
                'line-color': fillExpression,
                'line-width': 1
              }
            })
            
            // Add click/hover handlers for soil recovery areas
            map.current.on('click', `${key}-fill`, (e) => {
              if (e.features && e.features[0]) {
                const props = e.features[0].properties
                setSelectedTerritory(null)
                setSelectedIntervention({
                  type: 'aptitud_suelo',
                  properties: props
                })
              }
            })
            
            const handleMouseEnter = () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' }
            const handleMouseLeave = () => { if (map.current) map.current.getCanvas().style.cursor = '' }
            map.current.on('mouseenter', `${key}-fill`, handleMouseEnter)
            map.current.on('mouseleave', `${key}-fill`, handleMouseLeave)
          } else if (key === 'prog_recuperacion_suelos_degra') {
            map.current.addLayer({
              id: `${key}-fill`,
              type: 'fill',
              source: key,
              paint: {
                'fill-color': layerInfo.color,
                'fill-opacity': 0.4
              }
            })
            map.current.addLayer({
              id: `${key}-line`,
              type: 'line',
              source: key,
              paint: {
                'line-color': layerInfo.color,
                'line-width': 1.5
              }
            })
            map.current.on('click', `${key}-fill`, (e) => {
              if (e.features && e.features[0]) {
                const props = e.features[0].properties
                setSelectedTerritory(null)
                setSelectedIntervention({
                  type: 'sirsd_programa',
                  properties: props
                })
              }
            })
            const handleMouseEnter = () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' }
            const handleMouseLeave = () => { if (map.current) map.current.getCanvas().style.cursor = '' }
            map.current.on('mouseenter', `${key}-fill`, handleMouseEnter)
            map.current.on('mouseleave', `${key}-fill`, handleMouseLeave)
          } else if (key === 'plantaciones_forestales_2022') {
            // Render plantaciones desde archivo estático (la tabla DB suele venir vacía / sin geom_geojson)
            map.current.addLayer({
              id: `${key}-fill`,
              type: 'fill',
              source: key,
              paint: { 'fill-color': layerInfo.color, 'fill-opacity': 0.4 }
            })
            map.current.addLayer({
              id: `${key}-line`,
              type: 'line',
              source: key,
              paint: { 'line-color': layerInfo.color, 'line-width': 1 }
            })
            map.current.on('click', `${key}-fill`, (e) => {
              if (e.features && e.features[0]) {
                setSelectedTerritory(null)
                setSelectedIntervention({
                  type: 'plantacion_forestal_2022',
                  properties: e.features[0].properties
                })
              }
            })
            const handleMouseEnter = () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' }
            const handleMouseLeave = () => { if (map.current) map.current.getCanvas().style.cursor = '' }
            map.current.on('mouseenter', `${key}-fill`, handleMouseEnter)
            map.current.on('mouseleave', `${key}-fill`, handleMouseLeave)
          } else if (key.includes('interventions')) {
            // Render interventions from static file with points and polygons
            map.current.addLayer({
              id: `${key}-fill`,
              type: 'fill',
              source: key,
              paint: { 'fill-color': layerInfo.color, 'fill-opacity': 0.45 }
            })
            map.current.addLayer({
              id: `${key}-line`,
              type: 'line',
              source: key,
              paint: { 'line-color': layerInfo.color, 'line-width': 2 }
            })
            map.current.addLayer({
              id: `${key}-circle`,
              type: 'circle',
              source: key,
              paint: {
                'circle-color': layerInfo.color,
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
              }
            })

            // Interventions click/hover handlers
            const handleInterventionClick = (e: any) => {
              if (e.features && e.features[0]) {
                setSelectedTerritory(null)
                setSelectedIntervention({
                  type: 'real_intervention',
                  properties: e.features[0].properties
                })
              }
            }
            map.current.on('click', `${key}-fill`, handleInterventionClick)
            map.current.on('click', `${key}-circle`, handleInterventionClick)

            const handleMouseEnter = () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' }
            const handleMouseLeave = () => { if (map.current) map.current.getCanvas().style.cursor = '' }
            map.current.on('mouseenter', `${key}-fill`, handleMouseEnter)
            map.current.on('mouseenter', `${key}-circle`, handleMouseEnter)
            map.current.on('mouseleave', `${key}-fill`, handleMouseLeave)
            map.current.on('mouseleave', `${key}-circle`, handleMouseLeave)
          } else {
            // Standard geojson files
            map.current.addLayer({
              id: `${key}-fill`,
              type: 'fill',
              source: key,
              paint: { 'fill-color': layerInfo.color, 'fill-opacity': 0.25 }
            })
            map.current.addLayer({
              id: `${key}-line`,
              type: 'line',
              source: key,
              paint: {
                'line-color': layerInfo.color,
                'line-width': 1.5
              }
            })
            map.current.on('click', `${key}-fill`, (e) => {
              if (e.features && e.features[0]) {
                setSelectedTerritory(null)
                setSelectedIntervention({ type: 'generic', label: layerInfo.label, properties: e.features[0].properties })
              }
            })
            map.current.on('mouseenter', `${key}-fill`, () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' })
            map.current.on('mouseleave', `${key}-fill`, () => { if (map.current) map.current.getCanvas().style.cursor = '' })
          }
          reorderMapLayers(layersList)
          applyRegionFilter(selectedRegion)
        }
      } catch (err) {
        console.error(`Error loading layer ${key}:`, err)
      } finally {
        setLoadingLayers(prev => ({ ...prev, [key]: false }))
      }
    }

    // Lazy load the geojson layer from api
    if (checked && layerInfo.type === 'geojson-api' && layerInfo.apiUrl) {
      setLoadingLayers(prev => ({ ...prev, [key]: true }))
      try {
        const res = await api.get(layerInfo.apiUrl)
        console.log(`[Capa "${layerInfo.label}" (${key})] GeoJSON cargado desde API ${layerInfo.apiUrl} — ${res.data?.features?.length ?? 0} features:`, res.data)
        if (map.current && !map.current.getSource(key)) {
          map.current.addSource(key, { type: 'geojson', data: res.data })
          
          const features = res.data?.features || []
          const hasPoints = features.some((f: any) => f.geometry?.type === 'Point' || f.geometry?.type === 'MultiPoint')
          const hasPolygons = features.some((f: any) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')

          // Click/hover handlers for interventions
          const handleInterventionClick = (e: any) => {
            if (e.features && e.features[0]) {
              setSelectedTerritory(null)
              let type = 'real_intervention'
              if (key === 'plantaciones_forestales_2022') {
                type = 'plantacion_forestal_2022'
              } else if (key === 'prog_recuperacion_suelos_degra') {
                type = 'sirsd_programa'
              }
              setSelectedIntervention({
                type: type,
                properties: e.features[0].properties
              })
            }
          }
          const handleMouseEnter = () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer' }
          const handleMouseLeave = () => { if (map.current) map.current.getCanvas().style.cursor = '' }

          if (hasPolygons || (!hasPoints && !hasPolygons)) {
            map.current.addLayer({
              id: `${key}-fill`,
              type: 'fill',
              source: key,
              paint: { 'fill-color': layerInfo.color, 'fill-opacity': 0.45 }
            })
            map.current.addLayer({
              id: `${key}-line`,
              type: 'line',
              source: key,
              paint: { 'line-color': layerInfo.color, 'line-width': 2 }
            })
            map.current.on('click', `${key}-fill`, handleInterventionClick)
            map.current.on('mouseenter', `${key}-fill`, handleMouseEnter)
            map.current.on('mouseleave', `${key}-fill`, handleMouseLeave)
          }

          if (hasPoints) {
            map.current.addLayer({
              id: `${key}-circle`,
              type: 'circle',
              source: key,
              paint: {
                'circle-color': layerInfo.color,
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
              }
            })
            map.current.on('click', `${key}-circle`, handleInterventionClick)
            map.current.on('mouseenter', `${key}-circle`, handleMouseEnter)
            map.current.on('mouseleave', `${key}-circle`, handleMouseLeave)
          }

          reorderMapLayers(layersList)
          applyRegionFilter(selectedRegion)
        }
      } catch (err) {
        console.error(`Error loading API layer ${key}:`, err)
      } finally {
        setLoadingLayers(prev => ({ ...prev, [key]: false }))
      }
    }

    // Lazy load WMS raster layer
    if (checked && layerInfo.type === 'wms' && layerInfo.wmsUrl) {
      if (map.current && !map.current.getSource(key)) {
        map.current.addSource(key, {
          type: 'raster',
          tiles: [layerInfo.wmsUrl],
          tileSize: 256
        })
        map.current.addLayer({
          id: `${key}-raster`,
          type: 'raster',
          source: key,
          paint: { 'raster-opacity': 0.65 }
        })
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Layer panel */}
      <div className="w-72 glass-card p-4 space-y-4 overflow-y-auto flex-shrink-0">
        {/* Region Filter */}
        <div className="space-y-1.5 pb-3 border-b border-ocean-700/50">
          <label className="text-[10px] font-bold text-ocean-400 uppercase tracking-wider block">
            Filtro de Región
          </label>
          <select
             value={selectedRegion}
             onChange={(e) => setSelectedRegion(e.target.value)}
             className="w-full bg-[#131b2e] text-xs text-white border border-ocean-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-forest-500 transition-colors"
          >
            <option value="" className="bg-[#131b2e] text-white">Todas las regiones</option>
            {regionsList.map((reg) => (
              <option key={reg.code} value={reg.code} className="bg-[#131b2e] text-white">
                {reg.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Mapa Base */}
        <div className="space-y-1.5 pb-3 border-b border-ocean-700/50">
          <label className="text-[10px] font-bold text-ocean-400 uppercase tracking-wider block">
            Mapa Base
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBasemap('osm')}
              className={`flex-1 text-[11px] py-1.5 px-2.5 rounded border transition-all font-medium ${
                basemap === 'osm'
                  ? 'bg-forest-600/20 text-forest-400 border-forest-500/50 shadow-sm'
                  : 'bg-[#131b2e] text-ocean-300 border-ocean-800 hover:text-white hover:border-ocean-700'
              }`}
            >
              🗺️ Calle (OSM)
            </button>
            <button
              type="button"
              onClick={() => setBasemap('satellite')}
              className={`flex-1 text-[11px] py-1.5 px-2.5 rounded border transition-all font-medium ${
                basemap === 'satellite'
                  ? 'bg-forest-600/20 text-forest-400 border-forest-500/50 shadow-sm'
                  : 'bg-[#131b2e] text-ocean-300 border-ocean-800 hover:text-white hover:border-ocean-700'
              }`}
            >
              🛰️ Satélite (Esri)
            </button>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-white">Capas</h3>
        <div className="space-y-2">
          {layersList.map((layer, idx) => (
            <div key={layer.key} className="space-y-1">
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={() => setDraggedIndex(null)}
                className={`flex items-center justify-between py-1 px-1.5 rounded transition-all select-none cursor-grab active:cursor-grabbing ${
                  draggedIndex === idx 
                    ? 'opacity-30 border border-dashed border-forest-500/50 bg-[#131b2e]' 
                    : 'hover:bg-[#182235]'
                }`}
                title={layer.label}
              >
                <label className="flex items-start gap-2 text-sm text-ocean-300 cursor-pointer hover:text-white transition-colors flex-1 min-w-0">
                  <span className="text-ocean-500 hover:text-ocean-300 mr-0.5 select-none flex-shrink-0 text-xs font-semibold">
                    ⋮⋮
                  </span>
                  <input type="checkbox" checked={layerToggles[layer.key] || false}
                    disabled={loadingLayers[layer.key]}
                    onChange={(e) => handleLayerToggle(layer.key, e.target.checked)}
                    className="rounded accent-forest-500 flex-shrink-0 mt-[3px]" />
                  <span className="w-3 h-3 rounded-full flex-shrink-0 mt-[4px]" style={{ background: layer.color }}></span>
                  <span className="text-xs leading-normal py-0.5 flex-1 min-w-0 break-words whitespace-normal">{layer.label}</span>
                </label>
                
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                  {loadingLayers[layer.key] && (
                    <span className="text-[10px] text-ocean-400 animate-pulse font-mono flex-shrink-0">...</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setExpandedLayer(expandedLayer === layer.key ? null : layer.key);
                    }}
                    className={`p-1 rounded transition-colors flex-shrink-0 self-center ${
                      expandedLayer === layer.key 
                        ? 'text-forest-400 bg-forest-950/40' 
                        : 'text-ocean-400 hover:text-white hover:bg-ocean-800/40'
                    }`}
                    title="Ver descripción de la capa"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {expandedLayer === layer.key && (
                <div className="bg-[#0b0f19] border border-ocean-800/70 rounded p-2.5 text-[11px] text-ocean-300 space-y-2 mx-1 shadow-lg animate-fadeIn">
                  <p className="font-normal text-white/95 leading-relaxed">
                    {LAYER_METADATA[layer.key]?.description || 'Sin descripción disponible.'}
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1.5 border-t border-ocean-800/50 text-[10px]">
                    <div>
                      <span className="text-ocean-500 font-bold block uppercase tracking-wider text-[9px]">Origen</span>
                      <span className="text-white/90 font-medium">{LAYER_METADATA[layer.key]?.origin || 'No especificado'}</span>
                    </div>
                    <div>
                      <span className="text-ocean-500 font-bold block uppercase tracking-wider text-[9px]">Año / Vigencia</span>
                      <span className="text-white/90 font-medium">{LAYER_METADATA[layer.key]?.year || 'No especificado'}</span>
                    </div>
                    <div>
                      <span className="text-ocean-500 font-bold block uppercase tracking-wider text-[9px]">Categoría</span>
                      <span className="text-white/90 font-medium">{LAYER_METADATA[layer.key]?.category || 'No especificado'}</span>
                    </div>
                    <div>
                      <span className="text-ocean-500 font-bold block uppercase tracking-wider text-[9px]">Geometría</span>
                      <span className="text-white/90 font-medium">{LAYER_METADATA[layer.key]?.geometry || 'No especificado'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="pt-4 border-t border-ocean-700/50">
          <h4 className="text-xs font-semibold text-ocean-400 mb-2 uppercase tracking-wider">Leyenda de prioridad</h4>
          {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2 text-xs text-ocean-300 mb-1">
              <span className="w-3 h-3 rounded" style={{ background: color }}></span>
              {key === 'muy_alta' ? 'Muy Alta' : key === 'alta' ? 'Alta' : key === 'media' ? 'Media' : key === 'baja' ? 'Baja' : 'Muy Baja'}
            </div>
          ))}
        </div>

        {/* Leyenda de Conservación de Suelos */}
        {layerToggles['areas_recupera_suelos'] && (
          <div className="pt-4 border-t border-ocean-700/50 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-ocean-400 uppercase tracking-wider">
                Conservación de Suelos
              </h4>
              {selectedConservationFilter && (
                <button
                  onClick={() => setSelectedConservationFilter("")}
                  className="text-[10px] text-forest-400 hover:text-forest-300 underline transition-colors"
                >
                  Limpiar filtro
                </button>
              )}
            </div>
            <div className="space-y-1">
              {Object.entries(SOIL_CONSERVATION_COLORS).map(([label, color]) => {
                const isSelected = selectedConservationFilter === label
                const isAnySelected = !!selectedConservationFilter
                return (
                  <div
                    key={label}
                    onClick={() => setSelectedConservationFilter(isSelected ? "" : label)}
                    className={`flex items-start gap-2 text-xs cursor-pointer p-1 rounded hover:bg-ocean-800/30 transition-all ${
                      isSelected 
                        ? 'bg-forest-500/10 text-white font-medium border border-forest-500/20' 
                        : isAnySelected 
                        ? 'text-ocean-500 opacity-60' 
                        : 'text-ocean-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded flex-shrink-0 mt-[2px]" style={{ background: color }}></span>
                    <span className="leading-tight break-words">
                      {formatLabel(label)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden border border-ocean-800/50">
        <div ref={mapContainer} className="map-container w-full h-full" />
      </div>

      {/* Info panel */}
      {selectedTerritory && (
        <div className="w-72 glass-card p-4 space-y-3 overflow-y-auto flex-shrink-0 animate-slide-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Ficha Territorial</h3>
            <button onClick={() => setSelectedTerritory(null)} className="text-ocean-400 hover:text-white text-lg">×</button>
          </div>
          <div className="space-y-2">
            <div><span className="text-xs text-ocean-400">Nombre</span><p className="text-sm text-white font-medium">{selectedTerritory.name}</p></div>
            <div><span className="text-xs text-ocean-400">Código</span><p className="text-sm text-ocean-300">{selectedTerritory.code}</p></div>
            <div><span className="text-xs text-ocean-400">Superficie</span><p className="text-sm text-ocean-300">{selectedTerritory.area_ha?.toLocaleString()} ha</p></div>
            <div><span className="text-xs text-ocean-400">Puntaje de Prioridad</span><p className="text-lg font-bold text-white">{selectedTerritory.priority_score?.toFixed(1) || '—'}</p></div>
            <div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium badge-${selectedTerritory.priority_class}`}>
                {selectedTerritory.priority_class === 'muy_alta' ? 'Muy Alta' : selectedTerritory.priority_class === 'alta' ? 'Alta' : selectedTerritory.priority_class === 'media' ? 'Media' : selectedTerritory.priority_class === 'baja' ? 'Baja' : selectedTerritory.priority_class === 'muy_baja' ? 'Muy Baja' : 'Sin priorización'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Intervention info panel */}
      {selectedIntervention && (
        <div className="w-72 glass-card p-4 space-y-3 overflow-y-auto flex-shrink-0 animate-slide-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Ficha de Intervención</h3>
            <button onClick={() => setSelectedIntervention(null)} className="text-ocean-400 hover:text-white text-lg">×</button>
          </div>
          <div className="space-y-3">
            {/* PANEL GENÉRICO — capas sin ficha específica (regiones, provincias, áreas protegidas, etc.) */}
            {selectedIntervention.type === 'generic' && (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Capa</span>
                  <p className="text-sm text-white font-semibold mt-0.5">{selectedIntervention.label || 'Detalle'}</p>
                </div>
                <div className="space-y-1.5 pt-1.5 border-t border-ocean-800/30">
                  {Object.entries(selectedIntervention.properties || {})
                    .filter(([k, v]) => v !== null && v !== undefined && v !== '' && !['id', 'objectid'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold text-ocean-400 flex-shrink-0">{k}</span>
                        <span className="text-xs text-ocean-200 text-right break-words">{String(v)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {/* VIVEROS FORESTALES */}
            {selectedIntervention.type === 'vivero_forestal' && (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Vivero Forestal (CONAF)</span>
                  <p className="text-sm text-white font-semibold uppercase mt-0.5">{selectedIntervention.properties.vivero || 'No indicado'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Propietario / Encargado</span>
                  <p className="text-sm text-white font-medium mt-0.5">{selectedIntervention.properties.propietari || selectedIntervention.properties.encargado || 'No indicado'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-ocean-800/30 pt-1.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Especie Principal</span>
                    <p className="text-xs text-ocean-200 mt-0.5 font-medium">{selectedIntervention.properties.especie_co || 'No indicado'}</p>
                    <p className="text-[10px] text-ocean-400 italic">{selectedIntervention.properties.especie_ci}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Stock Existencias</span>
                    <p className="text-xs text-forest-300 font-bold mt-0.5">{selectedIntervention.properties.existencia || '0'} plantas</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Destino Producción</span>
                    <p className="text-xs text-ocean-200 capitalize mt-0.5">{selectedIntervention.properties.destino || 'No indicado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Contenedor</span>
                    <p className="text-xs text-ocean-200 capitalize mt-0.5">{selectedIntervention.properties.contenedor || 'No indicado'}</p>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Tecnología de Producción</span>
                  <p className="text-xs text-ocean-300 mt-0.5">{selectedIntervention.properties.tecnologia || 'No indicada'}</p>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Dirección</span>
                  <p className="text-xs text-ocean-300 mt-0.5">{selectedIntervention.properties.direccion || 'No indicada'}</p>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Comuna</span>
                    <p className="text-[10px] text-ocean-300 truncate mt-0.5">{selectedIntervention.properties.comuna || 'No indicada'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Provincia</span>
                    <p className="text-[10px] text-ocean-300 truncate mt-0.5">{selectedIntervention.properties.provincia || 'No indicada'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Región</span>
                    <p className="text-[10px] text-ocean-300 truncate mt-0.5">{selectedIntervention.properties.region || 'No indicada'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Contacto</span>
                    <p className="text-[10px] text-ocean-300 mt-0.5">{selectedIntervention.properties.contacto || 'No indicado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Fecha Censo</span>
                    <p className="text-[10px] text-ocean-300 mt-0.5">{selectedIntervention.properties.fecha_cens || 'No indicada'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* VIVEROS SAG */}
            {selectedIntervention.type === 'vivero_sag' && (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Vivero Registrado SAG</span>
                  <p className="text-sm text-white font-semibold uppercase mt-0.5">{selectedIntervention.properties.nom_vivero || 'No indicado'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-ocean-800/30 pt-1.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Registro SAG</span>
                    <p className="text-xs text-forest-300 font-bold mt-0.5">{selectedIntervention.properties.reg_sag || 'S/I'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Superficie Declarada</span>
                    <p className="text-xs text-white mt-0.5">{selectedIntervention.properties.sup_ha ? `${selectedIntervention.properties.sup_ha} ha` : 'No registrada'}</p>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Especies Propagadas</span>
                  <p className="text-xs text-ocean-200 mt-0.5 font-medium">
                    {[selectedIntervention.properties.sp_1, selectedIntervention.properties.sp_2, selectedIntervention.properties.sp_3]
                      .filter(sp => sp && sp !== 'S/I' && sp !== 'S/D')
                      .join(', ') || 'Especies no especificadas'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Oficina SAG</span>
                    <p className="text-xs text-ocean-300 mt-0.5">{selectedIntervention.properties.oficina || 'S/I'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Distribución</span>
                    <p className="text-xs text-ocean-300 capitalize mt-0.5">{selectedIntervention.properties.urba_rural || 'S/I'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Comuna</span>
                    <p className="text-xs text-ocean-300 mt-0.5">{selectedIntervention.properties.nom_com || 'No indicada'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Tipo de Venta</span>
                    <p className="text-xs text-ocean-300 mt-0.5">
                      {selectedIntervention.properties.tipo_consu === 'C' ? 'Comercial' : 
                       selectedIntervention.properties.tipo_consu === 'A' ? 'Autoconsumo' : 
                       selectedIntervention.properties.tipo_consu || 'S/I'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* REAL INTERVENTIONS */}
            {selectedIntervention.type === 'real_intervention' && (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Proyecto</span>
                  <p className="text-sm text-white font-semibold uppercase mt-0.5">{selectedIntervention.properties.project_name}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Tipo de Intervención</span>
                  <p className="text-sm text-white capitalize mt-0.5">
                    {selectedIntervention.properties.type === 'restoration' ? 'Restauración' : 
                     selectedIntervention.properties.type === 'afforestation' ? 'Forestación' : 
                     selectedIntervention.properties.type === 'conservation' ? 'Conservación' : 
                     selectedIntervention.properties.type === 'native_forest_management' ? 'Manejo Bosque Nativo' : 
                     selectedIntervention.properties.type === 'fire_prevention' ? 'Prevención Incendios' : 
                     selectedIntervention.properties.type}
                  </p>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Componente NDC</span>
                  <p className="text-xs text-ocean-300 mt-0.5">{selectedIntervention.properties.ndc_component || 'No especificado'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Superficie Estimada</span>
                    <p className="text-xs text-ocean-300 mt-0.5">{selectedIntervention.properties.hectares_estimated?.toLocaleString()} ha</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Superficie Verificada</span>
                    <p className="text-xs text-forest-300 font-bold mt-0.5">{selectedIntervention.properties.hectares_verified?.toLocaleString()} ha</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Estado</span>
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-forest-500/20 text-forest-300 capitalize mt-0.5">
                        {selectedIntervention.properties.status === 'active' ? 'Activo' : selectedIntervention.properties.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Verificación</span>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mt-0.5 ${
                        selectedIntervention.properties.verification_status === 'verified' ? 'bg-forest-500/20 text-forest-300' : 'bg-yellow-500/20 text-yellow-300'
                      } capitalize`}>
                        {selectedIntervention.properties.verification_status === 'verified' ? 'Verificado' : 'Estimado'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Precisión</span>
                    <p className="text-xs text-ocean-300 mt-0.5 capitalize">{selectedIntervention.properties.precision}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Fuente</span>
                    <p className="text-xs text-ocean-400 italic mt-0.5 truncate">{selectedIntervention.properties.source}</p>
                  </div>
                </div>
              </div>
            )}

            {/* APTITUD DE SUELO (RECUPERACIÓN) */}
            {selectedIntervention.type === 'aptitud_suelo' && (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Área Apta Recuperación Suelos</span>
                  <p className="text-sm text-white font-semibold uppercase mt-0.5">Aptitud SIRSD ({selectedIntervention.properties.region || 'Región no indicada'})</p>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Déficit Fósforo</span>
                  <p className="text-xs text-white mt-0.5 font-medium">{selectedIntervention.properties.descfosf || 'No indicado'}</p>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Nivel de Acidez</span>
                  <p className="text-xs text-white mt-0.5 font-medium">{selectedIntervention.properties.descacid || 'No indicado'}</p>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Conservación de Suelos</span>
                  <p className="text-xs text-ocean-200 mt-0.5">{selectedIntervention.properties.desccons || 'No indicado'}</p>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Potencial Praderas</span>
                  <p className="text-xs text-ocean-200 mt-0.5">{selectedIntervention.properties.descprad || 'No indicado'}</p>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Fragilidad de Terreno</span>
                  <p className={`text-xs mt-0.5 font-semibold ${
                    selectedIntervention.properties.descfrag?.toLowerCase().includes('fragil') && !selectedIntervention.properties.descfrag?.toLowerCase().includes('no fragil') ? 'text-red-400' : 'text-ocean-200'
                  }`}>{selectedIntervention.properties.descfrag || 'No indicado'}</p>
                </div>
              </div>
            )}

            {/* PROGRAMA SIRSD (VECTORES IMPORTADOS WFS) */}
            {selectedIntervention.type === 'sirsd_programa' && (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Programa SIRSD (CIREN)</span>
                  <p className="text-sm text-white font-semibold uppercase mt-0.5">
                    Concurso {selectedIntervention.properties.concurso || 'S/I'} - Temp. {selectedIntervention.properties.temporada || 'S/I'}
                  </p>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Beneficiario / Operador</span>
                  <p className="text-xs text-white font-medium mt-0.5">{selectedIntervention.properties.nom_operad || 'No indicado'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Comuna</span>
                    <p className="text-xs text-ocean-200 mt-0.5">{selectedIntervention.properties.comuna || 'No indicada'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Localidad</span>
                    <p className="text-xs text-ocean-200 mt-0.5 truncate">{selectedIntervention.properties.localidad || 'No indicada'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Sup. Bonificada</span>
                    <p className="text-xs text-ocean-200 mt-0.5">{selectedIntervention.properties.sup_ha} ha</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Bonificación Total</span>
                    <p className="text-xs text-forest-300 font-bold mt-0.5">
                      ${selectedIntervention.properties.bon_total?.toLocaleString('cl-CL')} CLP
                    </p>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Práctica de Conservación</span>
                  <p className="text-xs text-ocean-200 mt-0.5">{selectedIntervention.properties.conservado || 'No indicada'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Clase de Suelo</span>
                    <p className="text-xs text-ocean-200 mt-0.5">{selectedIntervention.properties.clase || 'No indicada'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Subclase</span>
                    <p className="text-xs text-ocean-200 mt-0.5">{selectedIntervention.properties.subclase || 'No indicada'}</p>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Unidad de Suelo</span>
                  <p className="text-xs text-ocean-300 mt-0.5">{selectedIntervention.properties.unidad} ({selectedIntervention.properties.agrupacion})</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Estado</span>
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-forest-500/20 text-forest-300 capitalize mt-0.5">
                        {selectedIntervention.properties.admisible || 'Admisible'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Clave</span>
                    <p className="text-[9px] font-mono text-ocean-400 mt-0.5 truncate">{selectedIntervention.properties.clave}</p>
                  </div>
                </div>
              </div>
            )}

            {/* PLANTACIÓN FORESTAL 2022 (INFOR) */}
            {selectedIntervention.type === 'plantacion_forestal_2022' && (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Plantación Forestal 2022 (INFOR)</span>
                  <p className="text-sm text-white font-semibold uppercase mt-0.5">
                    {selectedIntervention.properties.especie_t || 'Especie No Indicada'}
                  </p>
                </div>
                <div className="pt-1.5 border-t border-ocean-800/30">
                  <span className="text-[10px] uppercase font-bold text-ocean-400">Año de Plantación (APL)</span>
                  <p className="text-xs text-white mt-0.5 font-medium">{selectedIntervention.properties.apl || 'No indicado'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Superficie</span>
                    <p className="text-xs text-ocean-200 mt-0.5">{selectedIntervention.properties.sup_ha?.toLocaleString('cl-CL')} ha</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Región</span>
                    <p className="text-xs text-ocean-200 mt-0.5 font-medium">Región {selectedIntervention.properties.codreg || 'No indicada'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-ocean-800/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">ID Objeto</span>
                    <p className="text-xs text-ocean-300 mt-0.5">{selectedIntervention.properties.objectid || 'S/I'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ocean-400">Cód. Especie</span>
                    <p className="text-xs text-ocean-300 mt-0.5">{selectedIntervention.properties.especie || 'S/I'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

