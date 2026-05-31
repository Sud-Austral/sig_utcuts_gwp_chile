# CLAUDE.md — SIG-UTCUTS Chile

## Descripción del proyecto

Plataforma de inteligencia territorial para el sector UTCUTS (Uso de la Tierra, Cambio de Uso de la Tierra y Silvicultura) en Chile. Permite visualizar, registrar, analizar, auditar y priorizar inversiones, mecanismos financieros e iniciativas físicas sobre el territorio nacional.

---

## Arquitectura

```
sig_utcuts_gwp_chile/
├── backend/          # Python 3.11 + FastAPI + SQLAlchemy 2 + PostGIS
├── frontend/         # React 18 + TypeScript + Vite + MapLibre GL
├── Dockerfile        # Producción: multi-stage (Node build → Python serve)
├── railway.json      # Configuración de despliegue Railway
├── docker-compose.yml  # Desarrollo local únicamente
└── .env.example
```

**Backend:** FastAPI, SQLAlchemy 2.0, Pydantic 2, JWT (python-jose), Uvicorn/Gunicorn.
**Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, MapLibre GL, Zustand, Recharts, TanStack Table.
**Base de datos:** PostgreSQL 15 + PostGIS — servidor externo provisto por el operador.

---

## Stack de base de datos

- ORM: SQLAlchemy 2.0 (16 modelos en `backend/app/models/`)
- Esquema creado en startup vía `Base.metadata.create_all(bind=engine)` — sin migraciones Alembic activas
- PostGIS habilitado en startup: `CREATE EXTENSION IF NOT EXISTS postgis`
- Geometrías almacenadas como texto GeoJSON, no tipos nativos PostGIS (compatibilidad SQLite)
- Seed data cargado automáticamente en startup desde `backend/app/seed/seed_data.py`; es idempotente

### Modelos principales

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `user.py` | `users`, `roles`, `user_roles` | RBAC — 6 roles |
| `territory.py` | `territories` | Regiones, comunas, cuencas, áreas protegidas |
| `mechanism.py` | `mechanisms` | 10 mecanismos financieros UTCUTS |
| `project.py` | `projects`, `project_territories` | Proyectos ligados a mecanismos |
| `investment.py` | `investments` | Flujos financieros por proyecto |
| `intervention.py` | `interventions`, `intervention_geometries` | Acciones físicas |
| `mrv.py` | `mrv_indicators`, `mrv_observations` | Indicadores MRV |
| `layer.py` | `data_sources`, `layers` | Capas WMS/WFS/GeoJSON |
| `prioritization.py` | `prioritization_scores` | Puntajes multicriterio |
| `data_quality.py` | `data_quality_flags` | Auditoría de calidad |
| `evidence.py` | `evidence_files` | Documentos adjuntos |
| `audit.py` | `audit_logs` | Log de actividad |
| `kobo.py` | `kobo_configs`, `kobo_staging_records` | Integración XLSForm |
| `sirsd_programa.py` | `sirsd_programas` | Programas SIRSD |
| `plantacion_forestal_2022.py` | `plantaciones_forestales_2022` | Datos forestales 2022 |

---

## Variables de entorno

Archivo de referencia: `.env.example`

| Variable | Descripción | Producción |
|----------|-------------|------------|
| `DATABASE_URL` | Connection string PostgreSQL externo | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Clave JWT — cambiar en producción | `openssl rand -hex 32` |
| `JWT_ALGORITHM` | Algoritmo JWT | `HS256` |
| `JWT_EXPIRATION_MINUTES` | Duración del token | `1440` |
| `BACKEND_CORS_ORIGINS` | URLs permitidas en CORS (CSV) | `*` o la URL de Railway |

> `VITE_API_BASE_URL` **no se necesita en el despliegue conjunto**: el frontend y backend comparten origen, las llamadas API usan rutas relativas (`/api/v1/...`).

---

## Desarrollo local

