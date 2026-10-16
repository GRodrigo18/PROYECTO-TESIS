// Uso: node tesis-rf/informe/generar_informe_docx.cjs tesis-rf/resultados/informe_tesis salida.docx  (requiere: npm i docx)
// Genera el informe Word del capítulo de Resultados desde tesis-rf/resultados/informe_tesis/.
// Toda cifra sale de tablas.json (calculado por informe_tesis.py); nada se escribe a mano.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, HeadingLevel,
  AlignmentType, WidthType, ShadingType, BorderStyle, LevelFormat, PageBreak, Footer, PageNumber,
} = require("docx");

const DIR = process.argv[2];
const SALIDA = process.argv[3];
const T = JSON.parse(fs.readFileSync(path.join(DIR, "tablas.json"), "utf8"));
const inf = T.informe;
const opt = inf.test.umbral_optimo;
const m05 = inf.test["umbral_0.5"];
const regla = inf.lineas_base.regla_alguna_C_en_B1B2;
const logit = inf.lineas_base.regresion_logistica;
const ic = inf.test.ic95_bootstrap_umbral_optimo;

const FONT = "Arial";
const ANCHO = 9026; // A4 con márgenes de 2.5 cm (DXA)
const pct = (v, d = 1) => (v * 100).toFixed(d).replace(".", ",") + " %";
const num = (v, d = 3) => (v === null || v === undefined ? "—" : Number(v).toFixed(d).replace(".", ","));
const miles = (v) => Number(v).toLocaleString("es-PE").replace(/,/g, " ");
const sede = (s) => (s === "La Ascension" ? "La Ascensión" : s);

let nTabla = 0;
let nFig = 0;

const p = (texto, opts = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 300 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    children: (Array.isArray(texto) ? texto : [texto]).map((t) =>
      typeof t === "string" ? new TextRun({ text: t, font: FONT, size: 22 }) : t),
  });
const b = (t) => new TextRun({ text: t, bold: true, font: FONT, size: 22 });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 },
  children: [new TextRun({ text: t, font: FONT, bold: true, size: 28 })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 },
  children: [new TextRun({ text: t, font: FONT, bold: true, size: 24 })] });
const vineta = (t) => new Paragraph({ numbering: { reference: "vinetas", level: 0 }, spacing: { after: 80 },
  children: (Array.isArray(t) ? t : [t]).map((x) => (typeof x === "string" ? new TextRun({ text: x, font: FONT, size: 22 }) : x)) });
const fuente = (t = "Fuente: Elaborado por los autores a partir de los registros académicos del grupo educativo.") =>
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: t, font: FONT, size: 18, italics: true })] });

function titulo(tipo, texto) {
  const n = tipo === "Tabla" ? ++nTabla : ++nFig;
  return new Paragraph({ spacing: { before: 160, after: 80 }, keepNext: true,
    children: [new TextRun({ text: `${tipo} ${n}. `, bold: true, font: FONT, size: 20 }),
      new TextRun({ text: texto, font: FONT, size: 20, italics: true })] });
}

const borde = { style: BorderStyle.SINGLE, size: 4, color: "8A8984" };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };
function tabla(cabecera, filas, anchos) {
  const total = anchos.reduce((a, x) => a + x, 0);
  const w = anchos.map((x) => Math.round((x / total) * ANCHO));
  w[w.length - 1] += ANCHO - w.reduce((a, x) => a + x, 0);
  const celda = (txt, i, cab, negrita) => new TableCell({
    width: { size: w[i], type: WidthType.DXA }, borders: bordes,
    shading: cab ? { type: ShadingType.CLEAR, color: "auto", fill: "E4E3DF" } : undefined,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: [new Paragraph({ alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: [new TextRun({ text: String(txt), font: FONT, size: 18, bold: cab || negrita })] })],
  });
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA }, columnWidths: w,
    rows: [new TableRow({ tableHeader: true, children: cabecera.map((c, i) => celda(c, i, true)) }),
      ...filas.map((f) => new TableRow({ children: f.map((c, i) => celda(c, i, false, f._negrita)) }))],
  });
}
const imagen = (archivo, ancho) => {
  const buf = fs.readFileSync(path.join(DIR, archivo));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  return new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [new ImageRun({
    type: "png", data: buf, transformation: { width: ancho, height: Math.round((ancho * h) / w) } })] });
};

