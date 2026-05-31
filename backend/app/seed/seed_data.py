"""Seed data loader — synthetic demo data for SIG-UTCUTS Chile."""
import json
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.models.user import User, Role
from app.models.territory import Territory
from app.models.mechanism import Mechanism
from app.models.project import Project
from app.models.investment import Investment
from app.models.intervention import Intervention
from app.models.mrv import MRVIndicator, MRVObservation
from app.models.data_quality import DataQualityFlag
from app.models.prioritization import PrioritizationScore
from app.models.layer import DataSource, Layer
from app.models.sirsd_programa import SirsdPrograma
from app.models.plantacion_forestal_2022 import PlantacionForestal2022
from app.core.security import get_password_hash


def _bbox_to_geojson(x1, y1, x2, y2):
    """Convert bounding box to GeoJSON polygon string."""
    geom = {
        "type": "Polygon",
        "coordinates": [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]]
    }
    return json.dumps(geom)


def seed_roles(db: Session):
    roles = ["public_viewer", "institutional_viewer", "analyst", "editor", "validator", "admin"]
    for r in roles:
        if not db.query(Role).filter(Role.name == r).first():
            db.add(Role(name=r, description=f"Rol {r}"))
    db.commit()


def seed_users(db: Session):
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    editor_role = db.query(Role).filter(Role.name == "editor").first()
    viewer_role = db.query(Role).filter(Role.name == "public_viewer").first()
    if db.query(User).filter(User.username == "admin").first():
        return
    users = [
        User(email="admin@sigutcuts.demo", username="admin",
             hashed_password=get_password_hash("admin123"),
             full_name="Administrador Demo", institution="CONAF", is_sample=True,
             roles=[admin_role] if admin_role else []),
        User(email="editor@sigutcuts.demo", username="editor",
             hashed_password=get_password_hash("editor123"),
             full_name="Editor Demo", institution="MMA", is_sample=True,
             roles=[editor_role] if editor_role else []),
        User(email="viewer@sigutcuts.demo", username="viewer",
             hashed_password=get_password_hash("viewer123"),
             full_name="Visor Demo", institution="Público", is_sample=True,
             roles=[viewer_role] if viewer_role else []),
    ]
    db.add_all(users)
    db.commit()


def seed_territories(db: Session):
    if db.query(Territory).first():
        return
    # Country
    chile = Territory(code="CL", name="Chile", type="country", is_sample=True, area_ha=75610000)
    db.add(chile)
    db.flush()

    # Regions with simplified bounding-box polygons (EPSG:4326)
    regions_data = [
        ("CL-CO", "Coquimbo", -71.5, -29.0, -70.0, -32.2, 4058000),
        ("CL-VS", "Valparaíso", -71.8, -32.0, -70.0, -33.5, 1639630),
        ("CL-ML", "Maule", -72.5, -34.5, -70.3, -36.4, 3036000),
        ("CL-BI", "Biobío", -73.5, -36.4, -71.0, -38.0, 3706900),
    ]
    region_objs = []
    for code, name, x1, y1, x2, y2, area in regions_data:
        geojson = _bbox_to_geojson(x1, y1, x2, y2)
        r = Territory(code=code, name=name, type="region", parent_id=chile.id,
                      geom_geojson=geojson, area_ha=area, is_sample=True)
        db.add(r)
        db.flush()
        region_objs.append(r)

    # 2 communes per region
    communes = [
        ("04101", "La Serena", 0, -71.3, -29.9, -70.5, -30.3, 189000),
        ("04102", "Coquimbo", 0, -71.4, -30.0, -70.8, -30.5, 150000),
        ("05101", "Valparaíso", 1, -71.7, -33.0, -71.4, -33.1, 30000),
        ("05109", "Viña del Mar", 1, -71.6, -33.0, -71.4, -33.1, 17800),
        ("07101", "Talca", 2, -71.8, -35.3, -71.4, -35.6, 23200),
        ("07301", "Curicó", 2, -71.4, -34.9, -71.0, -35.2, 73200),
        ("08101", "Concepción", 3, -73.1, -36.7, -72.9, -36.9, 22100),
        ("08201", "Los Ángeles", 3, -72.6, -37.3, -72.0, -37.7, 180000),
    ]
    for code, name, ri, x1, y1, x2, y2, area in communes:
        geojson = _bbox_to_geojson(x1, y1, x2, y2)
        db.add(Territory(code=code, name=name, type="commune",
                         parent_id=region_objs[ri].id,
                         geom_geojson=geojson, area_ha=area, is_sample=True))
    db.commit()


