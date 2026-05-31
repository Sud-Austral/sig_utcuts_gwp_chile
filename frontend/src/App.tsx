import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './layouts/Layout'

const Login        = lazy(() => import('./pages/Login'))
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const MapPage      = lazy(() => import('./pages/MapPage'))
const Mechanisms   = lazy(() => import('./pages/Mechanisms'))
const Investments  = lazy(() => import('./pages/Investments'))
const Prioritization = lazy(() => import('./pages/Prioritization'))
const MRV          = lazy(() => import('./pages/MRV'))
const DataGaps     = lazy(() => import('./pages/DataGaps'))
const Reports      = lazy(() => import('./pages/Reports'))
const DataIngestion = lazy(() => import('./pages/DataIngestion'))

const Loader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-pulse text-ocean-400">Cargando...</div>
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="mapa" element={<MapPage />} />
          <Route path="mecanismos" element={<Mechanisms />} />
          <Route path="inversiones" element={<Investments />} />
          <Route path="priorizacion" element={<Prioritization />} />
          <Route path="mrv" element={<MRV />} />
          <Route path="brechas" element={<DataGaps />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="carga" element={<DataIngestion />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
