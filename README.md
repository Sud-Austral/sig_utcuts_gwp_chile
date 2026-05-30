# SIG-UTCUTS Chile

## Plataforma de Inteligencia Territorial para Inversiones, Mecanismos Financieros, Priorización y MRV del Sector UTCUTS en Chile

### Descripción

SIG-UTCUTS Chile es una plataforma web geoespacial de alta fidelidad para visualizar, registrar, analizar, auditar y priorizar inversiones, mecanismos financieros e iniciativas físicas vinculadas al sector UTCUTS (Uso de la Tierra, Cambio de Uso de la Tierra y Silvicultura) en Chile. 

Ha sido diseñada bajo una temática visual oscura premium y optimizada con algoritmos asíncronos y streaming de datos geográficos para operar a escala nacional sin comprometer el rendimiento del cliente.

---

### Características Principales

#### 🔐 1. Pantalla de Acceso Rápido y Seguridad (RBAC)
- **Autenticación JWT:** Sesión protegida y control de accesos por roles (Viewer, Analyst, Editor, Validator, Admin).
- **Carga Rápida Demo:** Botones interactivos que cargan instantáneamente las credenciales para los tres perfiles demo preconfigurados (`Admin`, `Editor`, `Visor`).

#### 📊 2. Dashboard Ejecutivo de Inteligencia
- **KPIs Agregados:** Monitor de inversión total (millones USD) agregada por origen (público, privado, internacional) y balance de hectáreas intervenidas.
- **Gráficos Dinámicos:** Desglose porcentual interactivo mediante Recharts y listado de alertas de inconsistencias.

#### 🗺️ 3. Geovisor Territorial Avanzado (MapLibre GL JS)
- **Selector de Mapa Base:** Alternador rápido en panel lateral para conmutar entre mapa de calles clásico (OpenStreetMap) e imágenes de satélite de alta resolución (Esri World Imagery).
- **Control de Capas con Drag & Drop:** Panel interactivo que permite arrastrar y ordenar la lista de capas geográficas, reestructurando en tiempo real el apilamiento físico de las capas en el canvas del mapa (MapLibre GL).
- **Acordeón de Descripciones:** Panel de información (`ℹ️`) desplegable para cada capa con sus metadatos detallados (Origen de los datos, Año, Categoría y Explicación Técnica).
- **Streaming de Capas Pesadas (Lazy-Loading):** Consumo dinámico asíncrono desde el backend (utilizando `FileResponse` y simplificación espacial) para cargar datasets vectoriales pesados de forma diferida.
- **Soporte de 12 Capas Espaciales:**
  - **Límites Políticos:** Regiones, Provincias y Comunas oficiales de Chile.
  - **Capas Ecológicas y de Conservación:** Áreas Protegidas (MMA), Sitios Prioritarios, Espacios Costeros de Pueblos Originarios (ECMPO), Ecosistemas Terrestres.
  - **Actividades Productivas y Viveros:** Viveros Forestales (CONAF 2025 - 2,000 registros vectoriales), Viveros SAG (CIREN 2024 - 3,185 registros vectoriales), Plantaciones Forestales (INFOR 2022 - 146,566 registros vectoriales).
  - **Suelos y Recuperación:** Áreas Aptas para Recuperación de Suelos Degradados (SIRSD CIREN - Vectorial y WMS), Programas de Incentivos SIRSD (1,012 registros vectoriales de concursos 2024).
  - **Geoservicios WMS Activos:** Conexión directa a servidores oficiales de CIREN y CONAF (Suelos Agrológicos, Catastro Frutícola, Incendios Forestales, etc.).
- **Ficha Territorial Desacoplada:** Panel de detalles derecho que reconoce el tipo de objeto seleccionado (Comuna, Vivero SAG/CONAF, Proyecto o Suelo) y renderiza atributos específicos (ej. stock de plantas, registro SAG, acidez/pH de suelo, etc.).
- **Leyenda Interactiva de Conservación:** Muestra las categorías de conservación con colores específicos y permite filtrar dinámicamente los polígonos del mapa al hacer clic sobre ellas.

#### ⚙️ 4. Catálogo de Mecanismos Financieros
- **Fichas Técnicas:** Unificación y clasificación de los 10 mecanismos UTCUTS vigentes (Pago por Resultados REDD+, D.L. 701, etc.), detallando su madurez operativa, horizonte temporal, beneficiarios y grado de alineación con las metas NDC.

