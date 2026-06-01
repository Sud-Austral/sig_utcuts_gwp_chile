"""Layers API endpoints."""
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.layer import Layer
from app.models.sirsd_programa import SirsdPrograma
from app.schemas.schemas import LayerCreate, LayerResponse
import json

router = APIRouter()

@router.get("/sirsd_programas/geojson")
def get_sirsd_programas_geojson(db: Session = Depends(get_db)):
    """Fetches SIRSD programs from the database and returns them formatted as GeoJSON."""
    programas = db.query(SirsdPrograma).all()
    features = []
    for p in programas:
        if not p.geom_geojson:
            continue
        try:
            geom = json.loads(p.geom_geojson)
        except Exception:
            continue
            
        features.append({
            "type": "Feature",
            "properties": {
                "id": p.id,
                "clave": p.clave,
                "sup_ha": p.sup_ha,
                "temporada": p.temporada,
                "concurso": p.concurso,
                "tip_conc": p.tip_conc,
                "codreg": p.codreg,
                "codprov": p.codprov,
                "comuna": p.comuna,
                "codcom": p.codcom,
                "sup_predio": p.sup_predio,
                "su_uso_agr": p.su_uso_agr,
                "sup_potres": p.sup_potres,
                "clase": p.clase,
                "subclase": p.subclase,
                "unidad": p.unidad,
                "agrupacion": p.agrupacion,
                "localidad": p.localidad,
                "conservado": p.conservado,
                "nom_operad": p.nom_operad,
                "bon_total": p.bon_total,
                "macrozona": p.macrozona,
                "admisible": p.admisible,
            },
            "geometry": geom
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/plantaciones_forestales_2022/geojson")
def get_plantaciones_forestales_2022_geojson(db: Session = Depends(get_db)):
    """Fetches forest plantations 2022 from the database and returns them formatted as GeoJSON."""
    from app.models.plantacion_forestal_2022 import PlantacionForestal2022
    plantaciones = db.query(PlantacionForestal2022).all()
    features = []
    for p in plantaciones:
        if not p.geom_geojson:
            continue
        try:
            geom = json.loads(p.geom_geojson)
        except Exception:
            continue
            
        features.append({
            "type": "Feature",
            "properties": {
                "id": p.id,
                "objectid": p.objectid,
                "especie": p.especie,
                "especie_t": p.especie_t,
                "apl": p.apl,
                "sup_ha": p.sup_ha,
                "codreg": p.codreg,
            },
            "geometry": geom
        })
    return {"type": "FeatureCollection", "features": features}



@router.get("", response_model=list[LayerResponse])
def list_layers(category: str = None, db: Session = Depends(get_db)):
    q = db.query(Layer)
    if category:
        q = q.filter(Layer.category == category)
    return q.order_by(Layer.name).all()

@router.get("/{layer_id}", response_model=LayerResponse)
def get_layer(layer_id: int, db: Session = Depends(get_db)):
    l = db.query(Layer).filter(Layer.id == layer_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Capa no encontrada")
    return l

@router.post("", response_model=LayerResponse)
def create_layer(data: LayerCreate, db: Session = Depends(get_db)):
    l = Layer(**data.model_dump(), is_sample=False)
    db.add(l)
    db.commit()
    db.refresh(l)
    return l

@router.put("/{layer_id}", response_model=LayerResponse)
def update_layer(layer_id: int, data: LayerCreate, db: Session = Depends(get_db)):
    l = db.query(Layer).filter(Layer.id == layer_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Capa no encontrada")
    for k, v in data.model_dump().items():
        setattr(l, k, v)
    db.commit()
    db.refresh(l)
    return l

@router.delete("/{layer_id}")
def delete_layer(layer_id: int, db: Session = Depends(get_db)):
    l = db.query(Layer).filter(Layer.id == layer_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Capa no encontrada")
    db.delete(l)
    db.commit()
    return {"detail": "Capa eliminada"}

# Path to datos_geo
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
DATOS_GEO_DIR = os.path.join(BASE_DIR, "insumos", "datos_geo")

# Fallback path checking for robust execution across different run environments
if not os.path.exists(DATOS_GEO_DIR):
    for possible_path in [
        "/insumos/datos_geo",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "insumos", "datos_geo")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "insumos", "datos_geo")),
        "/app/insumos/datos_geo"
    ]:
        if os.path.exists(possible_path):
            DATOS_GEO_DIR = possible_path
            break

@router.get("/geojson/{filename}")
def serve_geojson_file(filename: str):
    """Serves a GeoJSON file from insumos/datos_geo directly as a file stream."""
    filename = os.path.basename(filename)
    file_path = os.path.join(DATOS_GEO_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Capa espacial '{filename}' no encontrada en el sistema.")
    return FileResponse(file_path, media_type="application/json")

