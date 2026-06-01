"""Projects API — CRUD endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.project import Project
from app.models.territory import Territory
from app.schemas.schemas import ProjectCreate, ProjectResponse

router = APIRouter()

@router.get("", response_model=list[ProjectResponse])
def list_projects(status: str = None, mechanism_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Project)
    if status:
        q = q.filter(Project.status == status)
    if mechanism_id:
        q = q.filter(Project.mechanism_id == mechanism_id)
    return q.order_by(Project.id).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return p

@router.post("", response_model=ProjectResponse)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    d = data.model_dump(exclude={"territory_ids"})
    p = Project(**d, is_sample=False)
    if data.territory_ids:
        p.territories = db.query(Territory).filter(Territory.id.in_(data.territory_ids)).all()
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, data: ProjectCreate, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    for k, v in data.model_dump(exclude={"territory_ids"}).items():
        setattr(p, k, v)
    if data.territory_ids:
        p.territories = db.query(Territory).filter(Territory.id.in_(data.territory_ids)).all()
    db.commit()
    db.refresh(p)
    return p

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    db.delete(p)
    db.commit()
    return {"detail": "Proyecto eliminado"}
