import { useEffect, useState } from 'react'
import api from '../api/client'

export default function Investments() {
  const [investments, setInvestments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ project_id: 1, funding_source: '', funding_type: 'public', amount: 0, currency: 'USD', amount_usd: 0, year: 2024, data_quality: 'demo' })

  useEffect(() => {
    api.get('/investments').then(r => { setInvestments(Array.isArray(r.data) ? r.data : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    try {
      await api.post('/investments', form)
      const r = await api.get('/investments')
      setInvestments(Array.isArray(r.data) ? r.data : [])
      setShowForm(false)
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="text-center text-ocean-400 py-20 animate-pulse-soft">Cargando inversiones...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Inversiones y Proyectos</h1>
          <p className="text-ocean-400 text-sm">{investments.length} inversiones registradas — datos demo</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-lg text-sm font-medium transition-colors">
          + Nueva Inversión
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">Registrar Nueva Inversión (Demo)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input className="bg-ocean-800 border border-ocean-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Fuente" value={form.funding_source} onChange={e => setForm({...form, funding_source: e.target.value})} />
            <select className="bg-ocean-800 border border-ocean-700 rounded-lg px-3 py-2 text-sm text-white" value={form.funding_type} onChange={e => setForm({...form, funding_type: e.target.value})}>
              <option value="public">Público</option>
              <option value="private">Privado</option>
              <option value="international">Internacional</option>
            </select>
            <input type="number" className="bg-ocean-800 border border-ocean-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Monto USD" value={form.amount} onChange={e => setForm({...form, amount: +e.target.value, amount_usd: +e.target.value})} />
            <input type="number" className="bg-ocean-800 border border-ocean-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Año" value={form.year} onChange={e => setForm({...form, year: +e.target.value})} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-lg text-sm font-medium transition-colors">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-ocean-700 hover:bg-ocean-600 text-white rounded-lg text-sm font-medium transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ocean-400 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ocean-400 uppercase tracking-wider">Fuente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ocean-400 uppercase tracking-wider">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-ocean-400 uppercase tracking-wider">Monto USD</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-ocean-400 uppercase tracking-wider">Año</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-ocean-400 uppercase tracking-wider">Calidad</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv, i) => (
                <tr key={inv.id} className="border-b border-ocean-800/30 hover:bg-ocean-800/20 transition-colors animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3 text-ocean-400 font-mono">{inv.id}</td>
                  <td className="px-4 py-3 text-white">{inv.funding_source || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${inv.funding_type === 'public' ? 'bg-blue-500/20 text-blue-300' : inv.funding_type === 'private' ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'}`}>{inv.funding_type}</span></td>
                  <td className="px-4 py-3 text-right text-white font-mono">${inv.amount_usd?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-3 text-center text-ocean-300">{inv.year || '—'}</td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full text-xs bg-ocean-700 text-ocean-300">{inv.data_quality}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
