import React, { useState, useEffect } from 'react';
import { 
  Sparkles, FileSpreadsheet, Download, Users, History, 
  RefreshCw, CheckCircle2, Shield, Zap, Star, Trophy, Minimize2
} from 'lucide-react';
import { AmbientBackground } from './components/AmbientBackground';
import { FullscreenToggle } from './components/FullscreenToggle';
import { DrawStage } from './components/DrawStage';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { AuditListModal } from './components/AuditListModal';
import { DrawHistoryModal } from './components/DrawHistoryModal';
import { localParticipantService } from './services/localParticipantService';
import { Participant, ValidationSummary, DrawRecord } from './types';

export const App: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [history, setHistory] = useState<DrawRecord[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Track Fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleExitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn("Exit fullscreen failed:", e);
    }
  };

  // Initialize participants from localStorage on first mount
  useEffect(() => {
    const list = localParticipantService.getParticipants();
    setParticipants(list);
    const sum = localParticipantService.getSummary();
    setSummary(sum);
    const hist = localParticipantService.getHistory();
    setHistory(hist);
  }, []);

  const handleUploadSuccess = (newParticipants: Participant[], newSummary: ValidationSummary) => {
    setParticipants(newParticipants);
    setSummary(newSummary);
  };

  const handleWinnerSelected = (record: DrawRecord) => {
    setHistory(prev => [record, ...prev]);
  };

  const handleHistoryCleared = () => {
    setHistory([]);
  };

  return (
    <div className="relative min-h-screen bg-pop-dark text-gray-100 flex flex-col justify-between selection:bg-pop-pink selection:text-white overflow-x-hidden">
      <AmbientBackground />

      {/* Pop Style Top Navigation Bar (Hidden in Fullscreen Mode) */}
      {!isFullscreen && (
        <header className="relative z-20 w-full border-b-2 border-pop-pink/30 bg-black/60 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand / Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pop-pink via-pop-purple to-pop-yellow flex items-center justify-center text-black font-black shadow-glow-pink">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black font-display text-white tracking-wide">
                  LUCKY POP SHUFFLE
                </h1>
                <span className="text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded-md bg-pop-pink text-white shadow-glow-pink">
                  PRO LIVE
                </span>
              </div>
              <p className="text-[11px] font-mono text-pop-cyan font-semibold">
                Live Stage Single-Winner Wheel
              </p>
            </div>
          </div>

          {/* Center / Right Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Active Pool Counter Button */}
            <button
              onClick={() => setIsAuditOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-pop-card hover:bg-pop-slot border-2 border-pop-cyan/40 text-xs font-mono text-pop-cyan transition-all hover:scale-105 shadow-glow-cyan"
              title="Click to view and search participant list"
            >
              <Users className="w-4 h-4 text-pop-cyan" />
              <span>
                <strong className="text-white font-black">{participants.length.toLocaleString()}</strong> Names
              </span>
            </button>

            {/* Upload Excel Button (High Energy 3D Pop) */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="btn-pop-3d flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pop-pink to-pop-magenta text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-pop-pink-btn hover:scale-105 active:scale-95 border-2 border-white/30 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-pop-yellow" />
              <span>Upload Excel</span>
            </button>

            {/* Download Sample Template */}
            <button
              onClick={() => localParticipantService.downloadTemplate()}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/50 hover:bg-black/80 border-2 border-white/10 hover:border-pop-yellow text-xs font-bold text-gray-300 hover:text-pop-yellow transition-all"
              title="Download ready-to-fill sample Excel template"
            >
              <Download className="w-3.5 h-3.5 text-pop-yellow" />
              <span>Template</span>
            </button>

            {/* Winner History Button */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/50 hover:bg-black/80 border-2 border-white/10 hover:border-pop-yellow text-xs font-bold text-gray-300 hover:text-white transition-all"
              title="View winners history"
            >
              <Trophy className="w-3.5 h-3.5 text-pop-yellow" />
              <span>Winners ({history.length})</span>
            </button>

            {/* Projector Fullscreen Mode */}
            <FullscreenToggle className="py-2 px-3.5 border-2" />
          </div>
        </header>
      )}

      {/* Discreet floating Exit Fullscreen button when in Fullscreen */}
      {isFullscreen && (
        <button
          onClick={handleExitFullscreen}
          title="Exit Fullscreen (or press Esc)"
          className="fixed top-4 right-4 z-40 px-3.5 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 border border-white/20 hover:border-pink-500 text-gray-300 hover:text-white transition-all shadow-lg backdrop-blur-md flex items-center gap-2 text-xs font-mono group cursor-pointer"
        >
          <Minimize2 className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-[11px] uppercase tracking-wider">Exit (Esc)</span>
        </button>
      )}

      {/* Main Hero Spin Stage */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-6">
        <DrawStage
          participants={participants}
          onWinnerSelected={handleWinnerSelected}
          onOpenUpload={() => setIsUploadOpen(true)}
        />
      </main>

      {/* Modals */}
      <ExcelUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <AuditListModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        participants={participants}
        summary={summary}
      />

      <DrawHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onHistoryCleared={handleHistoryCleared}
      />

    </div>
  );
};
export default App;
