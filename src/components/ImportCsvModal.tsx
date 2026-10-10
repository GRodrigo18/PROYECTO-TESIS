import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Check, 
  AlertTriangle, 
  Copy, 
  Download,
  Info
} from 'lucide-react';
import { StudentPrediction } from '../types';
import { parseCSV } from '../utils/randomForestSimulator';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (students: StudentPrediction[], mode: 'replace' | 'append') => void;
}

const SAMPLE_CSV = `nombre o codigo estudiante,sexo,pais,cursos,riesgo_academico
EST-2024-501 - Gabriel Salcedo,Masculino,Perú,7,Alto
EST-2024-502 - Daniela Navarro,Femenino,Colombia,5,Medio
EST-2024-503 - Esteban Prieto,Masculino,Chile,4,Bajo
EST-2024-504 - Valeria Cárdenas,Femenino,México,6,Alto
EST-2024-505 - Lucas Santander,Masculino,Argentina,4,Bajo
EST-2024-506 - Sofía Beltrán,Femenino,España,5,Medio`;

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImportStudents,
}) => {
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<StudentPrediction[] | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      validateAndPreview(content);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const validateAndPreview = (text: string) => {
    try {
      setError(null);
      if (!text.trim()) {
        setParsedPreview(null);
        return;
      }
      const students = parseCSV(text);
      if (students.length === 0) {
        throw new Error('No se detectaron filas válidas en el archivo CSV.');
      }
      setParsedPreview(students);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo CSV.');
      setParsedPreview(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    validateAndPreview(text);
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_CSV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadSample = () => {
    setCsvText(SAMPLE_CSV);
    validateAndPreview(SAMPLE_CSV);
  };

  const handleConfirmImport = () => {
    if (parsedPreview && parsedPreview.length > 0) {
      onImportStudents(parsedPreview, importMode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Importar Predicciones desde CSV
              </h2>
              <p className="text-xs text-slate-400">
                Carga tus propios datos con las columnas solicitadas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Requirements info banner */}
        <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold">Columnas admitidas en el archivo CSV:</p>
            <p className="font-mono text-[11px] bg-white/70 dark:bg-slate-800/80 p-1.5 rounded border border-blue-200 dark:border-blue-800">
              nombre o codigo estudiante, sexo, pais, cursos, riesgo_academico
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              * Si la columna <em>riesgo_academico</em> está vacía, el ensamble Random Forest calculará automáticamente la predicción.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* File input drag and drop / button */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/20 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Haz clic aquí para seleccionar tu archivo .CSV
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              O pega el texto delimitado por comas o punto y coma abajo
            </p>
          </div>

          {/* Direct Textarea */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                O pega contenido CSV directamente:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] cursor-pointer"
                >
                  Cargar Ejemplo
                </button>
                <button
                  type="button"
                  onClick={handleCopySample}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copiado' : 'Copiar formato'}</span>
                </button>
              </div>
            </div>
            <textarea
              id="textarea-csv-content"
              rows={4}
              value={csvText}
              onChange={handleTextChange}
              placeholder="nombre o codigo estudiante,sexo,pais,cursos,riesgo_academico..."
              className="w-full p-2.5 font-mono text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview summary */}
          {parsedPreview && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Archivo válido: <strong>{parsedPreview.length} estudiantes procesados</strong>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60">
                  Listo para cargar
                </span>
              </div>

              {/* Import mode options */}
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex items-center gap-4 text-slate-700 dark:text-slate-300 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="accent-blue-600"
                  />
                  <span>Agregar al dataset actual</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-blue-600"
                  />
                  <span>Reemplazar dataset completo</span>
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
            id="btn-confirmar-importacion"
            disabled={!parsedPreview || parsedPreview.length === 0}
            onClick={handleConfirmImport}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm transition-colors cursor-pointer"
          >
            Importar {parsedPreview ? `${parsedPreview.length} Estudiantes` : ''}
          </button>
        </div>

      </div>
    </div>
  );
};
