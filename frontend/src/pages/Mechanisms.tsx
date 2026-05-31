import { useEffect, useState } from 'react'
import api from '../api/client'

const MATURITY_COLORS: Record<string, string> = {
  concept: 'bg-purple-500/20 text-purple-300', design: 'bg-blue-500/20 text-blue-300',
  pilot: 'bg-amber-500/20 text-amber-300', operational: 'bg-green-500/20 text-green-300',
  scaling: 'bg-emerald-500/20 text-emerald-300',
}

export default function Mechanisms() {
  const [mechanisms, setMechanisms] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/mechanisms').then((r) => { setMechanisms(Array.isArray(r.data) ? r.data : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-ocean-400 py-20 animate-pulse-soft">Cargando mecanismos...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Catálogo de Mecanismos Financieros</h1>
        <p className="text-ocean-400 text-sm">{mechanisms.length} mecanismos registrados — datos demo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mechanisms.map((m, i) => (
          <div key={m.id} className="glass-card p-5 animate-fade-in cursor-pointer hover:scale-[1.01] transition-transform"
               style={{ animationDelay: `${i * 60}ms` }}
               onClick={() => setSelected(m)}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-mono text-ocean-500">{m.code}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MATURITY_COLORS[m.maturity_level] || 'bg-ocean-700 text-ocean-300'}`}>
                {m.maturity_level || 'N/A'}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{m.name}</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-ocean-400">
                <span>💰</span> {m.main_funding_source || 'Sin fuente'}
              </div>
              <div className="flex items-center gap-2 text-xs text-ocean-400">
                <span>🎯</span> {m.target_beneficiaries || 'Sin beneficiarios'}
              </div>
              <div className="flex items-center gap-2 text-xs text-ocean-400">
                <span>📅</span> Horizonte: {m.time_horizon === 'short' ? 'Corto' : m.time_horizon === 'medium' ? 'Mediano' : 'Largo'} plazo
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="glass-card max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs text-ocean-500 font-mono">{selected.code}</span>
                <h2 className="text-xl font-bold text-white mt-1">{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-ocean-400 hover:text-white text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-xs text-ocean-400">Categoría</span><p className="text-ocean-200">{selected.category}</p></div>
              <div><span className="text-xs text-ocean-400">Fuente principal</span><p className="text-ocean-200">{selected.main_funding_source}</p></div>
              <div><span className="text-xs text-ocean-400">Madurez</span><p className="text-ocean-200">{selected.maturity_level}</p></div>
              <div><span className="text-xs text-ocean-400">Horizonte</span><p className="text-ocean-200">{selected.time_horizon}</p></div>
              <div className="col-span-2"><span className="text-xs text-ocean-400">Alineación NDC</span><p className="text-ocean-200">{selected.ndc_alignment}</p></div>
              <div className="col-span-2"><span className="text-xs text-ocean-400">Beneficiarios</span><p className="text-ocean-200">{selected.target_beneficiaries}</p></div>
              <div className="col-span-2"><span className="text-xs text-ocean-400">Descripción</span><p className="text-ocean-200">{selected.description}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
