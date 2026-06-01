"""Mechanisms API — CRUD endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.mechanism import Mechanism
from app.schemas.schemas import MechanismCreate, MechanismResponse

router = APIRouter()

@router.get("", response_model=list[MechanismResponse])
def list_mechanisms(category: str = None, status: str = None, db: Session = Depends(get_db)):
    q = db.query(Mechanism)
    if category:
        q = q.filter(Mechanism.category == category)
    if status:
        q = q.filter(Mechanism.status == status)
    return q.order_by(Mechanism.code).all()

@router.get("/{mechanism_id}", response_model=MechanismResponse)
def get_mechanism(mechanism_id: int, db: Session = Depends(get_db)):
    m = db.query(Mechanism).filter(Mechanism.id == mechanism_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mecanismo no encontrado")
    return m

@router.post("", response_model=MechanismResponse)
def create_mechanism(data: MechanismCreate, db: Session = Depends(get_db)):
    m = Mechanism(**data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

@router.put("/{mechanism_id}", response_model=MechanismResponse)
def update_mechanism(mechanism_id: int, data: MechanismCreate, db: Session = Depends(get_db)):
    m = db.query(Mechanism).filter(Mechanism.id == mechanism_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mecanismo no encontrado")
    for k, v in data.model_dump().items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m

@router.delete("/{mechanism_id}")
def delete_mechanism(mechanism_id: int, db: Session = Depends(get_db)):
    m = db.query(Mechanism).filter(Mechanism.id == mechanism_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mecanismo no encontrado")
    db.delete(m)
    db.commit()
    return {"detail": "Mecanismo eliminado"}

@router.get("/{mechanism_id}/projects")
def get_mechanism_projects(mechanism_id: int, db: Session = Depends(get_db)):
    from app.models.project import Project
    return db.query(Project).filter(Project.mechanism_id == mechanism_id).all()
