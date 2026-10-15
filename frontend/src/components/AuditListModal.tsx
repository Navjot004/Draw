import React, { useState } from 'react';
import { X, Search, Users, Shield, Copy, CheckCircle2 } from 'lucide-react';
import { Participant, ValidationSummary } from '../types';

interface AuditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  summary: ValidationSummary | null;
}

export const AuditListModal: React.FC<AuditListModalProps> = ({
  isOpen,
  onClose,
  participants,
  summary
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen) return null;

  const filtered = participants.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reg_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyHash = () => {
    if (summary?.poolHash) {
      navigator.clipboard.writeText(summary.poolHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-pop-slot overflow-hidden border-2 border-pop-cyan/60 shadow-glow-cyan">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b-2 border-white/10 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-pop-cyan/20 border-2 border-pop-cyan/50 text-pop-cyan shadow-glow-cyan">
              <Shield className="w-5 h-5 text-pop-cyan" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display text-white tracking-wide">
                Active Participant List
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Source: <span className="text-pop-yellow font-bold font-mono">{summary?.source || 'Local Pool'}</span> • {participants.length.toLocaleString()} participants loaded
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

        {/* Stats & Search Bar */}
        <div className="px-6 py-4 bg-background-light/40 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search participant or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-mono text-gray-400">
            <span>SHA-256:</span>
            <code className="text-electric-blue text-[11px] bg-black/50 px-2 py-1 rounded border border-white/10 truncate max-w-[180px]">
              {summary?.poolHash ? `${summary.poolHash.slice(0, 16)}...` : 'N/A'}
            </code>
            <button
              onClick={handleCopyHash}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="Copy cryptographic hash"
            >
              {copiedHash ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* List Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-1 max-h-[460px]">
          <div className="grid grid-cols-12 text-[11px] font-semibold uppercase text-gray-400 pb-2 px-3 border-b border-white/5">
            <span className="col-span-1">#</span>
            <span className="col-span-7">Participant Name</span>
            <span className="col-span-4">Registration ID</span>
          </div>

          {filtered.length > 0 ? (
            filtered.map((student, idx) => (
              <div 
                key={idx} 
                className="grid grid-cols-12 text-xs py-2 px-3 items-center hover:bg-white/5 rounded-lg transition-colors"
              >
                <span className="col-span-1 text-gray-500 font-mono text-[11px]">{idx + 1}</span>
                <span className="col-span-7 font-medium text-white">{student.name}</span>
                <span className="col-span-4 font-mono text-electric-blue font-semibold">{student.reg_no}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">
              No participants match "{searchTerm}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-background-card/90">
          <div className="text-xs text-gray-400">
            Showing <strong className="text-white">{filtered.length}</strong> of <strong className="text-white">{participants.length}</strong> participants
          </div>
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
