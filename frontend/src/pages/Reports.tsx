import { useState } from 'react'
import api from '../api/client'

const REPORT_TYPES = [
  { key: 'national', label: 'Reporte Nacional', icon: '🇨🇱', desc: 'Resumen de inversiones, proyectos e indicadores a nivel nacional' },
  { key: 'mrv', label: 'Reporte MRV', icon: '📋', desc: 'Estado de monitoreo, reporte y verificación' },
  { key: 'data-gaps', label: 'Reporte de Brechas', icon: '⚠️', desc: 'Análisis de datos faltantes y calidad de información' },
]

export default function Reports() {
  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [filterSeverity, setFilterSeverity] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // PDF Viewer Simulator States
  const [zoom, setZoom] = useState<number>(100)
  const [isLightDoc, setIsLightDoc] = useState<boolean>(true)
  const [downloading, setDownloading] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const loadReport = async (key: string) => {
    setLoading(true)
    setActiveReport(key)
    setReportData(null)
    setFilterSeverity('todos')
    setSearchQuery('')
    setCurrentPage(1) // Reset page to 1
    try {
      const r = await api.get(`/reports/${key}`)
      setReportData(r.data)
    } catch (err) {
      console.error('Error al generar el reporte:', err)
      setReportData(null)
    }
    setLoading(false)
  }

  const handleDownloadSim = () => {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      window.print()
    }, 1500)
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val)
  }

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('es-CL').format(val)
  }

  const translateEntity = (entity: string) => {
    const mapping: Record<string, string> = {
      'Project': 'Proyecto',
      'Intervention': 'Intervención',
      'Investment': 'Inversión',
      'Mechanism': 'Mecanismo',
      'Territory': 'Territorio',
      'MRV': 'Monitoreo / MRV',
    }
    return mapping[entity] || entity
  }

  const translateFlagType = (type: string) => {
    const mapping: Record<string, string> = {
      'missing_coords': 'Coordenadas Faltantes',
      'invalid_date': 'Fecha Inválida',
      'missing_amount': 'Monto Faltante',
      'out_of_bounds': 'Fuera de Límites Comunitarios',
      'invalid_type': 'Tipo de Datos Inválido',
      'missing_field': 'Campo Mandatorio Faltante',
    }
    return mapping[type] || type
  }

  // PDF Page Size & Zoom Calculation
  const zoomClassMap: Record<number, string> = {
    75: 'max-w-2xl scale-95 origin-top',
    100: 'max-w-4xl scale-100',
    120: 'max-w-5xl scale-105 origin-top',
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Centro de Reportes Oficiales</h1>
        <p className="text-ocean-400 text-sm">Genere e imprima informes analíticos con visualización de archivo PDF</p>
      </div>

      {/* Report Cards Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.key}
            onClick={() => loadReport(rt.key)}
            className={`glass-card p-5 text-left hover:scale-[1.01] hover:border-forest-500/30 transition-all flex flex-col items-start gap-1 relative overflow-hidden ${
              activeReport === rt.key ? 'ring-2 ring-forest-500/50 border-forest-500/40 bg-ocean-900/40' : ''
            }`}
          >
            <div className="text-3xl mb-2">{rt.icon}</div>
            <h3 className="text-sm font-semibold text-white">{rt.label}</h3>
            <p className="text-xs text-ocean-400 leading-relaxed">{rt.desc}</p>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-forest-500/20 border-t-forest-500 rounded-full animate-spin"></div>
          <p className="text-ocean-400 text-xs font-mono animate-pulse">Generando vista de impresión del PDF...</p>
        </div>
      )}

      {/* Active Report View - Simulated PDF Reader */}
      {reportData && !loading && (
        <div className="space-y-4">
          {/* PDF Toolbar Controls */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-t-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            {/* Left: Document info */}
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <div>
                <div className="text-xs font-bold text-white font-mono truncate max-w-[200px] md:max-w-xs">
                  {reportData.report_type === 'national' ? 'reporte_nacional_chile.pdf' : reportData.report_type === 'mrv' ? 'reporte_mrv_chile.pdf' : 'reporte_brechas_calidad.pdf'}
                </div>
                <div className="text-[10px] text-ocean-400">PDF Document • {reportData.report_type === 'national' ? '128 KB' : reportData.report_type === 'mrv' ? '96 KB' : '110 KB'}</div>
              </div>
            </div>

            {/* Middle: PDF Viewer Settings (Zoom, Themes, Pages) */}
            <div className="flex items-center gap-4 bg-slate-950/65 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300">
              {/* Zoom controls */}
              <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
                <button 
                  onClick={() => setZoom(prev => prev > 75 ? prev - 25 : 75)}
                  className="hover:text-white px-1.5 font-bold disabled:opacity-40"
                  disabled={zoom === 75}
                  title="Alejar"
                >
                  −
                </button>
                <span className="font-mono min-w-[35px] text-center">{zoom}%</span>
                <button 
                  onClick={() => setZoom(prev => prev < 120 ? prev + 20 : 120)}
                  className="hover:text-white px-1.5 font-bold disabled:opacity-40"
                  disabled={zoom === 120}
                  title="Acercar"
                >
                  +
                </button>
              </div>

              {/* Theme Toggle (Claro / Oscuro) */}
              <button
                onClick={() => setIsLightDoc(!isLightDoc)}
                className="hover:text-white font-medium flex items-center gap-1.5 border-r border-slate-800 pr-3"
                title="Cambiar fondo del documento"
              >
                <span>{isLightDoc ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}</span>
              </button>

              {/* Page controls */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="hover:text-white font-bold disabled:opacity-30 px-1"
                  title="Página anterior"
                >
                  ◀
                </button>
                <span className="font-mono">Pág. {currentPage} de {activeReport === 'national' ? 2 : 1}</span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(activeReport === 'national' ? 2 : 1, prev + 1))}
                  disabled={currentPage === (activeReport === 'national' ? 2 : 1)}
                  className="hover:text-white font-bold disabled:opacity-30 px-1"
                  title="Página siguiente"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* PDF Download simulation button */}
              <button
                onClick={handleDownloadSim}
                disabled={downloading}
                className="flex items-center gap-1 px-3 py-1.5 bg-forest-600 hover:bg-forest-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    <span>Compilando...</span>
                  </>
                ) : (
                  <>
                    <span>📥</span>
                    <span>Guardar PDF</span>
                  </>
                )}
              </button>
              <button
                onClick={() => window.print()}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded"
                title="Imprimir Documento"
              >
                🖨️
              </button>
            </div>
          </div>

          {/* Filter options ONLY if data-gaps report is loaded */}
          {reportData.report_type === 'data_gaps' && (
            <div className="bg-slate-900 border border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">Filtros de Auditoría del PDF:</span>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-forest-500"
                >
                  <option value="todos">Todos los niveles</option>
                  <option value="alta">Alta / Crítica</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>

                <input
                  type="text"
                  placeholder="Buscar inconsistencias..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-forest-500 w-48"
                />
              </div>
            </div>
          )}

          {/* PDF Viewer Page Body Container */}
          <div className="bg-slate-950 border border-t-0 border-slate-800 p-6 flex justify-center overflow-x-auto min-h-[700px] shadow-inner">
            <div 
              className={`w-full ${zoomClassMap[zoom]} transition-all duration-300 shadow-2xl relative select-none rounded`}
              style={{
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {/* A4 simulated sheet */}
              <div 
                className={`w-full p-8 md:p-12 border transition-colors duration-300 flex flex-col justify-between aspect-[1/1.414] min-h-[1050px] relative ${
                  isLightDoc 
                    ? 'bg-slate-50 border-slate-300 text-slate-900' 
                    : 'bg-slate-900 border-slate-700 text-slate-100'
                }`}
              >
                {/* Official PDF Header Decoration */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-700 via-white to-red-600"></div>

                {/* Main Content Area */}
                <div className="space-y-6">
                  {/* Document Header Logo & Seal */}
                  <div className="flex justify-between items-start border-b pb-4 border-slate-300/60">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">República de Chile</div>
                      <div className="text-xs font-bold text-slate-700">Plataforma SIG-UTCUTS</div>
                      <div className="text-[9px] text-slate-400">Ministerio del Medio Ambiente</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-500">CÓD: MMA-2026-UTC</div>
                      <div className="text-[9px] text-slate-400">Emisión: {new Date().toLocaleDateString('es-CL')}</div>
                      <span className="inline-block mt-1 text-[8px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        {reportData.note || 'DATOS DEMO'}
                      </span>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="space-y-1">
                    <h2 className="text-2xl font-serif font-bold text-center tracking-tight leading-tight">
                      {reportData.title.toUpperCase()}
                    </h2>
                    <p className="text-[10px] text-center text-slate-400 italic">
                      Informe de desempeño y consistencia territorial del sector de Uso de la Tierra, Cambio de Uso de la Tierra y Silvicultura.
                    </p>
                  </div>

                  {/* 1. NATIONAL REPORT CONTENT */}
                  {reportData.report_type === 'national' && (
                    <div className="space-y-6 text-xs">
                      {currentPage === 1 ? (
                        <>
                          {/* Grid of KPIs (printed look) */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Inversión Planificada</div>
                              <div className="text-lg font-bold font-mono">{formatCurrency(reportData.data.total_investment_usd)}</div>
                              <div className="text-[9px] text-slate-400 mt-1">Instrumento financiero consolidado USD</div>
                            </div>
                            <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Iniciativas en Curso</div>
                              <div className="text-lg font-bold font-mono">{formatNumber(reportData.data.projects_count)} Proyectos</div>
                              <div className="text-[9px] text-slate-400 mt-1">Mecanismos financieros: {reportData.data.mechanisms_count}</div>
                            </div>
                            <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mitigación Estimada</div>
                              <div className="text-lg font-bold font-mono">{formatNumber(reportData.data.tco2e_estimated)} tCO₂e</div>
                              <div className="text-[9px] text-slate-400 mt-1">Toneladas equivalentes de CO₂ proyectadas</div>
                            </div>
                            <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tasa de Verificación</div>
                              <div className="text-lg font-bold font-mono">
                                {reportData.data.hectares_estimated > 0 
                                  ? ((reportData.data.hectares_verified / reportData.data.hectares_estimated) * 100).toFixed(1)
                                  : '0.0'}%
                              </div>
                              <div className="text-[9px] text-slate-400 mt-1">Relación meta vs. auditado (MRV)</div>
                            </div>
                          </div>

                          {/* Hectares details section */}
                          <div className={`p-4 border rounded-lg space-y-3 ${isLightDoc ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-950/20 border-slate-800'}`}>
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                              <span>Certificación de Hectáreas en Territorio</span>
                              <span className="font-mono text-emerald-500">Avance Técnico</span>
                            </div>
                            
                            <div className="space-y-1.5">
                              <div className="w-full h-2.5 bg-slate-300/40 dark:bg-slate-800 rounded overflow-hidden border border-slate-300 dark:border-slate-700">
                                <div 
                                  className="h-full bg-emerald-500 transition-all duration-500" 
                                  style={{ width: `${Math.min(100, reportData.data.hectares_estimated > 0 ? (reportData.data.hectares_verified / reportData.data.hectares_estimated) * 100 : 0)}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-[10px] font-mono">
                                <span>Estimación Global: <strong>{formatNumber(reportData.data.hectares_estimated)} ha</strong></span>
                                <span>Verificadas (MRV): <strong className="text-emerald-600">{formatNumber(reportData.data.hectares_verified)} ha</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Consolidated metrics table */}
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider">Métricas de Compromiso Físico</div>
                            <table className={`w-full text-left border-collapse border text-[10px] ${isLightDoc ? 'border-slate-200' : 'border-slate-800'}`}>
                              <thead>
                                <tr className={isLightDoc ? 'bg-slate-200/60 font-semibold' : 'bg-slate-850 font-semibold'}>
                                  <th className="p-2 border border-inherit">Indicador de Compromiso</th>
                                  <th className="p-2 border border-inherit text-right">Meta Estimada</th>
                                  <th className="p-2 border border-inherit text-right">Registrado / Verificado</th>
                                  <th className="p-2 border border-inherit text-center">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className={isLightDoc ? 'hover:bg-slate-100/50' : 'hover:bg-slate-800/30'}>
                                  <td className="p-2 border border-inherit font-medium">Inversión Consolidada</td>
                                  <td className="p-2 border border-inherit text-right font-mono">—</td>
                                  <td className="p-2 border border-inherit text-right font-mono">{formatCurrency(reportData.data.total_investment_usd)}</td>
                                  <td className="p-2 border border-inherit text-center text-emerald-600 font-bold">Auditado</td>
                                </tr>
                                <tr className={isLightDoc ? 'hover:bg-slate-100/50' : 'hover:bg-slate-800/30'}>
                                  <td className="p-2 border border-inherit font-medium">Superficie Terrestre Cubierta</td>
                                  <td className="p-2 border border-inherit text-right font-mono">{formatNumber(reportData.data.hectares_estimated)} ha</td>
                                  <td className="p-2 border border-inherit text-right font-mono">{formatNumber(reportData.data.hectares_verified)} ha</td>
                                  <td className="p-2 border border-inherit text-center text-amber-600 font-bold">Verificando</td>
                                </tr>
                                <tr className={isLightDoc ? 'hover:bg-slate-100/50' : 'hover:bg-slate-800/30'}>
                                  <td className="p-2 border border-inherit font-medium">Mitigación de Gases (GEI)</td>
                                  <td className="p-2 border border-inherit text-right font-mono">{formatNumber(reportData.data.tco2e_estimated)} tCO₂e</td>
                                  <td className="p-2 border border-inherit text-right font-mono">—</td>
                                  <td className="p-2 border border-inherit text-center text-blue-600 font-bold">Modelado</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          {/* Page 2: Detailed basis of calculation */}
                          <div className="space-y-1">
                            <h3 className="text-xs font-semibold uppercase tracking-wider border-b pb-1">
                              Metodología del Índice de Priorización Territorial
                            </h3>
                            <p className="text-[9.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                              El **Índice de Priorización Territorial** es una métrica multicriterio ponderada diseñada para orientar el financiamiento y focalizar las acciones del sector de Uso de la Tierra, Cambio de Uso de la Tierra y Silvicultura (**UTCUTS**) en Chile, calculado a nivel comunal a partir de **4 capas GIS ambientales activas**.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Subindicadores basados en Capas GIS Disponibles:</div>
                            
                            <div className="grid grid-cols-1 gap-2.5">
                              <div className={`p-2.5 border rounded ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-[9.5px]">1. sf (Restauración Forestal - Sitios Prioritarios)</span>
                                  <span className="font-bold text-forest-600 dark:text-forest-400 bg-forest-500/10 px-1.5 py-0.5 rounded text-[8px]">Peso: 20%</span>
                                </div>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                  Mide el nivel de cruce territorial de la comuna con la capa de **Sitios Prioritarios de Conservación**. Fomenta las acciones de restauración forestal en zonas de alto valor ecológico previamente declaradas por el Ministerio.
                                </p>
                              </div>

                              <div className={`p-2.5 border rounded ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-[9.5px]">2. sb (Biodiversidad - Áreas Protegidas)</span>
                                  <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-[8px]">Peso: 10%</span>
                                </div>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                  Porcentaje de cobertura de la comuna bajo el Sistema Nacional de Áreas Silvestres Protegidas del Estado (**SNASPE / Áreas Protegidas**). Focaliza inversiones en zonas de conservación, parques y reservas nacionales.
                                </p>
                              </div>

                              <div className={`p-2.5 border rounded ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-[9.5px]">3. sd (Pérdida / Cobertura de Ecosistemas Terrestres)</span>
                                  <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[8px]">Peso: 15%</span>
                                </div>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                  Superposición con la capa de **Ecosistemas Terrestres**. Identifica ecosistemas frágiles, vegetación nativa y formaciones arbustivas expuestas a perturbaciones ecológicas, sirviendo como priorizador de mitigación.
                                </p>
                              </div>

                              <div className={`p-2.5 border rounded ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-[9.5px]">4. sm (Gobernanza Local / Espacios Costeros ECMPO)</span>
                                  <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded text-[8px]">Peso: 5%</span>
                                </div>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                  Cruce espacial de la comuna con la capa de **Espacios Costeros Marinos para Pueblos Originarios (ECMPO)**. Premia a comunas con esquemas de co-manejo, gobernanza y resguardo ecológico comunitario del borde costero.
                                </p>
                              </div>

                              <div className={`p-2.5 border rounded ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-[9.5px]">5. Indicadores Contextuales de Soporte</span>
                                  <span className="font-bold text-slate-600 dark:text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded text-[8px]">Peso Total: 50%</span>
                                </div>
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed grid grid-cols-2 gap-x-4">
                                  <p>• **Riesgo Climático (sc - 15%):** Gradiente latitudinal de aridez.</p>
                                  <p>• **Brecha Financiera (sg - 15%):** Necesidad relativa de financiamiento.</p>
                                  <p>• **Vulnerabilidad Social (ss - 10%):** Índice CASEN y dependencia socioambiental.</p>
                                  <p>• **Factibilidad Operacional (so - 10%):** Accesibilidad y facilidad de monitoreo en territorio.</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className={`p-3 border rounded text-center space-y-1.5 ${isLightDoc ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-950/20 border-slate-800'}`}>
                            <div className="text-[9px] font-bold uppercase tracking-wider">Fórmula de Ponderación Final del Índice</div>
                            <div className="font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-slate-250 dark:bg-slate-950/60 px-3 py-1 rounded inline-block">
                              Índice = 0.20·sf + 0.15·sc + 0.15·sd + 0.15·sg + 0.10·sb + 0.10·ss + 0.10·so + 0.05·sm
                            </div>
                            <p className="text-[8.5px] text-slate-400 leading-relaxed">
                              La clasificación de prioridad comunal se determina según el puntaje obtenido:<br />
                              <strong>Muy Alta Prioridad</strong> (&ge;65) • <strong>Alta</strong> ([50, 65)) • <strong>Media</strong> ([35, 50)) • <strong>Baja</strong> ([20, 35)) • <strong>Muy Baja Prioridad</strong> (&lt;20)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. MRV REPORT CONTENT */}
                  {reportData.report_type === 'mrv' && (
                    <div className="space-y-6 text-xs">
                      {/* KPIs grid */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Muestras Totales</div>
                          <div className="text-xl font-bold font-mono">{formatNumber(reportData.total_observations)}</div>
                          <div className="text-[8px] text-slate-400 mt-1">Registros en campo</div>
                        </div>
                        <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registros Aprobados</div>
                          <div className="text-xl font-bold font-mono text-emerald-600">{formatNumber(reportData.verified)}</div>
                          <div className="text-[8px] text-slate-400 mt-1">Validación completada</div>
                        </div>
                        <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tasa de Aprobación</div>
                          <div className="text-xl font-bold font-mono">{reportData.verification_rate}%</div>
                          <div className="text-[8px] text-slate-400 mt-1">Porcentaje verificado</div>
                        </div>
                      </div>

                      {/* MRV Timeline Process Description */}
                      <div className="space-y-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider border-b pb-1">Procedimiento de Auditoría de Campo</div>
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                            <div>
                              <h4 className="font-bold">Medición Primaria (Toma de datos)</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                                Levantamiento inicial de polígonos geográficos y variables ambientales mediante encuestas digitalizadas.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                            <div>
                              <h4 className="font-bold">Reporte Consolidado (Staging Area)</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                                Transmisión vía KoboToolbox a la API central para validaciones de consistencia y análisis de brechas.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                            <div>
                              <h4 className="font-bold">Verificación y Aprobación Final</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                                Comparativa espacial con las capas de prioridad de la plataforma y firmas de validación regional MMA.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. DATA GAPS REPORT CONTENT */}
                  {reportData.report_type === 'data_gaps' && (
                    <div className="space-y-6 text-xs">
                      {/* KPIs grid */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Brechas Activas</div>
                          <div className="text-xl font-bold font-mono text-red-500">{reportData.total}</div>
                          <div className="text-[8px] text-slate-400 mt-1">Registros con advertencia</div>
                        </div>
                        <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nivel Crítico/Alto</div>
                          <div className="text-xl font-bold font-mono text-red-600">
                            {(reportData.flags ?? []).filter((f: any) => f.severity.toLowerCase() === 'critica' || f.severity.toLowerCase() === 'alta' || f.severity.toLowerCase() === 'crítica').length}
                          </div>
                          <div className="text-[8px] text-slate-400 mt-1">Requieren acción inmediata</div>
                        </div>
                        <div className={`p-4 border rounded-lg ${isLightDoc ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nivel Medio/Bajo</div>
                          <div className="text-xl font-bold font-mono text-amber-500">
                            {(reportData.flags ?? []).filter((f: any) => f.severity.toLowerCase() === 'media' || f.severity.toLowerCase() === 'baja').length}
                          </div>
                          <div className="text-[8px] text-slate-400 mt-1">Advertencias leves</div>
                        </div>
                      </div>

                      {/* Gaps List table */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider border-b pb-1">Inconsistencias y Auditorías de Calidad</div>
                        
                        {(reportData.flags ?? []).length === 0 ? (
                          <div className="text-center py-6 border border-dashed rounded text-[10px] text-slate-400">
                            No se registran brechas de información asociadas al filtro.
                          </div>
                        ) : (
                          <table className={`w-full text-left border-collapse border text-[9px] ${isLightDoc ? 'border-slate-200' : 'border-slate-800'}`}>
                            <thead>
                              <tr className={isLightDoc ? 'bg-slate-200/60 font-semibold' : 'bg-slate-850 font-semibold'}>
                                <th className="p-2 border border-inherit">Entidad</th>
                                <th className="p-2 border border-inherit">Falla Detectada</th>
                                <th className="p-2 border border-inherit">Descripción de la Brecha</th>
                                <th className="p-2 border border-inherit text-center">Nivel</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(reportData.flags ?? [])
                                .filter((f: any) => {
                                  if (filterSeverity === 'alta') {
                                    return f.severity.toLowerCase() === 'critica' || f.severity.toLowerCase() === 'alta' || f.severity.toLowerCase() === 'crítica';
                                  }
                                  if (filterSeverity === 'media') return f.severity.toLowerCase() === 'media';
                                  if (filterSeverity === 'baja') return f.severity.toLowerCase() === 'baja';
                                  return true;
                                })
                                .filter((f: any) => {
                                  if (!searchQuery) return true;
                                  return f.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                         f.entity.toLowerCase().includes(searchQuery.toLowerCase());
                                })
                                .map((f: any) => (
                                  <tr key={f.id} className={isLightDoc ? 'hover:bg-slate-100/50' : 'hover:bg-slate-800/30'}>
                                    <td className="p-2 border border-inherit font-semibold text-slate-700 dark:text-slate-200">
                                      {translateEntity(f.entity)}
                                    </td>
                                    <td className="p-2 border border-inherit">{translateFlagType(f.type)}</td>
                                    <td className="p-2 border border-inherit text-slate-400 leading-tight">{f.description}</td>
                                    <td className="p-2 border border-inherit text-center font-bold">
                                      <span className={
                                        f.severity.toLowerCase() === 'critica' || f.severity.toLowerCase() === 'alta' || f.severity.toLowerCase() === 'crítica'
                                          ? 'text-red-600'
                                          : f.severity.toLowerCase() === 'media'
                                            ? 'text-amber-600'
                                            : 'text-blue-500'
                                      }>
                                        {f.severity.toUpperCase()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Official PDF Footer Decoration */}
                <div className="border-t pt-4 border-slate-300/60 text-[8px] text-slate-400 flex justify-between items-center mt-6">
                  <span>Documento oficial de la Plataforma de Inteligencia Territorial MMA • Chile</span>
                  <span className="font-mono">Pág. {currentPage} de {activeReport === 'national' ? 2 : 1}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
