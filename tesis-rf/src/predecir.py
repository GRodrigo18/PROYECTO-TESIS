"""
Predicción con el modelo entrenado (resultados/modelo_rf.joblib).

Lo usa el simulador del dashboard (server.ts -> POST /api/predecir), pero también
sirve desde la terminal. Lee JSON por stdin y escribe JSON por stdout.

  echo '{"info": true}' | python src/predecir.py --modelo resultados/modelo_rf.joblib
  echo '{"registros": [{"grado": 3, "sede": "Central", "sexo": "Femenino",
          "notas": {"Matematica": {"B1": 12, "B2": "B"}, ...}}]}' | python src/predecir.py

Con --servidor queda abierto: lee una petición JSON por línea y responde una línea JSON por
petición (server.ts lo usa así para no cargar el modelo en cada predicción).

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


GRADOS_VALIDOS = {1, 2, 3, 4, 5}


def predecir(paquete: dict, registros: list[dict]) -> list[dict]:
    modelo, umbral, cursos = paquete["modelo"], paquete["umbral"], paquete["cursos"]
    salida, filas, idx_validos = [], [], []
    for i, r in enumerate(registros):
        fila, errores = {"grado": pd.to_numeric(r.get("grado"), errors="coerce"),
                         "sede": r.get("sede"), "sexo": r.get("sexo") or "No registrado"}, []
        # Solo secundaria (1.º a 5.º): fuera de ese rango el modelo no tiene datos con qué decidir
        if pd.isna(fila["grado"]) or fila["grado"] not in GRADOS_VALIDOS:
            errores.append("grado_invalido(1-5)")
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
        X, _ = construir_variables(pd.DataFrame(filas), cursos)
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


def responder(paquete: dict, entrada: dict) -> dict:
    if entrada.get("info"):
        return {"cursos": paquete["cursos"], "sedes": paquete["sedes"], "umbral": round(float(paquete["umbral"]), 4),
                "criterio_umbral": paquete.get("criterio_umbral"),
                "total_arboles": len(paquete["modelo"].named_steps["rf"].estimators_)}
    return {"umbral": round(float(paquete["umbral"]), 4), "resultados": predecir(paquete, entrada.get("registros", []))}


def a_json(res: dict) -> str:
    return json.dumps(res, ensure_ascii=False, default=lambda o: o.item() if hasattr(o, "item") else str(o))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--modelo", type=Path, default=Path(__file__).resolve().parents[1] / "resultados" / "modelo_rf.joblib")
    ap.add_argument("--servidor", action="store_true", help="una petición JSON por línea de stdin")
    a = ap.parse_args()
    if not a.modelo.exists():
        print(json.dumps({"error": f"No existe {a.modelo}. Ejecuta primero pipeline_rf_tesis.py."}, ensure_ascii=False))
        sys.exit(1)
    paquete = joblib.load(a.modelo)
    if not a.servidor:
        print(a_json(responder(paquete, json.load(sys.stdin))))
        return
    for linea in sys.stdin:
        if not linea.strip():
            continue
        try:
            res = responder(paquete, json.loads(linea))
        except Exception as e:  # una petición mala no tumba el proceso
            res = {"error": f"{type(e).__name__}: {e}"}
        sys.stdout.write(a_json(res) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
