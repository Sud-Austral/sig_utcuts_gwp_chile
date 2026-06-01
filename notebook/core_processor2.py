import os
import glob
import geopandas as gpd
import logging
import json
import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def process_data():
    # PATHS dinámicos para local y Docker
    SELF_DIR = os.path.dirname(os.path.abspath(__file__))
    ROOT_DIR = os.path.dirname(SELF_DIR)
    DATA_RAW = os.path.join(ROOT_DIR, 'data_raw')
    DATA_TILES = os.path.join(ROOT_DIR, 'data_tiles')
    
    os.makedirs(DATA_TILES, exist_ok=True)
    
    # Catálogo de metadatos
    catalog = {
        "last_update": datetime.datetime.now().isoformat(),
        "layers": []
    }
    
    # Soportar varios formatos
    extensions = ['*.shp', '*.zip', '*.kml', '*.geojson', '*.json', '*.gpkg']
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(DATA_RAW, ext)))
    
    logging.info(f"Encontrados {len(files)} archivos en data_raw")
    
    for file_path in files:
        layer_name = os.path.splitext(os.path.basename(file_path))[0].lower().replace(" ", "_").replace(".", "_")
        logging.info(f"Procesando capa: {layer_name}...")
        
        try:
            # 1. Leer con GeoPandas
            read_path = file_path if not file_path.endswith('.zip') else f"zip://{file_path}"
            gdf = gpd.read_file(read_path)
            
            if gdf.empty:
                logging.warning(f"Capa {layer_name} está vacía. Saltando.")
                continue
                
            # Forzar WGS84 para compatibilidad con MapLibre
            if gdf.crs is None or gdf.crs.to_epsg() != 4326:
                gdf = gdf.to_crs(epsg=4326)
            
            # 1.5. OPTIMIZACIÓN AGRESIVA (Rec. 1, 4, 7)
            logging.info(f"  Detectando topología y simplificando...")
            gdf['geometry'] = gdf['geometry'].make_valid()
            
            # Simplificar según escala (preservando topología básica)
            # 0.0001 (aprox 10m) es un buen balance para visualización web
            gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.0001, preserve_topology=True)
            
            # Limpiar nombres de columnas y filtrar solo geometría válida
            gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]
            
            new_cols = []
            for c in gdf.columns:
                base_name = str(c).lower().replace(" ", "_")
                new_name = base_name
                counter = 1
                while new_name in new_cols:
                    new_name = f"{base_name}_{counter}"
                    counter += 1
                new_cols.append(new_name)
            gdf.columns = new_cols
            
            # 2. Guardar FlatGeobuf (FGB)
            # Versión Standard
            fgb_path = os.path.join(DATA_TILES, f"{layer_name}.fgb")
            gdf.to_file(fgb_path, driver='FlatGeobuf')
            
            # Versión LOW_RES para carga rápida (Rec 16)
            lowres_path = os.path.join(DATA_TILES, f"{layer_name}.lowres.fgb")
            gdf_low = gdf.copy()
            gdf_low['geometry'] = gdf_low['geometry'].simplify(tolerance=0.005, preserve_topology=True)
            gdf_low.to_file(lowres_path, driver='FlatGeobuf')
            
            logging.info(f"  [OK] Guardadas versiones Standard y LowRes para: {layer_name}")

            # Añadir al catálogo
            catalog["layers"].append({
                "id": layer_name,
                "file": os.path.basename(file_path),
                "fgb": f"{layer_name}.fgb",
                "fgb_lowres": f"{layer_name}.lowres.fgb",
                "feature_count": len(gdf),
                "attributes": [str(c) for c in gdf.columns if c != 'geometry']
            })

        except Exception as e:
            logging.error(f"Error crítico en capa {layer_name}: {e}")

    # Guardar catálogo final
    layers_json_path = os.path.join(DATA_TILES, 'layers.json')
    with open(layers_json_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=4, ensure_ascii=False)
    logging.info(f"=== Catálogo generado exitosamente en: {layers_json_path} ===")