def seed_mechanisms(db: Session):
    if db.query(Mechanism).first():
        return
    mechs = [
        ("MEC-01", "Actualización Ley de Bosque Nativo", "legal", "Presupuesto público", "design", "medium",
         "Manejo sostenible, conservación", "Pequeños y medianos propietarios forestales", "native_forest_management"),
        ("MEC-02", "Nueva Ley de Fomento a la Forestación Mixta", "legal", "Presupuesto público", "concept", "long",
         "Forestación, captura de carbono", "Propietarios de terrenos sin bosque", "afforestation"),
        ("MEC-03", "Ampliación Ley de Donaciones hacia Bosques Naturales", "fiscal", "Privado", "design", "medium",
         "Conservación, restauración", "ONG, comunidades", "conservation"),
        ("MEC-04", "Vincular Manejo de BN al Impuesto Verde", "fiscal", "Mixto", "concept", "long",
         "Reducción de emisiones", "Empresas emisoras", "native_forest_management"),
        ("MEC-05", "Bancos de Compensación de Biodiversidad", "market", "Privado", "pilot", "medium",
         "Biodiversidad, restauración", "Empresas con obligaciones de compensación", "conservation"),
        ("MEC-06", "Bancos de Compensación Privados / Murallas Verdes", "market", "Privado", "concept", "long",
         "Restauración, prevención de incendios", "Sector privado", "restoration"),
        ("MEC-07", "Fomento al Bosque Nativo / Modelo Simbiótico", "subsidy", "Público", "operational", "short",
         "Manejo de bosque nativo", "Pequeños propietarios", "native_forest_management"),
        ("MEC-08", "Billetera Digital de Carbono Campesino", "market", "Mixto", "concept", "long",
         "Carbono, inclusión social", "Campesinos, pequeños propietarios", "restoration"),
        ("MEC-09", "Cuadrillas Municipales de Prevención de Incendios", "public", "Público", "pilot", "short",
         "Prevención de incendios", "Municipios, comunidades rurales", "fire_prevention"),
        ("MEC-10", "Aportes Presupuestarios + Fondos Climáticos Internacionales", "international", "Internacional", "operational", "medium",
         "NDC, restauración, conservación", "Gobierno, instituciones", "restoration"),
    ]
    for code, name, cat, src, mat, th, ndc, ben, it in mechs:
        db.add(Mechanism(code=code, name=name, category=cat, main_funding_source=src,
                         maturity_level=mat, time_horizon=th, ndc_alignment=ndc,
                         target_beneficiaries=ben, intervention_types=it,
                         description=f"Mecanismo demo: {name}", is_sample=True))
    db.commit()


def seed_projects_and_investments(db: Session):
    if db.query(Project).first():
        return
    mechs = db.query(Mechanism).all()
    territories = db.query(Territory).filter(Territory.type == "commune").all()
    projects_data = [
        ("Restauración cuenca Elqui", 0, 2023, 2027, "regional", [0, 1]),
        ("Forestación Valparaíso", 1, 2024, 2028, "communal", [2, 3]),
        ("Conservación bosque nativo Maule", 2, 2022, 2026, "communal", [4, 5]),
        ("Prevención incendios Biobío", 8, 2024, 2025, "regional", [6, 7]),
        ("Carbono campesino piloto", 7, 2025, 2030, "national", [0, 1, 2, 3]),
        ("Compensación biodiversidad minera", 4, 2023, 2028, "communal", [4, 5]),
    ]
    for name, mi, sy, ey, gp, ti in projects_data:
        p = Project(mechanism_id=mechs[mi].id if mi < len(mechs) else None,
                    name=name, start_year=sy, end_year=ey,
                    status="active", geographic_precision=gp, data_confidence="demo",
                    source_reference="Dato sintético demo", is_sample=True)
        p.territories = [territories[i] for i in ti if i < len(territories)]
        db.add(p)
    db.flush()

    inv_data = [
        (1, "CONAF", "public", 5000000, 2023), (1, "GCF", "international", 3000000, 2024),
        (2, "FNDR", "public", 2000000, 2024), (2, "FAO", "international", 1500000, 2024),
        (3, "Ley Donaciones", "private", 800000, 2022), (3, "MMA", "public", 1200000, 2023),
        (4, "CONAF", "public", 600000, 2024), (4, "Municipios", "public", 400000, 2024),
        (5, "Banco Mundial", "international", 2500000, 2025),
        (5, "Privado", "private", 1000000, 2025),
        (6, "Empresa minera", "private", 3500000, 2023),
        (6, "GEF", "international", 1500000, 2024),
    ]
    for pi, src, ft, amt, yr in inv_data:
        db.add(Investment(project_id=pi, funding_source=src, funding_type=ft,
                          amount=amt, currency="USD", amount_usd=amt, year=yr,
                          data_quality="demo", is_sample=True))
    db.commit()


