# Registro de Errores — SIG-UTCUTS Chile
## Sesión de despliegue en Railway (2026-05-31)

Este documento registra todos los errores encontrados durante el proceso de despliegue de una aplicación FastAPI + React/Vite en Railway, junto a su causa raíz y solución aplicada. Sirve como referencia para futuros despliegues similares.

---

## Stack del proyecto

- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0, Gunicorn + UvicornWorker
- **Frontend:** React 18, TypeScript, Vite 5, MapLibre GL
- **Base de datos:** PostgreSQL 15 (servidor externo en Railway)
- **Despliegue:** Railway, un solo servicio (Docker multi-stage)

---

## Error 1 — `ModuleNotFoundError: No module named 'openpyxl'`

**Síntoma:** El contenedor arranca, Gunicorn intenta cargar la app y todos los workers crashean con:
```
ModuleNotFoundError: No module named 'openpyxl'
File "/app/backend/app/api/v1/kobo.py", line 10, in <module>
    from app.services import xlsform_parser
File "/app/backend/app/services/xlsform_parser.py", line 3, in <module>
    import openpyxl
```

**Causa raíz:** `openpyxl` era usado por el router `kobo.py` a través de `xlsform_parser.py`, pero no estaba en `requirements.txt`. El import ocurre al cargar el módulo, antes de que la app pueda servir requests.

**Solución:** Agregar a `backend/requirements.txt`:
```
openpyxl==3.1.2
```

---

## Error 2 — Login devuelve 401 "Credenciales inválidas" (passlib + bcrypt incompatibilidad)

**Síntoma:** La app inicia correctamente pero el login con usuarios demo (admin/admin123) siempre devuelve 401. El seed corre pero silenciosamente falla al hashear contraseñas.

**Causa raíz:** `passlib==1.7.4` es **incompatible con `bcrypt>=4.0.0`**. En bcrypt 4.x se eliminó el atributo `__about__`, que passlib usa para detectar la versión: `bcrypt.__about__.__version__`. Esto lanza `AttributeError` que queda atrapado silenciosamente por el `try/except` del lifespan, impidiendo que los usuarios sean creados.

El error específico de passlib (invisible en logs porque el try/except lo traga):
```
AttributeError: module 'bcrypt' has no attribute '__about__'
```

**Solución:** Eliminar passlib y usar bcrypt directamente. En `requirements.txt`:
```
# ELIMINAR: passlib[bcrypt]==1.7.4
# ELIMINAR: bcrypt==3.2.2  (no tiene wheel cp311, falla compilación en python:3.11-slim)
bcrypt==4.1.3  # tiene wheels cp311 precompilados
```

Reescribir `backend/app/core/security.py`:
```python
import bcrypt

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
```

---

## Error 3 — `CREATE EXTENSION postgis` crashea el startup silenciosamente

**Síntoma:** La app arranca pero las tablas no se crean o el seed no corre.

**Causa raíz:** En `main.py`, el bloque que habilita PostGIS no tenía `try/except`. Si el usuario de PostgreSQL no tiene permiso `CREATE EXTENSION`, la excepción propagaba y abortaba el lifespan antes de `Base.metadata.create_all()` y del seed.

**Solución:** Envolver en `try/except` no-fatal:
```python
if not settings.is_sqlite:
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            conn.commit()
    except Exception as e:
        print(f"  [WARN] PostGIS no disponible: {e}")
```

---

## Error 4 — Seed falla silenciosamente (catch demasiado amplio)

**Síntoma:** Los usuarios demo no existen en la base de datos después del primer despliegue.

**Causa raíz:** El lifespan tenía un único `try/except` que envolvía todo el `run_all_seeds()`. Si cualquier función del seed (incluyendo funciones tardías que intentan leer archivos GeoJSON que no existen en el contenedor) lanzaba una excepción, el error era tragado y los usuarios nunca se creaban.

**Solución:** Separar el seed en bloques críticos y no-críticos con `try/except` individuales:
```python
# Crítico — si falla, logear explícitamente
try:
    seed_roles(db)
    user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    print(f"  [OK] Usuarios en DB: {user_count}")
except Exception as e:
    print(f"  [ERROR] seed_roles falló: {e}")
    db.rollback()

try:
    seed_users(db)
except Exception as e:
    print(f"  [ERROR] seed_users falló: {e}")
    db.rollback()
```

---

## Error 5 — `DATABASE_URL` no configurada: la app usaba SQLite en producción

