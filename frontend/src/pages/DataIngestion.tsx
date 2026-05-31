import { useState, useEffect } from 'react'
import api from '../api/client'

// === INTERFACES ===
interface Territory {
  id: number
  code: string
  name: string
  type: string
  parent_id?: number | null
}

interface Mechanism {
  id: number
  code: string
  name: string
  category?: string
  description?: string
  main_funding_source?: string
  maturity_level?: string
  time_horizon?: string
  ndc_alignment?: string
  target_beneficiaries?: string
  status: string
  is_sample: boolean
  created_at?: string
}

interface Project {
  id: number
  mechanism_id?: number
  name: string
  description?: string
  start_year?: number
  end_year?: number
  status: string
  geographic_precision?: string
  data_confidence: string
  is_sample: boolean
  created_at?: string
  territory_ids?: number[]
}

interface Investment {
  id: number
  project_id: number
  funding_source?: string
  funding_type?: string
  amount?: number
  currency: string
  amount_usd?: number
  year?: number
  data_quality: string
  is_sample: boolean
  created_at?: string
}

interface Intervention {
  id: number
  project_id: number
  intervention_type?: string
  hectares_estimated?: number
  hectares_verified?: number
  tco2e_estimated?: number
  tco2e_verified?: number
  status: string
  is_sample: boolean
}

interface MRVIndicator {
  id: number
  code: string
  name: string
  category: string
  unit?: string
  description?: string
}

interface MRVObservation {
  id: number
  intervention_id: number
  indicator_id: number
  estimated_value?: number
  verified_value?: number
  observation_date?: string
  verification_status: string
  notes?: string
  is_sample: boolean
}

interface Layer {
  id: number
  name: string
  description?: string
  category?: string
  source_url?: string
  layer_type: string
  geometry_type?: string
  is_active: boolean
  is_official: boolean
  is_sample: boolean
}

type TabType = 'mechanisms' | 'projects' | 'investments' | 'interventions' | 'mrv' | 'layers'