#### 🎯 5. Priorización Territorial Multicriterio Paramétrica
- **Escenarios Dinámicos:** Sliders interactivos para calibrar la importancia de 8 variables territoriales (Riesgo Climático ARClim, Biodiversidad, Brecha Financiera, Vulnerabilidad Social, etc.).
- **Motor de Normalización Adaptativa:** Algoritmo en backend que distribuye proporcionalmente el peso de las variables que carecen de datos en una comuna, previniendo puntuaciones sesgadas.

#### 📋 6. Monitoreo, Reporte y Verificación (MRV) y Calidad
- **Auditoría MRV:** Panel de contraste entre valores estimados de diseño y valores validados en campo por inspectores, calculando la tasa de certificación física y de carbono.
- **Auditoría Automática de Calidad:** Semáforo de severidad de brechas (Crítico, Alto, Medio) para identificar registros incompletos, sin geometría o con montos financieros nulos.

#### 📄 7. Simulador de Lector de Reportes A4 (PDF)
- **Previsualización de Impresión:** Emulación interactiva de hojas de formato A4 con membrete oficial del Gobierno de Chile y pie de página formal.
- **Controles de Lectura:** Herramientas de zoom (75%, 100%, 120%), modo de color de papel (claro/oscuro) para lectura nocturna, e impresión nativa del reporte.
- **Transparencia Metodológica:** El Reporte Nacional inyecta automáticamente la fórmula matemática de ponderación activa y los rangos de cálculo cualitativo del escenario actual.

---

### Stack Tecnológico

| Componente | Tecnología | Descripción |
|-----------|-----------|-------------|
| **Frontend** | React 18 + TypeScript + Vite | SPA de alto desempeño, estructurada por componentes tipados. |
| **Styling** | Tailwind CSS + CSS Vanilla | Interfaz en modo oscuro con micro-animaciones y glassmorphism. |
| **Backend** | Python 3.12 + FastAPI | API web asíncrona robusta con motor de priorización e endpoints de streaming. |
| **Base de Datos**| SQLite / PostgreSQL + PostGIS | Soporte relacional e indexación espacial avanzada. |
| **Mapas** | MapLibre GL JS | Renderizado vectorial de alto rendimiento por WebGL. |
| **Gráficos** | Recharts | Visualizaciones dinámicas y reactivas. |
| **Gestión** | Zustand | Manejo global del estado de la aplicación. |

---

### Inicio Rápido

#### Requisitos
- **Docker Desktop** iniciado (para Opción A) o **Python 3.12** + **Node.js** instalados (para Opción B).

#### Opción A: Despliegue con Docker Compose (Recomendado)
```bash
# 1. Copiar plantilla de variables de entorno
cp .env.example .env

# 2. Construir e iniciar contenedores (con base de datos PostGIS)
docker compose up --build

# 3. Acceso en el navegador:
# - Frontend: http://localhost:5173
# - Backend API (Docs): http://localhost:8000/docs
```

#### Opción B: Ejecución Local Nativa (Con base de datos SQLite)
```bash
# 1. Configurar base de datos SQLite en .env
DATABASE_URL=sqlite:///./sigutcuts.db

# 2. Iniciar Backend
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate en Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Iniciar Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

---

### Usuarios Demo para Acceso

Usa los botones de carga rápida de la pantalla de inicio de sesión o ingresa los siguientes datos:

| Perfil | Usuario | Contraseña | Nivel de Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `admin123` | Control total del sistema, ingesta de datos y CRUD de entidades. |
| **Editor** | `editor` | `editor123` | Permisos de lectura, edición y creación de proyectos/inversiones. |
| **Visor Público** | `viewer` | `viewer123` | Acceso de solo lectura para consulta cartográfica e informes. |

---

### Documentación Detallada del Sistema

- **Manual de Operación:** [Manual de Usuario y Guía de Operación](docs/MANUAL_USUARIO.md)
- **Tutorial Visual de la UI:** [Guía Visual de Interfaz Gráfica](docs/04_ui_tutorial.md)
- **Estructura Geoespacial:** [Guía de Datos Espaciales y ETL](docs/02_spatial_data_guide.md)
- **Modelo de Datos:** [Diccionario de Entidades y Atributos](docs/DATA_MODEL.md)
- **Plan de Arquitectura:** [Arquitectura de Software y Pipeline](docs/ARCHITECTURE.md)
- **Guía de Desarrollo Backend:** [README del Desarrollador](README_DEV.md)

---

*Desarrollado para GWP Chile y el Ministerio del Medio Ambiente.*