def seed_interventions(db: Session):
    if db.query(Intervention).first():
        return
    interventions = [
        (1, "restoration", 5000, 1200, 25000, 5000, 500, 120),
        (1, "native_forest_management", 3000, 800, 15000, 3000, 300, 80),
        (2, "afforestation", 4000, 0, 20000, 0, 200, 0),
        (3, "conservation", 8000, 2000, 40000, 10000, 150, 40),
        (4, "fire_prevention", 10000, 5000, 5000, 2500, 1000, 500),
        (5, "restoration", 2000, 0, 10000, 0, 100, 0),
        (6, "conservation", 6000, 1500, 30000, 7500, 50, 10),
        (6, "restoration", 3000, 500, 15000, 2500, 80, 20),
    ]
    for pi, it, he, hv, te, tv, be, bv in interventions:
        db.add(Intervention(project_id=pi, intervention_type=it,
                            hectares_estimated=he, hectares_verified=hv,
                            tco2e_estimated=te, tco2e_verified=tv,
                            beneficiaries_estimated=be, beneficiaries_verified=bv,
                            status="active",
                            verification_status="estimated" if hv == 0 else "reported",
                            is_sample=True))
    db.commit()


def seed_mrv(db: Session):
    if db.query(MRVIndicator).first():
        return
    indicators = [
        ("FIN-01", "Monto aprobado", "financial", "USD"),
        ("FIN-02", "Monto ejecutado", "financial", "USD"),
        ("FIN-03", "Porcentaje de ejecución", "financial", "%"),
        ("FIS-01", "Hectáreas bajo manejo", "physical", "ha"),
        ("FIS-02", "Hectáreas restauradas", "physical", "ha"),
        ("FIS-03", "Hectáreas forestadas", "physical", "ha"),
        ("CLI-01", "tCO2e capturadas", "climate", "tCO2e"),
        ("CLI-02", "Emisiones evitadas", "climate", "tCO2e"),
        ("SOC-01", "Beneficiarios directos", "social", "personas"),
        ("SOC-02", "Empleo generado", "social", "empleos"),
        ("BIO-01", "Superficie en áreas protegidas", "biodiversity", "ha"),
        ("BIO-02", "Ecosistemas cubiertos", "biodiversity", "unidades"),
        ("GOB-01", "Acuerdos firmados", "governance", "unidades"),
        ("CAL-01", "Registros completos", "data_quality", "%"),
        ("CAL-02", "Registros con geometría", "data_quality", "%"),
    ]
    for code, name, cat, unit in indicators:
        db.add(MRVIndicator(code=code, name=name, category=cat, unit=unit, is_sample=True))
    db.flush()

    inds = db.query(MRVIndicator).all()
    intrvs = db.query(Intervention).all()
    import random
    random.seed(42)
    for intv in intrvs[:5]:
        for ind in inds[:6]:
            est = round(random.uniform(100, 5000), 1)
            ver = round(est * random.uniform(0.2, 0.8), 1) if random.random() > 0.3 else None
            db.add(MRVObservation(
                intervention_id=intv.id, indicator_id=ind.id,
                estimated_value=est, verified_value=ver,
                observation_date=date(2024, 6, 15),
                verification_status="verified" if ver else "estimated",
                is_sample=True))
    db.commit()


