import { useEffect, useState } from 'react'
import api from '../api/client'

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#eab308', '#ec4899']

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-pulse-soft text-ocean-400 text-lg">Cargando dashboard...</div></div>
  if (!data) return <div className="text-center text-ocean-400 py-20">No se pudo cargar el dashboard</div>

  const kpis = [
    { label: 'Inversión Total', value: `$${(data.total_investment_usd / 1e6).toFixed(1)}M`, sub: 'USD', color: 'from-forest-600 to-forest-800' },
    { label: 'Inversión Pública', value: `$${(data.public_investment_usd / 1e6).toFixed(1)}M`, sub: 'USD', color: 'from-ocean-600 to-ocean-800' },
    { label: 'Inversión Internacional', value: `$${(data.international_investment_usd / 1e6).toFixed(1)}M`, sub: 'USD', color: 'from-purple-600 to-purple-800' },
    { label: 'Mecanismos', value: data.mechanisms_count, sub: 'registrados', color: 'from-fire-600 to-fire-800' },
    { label: 'Proyectos', value: data.projects_count, sub: 'activos', color: 'from-cyan-600 to-cyan-800' },
    { label: 'Comunas', value: data.territories_count, sub: 'cubiertas', color: 'from-amber-600 to-amber-800' },
    { label: 'Hectáreas Estimadas', value: `${(data.estimated_hectares / 1000).toFixed(0)}k`, sub: 'ha', color: 'from-green-600 to-green-800' },
    { label: 'tCO₂e Estimadas', value: `${(data.estimated_tco2e / 1000).toFixed(0)}k`, sub: 'toneladas', color: 'from-teal-600 to-teal-800' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard Ejecutivo</h1>
        <p className="text-ocean-400 text-sm">Resumen nacional del sector UTCUTS — datos demo</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
              <span className="text-white text-xs font-bold">{kpi.label[0]}</span>
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-xs text-ocean-400 mt-1">{kpi.label}</div>
            <div className="text-xs text-ocean-500">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investment by Source */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Inversión por Fuente</h3>
          <div className="space-y-3 mt-2">
            {(data.investment_by_source ?? []).map((item: any, i: number) => {
              const total = (data.investment_by_source ?? []).reduce((s: number, x: any) => s + (x.amount || 0), 0)
              const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ocean-300 capitalize">{item.source}</span>
                    <span className="text-white font-mono">${(item.amount / 1e6).toFixed(1)}M ({pct}%)</span>
                  </div>
                  <div className="w-full bg-ocean-800 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              )
            })}
            {(data.investment_by_source ?? []).length === 0 && (
              <p className="text-ocean-500 text-sm text-center py-4">Sin datos de inversión</p>
            )}
          </div>
        </div>

        {/* Top Territories */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Ranking Territorial</h3>
          <div className="space-y-3">
            {(data.top_territories ?? []).map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-ocean-800/30 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-ocean-400 w-6">#{i + 1}</span>
                  <span className="text-sm text-white">{t.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-ocean-300">{t.score?.toFixed(1)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium badge-${t.priority?.replace(' ', '-')}`}>
                    {t.priority === 'muy_alta' ? 'Muy Alta' : t.priority === 'alta' ? 'Alta' : t.priority === 'media' ? 'Media' : t.priority === 'baja' ? 'Baja' : 'Muy Baja'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.data_gaps_count > 0 && (
        <div className="glass-card p-4 border-fire-500/30">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-fire-400">{data.data_gaps_count} brechas de información pendientes</p>
              <p className="text-xs text-ocean-400">Revise el módulo de brechas para más detalles</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
