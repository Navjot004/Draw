import React from 'react';
import { X, Trophy, Clock, Trash2 } from 'lucide-react';
import { DrawRecord } from '../types';
import { localParticipantService } from '../services/localParticipantService';

interface DrawHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: DrawRecord[];
  onHistoryCleared: () => void;
}

export const DrawHistoryModal: React.FC<DrawHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onHistoryCleared,
}) => {
  if (!isOpen) return null;

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the winner history?")) {
      localParticipantService.clearHistory();
      onHistoryCleared();
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-pop-slot overflow-hidden border-2 border-pop-yellow/60 shadow-glow-yellow">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b-2 border-white/10 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-pop-yellow/20 text-pop-yellow border-2 border-pop-yellow/50 shadow-glow-yellow">
              <Trophy className="w-5 h-5 text-pop-yellow" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display text-white tracking-wide">
                Winner Selection History
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {history.length} winner{history.length === 1 ? '' : 's'} recorded during this session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[460px]">
          {history.length > 0 ? (
            history.map((record, idx) => (
              <div 
                key={record.id || idx}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-electric-gold/20 text-electric-gold border border-electric-gold/30 flex items-center justify-center font-bold font-mono text-xs">
                    #{history.length - idx}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white font-display">
                      {record.winner_name}
                    </h4>
                    <p className="text-xs text-electric-blue font-mono font-semibold">
                      ID: {record.winner_reg_no}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-gray-400 font-mono">
                  <div className="flex items-center gap-1 justify-end text-gray-300">
                    <Clock className="w-3 h-3 text-primary-400" />
                    <span>{formatDate(record.drawn_at)}</span>
                  </div>
                  <span className="text-[11px] text-gray-500">Pool: {record.pool_size.toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-gray-500 text-sm">
              <Trophy className="w-10 h-10 mx-auto text-gray-600 mb-3" />
              No winners drawn yet. Click "START DRAW" to select the first winner!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-background-card/90">
          {history.length > 0 ? (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
