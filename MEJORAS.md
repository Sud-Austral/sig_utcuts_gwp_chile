# Mejoras Propuestas — SIG-UTCUTS Chile

Ordenadas por prioridad de impacto en producción.

---

## 1. Interceptor axios para 401

**Archivo:** `frontend/src/api/client.ts`

Actualmente si el token expira, todos los endpoints devuelven 401 y el `catch` solo hace `setLoading(false)` — el usuario ve pantalla vacía sin explicación. Con un interceptor que detecte 401 y llame `logout()` + `navigate('/login')`, la experiencia sería coherente.

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

## 2. JWT requerido en endpoints de escritura

**Archivos:** `backend/app/api/v1/mechanisms.py`, `investments.py`, `projects.py`, `interventions.py`, etc.

Los endpoints POST/PUT/DELETE no tienen `Depends(get_current_user)`. Cualquier persona con acceso a la URL puede modificar o borrar datos sin autenticarse. Es el gap de seguridad más serio del backend.

```python
from app.core.deps import get_current_user

@router.post("/", response_model=MechanismResponse)
def create_mechanism(
    data: MechanismCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # agregar
):
```

---

## 3. `Promise.allSettled` en lugar de `Promise.all`

**Archivos:** `frontend/src/pages/DataIngestion.tsx`, `MRV.tsx`

Con `Promise.all([8 llamadas])`, si UNA falla, toda la página queda vacía. Con `Promise.allSettled` cada sección falla de forma independiente y el resto de datos sigue mostrándose.

```typescript
const results = await Promise.allSettled([
  api.get('/mechanisms'),
  api.get('/projects'),
  // ...
])
results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    const data = Array.isArray(result.value.data) ? result.value.data : []
    // asignar al estado correspondiente
  }
})
```

---

## 4. Mensajes de error visibles al usuario

**Archivos:** Todos los pages del frontend

Todos los `catch` hacen solo `setLoading(false)` o nada. El usuario ve pantalla vacía sin saber si es un problema de red, sesión expirada o error del servidor. Agregar un estado de error con banner informativo.

```typescript
const [error, setError] = useState<string | null>(null)

// En catch:
.catch(() => { setError('No se pudo cargar los datos. Intenta recargar la página.'); setLoading(false) })

// En render:
{error && <div className="glass-card p-4 border-fire-500/30 text-fire-400">{error}</div>}
```

---

## 5. Paginación en el backend

**Archivos:** `backend/app/api/v1/territories.py`, `investments.py`, `interventions.py`, etc.

Los endpoints retornan todos los registros sin límite. `/territories` devuelve ~400 registros de una sola vez (regiones + provincias + comunas + cuencas + áreas protegidas). Agregar `skip`/`limit` previene problemas de performance cuando la base crezca.

```python
@router.get("/", response_model=list[TerritoryResponse])
def list_territories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return db.query(Territory).offset(skip).limit(limit).all()
```

---

## 6. Tipos TypeScript reales

**Archivos:** Todos los pages del frontend

El proyecto usa `useState<any>`, `(item: any)`, `(f: any)` en prácticamente todos los componentes. Si existieran interfaces concretas, el compilador habría detectado el bug `c.map is not a function` — TypeScript habría marcado `r.data` como incompatible con `Mechanism[]`.

```typescript
// Definir interfaces reales (ya están en DataIngestion.tsx — reutilizarlas)
import type { Mechanism } from '../types'

const [mechanisms, setMechanisms] = useState<Mechanism[]>([])
```

---

## 7. Null safety en MapPage

**Archivo:** `frontend/src/pages/MapPage.tsx` — línea 317

`communesRes.data.features.length > 0` accede a `.length` sin verificar que `features` exista. Si el endpoint de territorios devuelve algo inesperado el mapa falla silenciosamente.

```typescript
// Antes:
if (map.current && communesRes.data.features.length > 0) {

// Después:
if (map.current && communesRes.data.features?.length > 0) {
```

---

## 8. Invalidación granular tras mutaciones

**Archivo:** `frontend/src/pages/DataIngestion.tsx`

Después de crear o editar cualquier registro se llama `fetchAllData()`, que dispara 8 endpoints en paralelo. Tras crear una inversión debería recargarse solo `/investments`, no también territorios, capas, mecanismos, etc.

```typescript
const refreshTab = async () => {
  const endpoints: Record<TabType, string> = {
    mechanisms: '/mechanisms',
    projects: '/projects',
    investments: '/investments',
    interventions: '/interventions',
    mrv: '/mrv/observations',
    layers: '/layers',
  }
  const res = await api.get(endpoints[activeTab])
  // actualizar solo el estado del tab activo
}
```

---

## 9. CORS restrictivo en producción

**Variable de entorno en Railway:** `BACKEND_CORS_ORIGINS`

`BACKEND_CORS_ORIGINS=*` permite que cualquier origen haga requests autenticados a la API. Debería ser la URL específica del servicio Railway. Cambio de una variable de entorno, cero impacto en funcionalidad.

```
# Railway → Variables
BACKEND_CORS_ORIGINS=https://tu-app.up.railway.app
```

---

## 10. GZipMiddleware en FastAPI

**Archivo:** `backend/app/main.py`

Los GeoJSON del mapa pueden ser grandes (`Ecosistemas_simplified.json`, `Areas_Protegidas.json`, `sitios_prior_integrados.json`). FastAPI incluye `GZipMiddleware` — dos líneas comprimen automáticamente todas las respuestas y reducen el tiempo de carga del mapa significativamente.

```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

Agregar **antes** del middleware CORS en `main.py`.

---

## Prioridad de implementación

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|---------|
| 1 | Interceptor axios 401 | 🔴 Crítico UX | Bajo |
| 2 | JWT en endpoints escritura | 🔴 Crítico seguridad | Bajo |
| 3 | Promise.allSettled | 🟠 Alto | Bajo |
| 4 | Mensajes de error | 🟠 Alto | Bajo |
| 10 | GZipMiddleware | 🟠 Alto | Muy bajo |
| 9 | CORS restrictivo | 🟡 Medio seguridad | Muy bajo |
| 7 | Null safety MapPage | 🟡 Medio | Muy bajo |
| 8 | Invalidación granular | 🟡 Medio | Medio |
| 5 | Paginación backend | 🟢 Preventivo | Medio |
| 6 | Tipos TypeScript | 🟢 Calidad | Alto |
