import React, { useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  Sparkles, 
  ArrowRight,
  Database,
  Building2,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { StudentRecord } from '../types';
import { descargarPlantillaEstandarColab } from '../utils/colabEngine';

interface Paso1CargaSectionProps {
  records: StudentRecord[];
  onFileUpload: (file: File) => void;
  onLoadDemoData: () => void;
  onNextStep: () => void;
}

export const Paso1CargaSection: React.FC<Paso1CargaSectionProps> = ({
  records,
  onFileUpload,
  onLoadDemoData,
  onNextStep,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
  };

  const trainCount = records.filter(r => r.anio_academico <= 2025).length;
  const testCount = records.filter(r => r.anio_academico === 2026).length;

  // Sedes detectadas
  const sedesDetectadas = Array.from(new Set(records.map(r => r.sede).filter(Boolean)));

  return (
    <div className="space-y-6 tab-content-enter">
      
      {/* Colab Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-2">
          <span>📥 PASO 1</span>
          <span>·</span>
          <span>INGESTA DE DATOS 2020 - 2026</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sube tu archivo de datos (Cohortes 2020 a 2026)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
          Lectura robusta compatible con libros <strong>.xlsx / .xls</strong> y archivos delimitados por <strong>;</strong> o <strong>,</strong> (UTF-8 y Latin-1). El sistema procesará las notas que vienen combinadas en letras (AD, A, B, C) y números vigesimales (0 a 20), clasificando a los alumnos de las <strong>5 sedes institucionales</strong>.
        </p>

        {/* Encabezados Requeridos Banner */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Columnas oficiales del archivo Excel / CSV:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
              ID_Estudiante (o Código/Nombre)
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              Sede (5 Sedes)
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
              Año_Academico (2020..2026)
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
              Sexo (Femenino / Masculino)
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:purple-800 font-semibold">
              Cursos (Curso_Matematica, Curso_Comunicacion...)
            </span>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-8 sm:p-10 text-center cursor-pointer bg-slate-50/60 dark:bg-slate-800/20 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all mt-5 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleInputChange}
            className="hidden"
          />
          <UploadCloud className="w-10 h-10 mx-auto text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2.5" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {records.length > 0 
              ? `Dataset cargado: ${records.length} registros listos`
              : 'Arrastra aquí tu archivo Excel o CSV final o haz clic para explorar'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Detecta automáticamente la columna de Sede (5 sedes), cursos bimestrales, notas en letras/números y partición temporal.
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={descargarPlantillaEstandarColab}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Descargar Plantilla Oficial (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={onLoadDemoData}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cargar Dataset Demo (2020 - 2026)</span>
            </button>
          </div>

          {records.length > 0 && (
            <button
              type="button"
              onClick={onNextStep}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              <span>Continuar a Paso 2: Estandarización</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dataset Summary Cards if data is loaded */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Registros Cargados
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {records.length}
            </div>
            <p className="text-[11px] text-slate-400">
              Cohortes completas 2020 a 2026
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-1">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Entrenamiento (2020 - 2025)
            </span>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
              {trainCount}
            </div>
            <p className="text-[11px] text-slate-400">
              df_train: Registros históricos
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Validación / Prueba (2026)
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {testCount}
            </div>
            <p className="text-[11px] text-slate-400">
              df_test: B1+B2 consolidados
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Sedes Detectadas
              </span>
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
              {sedesDetectadas.length}
            </div>
            <p className="text-[11px] text-slate-400 truncate" title={sedesDetectadas.join(', ')}>
              {sedesDetectadas.slice(0, 3).join(', ')}{sedesDetectadas.length > 3 ? '...' : ''}
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
