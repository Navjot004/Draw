import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { 
  Sparkles, Trophy, Play, RotateCcw, Volume2, VolumeX, 
  CheckCircle2, AlertCircle, Zap, Star, Flame
} from 'lucide-react';
import { sound } from '../services/sound';
import { Participant, DrawRecord } from '../types';
import { localParticipantService } from '../services/localParticipantService';

interface DrawStageProps {
  participants: Participant[];
  onWinnerSelected: (record: DrawRecord) => void;
  onOpenUpload: () => void;
}

export const DrawStage: React.FC<DrawStageProps> = ({
  participants,
  onWinnerSelected,
  onOpenUpload,
}) => {
  // Stages: 'ready' | 'countdown' | 'shuffling' | 'revealed'
  const [stage, setStage] = useState<'ready' | 'countdown' | 'shuffling' | 'revealed'>('ready');
  const [countdown, setCountdown] = useState<number>(3);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted);

  // Deceleration state for UI badge
  const [isDecelerating, setIsDecelerating] = useState<boolean>(false);

  // Reel names for realistic 3D roller peek
  const [displayedName, setDisplayedName] = useState<Participant>({ name: 'READY TO SPIN', reg_no: '------------' });
  const [prevName, setPrevName] = useState<Participant>({ name: '...', reg_no: '...' });
  const [nextName, setNextName] = useState<Participant>({ name: '...', reg_no: '...' });

  const [error, setError] = useState<string | null>(null);
  const shuffleTimerRef = useRef<any>(null);

  useEffect(() => {
    if (participants.length > 0 && stage === 'ready') {
      setDisplayedName({ name: 'READY TO SPIN', reg_no: `${participants.length.toLocaleString()} Participants` });
    }
  }, [participants, stage]);

  const toggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  const triggerConfetti = () => {
    const count = 300;
    const defaults = { origin: { y: 0.65 }, zIndex: 99999 };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 45, startVelocity: 65, colors: ['#ff007f', '#ffe600', '#00f0ff'] });
    fire(0.2, { spread: 80, colors: ['#ffffff', '#ffd700', '#ff007f'] });
    fire(0.35, { spread: 130, decay: 0.91, scalar: 1.2, colors: ['#ffe600', '#00f0ff', '#ff007f'] });
  };

  const handleStartDraw = () => {
    if (participants.length === 0) {
      setError("No participants loaded yet! Click 'Upload Excel' or reset to demo names.");
      return;
    }
    setError(null);

    // 1. Pick winner cryptographically right now
    const selectedWinner = localParticipantService.selectWinner(participants);
    setWinner(selectedWinner);

    // 2. Start Countdown (Silent & Clean)
    setStage('countdown');
    setCountdown(3);

    let currentCount = 3;
    const interval = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        clearInterval(interval);
        startStepDecelerationShuffle(selectedWinner);
      }
    }, 1000);
  };

  /**
   * Casino Near-Miss Slowdown (Realistic Step-by-Step Deceleration)
   * 1. Super-fast spin at 50ms for ~3.5 seconds
   * 2. Step-by-step deceleration: 50ms -> 120ms -> 250ms -> 500ms -> 1000ms
   * 3. Pauses on the last 3-4 names creating heart-stopping near-miss suspense
   * 4. Next tick lands directly on the selected winner!
   */
  const startStepDecelerationShuffle = (selectedWinner: Participant) => {
    setStage('shuffling');
    setIsDecelerating(false);

    const startTime = Date.now();
    const fastDuration = 6000; // 6 seconds high-speed blur spin

    // Progressive near-miss slowdown steps: gradual deceleration up to 1.6s hold
    const slowDelays = [90, 160, 280, 480, 800, 1200, 1600];
    let slowIndex = 0;

    // Helper to roll random names on reel
    const rollNames = () => {
      const randIdx = Math.floor(Math.random() * participants.length);
      const prevIdx = (randIdx - 1 + participants.length) % participants.length;
      const nextIdx = (randIdx + 1) % participants.length;

      setPrevName(participants[prevIdx] || { name: '...', reg_no: '...' });
      setDisplayedName(participants[randIdx] || { name: '...', reg_no: '...' });
      setNextName(participants[nextIdx] || { name: '...', reg_no: '...' });
    };

    // Phase 1: Super-fast 50ms blur spin (Completely Silent)
    const doFastSpin = () => {
      const elapsed = Date.now() - startTime;
      rollNames();

      if (elapsed < fastDuration) {
        shuffleTimerRef.current = setTimeout(doFastSpin, 50);
      } else {
        // Switch to Phase 2: Step-by-step near-miss deceleration
        setIsDecelerating(true);
        doSlowStep();
      }
    };

    // Phase 2: Progressive slow steps (90ms -> 160ms -> 280ms -> 480ms -> 800ms -> 1200ms -> 1600ms)
    const doSlowStep = () => {
      if (slowIndex < slowDelays.length) {
        const currentDelay = slowDelays[slowIndex];
        slowIndex++;

        // Roll next name (visible pause on each candidate)
        rollNames();

        // Schedule next slower step
        shuffleTimerRef.current = setTimeout(doSlowStep, currentDelay);
      } else {
        // Final Step: Land directly on the winner after the final suspense pause!
        setDisplayedName(selectedWinner);
        finishReveal(selectedWinner);
      }
    };

    // Start 50ms fast spin
    shuffleTimerRef.current = setTimeout(doFastSpin, 50);
  };

  const finishReveal = (finalWinner: Participant) => {
    setDisplayedName(finalWinner);
    setStage('revealed');
    setIsDecelerating(false);

    sound.playImpact();
    sound.playFanfare();
    triggerConfetti();

    const record: DrawRecord = {
      id: window.crypto.randomUUID ? window.crypto.randomUUID() : `draw_${Date.now()}`,
      winner_name: finalWinner.name,
      winner_reg_no: finalWinner.reg_no,
      drawn_at: new Date().toISOString(),
      pool_size: participants.length
    };
    localParticipantService.addHistory(record);
    onWinnerSelected(record);
  };

  const handleResetForNextDraw = () => {
    if (shuffleTimerRef.current) {
      clearTimeout(shuffleTimerRef.current);
    }
    setStage('ready');
    setIsDecelerating(false);
    setWinner(null);
  };

  const marqueeBulbs = Array.from({ length: 18 });

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[74vh] px-4">
      
      {/* Sound Mute Toggle Floating Button */}
      <button
        onClick={toggleSound}
        className="absolute top-0 right-4 p-3 rounded-2xl bg-black/50 hover:bg-black/70 border-2 border-pop-pink/40 text-pop-pink hover:text-white transition-all shadow-glow-pink hover:scale-110 active:scale-95 cursor-pointer"
        title={isMuted ? "Unmute Sound" : "Mute Sound"}
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-pop-pink" />}
      </button>

      {/* Error Toast */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 flex items-center justify-between gap-3 text-xs w-full max-w-md shadow-glow-pink animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button 
            onClick={onOpenUpload}
            className="px-3 py-1 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
          >
            Upload Now
          </button>
        </div>
      )}

      {/* STAGE A: READY */}
      {stage === 'ready' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full flex flex-col items-center text-center"
        >
          {/* Pop arcade badge */}
          <div 
            style={{ background: 'rgba(255, 0, 127, 0.15)', borderColor: '#ff007f' }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-2 text-amber-300 text-xs font-display font-black uppercase tracking-widest mb-6 shadow-glow-pink animate-pop-bounce"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-current animate-bounce" />
            <span>LUCKY WINNER SHUFFLE</span>
            <Star className="w-4 h-4 text-cyan-400 fill-current" />
          </div>

          {/* Grand Pop Title */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-display font-black text-white tracking-tight mb-3 drop-shadow-[0_12px_30px_rgba(255,0,127,0.45)]">
            Mystery <span className="text-pink-500 text-glow-pink">Name Spin</span>
          </h1>

          <p className="text-base sm:text-xl text-gray-200 max-w-xl font-medium mb-8">
            One single roll. One verified lucky winner. Total suspense!
          </p>

          {/* Pop Arcade Slot Machine Frame */}
          <div 
            style={{ background: 'linear-gradient(135deg, #ff007f 0%, #ffe600 50%, #00f0ff 100%)' }}
            className="w-full max-w-2xl p-[3px] rounded-3xl shadow-[0_0_35px_rgba(255,0,127,0.4)] mb-9 group hover:scale-[1.01] transition-transform"
          >
            <div className="w-full bg-[#120b29] rounded-[22px] p-8 sm:p-12 relative overflow-hidden flex flex-col items-center justify-center">
              
              {/* Marquee light dots around the rim */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="w-3 h-3 rounded-full bg-pink-500 animate-marquee-blink shadow-[0_0_10px_#ff007f]" />
                <span className="w-3 h-3 rounded-full bg-amber-300 animate-marquee-blink delay-100 shadow-[0_0_10px_#ffe600]" />
                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-marquee-blink delay-200 shadow-[0_0_10px_#00f0ff]" />
                <span className="text-xs uppercase font-mono tracking-widest text-amber-300 font-black px-3.5 py-1 rounded-full bg-black/80 border border-amber-400/50">
                  {participants.length.toLocaleString()} Candidates Loaded
                </span>
                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-marquee-blink delay-200 shadow-[0_0_10px_#00f0ff]" />
                <span className="w-3 h-3 rounded-full bg-amber-300 animate-marquee-blink delay-100 shadow-[0_0_10px_#ffe600]" />
                <span className="w-3 h-3 rounded-full bg-pink-500 animate-marquee-blink shadow-[0_0_10px_#ff007f]" />
              </div>

              {/* Main Slot Name Preview */}
              <div className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-amber-300 text-glow-yellow tracking-wider my-3 uppercase">
                {displayedName.name}
              </div>

              <div className="text-sm sm:text-base font-mono text-cyan-300 font-bold tracking-widest mt-2 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-pink-500 fill-current" />
                <span>Ready for live stage selection</span>
              </div>
            </div>
          </div>

          {/* Chunky Pop 3D START SPIN Button */}
          <button
            onClick={handleStartDraw}
            disabled={participants.length === 0}
            style={{ background: 'linear-gradient(135deg, #ffe600 0%, #ff007f 50%, #00f0ff 100%)' }}
            className="btn-pop-3d group px-14 py-6 rounded-2xl text-2xl sm:text-3xl font-display font-black uppercase tracking-widest text-black shadow-[0_8px_0_#9d174d,0_15px_35px_rgba(255,0,127,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-2 border-white"
          >
            <Play className="w-7 h-7 fill-current text-black animate-pulse" />
            <span className="font-black text-black">START SPIN</span>
          </button>
        </motion.div>
      )}

      {/* STAGE B: COUNTDOWN */}
      {stage === 'countdown' && (
        <motion.div
          key="countdown"
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: [0.8, 1.25, 1], rotate: 0 }}
          exit={{ opacity: 0, scale: 1.5, rotate: 10 }}
          transition={{ duration: 0.5, ease: 'backOut' }}
          className="flex flex-col items-center justify-center text-center select-none"
        >
          <div className="text-sm font-display font-black uppercase tracking-widest text-amber-300 mb-2 bg-pink-500/30 border-2 border-pink-500 px-5 py-1.5 rounded-full shadow-[0_0_20px_rgba(255,0,127,0.5)]">
            💥 GET READY TO POP!
          </div>

          <div className="text-9xl sm:text-[14rem] md:text-[17rem] font-display font-black text-amber-300 text-glow-yellow leading-none drop-shadow-[0_20px_50px_rgba(255,230,0,0.6)] animate-pulse">
            {countdown}
          </div>

          <div className="text-base font-mono font-bold text-cyan-300 tracking-widest uppercase mt-4">
            ROLLING PARTICIPANTS REEL...
          </div>
        </motion.div>
      )}

      {/* STAGE C: RAPID NAME SHUFFLE (Near-Miss Step Deceleration) */}
      {stage === 'shuffling' && (
        <motion.div
          key="shuffling"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl flex flex-col items-center text-center"
        >
          {/* Status Badge */}
          <div 
            style={{ 
              background: isDecelerating ? 'rgba(255, 230, 0, 0.15)' : '#190e38', 
              borderColor: isDecelerating ? '#ffe600' : '#ff007f' 
            }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 text-xs font-mono font-bold uppercase tracking-wider mb-6 shadow-[0_0_20px_rgba(255,0,127,0.4)] transition-all"
          >
            <span className={`w-3 h-3 rounded-full ${isDecelerating ? 'bg-amber-400 animate-ping' : 'bg-pink-500 animate-ping'}`} />
            <span className={isDecelerating ? 'text-amber-300 font-black' : 'text-white'}>
              {isDecelerating ? '🚨 DECELERATING... CANDIDATE LOCKING IN!' : '🎰 SHUFFLING PARTICIPANTS...'}
            </span>
          </div>

          {/* Slot Machine Window */}
          <div 
            style={{ 
              background: isDecelerating 
                ? 'linear-gradient(135deg, #ffe600 0%, #ff007f 50%, #ffe600 100%)' 
                : 'linear-gradient(135deg, #ff007f 0%, #8b5cf6 50%, #00f0ff 100%)' 
            }}
            className="w-full rounded-3xl p-[3px] shadow-[0_0_35px_rgba(255,0,127,0.4)] transition-all duration-300"
          >
            <div 
              style={{ background: '#120b29' }}
              className="rounded-[22px] p-6 sm:p-10 relative overflow-hidden flex flex-col items-center justify-center"
            >
              {/* Marquee Light Bulbs Row */}
              <div className="flex items-center justify-center gap-2.5 mb-6">
                {marqueeBulbs.map((_, i) => (
                  <span 
                    key={i} 
                    className={`w-2.5 h-2.5 rounded-full transition-opacity ${
                      i % 3 === 0 ? 'bg-pink-500 shadow-[0_0_8px_#ff007f]' :
                      i % 1 === 1 ? 'bg-amber-300 shadow-[0_0_8px_#ffe600]' :
                      'bg-cyan-400 shadow-[0_0_8px_#00f0ff]'
                    } ${isDecelerating ? 'animate-marquee-blink' : 'animate-pulse'}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))}
              </div>

              {/* Top Peek Name */}
              <div className="text-lg sm:text-2xl font-display font-bold text-gray-500/40 select-none truncate max-w-xl blur-[0.5px] scale-95">
                {prevName.name}
              </div>

              {/* Active Hero Slot Name (Center Target) */}
              <div 
                style={{ background: 'rgba(0, 0, 0, 0.7)', borderColor: '#ff007f' }}
                className="my-5 py-6 px-8 w-full rounded-2xl border-2 shadow-[0_0_30px_rgba(255,0,127,0.4)] relative flex flex-col items-center justify-center"
              >
                <div className="text-xs font-mono text-amber-300 font-extrabold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-current" />
                  <span>CANDIDATE REEL</span>
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-current" />
                </div>

                <div className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-white text-glow-pink tracking-tight truncate w-full">
                  {displayedName.name}
                </div>

                <div className="text-base sm:text-xl font-mono text-cyan-300 font-extrabold tracking-widest mt-3">
                  {displayedName.reg_no}
                </div>

                {/* Laser scanline */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
              </div>

              {/* Bottom Peek Name */}
              <div className="text-lg sm:text-2xl font-display font-bold text-gray-500/40 select-none truncate max-w-xl blur-[0.5px] scale-95">
                {nextName.name}
              </div>

            </div>
          </div>

          <p className="text-xs font-mono font-bold text-amber-300 mt-5 tracking-widest uppercase">
            {isDecelerating ? '🔒 LOCKING IN LUCKY WINNER... NEAR MISS!' : '🎲 SHUFFLING CANDIDATES...'}
          </p>
        </motion.div>
      )}

      {/* STAGE D: FINAL WINNER REVEAL (Ultra Pop Jackpot) */}
      {stage === 'revealed' && winner && (
        <motion.div
          key="revealed"
          initial={{ opacity: 0, scale: 0.7, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 120 }}
          className="w-full max-w-2xl flex flex-col items-center text-center"
        >
          {/* Winner Marquee Ribbon - 100% Guaranteed High Contrast */}
          <div 
            style={{ background: 'linear-gradient(90deg, #ffe600 0%, #ff007f 50%, #00f0ff 100%)' }}
            className="inline-flex items-center gap-3 px-8 py-3 rounded-full text-black font-display font-black text-sm sm:text-base uppercase tracking-widest mb-6 shadow-[0_0_35px_rgba(255,230,0,0.7)] animate-bounce border-2 border-white"
          >
            <Trophy className="w-5 h-5 fill-current text-black" />
            <span className="text-black font-black">🎉 BINGO! OFFICIAL WINNER 🎉</span>
            <Trophy className="w-5 h-5 fill-current text-black" />
          </div>

          {/* Grand Pop Winner Card */}
          <div 
            style={{ background: 'linear-gradient(135deg, #ffe600 0%, #ff007f 50%, #00f0ff 100%)' }}
            className="w-full p-[3px] rounded-3xl shadow-[0_0_40px_rgba(255,230,0,0.5)] mb-8"
          >
            <div 
              style={{ background: 'linear-gradient(180deg, #190e38 0%, #0a061a 100%)' }}
              className="w-full rounded-[22px] p-10 sm:p-14 relative overflow-hidden flex flex-col items-center"
            >
              {/* Radial color bursts */}
              <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

              <div className="text-xs sm:text-sm font-mono text-amber-300 uppercase tracking-widest font-black mb-2 flex items-center justify-center gap-2">
                <span>✦</span> CONGRATULATIONS <span>✦</span>
              </div>

              {/* Winner Name */}
              <h2 className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-white text-glow-yellow tracking-tight my-4">
                {winner.name}
              </h2>

              {/* Winner Reg No Badge */}
              <div 
                style={{ background: '#07050e', borderColor: '#00f0ff' }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl border-2 text-cyan-300 font-mono text-lg sm:text-2xl font-black tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.4)]"
              >
                <span>ID: {winner.reg_no}</span>
              </div>

              {/* Verified Winner Pill Badge */}
              <div 
                style={{ background: 'rgba(16, 185, 129, 0.2)', borderColor: '#34d399' }}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-2 rounded-full border-2 text-emerald-300 font-mono text-xs sm:text-sm font-black tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.45)] mt-6"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-extrabold uppercase">Verified Winner • Draw Confirmed</span>
              </div>
            </div>
          </div>

          {/* Chunky 3D Pop Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              onClick={handleResetForNextDraw}
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ff007f 100%)' }}
              className="btn-pop-3d px-10 py-5 rounded-2xl text-base font-display font-black uppercase tracking-widest text-white shadow-[0_6px_0_#4c1d95,0_12px_25px_rgba(255,0,127,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 border-2 border-white cursor-pointer"
            >
              <RotateCcw className="w-5 h-5 text-white" />
              <span className="font-black text-white">SPIN AGAIN</span>
            </button>

            <button
              onClick={triggerConfetti}
              style={{ background: 'linear-gradient(135deg, #ffe600 0%, #f59e0b 100%)' }}
              className="btn-pop-3d px-8 py-5 rounded-2xl text-base font-display font-black uppercase tracking-wider text-black shadow-[0_6px_0_#b45309,0_12px_25px_rgba(255,230,0,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border-2 border-white cursor-pointer"
            >
              <span className="text-xl">🎉</span>
              <span className="font-black text-black">BLAST CONFETTI</span>
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