**Síntoma:** El endpoint `/health` devolvía `"database": "sqlite"` en lugar de `"postgresql"`. El login funcionaba porque SQLite generaba su propio seed, pero los datos no eran los de la base PostgreSQL real.

**Causa raíz:** La variable de entorno `DATABASE_URL` no fue configurada en el panel de variables de Railway. `config.py` tiene como fallback:
```python
DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./sigutcuts.db")
```

**Solución:** En Railway → Servicio → Variables, agregar:
```
DATABASE_URL=postgresql://postgres:PASSWORD@host:PORT/sigutcuts
```

**Diagnóstico:** Agregar al endpoint `/health` el conteo de usuarios y roles para verificar la DB:
```python
@app.get("/health")
def health_check():
    db = SessionLocal()
    try:
        users = db.query(User).count()
        roles = db.query(Role).count()
    finally:
        db.close()
    return {"database": "sqlite" if settings.is_sqlite else "postgresql",
            "db_users": users, "db_roles": roles}
```

---

## Error 6 — `e.map is not a function` (Recharts en producción)

**Síntoma:** Error persistente en el frontend después del login. El stack trace siempre apuntaba a una posición fija dentro del bundle JS (~275000-276000 chars en línea 670-741), con nombres de función minificados distintos (`wfe`, `O6`, `FP`) pero en el mismo rango.

```
TypeError: e.map is not a function
    at wfe (index-XXXX.js:741:275968)
```

**Causa raíz:** **Recharts** (`^2.10.3`) tiene un bug interno donde llama `.map()` sobre su estado interno (`prevData` o similar) durante callbacks de `ResizeObserver`. Este estado puede ser `undefined` o no-array en ciertas condiciones de primer render. El bug es **interno a la librería** — no se puede corregir desde fuera pasando `data={[]}` o `?? []`.

**Por qué `?? []` no funcionó:** El guard `data.investment_by_source ?? []` protegía el código propio, pero la llamada `.map()` que fallaba era dentro de `Pie.componentDidUpdate()` de Recharts, sobre el estado interno de la librería, no sobre el prop `data`.

**Por qué el error persistía después de eliminar los imports:** Recharts seguía en el bundle porque estaba declarado en `package.json` → `node_modules`. Vite incluía el paquete como dependencia optimizada aunque ningún archivo lo importara. La posición en el bundle se desplazaba ~606 chars entre versiones (exactamente lo que se eliminó con cada fix de imports), confirmando que Recharts seguía presente.

**Solución definitiva:** Eliminar recharts del proyecto:
1. Eliminar de `frontend/package.json`
2. Reemplazar todos los componentes Recharts con CSS puro (`<div>` con barras de ancho proporcional)

```json
// package.json — eliminar esta línea:
"recharts": "^2.10.3"
```

---

## Error 7 — GeoJSON layers devuelven 404 en el mapa

**Síntoma:** El mapa carga pero las capas geoespaciales (Provincias, Viveros, etc.) no aparecen. Errores 404 en consola:
```
api/v1/layers/geojson/Provincias.json: 404 Not Found
```

**Causa raíz:** Los archivos GeoJSON estaban en `insumos/datos_geo/` en el repositorio, pero ese directorio estaba excluido del build Docker via `.dockerignore`:
```
insumos/
```
El backend intentaba servirlos desde `/app/insumos/datos_geo/` que no existía en el contenedor.

**Solución:**
1. Copiar los archivos GeoJSON a `frontend/public/insumos/datos_geo/`
2. Cambiar `.dockerignore` de `insumos/` a `/insumos/` (con `/` inicial, para excluir solo el root y no el directorio dentro de `frontend/`)
3. Cambiar el fetch en MapPage de `api.get('/layers/geojson/archivo.json')` a `fetch('/insumos/datos_geo/archivo.json')`

**Atención con Git LFS:** Si los archivos GeoJSON están trackeados con Git LFS, Railway puede bajar pointer files en lugar de los archivos reales. Verificar que Railway soporte LFS o commitear los archivos directamente sin LFS.

---

## Error 8 — Paquetes innecesarios inflan el Docker image

**Síntoma:** Build lento y imagen Docker grande (~1.5GB).

**Causa raíz:** El Dockerfile instalaba `libgdal-dev`, `libgeos-dev`, `libproj-dev` para PostGIS/GDAL, pero ningún paquete Python los requería (las geometrías se almacenan como JSON texto). También instalaba `pytest` y `pytest-asyncio` en producción.