```bash
# Con Docker Compose (base incluida)
cp .env.example .env
docker compose up --build

# Backend solo (SQLite automático sin Postgres)
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend solo
cd frontend && npm install && npm run dev
```

**Usuarios demo tras seed:**
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | admin |
| `editor` | `editor123` | editor |
| `viewer` | `viewer123` | public_viewer |

---

## Despliegue en Railway

### Estrategia: un solo servicio (backend + frontend juntos)

El Dockerfile raíz hace un build multi-stage:
1. **Stage Node**: compila el frontend (`npm run build`) → genera `dist/`
2. **Stage Python**: instala el backend, copia `dist/`, FastAPI sirve los archivos estáticos

Con este enfoque frontend y backend comparten la misma URL de Railway, eliminando el problema de `VITE_API_BASE_URL` (las llamadas son relativas al mismo origen).

```
Railway project
└── sigutcuts  ← único servicio
    ├── FastAPI en /api/v1/*
    ├── Archivos estáticos de React en /*
    └── Conecta a PostgreSQL externo vía DATABASE_URL
```

### Dockerfile raíz (producción)

`Dockerfile` en la raíz del repositorio:

```dockerfile
# ── Stage 1: build del frontend ──────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build          # genera /frontend/dist/

# ── Stage 2: backend Python + archivos estáticos ────────────────────────────
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev libgdal-dev libgeos-dev libproj-dev \
    && rm -rf /var/lib/apt/lists/*

# Frontend compilado
COPY --from=frontend-builder /frontend/dist ./static

# Backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

COPY backend/ ./backend/
WORKDIR /app/backend

# Railway inyecta $PORT en runtime; fallback 8000 para pruebas locales
CMD gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 2 \
    --timeout 120
```

### railway.json

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

### Variables en Railway (panel de servicio)

```
DATABASE_URL=<connection string del servidor externo>
JWT_SECRET=<string aleatorio seguro>
BACKEND_CORS_ORIGINS=*
```

`PORT` lo inyecta Railway automáticamente — no configurar manualmente.

### Cambio necesario en `main.py`

FastAPI debe servir el `dist/` como archivos estáticos y redirigir rutas desconocidas al `index.html` de React:

```python
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

# Al final de main.py, después de registrar todos los routers:
if os.path.exists(STATIC_DIR):
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
```

### Cambio necesario en `vite.config.ts` / llamadas API

Las llamadas del frontend deben usar rutas relativas (sin prefijo de dominio):

```typescript
// frontend/src/api/client.ts  — cambiar base URL a relativa
const apiClient = axios.create({
  baseURL: "/api/v1",   // relativa al mismo origen
});
```

---

## Separación futura (backend y frontend independientes)

Cuando se quiera separar en dos servicios Railway:

1. **Frontend** → nuevo servicio con `frontend/Dockerfile` de producción (Nginx):
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
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```
2. **Backend** → mantiene su Dockerfile, quitar la parte de static files de `main.py`
3. Restaurar `VITE_API_BASE_URL` en el frontend apuntando a la URL pública del backend
4. Actualizar `BACKEND_CORS_ORIGINS` con la URL del frontend

---

## Rutas API

Base: `https://<railway-url>/api/v1/` | Docs: `/docs`

| Prefijo | Descripción |
|---------|-------------|
| `/auth` | Login, tokens JWT |
| `/dashboard` | KPIs y resúmenes |
| `/territories` | CRUD territorios |
| `/layers` | Capas geoespaciales |
| `/mechanisms` | Mecanismos financieros |
| `/projects` | Proyectos UTCUTS |
| `/investments` | Inversiones |
| `/interventions` | Acciones físicas |
| `/mrv` | Indicadores MRV |
| `/prioritization` | Priorización territorial |
| `/data-quality` | Calidad de datos |
| `/reports` | Reportes exportables |
| `/evidence` | Archivos de evidencia |
| `/kobo` | Integración KoboToolbox |
| `/health` | Estado del servicio |