export default function DataIngestion() {
  const [activeTab, setActiveTab] = useState<TabType>('mechanisms')
  
  // Lists for display
  const [mechanisms, setMechanisms] = useState<Mechanism[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [mrvObservations, setMrvObservations] = useState<MRVObservation[]>([])
  const [mrvIndicators, setMrvIndicators] = useState<MRVIndicator[]>([])
  const [layers, setLayers] = useState<Layer[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])

  // Global UI states
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null) // If null: Adding, if number: Editing
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // States for Cascading Selectors (Region -> Province -> Commune)
  const [selectedRegionId, setSelectedRegionId] = useState<number | "">("")
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | "">("")
  const [selectedCommuneId, setSelectedCommuneId] = useState<number | "">("")
  const [selectedUnitType, setSelectedUnitType] = useState<string>("")
  const [selectedUnitId, setSelectedUnitId] = useState<number | "">("")

  // Combined Form States (handles all tabs dynamically)
  const [formMechanism, setFormMechanism] = useState<Partial<Mechanism>>({
    code: '', name: '', category: 'publico', description: '', main_funding_source: '',
    maturity_level: 'operational', time_horizon: 'medium', ndc_alignment: '',
    target_beneficiaries: '', status: 'activo'
  })

  const [formProject, setFormProject] = useState<Partial<Project> & { territory_ids: number[] }>({
    mechanism_id: undefined, name: '', description: '', start_year: 2026, end_year: 2030,
    status: 'draft', geographic_precision: 'regional', data_confidence: 'medium',
    territory_ids: []
  })

  const [formInvestment, setFormInvestment] = useState<Partial<Investment>>({
    project_id: undefined as any, funding_source: '', funding_type: 'public',
    amount: 0, currency: 'USD', amount_usd: 0, year: 2026, data_quality: 'medium'
  })

  const [formIntervention, setFormIntervention] = useState<Partial<Intervention>>({
    project_id: undefined as any, intervention_type: 'restauracion',
    hectares_estimated: 0, hectares_verified: 0, tco2e_estimated: 0, tco2e_verified: 0,
    status: 'planned'
  })

  const [formMRVObservation, setFormMRVObservation] = useState<Partial<MRVObservation>>({
    intervention_id: undefined as any, indicator_id: undefined as any,
    estimated_value: 0, verified_value: 0, observation_date: new Date().toISOString().split('T')[0],
    verification_status: 'estimated', notes: ''
  })

  const [formLayer, setFormLayer] = useState<Partial<Layer>>({
    name: '', description: '', category: 'territorial', source_url: '',
    layer_type: 'geojson', geometry_type: 'polygon', is_active: true, is_official: false
  })

  // === DATA FETCHING ===
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [resMechs, resProjs, resInvs, resInters, resObservations, resIndicators, resLayers, resTerritories] = await Promise.all([
        api.get('/mechanisms'),
        api.get('/projects'),
        api.get('/investments'),
        api.get('/interventions'),
        api.get('/mrv/observations'),
        api.get('/mrv/indicators'),
        api.get('/layers'),
        api.get('/territories')
      ])

      setMechanisms(Array.isArray(resMechs.data) ? resMechs.data : [])
      setProjects(Array.isArray(resProjs.data) ? resProjs.data : [])
      setInvestments(Array.isArray(resInvs.data) ? resInvs.data : [])
      setInterventions(Array.isArray(resInters.data) ? resInters.data : [])
      setMrvObservations(Array.isArray(resObservations.data) ? resObservations.data : [])
      setMrvIndicators(Array.isArray(resIndicators.data) ? resIndicators.data : [])
      setLayers(Array.isArray(resLayers.data) ? resLayers.data : [])
      setTerritories(Array.isArray(resTerritories.data) ? resTerritories.data : [])
    } catch (err) {
      console.error('Error fetching dashboard tables:', err)
      triggerAlert('error', 'Error al cargar los datos del sistema.')
    } finally {
      setLoading(false)
    }
  }

  // === AUXILIARY HELPERS ===
  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 5000)
  }

  const resetFormStates = () => {
    setEditId(null)
    setSelectedRegionId("")
    setSelectedProvinceId("")
    setSelectedCommuneId("")
    setSelectedUnitType("")
    setSelectedUnitId("")
    setFormMechanism({
      code: 'MEC-OP-' + Math.floor(Math.random() * 900 + 100),
      name: '', category: 'public', description: '', main_funding_source: '',
      maturity_level: 'operational', time_horizon: 'medium', ndc_alignment: '',
      target_beneficiaries: '', status: 'activo'
    })
    setFormProject({
      mechanism_id: mechanisms[0]?.id || undefined, name: '', description: '',
      start_year: 2026, end_year: 2031, status: 'draft',
      geographic_precision: 'regional', data_confidence: 'medium', territory_ids: []
    })
    setFormInvestment({
      project_id: projects[0]?.id || undefined as any, funding_source: '', funding_type: 'public',
      amount: 100000, currency: 'USD', amount_usd: 100000, year: 2026, data_quality: 'medium'
    })
    setFormIntervention({
      project_id: projects[0]?.id || undefined as any, intervention_type: 'restauracion',
      hectares_estimated: 100, hectares_verified: 0, tco2e_estimated: 2000, tco2e_verified: 0,
      status: 'planned'
    })
    setFormMRVObservation({
      intervention_id: interventions[0]?.id || undefined as any, indicator_id: mrvIndicators[0]?.id || undefined as any,
      estimated_value: 50, verified_value: 0, observation_date: new Date().toISOString().split('T')[0],
      verification_status: 'estimated', notes: ''
    })
    setFormLayer({
      name: '', description: '', category: 'territorial', source_url: '',
      layer_type: 'geojson', geometry_type: 'polygon', is_active: true, is_official: false
    })
  }

  const handleOpenAddModal = () => {
    resetFormStates()
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (entity: any) => {
    resetFormStates()
    setEditId(entity.id)
    
    if (activeTab === 'mechanisms') {
      setFormMechanism({ ...entity })
    } else if (activeTab === 'projects') {
      setFormProject({
        ...entity,
        territory_ids: entity.territory_ids || entity.territories?.map((t: Territory) => t.id) || []
      })
    } else if (activeTab === 'investments') {
      setFormInvestment({ ...entity })
    } else if (activeTab === 'interventions') {
      setFormIntervention({ ...entity })
    } else if (activeTab === 'mrv') {
      setFormMRVObservation({ ...entity })
    } else if (activeTab === 'layers') {
      setFormLayer({ ...entity })
    }
    
    setIsModalOpen(true)
  }

  // === CRUD HANDLERS ===
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let endpoint = ''
      let payload: any = {}

      if (activeTab === 'mechanisms') {
        endpoint = '/mechanisms'
        payload = formMechanism
      } else if (activeTab === 'projects') {
        endpoint = '/projects'
        payload = formProject
      } else if (activeTab === 'investments') {
        endpoint = '/investments'
        // Synchronize amount and amount_usd if empty or 0
        const copyInv = { ...formInvestment }
        if (!copyInv.amount_usd && copyInv.amount) {
          copyInv.amount_usd = copyInv.amount
        }
        endpoint = '/investments'
        payload = copyInv
      } else if (activeTab === 'interventions') {
        endpoint = '/interventions'
        payload = formIntervention
      } else if (activeTab === 'mrv') {
        endpoint = '/mrv/observations'
        payload = formMRVObservation
      } else if (activeTab === 'layers') {
        endpoint = '/layers'
        payload = formLayer
      }

      if (editId !== null) {
        // UPDATE record
        const putUrl = activeTab === 'mrv' 
          ? `${endpoint}/${editId}` 
          : `${endpoint}/${editId}`
        await api.put(putUrl, payload)
        triggerAlert('success', '¡Registro actualizado exitosamente!')
      } else {
        // CREATE record
        await api.post(endpoint, payload)
        triggerAlert('success', '¡Nuevo registro insertado exitosamente!')
      }

      setIsModalOpen(false)
      fetchAllData()
    } catch (err: any) {
      console.error('Submit error:', err)
      const errorMsg = err.response?.data?.detail || 'Error al persistir el registro en la base de datos.'
      triggerAlert('error', `⚠️ Error: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecord = async () => {
    if (!deleteConfirmId) return
    setLoading(true)
    try {
      let endpoint = ''
      if (activeTab === 'mechanisms') endpoint = `/mechanisms/${deleteConfirmId}`
      else if (activeTab === 'projects') endpoint = `/projects/${deleteConfirmId}`
      else if (activeTab === 'investments') endpoint = `/investments/${deleteConfirmId}`
      else if (activeTab === 'interventions') endpoint = `/interventions/${deleteConfirmId}`
      else if (activeTab === 'mrv') endpoint = `/mrv/observations/${deleteConfirmId}`
      else if (activeTab === 'layers') endpoint = `/layers/${deleteConfirmId}`

      await api.delete(endpoint)
      triggerAlert('success', 'El registro ha sido eliminado físicamente.')
      setDeleteConfirmId(null)
      fetchAllData()
    } catch (err: any) {
      console.error('Delete error:', err)
      triggerAlert('error', err.response?.data?.detail || 'No se pudo eliminar el registro. Puede tener dependencias.')
    } finally {
      setLoading(false)
    }
  }

  // === FILTERING ===
  const getFilteredItems = () => {
    const query = searchTerm.toLowerCase()
    
    if (activeTab === 'mechanisms') {
      return mechanisms.filter(m => 
        m.code.toLowerCase().includes(query) || 
        m.name.toLowerCase().includes(query) || 
        (m.description || '').toLowerCase().includes(query)
      )
    }
    if (activeTab === 'projects') {
      return projects.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.description || '').toLowerCase().includes(query)
      )
    }
    if (activeTab === 'investments') {
      return investments.filter(i => {
        const proj = projects.find(p => p.id === i.project_id)
        return (
          (i.funding_source || '').toLowerCase().includes(query) ||
          (proj?.name || '').toLowerCase().includes(query) ||
          String(i.year).includes(query)
        )
      })
    }
    if (activeTab === 'interventions') {
      return interventions.filter(i => {
        const proj = projects.find(p => p.id === i.project_id)
        return (
          (i.intervention_type || '').toLowerCase().includes(query) ||
          (proj?.name || '').toLowerCase().includes(query)
        )
      })
    }
    if (activeTab === 'mrv') {
      return mrvObservations.filter(o => {
        const ind = mrvIndicators.find(i => i.id === o.indicator_id)
        return (
          (o.notes || '').toLowerCase().includes(query) ||
          (ind?.name || '').toLowerCase().includes(query)
        )
      })
    }
    if (activeTab === 'layers') {
      return layers.filter(l => 
        l.name.toLowerCase().includes(query) || 
        (l.description || '').toLowerCase().includes(query)
      )
    }
    return []
  }

  const filteredItems = getFilteredItems()

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 text-white">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-ocean-800/40 via-ocean-850/40 to-forest-900/10 border border-ocean-700/30 p-8 rounded-3xl backdrop-blur-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl bg-forest-600/30 p-2 rounded-xl border border-forest-500/20 shadow-md">⚙️</span>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Módulo de Administración
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-forest-400">
                Panel Oficial de Control e Ingesta de Datos
              </p>
            </div>
          </div>
          <p className="text-ocean-300 text-sm max-w-2xl leading-relaxed">
            Consola unificada para la gestión nativa del inventario territorial, incluyendo mecanismos de financiamiento, proyectos de mitigación, inversiones del sector, intervenciones silvícolas y reportes de monitoreo MRV.
          </p>
        </div>
        
        <button
          onClick={handleOpenAddModal}
          className="bg-gradient-to-r from-forest-600 to-forest-500 hover:from-forest-500 hover:to-forest-400 px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-forest-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 self-start md:self-center border border-forest-400/20 text-sm"
        >
          <span>➕</span> Agregar {
            activeTab === 'mechanisms' ? 'Mecanismo' :
            activeTab === 'projects' ? 'Proyecto' :
            activeTab === 'investments' ? 'Inversión' :
            activeTab === 'interventions' ? 'Intervención' :
            activeTab === 'mrv' ? 'Obs. MRV' : 'Capa GIS'
          }
        </button>
      </div>

      {/* Alert banner */}
      {alert && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in shadow-xl backdrop-blur-md ${
          alert.type === 'success'
            ? 'bg-green-950/60 border-green-700/50 text-green-300'
            : 'bg-red-950/60 border-red-700/50 text-red-300'
        }`}>
          <span className="text-xl">{alert.type === 'success' ? '✅' : '⚠️'}</span>
          <div className="text-sm font-semibold">{alert.message}</div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-[#0b0f19]/80 rounded-2xl border border-ocean-800/80 backdrop-blur-md">
        {[
          { id: 'mechanisms', label: 'Mecanismos', count: mechanisms.length, icon: '⚙️' },
          { id: 'projects', label: 'Proyectos', count: projects.length, icon: '📁' },
          { id: 'investments', label: 'Inversiones', count: investments.length, icon: '💰' },
          { id: 'interventions', label: 'Intervenciones', count: interventions.length, icon: '🌳' },
          { id: 'mrv', label: 'Monitoreo MRV', count: mrvObservations.length, icon: '📋' },
          { id: 'layers', label: 'Capas GIS', count: layers.length, icon: '🗺️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabType)
              setSearchTerm('')
            }}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-forest-600 text-white shadow-md shadow-forest-600/20 border border-forest-500/30'
                : 'text-ocean-300 hover:text-white hover:bg-ocean-800/40'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTab === tab.id ? 'bg-forest-800 text-white' : 'bg-ocean-900 text-ocean-400'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-ocean-900/60 p-4 rounded-2xl border border-ocean-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder={`Buscar por nombre, código o detalles...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#131b2e] border border-ocean-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-forest-500 transition-colors placeholder-ocean-500"
          />
          <span className="absolute left-3.5 top-3 text-ocean-500">🔍</span>
        </div>
        <div className="text-xs text-ocean-400 font-semibold">
          Mostrando {filteredItems.length} de {
            activeTab === 'mechanisms' ? mechanisms.length :
            activeTab === 'projects' ? projects.length :
            activeTab === 'investments' ? investments.length :
            activeTab === 'interventions' ? interventions.length :
            activeTab === 'mrv' ? mrvObservations.length : layers.length
          } registros
        </div>
      </div>

      {/* Table Data Panel */}
      <div className="bg-ocean-900/30 border border-ocean-800/70 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-10 h-10 border-4 border-forest-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-ocean-300 text-sm font-medium animate-pulse">Sincronizando con base de datos real...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ocean-800 text-xs text-ocean-400 font-bold uppercase tracking-wider bg-[#131b2e]/50">
                  {activeTab === 'mechanisms' && (
                    <>
                      <th className="py-4 px-6">Código</th>
                      <th className="py-4 px-6">Nombre del Mecanismo</th>
                      <th className="py-4 px-6">Categoría</th>
                      <th className="py-4 px-6">Vía Financiamiento</th>
                      <th className="py-4 px-6">Madurez</th>
                      <th className="py-4 px-6">Estado</th>
                    </>
                  )}
                  {activeTab === 'projects' && (
                    <>
                      <th className="py-4 px-6">ID</th>
                      <th className="py-4 px-6">Nombre del Proyecto</th>
                      <th className="py-4 px-6">Años de Vigencia</th>
                      <th className="py-4 px-6">Confianza</th>
                      <th className="py-4 px-6">Mecanismo Link</th>
                      <th className="py-4 px-6">Estado</th>
                    </>
                  )}
                  {activeTab === 'investments' && (
                    <>
                      <th className="py-4 px-6">ID</th>
                      <th className="py-4 px-6">Proyecto Asociado</th>
                      <th className="py-4 px-6">Origen Financiamiento</th>
                      <th className="py-4 px-6">Monto (USD)</th>
                      <th className="py-4 px-6">Año Inversión</th>
                      <th className="py-4 px-6">Calidad de Dato</th>
                    </>
                  )}
                  {activeTab === 'interventions' && (
                    <>
                      <th className="py-4 px-6">ID</th>
                      <th className="py-4 px-6">Proyecto</th>
                      <th className="py-4 px-6">Tipo Intervención</th>
                      <th className="py-4 px-6">Hectáreas Est. / Ver.</th>
                      <th className="py-4 px-6">tCO₂e Est. / Ver.</th>
                      <th className="py-4 px-6">Estado</th>
                    </>
                  )}
                  {activeTab === 'mrv' && (
                    <>
                      <th className="py-4 px-6">ID Obs</th>
                      <th className="py-4 px-6">Intervención ID</th>
                      <th className="py-4 px-6">Indicador de Impacto</th>
                      <th className="py-4 px-6">Estimado / Verificado</th>
                      <th className="py-4 px-6">Fecha Registro</th>
                      <th className="py-4 px-6">Verificación</th>
                    </>
                  )}
                  {activeTab === 'layers' && (
                    <>
                      <th className="py-4 px-6">Capa GIS</th>
                      <th className="py-4 px-6">Categoría</th>
                      <th className="py-4 px-6">Geometría</th>
                      <th className="py-4 px-6">Tipo</th>
                      <th className="py-4 px-6">Oficial</th>
                      <th className="py-4 px-6">Estado</th>
                    </>
                  )}
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-800/30 text-sm">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-ocean-850/30 transition-colors">
                      {activeTab === 'mechanisms' && (
                        <>
                          <td className="py-4 px-6 font-mono font-bold text-forest-400">{(item as Mechanism).code}</td>
                          <td className="py-4 px-6 font-semibold text-white">{(item as Mechanism).name}</td>
                          <td className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-ocean-300">{(item as Mechanism).category}</td>
                          <td className="py-4 px-6 text-ocean-300">{(item as Mechanism).main_funding_source || '-'}</td>
                          <td className="py-4 px-6 text-xs text-ocean-300 capitalize">{(item as Mechanism).maturity_level || '-'}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              (item as Mechanism).status === 'activo'
                                ? 'bg-green-950/40 border-green-800 text-green-400'
                                : 'bg-red-950/40 border-red-800 text-red-400'
                            }`}>
                              {(item as Mechanism).status}
                            </span>
                          </td>
                        </>
                      )}
                      {activeTab === 'projects' && (
                        <>
                          <td className="py-4 px-6 font-mono text-ocean-400">#{item.id}</td>
                          <td className="py-4 px-6 font-semibold text-white">{(item as Project).name}</td>
                          <td className="py-4 px-6 text-ocean-300">{(item as Project).start_year} - {(item as Project).end_year}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              (item as Project).data_confidence === 'high' ? 'bg-green-950 text-green-400 border border-green-900/30' :
                              (item as Project).data_confidence === 'medium' ? 'bg-blue-950 text-blue-400 border border-blue-900/30' :
                              'bg-amber-950 text-amber-400 border border-amber-900/30'
                            }`}>
                              {(item as Project).data_confidence}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-medium text-ocean-300">
                            {mechanisms.find(m => m.id === (item as Project).mechanism_id)?.name || '-'}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              (item as Project).status === 'active'
                                ? 'bg-green-950/40 border-green-800 text-green-400'
                                : (item as Project).status === 'draft'
                                ? 'bg-blue-950/40 border-blue-800 text-blue-400'
                                : 'bg-amber-950/40 border-amber-800 text-amber-400'
                            }`}>
                              {(item as Project).status}
                            </span>
                          </td>
                        </>
                      )}
                      {activeTab === 'investments' && (
                        <>
                          <td className="py-4 px-6 font-mono text-ocean-400">#{item.id}</td>
                          <td className="py-4 px-6 font-medium text-white truncate max-w-[200px]">
                            {projects.find(p => p.id === (item as Investment).project_id)?.name || '-'}
                          </td>
                          <td className="py-4 px-6 text-ocean-300">{(item as Investment).funding_source || '-'} ({(item as Investment).funding_type})</td>
                          <td className="py-4 px-6 font-mono font-bold text-forest-400">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((item as Investment).amount_usd || 0)}
                          </td>
                          <td className="py-4 px-6 font-mono text-white">{(item as Investment).year}</td>
                          <td className="py-4 px-6 text-xs text-ocean-300 uppercase">{(item as Investment).data_quality}</td>
                        </>
                      )}
                      {activeTab === 'interventions' && (
                        <>
                          <td className="py-4 px-6 font-mono text-ocean-400">#{item.id}</td>
                          <td className="py-4 px-6 font-medium text-white truncate max-w-[200px]">
                            {projects.find(p => p.id === (item as Intervention).project_id)?.name || '-'}
                          </td>
                          <td className="py-4 px-6 text-ocean-200 font-semibold capitalize">{(item as Intervention).intervention_type}</td>
                          <td className="py-4 px-6 font-mono text-sm">
                            <span className="text-white font-bold">{(item as Intervention).hectares_estimated} ha</span>
                            <span className="text-ocean-500 mx-1">/</span>
                            <span className="text-forest-400">{(item as Intervention).hectares_verified || 0} ha</span>
                          </td>
                          <td className="py-4 px-6 font-mono text-sm">
                            <span className="text-white font-bold">{(item as Intervention).tco2e_estimated} tCO₂e</span>
                            <span className="text-ocean-500 mx-1">/</span>
                            <span className="text-forest-400">{(item as Intervention).tco2e_verified || 0} tCO₂e</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              (item as Intervention).status === 'completed' || (item as Intervention).status === 'verified'
                                ? 'bg-green-950/40 border-green-800 text-green-400'
                                : (item as Intervention).status === 'ongoing'
                                ? 'bg-blue-950/40 border-blue-800 text-blue-400'
                                : 'bg-amber-950/40 border-amber-800 text-amber-400'
                            }`}>
                              {(item as Intervention).status}
                            </span>
                          </td>
                        </>
                      )}
                      {activeTab === 'mrv' && (
                        <>
                          <td className="py-4 px-6 font-mono text-ocean-400">#{item.id}</td>
                          <td className="py-4 px-6 font-mono text-white">#{(item as MRVObservation).intervention_id}</td>
                          <td className="py-4 px-6 font-medium text-white truncate max-w-[200px]">
                            {mrvIndicators.find(ind => ind.id === (item as MRVObservation).indicator_id)?.name || `Indicador #${(item as MRVObservation).indicator_id}`}
                          </td>
                          <td className="py-4 px-6 font-mono text-sm">
                            <span className="text-white font-semibold">{(item as MRVObservation).estimated_value}</span>
                            <span className="text-ocean-500 mx-1">/</span>
                            <span className="text-forest-400 font-bold">{(item as MRVObservation).verified_value || 0}</span>
                          </td>
                          <td className="py-4 px-6 text-ocean-300">
                            {(item as MRVObservation).observation_date ? new Date((item as MRVObservation).observation_date!).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              (item as MRVObservation).verification_status === 'verified'
                                ? 'bg-green-950 text-green-400 border border-green-900/30'
                                : 'bg-amber-950 text-amber-400 border border-amber-900/30'
                            }`}>
                              {(item as MRVObservation).verification_status}
                            </span>
                          </td>
                        </>
                      )}
                      {activeTab === 'layers' && (
                        <>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-white">{(item as Layer).name}</div>
                            <div className="text-xs text-ocean-400 truncate max-w-[220px]">{(item as Layer).description || 'Sin descripción'}</div>
                          </td>
                          <td className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-ocean-300">{(item as Layer).category || '-'}</td>
                          <td className="py-4 px-6 text-xs text-ocean-300 capitalize font-mono">{(item as Layer).geometry_type || '-'}</td>
                          <td className="py-4 px-6 text-xs font-bold text-forest-400 uppercase tracking-widest font-mono">{(item as Layer).layer_type}</td>
                          <td className="py-4 px-6 text-center">{(item as Layer).is_official ? '🟢 Si' : '⚪ No'}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              (item as Layer).is_active
                                ? 'bg-green-950/40 border-green-800 text-green-400'
                                : 'bg-red-950/40 border-red-800 text-red-400'
                            }`}>
                              {(item as Layer).is_active ? 'activo' : 'inactivo'}
                            </span>
                          </td>
                        </>
                      )}
                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right whitespace-nowrap text-xs font-bold">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="text-blue-400 hover:text-blue-300 px-2 py-1 rounded transition-colors mr-3"
                        >
                          Editar ✏️
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors"
                        >
                          Eliminar 🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-20 text-ocean-400">
                      No se encontraron registros en esta tabla. Haz clic en "Agregar" para crear uno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE & EDIT MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f19]/80 backdrop-blur-lg p-4 overflow-y-auto animate-fade-in">
          <div className="bg-ocean-900 border border-ocean-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-ocean-850 to-ocean-900 px-8 py-6 border-b border-ocean-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editId !== null ? '✏️ Editar Registro' : '➕ Agregar Nuevo Registro'}
                </h3>
                <p className="text-xs text-ocean-400 mt-1 uppercase font-semibold tracking-wider">
                  Módulo: {activeTab === 'mechanisms' ? 'Mecanismos' : activeTab === 'projects' ? 'Proyectos' : activeTab === 'investments' ? 'Inversiones' : activeTab === 'interventions' ? 'Intervenciones' : activeTab === 'mrv' ? 'MRV' : 'Capas GIS'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ocean-400 hover:text-white text-xl p-1 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* TAB 1: MECHANISM FORM */}
              {activeTab === 'mechanisms' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Código Identificador *</label>
                      <input
                        type="text"
                        required
                        value={formMechanism.code || ''}
                        onChange={e => setFormMechanism({ ...formMechanism, code: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Categoría *</label>
                      <select
                        value={formMechanism.category || ''}
                        onChange={e => setFormMechanism({ ...formMechanism, category: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="publico">Público</option>
                        <option value="privado">Privado</option>
                        <option value="mixto">Mixto</option>
                        <option value="internacional">Internacional</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Nombre del Mecanismo *</label>
                    <input
                      type="text"
                      required
                      value={formMechanism.name || ''}
                      onChange={e => setFormMechanism({ ...formMechanism, name: e.target.value })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Descripción General</label>
                    <textarea
                      rows={3}
                      value={formMechanism.description || ''}
                      onChange={e => setFormMechanism({ ...formMechanism, description: e.target.value })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Fuente de Financiamiento Principal</label>
                      <input
                        type="text"
                        value={formMechanism.main_funding_source || ''}
                        onChange={e => setFormMechanism({ ...formMechanism, main_funding_source: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Nivel de Madurez</label>
                      <select
                        value={formMechanism.maturity_level || ''}
                        onChange={e => setFormMechanism({ ...formMechanism, maturity_level: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="concept">Concepto</option>
                        <option value="design">Diseño</option>
                        <option value="operational">Operacional</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Horizonte Temporal</label>
                      <select
                        value={formMechanism.time_horizon || ''}
                        onChange={e => setFormMechanism({ ...formMechanism, time_horizon: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="short">Corto Plazo</option>
                        <option value="medium">Mediano Plazo</option>
                        <option value="long">Largo Plazo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Estado del Registro</label>
                      <select
                        value={formMechanism.status || ''}
                        onChange={e => setFormMechanism({ ...formMechanism, status: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Alineación NDC / Beneficiarios</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Alineación NDC"
                        value={formMechanism.ndc_alignment || ''}
                        onChange={e => setFormMechanism({ ...formMechanism, ndc_alignment: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Beneficiarios Objetivo"
                        value={formMechanism.target_beneficiaries || ''}
                        onChange={e => setFormMechanism({ ...formMechanism, target_beneficiaries: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PROJECT FORM */}
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Vincular a Mecanismo *</label>
                    <select
                      required
                      value={formProject.mechanism_id || ''}
                      onChange={e => setFormProject({ ...formProject, mechanism_id: Number(e.target.value) })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    >
                      <option value="">-- Seleccionar Mecanismo --</option>
                      {mechanisms.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Nombre del Proyecto *</label>
                    <input
                      type="text"
                      required
                      value={formProject.name || ''}
                      onChange={e => setFormProject({ ...formProject, name: e.target.value })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Descripción del Proyecto</label>
                    <textarea
                      rows={3}
                      value={formProject.description || ''}
                      onChange={e => setFormProject({ ...formProject, description: e.target.value })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Año Inicio *</label>
                      <input
                        type="number"
                        required
                        value={formProject.start_year || 2026}
                        onChange={e => setFormProject({ ...formProject, start_year: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Año Fin *</label>
                      <input
                        type="number"
                        required
                        value={formProject.end_year || 2030}
                        onChange={e => setFormProject({ ...formProject, end_year: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Estado del Proyecto</label>
                      <select
                        value={formProject.status || 'draft'}
                        onChange={e => setFormProject({ ...formProject, status: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="draft">Borrador</option>
                        <option value="active">Activo</option>
                        <option value="completed">Completado</option>
                        <option value="suspended">Suspendido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Precisión Geográfica</label>
                      <select
                        value={formProject.geographic_precision || 'nacional'}
                        onChange={e => {
                          setFormProject({ ...formProject, geographic_precision: e.target.value })
                          setSelectedRegionId("")
                          setSelectedProvinceId("")
                          setSelectedCommuneId("")
                          setSelectedUnitType("")
                          setSelectedUnitId("")
                        }}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="nacional">Nacional</option>
                        <option value="region">Regional</option>
                        <option value="provincia">Provincial</option>
                        <option value="comuna">Comunal</option>
                        <option value="otro">Otro (Cuenca, Área Protegida, etc.)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Confianza de los Datos</label>
                      <select
                        value={formProject.data_confidence || 'medium'}
                        onChange={e => setFormProject({ ...formProject, data_confidence: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta / Oficial</option>
                      </select>
                    </div>
                  </div>
                  {/* Vincular Localización Territorial */}
                  <div>
                    {/* Ubicaciones vinculadas actualmente */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">
                        Ubicaciones Vinculadas actualmente ({formProject.territory_ids?.length || 0})
                      </label>
                      {formProject.territory_ids && formProject.territory_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-2 bg-[#0b0f19] border border-ocean-800/60 p-3 rounded-xl min-h-[50px]">
                          {formProject.territory_ids.map(tid => {
                            const t = territories.find(item => item.id === tid);
                            if (!t) return null;
                            
                            // Determinar una clase de color premium para la etiqueta de tipo
                            const typeBadgeClass = 
                              t.type === 'region' ? 'bg-indigo-900/60 text-indigo-300 border-indigo-700/30' :
                              t.type === 'province' ? 'bg-sky-900/60 text-sky-300 border-sky-700/30' :
                              t.type === 'commune' ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/30' :
                              t.type === 'watershed' ? 'bg-amber-900/60 text-amber-300 border-amber-700/30' :
                              t.type === 'protected_area' ? 'bg-rose-900/60 text-rose-300 border-rose-700/30' :
                              'bg-ocean-900/60 text-ocean-300 border-ocean-800/30';
                            
                            const typeLabel = 
                              t.type === 'region' ? 'Región' :
                              t.type === 'province' ? 'Provincia' :
                              t.type === 'commune' ? 'Comuna' :
                              t.type === 'watershed' ? 'Cuenca' :
                              t.type === 'protected_area' ? 'Área Prot.' : 'Nacional';

                            return (
                              <div 
                                key={tid} 
                                className="flex items-center gap-2 bg-ocean-900/90 border border-ocean-700/30 px-3 py-1.5 rounded-xl text-xs font-medium text-white shadow-sm"
                              >
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${typeBadgeClass}`}>
                                  {typeLabel}
                                </span>
                                <span className="font-semibold">{t.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (formProject.territory_ids || []).filter(id => id !== tid);
                                    setFormProject({ ...formProject, territory_ids: updated });
                                  }}
                                  className="text-red-400 hover:text-red-300 font-bold ml-1 text-sm focus:outline-none transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-[#0b0f19] border border-ocean-800/40 rounded-xl text-xs text-ocean-400 font-medium">
                          Ninguna ubicación territorial vinculada a este proyecto todavía.
                        </div>
                      )}
                    </div>

                    {/* Selectores de Localización en Cascada */}
                    <div className="space-y-3 bg-[#0f172a]/60 border border-ocean-800/40 p-4 rounded-2xl">
                      <div className="text-xs font-bold uppercase text-ocean-400 tracking-wider mb-1">
                        Vincular nueva localización por niveles
                      </div>
                      
                      {/* CASO: COBERTURA NACIONAL */}
                      {(formProject.geographic_precision === 'nacional' || !formProject.geographic_precision) && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#131b2e]/40 p-3 rounded-xl border border-ocean-800/40">
                          <span className="text-xs text-ocean-300">
                            🌍 <strong>Cobertura Nacional:</strong> Esta precisión indica que el proyecto opera a nivel de todo el país.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const chileTerr = territories.find(t => t.type === 'country' || t.code === 'CL');
                              const targetId = chileTerr ? chileTerr.id : 1;
                              const currentIds = formProject.territory_ids || [];
                              if (currentIds.includes(targetId)) {
                                triggerAlert('error', 'La cobertura nacional ya está vinculada.');
                                return;
                              }
                              setFormProject({ ...formProject, territory_ids: [...currentIds, targetId] });
                              triggerAlert('success', 'Cobertura Nacional vinculada.');
                            }}
                            className="bg-forest-600 hover:bg-forest-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                          >
                            <span>➕</span> Vincular Cobertura Nacional
                          </button>
                        </div>
                      )}

                      {/* CASOS GEOGRÁFICOS: REGION, PROVINCIA, COMUNA */}
                      {['region', 'provincia', 'comuna'].includes(formProject.geographic_precision || '') && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Región - Se muestra para region, provincia, comuna */}
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-ocean-300 mb-1.5">1. Región</label>
                            <select
                              value={selectedRegionId}
                              onChange={e => {
                                const val = e.target.value === '' ? '' : Number(e.target.value);
                                setSelectedRegionId(val);
                                setSelectedProvinceId('');
                                setSelectedCommuneId('');
                              }}
                              className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-forest-500 text-xs"
                            >
                              <option value="">-- Seleccionar Región --</option>
                              {territories.filter(t => t.type === 'region').map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Provincia - Se muestra para provincia y comuna */}
                          {['provincia', 'comuna'].includes(formProject.geographic_precision || '') && (
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-ocean-300 mb-1.5">2. Provincia</label>
                              <select
                                value={selectedProvinceId}
                                disabled={!selectedRegionId}
                                onChange={e => {
                                  const val = e.target.value === '' ? '' : Number(e.target.value);
                                  setSelectedProvinceId(val);
                                  setSelectedCommuneId('');
                                }}
                                className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-forest-500 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">-- Seleccionar Provincia --</option>
                                {selectedRegionId ? territories.filter(t => t.type === 'province' && t.parent_id === selectedRegionId).map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                )) : null}
                              </select>
                            </div>
                          )}

                          {/* Comuna - Se muestra sólo para comuna */}
                          {formProject.geographic_precision === 'comuna' && (
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-ocean-300 mb-1.5">3. Comuna</label>
                              <select
                                value={selectedCommuneId}
                                disabled={!selectedProvinceId}
                                onChange={e => {
                                  const val = e.target.value === '' ? '' : Number(e.target.value);
                                  setSelectedCommuneId(val);
                                }}
                                className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-forest-500 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">-- Seleccionar Comuna --</option>
                                {selectedProvinceId ? territories.filter(t => t.type === 'commune' && t.parent_id === selectedProvinceId).map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                )) : null}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CASO: OTRO (CUENCA, ÁREA PROTEGIDA, ETC.) */}
                      {formProject.geographic_precision === 'otro' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-ocean-300 mb-1.5">Tipo de Unidad Especial</label>
                            <select
                              value={selectedUnitType}
                              onChange={e => {
                                setSelectedUnitType(e.target.value);
                                setSelectedUnitId('');
                              }}
                              className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-forest-500 text-xs"
                            >
                              <option value="">-- Seleccionar Tipo --</option>
                              <option value="watershed">Cuenca Hidrográfica</option>
                              <option value="protected_area">Área Protegida</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-ocean-300 mb-1.5">Seleccionar Unidad</label>
                            <select
                              value={selectedUnitId}
                              disabled={!selectedUnitType}
                              onChange={e => {
                                const val = e.target.value === '' ? '' : Number(e.target.value);
                                setSelectedUnitId(val);
                              }}
                              className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-forest-500 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">-- Seleccionar Unidad --</option>
                              {selectedUnitType ? territories.filter(t => t.type === selectedUnitType).map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              )) : null}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* BOTÓN DE VINCULACIÓN PARA NIVELES */}
                      {formProject.geographic_precision && formProject.geographic_precision !== 'nacional' && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={
                              (formProject.geographic_precision === 'region' && !selectedRegionId) ||
                              (formProject.geographic_precision === 'provincia' && !selectedProvinceId) ||
                              (formProject.geographic_precision === 'comuna' && !selectedCommuneId) ||
                              (formProject.geographic_precision === 'otro' && !selectedUnitId)
                            }
                            onClick={() => {
                              let targetId: number | null = null;
                              let label = '';
                              
                              if (formProject.geographic_precision === 'region' && selectedRegionId) {
                                targetId = Number(selectedRegionId);
                                label = 'Región';
                              } else if (formProject.geographic_precision === 'provincia' && selectedProvinceId) {
                                targetId = Number(selectedProvinceId);
                                label = 'Provincia';
                              } else if (formProject.geographic_precision === 'comuna' && selectedCommuneId) {
                                targetId = Number(selectedCommuneId);
                                label = 'Comuna';
                              } else if (formProject.geographic_precision === 'otro' && selectedUnitId) {
                                targetId = Number(selectedUnitId);
                                label = selectedUnitType === 'watershed' ? 'Cuenca' : 'Área Protegida';
                              }

                              if (targetId) {
                                const currentIds = formProject.territory_ids || [];
                                if (currentIds.includes(targetId)) {
                                  triggerAlert('error', `Esta ${label.toLowerCase()} ya se encuentra vinculada al proyecto.`);
                                  return;
                                }
                                const updated = [...currentIds, targetId];
                                setFormProject({ ...formProject, territory_ids: updated });
                                triggerAlert('success', `¡${label} vinculada exitosamente!`);
                                
                                setSelectedRegionId('');
                                setSelectedProvinceId('');
                                setSelectedCommuneId('');
                                setSelectedUnitType('');
                                setSelectedUnitId('');
                              }
                            }}
                            className="bg-forest-600 hover:bg-forest-500 text-white font-bold px-4 py-2 rounded-xl border border-forest-500/20 text-xs shadow-md shadow-forest-600/10 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <span>➕</span> Vincular {
                              formProject.geographic_precision === 'region' ? 'Región' :
                              formProject.geographic_precision === 'provincia' ? 'Provincia' :
                              formProject.geographic_precision === 'comuna' ? 'Comuna' : 'Unidad Especial'
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: INVESTMENT FORM */}
              {activeTab === 'investments' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Vincular a Proyecto *</label>
                    <select
                      required
                      value={formInvestment.project_id || ''}
                      onChange={e => setFormInvestment({ ...formInvestment, project_id: Number(e.target.value) })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    >
                      <option value="">-- Seleccionar Proyecto --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Origen Financiamiento *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. FPA, Presupuesto GORE, etc."
                        value={formInvestment.funding_source || ''}
                        onChange={e => setFormInvestment({ ...formInvestment, funding_source: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Tipo Financiamiento</label>
                      <select
                        value={formInvestment.funding_type || 'public'}
                        onChange={e => setFormInvestment({ ...formInvestment, funding_type: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="public">Público</option>
                        <option value="private">Privado</option>
                        <option value="international">Internacional</option>
                        <option value="mixed">Mixto</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Monto Local *</label>
                      <input
                        type="number"
                        required
                        value={formInvestment.amount || 0}
                        onChange={e => setFormInvestment({ ...formInvestment, amount: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Moneda</label>
                      <input
                        type="text"
                        required
                        value={formInvestment.currency || 'USD'}
                        onChange={e => setFormInvestment({ ...formInvestment, currency: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Monto Equivalente USD</label>
                      <input
                        type="number"
                        value={formInvestment.amount_usd || 0}
                        onChange={e => setFormInvestment({ ...formInvestment, amount_usd: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Año de la Inversión *</label>
                      <input
                        type="number"
                        required
                        value={formInvestment.year || 2026}
                        onChange={e => setFormInvestment({ ...formInvestment, year: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Calidad del Dato</label>
                      <select
                        value={formInvestment.data_quality || 'medium'}
                        onChange={e => setFormInvestment({ ...formInvestment, data_quality: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta / Oficial</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: INTERVENTION FORM */}
              {activeTab === 'interventions' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Vincular a Proyecto *</label>
                    <select
                      required
                      value={formIntervention.project_id || ''}
                      onChange={e => setFormIntervention({ ...formIntervention, project_id: Number(e.target.value) })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    >
                      <option value="">-- Seleccionar Proyecto --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Tipo de Intervención *</label>
                      <select
                        value={formIntervention.intervention_type || 'restauracion'}
                        onChange={e => setFormIntervention({ ...formIntervention, intervention_type: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="restauracion">Restauración Ecológica</option>
                        <option value="forestacion">Aforestación / Reforestación</option>
                        <option value="conservacion">Conservación de Suelos</option>
                        <option value="agroforestal">Sistemas Agroforestales</option>
                        <option value="silvopastoril">Sistemas Silvopastoriles</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Estado Involucrado</label>
                      <select
                        value={formIntervention.status || 'planned'}
                        onChange={e => setFormIntervention({ ...formIntervention, status: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="planned">Planificado</option>
                        <option value="ongoing">En Ejecución</option>
                        <option value="completed">Completado</option>
                        <option value="verified">Verificado por CONAF / MMA</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Hectáreas Estimadas *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formIntervention.hectares_estimated || 0}
                        onChange={e => setFormIntervention({ ...formIntervention, hectares_estimated: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Hectáreas Verificadas</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formIntervention.hectares_verified || 0}
                        onChange={e => setFormIntervention({ ...formIntervention, hectares_verified: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Carbono tCO₂e Estimado *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={formIntervention.tco2e_estimated || 0}
                        onChange={e => setFormIntervention({ ...formIntervention, tco2e_estimated: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Carbono tCO₂e Verificado</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formIntervention.tco2e_verified || 0}
                        onChange={e => setFormIntervention({ ...formIntervention, tco2e_verified: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: MRV OBSERVATION FORM */}
              {activeTab === 'mrv' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Vincular a Intervención *</label>
                      <select
                        required
                        value={formMRVObservation.intervention_id || ''}
                        onChange={e => setFormMRVObservation({ ...formMRVObservation, intervention_id: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="">-- Seleccionar Intervención --</option>
                        {interventions.map(i => {
                          const projName = projects.find(p => p.id === i.project_id)?.name || ''
                          return (
                            <option key={i.id} value={i.id}>#{i.id} - {i.intervention_type} ({projName.substring(0, 30)}...)</option>
                          )
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Indicador MRV *</label>
                      <select
                        required
                        value={formMRVObservation.indicator_id || ''}
                        onChange={e => setFormMRVObservation({ ...formMRVObservation, indicator_id: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="">-- Seleccionar Indicador --</option>
                        {mrvIndicators.map(ind => (
                          <option key={ind.id} value={ind.id}>{ind.name} ({ind.code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Valor Estimado *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formMRVObservation.estimated_value || 0}
                        onChange={e => setFormMRVObservation({ ...formMRVObservation, estimated_value: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Valor Verificado</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formMRVObservation.verified_value || 0}
                        onChange={e => setFormMRVObservation({ ...formMRVObservation, verified_value: Number(e.target.value) })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Fecha de Observación *</label>
                      <input
                        type="date"
                        required
                        value={formMRVObservation.observation_date || ''}
                        onChange={e => setFormMRVObservation({ ...formMRVObservation, observation_date: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Estado Verificación</label>
                      <select
                        value={formMRVObservation.verification_status || 'estimated'}
                        onChange={e => setFormMRVObservation({ ...formMRVObservation, verification_status: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="estimated">Solo Estimado / Preliminar</option>
                        <option value="verified">Físicamente Verificado en Terreno</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Notas y Observaciones de Auditoría</label>
                    <textarea
                      rows={3}
                      placeholder="Registrar detalles del monitoreo o inspecciones..."
                      value={formMRVObservation.notes || ''}
                      onChange={e => setFormMRVObservation({ ...formMRVObservation, notes: e.target.value })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: LAYER FORM */}
              {activeTab === 'layers' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Nombre de la Capa GIS *</label>
                    <input
                      type="text"
                      required
                      value={formLayer.name || ''}
                      onChange={e => setFormLayer({ ...formLayer, name: e.target.value })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Descripción Técnica</label>
                    <textarea
                      rows={2}
                      value={formLayer.description || ''}
                      onChange={e => setFormLayer({ ...formLayer, description: e.target.value })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Categoría</label>
                      <select
                        value={formLayer.category || 'territorial'}
                        onChange={e => setFormLayer({ ...formLayer, category: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="territorial">Territorial</option>
                        <option value="forest">Forestal / Cobertura</option>
                        <option value="climate">Climática / NDC</option>
                        <option value="biodiversity">Biodiversidad</option>
                        <option value="prioritization">Priorización GWP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Tipo de Capa</label>
                      <select
                        value={formLayer.layer_type || 'geojson'}
                        onChange={e => setFormLayer({ ...formLayer, layer_type: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="geojson">GeoJSON estático</option>
                        <option value="wms">WMS (Web Map Service)</option>
                        <option value="wfs">WFS (Web Feature Service)</option>
                        <option value="tiles">Raster Tiles</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">Geometría</label>
                      <select
                        value={formLayer.geometry_type || 'polygon'}
                        onChange={e => setFormLayer({ ...formLayer, geometry_type: e.target.value })}
                        className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                      >
                        <option value="point">Punto (GeoPoint)</option>
                        <option value="line">Línea (MultiLine)</option>
                        <option value="polygon">Polígono (Shapefile)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ocean-300 mb-2">URL del Servidor GIS / GeoServer</label>
                    <input
                      type="url"
                      placeholder="http://geoserver.cl/geoserver/wms..."
                      value={formLayer.source_url || ''}
                      onChange={e => setFormLayer({ ...formLayer, source_url: e.target.value })}
                      className="w-full bg-[#131b2e] border border-ocean-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-forest-500 text-sm"
                    />
                  </div>
                  <div className="flex gap-6 p-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formLayer.is_active || false}
                        onChange={e => setFormLayer({ ...formLayer, is_active: e.target.checked })}
                        className="rounded bg-[#131b2e] border-ocean-800 text-forest-500 focus:ring-forest-500"
                      />
                      <span className="text-sm text-ocean-200">Capa Activa por defecto</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formLayer.is_official || false}
                        onChange={e => setFormLayer({ ...formLayer, is_official: e.target.checked })}
                        className="rounded bg-[#131b2e] border-ocean-800 text-forest-500 focus:ring-forest-500"
                      />
                      <span className="text-sm text-ocean-200">Capa de Capacidad Oficial (IDE Chile)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-ocean-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-ocean-800 hover:bg-ocean-750 border border-ocean-700 px-6 py-2.5 rounded-xl font-bold transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-forest-600 to-forest-500 hover:from-forest-500 hover:to-forest-400 px-6 py-2.5 rounded-xl font-bold shadow-md shadow-forest-600/10 transition-all text-sm"
                >
                  {loading ? 'Guardando...' : '📥 Guardar en Base de Datos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f19]/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-ocean-900 border border-ocean-800 max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚠️</span> ¿Confirmar Eliminación Física?
            </h3>
            <p className="text-sm text-ocean-300 leading-relaxed">
              Esta acción eliminará físicamente el registro de la tabla definitiva del sistema.
              Si hay registros dependientes vinculados a este elemento, la operación fallará por integridad referencial.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="bg-ocean-800 hover:bg-ocean-750 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteRecord}
                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Eliminar Físicamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
