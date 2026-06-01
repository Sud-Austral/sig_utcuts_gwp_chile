"""Territories API endpoints with GeoJSON support (SQLite compatible)."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.territory import Territory
from app.schemas.schemas import TerritoryResponse

router = APIRouter()


@router.get("", response_model=list[TerritoryResponse])
def list_territories(type: str = None, parent_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Territory)
    if type:
        q = q.filter(Territory.type == type)
    if parent_id:
        q = q.filter(Territory.parent_id == parent_id)
    return q.order_by(Territory.name).all()


@router.get("/geojson/all")
def get_all_territories_geojson(type: str = "commune", db: Session = Depends(get_db)):
    """Return all territories of a type as a FeatureCollection."""
    from app.models.prioritization import PrioritizationScore
    rows = db.query(Territory).filter(
        Territory.type == type, Territory.geom_geojson.isnot(None)
    ).all()

    # Get prioritization scores
    scores = {}
    score_rows = db.query(PrioritizationScore).all()
    for s in score_rows:
        scores[s.territory_id] = s

    features = []
    for r in rows:
        if r.geom_geojson:
            try:
                geom = json.loads(r.geom_geojson)
            except (json.JSONDecodeError, TypeError):
                continue
            score = scores.get(r.id)
            features.append({
                "type": "Feature",
                "properties": {
                    "id": r.id, "code": r.code, "name": r.name,
                    "type": r.type, "area_ha": r.area_ha,
                    "priority_score": score.score_total if score else None,
                    "priority_class": score.priority_class if score else None,
                },
                "geometry": geom,
            })
    return {"type": "FeatureCollection", "features": features}


@router.get("/{territory_id}", response_model=TerritoryResponse)
def get_territory(territory_id: int, db: Session = Depends(get_db)):
    t = db.query(Territory).filter(Territory.id == territory_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Territorio no encontrado")
    return t


@router.get("/{territory_id}/geojson")
def get_territory_geojson(territory_id: int, db: Session = Depends(get_db)):
    t = db.query(Territory).filter(Territory.id == territory_id).first()
    if not t or not t.geom_geojson:
        raise HTTPException(status_code=404, detail="Geometría no encontrada")
    try:
        geom = json.loads(t.geom_geojson)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=500, detail="Error parsing geometry")
    return {
        "type": "Feature",
        "properties": {"id": t.id, "code": t.code, "name": t.name,
                        "type": t.type, "area_ha": t.area_ha},
        "geometry": geom,
    }


@router.get("/{territory_id}/profile")
def get_territory_profile(territory_id: int, db: Session = Depends(get_db)):
    from app.models.prioritization import PrioritizationScore

    t = db.query(Territory).filter(Territory.id == territory_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Territorio no encontrado")

    score = db.query(PrioritizationScore).filter(
        PrioritizationScore.territory_id == territory_id).first()

    return {
        "territory": {"id": t.id, "name": t.name, "code": t.code, "type": t.type, "area_ha": t.area_ha},
        "prioritization": {
            "score_total": score.score_total if score else None,
            "priority_class": score.priority_class if score else None,
        } if score else None,
    }
