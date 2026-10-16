"""
Consolida los Excel en bruto del sistema académico en el formato del pipeline.

Estructura de entrada (una carpeta por año):
  <AÑO>/Consolidado_Notas_Curso/<SEDE>/<g> SECUNDARIA_<n>.xlsx
      fila 7 = áreas/cursos (celdas combinadas), fila 8 = '#', 'Estudiante', 1, 2, 3, 4, PF, ...
      El nombre viene abreviado: "Apellido1 I. Nombres".
  <AÑO>/Consolidado_Datos_Estudiante/<SEDE>/[SECUNDARIA/]<g> SECUNDARIA_<n>.xlsx
      Nombre completo "APELLIDO1 APELLIDO2, NOMBRES", DNI, sexo, sede, grado, sección.

Salida: una fila por estudiante-año con
  ID_Estudiante, Sexo, Sede, Grado, Seccion, Año_Academico,
  <Curso>_B1, <Curso>_B2, <Curso>_B3, <Curso>_B4, <Curso>_Final   (Final = PF)

Reglas:
  - No limpia ni corrige notas: copia el valor tal cual. La validación (guiones, vacíos,
    rangos) la hace auditar_excel.py / pipeline_rf_tesis.py, con su log de exclusiones.
  - El DNI no sale del script: ID_Estudiante = HMAC-SHA256(clave, DNI), estable entre años
    mientras se use la misma clave (tesis-rf/data/clave_id.txt, fuera de git).
  - Reglas de exclusión de la consolidación (cada una se cuenta en <salida>_flujo.json):
      C1 sección de notas copiada de otra sede -> se descarta la copia;
      C2 alumno con notas pero sin ficha (o con emparejamiento ambiguo) -> excluido;
      C3 ficha sin notas -> no hay registro académico que consolidar (se cuenta, no entra).
  - Todo emparejamiento dudoso (sin coincidencia, ambiguo, sede o grado distintos) se anota.

Uso:
  python src/consolidar_notas.py --anio-dir data/bruto/2020 --salida data/notas_2020.xlsx
  python src/consolidar_notas.py --anio-dir data/bruto/2020 data/bruto/2021 --salida data/notas.xlsx
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import re
import secrets
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl
import pandas as pd

# Áreas oficiales MINEDU que entran al modelo (columna del Excel -> nombre de curso en la salida)
AREAS = {
    "COMUNICACIÓN": "Comunicacion",
    "INGLÉS": "Ingles",
    "MATEMÁTICA": "Matematica",
    "CIENCIA Y TECNOLOGÍA": "Ciencia y Tecnologia",
    "CIENCIAS SOCIALES": "Ciencias Sociales",
}
ETAPAS = ["B1", "B2", "B3", "B4", "Final"]  # columnas 1, 2, 3, 4, PF del Excel
# Sede por palabra clave: los nombres de carpeta traen variantes ("HUAHURUA", "INDUSTRIIAL", "ASECENSION")
SEDES = [
    (r"HUA", "Avantgard Huaura"), (r"LIMA", "Avantgard Lima"), (r"CENTRAL", "Central"),
    (r"IN\w?DUS", "Industrial"), (r"AS[CE]+N", "La Ascensión"),
]


def norm(s) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().upper()


def sede_de(texto: str) -> str | None:
    t = norm(texto)
    hits = {sede for patron, sede in SEDES if re.search(patron, t)}
    return hits.pop() if len(hits) == 1 else None


def grado_de(texto) -> int | None:
    m = re.match(r"\s*(\d)", str(texto))
    return int(m.group(1)) if m else None


def clave_nombre_completo(full: str):
    """'AZUCENA QUISPE, JESENYA MARIA' -> ('AZUCENA', 'Q', 'JESENYA')"""
    ap, _, no = str(full).partition(",")
    aps, nos = norm(ap).split(), norm(no).split()
    return (aps[0] if aps else "", aps[1][0] if len(aps) > 1 else "", nos[0] if nos else "")


def clave_nombre_abreviado(abbr: str):
    """'Azucena Q. Jesenya' -> ('AZUCENA', 'Q', 'JESENYA'); 'Tolstova .. María' -> ('TOLSTOVA', '', 'MARIA')"""
    m = re.match(r"^(.+?)\s+([^\s.]?)\.+\s*(.+)$", str(abbr).strip())
    if not m:
        return None
    return (norm(m.group(1)), norm(m.group(2)), norm(m.group(3)).split()[0])


def fila_encabezado(ws, marca="#", max_fila=20) -> int:
    for r in range(1, max_fila):
        if str(ws.cell(r, 1).value).strip() in {marca, "N°", "Nº"}:
            return r
    raise ValueError("No se encontró la fila de encabezado ('#').")


def leer_datos_estudiante(anio_dir: Path, log: list):
    """{(sede, grado): [fichas]} solo de secundaria."""
    fichas = defaultdict(list)
    for f in sorted((anio_dir / "Consolidado_Datos_Estudiante").rglob("*.xlsx")):
        if "PRIMARIA" in norm(f.name):  # por nombre de archivo: en 2026 SECUNDARIA/ está dentro de PRIMARIA/
            continue
        ws = openpyxl.load_workbook(f, read_only=True, data_only=True).active
        filas = list(ws.iter_rows(values_only=True))
        hr = next(i for i, r in enumerate(filas) if r and str(r[0]).strip() == "#")
        cab = [str(c).strip() if c is not None else "" for c in filas[hr]]
        # Las columnas del estudiante son las primeras con estos nombres (después vienen las de padres)
        idx = {k: cab.index(k) for k in ("Estudiante", "Sede", "Sexo", "Nro. doc.", "Nivel", "Grado", "Sección")}
        for r in filas[hr + 1:]:
            if not r or not r[idx["Estudiante"]]:
                continue
            if norm(r[idx["Nivel"]]) != "SECUNDARIA":
                log.append({"tipo": "ficha_no_secundaria", "archivo": str(f.relative_to(anio_dir)), "detalle": r[idx["Estudiante"]]})
                continue
            sede = sede_de(r[idx["Sede"]]) or sede_de(f.parent.name)
            fichas[(sede, grado_de(r[idx["Grado"]]))].append({
                "nombre": r[idx["Estudiante"]], "dni": str(r[idx["Nro. doc."]] or "").strip(),
                "sexo": r[idx["Sexo"]], "seccion": r[idx["Sección"]], "clave": clave_nombre_completo(r[idx["Estudiante"]]),
                "archivo": str(f.relative_to(anio_dir)), "usada": False,
            })
    return fichas


def leer_notas(f: Path, anio_dir: Path, log: list):
    ws = openpyxl.load_workbook(f, data_only=True).active
    hr = fila_encabezado(ws)
    cursos = [c.value for c in ws[hr - 1]]
    sub = [str(c.value).strip() if c.value is not None else "" for c in ws[hr]]
    pos = defaultdict(list)
    for i, c in enumerate(cursos):
        if c is not None and str(c).strip() in AREAS:
            pos[str(c).strip()].append(i)
    rel = str(f.relative_to(anio_dir))
    for area in AREAS:
        if area not in pos:
            # Sin la columna oficial: se aceptan variantes del mismo nombre ("Ciencias Sociales",
            # "MATEMÁTICA-SINGAPUR"). Si hay varias, solo se usan si sus notas son idénticas (abajo).
            base = norm(area)
            alias = [i for i, c in enumerate(cursos)
                     if c is not None and norm(c).rstrip(".") in {base, base + "-SINGAPUR"}]
            if alias:
                pos[area] = alias
                log.append({"tipo": "area_por_nombre_alternativo", "archivo": rel,
                            "detalle": f"{area} <- {[cursos[i] for i in alias]}"})
            else:
                log.append({"tipo": "area_ausente", "archivo": rel, "detalle": area})
        for i in pos[area]:
            if sub[i:i + 5] != ["1", "2", "3", "4", "PF"]:
                raise ValueError(f"{rel}: columnas inesperadas bajo {area}: {sub[i:i + 5]}")
    alumnos = []
    for r in ws.iter_rows(min_row=hr + 1, values_only=True):
        if not r[1] or not str(r[1]).strip():
            continue
        notas = {}
        for area, cols in pos.items():
            bloques = [tuple(r[i:i + 5]) for i in cols]
            if len(set(bloques)) > 1:
                log.append({"tipo": "area_duplicada_distinta_se_usa_la_ultima", "archivo": rel,
                            "detalle": f"{r[1]} / {area}: {bloques}"})
            elif len(cols) > 1:
                log.append({"tipo": "area_duplicada_identica", "archivo": rel, "detalle": f"{r[1]} / {area}"})
            # El área cierra su grupo: va después de sus sub-cursos (Aritmética … HABILIDAD LÓGICA,
            # MATEMÁTICA). Si un sub-curso viene rotulado igual que el área (La Ascensión 3º 2025),
            # la columna del área es la última.
            bloque = bloques[-1]
            for etapa, v in zip(ETAPAS, bloque):
                notas[f"{AREAS[area]}_{etapa}"] = v
        alumnos.append({"nombre": r[1], **notas})
    return alumnos


def obtener_clave(ruta: Path) -> bytes:
    if ruta.exists():
        return ruta.read_text(encoding="utf-8").strip().encode()
    ruta.parent.mkdir(parents=True, exist_ok=True)
    clave = secrets.token_hex(32)
    ruta.write_text(clave + "\n", encoding="utf-8")
    print(f"Se creó una clave nueva en {ruta}. Guárdala: con otra clave los ID de otros años no coincidirán.")
    return clave.encode()


def seudonimo(clave: bytes, texto: str, prefijo="E") -> str:
    return prefijo + hmac.new(clave, texto.encode(), hashlib.sha256).hexdigest()[:12].upper()


def buscar_ficha(fichas, sede, grado, nombre, archivo_notas: str | None = None):
    k = clave_nombre_abreviado(nombre)
    cands = [d for d in fichas[(sede, grado)] if k and d["clave"] == k]
    if k and not cands:  # apellido compuesto: "De la Cruz" vs "DE"
        cands = [d for d in fichas[(sede, grado)] if d["clave"][2] == k[2] and k[0].startswith(d["clave"][0])]
    if len(cands) > 1 and archivo_notas:
        # Desempate (p. ej. gemelos "Flores P. Maria"): la ficha del archivo de la misma sección
        misma = [d for d in cands if norm(Path(d["archivo"]).name) == norm(Path(archivo_notas).name)]
        if len(misma) == 1:
            return misma
    return cands


def descartar_copias(archivos: list[dict], fichas, anio_dir: Path, log: list) -> list[dict]:
    """
    Una sección copiada en la carpeta de otra sede (mismos alumnos, mismas notas) se conserva solo
    donde los alumnos tienen ficha en esa sede. Si no se puede decidir, se descartan todas las copias.
    """
    grupos = defaultdict(list)
    for a in archivos:
        grupos[tuple(sorted(tuple(map(str, al.values())) for al in a["alumnos"]))].append(a)
    descartar = set()
    for copias in grupos.values():
        if len({c["sede"] for c in copias}) < 2:
            continue
        def tasa(c):
            return sum(len(buscar_ficha(fichas, c["sede"], c["grado"], al["nombre"])) == 1
                       for al in c["alumnos"]) / max(len(c["alumnos"]), 1)
        buenas = [c for c in copias if tasa(c) >= 0.5]
        conservar = buenas[0]["rel"] if len(buenas) == 1 else None
        for c in copias:
            if c["rel"] != conservar:
                descartar.add(c["rel"])
                log.append({"tipo": "seccion_copiada_descartada", "archivo": c["rel"],
                            "detalle": f"idéntica a {[o['rel'] for o in copias if o is not c]}; se conserva: {conservar}"})
    return [a for a in archivos if a["rel"] not in descartar]


def consolidar_anio(anio_dir: Path, anio: int, clave: bytes, log: list, flujos: dict) -> list[dict]:
    fichas = leer_datos_estudiante(anio_dir, log)
    archivos = []
    for f in sorted((anio_dir / "Consolidado_Notas_Curso").rglob("*.xlsx")):
        rel = str(f.relative_to(anio_dir))
        sede, grado = sede_de(f.parent.name), grado_de(f.name)
        if sede is None or grado is None:
            log.append({"tipo": "archivo_sin_sede_o_grado", "archivo": rel, "detalle": ""})
            continue
        archivos.append({"rel": rel, "sede": sede, "grado": grado, "alumnos": leer_notas(f, anio_dir, log)})
    flujo = Counter()
    flujo["fichas_secundaria"] = sum(len(v) for v in fichas.values())
    flujo["filas_notas_en_bruto"] = sum(len(a["alumnos"]) for a in archivos)
    validos_archivos = descartar_copias(archivos, fichas, anio_dir, log)
    flujo["C1_seccion_copiada_de_otra_sede"] = flujo["filas_notas_en_bruto"] - sum(len(a["alumnos"]) for a in validos_archivos)
    filas = []
    for arch in validos_archivos:
        rel, sede, grado = arch["rel"], arch["sede"], arch["grado"]
        for al in arch["alumnos"]:
            cands = buscar_ficha(fichas, sede, grado, al["nombre"], rel)
            ficha = cands[0] if len(cands) == 1 else None
            if len(cands) > 1:
                log.append({"tipo": "emparejamiento_ambiguo", "archivo": rel, "detalle": f"{al['nombre']} -> {[c['nombre'] for c in cands]}"})
            elif not cands:
                log.append({"tipo": "sin_ficha_de_datos", "archivo": rel, "detalle": al["nombre"]})
            if not ficha:
                flujo["C2_sin_ficha_de_datos"] += 1  # sin sexo ni ID estable: se excluye
                continue
            if ficha["usada"]:
                log.append({"tipo": "ficha_usada_dos_veces", "archivo": rel, "detalle": al["nombre"]})
            ficha["usada"] = True
            id_est = (seudonimo(clave, ficha["dni"]) if ficha["dni"] and ficha["dni"] != "-"
                      else seudonimo(clave, f"{anio}|{rel}|{norm(al['nombre'])}", "SINDNI-"))
            notas = {k2: v for k2, v in al.items() if k2 != "nombre"}
            filas.append({"ID_Estudiante": id_est, "Sexo": ficha["sexo"] if ficha else None, "Sede": sede,
                          "Grado": grado, "Seccion": ficha["seccion"] if ficha else None,
                          "Año_Academico": anio, **notas})
    for lista in fichas.values():
        for d in lista:
            if not d["usada"]:
                flujo["C3_ficha_sin_notas"] += 1
                log.append({"tipo": "ficha_sin_notas", "archivo": d["archivo"], "detalle": d["nombre"]})
    flujo["consolidados"] = len(filas)
    flujos[anio] = dict(flujo)
    return filas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--anio-dir", type=Path, nargs="+", required=True, help="carpetas <AÑO> en bruto")
    ap.add_argument("--salida", type=Path, required=True)
    ap.add_argument("--clave", type=Path, default=Path(__file__).resolve().parents[1] / "data" / "clave_id.txt")
    a = ap.parse_args()
    clave = obtener_clave(a.clave)
    filas, log, flujos = [], [], {}
    for d in a.anio_dir:
        anio = int(re.search(r"(20\d\d)", d.name).group(1))
        filas += consolidar_anio(d, anio, clave, log, flujos)
    df = pd.DataFrame(filas)
    a.salida.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(a.salida, index=False)
    lg = pd.DataFrame(log, columns=["tipo", "archivo", "detalle"])
    ruta_log = a.salida.with_name(a.salida.stem + "_log_consolidacion.csv")
    lg.to_csv(ruta_log, index=False, encoding="utf-8-sig")
    a.salida.with_name(a.salida.stem + "_flujo.json").write_text(
        json.dumps(flujos, ensure_ascii=False, indent=2), encoding="utf-8")
    resumen = {
        "estudiantes": int(len(df)),
        "por_anio_sede_grado": {f"{k[0]}|{k[1]}|{k[2]}": int(v) for k, v in
                                df.groupby(["Año_Academico", "Sede", "Grado"]).size().items()},
        "sin_ficha_de_datos": int(df["ID_Estudiante"].str.startswith("SINDNI-").sum()),
        "ids_repetidos_en_un_anio": int(df.duplicated(["ID_Estudiante", "Año_Academico"]).sum()),
        "eventos_log": dict(Counter(lg["tipo"])),
    }
    print(json.dumps(resumen, ensure_ascii=False, indent=2))
    print(f"Salida: {a.salida}\nLog: {ruta_log}")


if __name__ == "__main__":
    main()
