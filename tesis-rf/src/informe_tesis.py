"""
Tablas y figuras del capítulo de Resultados de la tesis, calculadas desde las salidas reales.

Lee:
  data/<base>_flujo.json              (consolidar_notas.py: reglas C1-C3)
  salida/registros_excluidos.csv      (auditar_excel.py: reglas de validación)
  resultados/informe_metricas.json    (pipeline_rf_tesis.py)
  resultados/predicciones_prueba.csv  (pipeline_rf_tesis.py, fila por fila, fuera de git)
  resultados/importancia_permutacion.csv
Escribe en resultados/informe_tesis/ solo tablas agregadas (CSV) y figuras (PNG).

Contraste de hipótesis: unidad de análisis = aula (sección) de la cohorte de prueba 2025.
Para cada aula se calcula la métrica con el Random Forest y con la situación actual
(regla "alguna C en B1-B2"); se prueba la normalidad de las diferencias pareadas con
Shapiro-Wilk y, según el resultado, t de Student pareada o Wilcoxon de rangos con signo,
ambas unilaterales (H1: Random Forest > situación actual), alfa = 0.05.

Uso:
  python src/informe_tesis.py --flujo data/notas_2020_2026_flujo.json
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy import stats  # noqa: E402
from sklearn.metrics import f1_score, precision_score, recall_score  # noqa: E402

ALFA = 0.05
AZUL, NARANJA, GRIS = "#2a78d6", "#eb6834", "#8a8984"
TINTA, TINTA2, REJILLA = "#0b0b0b", "#52514e", "#e4e3df"

REGLAS = [
    # (id, fase, descripción, cómo se aplica)
    ("C1", "Consolidación", "Sección de notas copiada de otra sede",
     "Mismos alumnos y mismas notas que una sección de otra sede; se conserva solo donde los alumnos tienen ficha."),
    ("C2", "Consolidación", "Alumno con notas sin ficha de datos del estudiante",
     "Sin ficha no hay DNI (ID estable), sexo ni sección: el registro se excluye."),
    ("C3", "Consolidación", "Ficha de estudiante sin notas en el sistema",
     "No existe registro académico que consolidar; no entra al conjunto."),
    ("V1", "Validación", "Año académico inválido", "Año vacío o fuera de 2020-2026."),
    ("V2", "Validación", "Sede inválida o vacía", "La sede no es una de las cinco sedes del grupo educativo."),
    ("V3", "Validación", "Sin identificador", "ID_Estudiante vacío."),
    ("V4", "Validación", "Registro duplicado", "Mismo ID_Estudiante y año más de una vez."),
    ("V5", "Validación", "Nota final (PF) vacía o inválida en algún área",
     "Sin nota de cierre no se puede construir la etiqueta (riesgo = alguna área con PF en C)."),
    ("V6", "Validación", "Nota de B1 o B2 vacía o inválida en algún área",
     "Sin las notas tempranas no se pueden construir las variables predictoras."),
]


def clasificar(motivos: str) -> str:
    """Regla principal de exclusión de un registro (la primera que se cumple, en el orden V1..V6)."""
    m = motivos.split(" | ")
    for regla, clave in (("V1", "anio_invalido"), ("V2", "sede_invalida_o_vacia"), ("V3", "sin_id"),
                         ("V4", "duplicado_id_anio")):
        if clave in m:
            return regla
    etapas = {re.search(r"_(B[1-4]|FINAL):", x).group(1) for x in m if re.search(r"_(B[1-4]|FINAL):", x)}
    if "FINAL" in etapas:
        return "V5"
    if etapas & {"B1", "B2"}:
        return "V6"
    return "otro"


def tipo_problema(motivos: str) -> list[str]:
    return [x.split(":", 1)[1] for x in motivos.split(" | ") if ":" in x]


def etiqueta_variable(v: str) -> str:
    fijas = {"n_notas_C_B1B2": "N.º de notas C en B1-B2", "n_notas_B_B1B2": "N.º de notas B en B1-B2",
             "promedio_B1B2": "Promedio B1-B2", "minimo_B1B2": "Nota mínima B1-B2", "grado": "Grado"}
    if v in fijas:
        return fijas[v]
    cursos = {"Matematica": "Matemática", "Comunicacion": "Comunicación", "Ingles": "Inglés",
              "Ciencia y Tecnologia": "Ciencia y Tecnología", "Ciencias Sociales": "Ciencias Sociales"}
    m = re.match(r"^(.*)_(B1|B2|tendencia)$", v)
    if m:
        etapa = "tendencia B2−B1" if m.group(2) == "tendencia" else m.group(2)
        return f"{cursos.get(m.group(1), m.group(1))} ({etapa})"
    return v.replace("cat__", "").replace("num__", "")


def estilo(ax, titulo=None):
    ax.spines[["top", "right"]].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(TINTA2)
    ax.tick_params(colors=TINTA2, labelsize=9)
    ax.grid(color=REJILLA, linewidth=0.8)
    ax.set_axisbelow(True)
    if titulo:
        ax.set_title(titulo, color=TINTA, fontsize=11, loc="left")


def metricas_aula(g: pd.DataFrame, col_pred: str) -> dict:
    y, p = g["y_real"].astype(int), g[col_pred].astype(int)
    return {
        "sensibilidad": recall_score(y, p, zero_division=0) if y.sum() > 0 else np.nan,
        "precision": precision_score(y, p, zero_division=0) if p.sum() > 0 else np.nan,
        "f1": f1_score(y, p, zero_division=0) if (y.sum() + p.sum()) > 0 else np.nan,
    }


def contraste(pares: pd.DataFrame, metrica: str) -> dict:
    d = pares[[f"{metrica}_rf", f"{metrica}_regla"]].dropna()
    dif = d[f"{metrica}_rf"] - d[f"{metrica}_regla"]
    n = int(len(dif))
    res = {"metrica": metrica, "n_aulas": n, "media_rf": round(float(d[f"{metrica}_rf"].mean()), 4),
           "media_situacion_actual": round(float(d[f"{metrica}_regla"].mean()), 4),
           "diferencia_media": round(float(dif.mean()), 4)}
    if n < 3 or np.allclose(dif, dif.iloc[0]):
        res.update({"shapiro_w": None, "shapiro_p": None, "normalidad": "no evaluable",
                    "prueba": "no evaluable (diferencias constantes)", "estadistico": None, "p_valor": None,
                    "decision": "No se rechaza H0"})
        return res
    w, p_sw = stats.shapiro(dif)
    normal = p_sw > ALFA
    if normal:
        est, p = stats.ttest_rel(d[f"{metrica}_rf"], d[f"{metrica}_regla"], alternative="greater")
        prueba = "t de Student para muestras relacionadas (unilateral)"
    else:
        est, p = stats.wilcoxon(dif, alternative="greater", zero_method="wilcox")
        prueba = "Wilcoxon de rangos con signo (unilateral)"
    res.update({"shapiro_w": round(float(w), 4), "shapiro_p": round(float(p_sw), 4),
                "normalidad": "normal" if normal else "no normal", "prueba": prueba,
                "estadistico": round(float(est), 4), "p_valor": round(float(p), 4),
                "decision": "Se rechaza H0: se acepta H1" if p < ALFA else "No se rechaza H0"})
    return res


def main():
    ap = argparse.ArgumentParser()
    base = Path(__file__).resolve().parents[1]
    ap.add_argument("--flujo", type=Path, required=True)
    ap.add_argument("--auditoria", type=Path, default=base / "salida")
    ap.add_argument("--resultados", type=Path, default=base / "resultados")
    a = ap.parse_args()
    out = a.resultados / "informe_tesis"
    out.mkdir(parents=True, exist_ok=True)
    inf = json.loads((a.resultados / "informe_metricas.json").read_text(encoding="utf-8"))

    # ------------------------------------------------------------------ 1. Preprocesamiento
    flujo = pd.DataFrame(json.loads(a.flujo.read_text(encoding="utf-8"))).fillna(0).astype(int)
    flujo.columns = flujo.columns.astype(int)
    ex = pd.read_csv(a.auditoria / "registros_excluidos.csv")
    ex["regla"] = ex["motivos"].map(clasificar)
    ex["anio"] = ex["anio"].astype(int)
    perfil = json.loads((a.auditoria / "perfil_dataset.json").read_text(encoding="utf-8"))
    anios = sorted(flujo.columns)
    filas = []
    for y in anios:
        f = flujo[y]
        fila = {"Año": y, "Fichas de estudiantes (secundaria)": f.get("fichas_secundaria", 0),
                "Registros de notas en bruto": f.get("filas_notas_en_bruto", 0),
                "C1 Sección copiada de otra sede": -f.get("C1_seccion_copiada_de_otra_sede", 0),
                "C2 Sin ficha de datos": -f.get("C2_sin_ficha_de_datos", 0),
                "Registros consolidados": f.get("consolidados", 0),
                "C3 Fichas sin notas (no ingresan)": f.get("C3_ficha_sin_notas", 0)}
        for r in ("V1", "V2", "V3", "V4", "V5", "V6"):
            fila[f"{r} " + dict((x[0], x[2]) for x in REGLAS)[r]] = -int(((ex["anio"] == y) & (ex["regla"] == r)).sum())
        fila["Registros finales (válidos)"] = int(perfil["validos_por_anio"].get(str(y), 0))
        fila["Rol en el modelo"] = ("Entrenamiento" if y <= 2024 else "Prueba" if y == 2025 else "Predicción")
        filas.append(fila)
    t_flujo = pd.DataFrame(filas)
    tot = t_flujo.drop(columns=["Año", "Rol en el modelo"]).sum()
    t_flujo = pd.concat([t_flujo, pd.DataFrame([{"Año": "Total", **tot.to_dict(), "Rol en el modelo": ""}])])
    # control: consolidados + exclusiones de validación = válidos
    vcols = [c for c in t_flujo.columns if c[:2] in {"V1", "V2", "V3", "V4", "V5", "V6"}]
    chk = t_flujo["Registros consolidados"] + t_flujo[vcols].sum(axis=1) - t_flujo["Registros finales (válidos)"]
    assert (chk == 0).all(), "El flujo de exclusión no cuadra"
    t_flujo.to_csv(out / "tabla_preprocesamiento_por_anio.csv", index=False, encoding="utf-8-sig")

    reglas = pd.DataFrame(REGLAS, columns=["Regla", "Fase", "Criterio de exclusión", "Cómo se aplica"])
    conteo = {"C1": int(flujo.loc["C1_seccion_copiada_de_otra_sede"].sum()) if "C1_seccion_copiada_de_otra_sede" in flujo.index else 0,
              "C2": int(flujo.loc["C2_sin_ficha_de_datos"].sum()) if "C2_sin_ficha_de_datos" in flujo.index else 0,
              "C3": int(flujo.loc["C3_ficha_sin_notas"].sum()) if "C3_ficha_sin_notas" in flujo.index else 0}
    conteo.update(ex["regla"].value_counts().to_dict())
    reglas["Registros"] = reglas["Regla"].map(lambda r: int(conteo.get(r, 0)))
    reglas.to_csv(out / "tabla_reglas_exclusion.csv", index=False, encoding="utf-8-sig")

    probs = ex["motivos"].map(tipo_problema).explode().str.replace(r"\(.*\)", "", regex=True)
    det_sede = (ex.groupby(["sede", "regla"]).size().unstack(fill_value=0))
    det_sede.to_csv(out / "tabla_exclusiones_por_sede.csv", encoding="utf-8-sig")
    tipos = probs.value_counts().rename_axis("Problema en la nota").reset_index(name="Notas afectadas")
    tipos.to_csv(out / "tabla_tipos_de_problema.csv", index=False, encoding="utf-8-sig")

    # ------------------------------------------------------------------ 2. Configuración
    hp = inf["mejores_hiperparametros"]
    desc = {"n_estimators": "Número de árboles", "max_depth": "Profundidad máxima", "min_samples_split":
            "Mínimo de registros para dividir un nodo", "min_samples_leaf": "Mínimo de registros por hoja",
            "max_features": "Variables evaluadas por división", "criterion": "Criterio de impureza",
            "class_weight": "Ponderación de clases", "max_samples": "Proporción de la muestra bootstrap"}
    conf = [{"Parámetro": k.replace("rf__", ""), "Descripción": desc.get(k.replace("rf__", ""), ""),
             "Valor": "sin límite / ninguno" if v is None else v} for k, v in hp.items()]
    conf += [{"Parámetro": "random_state", "Descripción": "Semilla (reproducibilidad)", "Valor": 42},
             {"Parámetro": "umbral de decisión", "Descripción": inf["umbral"]["criterio"], "Valor": inf["umbral"]["valor"]},
             {"Parámetro": "búsqueda", "Descripción": "RandomizedSearchCV, 40 combinaciones, CV dejando un año fuera (2020-2024), métrica PR-AUC",
              "Valor": f"PR-AUC CV = {inf['cv_leave_one_year_out_pr_auc']}"},
             {"Parámetro": "partición", "Descripción": f"Entrenamiento {inf['particion']['entrenamiento']} / prueba {inf['particion']['prueba']} / predicción {inf['particion']['prediccion']}",
              "Valor": f"{inf['particion']['n_train']} / {inf['particion']['n_test']} / {inf['particion']['n_2026']}"}]
    pd.DataFrame(conf).to_csv(out / "tabla_configuracion_modelo.csv", index=False, encoding="utf-8-sig")

    # ------------------------------------------------------------------ 3. Métricas
    nombres = {"sensibilidad_recall": "Sensibilidad", "precision": "Precisión", "f1": "F1-Score",
               "especificidad": "Especificidad", "f2": "F2", "accuracy": "Exactitud",
               "balanced_accuracy": "Exactitud balanceada", "mcc": "MCC", "roc_auc": "ROC-AUC", "pr_auc": "PR-AUC"}
    modelos = {"Random Forest (umbral elegido)": inf["test"]["umbral_optimo"],
               "Random Forest (umbral 0.5)": inf["test"]["umbral_0.5"],
               "Situación actual: regla «alguna C en B1-B2»": inf["lineas_base"]["regla_alguna_C_en_B1B2"],
               "Regresión logística": inf["lineas_base"]["regresion_logistica"]}
    ic = inf["test"]["ic95_bootstrap_umbral_optimo"]
    t_met = pd.DataFrame({m: {nombres[k]: round(v[k], 4) for k in nombres} for m, v in modelos.items()})
    t_met["IC 95% (RF, umbral elegido)"] = [
        (f"[{ic[k][0]:.3f} – {ic[k][1]:.3f}]" if k in ic else "") for k in nombres]
    t_met.rename_axis("Métrica").to_csv(out / "tabla_metricas.csv", encoding="utf-8-sig")

    mc = inf["test"]["umbral_optimo"]["matriz_confusion"]
    fig, ax = plt.subplots(figsize=(4.6, 4))
    m = np.array([[mc["tn"], mc["fp"]], [mc["fn"], mc["tp"]]])
    ax.imshow(m, cmap="Blues", vmin=0, vmax=m.max() * 1.15)
    for (i, j), v in np.ndenumerate(m):
        ax.text(j, i, f"{v:,}".replace(",", " "), ha="center", va="center", fontsize=14,
                color="white" if v > m.max() * 0.6 else TINTA)
    ax.set_xticks([0, 1], ["Sin alerta", "Alerta de riesgo"])
    ax.set_yticks([0, 1], ["Normal", "En riesgo"])
    ax.set_xlabel("Predicción del modelo", color=TINTA2)
    ax.set_ylabel("Resultado real al cierre 2025", color=TINTA2)
    ax.set_title(f"Matriz de confusión – prueba {inf['particion']['prueba']} (umbral {inf['umbral']['valor']:.3f})",
                 fontsize=10, color=TINTA, loc="left")
    ax.tick_params(colors=TINTA2, labelsize=9)
    fig.tight_layout()
    fig.savefig(out / "fig_matriz_confusion.png", dpi=200)
    plt.close(fig)

    roc = inf["curva_roc"]
    fig, ax = plt.subplots(figsize=(4.8, 4.4))
    estilo(ax, f"Curva ROC – prueba {inf['particion']['prueba']}")
    ax.plot([0, 1], [0, 1], color=GRIS, linestyle="--", linewidth=1.2, label="Azar (AUC = 0.50)")
    ax.plot(roc["fpr"], roc["tpr"], color=AZUL, linewidth=2,
            label=f"Random Forest (AUC = {inf['test']['umbral_optimo']['roc_auc']:.3f})")
    rg = inf["lineas_base"]["regla_alguna_C_en_B1B2"]
    ax.scatter([1 - rg["especificidad"]], [rg["sensibilidad_recall"]], s=60, color=NARANJA, zorder=3,
               edgecolor="white", linewidth=1.5, label="Situación actual (regla B1-B2)")
    o = inf["test"]["umbral_optimo"]
    ax.scatter([1 - o["especificidad"]], [o["sensibilidad_recall"]], s=60, color=AZUL, zorder=3,
               edgecolor="white", linewidth=1.5, label=f"RF en el umbral elegido ({o['umbral']:.3f})")
    ax.set_xlabel("Tasa de falsos positivos (1 − especificidad)", color=TINTA2)
    ax.set_ylabel("Sensibilidad", color=TINTA2)
    ax.set_xlim(-0.01, 1.01)
    ax.set_ylim(-0.01, 1.01)
    ax.legend(fontsize=8, frameon=False, loc="lower right")
    fig.tight_layout()
    fig.savefig(out / "fig_curva_roc.png", dpi=200)
    plt.close(fig)

    # ------------------------------------------------------------------ 4. Importancia
    imp = pd.read_csv(a.resultados / "importancia_permutacion.csv").head(12).iloc[::-1]
    fig, ax = plt.subplots(figsize=(6.4, 4.6))
    estilo(ax, "Importancia por permutación (caída de PR-AUC en 2025)")
    ax.grid(axis="y", visible=False)
    ax.barh(imp["variable"].map(etiqueta_variable), imp["importancia_media"], xerr=imp["desv_std"],
            color=AZUL, height=0.6, error_kw={"ecolor": TINTA2, "elinewidth": 1, "capsize": 2})
    ax.set_xlabel("Disminución media de PR-AUC (± desviación estándar, 20 repeticiones)", color=TINTA2, fontsize=9)
    fig.tight_layout()
    fig.savefig(out / "fig_importancia_variables.png", dpi=200)
    plt.close(fig)
    imp.iloc[::-1].assign(etiqueta=lambda d: d["variable"].map(etiqueta_variable)).to_csv(
        out / "tabla_importancia_variables.csv", index=False, encoding="utf-8-sig")

    # ------------------------------------------------------------------ 5. Contraste de hipótesis
    pr = pd.read_csv(a.resultados / "predicciones_prueba.csv")
    pr["aula"] = pr["sede"].astype(str) + " | " + pr["grado"].astype(str) + "° | " + pr["seccion"].astype(str)
    pr["pred_rf_05"] = (pr["proba_rf"] >= 0.5).astype(int)
    hip = []
    for umbral_txt, col in ((f"umbral elegido ({inf['umbral']['valor']:.3f})", "pred_rf"), ("umbral 0.5", "pred_rf_05")):
        pares = []
        for aula, g in pr.groupby("aula"):
            r, b = metricas_aula(g, col), metricas_aula(g, "pred_regla_B1B2")
            pares.append({"aula": aula, **{f"{k}_rf": v for k, v in r.items()}, **{f"{k}_regla": v for k, v in b.items()}})
        pares = pd.DataFrame(pares)
        for h, met in (("H1", "sensibilidad"), ("H2", "precision"), ("H3", "f1")):
            hip.append({"hipotesis": h, "umbral_rf": umbral_txt, **contraste(pares, met)})
        if col == "pred_rf":
            pares.to_csv(out / "metricas_por_aula_prueba.csv", index=False, encoding="utf-8-sig")
    t_hip = pd.DataFrame(hip)
    t_hip.to_csv(out / "tabla_contraste_hipotesis.csv", index=False, encoding="utf-8-sig")

    resumen = {"n_aulas_prueba": int(pr["aula"].nunique()), "flujo_total": tot.astype(int).to_dict(),
               "reglas": reglas.set_index("Regla")["Registros"].to_dict(),
               "mcnemar": inf["pruebas_mcnemar"], "hipotesis": hip}
    # ------------------------------------------------------------------ 6. Despliegue: predicción 2026 (agregada)
    p26 = pd.read_csv(a.resultados / "predicciones_2026.csv")
    def resumen_2026(g):
        return pd.Series({"Estudiantes": len(g), "Con alerta": int(g["alerta_riesgo"].sum()),
                          "% con alerta": round(100 * g["alerta_riesgo"].mean(), 1),
                          "Probabilidad media": round(g["probabilidad_riesgo"].mean(), 3)})
    t26_sede = p26.groupby("sede").apply(resumen_2026).reset_index().rename(columns={"sede": "Sede"})
    t26_grado = p26.groupby("grado").apply(resumen_2026).reset_index().rename(columns={"grado": "Grado"})
    t26_total = resumen_2026(p26).to_dict()
    t26_sede.to_csv(out / "tabla_prediccion_2026_por_sede.csv", index=False, encoding="utf-8-sig")
    t26_grado.to_csv(out / "tabla_prediccion_2026_por_grado.csv", index=False, encoding="utf-8-sig")

    tablas = {"prediccion_2026_sede": t26_sede, "prediccion_2026_grado": t26_grado,
              "preprocesamiento": t_flujo, "reglas": reglas, "tipos_problema": tipos,
              "exclusiones_sede": det_sede.reset_index(), "configuracion": pd.DataFrame(conf),
              "metricas": t_met.rename_axis("Métrica").reset_index(), "importancia": imp.iloc[::-1].assign(etiqueta=lambda d: d["variable"].map(etiqueta_variable)),
              "hipotesis": t_hip}
    (out / "tablas.json").write_text(json.dumps(
        {k: json.loads(v.to_json(orient="records", force_ascii=False)) for k, v in tablas.items()}
        | {"informe": inf, "n_aulas_prueba": int(pr["aula"].nunique()), "perfil": perfil,
           "prediccion_2026_total": {k: float(v) for k, v in t26_total.items()}},
        ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(t_flujo.to_string(index=False))
    print(reglas[["Regla", "Criterio de exclusión", "Registros"]].to_string(index=False))
    print(t_met.to_string())
    print(t_hip.to_string(index=False))


if __name__ == "__main__":
    main()