// ---------------------------------------------------------------- datos derivados
const pre = T.preprocesamiento;
const total = pre.find((r) => r["Año"] === "Total");
const anios = pre.filter((r) => r["Año"] !== "Total");
const R = Object.fromEntries(T.reglas.map((r) => [r.Regla, r]));
const part = inf.particion;
const tipos = Object.fromEntries(T.tipos_problema.map((r) => [r["Problema en la nota"], r["Notas afectadas"]]));
const col = (r, prefijo) => Math.abs(r[Object.keys(r).find((k) => k.startsWith(prefijo))] || 0);
const excluidosValid = Math.abs(total["V5 Nota final (PF) vacía o inválida en algún área"]) +
  Math.abs(total["V6 Nota de B1 o B2 vacía o inválida en algún área"]);
const finales = total["Registros finales (válidos)"];
const consolidados = total["Registros consolidados"];
const hip = T.hipotesis;
const hipPrim = hip.filter((h) => h.umbral_rf.startsWith("umbral elegido"));
const hipSec = hip.filter((h) => h.umbral_rf === "umbral 0.5");
const NOMBRE_MET = { sensibilidad: "Sensibilidad", precision: "Precisión", f1: "F1-Score" };
const mcn = inf.pruebas_mcnemar;

// ---------------------------------------------------------------- contenido
const c = [];
c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [
  new TextRun({ text: "Informe de resultados del modelo Random Forest", font: FONT, bold: true, size: 32 })] }));
c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [
  new TextRun({ text: "Predicción temprana del bajo rendimiento académico — grupo educativo Lima 2020-2026",
    font: FONT, size: 22, italics: true })] }));
c.push(p("Este informe documenta, paso a paso y con cifras calculadas desde los datos, el procesamiento de los registros académicos, la configuración y la evaluación del modelo, y el contraste de hipótesis. Está ordenado según las fases de CRISP-DM y los apartados del capítulo III del plan de tesis. Cada tabla y figura se genera con los scripts del repositorio (consolidar_notas.py, auditar_excel.py, pipeline_rf_tesis.py e informe_tesis.py), por lo que el proceso es reproducible."));
c.push(new Paragraph({ children: [new PageBreak()] }));

// 1. Comprensión de los datos
c.push(h1("1. Comprensión de los datos"));
c.push(p("La fuente fueron los reportes exportados del sistema académico para cada año de 2020 a 2026, organizados en dos carpetas:"));
c.push(vineta([b("Consolidado_Notas_Curso: "), "un archivo por sección con las notas de cada área en los bimestres 1, 2, 3 y 4 y el promedio final (PF). El nombre del estudiante aparece abreviado (Apellido1 Inicial. Nombre) y no incluye DNI ni sexo."]));
c.push(vineta([b("Consolidado_Datos_Estudiante: "), "un archivo por sección con la ficha del estudiante: nombre completo, DNI, sexo, sede, grado y sección."]));
c.push(p(["Solo se consideró el nivel secundaria (1.° a 5.° grado) en las cinco sedes: Central, La Ascensión, Avantgard Lima, Industrial y Avantgard Huaura. En total se recibieron ",
  b(miles(total["Fichas de estudiantes (secundaria)"])), " fichas de estudiantes y ", b(miles(total["Registros de notas en bruto"])),
  " registros de notas. Las notas se registraron en escala vigesimal (0-20) en 2020-2021 y de forma mixta (literal AD/A/B/C y vigesimal) desde 2022."]));
c.push(p("Las áreas que ingresaron al modelo son las cinco presentes en todos los grados y sedes: Comunicación, Inglés, Matemática, Ciencia y Tecnología y Ciencias Sociales. Las demás áreas (DPCC, Educación Física, Religión, talleres) tienen vacíos frecuentes o no se dictan en todos los grados, y los subcursos internos (Álgebra, Plan Lector, etc.) ya están resumidos en la nota del área."));

