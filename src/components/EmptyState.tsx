import React, { useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  Sparkles, 
  Layers, 
  Cpu, 
  Target, 
  ArrowRight,
  Database
} from 'lucide-react';
import { downloadOfficialExcelTemplate } from '../utils/excelService';

interface EmptyStateProps {
  onOpenFilePicker: () => void;
  onFileUpload: (file: File) => void;
  onLoadDemoData: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenFilePicker,
  onFileUpload,
  onLoadDemoData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      
      {/* Hero Welcome Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 text-center space-y-6 shadow-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 mx-auto">
          <FileSpreadsheet className="w-7 h-7" />
        </div>

        <div className="max-w-2xl mx-auto space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Plataforma de Predicción de Rendimiento Académico
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            El sistema está listo para ser alimentado. Puedes cargar tu archivo Excel (.xlsx, .xls) o CSV con el histórico de estudiantes (2020 a 2025) y la cohorte actual 2026 (promedio consolidado de bimestres 1 y 2) para desarrollar y probar el algoritmo Random Forest.
          </p>
        </div>

        {/* Drag & Drop Upload Surface */}
        <div 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-8 sm:p-10 text-center cursor-pointer bg-slate-50/70 dark:bg-slate-800/30 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all max-w-2xl mx-auto group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleInputChange}
            className="hidden"
          />
          <UploadCloud className="w-10 h-10 mx-auto text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Arrastra tu archivo Excel aquí o haz clic para explorar
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compatible con libros .xlsx, .xls y archivos delimitados .csv
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>año</span>
            <span>·</span>
            <span>nombre o codigo estudiante</span>
            <span>·</span>
            <span>sexo</span>
            <span>·</span>
            <span>pais</span>
            <span>·</span>
            <span>cursos</span>
            <span>·</span>
            <span>promedio_b1_b2</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Cargar Archivo Excel</span>
          </button>

          <button
            type="button"
            onClick={downloadOfficialExcelTemplate}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Descargar Plantilla Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={onLoadDemoData}
            className="px-5 py-2.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Cargar Dataset Recopilado 2020-2026 (Demo)</span>
          </button>
        </div>
      </div>

      {/* Structured Pipeline Phases Explainer */}
      <div className="space-y-4">
        <div className="text-center sm:text-left">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Fases del Proyecto de Predicción
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Estructura metodológica para el desarrollo y entrega final del algoritmo
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">Fase 01</span>
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recopilación e Ingesta
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Carga masiva en Excel de registros históricos 2020-2025 y registros activos 2026 con validación de columnas.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">Fase 02</span>
              <Cpu className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Entrenamiento 2020-2025
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ajuste del ensamble Random Forest con datos consolidados de 4 bimestres y validación cruzada multiclase.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">Fase 03</span>
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Prueba & Alerta 2026
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Inferencia temprana con el promedio consolidado de los bimestres 1 y 2 para detectar riesgo a tiempo.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">Fase 04</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Métricas & Conclusiones
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Matriz de confusión, ROC-AUC, importancia de características y exportación de informe para el término del proyecto.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
