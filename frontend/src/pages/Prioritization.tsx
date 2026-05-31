import { useEffect, useState } from 'react'
import api from '../api/client'

export default function Prioritization() {
  const [ranking, setRanking] = useState<any[]>([])
  const [weights, setWeights] = useState({
    forest_restoration_potential: 0.20, climate_risk: 0.15, degradation_loss_risk: 0.15,
    financial_gap: 0.15, biodiversity_value: 0.10, social_vulnerability: 0.10,
    operational_feasibility: 0.10, mechanism_alignment: 0.05,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadRanking() }, [])

  const loadRanking = () => {
    api.get('/prioritization/ranking').then(r => { setRanking(Array.isArray(r.data) ? r.data : []); setLoading(false) }).catch(() => setLoading(false))
  }

  const recalculate = async () => {
    setLoading(true)
    try {
      const r = await api.post('/prioritization/calculate', weights)
      setRanking((r.data?.results ?? []).map((x: any) => ({ ...x, territory_name: x.name, score_total: x.score })))
      setLoading(false)
    } catch { setLoading(false) }
  }

  const labels: Record<string, string> = {
    forest_restoration_potential: 'Potencial Restauración', climate_risk: 'Riesgo Climático',
    degradation_loss_risk: 'Degradación/Pérdida', financial_gap: 'Brecha Financiera',
    biodiversity_value: 'Biodiversidad', social_vulnerability: 'Vulnerabilidad Social',
    operational_feasibility: 'Factibilidad', mechanism_alignment: 'Alineación Mecanismos',
  }

  if (loading) return <div className="text-center text-ocean-400 py-20 animate-pulse-soft">Calculando priorización...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Priorización Territorial</h1>
      <p className="text-ocean-400 text-sm">Índice multicriterio por comuna — pesos configurables</p>

      {/* Weight sliders */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Ponderaciones</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(weights).map(([key, val]) => (
            <div key={key}>
              <label className="text-xs text-ocean-400 block mb-1">{labels[key]}</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="0.5" step="0.05" value={val}
                  onChange={e => setWeights(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                  className="flex-1 accent-forest-500" />
                <span className="text-xs text-ocean-300 w-10 text-right">{(val * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={recalculate} className="mt-4 px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-lg text-sm font-medium transition-colors">
          🔄 Recalcular
        </button>
      </div>

      {/* Chart — barras CSS, sin Recharts */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Ranking de Comunas</h3>
        {ranking.length > 0 ? (
          <div className="space-y-2">
            {ranking.slice(0, 10).map((r: any, i: number) => {
              const score = r.score_total ?? r.score ?? 0
              const name = r.territory_name ?? r.name ?? '—'
              const pct = Math.min(100, Math.max(0, score))
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-ocean-400 w-4 text-right">{i + 1}</span>
                  <span className="text-xs text-ocean-200 w-32 truncate">{name}</span>
                  <div className="flex-1 bg-ocean-800 rounded-full h-2">
                    <div className="h-2 rounded-full bg-forest-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono text-white w-10 text-right">{score.toFixed(1)}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-ocean-400 py-10 text-sm">Sin datos de priorización disponibles</div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ocean-700/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-ocean-400">#</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-ocean-400">Comuna</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-ocean-400">Puntaje</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-ocean-400">Prioridad</th>
          </tr></thead>
          <tbody>{ranking.map((r, i) => (
            <tr key={i} className="border-b border-ocean-800/30 hover:bg-ocean-800/20">
              <td className="px-4 py-3 text-ocean-400 font-mono">{i + 1}</td>
              <td className="px-4 py-3 text-white">{r.territory_name || r.name}</td>
              <td className="px-4 py-3 text-right font-mono text-white">{(r.score_total || r.score)?.toFixed(1)}</td>
              <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium badge-${r.priority_class}`}>
                {r.priority_class === 'muy_alta' ? 'Muy Alta' : r.priority_class === 'alta' ? 'Alta' : r.priority_class === 'media' ? 'Media' : r.priority_class === 'baja' ? 'Baja' : 'Muy Baja'}
              </span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