// 2. Preparación: reglas de exclusión
c.push(h1("2. Preparación de los datos: reglas de exclusión"));
c.push(p("La preparación se hizo en dos fases. En la consolidación se unió cada registro de notas con la ficha del estudiante (por sede, grado y nombre) y se reemplazó el DNI por un código seudónimo (HMAC-SHA256 con clave privada), estable entre años, de modo que ningún dato identificable llega al análisis. En la validación se revisó cada nota de las cinco áreas. Ningún dato se imputó ni se corrigió a mano: un registro que no cumple una regla se excluye y queda anotado con su motivo, fila por fila."));
c.push(titulo("Tabla", "Reglas de exclusión aplicadas y registros afectados."));
c.push(tabla(["Regla", "Fase", "Criterio de exclusión", "Cómo se aplica", "Registros"],
  T.reglas.map((r) => [r.Regla, r.Fase, r["Criterio de exclusión"], r["Cómo se aplica"], miles(r.Registros)]),
  [9, 16, 25, 38, 12]));
c.push(fuente());
c.push(p(["Cuando un registro incumple más de una regla de validación se contabiliza en la primera, en el orden V1 a V6. Las reglas V1 a V4 no excluyeron ningún registro, lo que confirma que los años, sedes, identificadores y combinaciones estudiante-año eran consistentes. Toda la exclusión de la validación provino de notas faltantes: ",
  b(miles(tipos.nulo || 0)), " notas vacías y ", b(miles(tipos.guion_o_vacio || 0)),
  " registradas con guion («-»), en B1, B2 o PF de alguna de las cinco áreas. Las notas de B3 y B4 no se usan en el modelo; sus vacíos se reportaron para revisión, pero no excluyeron registros."]));
c.push(h2("2.1 Casos particulares documentados"));
c.push(vineta([b("2020 – Avantgard Lima 3.° (regla C2): "), `${R.C2.Registros} estudiantes con notas pero sin ficha de datos; el sistema no conserva esas fichas, por lo que el grado se excluye.`]));
c.push(vineta([b("2022 – Industrial (reglas C1 y C3): "), `los archivos de notas de Industrial son una copia exacta de los de Avantgard Lima (${R.C1.Registros} estudiantes con nombres y notas idénticos, verificado archivo por archivo). La copia se descartó y las fichas de Industrial 2022 quedaron sin notas propias.`]));
c.push(vineta([b("2025 – Industrial 4.° sección «S. Paul Jobs» (regla C3): "), "existe la ficha pero no el archivo de notas de esa sección."]));
c.push(vineta([b("Nombres alternativos de área: "), "en 2023 la matemática de Avantgard Huaura 1.°-2.° figura como «MATEMÁTICA-SINGAPUR» y Ciencias Sociales de La Ascensión 1.° como «Ciencias Sociales»; se verificó que tienen las mismas notas que el área. En La Ascensión 3.° 2025 un subcurso aparece rotulado «MATEMÁTICA»; se usó la columna del área, que es la que cierra el grupo de subcursos."]));
c.push(vineta([b("Gemelos con el mismo nombre abreviado (Central 2023-2024): "), "se asignaron a su ficha por la sección."]));

c.push(h2("2.2 Registros iniciales frente a registros finales"));
c.push(titulo("Tabla", "Descriptivo de registros iniciales y finales por año."));
c.push(tabla(["Año", "Notas en bruto", "C1 Copia", "C2 Sin ficha", "Consolidados", "V5 Sin PF", "V6 Sin B1/B2", "Finales", "Uso en el modelo"],
  pre.map((r) => {
    const f = [r["Año"], miles(r["Registros de notas en bruto"]), miles(col(r, "C1")), miles(col(r, "C2")),
      miles(r["Registros consolidados"]), miles(col(r, "V5")), miles(col(r, "V6")),
      miles(r["Registros finales (válidos)"]), r["Rol en el modelo"] || ""];
    if (r["Año"] === "Total") f._negrita = true;
    return f;
  }), [8, 11, 9, 10, 12, 10, 11, 10, 16]));
