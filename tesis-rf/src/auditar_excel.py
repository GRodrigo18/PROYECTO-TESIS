"""
Diagnóstico y validación de un Excel de notas, en el formato que tenga hoy.

Funciona con el formato actual del dashboard (una nota por curso: columnas
"Curso_Matemática", "Curso_Ingles", ...) y con el formato por bimestre
("Matematica_B1", "Matematica_B2", ..., "Matematica_Final").

No entrena nada. Produce:
  - salida/perfil_dataset.json    : estructura, años, sedes, escalas, conteos
  - salida/registros_excluidos.csv : fila por fila, con el motivo real de exclusión
  - salida/dataset_validado.csv   : solo registros válidos, notas estandarizadas 0-3
  - salida/valores_a_revisar.csv  : valores sospechosos para revisar en las actas

Uso:
  python src/auditar_excel.py --datos data/notas.xlsx --salida salida/
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

SEDES_VALIDAS = ["Central", "La Ascensión", "Avantgard Lima", "Industrial", "Avantgard Huaura"]
ANIOS_VALIDOS = range(2020, 2027)
LITERALES = {"AD": 3, "A": 2, "B": 1, "C": 0}
VACIOS = {"", "-", "--", "—", "NA", "N/A", "NAN", "NONE", "S/N", "EXO", "EXONERADO"}


def norm(s) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip()


def buscar_columna(cols, *candidatos):
    mapa = {norm(c).upper().replace(" ", "_"): c for c in cols}
    for c in candidatos:
        if c in mapa:
            return mapa[c]
    return None


def detectar_cursos(cols):
    """Devuelve {curso: {etapa: columna}}; etapa = UNICA, B1..B4 o FINAL."""
    cursos = {}
    for c in cols:
        n = norm(c)
        m = re.match(r"^(?:Curso_)?(.+?)_(B[1-4]|Final|FINAL)$", n, re.I)
        if m:
            cursos.setdefault(m.group(1).strip(), {})[m.group(2).upper()] = c
        elif n.upper().startswith("CURSO_") and "PROMEDIO" not in n.upper():
            cursos.setdefault(n[6:].strip(), {})["UNICA"] = c
    return cursos


def estandarizar(valor, escala_literal: bool):
    if valor is None or (isinstance(valor, float) and np.isnan(valor)):
        return np.nan, "nulo"
    t = str(valor).strip().upper()
    if t in VACIOS:
        return np.nan, "guion_o_vacio"
    if t in LITERALES:
        return LITERALES[t], None
    try:
        n = float(t.replace(",", "."))
    except ValueError:
        return np.nan, f"token_invalido({t})"
    if not 0 <= n <= 20:
        return np.nan, "fuera_de_rango_0_20"
    if escala_literal and n <= 3:
        return np.nan, "numero_0_3_en_anio_con_escala_literal"
    return (3 if n >= 18 else 2 if n >= 14 else 1 if n >= 11 else 0), None


def main(ruta: Path, salida: Path):
    salida.mkdir(parents=True, exist_ok=True)
    hojas = pd.read_excel(ruta, sheet_name=None, dtype=object) if ruta.suffix.lower() in {".xlsx", ".xls"} \
        else {"csv": pd.read_csv(ruta, dtype=object)}
    nombre_hoja, df = max(hojas.items(), key=lambda kv: len(kv[1]))
    cols = list(df.columns)

    c_id = buscar_columna(cols, "ID_ESTUDIANTE", "CODIGO", "ID")
    c_sexo = buscar_columna(cols, "SEXO", "GENERO", "SEXO_BINARIO")
    c_sede = buscar_columna(cols, "SEDE", "CAMPUS", "LOCAL", "FILIAL")
    c_anio = buscar_columna(cols, "ANO_ACADEMICO", "ANIO_ACADEMICO", "ANO", "ANIO", "YEAR")
    c_grado = buscar_columna(cols, "GRADO")
    cursos = detectar_cursos(cols)
    etapas = sorted({e for d in cursos.values() for e in d})
    formato = "por_bimestre" if {"B1", "B2"} <= set(etapas) else "una_nota_por_curso"
    col_notas = [col for d in cursos.values() for col in d.values()]

    anios = pd.to_numeric(df[c_anio], errors="coerce") if c_anio else pd.Series(np.nan, index=df.index)
    escala_literal = {}
    for a, g in df.groupby(anios):
        v = g[col_notas].astype(str).stack().str.strip().str.upper()
        escala_literal[int(a)] = bool(v.isin(LITERALES).mean() > 0.5)

    excluidos, revisar, validos = [], [], []
    vistos = set()
    sedes_ok = {norm(s).upper(): s for s in SEDES_VALIDAS}
    for i, r in df.iterrows():
        motivos = []
        anio = anios.loc[i]
        if pd.isna(anio) or int(anio) not in ANIOS_VALIDOS:
            motivos.append("anio_invalido")
        sede_raw = norm(r[c_sede]) if c_sede and pd.notna(r[c_sede]) else ""
        sede = sedes_ok.get(sede_raw.upper().replace("SEDE ", ""))
        if not sede:
            motivos.append("sede_invalida_o_vacia")
        id_est = str(r[c_id]).strip() if c_id and pd.notna(r[c_id]) else ""
        if not id_est:
            motivos.append("sin_id")
        elif (id_est, anio) in vistos:
            motivos.append("duplicado_id_anio")
        vistos.add((id_est, anio))

        sexo_raw = str(r[c_sexo]).strip().upper() if c_sexo and pd.notna(r[c_sexo]) else ""
        sexo = ("Femenino" if sexo_raw.startswith(("F", "MUJ")) else
                "Masculino" if sexo_raw.startswith(("M", "H", "VAR")) else "No registrado")

        fila = {"fila_excel": i + 2, "ID_Estudiante": id_est, "anio": anio, "sede": sede, "sexo": sexo,
                "grado": r[c_grado] if c_grado else None}
        lit = escala_literal.get(int(anio), True) if pd.notna(anio) else True
        for cur, d in cursos.items():
            for etapa, col in d.items():
                if anio == 2026 and etapa in {"B3", "B4", "FINAL"}:
                    continue  # 2026 aún no tiene cierre
                v, err = estandarizar(r[col], lit)
                fila[f"{cur}_{etapa}"] = v
                if err:
                    motivos.append(f"{cur}_{etapa}:{err}")
                    revisar.append({"fila_excel": i + 2, "ID_Estudiante": id_est, "anio": anio, "sede": sede_raw,
                                    "columna": col, "valor_original": r[col], "problema": err})
        if motivos:
            excluidos.append({"fila_excel": i + 2, "ID_Estudiante": id_est, "anio": anio,
                              "sede": sede_raw or "(vacía)", "motivos": " | ".join(motivos)})
        else:
            validos.append(fila)

    ex = pd.DataFrame(excluidos, columns=["fila_excel", "ID_Estudiante", "anio", "sede", "motivos"])
    va = pd.DataFrame(validos)
    rv = pd.DataFrame(revisar)
    ex.to_csv(salida / "registros_excluidos.csv", index=False, encoding="utf-8-sig")
    va.to_csv(salida / "dataset_validado.csv", index=False, encoding="utf-8-sig")
    rv.to_csv(salida / "valores_a_revisar.csv", index=False, encoding="utf-8-sig")

    motivo_simple = (ex["motivos"].str.split(" | ", regex=False).explode()
                     .str.replace(r"^[^:]*:", "", regex=True)) if len(ex) else pd.Series(dtype=str)
    perfil = {
        "archivo": str(ruta), "hoja_usada": nombre_hoja, "hojas": {k: len(v) for k, v in hojas.items()},
        "formato_detectado": formato,
        "advertencia_fuga": None if formato == "por_bimestre" else (
            "Una sola nota por curso: si la etiqueta 'riesgo' se calcula con esas mismas notas, "
            "el modelo tiene fuga de información. Se necesitan notas por bimestre (B1, B2 y Final)."),
        "columnas_identificadas": {"id": c_id, "sexo": c_sexo, "sede": c_sede, "anio": c_anio, "grado": c_grado},
        "cursos": {k: list(v) for k, v in cursos.items()},
        "total_bruto": len(df), "total_validos": len(va), "total_excluidos": len(ex),
        "porcentaje_excluidos": round(100 * len(ex) / max(len(df), 1), 2),
        "motivos_exclusion": motivo_simple.value_counts().to_dict(),
        "excluidos_por_sede": ex["sede"].value_counts().to_dict() if len(ex) else {},
        "excluidos_por_anio": {int(k): int(v) for k, v in ex["anio"].value_counts().sort_index().items()
                               if pd.notna(k)} if len(ex) else {},
        "validos_por_anio": {int(k): int(v) for k, v in va["anio"].value_counts().sort_index().items()} if len(va) else {},
        "validos_por_sede": va["sede"].value_counts().to_dict() if len(va) else {},
        "sexo_no_registrado": int((va["sexo"] == "No registrado").sum()) if len(va) else 0,
        "escala_literal_por_anio": escala_literal,
    }
    (salida / "perfil_dataset.json").write_text(json.dumps(perfil, ensure_ascii=False, indent=2, default=str),
                                               encoding="utf-8")
    print(json.dumps(perfil, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", type=Path, required=True)
    ap.add_argument("--salida", type=Path, default=Path("salida"))
    a = ap.parse_args()
    main(a.datos, a.salida)
