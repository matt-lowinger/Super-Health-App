import React, { useState } from 'react';
import { Sparkles, Heart, Moon, Zap, Smile, Check, MessageSquare } from 'lucide-react';
import { PostSessionFeeling, BreathworkSession } from '../../types';

interface PostSessionCheckinModalProps {
  sessionSummary: Partial<BreathworkSession>;
  isOpen: boolean;
  onSave: (feeling: PostSessionFeeling, notes: string) => void;
  onSkip: () => void;
}

export default function PostSessionCheckinModal({
  sessionSummary,
  isOpen,
  onSave,
  onSkip
}: PostSessionCheckinModalProps) {
  const [selectedFeeling, setSelectedFeeling] = useState<PostSessionFeeling>('calm');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const feelings: { id: PostSessionFeeling; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
    {
      id: 'calm',
      label: 'Deeply Calm',
      icon: <Heart className="w-5 h-5 text-emerald-400" />,
      desc: 'Soothed, grounded, parasympathetic shift',
      color: 'border-emerald-500/40 bg-emerald-500/10'
    },
    {
      id: 'focused',
      label: 'Laser Focused',
      icon: <Sparkles className="w-5 h-5 text-[#CCFF00]" />,
      desc: 'Sharp, clear-headed, balanced tone',
      color: 'border-[#CCFF00]/40 bg-[#CCFF00]/10'
    },
    {
      id: 'energized',
      label: 'Energized',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      desc: 'Awake, oxygenated, primed for action',
      color: 'border-amber-500/40 bg-amber-500/10'
    },
    {
      id: 'sleepy',
      label: 'Sleep Ready',
      icon: <Moon className="w-5 h-5 text-purple-400" />,
      desc: 'Heavy eyelids, ready for restorative rest',
      color: 'border-purple-500/40 bg-purple-500/10'
    }
  ];

  return (
    <div
      id="post-session-checkin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="bg-[#15171A] border border-[#2C2E33] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 text-center border-b border-[#2C2E33] bg-gradient-to-b from-[#1C1F24] to-[#15171A]">
          <div className="inline-flex p-3 rounded-full bg-[#CCFF00]/15 text-[#CCFF00] mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Session Completed</h3>
          <p className="text-xs text-[#8E9299] mt-1">{sessionSummary.patternName}</p>

          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-[#2C2E33]/60 text-center font-mono">
            <div>
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block">Duration</span>
              <span className="text-sm font-bold text-white">{sessionSummary.durationMinutes} min</span>
            </div>
            <div className="border-l border-[#2C2E33] pl-6">
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block">Completed Cycles</span>
              <span className="text-sm font-bold text-[#CCFF00]">{sessionSummary.cyclesCompleted} breaths</span>
            </div>
          </div>
        </div>

        {/* Post-Session Feeling Selection */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#E6E8EB] block mb-2">
              Autonomic State: How are you feeling now?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {feelings.map((f) => {
                const isSelected = selectedFeeling === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFeeling(f.id)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? `${f.color} ring-1 ring-white/20`
                        : 'border-[#2C2E33] bg-[#1B1D22] hover:bg-[#202227] text-[#8E9299]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {f.icon}
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-[#E6E8EB]'}`}>
                      {f.label}
                    </span>
                    <span className="text-[10px] text-[#8E9299] leading-tight line-clamp-1">{f.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#E6E8EB] flex items-center gap-1.5 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#8E9299]" />
              Session Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared post-squat fatigue, heart rate steady..."
              className="w-full bg-[#1B1D22] border border-[#2C2E33] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8E9299] focus:outline-none focus:border-[#CCFF00]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#2C2E33] bg-[#111215]">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-xs font-medium text-[#8E9299] hover:text-white transition"
          >
            Skip Check-in
          </button>
          <button
            type="button"
            onClick={() => onSave(selectedFeeling, notes)}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-black bg-[#CCFF00] hover:bg-[#b8e600] rounded-xl shadow transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Log Breathwork
          </button>
        </div>
      </div>
    </div>
  );
}