def seed_prioritization(db: Session):
    if db.query(PrioritizationScore).first():
        return
    communes = db.query(Territory).filter(Territory.type == "commune").all()
    import random
    random.seed(42)
    for c in communes:
        sf = round(random.uniform(30, 95), 1)
        sc = round(random.uniform(20, 90), 1)
        sd = round(random.uniform(15, 85), 1)
        sg = round(random.uniform(25, 90), 1)
        sb = round(random.uniform(10, 80), 1)
        ss = round(random.uniform(20, 85), 1)
        so = round(random.uniform(30, 90), 1)
        sm = round(random.uniform(10, 70), 1)
        total = round(0.20*sf + 0.15*sc + 0.15*sd + 0.15*sg + 0.10*sb + 0.10*ss + 0.10*so + 0.05*sm, 1)
        if total >= 80: pc = "muy_alta"
        elif total >= 60: pc = "alta"
        elif total >= 40: pc = "media"
        elif total >= 20: pc = "baja"
        else: pc = "muy_baja"
        db.add(PrioritizationScore(
            territory_id=c.id, scenario_name="default", score_total=total,
            score_forest_restoration=sf, score_climate_risk=sc,
            score_degradation_loss=sd, score_financial_gap=sg,
            score_biodiversity=sb, score_social_vulnerability=ss,
            score_operational_feasibility=so, score_mechanism_alignment=sm,
            priority_class=pc, is_sample=True))
    db.commit()


def seed_data_quality(db: Session):
    if db.query(DataQualityFlag).first():
        return
    flags = [
        ("project", 3, "missing_geometry", "warning", "Proyecto sin geometría asociada"),
        ("investment", 5, "missing_source", "warning", "Inversión sin fuente documentada"),
        ("intervention", 3, "estimated_value", "info", "Valores solo estimados, sin verificación"),
        ("project", 5, "low_confidence", "warning", "Confianza baja en datos del proyecto"),
        ("investment", 9, "missing_year", "error", "Inversión sin año registrado"),
        ("intervention", 6, "missing_climate_indicator", "warning", "Sin indicador climático"),
        ("project", 2, "missing_geometry", "warning", "Proyecto sin geometría precisa"),
        ("investment", 11, "possible_duplicate", "info", "Posible duplicado con inversión 12"),
        ("intervention", 8, "missing_physical_indicator", "warning", "Sin indicador físico"),
        ("project", 4, "estimated_value", "info", "Hectáreas solo estimadas"),
    ]
    for et, eid, ft, sev, desc in flags:
        db.add(DataQualityFlag(entity_type=et, entity_id=eid, flag_type=ft,
                               severity=sev, description=desc, is_sample=True))
    db.commit()


def seed_data_sources(db: Session):
    # Clear old sample data to ensure the database updates with new layer definitions
    db.query(Layer).filter(Layer.is_sample == True).delete()
    db.query(DataSource).filter(DataSource.is_sample == True).delete()
    db.commit()

    if db.query(DataSource).first():
        return
    sources = [
        ("IDE Chile", "IDE Chile", "territorial", "https://www.ide.cl", "open"),
        ("SIMBIO", "MMA", "biodiversity", "https://simbio.mma.gob.cl", "open"),
        ("Subpesca", "Subsecretaría de Pesca y Acuicultura", "coastal", "https://www.subpesca.cl", "open"),
        ("Ministerio del Medio Ambiente", "MMA", "biodiversity", "https://mma.gob.cl", "open"),
        ("CIREN", "Centro de Información de Recursos Naturales", "territorial", "https://www.ciren.cl", "open"),
        ("CONAF", "Corporación Nacional Forestal", "forestry", "https://www.conaf.cl", "open"),
    ]
    for name, inst, cat, url, acc in sources:
        db.add(DataSource(name=name, institution=inst, category=cat, url=url,
                          access_type=acc, integration_status="planned", is_sample=True))
    db.flush()
    ds_list = db.query(DataSource).all()
    layers = [
        ("Regiones de Chile", "territorial", 0, "polygon", "db"),
        ("Provincias de Chile", "territorial", 0, "polygon", "geojson"),
        ("Comunas de Chile", "territorial", 0, "polygon", "db"),
        ("Viveros Forestales 2025", "forestry", 5, "point", "geojson"),
        ("Viveros SAG 2024", "territorial", 4, "point", "geojson"),
        ("Conservación de Suelos", "territorial", 4, "polygon", "geojson"),
        ("Programas SIRSD (WMS)", "territorial", 4, "raster", "wms"),
        ("Áreas Protegidas", "biodiversity", 1, "polygon", "geojson"),
        ("Sitios Prioritarios", "biodiversity", 1, "polygon", "geojson"),
        ("Espacios ECMPO", "coastal", 2, "polygon", "geojson"),
        ("Ecosistemas", "biodiversity", 3, "polygon", "geojson"),
    ]
    for name, cat, dsi, gt, lt in layers:
        db.add(Layer(name=name, category=cat,
                     data_source_id=ds_list[dsi].id if dsi < len(ds_list) else None,
                     geometry_type=gt, layer_type=lt, is_sample=True))
    db.commit()


