# Metodología de Despliegue — FastAPI + React/Vite en Railway

Este documento describe la metodología para desplegar una aplicación fullstack (backend Python/FastAPI + frontend React/Vite) en Railway, usando una base de datos PostgreSQL externa.

---

## Principios

1. **Base de datos primero.** La BD se construye y carga en un servidor externo antes de desplegar la aplicación. El backend se conecta a ella vía `DATABASE_URL`; no gestiona la BD dentro del contenedor ni en Railway.
2. **Un solo servicio inicialmente.** Backend y frontend se sirven desde el mismo contenedor Railway. Esto elimina problemas de CORS y de build-time env vars del frontend.
3. **Separación opcional a futuro.** La arquitectura permite partir el servicio en dos (backend + Nginx/frontend) sin cambiar código de negocio.

---

## Arquitectura

```
Internet
   │
   ▼
Railway Service  ←── DATABASE_URL ──► PostgreSQL externo
   │
   ├── GET /api/v1/*   →  FastAPI
   └── GET /*          →  React SPA (archivos estáticos compilados)
```

---

## Por qué un solo servicio elimina los problemas habituales

| Problema clásico | Causa | Solución con este enfoque |
|---|---|---|
| `VITE_API_BASE_URL` desconocido en build | Vite hornea la URL en el bundle — si el backend aún no existe, queda vacía | No se necesita: frontend y backend comparten origen, las llamadas son relativas (`/api/v1/…`) |
| Frontend en servidor de desarrollo (`npm run dev`) | Dockerfile de dev no apto para producción | Dockerfile multi-stage compila el frontend con `npm run build` |
| Puerto fijo hardcodeado | Railway inyecta `$PORT` dinámicamente | CMD usa `${PORT:-8000}`; el backend lo lee en runtime |
| `--reload` de Uvicorn en producción | Flag de desarrollo, reinicia ante cualquier cambio de archivo | Gunicorn + UvicornWorker, sin `--reload` |

---

## Estructura de archivos necesaria

```
proyecto/
├── Dockerfile          ← multi-stage: Node build → Python serve  [NUEVO]
├── railway.json        ← apunta al Dockerfile raíz               [NUEVO]
├── .railwayignore      ← excluye lo innecesario del build context [NUEVO]
├── backend/
│   ├── app/main.py     ← sirve /app/static al final              [MODIFICADO]
│   ├── requirements.txt
│   └── Dockerfile      ← solo para desarrollo local, sin cambios
└── frontend/
    ├── src/api/client.ts  ← baseURL relativa: '/api/v1'          [MODIFICADO]
    ├── vite.config.ts     ← proxy /api → localhost:8000 en dev   [MODIFICADO]
    └── Dockerfile         ← solo para desarrollo local, sin cambios
```

---

## Dockerfile raíz (multi-stage)

```dockerfile
# ── Stage 1: compilar el frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Sin VITE_API_BASE_URL: las llamadas son relativas al mismo origen
RUN npm run build

# ── Stage 2: backend Python + archivos estáticos ─────────────────────────────
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=frontend-builder /frontend/dist ./static

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install "gunicorn==21.2.0"

COPY backend/ ./backend/
WORKDIR /app/backend

# Railway inyecta $PORT en runtime
CMD gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 2 \
    --timeout 120
```

> **Nota sobre dependencias del sistema:** Si el backend usa GDAL/PostGIS (`libgdal-dev`, `libgeos-dev`, `libproj-dev`), agregarlos al `apt-get install`. Se omiten aquí para mostrar el patrón mínimo.

---

## railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

---

## .railwayignore

Reduce el contexto de build enviado a Railway (no afecta lo que el Dockerfile copia, sí el tiempo de upload):

```
# Archivos de desarrollo que no necesita el build
docker-compose.yml
*.md
docs/
data/
insumos/
*.env
*.log
__pycache__/
.git/
```

---

## Cambios en el backend: servir el SPA

Al final de `main.py`, después de registrar todos los routers, agregar:

```python
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_STATIC = "/app/static"

if os.path.isdir(_STATIC):
    # Archivos estáticos de Vite (JS, CSS, imágenes)
    app.mount("/assets", StaticFiles(directory=os.path.join(_STATIC, "assets")), name="assets")

    # Catch-all: cualquier ruta que no sea /api ni /assets → index.html (React Router)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        requested = os.path.join(_STATIC, full_path)
        if os.path.isfile(requested):
            return FileResponse(requested)
        return FileResponse(os.path.join(_STATIC, "index.html"))
```

