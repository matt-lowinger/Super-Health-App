import React, { useState } from 'react';
import { Exercise } from '../types';
import { Plus, Check, Award } from 'lucide-react';
import { generateId } from '../utils';
import ActivityFilterSelector from './ActivityFilterSelector';

interface ExerciseRegistryPanelProps {
  exercises: Exercise[];
  onAddExercise: (exercise: Exercise) => void;
  onDeleteExercise: (id: string) => void;
}

const CATEGORIES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];

export default function ExerciseRegistryPanel({
  exercises,
  onAddExercise,
  onDeleteExercise
}: ExerciseRegistryPanelProps) {
  // Custom Exercise Form States
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState('Chest');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName.trim()) return;

    // Check if exercise name already exists (case-insensitive)
    const exists = exercises.some(
      ex => ex.name.toLowerCase() === newExerciseName.trim().toLowerCase()
    );
    if (exists) {
      alert('An exercise with this name already exists!');
      return;
    }

    const newEx: Exercise = {
      id: `ex-custom-${generateId()}`,
      name: newExerciseName.trim(),
      category: newExerciseCategory,
      isCustom: true
    };

    onAddExercise(newEx);
    setNewExerciseName('');
    setSuccessMsg(`"${newEx.name}" added to ${newEx.category}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" id="exercise-registry">
      {/* Page Header */}
      <div className="border-b border-[#2C2E33] pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-sans">Exercise Registry</h1>
          <p className="text-sm text-[#8E9299] mt-1">
            Browse 870+ exercises with instructions, muscle targets, equipment filters, and custom movements.
          </p>
        </div>
        
        <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-xl px-4 py-2.5 flex items-center gap-2.5 shrink-0">
          <Award className="w-5 h-5 text-[#CCFF00]" />
          <span className="text-xs text-[#8E9299] font-mono">
            Exercise Database: <strong className="text-[#CCFF00] text-sm font-bold">{exercises.length} Movements</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Register New Custom Movement */}
        <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-2xl p-6 self-start space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#CCFF00]" />
              Register Custom Lift
            </h2>
            <p className="text-xs text-[#8E9299] mt-1 leading-relaxed">
              Add your own unique exercises to include them inside active logs and workout routines.
            </p>
          </div>

          <form onSubmit={handleAddCustom} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase tracking-wider mb-2">
                Exercise Name
              </label>
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#CCFF00] transition"
                placeholder="e.g., Landmine Belt Squat"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase tracking-wider mb-2">
                Primary Category
              </label>
              <select
                value={newExerciseCategory}
                onChange={(e) => setNewExerciseCategory(e.target.value)}
                className="w-full bg-[#0F1113] border border-[#2C2E33] text-slate-300 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#CCFF00] transition cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black font-black py-3 rounded-xl transition duration-200 shadow-lg shadow-[#CCFF00]/15 cursor-pointer text-xs uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              Save to Registry
            </button>
          </form>

          {successMsg && (
            <div className="bg-[#CCFF00]/10 border border-[#CCFF00]/30 rounded-xl p-3 flex items-center gap-2 text-[#CCFF00] text-xs">
              <Check className="w-4 h-4 text-[#CCFF00] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Right Columns: ActivityFilterSelector with Select by Muscle & Select by Equipment */}
        <div className="lg:col-span-3">
          <ActivityFilterSelector exercises={exercises} />
        </div>
      </div>
    </div>
  );
}