def seed_intervention_geometries(db: Session):
    from app.models.intervention import InterventionGeometry, Intervention
    import json
    import random
    import math
    import os
    
    # Helper generators for realistic-looking natural polygons
    def generate_irregular_polygon(center_lng, center_lat, size_deg=0.035, num_vertices=7):
        points = []
        # Angle increments with random jittering to make shape organic
        angles = sorted([random.uniform(0, 2 * math.pi) for _ in range(num_vertices)])
        for angle in angles:
            r = size_deg * random.uniform(0.65, 1.25)
            lng = center_lng + r * math.cos(angle)
            lat = center_lat + r * math.sin(angle) * 1.15
            points.append([lng, lat])
        points.append(points[0])  # Close ring
        return {"type": "Polygon", "coordinates": [points]}

    def generate_donut_polygon(center_lng, center_lat, outer_size=0.045, inner_size=0.015):
        outer_points = []
        inner_points = []
        num_vertices = 9
        
        # Outer boundary (CCW)
        outer_angles = sorted([i * (2 * math.pi / num_vertices) for i in range(num_vertices)])
        for angle in outer_angles:
            r = outer_size * random.uniform(0.7, 1.3)
            lng = center_lng + r * math.cos(angle)
            lat = center_lat + r * math.sin(angle) * 1.15
            outer_points.append([lng, lat])
        outer_points.append(outer_points[0])
        
        # Inner boundary (CW)
        inner_angles = sorted([i * (2 * math.pi / num_vertices) for i in range(num_vertices)], reverse=True)
        for angle in inner_angles:
            r = inner_size * random.uniform(0.8, 1.2)
            lng = center_lng + r * math.cos(angle)
            lat = center_lat + r * math.sin(angle) * 1.15
            inner_points.append([lng, lat])
        inner_points.append(inner_points[0])
        return {"type": "Polygon", "coordinates": [outer_points, inner_points]}

    def generate_firebreak_polygon(center_lng, center_lat, length_deg=0.07, width_deg=0.005):
        # Generates a long winding line buffered into a polygon representing a firebreak
        num_segments = 7
        path = []
        for i in range(num_segments + 1):
            t = i / num_segments
            lng = center_lng - length_deg / 2 + t * length_deg
            lat = center_lat + 0.015 * math.sin(t * math.pi * 2.8)
            path.append((lng, lat))
        
        left_side = []
        right_side = []
        for i in range(len(path)):
            lng, lat = path[i]
            left_side.append([lng, lat - width_deg / 2])
            right_side.insert(0, [lng, lat + width_deg / 2])
            
        points = left_side + right_side + [left_side[0]]
        return {"type": "Polygon", "coordinates": [points]}

    # Clean previous geometries
    db.query(InterventionGeometry).delete()
    db.commit()
        
    print("  > Seeding highly realistic, irregular intervention geometries...")
    interventions = db.query(Intervention).all()
    for idx, i in enumerate(interventions):
        # Find first commune linked to the project
        commune = None
        if i.project and i.project.territories:
            for t in i.project.territories:
                if t.type == "commune":
                    commune = t
                    break
        
        # Extract base coordinate
        if commune and commune.geom_geojson:
            try:
                geom = json.loads(commune.geom_geojson)
                if geom["type"] == "Polygon":
                    coord = geom["coordinates"][0][0]
                elif geom["type"] == "MultiPolygon":
                    coord = geom["coordinates"][0][0][0]
                else:
                    coord = [-71.5, -35.0]
            except Exception:
                coord = [-71.5, -35.0]
        else:
            coord = [-71.5, -35.0]
            
        lng, lat = coord
        # Add slight offset so overlapping interventions on same project aren't identical
        offset_x = random.uniform(-0.03, 0.03)
        offset_y = random.uniform(-0.03, 0.03)
        lng += offset_x
        lat += offset_y
        
        # Choose polygon pattern based on intervention type to simulate real GIS digitization
        int_type = i.intervention_type
        if int_type == "fire_prevention":
            poly_geom = generate_firebreak_polygon(lng, lat)
        elif int_type == "restoration":
            poly_geom = generate_donut_polygon(lng, lat)
        elif int_type == "native_forest_management":
            poly_geom = generate_irregular_polygon(lng, lat, size_deg=0.035, num_vertices=8)
        elif int_type == "conservation":
            poly_geom = generate_irregular_polygon(lng, lat, size_deg=0.045, num_vertices=6)
        elif int_type == "afforestation":
            poly_geom = generate_irregular_polygon(lng, lat, size_deg=0.03, num_vertices=5)
        else:
            poly_geom = generate_irregular_polygon(lng, lat, size_deg=0.04, num_vertices=7)
        
        geom_obj = InterventionGeometry(
            intervention_id=i.id,
            geometry_type="polygon",
            geom_geojson=json.dumps(poly_geom),
            precision_level="polygon",
            source="Digitalizado del Catastro",
            validated=True,
            is_sample=True
        )
        db.add(geom_obj)
    db.commit()
    print("  [OK] Organic intervention geometries seeded in DB.")

    # Write static backup file to insumos/datos_geo/intervenciones_locales.json
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        datos_geo_dir = os.path.join(base_dir, "insumos", "datos_geo")
        if os.path.exists(datos_geo_dir):
            file_path = os.path.join(datos_geo_dir, "intervenciones_locales.json")
            features = []
            for geom_obj in db.query(InterventionGeometry).all():
                try:
                    geom = json.loads(geom_obj.geom_geojson)
                except Exception:
                    continue
                inter = geom_obj.intervention
                proj = inter.project if inter else None
                
                # Resolve region code
                region_code = None
                commune = db.query(Territory).filter(Territory.id == geom_obj.territory_id).first() if geom_obj.territory_id else None
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
                        "id": geom_obj.id,
                        "intervention_id": inter.id if inter else None,
                        "project_id": inter.project_id if inter else None,
                        "project_name": proj.name if proj else "Proyecto Desconocido",
                        "type": inter.intervention_type if inter else "Desconocido",
                        "ndc_component": inter.ndc_component if inter else None,
                        "hectares_estimated": inter.hectares_estimated if inter else 0.0,
                        "hectares_verified": inter.hectares_verified if inter else 0.0,
                        "status": inter.status if inter else "planned",
                        "verification_status": inter.verification_status if inter else "estimated",
                        "precision": geom_obj.precision_level,
                        "source": geom_obj.source,
                        "region_code": region_code
                    },
                    "geometry": geom
                })
            fc = {"type": "FeatureCollection", "features": features}
            with open(file_path, "w", encoding="utf-8") as f_out:
                json.dump(fc, f_out, indent=2, ensure_ascii=False)
            print(f"  [OK] Wrote static interventions copy to {file_path}")
    except Exception as e:
        print(f"  [WARN] Failed to write static interventions copy: {e}")


