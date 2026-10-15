import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface FullscreenToggleProps {
  className?: string;
}

export const FullscreenToggle: React.FC<FullscreenToggleProps> = ({ className = "" }) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  return (
    <button
      onClick={toggleFullscreen}
      title={isFullscreen ? "Exit Fullscreen" : "Projector Fullscreen Mode"}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
        isFullscreen
          ? "bg-primary-900/60 border-primary-500/50 text-primary-300 hover:bg-primary-800/80"
          : "bg-background-card/80 border-white/10 text-gray-300 hover:text-white hover:border-primary-500/40 hover:bg-background-surface"
      } ${className}`}
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="w-3.5 h-3.5 text-primary-400" />
          <span>Exit Fullscreen</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-3.5 h-3.5 text-electric-blue" />
          <span>Projector Mode</span>
        </>
      )}
    </button>
  );
};
