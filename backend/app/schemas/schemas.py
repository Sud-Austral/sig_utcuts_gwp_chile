"""Pydantic schemas for API request/response validation."""
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel


# === Auth ===
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    full_name: Optional[str] = None
    institution: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    institution: Optional[str] = None
    is_active: bool
    roles: List[str] = []
    class Config:
        from_attributes = True


# === Territory ===
class TerritoryResponse(BaseModel):
    id: int
    code: str
    name: str
    type: str
    parent_id: Optional[int] = None
    area_ha: Optional[float] = None
    population: Optional[int] = None
    is_sample: bool = False
    class Config:
        from_attributes = True


# === Mechanism ===
class MechanismCreate(BaseModel):
    code: str
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    main_funding_source: Optional[str] = None
    maturity_level: Optional[str] = None
    time_horizon: Optional[str] = None
    ndc_alignment: Optional[str] = None
    target_beneficiaries: Optional[str] = None
    enabling_conditions: Optional[str] = None
    intervention_types: Optional[str] = None
    status: str = "active"

class MechanismResponse(BaseModel):
    id: int
    code: str
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    main_funding_source: Optional[str] = None
    maturity_level: Optional[str] = None
    time_horizon: Optional[str] = None
    ndc_alignment: Optional[str] = None
    target_beneficiaries: Optional[str] = None
    enabling_conditions: Optional[str] = None
    intervention_types: Optional[str] = None
    status: Optional[str] = None
    is_sample: Optional[bool] = False
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# === Project ===
class ProjectCreate(BaseModel):
    mechanism_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    status: str = "draft"
    geographic_precision: Optional[str] = None
    data_confidence: str = "demo"
    territory_ids: List[int] = []

class ProjectResponse(BaseModel):
    id: int
    mechanism_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    status: Optional[str] = None
    geographic_precision: Optional[str] = None
    data_confidence: Optional[str] = None
    is_sample: Optional[bool] = False
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# === Investment ===
class InvestmentCreate(BaseModel):
    project_id: int
    funding_source: Optional[str] = None
    funding_type: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "USD"
    amount_usd: Optional[float] = None
    year: Optional[int] = None
    data_quality: str = "demo"

class InvestmentResponse(BaseModel):
    id: int
    project_id: int
    funding_source: Optional[str] = None
    funding_type: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    amount_usd: Optional[float] = None
    year: Optional[int] = None
    data_quality: Optional[str] = None
    is_sample: Optional[bool] = False
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# === Intervention ===
class InterventionCreate(BaseModel):
    project_id: int
    intervention_type: Optional[str] = None
    hectares_estimated: Optional[float] = None
    tco2e_estimated: Optional[float] = None
    beneficiaries_estimated: Optional[int] = None
    status: str = "planned"

class InterventionResponse(BaseModel):
    id: int
    project_id: int
    intervention_type: Optional[str] = None
    ndc_component: Optional[str] = None
    hectares_estimated: Optional[float] = None
    hectares_verified: Optional[float] = None
    tco2e_estimated: Optional[float] = None
    tco2e_verified: Optional[float] = None
    beneficiaries_estimated: Optional[int] = None
    beneficiaries_verified: Optional[int] = None
    status: Optional[str] = None
    verification_status: Optional[str] = None
    is_sample: Optional[bool] = False
    class Config:
        from_attributes = True


# === MRV ===
class MRVIndicatorResponse(BaseModel):
    id: int
    code: str
    name: str
    category: str
    unit: Optional[str] = None
    description: Optional[str] = None
    class Config:
        from_attributes = True

class MRVObservationCreate(BaseModel):
    intervention_id: int
    indicator_id: int
    estimated_value: Optional[float] = None
    verified_value: Optional[float] = None
    observation_date: Optional[date] = None
    verification_status: str = "estimated"
    notes: Optional[str] = None

class MRVObservationResponse(BaseModel):
    id: int
    intervention_id: int
    indicator_id: int
    estimated_value: Optional[float] = None
    verified_value: Optional[float] = None
    verification_status: str
    notes: Optional[str] = None
    is_sample: bool = False
    class Config:
        from_attributes = True


# === Prioritization ===
class PrioritizationWeights(BaseModel):
    forest_restoration_potential: float = 0.20
    climate_risk: float = 0.15
    degradation_loss_risk: float = 0.15
    financial_gap: float = 0.15
    biodiversity_value: float = 0.10
    social_vulnerability: float = 0.10
    operational_feasibility: float = 0.10
    mechanism_alignment: float = 0.05

class PrioritizationScoreResponse(BaseModel):
    id: int
    territory_id: int
    territory_name: Optional[str] = None
    scenario_name: str
    score_total: Optional[float] = None
    priority_class: Optional[str] = None
    class Config:
        from_attributes = True


# === Data Quality ===
class DataQualityFlagResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    flag_type: str
    severity: str
    description: Optional[str] = None
    resolved: bool
    class Config:
        from_attributes = True


# === Dashboard ===
class DashboardSummary(BaseModel):
    total_investment_usd: float = 0
    public_investment_usd: float = 0
    private_investment_usd: float = 0
    international_investment_usd: float = 0
    mechanisms_count: int = 0
    projects_count: int = 0
    territories_count: int = 0
    estimated_hectares: float = 0
    verified_hectares: float = 0
    estimated_tco2e: float = 0
    verified_tco2e: float = 0
    data_gaps_count: int = 0
    investment_by_source: List[dict] = []
    investment_by_intervention: List[dict] = []
    top_territories: List[dict] = []


# === Layer ===
class LayerCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    source_url: Optional[str] = None
    layer_type: str = "geojson"
    geometry_type: Optional[str] = None
    is_active: bool = True
    is_official: bool = False

class LayerResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    source_url: Optional[str] = None
    layer_type: str
    geometry_type: Optional[str] = None
    is_active: bool
    is_official: bool
    is_sample: bool
    class Config:
        from_attributes = True