def run_all_seeds(db: Session):
    """Execute all seed functions in order. Roles and users are critical."""
    # Crítico: roles y usuarios siempre deben ejecutarse
    try:
        print("  > Seeding roles...")
        seed_roles(db)
        from sqlalchemy import text
        role_count = db.execute(text("SELECT COUNT(*) FROM roles")).scalar()
        print(f"  [OK] Roles en DB: {role_count}")
    except Exception as e:
        print(f"  [ERROR] seed_roles falló: {e}")
        db.rollback()

    try:
        print("  > Seeding users...")
        seed_users(db)
        from sqlalchemy import text
        user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        print(f"  [OK] Usuarios en DB: {user_count}")
    except Exception as e:
        print(f"  [ERROR] seed_users falló: {e}")
        db.rollback()

    # No críticos: si fallan, continúa sin bloquear el startup
    for name, fn in [
        ("data_sources", seed_data_sources),
        ("territories", seed_territories),
        ("mechanisms", seed_mechanisms),
        ("projects_investments", seed_projects_and_investments),
        ("interventions", seed_interventions),
        ("intervention_geometries", seed_intervention_geometries),
        ("mrv", seed_mrv),
        ("prioritization", seed_prioritization),
        ("data_quality", seed_data_quality),
        ("sirsd_programas", seed_sirsd_programas),
        ("plantaciones_forestales", seed_plantaciones_forestales_2022),
    ]:
        try:
            fn(db)
        except Exception as e:
            print(f"  [WARN] seed_{name} falló (no crítico): {e}")
            db.rollback()

    print("  [OK] Seed completado.")


