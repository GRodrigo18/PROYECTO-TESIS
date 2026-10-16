"""
Predicción con el modelo entrenado (resultados/modelo_rf.joblib).

Lo usa el simulador del dashboard (server.ts -> POST /api/predecir), pero también
sirve desde la terminal. Lee JSON por stdin y escribe JSON por stdout.

  echo '{"info": true}' | python src/predecir.py --modelo resultados/modelo_rf.joblib
  echo '{"registros": [{"grado": 3, "sede": "Central", "sexo": "Femenino",
          "notas": {"Matematica": {"B1": 12, "B2": "B"}, ...}}]}' | python src/predecir.py

Las notas se estandarizan con la misma función del pipeline (0-20 o AD/A/B/C).
Si falta una nota o no es válida, ese registro no se predice: se devuelve el motivo.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pipeline_rf_tesis import BIMESTRES_TEMPRANOS, construir_variables, estandarizar_nota  # noqa: E402


def predecir(paquete: dict, registros: list[dict]) -> list[dict]:
    modelo, umbral, cursos = paquete["modelo"], paquete["umbral"], paquete["cursos"]
    salida, filas, idx_validos = [], [], []
    for i, r in enumerate(registros):
        fila, errores = {"grado": pd.to_numeric(r.get("grado"), errors="coerce"),
                         "sede": r.get("sede"), "sexo": r.get("sexo") or "No registrado"}, []
        if pd.isna(fila["grado"]):
            errores.append("grado_invalido")
        if fila["sede"] not in paquete["sedes"]:
            errores.append("sede_invalida")
        notas = r.get("notas") or {}
        for c in cursos:
            for e in BIMESTRES_TEMPRANOS:
                # escala_literal=False: en el simulador un número se interpreta siempre como nota vigesimal
                v, err = estandarizar_nota((notas.get(c) or {}).get(e), False)
                fila[f"{c}_{e}"] = v
                if err:
                    errores.append(f"{c}_{e}:{err}")
        if errores:
            salida.append({"ok": False, "errores": errores})
        else:
            salida.append(None)
            filas.append(fila)
            idx_validos.append(i)
    if filas:
        X, _ = construir_variables(pd.DataFrame(filas), cursos, tuple(paquete.get("cursos_extra", [])),
                                   paquete.get("extra_en_x", True))
        X = X[paquete["columnas"]]
        proba = modelo.predict_proba(X)[:, 1]
        Z = modelo.named_steps["pre"].transform(X)
        arboles = modelo.named_steps["rf"].estimators_
        votos = np.sum([t.predict(Z) == 1 for t in arboles], axis=0)
        for k, i in enumerate(idx_validos):
            salida[i] = {"ok": True, "probabilidad_riesgo": round(float(proba[k]), 4),
                         "alerta_riesgo": int(proba[k] >= umbral),
                         "votos_arboles_riesgo": int(votos[k]), "total_arboles": len(arboles),
                         "variables": {c: (None if pd.isna(v) else v) for c, v in X.iloc[k].items()}}
    return salida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--modelo", type=Path, default=Path(__file__).resolve().parents[1] / "resultados" / "modelo_rf.joblib")
    a = ap.parse_args()
    if not a.modelo.exists():
        print(json.dumps({"error": f"No existe {a.modelo}. Ejecuta primero pipeline_rf_tesis.py."}, ensure_ascii=False))
        sys.exit(1)
    paquete = joblib.load(a.modelo)
    entrada = json.load(sys.stdin)
    if entrada.get("info"):
        res = {"cursos": paquete["cursos"], "sedes": paquete["sedes"], "umbral": round(float(paquete["umbral"]), 4),
               "criterio_umbral": paquete.get("criterio_umbral"),
               "total_arboles": len(paquete["modelo"].named_steps["rf"].estimators_)}
    else:
        res = {"umbral": round(float(paquete["umbral"]), 4), "resultados": predecir(paquete, entrada.get("registros", []))}
    print(json.dumps(res, ensure_ascii=False, default=lambda o: o.item() if hasattr(o, "item") else str(o)))


if __name__ == "__main__":
    main()