c.push(fuente());
const pctFin = finales / total["Registros de notas en bruto"];
c.push(p(["De ", b(miles(total["Registros de notas en bruto"])), " registros de notas iniciales se obtuvieron ",
  b(miles(finales)), " registros finales (", pct(pctFin), "). La consolidación retiró ",
  miles(R.C1.Registros + R.C2.Registros), " registros (C1 y C2) y la validación ", miles(excluidosValid),
  ` (${pct(excluidosValid / consolidados)} de los consolidados). Además, ${miles(R.C3.Registros)} fichas no tenían registro de notas (C3) y no forman parte del conjunto. Para 2026 solo se exigen B1 y B2, porque el año aún no cierra.`]));
c.push(titulo("Tabla", "Registros excluidos en la validación por sede."));
c.push(tabla(["Sede", "V5 Sin PF", "V6 Sin B1/B2", "Total"],
  T.exclusiones_sede.map((r) => [sede(r.sede), miles(r.V5 || 0), miles(r.V6 || 0), miles((r.V5 || 0) + (r.V6 || 0))]),
  [40, 20, 20, 20]));
c.push(fuente());

c.push(h2("2.3 Transformación de variables"));
c.push(vineta([b("Estandarización (escala MINEDU): "), "AD = 18-20 → 3; A = 14-17 → 2; B = 11-13 → 1; C = 0-10 → 0. Un número entre 0 y 3 en un año registrado mayoritariamente en letras se trata como sospechoso y no como nota válida."]));
c.push(vineta([b("Variables predictoras (X): "), "notas de B1 y B2 de las cinco áreas, la tendencia B2 − B1 por área, el promedio, la nota mínima, el número de notas C y de notas B en B1-B2, el grado, la sede y el sexo."]));
c.push(vineta([b("Variable objetivo (y): "), "bajo rendimiento = al menos un área con promedio final (PF) en C. La nota final nunca entra como predictor, para evitar fuga de información."]));
c.push(vineta([b("Partición temporal: "), `entrenamiento ${part.entrenamiento} (${miles(part.n_train)} registros, ${pct(part.prevalencia_train)} con bajo rendimiento), prueba ${part.prueba} (${miles(part.n_test)} registros, ${pct(part.prevalencia_test)}) y predicción ${part.prediccion} (${miles(part.n_2026)} registros, sin nota final).`]));

// 3. Modelado
c.push(h1("3. Configuración y entrenamiento del modelo"));
c.push(p("Los hiperparámetros se eligieron con RandomizedSearchCV (40 combinaciones) y validación cruzada dejando un año fuera sobre 2020-2024, optimizando el área bajo la curva precisión-sensibilidad (PR-AUC), adecuada para clases desbalanceadas. El umbral de decisión se fijó con predicciones fuera de muestra del entrenamiento, sin mirar 2025: la mayor precisión que mantiene una sensibilidad de al menos 0,90."));
c.push(titulo("Tabla", "Configuración del modelo Random Forest."));
const valorConf = (r) => (r["Parámetro"] === "class_weight" && r.Valor === "sin límite / ninguno" ? "ninguna" : r.Valor);
c.push(tabla(["Parámetro", "Descripción", "Valor"],
  T.configuracion.map((r) => [r["Parámetro"], r["Descripción"], String(valorConf(r))]), [22, 52, 26]));
c.push(fuente());
const pa = inf.cv_pr_auc_por_anio_validacion;
c.push(p([`La PR-AUC media en la validación cruzada fue ${num(inf.cv_leave_one_year_out_pr_auc)}, con valores por año validado entre ${num(Math.min(...Object.values(pa)))} y ${num(Math.max(...Object.values(pa)))}; la brecha entre entrenamiento y validación fue ${num(inf.brecha_entrenamiento_validacion_pr_auc)}, lo que indica un sobreajuste bajo.`]));

