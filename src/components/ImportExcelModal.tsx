import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle, 
  Download,
  Info
} from 'lucide-react';
import { StudentPrediction } from '../types';
import { parseExcelOrCsvFile, downloadOfficialExcelTemplate } from '../utils/excelService';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (students: StudentPrediction[], mode: 'replace' | 'append') => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportStudents,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<StudentPrediction[] | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      setFileName(file.name);

      const students = await parseExcelOrCsvFile(file);
      if (students.length === 0) {
        throw new Error('No se detectaron registros válidos en el archivo Excel/CSV.');
      }
      setParsedPreview(students);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo Excel.');
      setParsedPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedPreview && parsedPreview.length > 0) {
      onImportStudents(parsedPreview, importMode);
      onClose();
    }
  };

  const trainingCount = parsedPreview?.filter(s => s.anio < 2026).length ?? 0;
  const testCount = parsedPreview?.filter(s => s.anio === 2026).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Alimentación de Datos vía Excel / CSV
              </h2>
              <p className="text-xs text-slate-400">
                Carga de histórico 2020-2025 y cohorte de prueba 2026
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Requirements info banner */}
        <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 leading-relaxed">
            <p className="font-semibold text-slate-900 dark:text-white">
              Estructura admitida en el archivo de Excel:
            </p>
            <div className="font-mono text-[11px] bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-blue-200 dark:border-blue-800">
              año · nombre o codigo estudiante · sexo · pais · cursos · bimestre_1 · bimestre_2 · promedio_b1_b2 · riesgo_academico
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              * Para los estudiantes del <strong>año 2026</strong>, el modelo utilizará el promedio consolidado de los bimestres 1 y 2 para predecir el riesgo académico si no viene clasificado.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* File input click surface */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/20 transition-colors group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <UploadCloud className="h-9 w-9 mx-auto text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {fileName ? `Archivo seleccionado: ${fileName}` : 'Haz clic para seleccionar tu libro Excel (.xlsx, .xls) o CSV'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Detección automática de hojas y columnas
            </p>
          </div>

          {/* Download template action */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              ¿No tienes el formato oficial aún?
            </span>
            <button
              type="button"
              onClick={downloadOfficialExcelTemplate}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-medium border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Descargar Plantilla (.xlsx)</span>
            </button>
          </div>

          {/* Loading status */}
          {isLoading && (
            <div className="p-4 text-center text-xs text-blue-600 dark:text-blue-400 animate-pulse">
              Leyendo y procesando hojas de cálculo...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview summary */}
          {parsedPreview && (
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs space-y-3">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Archivo procesado correctamente
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60">
                  {parsedPreview.length} registros totales
                </span>
              </div>

              {/* Breakdown by training vs test */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-white/70 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800/50">
                  <span className="text-slate-500 dark:text-slate-400">Entrenamiento (2020-2025):</span>
                  <span className="ml-1 font-bold text-slate-800 dark:text-slate-200 font-mono">{trainingCount}</span>
                </div>
                <div className="p-2 rounded bg-white/70 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800/50">
                  <span className="text-slate-500 dark:text-slate-400">Prueba 2026 (B1 + B2):</span>
                  <span className="ml-1 font-bold text-emerald-600 dark:text-emerald-400 font-mono">{testCount}</span>
                </div>
              </div>

              {/* Import mode options */}
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex items-center gap-4 text-slate-700 dark:text-slate-300 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-blue-600"
                  />
                  <span>Reemplazar dataset completo (Recomendado)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="accent-blue-600"
                  />
                  <span>Agregar al dataset existente</span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!parsedPreview || parsedPreview.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-colors cursor-pointer"
          >
            Alimentar Modelo ({parsedPreview?.length || 0} Registros)
          </button>
        </div>

      </div>
    </div>
  );
};