---

## Cambios en el frontend: URL relativa

**`frontend/src/api/client.ts`**
```typescript
// Relativa en producción (mismo origen), absoluta en dev vía proxy Vite
const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})
```

**`frontend/vite.config.ts`** — agregar proxy para desarrollo local:
```typescript
server: {
  host: '0.0.0.0',
  port: 5173,
  proxy: {
    '/api': 'http://localhost:8000',
  },
},
```

Con el proxy, en desarrollo `npm run dev` redirige `/api/v1/…` al backend local. En producción Railway no hay proxy porque todo está en el mismo contenedor/origen.

---

## Variables de entorno en Railway

Configurar en el panel del servicio:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Connection string del servidor PostgreSQL externo |
| `JWT_SECRET` | String aleatorio seguro (`openssl rand -hex 32`) |
| `BACKEND_CORS_ORIGINS` | `*` (o la URL pública del servicio si se quiere restringir) |

`PORT` es inyectado automáticamente por Railway — **no configurar manualmente**.

---

## Flujo de despliegue

```
1. Construir y poblar la base de datos en el servidor externo
        ↓
2. Hacer push del código al repositorio (con Dockerfile y railway.json)
        ↓
3. En Railway: crear proyecto → "Deploy from GitHub repo"
        ↓
4. En Railway: agregar variables de entorno (DATABASE_URL, JWT_SECRET, …)
        ↓
5. Railway detecta railway.json → ejecuta el Dockerfile multi-stage
        ↓
6. El backend arranca, crea tablas (create_all), carga seed si corresponde
        ↓
7. Servicio disponible en https://<nombre>.up.railway.app
```

---

## Separación futura en dos servicios

Cuando se quiera separar:

### Backend (sin cambios en el Dockerfile raíz, quitar static serving de main.py)

```python
# Eliminar el bloque "servir el SPA" de main.py
```

### Frontend (nuevo servicio, nuevo Dockerfile)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf** mínimo para React Router:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Restaurar en `client.ts`:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const api = axios.create({ baseURL: `${API_BASE}/api/v1` })
```

Y en Railway: agregar `VITE_API_BASE_URL=https://<backend>.up.railway.app` como build variable del servicio frontend.

---

## Checklist previo al primer despliegue

- [ ] `Dockerfile` raíz existe en la raíz del repositorio
- [ ] `railway.json` existe en la raíz del repositorio
- [ ] `frontend/src/api/client.ts` usa `baseURL: '/api/v1'`
- [ ] `frontend/vite.config.ts` tiene proxy `/api → http://localhost:8000`
- [ ] `main.py` tiene `app.mount("/", StaticFiles(html=True))` al final
- [ ] **Todos los paquetes usados en routers y servicios están en `requirements.txt`** — verificar que ningún `import` de terceros quede fuera
- [ ] `DATABASE_URL` configurada en el panel de Railway
- [ ] `JWT_SECRET` configurada en el panel de Railway
- [ ] La base de datos ya existe y tiene el schema cargado

---

## Lecciones aprendidas

### Paquetes faltantes en `requirements.txt` crashean el startup

El error más silencioso: un paquete usado en un servicio importado por un router no estaba en `requirements.txt`. Gunicorn arranca, intenta cargar el módulo de la aplicación, falla en el import y mata todos los workers.

**Regla:** Después de agregar cualquier `import <paquete>` a código que se carga en startup (routers, servicios, modelos), verificar que el paquete esté en `requirements.txt` antes de hacer push.

**Cómo detectarlo antes de deployar:**
```bash
# Desde la raíz del proyecto
pip install pipreqs
pipreqs backend/app --print
# Comparar con requirements.txt
```

### `StaticFiles(html=True)` es la forma correcta de servir un SPA

Un catch-all manual con `@app.get("/{full_path:path}")` + `os.path.join` expone path traversal. `StaticFiles(html=True)` de Starlette sirve archivos existentes y devuelve `index.html` para rutas desconocidas, con sanitización de paths incluida.

### Los modelos SQLAlchemy deben importarse explícitamente en `main.py`

`Base.metadata.create_all()` solo crea las tablas de los modelos que ya fueron importados al momento de ejecutarse. Si un modelo existe en `app/models/kobo.py` pero no se importa explícitamente, sus tablas nunca se crean.

**Regla:** Cada archivo en `app/models/` debe aparecer en el bloque de imports de `main.py`.