// 4. Evaluación
c.push(h1("4. Evaluación del modelo y métricas de clasificación"));
c.push(p(`La evaluación se realizó sobre la cohorte ${part.prueba}, que el modelo no vio durante el entrenamiento ni la elección del umbral.`));
c.push(titulo("Figura", `Matriz de confusión en la prueba ${part.prueba}.`));
c.push(imagen("fig_matriz_confusion.png", 380));
c.push(fuente());
const mc = opt.matriz_confusion;
c.push(p([`De ${miles(mc.tp + mc.fn)} estudiantes que terminaron con bajo rendimiento, el modelo alertó a ${miles(mc.tp)} y dejó sin alerta a ${miles(mc.fn)}. De ${miles(mc.tn + mc.fp)} estudiantes sin bajo rendimiento, ${miles(mc.fp)} recibieron una alerta (falsos positivos).`]));
c.push(titulo("Figura", `Curva ROC en la prueba ${part.prueba}.`));
c.push(imagen("fig_curva_roc.png", 400));
c.push(fuente());
c.push(p(`El área bajo la curva ROC fue ${num(opt.roc_auc)} (IC 95 %: ${num(ic.roc_auc[0])} – ${num(ic.roc_auc[1])}): el modelo ordena casi siempre a un estudiante con bajo rendimiento por encima de uno sin él. El punto naranja (situación actual) queda prácticamente sobre el punto del modelo en el umbral elegido.`));
c.push(titulo("Tabla", `Métricas de clasificación en la prueba ${part.prueba}.`));
c.push(tabla(["Métrica", "RF (umbral elegido)", "IC 95 %", "RF (umbral 0,5)", "Situación actual", "Regresión logística"],
  T.metricas.map((r) => [r["Métrica"], num(r["Random Forest (umbral elegido)"]), r["IC 95% (RF, umbral elegido)"].replace(/\./g, ","),
    num(r["Random Forest (umbral 0.5)"]), num(r["Situación actual: regla «alguna C en B1-B2»"]), num(r["Regresión logística"])]),
  [20, 16, 18, 15, 15, 16]));
c.push(fuente("Fuente: Elaborado por los autores. Situación actual = alerta cuando el estudiante tiene alguna nota C en B1 o B2. IC 95 % por bootstrap (1 000 remuestreos)."));
c.push(p([`Con el umbral elegido (${num(opt.umbral)}), el modelo alcanzó una sensibilidad de ${pct(opt.sensibilidad_recall)}, una precisión de ${pct(opt.precision)} y un F1-Score de ${num(opt.f1)}. Con el umbral 0,5, la precisión sube a ${pct(m05.precision)} y el F1-Score a ${num(m05.f1)}, pero la sensibilidad baja a ${pct(m05.sensibilidad_recall)}. La situación actual detecta a todos los estudiantes en riesgo (sensibilidad ${pct(regla.sensibilidad_recall)}) con una precisión de ${pct(regla.precision)}. La principal ventaja del modelo es su capacidad de ordenar por riesgo: PR-AUC ${num(opt.pr_auc)} frente a ${num(regla.pr_auc)} de la regla.`]));

// 5. Importancia
c.push(h1("5. Importancia de las variables predictoras"));
c.push(titulo("Figura", "Importancia de las variables por permutación."));
c.push(imagen("fig_importancia_variables.png", 470));
c.push(fuente());
const top = T.importancia.slice(0, 4).map((r) => r.etiqueta);
c.push(p(`La importancia por permutación mide cuánto empeora la PR-AUC en ${part.prueba} cuando se desordena una variable. Las variables más influyentes fueron ${top.slice(0, -1).join(", ")} y ${top[top.length - 1]}. La sede y el sexo no aparecen entre las más importantes.`));

// 6. Contraste de hipótesis
c.push(h1("6. Contrastación de hipótesis"));
c.push(p([`Cada hipótesis compara el modelo con la situación actual (alerta por alguna nota C en B1-B2). La unidad de análisis es el aula (sección) de la cohorte ${part.prueba} (${T.n_aulas_prueba} aulas). En cada aula se calculó la métrica con ambos métodos; la normalidad de las diferencias pareadas se evaluó con Shapiro-Wilk y, según su resultado, se aplicó la prueba t de Student para muestras relacionadas o la de Wilcoxon de rangos con signo, ambas unilaterales (H1: el modelo supera a la situación actual), con α = 0,05. La sensibilidad se calcula solo en aulas con al menos un estudiante en riesgo, y la precisión solo en aulas con al menos una alerta de cada método.`]));
const filaHip = (h) => [h.hipotesis, NOMBRE_MET[h.metrica], String(h.n_aulas),
  h.shapiro_p === null ? "—" : `W = ${num(h.shapiro_w)}; p = ${num(h.shapiro_p)} (${h.normalidad})`,
  h.prueba.replace(" (unilateral)", ""), h.p_valor === null ? "—" : num(h.p_valor, 4), h.decision];