def generate_configs():
    """
    Lee los .fgb generados en data_tiles/ y escribe:
      - data_tiles/layers.json     (catálogo enriquecido para el frontend)
      - backend/layers_config.json (configuración completa de la API)
    """
    SELF_DIR = os.path.dirname(os.path.abspath(__file__))
    ROOT_DIR = os.path.dirname(SELF_DIR)
    DATA_TILES = os.path.join(ROOT_DIR, 'data_tiles')
    BACKEND_DIR = os.path.join(ROOT_DIR, 'backend')

    COLOR_PALETTE = [
        "#3B82F6", "#AD46FF", "#FE9A00", "#FF2056",
        "#00B8DB", "#E17100", "#7F22FE", "#10B981",
        "#F59E0B", "#EF4444", "#06B6D4", "#8B5CF6",
    ]

    ADMIN_KEYWORDS = ["region", "provincia", "comuna", "admin", "distrito"]
    INTERNAL_COLS  = {"fid", "objectid", "shape_length", "shape_area", "gid", "id"}

    fgb_files = sorted([
        f for f in glob.glob(os.path.join(DATA_TILES, "*.fgb"))
        if not f.endswith(".lowres.fgb")
    ])

    if not fgb_files:
        logging.warning("No se encontraron archivos .fgb en data_tiles/. Ejecuta process_data() primero.")
        return

    admin_layers, regular_layers = [], []
    layer_metadata = {}
    color_idx = 0

    for fgb_path in fgb_files:
        layer_id = os.path.splitext(os.path.basename(fgb_path))[0]
        is_admin = any(kw in layer_id.lower() for kw in ADMIN_KEYWORDS)

        # Leer columnas reales del archivo
        try:
            gdf = gpd.read_file(fgb_path, rows=1)
            cols = [c for c in gdf.columns if c != "geometry" and c.lower() not in INTERNAL_COLS]
        except Exception as e:
            logging.warning(f"No se pudieron leer columnas de {layer_id}: {e}")
            cols = []

        display_name = layer_id.replace("_simplified", "").replace("_", " ").title()
        color = COLOR_PALETTE[color_idx % len(COLOR_PALETTE)]
        color_idx += 1

        meta = {"name": display_name, "color": color}
        if cols:
            meta["visible_columns"] = cols

        layer_metadata[layer_id] = meta

        if is_admin:
            admin_layers.append(layer_id)
        else:
            regular_layers.append(layer_id)

    # --- Armar layers_config.json ---
    admin_levels = []
    for lid in admin_layers:
        label = lid.replace("_simplified", "").replace("_", " ").title()
        # Intentar detectar la clave de nombre leyendo columnas reales
        try:
            gdf = gpd.read_file(os.path.join(DATA_TILES, f"{lid}.fgb"), rows=1)
            candidate_keys = [c for c in gdf.columns if c.lower() in
                              {"region", "provincia", "comuna", "nombre", "name", "nom_reg", "nom_prov", "nom_com"}]
            target_key = candidate_keys[0] if candidate_keys else label.split()[0]
        except Exception:
            target_key = label.split()[0]

        admin_levels.append({"id": lid, "label": label, "target_key": target_key})

    groups = []
    if admin_layers:
        groups.append({
            "id": "admin",
            "name": "Información Administrativa",
            "is_administrative": True,
            "graphic": False,
            "layers": admin_layers
        })
    if regular_layers:
        groups.append({
            "id": "restricciones",
            "name": "Restricciones Territoriales",
            "graphic": True,
            "layers": regular_layers
        })

    display_order = regular_layers + ["terrenos"] + admin_layers

    proximidad_cercana = {}
    for lid in regular_layers:
        meta_cols = layer_metadata.get(lid, {}).get("visible_columns", [])
        for candidate in ["nombre", "name", "Name", "NOMBRE", "nombreorig"]:
            if any(c.lower() == candidate.lower() for c in meta_cols):
                proximidad_cercana[lid] = candidate
                break

    layers_config = {
        "administrative_config": {
            "levels": admin_levels
        },
        "proximidad_cercana": proximidad_cercana,
        "administrative_layers": admin_layers,
        "display_order": display_order,
        "groups": groups,
        "layer_metadata": {
            **layer_metadata,
            "terrenos": {"name": "Terrenos Analizados", "color": "#009966"}
        }
    }

    config_path = os.path.join(BACKEND_DIR, 'layers_config.json')
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(layers_config, f, indent=2, ensure_ascii=False)
    logging.info(f"[OK] layers_config.json escrito en: {config_path}")

    # --- Armar layers.json enriquecido ---
    all_ids = regular_layers + admin_layers
    layers_json = {
        "last_update": datetime.datetime.now().isoformat(),
        "groups": groups,
        "layers": [{"id": lid} for lid in all_ids],
        "metadata": layer_metadata,
        "display_order": display_order,
        "administrative_config": layers_config["administrative_config"],
        "proximidad_cercana": proximidad_cercana
    }

    layers_json_path = os.path.join(DATA_TILES, 'layers.json')
    with open(layers_json_path, 'w', encoding='utf-8') as f:
        json.dump(layers_json, f, indent=2, ensure_ascii=False)
    logging.info(f"[OK] layers.json escrito en: {layers_json_path}")
    logging.info(f"    {len(regular_layers)} capas normativas + {len(admin_layers)} capas administrativas")


if __name__ == "__main__":
    process_data()
    generate_configs()
