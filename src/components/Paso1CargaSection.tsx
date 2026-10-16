import React, { useRef, useState } from 'react';
import { UploadCloud, Download, RefreshCw } from 'lucide-react';
import { ResultadoAuditoria } from '../types';
import { descargarPlantilla } from '../utils/exportar';
import { Aviso, Card, NavPasos, Stat, miles } from './ui';

interface Props {
  auditoria: ResultadoAuditoria | null;
  onFileUpload: (file: File) => Promise<void>;
  onNextStep: () => void;
}

export const Paso1CargaSection: React.FC<Props> = ({ auditoria, onFileUpload, onNextStep }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);

  const cargar = async (file?: File) => {
    if (!file) return;
    setLeyendo(true);
    try {
      await onFileUpload(file);
    } finally {
      setLeyendo(false);
    }
  };

  const p = auditoria?.perfil;

  return (
    <div className="space-y-6 tab-content-enter">
      <Card>
        <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-2">PASO 1 · CARGA DEL EXCEL</div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sube el Excel de notas 2020-2026</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
          El archivo se valida en tu navegador con las mismas reglas que <code>tesis-rf/src/auditar_excel.py</code>.
          No se imputa nada: una nota vacía, un guion, un token inválido, una sede o un año inválidos excluyen el registro
          y quedan anotados con su motivo. El modelo no se entrena aquí; se entrena con el pipeline Python.
        </p>

        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Formato que necesita el modelo (una fila por estudiante-año):</span>
          <code className="text-[11px] text-slate-600 dark:text-slate-300">
            ID_Estudiante, Sexo, Sede, Grado, Año_Academico, &lt;Curso&gt;_B1, &lt;Curso&gt;_B2, &lt;Curso&gt;_Final
          </code>
        </div>

        <div
          onDrop={e => { e.preventDefault(); cargar(e.dataTransfer.files?.[0]); }}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-8 sm:p-10 text-center cursor-pointer bg-slate-50/60 dark:bg-slate-800/20 transition-all mt-5 group"
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { cargar(e.target.files?.[0]); e.target.value = ''; }} />
          {leyendo
            ? <RefreshCw className="w-10 h-10 mx-auto text-blue-500 animate-spin mb-2.5" />
            : <UploadCloud className="w-10 h-10 mx-auto text-slate-400 group-hover:text-blue-600 transition-colors mb-2.5" />}
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {leyendo ? 'Validando…' : p ? `Archivo cargado: ${p.archivo}` : 'Arrastra aquí el Excel o CSV, o haz clic para elegirlo'}
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={descargarPlantilla}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 cursor-pointer flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Plantilla por bimestre (.xlsx)</span>
          </button>
        </div>
      </Card>

      {p && (
        <>
          {p.advertencia_fuga && (
            <Aviso tipo="alerta" title="Este archivo trae una sola nota por curso: con él no se puede entrenar sin fuga de información">
              <p>
                Si la etiqueta «en riesgo» es «algún curso en C» y esas mismas notas son las variables, cualquier modelo
                acierta casi el 100% por construcción. Eso no demuestra capacidad predictiva.
              </p>
              <p>
                Para entrenar hay que exportar del sistema académico, para 2020-2025, las notas de <strong>cada bimestre</strong> (B1, B2)
                y la nota final de cada curso. Para 2026 bastan B1 y B2 por separado (no su promedio).
                Puedes revisar la validación y la exclusión en el Paso 2.
              </p>
            </Aviso>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Filas leídas" value={miles(p.total_bruto)} hint={`Hoja «${p.hoja_usada}»`} />
            <Stat label="Registros válidos" value={miles(p.total_validos)} tone="emerald" />
            <Stat label="Excluidos" value={miles(p.total_excluidos)} tone="red" hint={`${p.porcentaje_excluidos}% del total`} />
            <Stat label="Formato" value={<span className="text-base">{p.formato_detectado === 'por_bimestre' ? 'Por bimestre' : 'Una nota por curso'}</span>}
              tone={p.formato_detectado === 'por_bimestre' ? 'emerald' : 'amber'} hint={`${Object.keys(p.cursos).length} cursos detectados`} />
          </div>

          <Card title="Columnas identificadas">
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <ul className="space-y-1">
                {Object.entries(p.columnas_identificadas).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2 border-b border-slate-100 dark:border-slate-800 py-1">
                    <span className="text-slate-500">{k}</span>
                    <span className={`font-mono ${v ? 'text-slate-800 dark:text-slate-200' : 'text-red-600'}`}>{v ?? 'no encontrada'}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1">
                {Object.entries(p.cursos).map(([c, etapas]) => (
                  <li key={c} className="flex justify-between gap-2 border-b border-slate-100 dark:border-slate-800 py-1">
                    <span className="text-slate-700 dark:text-slate-300">{c}</span>
                    <span className="font-mono text-slate-500">{etapas.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <NavPasos onNext={onNextStep} nextLabel="Paso 2: Validación y exclusión" />
        </>
      )}
    </div>
  );
};
