import React, { useState } from 'react';
import { X, RotateCcw, Check, Sparkles, AlertCircle, Info } from 'lucide-react';
import { BreathPattern } from '../../types';

interface ProtocolCalibratorModalProps {
  pattern: BreathPattern;
  isOpen: boolean;
  onClose: () => void;
  onSave: (calibratedPattern: BreathPattern) => void;
  onReset: (patternId: string) => void;
}

export default function ProtocolCalibratorModal({
  pattern,
  isOpen,
  onClose,
  onSave,
  onReset
}: ProtocolCalibratorModalProps) {
  const [inhale, setInhale] = useState(pattern.inhale);
  const [inhaleHold, setInhaleHold] = useState(pattern.inhaleHold);
  const [exhale, setExhale] = useState(pattern.exhale);
  const [exhaleHold, setExhaleHold] = useState(pattern.exhaleHold);

  if (!isOpen) return null;

  const isCustomized =
    inhale !== pattern.defaultInhale ||
    inhaleHold !== pattern.defaultInhaleHold ||
    exhale !== pattern.defaultExhale ||
    exhaleHold !== pattern.defaultExhaleHold;

  const totalCycleSeconds = inhale + inhaleHold + exhale + exhaleHold;
  const breathsPerMinute = totalCycleSeconds > 0 ? (60 / totalCycleSeconds).toFixed(1) : '0';

  const handleReset = () => {
    setInhale(pattern.defaultInhale);
    setInhaleHold(pattern.defaultInhaleHold);
    setExhale(pattern.defaultExhale);
    setExhaleHold(pattern.defaultExhaleHold);
    onReset(pattern.id);
  };

  const handleSave = () => {
    onSave({
      ...pattern,
      inhale: Number(inhale.toFixed(1)),
      inhaleHold: Number(inhaleHold.toFixed(1)),
      exhale: Number(exhale.toFixed(1)),
      exhaleHold: Number(exhaleHold.toFixed(1)),
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div
      id="protocol-calibrator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-[#15171A] border border-[#2C2E33] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2C2E33]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCFF00] bg-[#CCFF00]/10 px-2 py-0.5 rounded">
                Scientific Calibration
              </span>
              {isCustomized && (
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                  Calibrated
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mt-1">{pattern.name}</h3>
            <p className="text-xs text-[#8E9299]">{pattern.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#8E9299] hover:text-white rounded-lg hover:bg-[#202226] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Scientific Disclaimer & Non-custom boundary notice */}
          <div className="flex items-start gap-3 p-3.5 bg-[#1B1D22] border border-[#2C2E33] rounded-xl text-xs text-[#8E9299]">
            <Info className="w-4 h-4 text-[#2DD4BF] shrink-0 mt-0.5" />
            <div>
              <p className="text-[#E6E8EB] font-medium mb-1">Peer-Reviewed Protocol Constraint</p>
              <p>
                In accordance with autonomic physiology protocols, arbitrary custom patterns are prohibited. You may
                calibrate phase seconds to match individual lung volume and CO2 tolerance.
              </p>
            </div>
          </div>

          {/* Real-time Metric Bar */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#111215] border border-[#222429] rounded-xl">
            <div className="text-center">
              <span className="text-[11px] text-[#8E9299] font-medium block">Total Cycle Time</span>
              <span className="text-xl font-mono font-bold text-[#CCFF00]">{totalCycleSeconds.toFixed(1)}s</span>
            </div>
            <div className="text-center border-l border-[#222429]">
              <span className="text-[11px] text-[#8E9299] font-medium block">Respiratory Rate</span>
              <span className="text-xl font-mono font-bold text-[#2DD4BF]">{breathsPerMinute} bpm</span>
            </div>
          </div>

          {/* Phase Sliders */}
          <div className="space-y-4">
            {/* 1. Inhale */}
            <div className="p-3.5 bg-[#1B1D22] border border-[#2C2E33] rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00]"></span>
                  1. Inhale Duration
                </label>
                <span className="text-sm font-mono font-bold text-[#CCFF00] bg-[#CCFF00]/10 px-2 py-0.5 rounded">
                  {inhale.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="15.0"
                step="0.5"
                value={inhale}
                onChange={(e) => setInhale(parseFloat(e.target.value))}
                className="w-full accent-[#CCFF00] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] mt-1 font-mono">
                <span>1.0s</span>
                <span>Default: {pattern.defaultInhale}s</span>
                <span>15.0s</span>
              </div>
            </div>

            {/* 2. Inhale Hold */}
            <div className="p-3.5 bg-[#1B1D22] border border-[#2C2E33] rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF]"></span>
                  2. Inhale Retention (Hold)
                </label>
                <span className="text-sm font-mono font-bold text-[#2DD4BF] bg-[#2DD4BF]/10 px-2 py-0.5 rounded">
                  {inhaleHold.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="20.0"
                step="0.5"
                value={inhaleHold}
                onChange={(e) => setInhaleHold(parseFloat(e.target.value))}
                className="w-full accent-[#2DD4BF] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] mt-1 font-mono">
                <span>0.0s (None)</span>
                <span>Default: {pattern.defaultInhaleHold}s</span>
                <span>20.0s</span>
              </div>
            </div>

            {/* 3. Exhale */}
            <div className="p-3.5 bg-[#1B1D22] border border-[#2C2E33] rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]"></span>
                  3. Exhale Duration
                </label>
                <span className="text-sm font-mono font-bold text-[#60A5FA] bg-[#60A5FA]/10 px-2 py-0.5 rounded">
                  {exhale.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="20.0"
                step="0.5"
                value={exhale}
                onChange={(e) => setExhale(parseFloat(e.target.value))}
                className="w-full accent-[#60A5FA] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] mt-1 font-mono">
                <span>1.0s</span>
                <span>Default: {pattern.defaultExhale}s</span>
                <span>20.0s</span>
              </div>
            </div>

            {/* 4. Exhale Hold / Rest */}
            <div className="p-3.5 bg-[#1B1D22] border border-[#2C2E33] rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]"></span>
                  4. Exhale Retention (Rest/Void)
                </label>
                <span className="text-sm font-mono font-bold text-[#A78BFA] bg-[#A78BFA]/10 px-2 py-0.5 rounded">
                  {exhaleHold.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="20.0"
                step="0.5"
                value={exhaleHold}
                onChange={(e) => setExhaleHold(parseFloat(e.target.value))}
                className="w-full accent-[#A78BFA] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#8E9299] mt-1 font-mono">
                <span>0.0s (None)</span>
                <span>Default: {pattern.defaultExhaleHold}s</span>
                <span>20.0s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#2C2E33] bg-[#111215]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#8E9299] hover:text-white bg-[#1B1D22] hover:bg-[#25282F] rounded-lg border border-[#2C2E33] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Scientific Defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#8E9299] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-black bg-[#CCFF00] hover:bg-[#b8e600] rounded-lg shadow transition"
            >
              <Check className="w-4 h-4" />
              Save Calibration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
