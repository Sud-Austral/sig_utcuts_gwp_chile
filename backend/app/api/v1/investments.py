"""Investments API — CRUD endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.deps import get_db
from app.models.investment import Investment
from app.schemas.schemas import InvestmentCreate, InvestmentResponse

router = APIRouter()

@router.get("", response_model=list[InvestmentResponse])
def list_investments(project_id: int = None, year: int = None, db: Session = Depends(get_db)):
    q = db.query(Investment)
    if project_id:
        q = q.filter(Investment.project_id == project_id)
    if year:
        q = q.filter(Investment.year == year)
    return q.order_by(Investment.id).all()

@router.get("/{investment_id}", response_model=InvestmentResponse)
def get_investment(investment_id: int, db: Session = Depends(get_db)):
    i = db.query(Investment).filter(Investment.id == investment_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
    return i

@router.post("", response_model=InvestmentResponse)
def create_investment(data: InvestmentCreate, db: Session = Depends(get_db)):
    inv = Investment(**data.model_dump(), is_sample=False)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv

@router.put("/{investment_id}", response_model=InvestmentResponse)
def update_investment(investment_id: int, data: InvestmentCreate, db: Session = Depends(get_db)):
    inv = db.query(Investment).filter(Investment.id == investment_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
    for k, v in data.model_dump().items():
        setattr(inv, k, v)
    db.commit()
    db.refresh(inv)
    return inv

@router.delete("/{investment_id}")
def delete_investment(investment_id: int, db: Session = Depends(get_db)):
    inv = db.query(Investment).filter(Investment.id == investment_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
    db.delete(inv)
    db.commit()
    return {"detail": "Inversión eliminada"}

@router.get("/summary/by-source")
def investments_by_source(db: Session = Depends(get_db)):
    rows = db.query(Investment.funding_type, func.sum(Investment.amount_usd)
                    ).group_by(Investment.funding_type).all()
    return [{"source": s or "Sin clasificar", "total_usd": float(a or 0)} for s, a in rows]

@router.get("/summary/by-region")
def investments_by_region(db: Session = Depends(get_db)):
    from app.models.project import Project, project_territories
    from app.models.territory import Territory
    rows = db.query(Territory.name, func.sum(Investment.amount_usd)).join(
        Project, Investment.project_id == Project.id).join(
        project_territories, Project.id == project_territories.c.project_id).join(
        Territory, project_territories.c.territory_id == Territory.id
    ).filter(Territory.type == "region").group_by(Territory.name).all()
    return [{"region": n, "total_usd": float(a or 0)} for n, a in rows]