def seed_sirsd_programas(db: Session):
    # Clear old sample data
    db.query(SirsdPrograma).filter(SirsdPrograma.is_sample == True).delete()
    db.commit()

    if db.query(SirsdPrograma).first():
        return

    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    file_path = os.path.join(base_dir, "insumos", "datos_geo", "prog_recuperacion_suelos_degra.json")
    if not os.path.exists(file_path):
        print(f"  [WARN] SIRSD GeoJSON seed file not found at: {file_path}")
        return

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            features = data.get("features", [])
            print(f"  > Seeding {len(features)} SIRSD programas from local file into SQLite...")
            for idx, feat in enumerate(features):
                props = feat.get("properties", {})
                geom = feat.get("geometry")
                
                db.add(SirsdPrograma(
                    clave=props.get("clave"),
                    sup_ha=props.get("sup_ha"),
                    temporada=props.get("temporada"),
                    concurso=props.get("concurso"),
                    tip_conc=props.get("tip_conc"),
                    codreg=props.get("codreg"),
                    codprov=props.get("codprov"),
                    comuna=props.get("comuna"),
                    codcom=props.get("codcom"),
                    sup_predio=props.get("sup_predio"),
                    su_uso_agr=props.get("su_uso_agr"),
                    sup_potres=props.get("sup_potres"),
                    clase=props.get("clase"),
                    subclase=props.get("subclase"),
                    unidad=props.get("unidad"),
                    agrupacion=props.get("agrupacion"),
                    localidad=props.get("localidad"),
                    conservado=props.get("conservado"),
                    nom_operad=props.get("nom_operad"),
                    bon_total=props.get("bon_total"),
                    macrozona=props.get("macrozona"),
                    admisible=props.get("admisible"),
                    geom_geojson=json.dumps(geom) if geom else None,
                    is_sample=True
                ))
                
                # Commit in batches of 200 to keep it efficient
                if (idx + 1) % 200 == 0:
                    db.commit()
            db.commit()
            print("  [OK] SIRSD programas seeded in SQLite database.")
    except Exception as e:
        db.rollback()
        print(f"  [WARN] Failed to seed SIRSD programs: {e}")


def seed_plantaciones_forestales_2022(db: Session):
    # Clear old sample data
    db.query(PlantacionForestal2022).filter(PlantacionForestal2022.is_sample == True).delete()
    db.commit()

    if db.query(PlantacionForestal2022).first():
        return

    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    file_path = os.path.join(base_dir, "insumos", "datos_geo", "plantaciones_forestales_2022.json")
    if not os.path.exists(file_path):
        print(f"  [WARN] Plantaciones Forestales GeoJSON seed file not found at: {file_path}")
        return

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            features = data.get("features", [])
            print(f"  > Seeding {len(features)} Plantaciones Forestales 2022 from local file into SQLite...")
            for idx, feat in enumerate(features):
                props = feat.get("properties", {})
                geom = feat.get("geometry")
                
                db.add(PlantacionForestal2022(
                    objectid=props.get("objectid"),
                    especie=props.get("especie"),
                    especie_t=props.get("especie_t"),
                    apl=props.get("apl"),
                    sup_ha=props.get("sup_ha"),
                    codreg=props.get("codreg"),
                    geom_geojson=json.dumps(geom) if geom else None,
                    is_sample=True
                ))
                
                # Commit in batches of 1000 to keep it efficient since there are 146k features!
                if (idx + 1) % 1000 == 0:
                    db.commit()
            db.commit()
            print("  [OK] Plantaciones Forestales 2022 seeded in SQLite database.")
    except Exception as e:
        db.rollback()
        print(f"  [WARN] Failed to seed Plantaciones Forestales 2022: {e}")
