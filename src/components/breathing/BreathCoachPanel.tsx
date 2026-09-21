import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  Sparkles,
  Waves,
  Check,
  ChevronDown,
  Info,
  Calendar,
  Clock,
  Heart,
  Moon,
  Zap,
  Activity,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';
import {
  BreathPattern,
  BreathPhase,
  VisualMode,
  DynamicBackgroundScene,
  AmbientSoundscape,
  BreathworkSession,
  PostSessionFeeling
} from '../../types';
import { SCIENTIFIC_BREATH_PROTOCOLS, INITIAL_BREATHWORK_SESSIONS } from '../../data/breathProtocols';
import BreathCanvas from './BreathCanvas';
import ProtocolCalibratorModal from './ProtocolCalibratorModal';
import PostSessionCheckinModal from './PostSessionCheckinModal';
import { breathAudio } from '../../utils/audioSynth';

interface BreathCoachPanelProps {
  patterns: BreathPattern[];
  sessions: BreathworkSession[];
  onSavePattern: (pattern: BreathPattern) => void;
  onResetPattern: (patternId: string) => void;
  onSaveSession: (session: BreathworkSession) => void;
  cloudSyncStatus?: string;
  onManualSync?: () => void;
}

export default function BreathCoachPanel({
  patterns,
  sessions,
  onSavePattern,
  onResetPattern,
  onSaveSession,
  cloudSyncStatus = 'Synced with Cloud',
  onManualSync
}: BreathCoachPanelProps) {
  // Active Selected Protocol
  const [activePatternId, setActivePatternId] = useState<string>('box-breathing');

  // Protocol state merged with user calibrations
  const activePattern = patterns.find((p) => p.id === activePatternId) || patterns[0] || SCIENTIFIC_BREATH_PROTOCOLS[0];

  // Visual & Audio Controls
  const [visualMode, setVisualMode] = useState<VisualMode>('wave');
  const [backgroundScene, setBackgroundScene] = useState<DynamicBackgroundScene>('lake-tahoe');
  const [soundscape, setSoundscape] = useState<AmbientSoundscape>('ocean-waves');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(0.5);

  // Session Runner State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(5); // 2, 5, 10, 15, 20
  const [sessionSecondsElapsed, setSessionSecondsElapsed] = useState<number>(0);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);

  // Current Breath Phase HUD State (updated smoothly)
  const [currentPhase, setCurrentPhase] = useState<BreathPhase>('inhale');
  const [secondsRemainingInPhase, setSecondsRemainingInPhase] = useState<number>(activePattern.inhale);

  // Modals
  const [calibratingPattern, setCalibratingPattern] = useState<BreathPattern | null>(null);
  const [completedSessionData, setCompletedSessionData] = useState<Partial<BreathworkSession> | null>(null);

  // Sub-view: Practice Studio vs Protocols Catalog vs Session History
  const [coachTab, setCoachTab] = useState<'studio' | 'protocols' | 'history'>('studio');
  const [protocolCategoryFilter, setProtocolCategoryFilter] = useState<string>('all');

  // Sync Audio Volume
  useEffect(() => {
    breathAudio.setVolume(audioVolume);
  }, [audioVolume]);

  // Handle Soundscape Change
  useEffect(() => {
    if (isRunning && !isAudioMuted) {
      breathAudio.startSoundscape(soundscape);
    } else {
      breathAudio.stopSoundscape();
    }
  }, [isRunning, soundscape, isAudioMuted]);

  // Session Wall-Clock Timer
  useEffect(() => {
    let timer: number | null = null;
    if (isRunning) {
      timer = window.setInterval(() => {
        setSessionSecondsElapsed((prev) => {
          const next = prev + 1;
          const targetSeconds = sessionDurationMinutes * 60;
          if (sessionDurationMinutes > 0 && next >= targetSeconds) {
            // Auto complete session
            handleEndSession();
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, sessionDurationMinutes]);

  // Handle Phase Change from Canvas (trigger phase chime)
  const handlePhaseChange = useCallback((phase: BreathPhase) => {
    setCurrentPhase(phase);
    breathAudio.playPhaseChime(phase);
  }, []);

  // Handle Seconds Tick from Canvas
  const handleSecondsTick = useCallback((phase: BreathPhase, secondsRemaining: number) => {
    setCurrentPhase(phase);
    setSecondsRemainingInPhase(secondsRemaining);
  }, []);

  // Handle Cycle Completed
  const handleCycleComplete = useCallback((cycles: number) => {
    setCyclesCompleted(cycles);
  }, []);

  const handleStartSession = () => {
    setIsRunning(true);
    if (!isAudioMuted && soundscape !== 'none') {
      breathAudio.startSoundscape(soundscape);
    }
  };

  const handlePauseSession = () => {
    setIsRunning(false);
    breathAudio.stopSoundscape();
  };

  const handleResetSession = () => {
    setIsRunning(false);
    setSessionSecondsElapsed(0);
    setCyclesCompleted(0);
    breathAudio.stopSoundscape();
  };

  const handleEndSession = () => {
    setIsRunning(false);
    breathAudio.stopSoundscape();

    const durationSec = Math.max(sessionSecondsElapsed, 1);
    const durationMin = Math.max(1, Math.round(durationSec / 60));

    setCompletedSessionData({
      id: `bs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      patternId: activePattern.id,
      patternName: activePattern.name,
      durationMinutes: durationMin,
      durationSeconds: durationSec,
      cyclesCompleted: Math.max(cyclesCompleted, 1),
      backgroundScene
    });
  };

  const handleSavePostSessionCheckin = (feeling: PostSessionFeeling, notes: string) => {
    if (!completedSessionData) return;

    const fullSession: BreathworkSession = {
      id: completedSessionData.id || `bs-${Date.now()}`,
      date: completedSessionData.date || new Date().toISOString().split('T')[0],
      startTime: completedSessionData.startTime || '12:00 PM',
      timestamp: completedSessionData.timestamp || Date.now(),
      patternId: activePattern.id,
      patternName: activePattern.name,
      durationMinutes: completedSessionData.durationMinutes || 1,
      durationSeconds: completedSessionData.durationSeconds || 60,
      cyclesCompleted: completedSessionData.cyclesCompleted || 1,
      feelingAfter: feeling,
      backgroundScene,
      notes
    };

    onSaveSession(fullSession);
    setCompletedSessionData(null);
    setSessionSecondsElapsed(0);
    setCyclesCompleted(0);
  };

  // Phase Title & Guidance Mapping
  const getPhaseInfo = (phase: BreathPhase) => {
    switch (phase) {
      case 'inhale':
        return {
          title: 'Inhale',
          badgeColor: 'text-[#CCFF00] bg-[#CCFF00]/15 border-[#CCFF00]/30',
          guidance: 'Deep, smooth nasal expansion into the lower diaphragm.'
        };
      case 'inhaleHold':
        return {
          title: 'Hold (Retention)',
          badgeColor: 'text-[#2DD4BF] bg-[#2DD4BF]/15 border-[#2DD4BF]/30',
          guidance: 'Soft throat, relaxed shoulders, still awareness.'
        };
      case 'exhale':
        return {
          title: 'Exhale',
          badgeColor: 'text-[#60A5FA] bg-[#60A5FA]/15 border-[#60A5FA]/30',
          guidance: 'Slow, unforced, complete release of all air.'
        };
      case 'exhaleHold':
        return {
          title: 'Rest (Void)',
          badgeColor: 'text-[#A78BFA] bg-[#A78BFA]/15 border-[#A78BFA]/30',
          guidance: 'Rest in the pause. Absorb the calm.'
        };
    }
  };

  const phaseInfo = getPhaseInfo(currentPhase);

  // Stats Calculations
  const totalMindfulMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalBreaths = sessions.reduce((acc, s) => acc + (s.cyclesCompleted || 0), 0);

  // Filtered protocols
  const filteredProtocols = patterns.filter((p) => {
    if (protocolCategoryFilter === 'all') return true;
    return p.category === protocolCategoryFilter;
  });

  return (
    <div id="pocket-breath-coach" className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header & Scientific Credentials Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[#15171A] border border-[#2C2E33] rounded-2xl shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#CCFF00]/10 border border-[#CCFF00]/25 rounded-xl text-[#CCFF00]">
            <Waves className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCFF00] bg-[#CCFF00]/10 px-2 py-0.5 rounded">
                Autonomic Regulation
              </span>
              <span className="text-[10px] font-medium text-[#8E9299] bg-[#202227] px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#2DD4BF]" />
                Stanford & Harvard Research Validated
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-0.5">
              Pocket Breath Coach
            </h1>
            <p className="text-xs text-[#8E9299]">
              Calibrate respiratory sinus arrhythmia (RSA), heart rate variability (HRV), and vagal efferent activity.
            </p>
          </div>
        </div>

        {/* Global Stats & Cloud Sync Status */}
        <div className="flex items-center gap-3">
          <div className="bg-[#1A1C20] border border-[#2C2E33] rounded-xl px-3 py-2 text-right">
            <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium">
              Mindful Breath
            </span>
            <div className="flex items-baseline justify-end gap-1.5 font-mono">
              <span className="text-base font-bold text-[#CCFF00]">{totalMindfulMinutes}</span>
              <span className="text-[10px] text-[#8E9299]">min</span>
              <span className="text-xs text-[#2C2E33]">|</span>
              <span className="text-sm font-bold text-[#2DD4BF]">{totalBreaths}</span>
              <span className="text-[10px] text-[#8E9299]">cycles</span>
            </div>
          </div>

          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              title={cloudSyncStatus}
              className="p-2.5 bg-[#1A1C20] hover:bg-[#22252B] border border-[#2C2E33] text-[#8E9299] hover:text-[#CCFF00] rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Navigation Tabs: Practice Studio | Scientific Protocols | Session History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2C2E33] pb-2 gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setCoachTab('studio')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              coachTab === 'studio'
                ? 'bg-[#CCFF00] text-black shadow-md'
                : 'bg-[#15171A] text-[#8E9299] hover:text-white border border-[#2C2E33]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Practice Studio
          </button>
          <button
            type="button"
            onClick={() => setCoachTab('protocols')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              coachTab === 'protocols'
                ? 'bg-[#CCFF00] text-black shadow-md'
                : 'bg-[#15171A] text-[#8E9299] hover:text-white border border-[#2C2E33]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Protocols ({patterns.length})
          </button>
          <button
            type="button"
            onClick={() => setCoachTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              coachTab === 'history'
                ? 'bg-[#CCFF00] text-black shadow-md'
                : 'bg-[#15171A] text-[#8E9299] hover:text-white border border-[#2C2E33]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            History ({sessions.length})
          </button>
        </div>

        {/* Selected Protocol Quick Switcher in Studio */}
        {coachTab === 'studio' && (
          <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-start pt-1 sm:pt-0">
            <span className="text-[11px] text-[#8E9299] shrink-0">Protocol:</span>
            <select
              value={activePatternId}
              onChange={(e) => setActivePatternId(e.target.value)}
              className="flex-1 sm:flex-initial bg-[#15171A] border border-[#2C2E33] rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-[#CCFF00] cursor-pointer"
            >
              {patterns.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: ACTIVE PRACTICE STUDIO (CANVAS + HUD + CONTROLS)        */}
      {/* ============================================================== */}
      {coachTab === 'studio' && (
        <div className="space-y-4">
          {/* Main Stage: Decoupled Physics Canvas + Floating HUD Overlay */}
          <div className="relative rounded-2xl overflow-hidden border border-[#2C2E33] shadow-2xl bg-black">
            {/* The Decoupled 60/120 FPS Physics Canvas */}
            <BreathCanvas
              pattern={activePattern}
              isRunning={isRunning}
              visualMode={visualMode}
              backgroundScene={backgroundScene}
              onPhaseChange={handlePhaseChange}
              onCycleComplete={handleCycleComplete}
              onSecondsTick={handleSecondsTick}
            />

            {/* Top HUD: Current Phase + Big Countdown + Guidance */}
            <div className="absolute top-4 inset-x-4 flex flex-col items-center pointer-events-none">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg transition-all ${phaseInfo.badgeColor}`}
              >
                <span className="w-2 h-2 rounded-full animate-ping bg-current opacity-75"></span>
                {phaseInfo.title}
              </div>

              {/* Big Phase Countdown Seconds */}
              <div className="text-4xl sm:text-5xl font-mono font-black text-white mt-1 drop-shadow-md">
                {secondsRemainingInPhase}
                <span className="text-xl sm:text-2xl text-[#8E9299] ml-1">s</span>
              </div>

              {/* Soothing Instructional Guidance */}
              <p className="text-xs sm:text-sm text-[#E6E8EB]/90 font-medium text-center max-w-md mt-1 drop-shadow px-3 py-0.5 rounded-lg bg-black/40 backdrop-blur-sm">
                {phaseInfo.guidance}
              </p>
            </div>

            {/* Bottom HUD: Protocol Name & Phase Ratio Badges */}
            <div className="absolute bottom-4 inset-x-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] text-[#8E9299] font-medium block">Active Protocol</span>
                <span className="text-xs font-bold text-white">{activePattern.name}</span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px] bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl">
                <span className="text-[#CCFF00] font-bold">In: {activePattern.inhale}s</span>
                <span className="text-white/20">|</span>
                <span className="text-[#2DD4BF] font-bold">Hold: {activePattern.inhaleHold}s</span>
                <span className="text-white/20">|</span>
                <span className="text-[#60A5FA] font-bold">Ex: {activePattern.exhale}s</span>
                <span className="text-white/20">|</span>
                <span className="text-[#A78BFA] font-bold">Rest: {activePattern.exhaleHold}s</span>
              </div>
            </div>
          </div>

          {/* Studio Controls Deck */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Control 1: Primary Session Runner Play/Pause/End */}
            <div className="p-4 bg-[#15171A] border border-[#2C2E33] rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8E9299]">
                  Session Progress
                </span>
                <div className="flex items-center gap-1.5 font-mono text-xs text-[#E6E8EB]">
                  <Clock className="w-3.5 h-3.5 text-[#CCFF00]" />
                  <span>
                    {Math.floor(sessionSecondsElapsed / 60)}:
                    {(sessionSecondsElapsed % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-[#8E9299]">
                    / {sessionDurationMinutes > 0 ? `${sessionDurationMinutes}:00` : '∞'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#202227] h-2 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-[#CCFF00] h-full transition-all duration-300"
                  style={{
                    width:
                      sessionDurationMinutes > 0
                        ? `${Math.min(100, (sessionSecondsElapsed / (sessionDurationMinutes * 60)) * 100)}%`
                        : '100%'
                  }}
                ></div>
              </div>

              {/* Play / Pause / Reset / End Action Buttons */}
              <div className="flex items-center gap-2">
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="flex-1 py-3 bg-[#CCFF00] hover:bg-[#b8e600] text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Begin Breathwork
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseSession}
                    className="flex-1 py-3 bg-[#202227] hover:bg-[#282B32] text-white border border-[#2C2E33] font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetSession}
                  title="Reset clock"
                  className="p-3 bg-[#1A1C20] hover:bg-[#22252B] border border-[#2C2E33] text-[#8E9299] hover:text-white rounded-xl transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleEndSession}
                  disabled={sessionSecondsElapsed < 5}
                  className="px-3.5 py-3 bg-[#2DD4BF]/15 hover:bg-[#2DD4BF]/25 text-[#2DD4BF] border border-[#2DD4BF]/30 font-bold text-xs rounded-xl disabled:opacity-40 transition cursor-pointer"
                >
                  Finish
                </button>
              </div>

              {/* Target Duration Selector */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2C2E33]">
                <span className="text-[11px] text-[#8E9299]">Target:</span>
                <div className="flex gap-1">
                  {[2, 5, 10, 15, 20].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSessionDurationMinutes(mins)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                        sessionDurationMinutes === mins
                          ? 'bg-[#CCFF00] text-black font-bold'
                          : 'bg-[#1E2025] text-[#8E9299] hover:text-white'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Control 2: Visual Experience & Cinematic Background */}
            <div className="p-4 bg-[#15171A] border border-[#2C2E33] rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8E9299]">
                    Visual Experience
                  </span>
                  <span className="text-[11px] font-mono text-[#CCFF00] flex items-center gap-1.5 font-bold">
                    <Waves className="w-3.5 h-3.5" />
                    Oceanic Wave
                  </span>
                </div>

                {/* Cinematic Background Scene */}
                <div className="mt-2">
                  <span className="text-[11px] text-[#8E9299] mb-1.5 block">Dynamic Environment:</span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {(
                      [
                        { id: 'lake-tahoe', label: 'Lake Tahoe' },
                        { id: 'aurora-borealis', label: 'Aurora' },
                        { id: 'twilight-sunset', label: 'Sunset' },
                        { id: 'forest-mist', label: 'Forest' },
                        { id: 'minimal-zen', label: 'Zen Onyx' }
                      ] as const
                    ).map((scene) => (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => setBackgroundScene(scene.id)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition cursor-pointer text-center ${
                          backgroundScene === scene.id
                            ? 'bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/40 font-bold'
                            : 'bg-[#1E2025] text-[#8E9299] hover:text-white border border-transparent'
                        }`}
                      >
                        {scene.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Calibrate Timing Button */}
              <button
                type="button"
                onClick={() => setCalibratingPattern(activePattern)}
                className="mt-3 pt-3 border-t border-[#2C2E33] flex items-center justify-center gap-1.5 text-xs text-[#2DD4BF] hover:underline cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                Calibrate Phase Seconds for this Protocol
              </button>
            </div>

            {/* Control 3: Web Audio Synthesizer & Soundscapes */}
            <div className="p-4 bg-[#15171A] border border-[#2C2E33] rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8E9299]">
                  Audio Synthesizer
                </span>
                <button
                  type="button"
                  onClick={() => setIsAudioMuted(breathAudio.toggleMute())}
                  className="p-1.5 text-[#8E9299] hover:text-white rounded-lg transition cursor-pointer"
                >
                  {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Soundscape Options */}
              <div className="space-y-1.5 mb-3">
                <span className="text-[11px] text-[#8E9299] block">Ambient Soundscape:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'ocean-waves', label: 'Ocean Waves' },
                      { id: 'forest-rain', label: 'Forest Rain' },
                      { id: 'tibetan-bowls', label: 'Tibetan Bowls' },
                      { id: 'brown-noise', label: 'Brown Noise' },
                      { id: 'none', label: 'Chimes Only' }
                    ] as const
                  ).map((snd) => (
                    <button
                      key={snd.id}
                      type="button"
                      onClick={() => setSoundscape(snd.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                        soundscape === snd.id
                          ? 'bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40 font-bold'
                          : 'bg-[#1E2025] text-[#8E9299] hover:text-white border border-transparent'
                      }`}
                    >
                      {snd.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1 pt-2 border-t border-[#2C2E33]">
                <div className="flex justify-between text-[11px] text-[#8E9299]">
                  <span>Master Volume</span>
                  <span>{Math.round(audioVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                  className="w-full accent-[#CCFF00] cursor-pointer"
                />
              </div>

              <div className="text-[10px] text-[#8E9299] mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#CCFF00]" />
                Web Audio 432Hz/528Hz crystal bowl chimes enabled
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: SCIENTIFIC PROTOCOLS CATALOG (8 SCIENTIFIC PROTOCOLS)  */}
      {/* ============================================================== */}
      {coachTab === 'protocols' && (
        <div className="space-y-4">
          {/* Zero Custom Pattern Constraint Notice */}
          <div className="p-4 bg-[#15171A] border border-[#2C2E33] rounded-2xl flex items-start gap-3 text-xs text-[#8E9299]">
            <Info className="w-5 h-5 text-[#CCFF00] shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold mb-0.5">Strict Scientific Rigor Policy</p>
              <p>
                Arbitrary, unverified custom breathing patterns are strictly prohibited. Each protocol below is derived
                directly from peer-reviewed clinical neuroscience and exercise physiology (Stanford, Harvard, Navy
                SEALs, Buteyko). You may customize and calibrate the phase seconds for any protocol.
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Protocols' },
              { id: 'stress', label: 'Acute Stress & Panic' },
              { id: 'sleep', label: 'Sleep & Relaxation' },
              { id: 'hrv', label: 'Peak HRV Coherence' },
              { id: 'recovery', label: 'Post-Workout Recovery' },
              { id: 'energy', label: 'Alertness & Focus' },
              { id: 'endurance', label: 'CO2 Tolerance' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setProtocolCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  protocolCategoryFilter === cat.id
                    ? 'bg-[#CCFF00] text-black font-bold'
                    : 'bg-[#15171A] text-[#8E9299] hover:text-white border border-[#2C2E33]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Protocols Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProtocols.map((protocol) => {
              const isCalibrated =
                protocol.inhale !== protocol.defaultInhale ||
                protocol.inhaleHold !== protocol.defaultInhaleHold ||
                protocol.exhale !== protocol.defaultExhale ||
                protocol.exhaleHold !== protocol.defaultExhaleHold;

              const isCurrentlySelected = activePattern.id === protocol.id;

              return (
                <div
                  key={protocol.id}
                  className={`p-5 bg-[#15171A] border rounded-2xl flex flex-col justify-between transition ${
                    isCurrentlySelected
                      ? 'border-[#CCFF00] shadow-lg ring-1 ring-[#CCFF00]/30'
                      : 'border-[#2C2E33] hover:border-[#3E4249]'
                  }`}
                >
                  <div>
                    {/* Top Row Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#2DD4BF] bg-[#2DD4BF]/10 px-2 py-0.5 rounded">
                        {protocol.subtitle}
                      </span>
                      {isCalibrated && (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          Calibrated
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{protocol.name}</h3>

                    {/* Scientific Source */}
                    <p className="text-[11px] text-[#CCFF00]/80 font-medium mb-2.5">
                      Source: {protocol.scientificSource}
                    </p>

                    {/* Clinical Mechanism */}
                    <p className="text-xs text-[#8E9299] leading-relaxed mb-3">
                      {protocol.clinicalMechanism}
                    </p>

                    {/* Target Effect */}
                    <div className="p-2.5 bg-[#111215] border border-[#202227] rounded-xl text-[11px] text-[#E6E8EB] mb-4">
                      <span className="text-[#8E9299] font-medium block text-[10px] uppercase tracking-wider">
                        Autonomic Target Effect:
                      </span>
                      {protocol.targetEffect}
                    </div>

                    {/* Phase Seconds Chips */}
                    <div className="grid grid-cols-4 gap-1.5 text-center font-mono mb-4">
                      <div className="p-2 bg-[#1B1D22] border border-[#2C2E33] rounded-lg">
                        <span className="text-[9px] text-[#8E9299] block">Inhale</span>
                        <span className="text-xs font-bold text-[#CCFF00]">{protocol.inhale}s</span>
                      </div>
                      <div className="p-2 bg-[#1B1D22] border border-[#2C2E33] rounded-lg">
                        <span className="text-[9px] text-[#8E9299] block">Hold</span>
                        <span className="text-xs font-bold text-[#2DD4BF]">{protocol.inhaleHold}s</span>
                      </div>
                      <div className="p-2 bg-[#1B1D22] border border-[#2C2E33] rounded-lg">
                        <span className="text-[9px] text-[#8E9299] block">Exhale</span>
                        <span className="text-xs font-bold text-[#60A5FA]">{protocol.exhale}s</span>
                      </div>
                      <div className="p-2 bg-[#1B1D22] border border-[#2C2E33] rounded-lg">
                        <span className="text-[9px] text-[#8E9299] block">Rest</span>
                        <span className="text-xs font-bold text-[#A78BFA]">{protocol.exhaleHold}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Practice & Calibrate */}
                  <div className="flex items-center gap-2 pt-3 border-t border-[#2C2E33]">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePatternId(protocol.id);
                        setCoachTab('studio');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isCurrentlySelected
                          ? 'bg-[#CCFF00] text-black font-extrabold'
                          : 'bg-[#202227] hover:bg-[#282B32] text-white border border-[#2C2E33]'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {isCurrentlySelected ? 'Practicing Now' : 'Practice Protocol'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCalibratingPattern(protocol)}
                      title="Calibrate phase seconds"
                      className="p-2 bg-[#1B1D22] hover:bg-[#25282F] border border-[#2C2E33] text-[#8E9299] hover:text-[#2DD4BF] rounded-xl transition cursor-pointer"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    {isCalibrated && (
                      <button
                        type="button"
                        onClick={() => onResetPattern(protocol.id)}
                        title="Reset to Scientific Defaults"
                        className="p-2 bg-[#1B1D22] hover:bg-[#25282F] border border-[#2C2E33] text-[#8E9299] hover:text-amber-400 rounded-xl transition cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: SESSION LOG HISTORY                                    */}
      {/* ============================================================== */}
      {coachTab === 'history' && (
        <div className="space-y-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#15171A] border border-[#2C2E33] rounded-2xl">
            <div className="p-3 bg-[#1B1D22] rounded-xl border border-[#26282E]">
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium">
                Total Mindful Minutes
              </span>
              <span className="text-xl font-bold font-mono text-[#CCFF00]">{totalMindfulMinutes} min</span>
            </div>
            <div className="p-3 bg-[#1B1D22] rounded-xl border border-[#26282E]">
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium">
                Completed Respiratory Cycles
              </span>
              <span className="text-xl font-bold font-mono text-[#2DD4BF]">{totalBreaths} breaths</span>
            </div>
            <div className="p-3 bg-[#1B1D22] rounded-xl border border-[#26282E]">
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium">
                Sessions Logged
              </span>
              <span className="text-xl font-bold font-mono text-white">{sessions.length} sessions</span>
            </div>
          </div>

          {/* History List */}
          {sessions.length === 0 ? (
            <div className="p-12 text-center bg-[#15171A] border border-[#2C2E33] rounded-2xl">
              <Waves className="w-10 h-10 text-[#8E9299] mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-white mb-1">No Breathwork Sessions Logged Yet</h3>
              <p className="text-xs text-[#8E9299] max-w-sm mx-auto mb-4">
                Complete a session in the Practice Studio to begin tracking your heart rate variability and vagal
                conditioning history.
              </p>
              <button
                type="button"
                onClick={() => setCoachTab('studio')}
                className="px-5 py-2.5 bg-[#CCFF00] hover:bg-[#b8e600] text-black font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                Start First Session
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-4 bg-[#15171A] border border-[#2C2E33] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#3E4249] transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-[#202227] border border-[#2C2E33] rounded-xl text-[#CCFF00] mt-0.5">
                      <Waves className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{sess.patternName}</h4>
                        {sess.feelingAfter && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                              sess.feelingAfter === 'calm'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : sess.feelingAfter === 'focused'
                                ? 'bg-[#CCFF00]/15 text-[#CCFF00]'
                                : sess.feelingAfter === 'energized'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-purple-500/15 text-purple-400'
                            }`}
                          >
                            {sess.feelingAfter}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#8E9299] mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {sess.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {sess.startTime}
                        </span>
                      </div>
                      {sess.notes && (
                        <p className="text-xs text-[#E6E8EB]/80 italic mt-1.5">&ldquo;{sess.notes}&rdquo;</p>
                      )}
                    </div>
                  </div>

                  {/* Right Metrics */}
                  <div className="flex items-center gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2C2E33] justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium">
                        Duration
                      </span>
                      <span className="text-sm font-mono font-bold text-white">{sess.durationMinutes} min</span>
                    </div>
                    <div className="text-right border-l border-[#2C2E33] pl-4">
                      <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-medium">
                        Cycles
                      </span>
                      <span className="text-sm font-mono font-bold text-[#CCFF00]">{sess.cyclesCompleted}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calibration Modal */}
      {calibratingPattern && (
        <ProtocolCalibratorModal
          pattern={calibratingPattern}
          isOpen={true}
          onClose={() => setCalibratingPattern(null)}
          onSave={(updated) => {
            onSavePattern(updated);
            setCalibratingPattern(null);
          }}
          onReset={(id) => {
            onResetPattern(id);
          }}
        />
      )}

      {/* Post-Session Check-in Modal */}
      {completedSessionData && (
        <PostSessionCheckinModal
          sessionSummary={completedSessionData}
          isOpen={true}
          onSave={handleSavePostSessionCheckin}
          onSkip={() => handleSavePostSessionCheckin('calm', '')}
        />
      )}
    </div>
  );
}
