import React from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  RotateCcw,
  Sparkles,
  Cpu,
  BarChart3,
  Sliders
} from 'lucide-react';
import { ProjectPhase } from '../types';
import { descargarPlantillaEstandarColab, exportarResultadosPrediccion } from '../utils/colabEngine';

interface NavbarProps {
  currentPhase: ProjectPhase;
  onSelectPhase: (phase: ProjectPhase) => void;
  onOpenImport: () => void;
  totalStudents: number;
  onClearData: () => void;
  onLoadDemoData: () => void;
  records: any[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPhase,
  onSelectPhase,
  onOpenImport,
  totalStudents,
  onClearData,
  onLoadDemoData,
  records,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          
          {/* Zone 1: Wordmark / Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => onSelectPhase('paso1_carga')}
              className="text-base font-bold text-white tracking-tight whitespace-nowrap shrink-0 flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="block leading-none text-sm sm:text-base font-bold">Random Forest · 100 Árboles</span>
                <span className="block text-[10px] text-slate-400 font-normal">Predicción de Riesgo Académico · 5 Sedes</span>
              </div>
            </button>
          </div>

          {/* Zone 2: Estado del Modelo o Cohorte */}
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-300 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700/60 font-medium">
            <span className="text-blue-400 font-semibold">Random Forest</span>
            <span>·</span>
            <span>100 Árboles</span>
            <span>·</span>
            <span className="text-indigo-300">5 Sedes</span>
            <span>·</span>
            <span className="text-emerald-400">Entrenamiento 2020-2025</span>
            <span>·</span>
            <span className="text-amber-400 font-semibold">Validación 2026</span>
          </div>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2 shrink-0">
            
            {totalStudents > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => exportarResultadosPrediccion(records, 'csv')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
                  title="Descargar Resultados_Prediccion_2026_RandomForest.csv"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  type="button"
                  onClick={onClearData}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  title="Limpiar dataset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onLoadDemoData}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cargar Demo (2020-2026)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenImport}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Subir Archivo</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