**Solución:** En `Dockerfile`:
```dockerfile
# Antes (innecesario):
RUN apt-get install -y gcc libpq-dev libgdal-dev libgeos-dev libproj-dev

# Después (solo lo necesario):
RUN apt-get install -y gcc libpq-dev
```

En `requirements.txt`, mover pytest a un archivo separado `requirements-dev.txt` o eliminarlo.

---

## Error 9 — Bundle frontend demasiado grande (1.18MB)

**Síntoma:** `npm run build` genera un único chunk de 1.18MB (322KB gzipped).

**Causa raíz:** Todos los imports de páginas eran estáticos en `App.tsx`. MapLibre GL (~550KB), la librería del mapa, se incluía en el bundle inicial aunque el usuario no hubiera navegado al mapa. Además, `@tanstack/react-table` (80KB) estaba en `package.json` pero **nunca se importaba en ningún archivo**.

**Solución:**
1. Eliminar `@tanstack/react-table` de `package.json` (no se usaba)
2. Convertir todos los imports de páginas a `React.lazy()` en `App.tsx`:

```tsx
const MapPage = lazy(() => import('./pages/MapPage'))  // MapLibre GL va en chunk separado
const Dashboard = lazy(() => import('./pages/Dashboard'))
// etc.
```

**Resultado esperado:**
- Bundle inicial: ~200KB (React, Router, código base)
- Chunk MapPage: ~600KB (solo se descarga al navegar a /mapa)
- Chunks por página: 5-80KB cada uno, on-demand

---

## Error 10 — `kobo` model no incluido en imports de `main.py`

**Síntoma:** Las tablas `kobo_configs` y `kobo_staging_records` no eran creadas por `Base.metadata.create_all()`.

**Causa raíz:** SQLAlchemy registra los modelos en `Base.metadata` solo cuando el módulo Python es importado. `app/models/kobo.py` existía pero no estaba en los imports explícitos de `main.py`.

**Solución:**
```python
# main.py
from app.models import kobo as kobo_model  # noqa — registra KoboConfig y KoboStagingRecord
```

Nota: renombrar el import para evitar colisión con el router `kobo` que se importa después.

---

## Error 11 — Gunicorn `--workers 2` causa race condition en el seed

**Síntoma:** En deploys con 2 workers, los logs mostraban errores de `UniqueViolation` en la tabla `users` al arrancar.

**Causa raíz:** Con 2 workers Gunicorn, ambos procesos ejecutan el lifespan simultáneamente. Ambos verifican "¿existe el usuario admin?" → No → ambos intentan crearlo → uno falla con violación de unicidad. El error es atrapado y el seed queda incompleto para ese worker.

**Solución:** Usar `--workers 1` en Railway. Railway escala horizontalmente a nivel de servicio, no dentro del contenedor:
```dockerfile
CMD gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 1 \
    --timeout 120
```

---

## Error 12 — SSL requerido para conexión PostgreSQL en Railway

**Síntoma:** La conexión a la base de datos PostgreSQL externa (via proxy `rlwy.net`) fallaba o era inestable.

**Causa raíz:** Railway's proxy externo requiere SSL. psycopg2 sin `sslmode=require` intenta conectar sin SSL y puede fallar.

**Solución:** En `backend/app/db/session.py`:
```python
connect_args = {}
if settings.is_sqlite:
    connect_args["check_same_thread"] = False
elif "sslmode" not in settings.DATABASE_URL:
    connect_args["sslmode"] = "require"
```

---

## Lecciones generales

1. **Siempre verificar el `/health` endpoint primero** — antes de debuggear el frontend, confirmar que el backend conecta a la DB correcta y que el seed corrió.

2. **Los errores silenciosos en el lifespan son los más peligrosos** — cualquier excepción antes del `yield` en el lifespan aborta el startup. Envolver cada step crítico con su propio try/except y log explícito.

3. **Las dependencias en `package.json` se incluyen en el bundle aunque no se importen** — si un paquete es problemático, sacarlo del `package.json` (no basta con eliminar el import).

4. **Verificar el tamaño del bundle antes del primer deploy** — `npm run build` muestra el tamaño. Si supera 500KB, aplicar code splitting con `React.lazy()`.

5. **Git LFS no es compatible transparentemente con Railway** — los archivos estáticos grandes (GeoJSON) van mejor en `frontend/public/` commiteados directamente, o en un storage externo (S3, CDN).

6. **bcrypt y passlib**: usar `bcrypt` directamente sin passlib. passlib 1.7.4 no tiene versión compatible con bcrypt 4.x y no hay versión más nueva de passlib disponible.
