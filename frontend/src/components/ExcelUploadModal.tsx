import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, UploadCloud, Download, CheckCircle2, 
  AlertCircle, RefreshCw, FileText, ShieldCheck, Sparkles, X
} from 'lucide-react';
import { localParticipantService } from '../services/localParticipantService';
import { Participant, ValidationSummary } from '../types';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (participants: Participant[], summary: ValidationSummary) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<ValidationSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const validExtensions = ['.xlsx', '.xls', '.csv', '.txt'];
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValid) {
      setUploadError("Please upload an Excel (.xlsx, .xls) or CSV file.");
      setUploadSuccess(null);
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      // Parse directly in browser local storage
      const result = await localParticipantService.parseFile(file);
      setUploadSuccess(result.summary);
      onUploadSuccess(result.participants, result.summary);
    } catch (err: any) {
      console.error("Local parsing error:", err);
      setUploadError(err.message || "Failed to parse spreadsheet.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    localParticipantService.downloadTemplate();
  };

  const handleResetDemo = async () => {
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(null);
      const demo = await localParticipantService.resetToDemo();
      const summary = localParticipantService.getSummary();
      if (summary) {
        setUploadSuccess(summary);
        onUploadSuccess(demo, summary);
      }
    } catch (e: any) {
      setUploadError("Failed to reset demo dataset.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl bg-pop-slot overflow-hidden border-2 border-pop-pink/60 shadow-glow-pink p-6 sm:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b-2 border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-pop-pink/20 text-pop-pink border-2 border-pop-pink/50 shadow-glow-pink">
              <FileSpreadsheet className="w-6 h-6 text-pop-pink" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-pop-yellow font-black mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-pop-yellow" />
                Local Instant Parser
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-display text-white">
                Upload Names Excel / CSV
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center group ${
            isDragging
              ? 'border-pop-yellow bg-pop-pink/20 scale-[1.01] shadow-glow-yellow'
              : 'border-pop-pink/40 hover:border-pop-yellow bg-black/40 hover:bg-pop-card'
          } ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx,.xls,.csv,.txt"
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex flex-col items-center justify-center">
            <div className={`p-4 rounded-full mb-3 transition-transform duration-300 ${
              isDragging 
                ? 'bg-pop-yellow/30 text-pop-yellow scale-110' 
                : 'bg-pop-pink/20 text-pop-pink group-hover:scale-110 shadow-glow-pink'
            }`}>
              {isUploading ? (
                <RefreshCw className="w-8 h-8 text-pop-yellow animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8 text-pop-yellow" />
              )}
            </div>

            <h4 className="text-base sm:text-lg font-black text-white font-display">
              {isUploading
                ? 'Processing & Validating Names...'
                : isDragging
                ? 'Drop your Excel file right here!'
                : 'Click or drag your Excel (.xlsx / .csv) file here'}
            </h4>

            <p className="text-xs text-gray-300 mt-1 max-w-md">
              Parsed directly in your local browser. Works with 2 columns (Name, Reg No) or simply 1 column with names!
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-gray-300 font-bold">
              <span className="px-2.5 py-1 rounded-md bg-white/10 border border-pop-pink/40 text-pop-pink">.xlsx</span>
              <span className="px-2.5 py-1 rounded-md bg-white/10 border border-pop-cyan/40 text-pop-cyan">.csv</span>
              <span className="text-gray-500">•</span>
              <span className="text-pop-yellow">Instant Local Load</span>
              <span className="text-gray-500">•</span>
              <span className="text-emerald-400">Auto Deduplication</span>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {uploadSuccess && (
          <div className="mt-5 p-4 rounded-2xl bg-pop-card border-2 border-pop-cyan text-pop-cyan flex items-center justify-between text-xs shadow-glow-cyan animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-pop-yellow shrink-0" />
              <div>
                <p className="font-black text-white text-sm">
                  "{uploadSuccess.fileName || 'Spreadsheet'}" Loaded!
                </p>
                <p className="text-pop-cyan/90 mt-0.5 font-mono">
                  {uploadSuccess.eligibleCount.toLocaleString()} eligible names ready for spin
                  {uploadSuccess.duplicateCount > 0 && ` • ${uploadSuccess.duplicateCount} duplicates excluded`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'linear-gradient(135deg, #ffe600 0%, #00f0ff 100%)' }}
              className="btn-pop-3d px-5 py-2.5 rounded-xl text-black font-black uppercase tracking-wider text-xs shadow-pop-yellow-btn cursor-pointer border border-black/20"
            >
              Start Spin →
            </button>
          </div>
        )}

        {/* Error Banner */}
        {uploadError && (
          <div className="mt-5 p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="font-semibold">{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-xs uppercase font-black tracking-wider hover:opacity-80 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t-2 border-white/10">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-pop-yellow hover:text-white bg-black/60 hover:bg-black/90 border-2 border-pop-yellow/40 hover:border-pop-yellow transition-all"
          >
            <Download className="w-4 h-4 text-pop-yellow" />
            <span>Download Template (.xlsx)</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetDemo}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-black/40 hover:bg-black/70 border-2 border-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset 650 Demo Names</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/15 hover:bg-white/25 text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
