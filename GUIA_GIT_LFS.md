# Guía Git LFS — Manejo de archivos grandes

Guía portable para versionar archivos grandes (GeoJSON, GeoTIFF, GeoPackages, ZIP, imágenes, etc.) en **cualquier repositorio** usando Git Large File Storage (LFS).

> **El problema que resuelve:** GitHub rechaza cualquier archivo de **más de 100 MB** (y advierte sobre los de más de 50 MB). Git LFS guarda en el repo solo un *puntero* de texto (~130 bytes) y sube el contenido real a un almacenamiento aparte. Así puedes versionar archivos enormes sin que el repositorio se vuelva pesado ni que GitHub los rechace.

---

## 0. Requisito previo: instalar Git LFS (una sola vez por computador)

```bash
# Verificar si ya está instalado
git lfs version          # ej: git-lfs/3.7.1 ...

# Si no está instalado:
#   Windows  -> viene con Git for Windows, o: winget install GitHub.GitLFS
#   macOS    -> brew install git-lfs
#   Linux    -> sudo apt install git-lfs   (o el gestor de tu distro)

# Activar el filtro LFS en tu usuario (una sola vez por máquina)
git lfs install
```

---

## 1. El archivo de configuración: `.gitattributes`

Todo LFS se controla desde **un solo archivo** en la raíz del repo: `.gitattributes`.
Cada línea declara *qué archivos* se manejan con LFS:

```
insumos/datos_geo/**/*.json filter=lfs diff=lfs merge=lfs -text
```

Cómo se lee:

```
insumos/datos_geo/**/*.json   filter=lfs diff=lfs merge=lfs   -text
└──── patrón (qué archivos) ──┘ └──── "manéjalos con LFS" ───┘ └ "no son texto"
```

- **Patrón** → qué archivos cubre (ver tabla de patrones abajo).
- **`filter=lfs diff=lfs merge=lfs`** → siempre igual; significa "guárdalo como puntero LFS".
- **`-text`** → trátalo como binario (no intentes normalizar saltos de línea).

### Patrones comunes

| Patrón | Cubre |
|--------|-------|
| `*.tif` | Todos los `.tif`/GeoTIFF, en cualquier carpeta del repo |
| `*.gpkg` | Todos los GeoPackages |
| `*.zip` | Todos los ZIP |
| `datos/*.json` | Los `.json` **directamente** dentro de `datos/` |
| `datos/**/*.json` | Los `.json` dentro de `datos/` **y sus subcarpetas** (`**` = cualquier nivel) |
| `datos/**` | **Todo** lo que haya dentro de `datos/`, sin importar la extensión |

---

## 2. Configurar LFS en un repositorio (paso a paso)

### Caso A — Repositorio nuevo, antes de agregar archivos grandes

```bash
# 1. Activar LFS en el repo (si no lo hiciste antes en esta máquina)
git lfs install

# 2. Declarar el patrón (esto crea/edita .gitattributes automáticamente)
git lfs track "*.tif"
git lfs track "datos_geo/**/*.json"

# 3. Versionar PRIMERO el .gitattributes
git add .gitattributes
git commit -m "chore: configurar Git LFS para archivos grandes"

# 4. Ahora sí agregar los archivos grandes
git add datos_geo/archivo_grande.json
git commit -m "data: agregar capa grande"

# 5. Subir
git push
```

### Caso B — Repositorio existente que YA tiene LFS configurado

Solo asegúrate de poner tus archivos en una ruta cubierta por un patrón existente.
Para ver qué rutas están cubiertas:

```bash
git lfs track          # lista los patrones del .gitattributes
```

Luego copia tu archivo a esa ruta, `git add`, `commit` y `push` normal.

---

## 3. ⚠️ Regla de oro (el error más común)

> **Primero configuras el patrón en `.gitattributes`. DESPUÉS agregas el archivo grande.**

Si haces `git add` del archivo grande **antes** de que su patrón esté en `.gitattributes`,
git lo guarda como blob normal y GitHub lo rechazará al hacer push (si supera 100 MB).

Síntoma típico del error:
```
remote: error: File X is 148.00 MB; this exceeds GitHub's file size limit of 100.00 MB
```

**Otro error frecuente:** poner el archivo en una carpeta **no cubierta** por ningún patrón.
El `.gitattributes` solo aplica a las rutas que coinciden con sus patrones; copiar un
archivo grande a otra carpeta (aunque exista en LFS en otro lado) hará que git intente
subir el contenido completo.

---

## 4. Verificación

Antes de hacer push, confirma que git tratará el archivo como LFS:

```bash
# ¿Este archivo irá por LFS?  -> debe responder "filter: lfs"
git check-attr filter -- ruta/al/archivo_grande.json

# Lista de archivos que REALMENTE están en LFS
git lfs ls-files

# Estado de archivos LFS pendientes
git lfs status
```

| Comando | Para qué sirve |
|---------|----------------|
| `git lfs track` | Ver los patrones configurados (lee `.gitattributes`) |
| `git lfs ls-files` | Ver qué archivos están efectivamente en LFS |
| `git check-attr filter -- <archivo>` | Confirmar si un archivo concreto irá por LFS |
| `git lfs status` | Estado de cambios LFS pendientes |
| `git lfs env` | Diagnóstico de configuración LFS |

---

## 5. Clonar / actualizar un repo con LFS

Quien clone el repo necesita LFS instalado para bajar el contenido real
(si no, solo obtiene los punteros de texto):

```bash
git lfs install          # una sola vez por máquina
git clone <url>          # baja los archivos LFS automáticamente
git lfs pull             # forzar descarga de los archivos LFS si faltan
```

---

## 6. Arreglar un archivo grande agregado por error (sin LFS)

Si ya hiciste commit de un archivo grande **sin** LFS y el push falla:

```bash
# 1. Configurar el patrón
git lfs track "*.json"
git add .gitattributes

# 2. Migrar el historial para que ese archivo pase a LFS
#    (reescribe commits; coordina con tu equipo antes de hacerlo)
git lfs migrate import --include="*.json" --include-ref=refs/heads/main

# 3. Subir (puede requerir --force porque se reescribió el historial)
git push --force
```

> `git lfs migrate import` **reescribe el historial**. En repos compartidos avisa al
> equipo antes; todos tendrán que volver a clonar o hacer un reset duro tras el push forzado.

---

## 7. Notas y límites

- **Cuotas de GitHub LFS:** el plan gratuito incluye **1 GB de almacenamiento** y **1 GB de
  ancho de banda al mes**. Archivos muy grandes o muy descargados pueden agotarla; revisa
  los planes de datos de GitHub si manejas muchos GB.
- LFS guarda **cada versión** del archivo grande. Si reemplazas un GeoJSON de 100 MB diez
  veces, ocupas ~1 GB de cuota aunque en disco solo veas un archivo.
- Para datasets que cambian muy seguido o que son enormes (varios GB), evalúa **no
  versionarlos** y servirlos desde una base de datos / almacenamiento externo (S3, etc.),
  cargándolos vía API.

---

## Resumen en 3 pasos

1. **`git lfs track "patrón"`** → declara qué archivos van por LFS (escribe en `.gitattributes`).
2. **`git add .gitattributes`** y commitéalo **antes** que los archivos grandes.
3. **`git add archivo` → `commit` → `push`**. Verifica con `git check-attr filter -- archivo` (debe decir `filter: lfs`).
