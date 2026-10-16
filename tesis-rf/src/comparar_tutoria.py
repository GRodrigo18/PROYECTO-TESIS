"""
Análisis complementario: ¿aporta la nota de Tutoría (B1-B2) como indicador de comportamiento?

Compara dos modelos entrenados con el mismo pipeline, los mismos hiperparámetros candidatos y
los MISMOS estudiantes (los que tienen Tutoría B1-B2 válida):
  sin_tutoria : variables del modelo principal
  con_tutoria : las mismas + Tutoría B1, B2 y tendencia
La etiqueta es la misma en ambos (alguna de las 5 áreas con PF en C): Tutoría no entra en ella,
así que las hipótesis H1-H3 se contrastan igual que en el modelo principal.

Uso:
  python src/comparar_tutoria.py --dir resultados_complementario_tutoria
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, roc_auc_score

from informe_tesis import contraste, metricas_aula

SEED = 42


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", type=Path, required=True)
    a = ap.parse_args()
    inf = {m: json.loads((a.dir / m / "informe_metricas.json").read_text(encoding="utf-8"))
           for m in ("sin_tutoria", "con_tutoria")}
    pr = {m: pd.read_csv(a.dir / m / "predicciones_prueba.csv") for m in inf}
    s, c = pr["sin_tutoria"], pr["con_tutoria"]
    assert (s["ID_Estudiante"].values == c["ID_Estudiante"].values).all(), "Los conjuntos de prueba no coinciden"
    y = s["y_real"].values

    # Métricas lado a lado
    claves = {"sensibilidad_recall": "Sensibilidad", "precision": "Precisión", "f1": "F1-Score",
              "especificidad": "Especificidad", "roc_auc": "ROC-AUC", "pr_auc": "PR-AUC", "mcc": "MCC"}
    filas = []
    for k, nombre in claves.items():
        fila = {"Métrica": nombre}
        for m in inf:
            fila[f"{m} (umbral elegido)"] = round(inf[m]["test"]["umbral_optimo"][k], 4)
            fila[f"{m} (umbral 0.5)"] = round(inf[m]["test"]["umbral_0.5"][k], 4)
        filas.append(fila)
    t_met = pd.DataFrame(filas)

    # Diferencia pareada (mismos estudiantes) con bootstrap
    rng = np.random.default_rng(SEED)
    d_pr, d_roc = [], []
    for _ in range(2000):
        i = rng.integers(0, len(y), len(y))
        if y[i].sum() in (0, len(i)):
            continue
        d_pr.append(average_precision_score(y[i], c["proba_rf"].values[i]) - average_precision_score(y[i], s["proba_rf"].values[i]))
        d_roc.append(roc_auc_score(y[i], c["proba_rf"].values[i]) - roc_auc_score(y[i], s["proba_rf"].values[i]))
    dif = {
        "delta_pr_auc": round(average_precision_score(y, c["proba_rf"]) - average_precision_score(y, s["proba_rf"]), 4),
        "ic95_delta_pr_auc": [round(float(np.percentile(d_pr, q)), 4) for q in (2.5, 97.5)],
        "p_bootstrap_delta_pr_auc_menor_igual_0": round(float(np.mean(np.array(d_pr) <= 0)), 4),
        "delta_roc_auc": round(roc_auc_score(y, c["proba_rf"]) - roc_auc_score(y, s["proba_rf"]), 4),
        "ic95_delta_roc_auc": [round(float(np.percentile(d_roc, q)), 4) for q in (2.5, 97.5)],
    }

    # Contraste H1-H3 del modelo con Tutoría frente a la situación actual (mismo método del principal)
    c = c.copy()
    c["aula"] = c["sede"].astype(str) + " | " + c["grado"].astype(str) + " | " + c["seccion"].astype(str)
    c["pred_rf_05"] = (c["proba_rf"] >= 0.5).astype(int)
    hip = []
    for txt, col in ((f"umbral elegido ({inf['con_tutoria']['umbral']['valor']:.3f})", "pred_rf"), ("umbral 0.5", "pred_rf_05")):
        pares = []
        for aula, g in c.groupby("aula"):
            r, b = metricas_aula(g, col), metricas_aula(g, "pred_regla_B1B2")
            pares.append({**{f"{k}_rf": v for k, v in r.items()}, **{f"{k}_regla": v for k, v in b.items()}})
        pares = pd.DataFrame(pares)
        for h, met in (("H1", "sensibilidad"), ("H2", "precision"), ("H3", "f1")):
            hip.append({"hipotesis": h, "umbral_rf": txt, **contraste(pares, met)})
    t_hip = pd.DataFrame(hip)

    imp = pd.read_csv(a.dir / "con_tutoria" / "importancia_permutacion.csv")
    imp["posicion"] = range(1, len(imp) + 1)
    imp_tut = imp[imp["variable"].str.startswith("Tutoria")]

    out = a.dir / "comparacion"
    out.mkdir(exist_ok=True)
    t_met.to_csv(out / "tabla_metricas_sin_vs_con_tutoria.csv", index=False, encoding="utf-8-sig")
    t_hip.to_csv(out / "tabla_contraste_hipotesis_con_tutoria.csv", index=False, encoding="utf-8-sig")
    resumen = {"n_prueba": int(len(y)), "prevalencia_prueba": round(float(y.mean()), 4),
               "particion": inf["con_tutoria"]["particion"], "diferencia": dif,
               "umbrales": {m: inf[m]["umbral"] for m in inf},
               "hiperparametros": {m: inf[m]["mejores_hiperparametros"] for m in inf},
               "importancia_tutoria": imp_tut.to_dict(orient="records"),
               "metricas": t_met.to_dict(orient="records"), "hipotesis": hip}
    (out / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(t_met.to_string(index=False))
    print(json.dumps(dif, ensure_ascii=False))
    print(imp_tut.to_string(index=False))
    print(t_hip[["hipotesis", "umbral_rf", "metrica", "n_aulas", "media_rf", "media_situacion_actual",
                 "normalidad", "prueba", "p_valor", "decision"]].to_string(index=False))


if __name__ == "__main__":
    main()