c.push(titulo("Tabla", `Contrastación de hipótesis (umbral elegido ${num(opt.umbral)}).`));
c.push(tabla(["Hipótesis", "Métrica evaluada", "Aulas", "Normalidad (Shapiro-Wilk)", "Prueba de contraste", "P-valor", "Decisión final"],
  hipPrim.map(filaHip), [11, 13, 8, 19, 19, 9, 21]));
c.push(fuente());
c.push(titulo("Tabla", "Análisis complementario con umbral 0,5."));
c.push(tabla(["Hipótesis", "Métrica evaluada", "Aulas", "Normalidad (Shapiro-Wilk)", "Prueba de contraste", "P-valor", "Decisión final"],
  hipSec.map(filaHip), [11, 13, 8, 19, 19, 9, 21]));
c.push(fuente());
const t = mcn.RF_vs_regla_B1B2, l = mcn.RF_vs_logistica;
c.push(p([`A nivel de estudiante, la prueba de McNemar comparó los aciertos del modelo y de la situación actual: el modelo acertó en ${t.a_acierta_b_falla} casos donde la regla falló y la regla en ${t.b_acierta_a_falla} donde el modelo falló (χ² = ${num(t.chi2)}; p = ${num(t.p_valor, 4)}). Frente a la regresión logística, la diferencia fue ${l.a_acierta_b_falla} contra ${l.b_acierta_a_falla} (p = ${num(l.p_valor, 4)}).`]));
c.push(h2("6.1 Interpretación"));
const dec = (h) => (h.decision.startsWith("Se rechaza") ? "se acepta" : "no se acepta");
c.push(p([b("Con el umbral elegido, "), `${hipPrim.map((h) => `${h.hipotesis} (${NOMBRE_MET[h.metrica].toLowerCase()}) ${dec(h)}`).join("; ")}. Con ese umbral el modelo se comporta casi igual que la regla actual: detecta prácticamente a los mismos estudiantes con una cantidad similar de alertas.`]));
c.push(p([b("Con el umbral 0,5, "), `${hipSec.map((h) => `${h.hipotesis} (${NOMBRE_MET[h.metrica].toLowerCase()}) ${dec(h)}`).join("; ")}. El modelo reduce fuertemente las falsas alarmas a costa de detectar menos casos.`]));
c.push(p("Estos resultados indican que el aporte del Random Forest no está en detectar más estudiantes que la regla actual (que ya los detecta casi todos), sino en ordenarlos por nivel de riesgo y permitir elegir el equilibrio entre detección y falsas alarmas según la capacidad de intervención de la institución. Los resultados deben reportarse tal como se obtuvieron; el umbral no debe ajustarse después de ver la prueba."));

// 7. Observaciones
c.push(h1("7. Observaciones para alinear el capítulo II"));
c.push(vineta([b("Variables: "), "el plan menciona asistencia y conducta, pero los datos recibidos solo contienen notas, sede, grado, sección y sexo. El modelo no usa asistencia ni conducta."]));
c.push(vineta([b("Criterio de exclusión: "), "el plan indica descartar registros con más de 30 % de valores nulos. El criterio aplicado es más estricto: se excluye todo registro con alguna nota faltante en B1, B2 o PF de las cinco áreas, porque esas notas son las variables y la etiqueta."]));
c.push(vineta([b("Retirados: "), "el plan excluye a los alumnos retirados. Los datos no traen una marca de retiro; un retiro se refleja como notas faltantes y queda excluido por V5 o V6."]));
c.push(vineta([b("Comparación de las hipótesis: "), "se tomó como situación actual la regla «alguna nota C en B1-B2». Si la institución identifica el riesgo de otra forma, conviene describirla y usarla como referencia."]));

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 28, bold: true }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } }] },
  numbering: { config: [{ reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
    alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })] })] }) },
    children: c,
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(SALIDA, buf); console.log("ok", SALIDA); });
