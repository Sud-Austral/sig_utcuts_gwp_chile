import { useEffect, useState } from 'react'
import api from '../api/client'

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-300', warning: 'bg-amber-500/20 text-amber-300',
  error: 'bg-red-500/20 text-red-300', critical: 'bg-red-600/30 text-red-400',
}
const FLAG_LABELS: Record<string, string> = {
  missing_geometry: 'Sin geometría', missing_amount: 'Sin monto', missing_source: 'Sin fuente',
  missing_year: 'Sin año', low_confidence: 'Baja confianza', estimated_value: 'Solo estimado',
  missing_physical_indicator: 'Sin indicador físico', missing_climate_indicator: 'Sin indicador climático',
  possible_duplicate: 'Posible duplicado',
}

export default function DataGaps() {
  const [summary, setSummary] = useState<any>(null)
  const [flags, setFlags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/data-quality/summary'), api.get('/data-quality/flags?resolved=false')])
      .then(([s, f]) => { setSummary(s.data); setFlags(f.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-ocean-400 py-20 animate-pulse-soft">Cargando brechas...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Brechas de Información</h1>
      <p className="text-ocean-400 text-sm">{summary?.total_unresolved || 0} brechas pendientes</p>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kpi-card"><div className="text-2xl font-bold text-fire-400">{summary.total_unresolved}</div><div className="text-xs text-ocean-400 mt-1">Total Pendientes</div></div>
          {summary.by_severity?.map((s: any) => (
            <div key={s.severity} className="kpi-card"><div className="text-2xl font-bold text-white">{s.count}</div><div className="text-xs text-ocean-400 mt-1">{s.severity}</div></div>
          ))}
        </div>
      )}

      {/* By type */}
      {summary?.by_type && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Brechas por Tipo</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Array.isArray(summary.by_type) ? summary.by_type : []).map((t: any) => (
              <div key={t.type} className="bg-ocean-800/30 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-ocean-300">{FLAG_LABELS[t.type] || t.type}</span>
                <span className="text-lg font-bold text-fire-400">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flags table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ocean-700/50">
            <th className="text-left px-4 py-3 text-xs text-ocean-400">Entidad</th>
            <th className="text-left px-4 py-3 text-xs text-ocean-400">ID</th>
            <th className="text-left px-4 py-3 text-xs text-ocean-400">Tipo</th>
            <th className="text-center px-4 py-3 text-xs text-ocean-400">Severidad</th>
            <th className="text-left px-4 py-3 text-xs text-ocean-400">Descripción</th>
          </tr></thead>
          <tbody>{flags.map((f) => (
            <tr key={f.id} className="border-b border-ocean-800/30 hover:bg-ocean-800/20">
              <td className="px-4 py-2 text-white">{f.entity_type}</td>
              <td className="px-4 py-2 text-ocean-400 font-mono">{f.entity_id}</td>
              <td className="px-4 py-2 text-ocean-300">{FLAG_LABELS[f.flag_type] || f.flag_type}</td>
              <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${SEVERITY_COLORS[f.severity]}`}>{f.severity}</span></td>
              <td className="px-4 py-2 text-ocean-400 text-xs">{f.description}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
