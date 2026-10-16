"""
Pipeline Random Forest - Riesgo académico temprano (2020-2026)
==============================================================

Pipeline REAL con scikit-learn que reemplaza la lógica simulada del dashboard.

Diseño metodológico (evita fuga de información / data leakage):
  - Variables predictoras (X): notas de los bimestres TEMPRANOS (B1 y B2) de cada
    curso + variables derivadas + grado, sede y sexo.
  - Variable objetivo (y): riesgo al CIERRE del año = al menos un curso con nota
    FINAL en C (0-10). La nota final NUNCA entra como predictor.
  - Partición temporal: 2020-2024 entrenamiento, 2025 prueba (holdout real con
    etiqueta conocida). 2026 solo se PREDICE (aún no tiene nota final).
  - Búsqueda de hiperparámetros con validación cruzada "dejando un año fuera"
    (LeaveOneGroupOut por año) dentro del entrenamiento.

Formato de entrada (Excel o CSV), una fila por estudiante-año:
  ID_Estudiante, Sexo, Sede, Grado, Año_Academico,
  <Curso>_B1, <Curso>_B2, <Curso>_B3, <Curso>_B4, <Curso>_Final   (por cada curso)
  Notas en escala vigesimal (0-20) o literal (AD/A/B/C).
  Si no existe <Curso>_Final se usa <Curso>_B4 como nota de cierre.

Uso:
  python pipeline_rf_tesis.py --datos notas.xlsx --salida resultados/
  python pipeline_rf_tesis.py --demo            # genera datos sintéticos de prueba
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.stats import chi2
from sklearn.base import clone
from sklearn.calibration import calibration_curve
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    roc_curve,
    accuracy_score, average_precision_score, balanced_accuracy_score,
    brier_score_loss, cohen_kappa_score, confusion_matrix, f1_score, fbeta_score,
    log_loss, make_scorer, matthews_corrcoef, precision_recall_curve, precision_score,
    recall_score, roc_auc_score,
)
from sklearn.model_selection import LeaveOneGroupOut, RandomizedSearchCV, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

SEED = 42
SEDES_VALIDAS = ["Central", "La Ascensión", "Avantgard Lima", "Industrial", "Avantgard Huaura"]
ANIOS_VALIDOS = range(2020, 2027)
LITERALES = {"AD": 3, "A": 2, "B": 1, "C": 0}
BIMESTRES_TEMPRANOS = ["B1", "B2"]

MENSAJE_SIN_BIMESTRES = (
    "El archivo trae una sola nota por curso (promedio anual), no notas por bimestre.\n"
    "Con ese formato la etiqueta 'riesgo' sale de las mismas notas que serían las variables\n"
    "(fuga de información), así que el pipeline NO entrena.\n\n"
    "Exporta del sistema académico, para 2020-2025, una fila por estudiante-año con:\n"
    "  ID_Estudiante, Sexo, Sede, Grado, Año_Academico,\n"
    "  <Curso>_B1, <Curso>_B2 y <Curso>_Final (o <Curso>_B4) por cada curso.\n"
    "Para 2026 bastan <Curso>_B1 y <Curso>_B2 (notas de cada bimestre, no su promedio)."
)


class FormatoSinBimestres(ValueError):
    """El Excel no trae notas por bimestre: entrenar tendría fuga de información."""


# ---------------------------------------------------------------------------
# 1. ESTANDARIZACIÓN DE NOTAS
# ---------------------------------------------------------------------------
def estandarizar_nota(valor, escala_literal_del_anio: bool):
    """Devuelve (nota_0_3, motivo_error). Nunca imputa: si no es válida -> (NaN, motivo)."""
    if valor is None or (isinstance(valor, float) and np.isnan(valor)):
        return np.nan, "nulo"
    t = str(valor).strip().upper()
    if t in {"", "-", "--", "—", "NA", "N/A", "S/N", "EXO", "EXONERADO"}:
        return np.nan, "guion_o_vacio"
    if t in LITERALES:
        return LITERALES[t], None
    try:
        n = float(t.replace(",", "."))
    except ValueError:
        return np.nan, f"token_invalido:{t}"
    if not 0 <= n <= 20:
        return np.nan, "fuera_de_rango_0_20"
    # Un número muy bajo (0-3) en un año que se registra en escala literal suele ser
    # un error de codificación (p. ej. '2' por 'A'), no un 2/20 real.
    if escala_literal_del_anio and n <= 3:
        return np.nan, "numero_sospechoso_en_escala_literal"
    if n >= 18:
        return 3, None
    if n >= 14:
        return 2, None
    if n >= 11:
        return 1, None
    return 0, None


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip()


# ---------------------------------------------------------------------------
# 2. VALIDACIÓN Y EXCLUSIÓN (trazable registro por registro)
# ---------------------------------------------------------------------------
def validar_y_excluir(df: pd.DataFrame, cursos_extra: tuple[str, ...] = ()):
    """cursos_extra: áreas que solo aportan variables (B1, B2); no se exige ni se valida su nota final."""
    df = df.copy()
    df.columns = [_norm(c) for c in df.columns]
    col = {c.upper(): c for c in df.columns}
    req = ["ID_ESTUDIANTE", "SEDE", "ANO_ACADEMICO", "GRADO"]
    faltan = [r for r in req if r not in col]
    if faltan:
        raise ValueError(f"Faltan columnas obligatorias: {faltan}")

    patron = re.compile(r"^(?:CURSO_)?(.+?)_(B[1-4]|FINAL)$", re.I)
    cursos = {}
    for c in df.columns:
        m = patron.match(c)
        if m:
            cursos.setdefault(m.group(1).strip(), {})[m.group(2).upper()] = c
    if not cursos or not any(set(BIMESTRES_TEMPRANOS) <= set(d) for d in cursos.values()):
        raise FormatoSinBimestres(MENSAJE_SIN_BIMESTRES)
    for cur, d in cursos.items():
        if "FINAL" not in d and "B4" in d:
            d["FINAL"] = d["B4"]
        if not set(BIMESTRES_TEMPRANOS) <= set(d):
            raise FormatoSinBimestres(f"El curso {cur} no trae B1 y B2.\n\n" + MENSAJE_SIN_BIMESTRES)
        if "FINAL" not in d and cur not in cursos_extra:
            raise ValueError(f"El curso {cur} necesita una columna {cur}_Final (o {cur}_B4) con la nota de cierre.")

    # Escala predominante por año (literal vs vigesimal)
    df["_anio"] = pd.to_numeric(df[col["ANO_ACADEMICO"]], errors="coerce")
    escala_literal = {}
    for a, g in df.groupby("_anio"):
        vals = g[[d["B1"] for d in cursos.values()]].astype(str).stack().str.strip().str.upper()
        escala_literal[a] = vals.isin(LITERALES).mean() > 0.5

    log, filas = [], []
    vistos = set()
    for idx, r in df.iterrows():
        motivos = []
        anio = r["_anio"]
        if pd.isna(anio) or int(anio) not in ANIOS_VALIDOS:
            motivos.append("anio_invalido")
        sede = _norm(r[col["SEDE"]]) if pd.notna(r[col["SEDE"]]) else ""
        sede_ok = {_norm(s).upper(): s for s in SEDES_VALIDAS}.get(sede.upper().replace("SEDE ", ""))
        if not sede_ok:
            motivos.append("sede_invalida_o_vacia")
        clave = (str(r[col["ID_ESTUDIANTE"]]).strip(), anio)
        if clave in vistos:
            motivos.append("duplicado_id_anio")
        vistos.add(clave)

        reg = {"ID_Estudiante": clave[0], "anio": anio, "sede": sede_ok,
               "grado": pd.to_numeric(r[col["GRADO"]], errors="coerce"),
               # sección: solo para reportar por aula; no es variable del modelo
               "seccion": r[col["SECCION"]] if "SECCION" in col else None}
        sexo_raw = str(r[col["SEXO"]]).strip().upper() if "SEXO" in col and pd.notna(r[col["SEXO"]]) else ""
        # Nunca se inventa el sexo: si no viene en la fuente queda "No registrado".
        if sexo_raw.startswith(("F", "MUJ")):
            reg["sexo"] = "Femenino"
        elif sexo_raw.startswith(("M", "H", "VAR")):
            reg["sexo"] = "Masculino"
        else:
            reg["sexo"] = "No registrado"

        es_2026 = anio == 2026
        lit = escala_literal.get(anio, True)
        for cur, d in cursos.items():
            for etapa in BIMESTRES_TEMPRANOS + ([] if es_2026 or cur in cursos_extra else ["FINAL"]):
                v, err = estandarizar_nota(r[d[etapa]], lit)
                reg[f"{cur}_{etapa}"] = v
                if err:
                    motivos.append(f"{cur}_{etapa}:{err}")
        if motivos:
            log.append({"fila_origen": idx + 2, **{k: reg[k] for k in ("ID_Estudiante", "anio")},
                        "sede": sede or "(vacía)", "motivos": " | ".join(motivos)})
        else:
            filas.append(reg)

    limpio = pd.DataFrame(filas)
    excl = pd.DataFrame(log, columns=["fila_origen", "ID_Estudiante", "anio", "sede", "motivos"])
    resumen = {
        "total_bruto": int(len(df)),
        "total_validos": int(len(limpio)),
        "total_excluidos": int(len(excl)),
        "porcentaje_excluidos": round(100 * len(excl) / max(len(df), 1), 2),
        "motivos": (excl["motivos"].str.split(" | ", regex=False).explode()
                    .str.replace(r"^.*?:", "", regex=True).value_counts().to_dict()) if len(excl) else {},
        "por_sede": excl["sede"].value_counts().to_dict() if len(excl) else {},
        "por_anio": excl["anio"].value_counts().sort_index().to_dict() if len(excl) else {},
        "escala_literal_por_anio": {int(k): bool(v) for k, v in escala_literal.items() if pd.notna(k)},
    }
    return limpio, excl, resumen, list(cursos)


# ---------------------------------------------------------------------------
# 3. INGENIERÍA DE VARIABLES (solo B1-B2) Y ETIQUETA (Final)
# ---------------------------------------------------------------------------
def construir_variables(df: pd.DataFrame, cursos: list[str], cursos_extra: tuple[str, ...] = (),
                        extra_en_x: bool = True):
    """
    Las áreas de `cursos_extra` (p. ej. Tutoría) no entran en la etiqueta ni en los agregados
    (promedio, mínimo, n.º de C/B): solo aportan sus propias B1, B2 y tendencia si extra_en_x.
    """
    principales = [c for c in cursos if c not in cursos_extra]
    X = pd.DataFrame(index=df.index)
    for c in principales + (list(cursos_extra) if extra_en_x else []):
        X[f"{c}_B1"] = df[f"{c}_B1"]
        X[f"{c}_B2"] = df[f"{c}_B2"]
        X[f"{c}_tendencia"] = df[f"{c}_B2"] - df[f"{c}_B1"]
    b = df[[f"{c}_{e}" for c in principales for e in BIMESTRES_TEMPRANOS]]
    X["promedio_B1B2"] = b.mean(axis=1)
    X["minimo_B1B2"] = b.min(axis=1)
    X["n_notas_C_B1B2"] = (b == 0).sum(axis=1)
    X["n_notas_B_B1B2"] = (b == 1).sum(axis=1)
    X["grado"] = df["grado"]
    X["sede"] = df["sede"]
    X["sexo"] = df["sexo"]
    finales = [f"{c}_FINAL" for c in principales]
    y = None
    if set(finales) <= set(df.columns):
        y = (df[finales].min(axis=1) == 0).astype(float)
        y[df[finales].isna().any(axis=1)] = np.nan
    return X, y


def preprocesador(X):
    cat = ["sede", "sexo"]
    num = [c for c in X.columns if c not in cat]
    return ColumnTransformer([
        ("num", "passthrough", num),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat),
    ]), num, cat


# ---------------------------------------------------------------------------
# 4. MÉTRICAS
# ---------------------------------------------------------------------------
def metricas(y, proba, umbral=0.5):
    y = np.asarray(y).astype(int)
    pred = (proba >= umbral).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "umbral": round(float(umbral), 3),
        "matriz_confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "sensibilidad_recall": recall_score(y, pred, zero_division=0),
        "especificidad": tn / (tn + fp) if tn + fp else 0.0,
        "precision": precision_score(y, pred, zero_division=0),
        "valor_predictivo_negativo": tn / (tn + fn) if tn + fn else 0.0,
        "f1": f1_score(y, pred, zero_division=0),
        "f2": fbeta_score(y, pred, beta=2, zero_division=0),
        "accuracy": accuracy_score(y, pred),
        "balanced_accuracy": balanced_accuracy_score(y, pred),
        "mcc": matthews_corrcoef(y, pred),
        "kappa_cohen": cohen_kappa_score(y, pred),
        "roc_auc": roc_auc_score(y, proba) if len(set(y)) > 1 else np.nan,
        "pr_auc": average_precision_score(y, proba) if len(set(y)) > 1 else np.nan,
        "brier": brier_score_loss(y, proba),
        "log_loss": log_loss(y, np.clip(proba, 1e-6, 1 - 1e-6), labels=[0, 1]),
        "prevalencia": float(y.mean()),
    }


def ic_bootstrap(y, proba, umbral, n=1000, seed=SEED):
    """IC 95% por bootstrap para las métricas principales."""
    rng = np.random.default_rng(seed)
    y = np.asarray(y).astype(int)
    claves = ["sensibilidad_recall", "precision", "f1", "f2", "roc_auc", "pr_auc", "mcc"]
    acc = {k: [] for k in claves}
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        if y[i].sum() in (0, len(i)):
            continue
        m = metricas(y[i], proba[i], umbral)
        for k in claves:
            acc[k].append(m[k])
    return {k: [round(float(np.percentile(v, 2.5)), 4), round(float(np.percentile(v, 97.5)), 4)]
            for k, v in acc.items()}


def umbral_optimo(y, proba, recall_min=0.90):
    """Mayor precisión que garantice sensibilidad >= recall_min; si no, máximo F2."""
    p, r, t = precision_recall_curve(y, proba)
    p, r = p[:-1], r[:-1]
    ok = r >= recall_min
    if ok.any():
        return float(t[ok][np.argmax(p[ok])]), f"max_precision_con_recall>={recall_min}"
    f2 = 5 * p * r / np.maximum(4 * p + r, 1e-9)
    return float(t[np.argmax(f2)]), "max_F2"


def mcnemar(y, pred_a, pred_b):
    a_ok, b_ok = pred_a == y, pred_b == y
    b, c = int((a_ok & ~b_ok).sum()), int((~a_ok & b_ok).sum())
    est = (abs(b - c) - 1) ** 2 / (b + c) if b + c else 0.0
    return {"a_acierta_b_falla": b, "b_acierta_a_falla": c, "chi2": round(est, 4),
            "p_valor": round(float(chi2.sf(est, 1)), 4)}


# ---------------------------------------------------------------------------
# 5. ENTRENAMIENTO, BÚSQUEDA DE HIPERPARÁMETROS Y EVALUACIÓN
# ---------------------------------------------------------------------------
ESPACIO_RF = {
    "rf__n_estimators": [100, 200, 300, 500],
    "rf__max_depth": [None, 4, 6, 8, 12],
    "rf__min_samples_split": [2, 5, 10, 20],
    "rf__min_samples_leaf": [1, 2, 5, 10],
    "rf__max_features": ["sqrt", "log2", 0.5, None],
    "rf__class_weight": [None, "balanced", "balanced_subsample"],
    "rf__criterion": ["gini", "entropy", "log_loss"],
    "rf__max_samples": [None, 0.7, 0.9],
}


def ejecutar(ruta_datos: Path, salida: Path, n_iter: int = 40, anio_test: int = 2025,
             cursos_extra: tuple[str, ...] = (), extra_en_x: bool = True):
    salida.mkdir(parents=True, exist_ok=True)
    bruto = pd.read_excel(ruta_datos) if ruta_datos.suffix.lower() in {".xlsx", ".xls"} else pd.read_csv(ruta_datos)

    limpio, excl, resumen_excl, cursos = validar_y_excluir(bruto, cursos_extra)
    faltan = [c for c in cursos_extra if c not in cursos]
    if faltan:
        raise ValueError(f"No se encontraron las áreas extra {faltan} en el archivo.")
    excl.to_csv(salida / "registros_excluidos.csv", index=False, encoding="utf-8-sig")

    X, y = construir_variables(limpio, cursos, cursos_extra, extra_en_x)
    anios = limpio["anio"].astype(int)
    m_train = (anios < anio_test) & y.notna()
    m_test = (anios == anio_test) & y.notna()
    m_pred = anios == 2026
    Xtr, ytr, gtr = X[m_train], y[m_train].astype(int), anios[m_train]
    Xte, yte = X[m_test], y[m_test].astype(int)

    pre, num, cat = preprocesador(X)
    pipe = Pipeline([("pre", pre), ("rf", RandomForestClassifier(random_state=SEED, n_jobs=-1, oob_score=False))])
    cv = LeaveOneGroupOut()
    busqueda = RandomizedSearchCV(
        pipe, ESPACIO_RF, n_iter=n_iter, cv=cv, random_state=SEED, n_jobs=-1, refit="pr_auc",
        scoring={"pr_auc": "average_precision", "roc_auc": "roc_auc", "recall": "recall",
                 "f1": "f1", "f2": make_scorer(fbeta_score, beta=2), "balanced_accuracy": "balanced_accuracy"},
        return_train_score=True,
    )
    busqueda.fit(Xtr, ytr, groups=gtr)
    mejor = busqueda.best_estimator_
    cv_res = pd.DataFrame(busqueda.cv_results_)
    cols = [c for c in cv_res.columns if c.startswith(("param_", "mean_test", "std_test", "mean_train", "rank_test_pr_auc"))]
    cv_res[cols].sort_values("rank_test_pr_auc").to_csv(salida / "busqueda_hiperparametros.csv", index=False)
    # Curvas de validación marginales: promedio de las combinaciones probadas para cada valor
    curvas = {}
    for p in ("rf__max_depth", "rf__min_samples_leaf"):
        # None (p. ej. max_depth sin límite) no debe perderse como nulo al agrupar
        g = cv_res.groupby(cv_res[f"param_{p}"].map(lambda v: "None" if v is None or v != v else str(v)))
        curvas[p.replace("rf__", "")] = [
            {"valor": k, "pr_auc_validacion": round(float(v["mean_test_pr_auc"].mean()), 4),
             "pr_auc_entrenamiento": round(float(v["mean_train_pr_auc"].mean()), 4), "n_combinaciones": int(len(v))}
            for k, v in sorted(g, key=lambda kv: (kv[0] in ("None", "nan"), pd.to_numeric(kv[0], errors="coerce")))]
    mejor_fila = cv_res.loc[cv_res["rank_test_pr_auc"].idxmin()]
    pr_auc_por_anio = {int(a): round(float(mejor_fila[f"split{i}_test_pr_auc"]), 4)
                       for i, a in enumerate(sorted(gtr.unique()))}

    # Umbral elegido SOLO con predicciones fuera de muestra del entrenamiento (sin mirar 2025)
    proba_oof = cross_val_predict(clone(mejor), Xtr, ytr, groups=gtr, cv=cv, method="predict_proba")[:, 1]
    umbral, criterio = umbral_optimo(ytr, proba_oof)

    proba_te = mejor.predict_proba(Xte)[:, 1]
    res_test = {"umbral_0.5": metricas(yte, proba_te, 0.5), "umbral_optimo": metricas(yte, proba_te, umbral)}
    res_test["ic95_bootstrap_umbral_optimo"] = ic_bootstrap(yte.values, proba_te, umbral)

    # Líneas base
    regla = (Xte["n_notas_C_B1B2"] > 0).astype(int).values
    base = {
        "regla_alguna_C_en_B1B2": metricas(yte, regla.astype(float), 0.5),
        "dummy_estratificado": metricas(yte, DummyClassifier(strategy="stratified", random_state=SEED)
                                         .fit(Xtr, ytr).predict_proba(Xte)[:, 1], 0.5),
    }
    logit = Pipeline([("pre", ColumnTransformer([("num", StandardScaler(), num),
                                                 ("cat", OneHotEncoder(handle_unknown="ignore"), cat)])),
                      ("lr", LogisticRegression(max_iter=2000, class_weight="balanced"))]).fit(Xtr, ytr)
    p_lr = logit.predict_proba(Xte)[:, 1]
    base["regresion_logistica"] = metricas(yte, p_lr, 0.5)
    pred_rf = (proba_te >= umbral).astype(int)
    comp = {"RF_vs_regla_B1B2": mcnemar(yte.values, pred_rf, regla),
            "RF_vs_logistica": mcnemar(yte.values, pred_rf, (p_lr >= 0.5).astype(int))}

    # Equidad / desempeño por subgrupo
    por_grupo = {}
    for gcol in ["sede", "sexo", "grado"]:
        por_grupo[gcol] = {}
        for g, idx in Xte.groupby(gcol).groups.items():
            yy = yte.loc[idx]
            if yy.nunique() > 1 and len(yy) >= 20:
                m = metricas(yy, mejor.predict_proba(Xte.loc[idx])[:, 1], umbral)
                por_grupo[gcol][str(g)] = {k: round(m[k], 4) for k in
                                           ("sensibilidad_recall", "precision", "f1", "pr_auc", "prevalencia")}

    # Predicciones de la prueba fila por fila (para la curva ROC y el contraste por aula; fuera de git)
    pd.DataFrame({"ID_Estudiante": limpio.loc[Xte.index, "ID_Estudiante"], "sede": Xte["sede"],
                  "grado": Xte["grado"], "seccion": limpio.loc[Xte.index, "seccion"], "y_real": yte,
                  "proba_rf": proba_te, "pred_rf": pred_rf, "pred_regla_B1B2": regla,
                  "proba_logistica": p_lr}).to_csv(salida / "predicciones_prueba.csv", index=False, encoding="utf-8-sig")
    fpr, tpr, umb = roc_curve(yte, proba_te)
    sel = np.unique(np.linspace(0, len(fpr) - 1, min(len(fpr), 200)).astype(int))
    curva_roc = {"fpr": fpr[sel].round(4).tolist(), "tpr": tpr[sel].round(4).tolist()}

    # Calibración e importancias
    fr, mp = calibration_curve(yte, proba_te, n_bins=10, strategy="quantile")
    nombres = mejor.named_steps["pre"].get_feature_names_out()
    imp_gini = pd.Series(mejor.named_steps["rf"].feature_importances_, index=nombres).sort_values(ascending=False)
    perm = permutation_importance(mejor, Xte, yte, scoring="average_precision", n_repeats=20, random_state=SEED, n_jobs=-1)
    imp_perm = pd.DataFrame({"variable": Xte.columns, "importancia_media": perm.importances_mean,
                             "desv_std": perm.importances_std}).sort_values("importancia_media", ascending=False)
    imp_perm.to_csv(salida / "importancia_permutacion.csv", index=False)

    # Modelo final (2020-2025) -> predicción 2026
    final = clone(mejor).fit(X[(anios <= 2025) & y.notna()], y[(anios <= 2025) & y.notna()].astype(int))
    joblib.dump({"modelo": final, "umbral": umbral, "criterio_umbral": criterio, "cursos": cursos,
                 "cursos_extra": list(cursos_extra), "extra_en_x": extra_en_x,
                 "columnas": list(X.columns), "sedes": SEDES_VALIDAS}, salida / "modelo_rf.joblib")
    if m_pred.any():
        p26 = final.predict_proba(X[m_pred])[:, 1]
        out = limpio.loc[m_pred, ["ID_Estudiante", "sede", "sexo", "grado"]].copy()
        out["probabilidad_riesgo"] = p26.round(4)
        out["alerta_riesgo"] = (p26 >= umbral).astype(int)
        Z = final.named_steps["pre"].transform(X[m_pred])
        votos = np.sum([t.predict(Z) == 1 for t in final.named_steps["rf"].estimators_], axis=0)
        out["votos_arboles_riesgo"] = votos.astype(int)
        out["total_arboles"] = len(final.named_steps["rf"].estimators_)
        out.sort_values("probabilidad_riesgo", ascending=False).to_csv(
            salida / "predicciones_2026.csv", index=False, encoding="utf-8-sig")

    informe = {
        "cursos": cursos,
        "cursos_extra": list(cursos_extra),
        "extra_en_x": extra_en_x,
        "n_arboles_modelo_final": len(final.named_steps["rf"].estimators_),
        "validacion_exclusion": resumen_excl,
        "particion": {"entrenamiento": f"2020-{anio_test - 1}", "prueba": anio_test, "prediccion": 2026,
                      "n_train": int(m_train.sum()), "n_test": int(m_test.sum()), "n_2026": int(m_pred.sum()),
                      "prevalencia_train": round(float(ytr.mean()), 4), "prevalencia_test": round(float(yte.mean()), 4)},
        "mejores_hiperparametros": busqueda.best_params_,
        "cv_leave_one_year_out_pr_auc": round(float(busqueda.best_score_), 4),
        "cv_pr_auc_por_anio_validacion": pr_auc_por_anio,
        "brecha_entrenamiento_validacion_pr_auc": round(float(mejor_fila["mean_train_pr_auc"] - mejor_fila["mean_test_pr_auc"]), 4),
        "curvas_validacion_marginales": curvas,
        "umbral": {"valor": round(umbral, 4), "criterio": criterio},
        "test": res_test,
        "lineas_base": base,
        "pruebas_mcnemar": comp,
        "por_subgrupo": por_grupo,
        "curva_roc": curva_roc,
        "calibracion": {"prob_media_predicha": mp.round(4).tolist(), "fraccion_real": fr.round(4).tolist()},
        "importancia_gini_top10": imp_gini.head(10).round(4).to_dict(),
        "importancia_permutacion_top10": imp_perm.head(10).round(4).to_dict(orient="records"),
    }
    with open(salida / "informe_metricas.json", "w", encoding="utf-8") as f:
        json.dump(informe, f, ensure_ascii=False, indent=2, default=lambda o: o.item() if hasattr(o, "item") else str(o))
    return informe


# ---------------------------------------------------------------------------
# 6. DATOS SINTÉTICOS PARA PROBAR EL PIPELINE
# ---------------------------------------------------------------------------
def generar_demo(ruta: Path, n_por_anio=(712, 878, 1286, 1709, 1862, 1909, 1966)):
    rng = np.random.default_rng(SEED)
    cursos = ["Comunicacion", "Ingles", "Matematica", "Ciencia y Tecnologia", "Ciencias Sociales"]
    filas, k = [], 0
    for anio, n in zip(range(2020, 2027), n_por_anio):
        for _ in range(n):
            habilidad = rng.normal(14, 2.3)
            r = {"ID_Estudiante": f"EST-{anio}-{k:05d}", "Sexo": rng.choice(["F", "M"]),
                 "Sede": rng.choice(SEDES_VALIDAS, p=[.24, .24, .2, .18, .14]),
                 "Grado": int(rng.integers(1, 6)), "Año_Academico": anio}
            for c in cursos:
                dif = -1.2 if c == "Matematica" else 0
                b = [np.clip(rng.normal(habilidad + dif + rng.normal(0, .8) * j, 1.6), 0, 20) for j in range(4)]
                fin = np.clip(np.mean(b) + rng.normal(0, .7), 0, 20)
                for j, v in enumerate(b, 1):
                    r[f"{c}_B{j}"] = round(v)
                r[f"{c}_Final"] = round(fin) if anio < 2026 else None
                if anio == 2026:
                    r[f"{c}_B3"] = r[f"{c}_B4"] = None
            filas.append(r)
            k += 1
    df = pd.DataFrame(filas)
    # ruido de calidad de datos para probar la exclusión
    df = df.astype(object)
    for col, val in [("Matematica_B1", "-"), ("Ingles_B2", "d"), ("Sede", ""), ("Ingles_Final", 25)]:
        df.loc[rng.choice(len(df), 15, replace=False), col] = val
    df = pd.concat([df, df.sample(10, random_state=SEED)])  # duplicados
    df.to_excel(ruta, index=False)
    return ruta


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", type=Path)
    ap.add_argument("--salida", type=Path, default=Path("resultados"))
    ap.add_argument("--n-iter", type=int, default=40)
    ap.add_argument("--demo", action="store_true")
    ap.add_argument("--cursos-extra", nargs="*", default=[],
                    help="áreas que solo aportan B1-B2 como variables (no entran en la etiqueta), p. ej. Tutoria")
    ap.add_argument("--sin-extra-en-x", action="store_true",
                    help="valida las áreas extra (mismos registros) pero no las usa como variables: modelo de comparación")
    a = ap.parse_args()
    if a.demo:
        a.datos = generar_demo(Path("datos_demo.xlsx"))
    elif a.datos is None:
        ap.error("indica --datos <archivo> o --demo")
    try:
        inf = ejecutar(a.datos, a.salida, a.n_iter, cursos_extra=tuple(a.cursos_extra),
                       extra_en_x=not a.sin_extra_en_x)
    except FormatoSinBimestres as e:
        print(f"\nNO SE ENTRENÓ EL MODELO.\n\n{e}", file=sys.stderr)
        sys.exit(2)
    print(json.dumps({k: inf[k] for k in ("validacion_exclusion", "particion", "mejores_hiperparametros", "umbral")},
                     ensure_ascii=False, indent=2, default=str))
    print(json.dumps(inf["test"]["umbral_optimo"], indent=2, default=str))
