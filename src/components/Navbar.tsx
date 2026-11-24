import React, { useEffect, useState } from 'react';
import { Cpu, RotateCcw, Save, CheckCircle2, RefreshCw } from 'lucide-react';

interface NavbarProps {
  hayDatos: boolean;
  modeloEntrenado: boolean;
  onInicio: () => void;
  onClearData: () => void;
  onSaveData: () => void;
  isSaving: boolean;
  isSaved: boolean;
  lastSavedAt: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  hayDatos, modeloEntrenado, onInicio, onClearData, onSaveData, isSaving, isSaved, lastSavedAt,
}) => {
  // «Reiniciar» borra la validación guardada: pide un segundo clic para que no se borre por accidente.
  const [confirmar, setConfirmar] = useState(false);
  useEffect(() => {
    if (!confirmar) return;
    const t = setTimeout(() => setConfirmar(false), 4000);
    return () => clearTimeout(t);
  }, [confirmar]);

  return (
  <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 h-16">
        <button onClick={onInicio} className="text-white flex items-center gap-2.5 hover:opacity-90 cursor-pointer text-left">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="block leading-none text-sm sm:text-base font-bold">Riesgo académico temprano · Random Forest</span>
            <span className="block text-[10px] text-slate-400">
              Entrenamiento 2020-2024 · Prueba 2025 · Predicción 2026 · {modeloEntrenado ? 'modelo entrenado' : 'sin modelo entrenado'}
            </span>
          </div>
        </button>

        {hayDatos && (
          <div className="flex items-center gap-2 shrink-0">
            <button type="button"
              onClick={() => { if (confirmar) { setConfirmar(false); onClearData(); } else setConfirmar(true); }}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
                confirmar ? 'bg-red-600 text-white hover:bg-red-500' : 'text-slate-400 hover:text-red-400'}`}
              title="Borrar el archivo validado del servidor y del navegador">
              <RotateCcw className="w-3.5 h-3.5" /><span>{confirmar ? '¿Borrar? Clic otra vez' : 'Reiniciar'}</span>
            </button>
            <button type="button" onClick={onSaveData} disabled={isSaving}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isSaved ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
              title={lastSavedAt ? `Guardado el ${new Date(lastSavedAt).toLocaleString('es-PE')}` : 'Guardar la validación en el servidor'}>
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Guardando…' : isSaved ? 'Validación guardada' : 'Guardar validación'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  </header>
);
};
