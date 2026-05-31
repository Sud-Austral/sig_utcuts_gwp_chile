import { useEffect, useState } from 'react'
import api from '../api/client'

export default function MRV() {
  const [summary, setSummary] = useState<any>(null)
  const [indicators, setIndicators] = useState<any[]>([])
  const [observations, setObservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/mrv/summary'),
      api.get('/mrv/indicators'),
      api.get('/mrv/observations'),
    ]).then(([s, i, o]) => {
      setSummary(s.data); setIndicators(Array.isArray(i.data) ? i.data : []); setObservations(Array.isArray(o.data) ? o.data : []); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-ocean-400 py-20 animate-pulse-soft">Cargando MRV...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Monitoreo, Reporte y Verificación</h1>
      <p className="text-ocean-400 text-sm">Sistema MRV — datos demo</p>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kpi-card"><div className="text-2xl font-bold text-white">{summary.total_observations}</div><div className="text-xs text-ocean-400 mt-1">Observaciones Totales</div></div>
          <div className="kpi-card"><div className="text-2xl font-bold text-forest-400">{summary.verified}</div><div className="text-xs text-ocean-400 mt-1">Verificadas</div></div>
          <div className="kpi-card"><div className="text-2xl font-bold text-amber-400">{summary.estimated}</div><div className="text-xs text-ocean-400 mt-1">Estimadas</div></div>
          <div className="kpi-card"><div className="text-2xl font-bold text-ocean-300">{summary.total_observations > 0 ? ((summary.verified / summary.total_observations) * 100).toFixed(0) : 0}%</div><div className="text-xs text-ocean-400 mt-1">Tasa de Verificación</div></div>
        </div>
      )}

      {/* Indicators */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Indicadores MRV ({indicators.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {indicators.map((ind) => (
            <div key={ind.id} className="bg-ocean-800/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-ocean-500">{ind.code}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${ind.category === 'financial' ? 'bg-green-500/20 text-green-300' : ind.category === 'physical' ? 'bg-blue-500/20 text-blue-300' : ind.category === 'climate' ? 'bg-cyan-500/20 text-cyan-300' : ind.category === 'social' ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'}`}>{ind.category}</span>
              </div>
              <p className="text-sm text-white">{ind.name}</p>
              <p className="text-xs text-ocean-400">{ind.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Observations table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-ocean-700/50">
          <h3 className="text-sm font-semibold text-white">Últimas Observaciones</h3>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ocean-700/50">
            <th className="text-left px-4 py-2 text-xs text-ocean-400">ID</th>
            <th className="text-left px-4 py-2 text-xs text-ocean-400">Indicador</th>
            <th className="text-right px-4 py-2 text-xs text-ocean-400">Estimado</th>
            <th className="text-right px-4 py-2 text-xs text-ocean-400">Verificado</th>
            <th className="text-center px-4 py-2 text-xs text-ocean-400">Estado</th>
          </tr></thead>
          <tbody>{observations.slice(0, 20).map((obs) => (
            <tr key={obs.id} className="border-b border-ocean-800/30 hover:bg-ocean-800/20">
              <td className="px-4 py-2 text-ocean-400 font-mono">{obs.id}</td>
              <td className="px-4 py-2 text-ocean-300">{obs.indicator_id}</td>
              <td className="px-4 py-2 text-right text-white font-mono">{obs.estimated_value?.toFixed(1) || '—'}</td>
              <td className="px-4 py-2 text-right text-forest-400 font-mono">{obs.verified_value?.toFixed(1) || '—'}</td>
              <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${obs.verification_status === 'verified' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>{obs.verification_status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
