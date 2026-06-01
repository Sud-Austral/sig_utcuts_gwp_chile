"""Interventions API endpoints."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.intervention import Intervention, InterventionGeometry
from app.models.territory import Territory
from app.schemas.schemas import InterventionCreate, InterventionResponse

router = APIRouter()

@router.get("/geojson/all")
def get_all_interventions_geojson(db: Session = Depends(get_db)):
    """Return all physical intervention geometries as a FeatureCollection."""
    geoms = db.query(InterventionGeometry).filter(InterventionGeometry.geom_geojson.isnot(None)).all()
    features = []

    for g in geoms:
        try:
            geom = json.loads(g.geom_geojson)
        except (json.JSONDecodeError, TypeError):
            continue

        inter = g.intervention
        proj = inter.project if inter else None
        
        # Resolve region code (first two digits of commune code)
        region_code = None
        commune = db.query(Territory).filter(Territory.id == g.territory_id).first() if g.territory_id else None
        if commune and commune.type == "commune" and commune.code:
            region_code = commune.code[:2]
        elif inter and inter.project and inter.project.territories:
            for t in inter.project.territories:
                if t.type == "commune" and t.code:
                    region_code = t.code[:2]
                    break

        features.append({
            "type": "Feature",
            "properties": {
                "id": g.id,
                "intervention_id": inter.id if inter else None,
                "project_id": inter.project_id if inter else None,
                "project_name": proj.name if proj else "Proyecto Desconocido",
                "type": inter.intervention_type if inter else "Desconocido",
                "ndc_component": inter.ndc_component if inter else None,
                "hectares_estimated": inter.hectares_estimated if inter else 0.0,
                "hectares_verified": inter.hectares_verified if inter else 0.0,
                "status": inter.status if inter else "planned",
                "verification_status": inter.verification_status if inter else "estimated",
                "precision": g.precision_level,
                "source": g.source,
                "region_code": region_code
            },
            "geometry": geom
        })

    return {"type": "FeatureCollection", "features": features}


@router.get("", response_model=list[InterventionResponse])
def list_interventions(project_id: int = None, type: str = None, db: Session = Depends(get_db)):
    q = db.query(Intervention)
    if project_id:
        q = q.filter(Intervention.project_id == project_id)
    if type:
        q = q.filter(Intervention.intervention_type == type)
    return q.all()

@router.get("/{intervention_id}", response_model=InterventionResponse)
def get_intervention(intervention_id: int, db: Session = Depends(get_db)):
    i = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Intervención no encontrada")
    return i

@router.post("", response_model=InterventionResponse)
def create_intervention(data: InterventionCreate, db: Session = Depends(get_db)):
    i = Intervention(**data.model_dump(), is_sample=False)
    db.add(i)
    db.commit()
    db.refresh(i)
    return i

@router.delete("/{intervention_id}")
def delete_intervention(intervention_id: int, db: Session = Depends(get_db)):
    i = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Intervención no encontrada")
    db.delete(i)
    db.commit()
    return {"detail": "Intervención eliminada"}

@router.put("/{intervention_id}", response_model=InterventionResponse)
def update_intervention(intervention_id: int, data: InterventionCreate, db: Session = Depends(get_db)):
    i = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Intervención no encontrada")
    for k, v in data.model_dump().items():
        setattr(i, k, v)
    db.commit()
    db.refresh(i)
    return i
