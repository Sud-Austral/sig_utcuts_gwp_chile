"""SIG-UTCUTS Chile — FastAPI main application."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal

# Import all models so they register with Base.metadata
from app.models import user, territory, mechanism, project, investment  # noqa
from app.models import intervention, mrv, prioritization, data_quality  # noqa
from app.models import layer, evidence, audit, sirsd_programa, plantacion_forestal_2022  # noqa
from app.models import kobo as kobo_model  # noqa: registra KoboConfig y KoboStagingRecord

# Import routers
from app.api.v1 import (
    auth, dashboard, territories, layers,
    mechanisms, projects, investments, interventions,
    mrv_router, prioritization_router, data_quality_router,
    reports, evidence_router, kobo,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed data on startup."""
    # Enable PostGIS extension only if using PostgreSQL (non-fatal si no está disponible)
    if not settings.is_sqlite:
        from sqlalchemy import text
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
                conn.commit()
        except Exception as e:
            print(f"  [WARN] PostGIS no disponible (geometrías como texto JSON): {e}")

    Base.metadata.create_all(bind=engine)

    # Seed data
    db = SessionLocal()
    try:
        from app.seed.seed_data import run_all_seeds
        run_all_seeds(db)
    except Exception as e:
        print(f"  [WARN] Seed error (non-fatal): {e}")
    finally:
        db.close()

    print(f"\n  [OK] {settings.APP_NAME} v{settings.APP_VERSION} ready")
    print(f"  [OK] Database: {'SQLite (local)' if settings.is_sqlite else 'PostgreSQL + PostGIS'}")
    print(f"  [OK] API docs: http://localhost:8000/docs\n")

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plataforma de Inteligencia Territorial para el Sector UTCUTS en Chile",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "sqlite" if settings.is_sqlite else "postgresql",
    }


# Register routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(territories.router, prefix="/api/v1/territories", tags=["Territorios"])
app.include_router(layers.router, prefix="/api/v1/layers", tags=["Capas"])
app.include_router(mechanisms.router, prefix="/api/v1/mechanisms", tags=["Mecanismos"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Proyectos"])
app.include_router(investments.router, prefix="/api/v1/investments", tags=["Inversiones"])
app.include_router(interventions.router, prefix="/api/v1/interventions", tags=["Intervenciones"])
app.include_router(mrv_router.router, prefix="/api/v1/mrv", tags=["MRV"])
app.include_router(prioritization_router.router, prefix="/api/v1/prioritization", tags=["Priorización"])
app.include_router(data_quality_router.router, prefix="/api/v1/data-quality", tags=["Calidad de Datos"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reportes"])
app.include_router(evidence_router.router, prefix="/api/v1/evidence", tags=["Evidencia"])
app.include_router(kobo.router, prefix="/api/v1/kobo", tags=["Kobo"])


# ── Servir frontend compilado (solo cuando existe /app/static) ────────────────
_STATIC = "/app/static"
_STATIC_REAL = os.path.realpath(_STATIC)

if os.path.isdir(_STATIC):
    _assets = os.path.join(_STATIC, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        requested = os.path.realpath(os.path.join(_STATIC, full_path))
        if requested.startswith(_STATIC_REAL + os.sep) and os.path.isfile(requested):
            return FileResponse(requested)
        return FileResponse(os.path.join(_STATIC, "index.html"))
