import React, { useState } from 'react';
import { ActiveSession, Exercise, WorkoutExercise, WorkoutSet, CompletedWorkout } from '../types';
import { Play, Square, Plus, Trash2, Dumbbell, Search, X, Award, AlertCircle, BookOpen, PlusCircle, ArrowUpRight, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { getExerciseHistory, getLastSetHistoryEntries, generateId } from '../utils';
import ActivityFilterSelector from './ActivityFilterSelector';

interface ActiveWorkoutPanelProps {
  activeSession: ActiveSession | null;
  exercises: Exercise[];
  completedWorkouts: CompletedWorkout[];
  onStartEmptyWorkout: () => void;
  onFinishWorkout: (notes: string, name: string) => void;
  onCancelWorkout: () => void;
  onUpdateActiveSession: (session: ActiveSession) => void;
  onAddExercise?: (exercise: Exercise) => void;
}

export default function ActiveWorkoutPanel({
  activeSession,
  exercises,
  completedWorkouts,
  onStartEmptyWorkout,
  onFinishWorkout,
  onCancelWorkout,
  onUpdateActiveSession,
  onAddExercise
}: ActiveWorkoutPanelProps) {
  // Search/Add exercise modal states
  const [showAddExModal, setShowAddExModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // View tab inside active session: cards vs datatable
  const [activeSessionTab, setActiveSessionTab] = useState<'cards' | 'datatable'>('cards');
  const [workoutName, setWorkoutName] = useState(activeSession?.name || 'Quick Workout');
  const [workoutNotes, setWorkoutNotes] = useState(activeSession?.notes || '');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Helper: Get previous workout sets for a specific exercise ID
  const getPreviousWorkoutSets = (exerciseId: string): WorkoutSet[] => {
    // Find latest completed workout that contains this exercise
    const sorted = [...completedWorkouts].sort((a, b) => b.startTime - a.startTime);
    for (const cw of sorted) {
      const match = cw.exercises.find(e => e.exerciseId === exerciseId);
      if (match && match.sets.length > 0) {
        return match.sets;
      }
    }
    return [];
  };

  // Handle Set parameter change (auto-log on input)
  const handleUpdateSetField = (
    exerciseInstanceId: string,
    setId: string,
    field: 'weight' | 'reps',
    value: number
  ) => {
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id !== exerciseInstanceId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => {
          if (s.id !== setId) return s;
          const updatedSet = {
            ...s,
            [field]: Math.max(0, value),
            // Auto-mark completed if weight or reps > 0
            completed: true
          };
          return updatedSet;
        })
      };
    });

    onUpdateActiveSession({
      ...activeSession,
      exercises: updatedExercises
    });
  };

  // Add individual set row
  const handleAddSet = (exerciseInstanceId: string, exerciseId: string) => {
    if (!activeSession) return;

    const prevSets = getPreviousWorkoutSets(exerciseId);

    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id !== exerciseInstanceId) return ex;
      
      const setIdx = ex.sets.length;
      // Use previous set value or last set's value as default helper
      let defaultWeight = 100;
      let defaultReps = 11;
      let defaultBw = false;

      if (prevSets[setIdx]) {
        defaultWeight = prevSets[setIdx].weight;
        defaultReps = prevSets[setIdx].reps;
        defaultBw = !!prevSets[setIdx].isBodyweight;
      } else if (ex.sets.length > 0) {
        defaultWeight = ex.sets[ex.sets.length - 1].weight;
        defaultReps = ex.sets[ex.sets.length - 1].reps;
        defaultBw = !!ex.sets[ex.sets.length - 1].isBodyweight;
      }

      const newSet: WorkoutSet = {
        id: `s-active-${generateId()}`,
        weight: defaultWeight,
        reps: defaultReps,
        completed: true, // Auto logged
        isBodyweight: defaultBw
      };

      return {
        ...ex,
        sets: [...ex.sets, newSet]
      };
    });

    onUpdateActiveSession({
      ...activeSession,
      exercises: updatedExercises
    });
  };

  // Toggle Bodyweight for a set
  const handleToggleBodyweight = (exerciseInstanceId: string, setId: string) => {
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id !== exerciseInstanceId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => {
          if (s.id !== setId) return s;
          const isBw = !s.isBodyweight;
          return {
            ...s,
            isBodyweight: isBw,
            weight: isBw ? 0 : (s.weight || 0),
            completed: true
          };
        })
      };
    });

    onUpdateActiveSession({
      ...activeSession,
      exercises: updatedExercises
    });
  };

  // Move exercise up or down within active session
  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    if (!activeSession) return;
    const newArr = [...activeSession.exercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newArr.length) return;
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    onUpdateActiveSession({
      ...activeSession,
      exercises: newArr
    });
  };

  // Delete set row
  const handleRemoveSet = (exerciseInstanceId: string, setId: string) => {
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id !== exerciseInstanceId) return ex;
      return {
        ...ex,
        sets: ex.sets.filter(s => s.id !== setId)
      };
    });

    onUpdateActiveSession({
      ...activeSession,
      exercises: updatedExercises
    });
  };

  // Remove entire exercise
  const handleRemoveExercise = (exerciseInstanceId: string) => {
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.filter(ex => ex.id !== exerciseInstanceId);
    onUpdateActiveSession({
      ...activeSession,
      exercises: updatedExercises
    });
  };

  // Add Exercise Selection from Library
  const handleAddExerciseFromLibrary = (ex: Exercise) => {
    if (!activeSession) return;

    const prevSets = getPreviousWorkoutSets(ex.id);
    const initialSets: WorkoutSet[] = prevSets.length > 0
      ? prevSets.map((ps, idx) => ({
          id: `s-active-${generateId()}-${idx}`,
          weight: ps.weight,
          reps: ps.reps,
          completed: true,
          isBodyweight: ps.isBodyweight
        }))
      : [
          { id: `s-active-${generateId()}-0`, weight: 100, reps: 11, completed: true },
          { id: `s-active-${generateId()}-1`, weight: 100, reps: 11, completed: true },
          { id: `s-active-${generateId()}-2`, weight: 100, reps: 11, completed: true }
        ];

    const newWorkoutEx: WorkoutExercise = {
      id: `we-active-${generateId()}`,
      exerciseId: ex.id,
      name: ex.name,
      category: ex.category,
      sets: initialSets
    };

    onUpdateActiveSession({
      ...activeSession,
      exercises: [...activeSession.exercises, newWorkoutEx]
    });

    setShowAddExModal(false);
    setSearchTerm('');
  };

  // FINISH SESSION FIX
  const handleFinish = () => {
    if (!activeSession) return;

    if (activeSession.exercises.length === 0) {
      setValidationError('Your workout is empty. Add at least one exercise before logging!');
      return;
    }

    setValidationError(null);
    // Pass notes and name directly
    onFinishWorkout(workoutNotes, workoutName || activeSession.name);
  };

  const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12" id="active-workout-panel">
      {/* State: No Active Workout */}
      {!activeSession ? (
        <div className="max-w-xl mx-auto text-center bg-[#1C1E22] border border-[#2C2E33] rounded-2xl p-8 md:p-12 space-y-6 shadow-xl my-8">
          <div className="w-16 h-16 bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20 rounded-2xl flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Launch Gym Session</h1>
            <p className="text-sm text-[#8E9299] max-w-sm mx-auto leading-relaxed">
              Log an empty custom session right now, or load from a pre-constructed template.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <button
              type="button"
              onClick={onStartEmptyWorkout}
              className="flex items-center justify-center gap-2 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black font-black py-3.5 px-5 rounded-xl transition duration-150 cursor-pointer shadow-lg shadow-[#CCFF00]/10"
            >
              <Plus className="w-5 h-5" />
              Quick Custom Workout
            </button>
            <button
              type="button"
              onClick={() => {
                const btn = document.querySelector('[data-tab="templates"]');
                if (btn) (btn as HTMLButtonElement).click();
              }}
              className="flex items-center justify-center gap-2 bg-[#1C1E22] hover:bg-[#24272B] text-white border border-[#2C2E33] py-3.5 px-5 rounded-xl transition font-semibold cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#CCFF00] fill-[#CCFF00]" />
              Load From Routine
            </button>
          </div>
        </div>
      ) : (
        /* State: Workout in Progress */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <input
                  type="text"
                  value={workoutName}
                  onChange={(e) => {
                    setWorkoutName(e.target.value);
                    if (activeSession) {
                      onUpdateActiveSession({ ...activeSession, name: e.target.value });
                    }
                  }}
                  className="bg-transparent text-xl md:text-2xl font-bold text-white border-b border-transparent hover:border-[#2C2E33] focus:border-[#CCFF00] focus:outline-none transition py-0.5 truncate max-w-full font-sans"
                  placeholder="Workout Name"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#8E9299]">
                <span className="font-mono">
                  Exercises: <strong className="text-white">{activeSession.exercises.length}</strong>
                </span>
                <span className="font-mono">
                  Total Sets: <strong className="text-[#CCFF00]">
                    {activeSession.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Actions: Finish / Discard */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#0F1113] hover:bg-red-500/10 text-[#8E9299] hover:text-red-500 border border-[#2C2E33] hover:border-red-500/25 px-4 py-3 rounded-xl text-xs transition duration-150 font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Discard
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black px-6 py-3 rounded-xl text-sm transition duration-200 font-black shadow-lg shadow-[#CCFF00]/15 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Save & Log Workout
              </button>
            </div>
          </div>

          {/* Empty Validation Error Alert */}
          {validationError && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 shrink-0 text-red-400" />
                <span>{validationError}</span>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-red-400 hover:text-white font-black"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Main (Span 2): Active Exercise lists */}
            <div className="lg:col-span-2 space-y-6">
              {activeSession.exercises.length > 0 ? (
                <div className="space-y-5">
                  {activeSession.exercises.map((we, idx) => {
                    // Fetch Historical Records & previous sets for current exercise
                    const hist = getExerciseHistory(we.exerciseId, completedWorkouts);

                    return (
                      <div
                        key={we.id}
                        className="bg-[#1C1E22] border border-[#2C2E33] rounded-xl overflow-hidden hover:border-[#CCFF00]/20 transition shadow-md"
                      >
                        {/* Exercise Title Area */}
                        <div className="p-4 bg-[#0F1113] border-b border-[#2C2E33] flex items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono font-bold bg-[#1C1E22] border border-[#2C2E33] text-[#8E9299] w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <h3 className="text-base font-bold text-white leading-snug">{we.name}</h3>
                              <span className="text-[9px] font-bold text-[#8E9299] px-1.5 py-0.5 bg-[#1C1E22] border border-[#2C2E33] rounded uppercase">
                                {we.category}
                              </span>
                            </div>

                            {/* Previous Session Highlights */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mt-1">
                              {hist.bestWeight > 0 ? (
                                <span className="text-amber-400 flex items-center gap-1 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                  <Award className="w-3.5 h-3.5 text-amber-400" />
                                  All-Time Best: {hist.bestWeight} lbs × {hist.bestReps} reps
                                </span>
                              ) : (
                                <span className="text-[#8E9299] italic bg-[#1C1E22] border border-[#2C2E33] px-2 py-0.5 rounded text-[10px]">
                                  First time logging this movement!
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Reorder Up / Down */}
                            <div className="flex items-center bg-[#1C1E22] border border-[#2C2E33] rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveExercise(idx, 'up')}
                                disabled={idx === 0}
                                className={`p-1 rounded transition cursor-pointer ${
                                  idx === 0 ? 'text-[#8E9299]/30 cursor-not-allowed' : 'text-[#8E9299] hover:text-[#CCFF00] hover:bg-[#0F1113]'
                                }`}
                                title="Move Up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveExercise(idx, 'down')}
                                disabled={idx === activeSession.exercises.length - 1}
                                className={`p-1 rounded transition cursor-pointer ${
                                  idx === activeSession.exercises.length - 1 ? 'text-[#8E9299]/30 cursor-not-allowed' : 'text-[#8E9299] hover:text-[#CCFF00] hover:bg-[#0F1113]'
                                }`}
                                title="Move Down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(we.id)}
                              className="p-1.5 text-[#8E9299] hover:text-red-500 rounded transition cursor-pointer"
                              title="Remove Exercise"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Sets Grid */}
                        <div className="p-4 space-y-3">
                          {we.sets.length > 0 ? (
                            <div className="space-y-3">
                              {/* Headers */}
                              <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-bold text-[#8E9299] uppercase tracking-wider pb-1">
                                <span className="col-span-2 text-left">Set</span>
                                <span className="col-span-4 text-left pl-1">Last 3 Weights & Dates</span>
                                <span className="col-span-3 text-center">Weight (lbs)</span>
                                <span className="col-span-3 text-center">Reps</span>
                              </div>

                              {/* Rows */}
                              {we.sets.map((set, setIdx) => {
                                // Find up to 3 previous set performances for this specific set index
                                const historyEntries = getLastSetHistoryEntries(we.exerciseId, setIdx, completedWorkouts, 3);

                                return (
                                  <div
                                    key={set.id}
                                    className="grid grid-cols-12 gap-2 items-center text-center text-xs py-2 px-2.5 bg-[#0F1113] border border-[#2C2E33] rounded-xl hover:border-[#2C2E33]/80 transition"
                                  >
                                    <span className="col-span-2 text-left font-mono font-bold text-[#8E9299] flex items-center gap-1.5 shrink-0">
                                      Set {setIdx + 1}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSet(we.id, set.id)}
                                        className="p-0.5 text-[#8E9299] hover:text-red-500 rounded transition cursor-pointer"
                                        title="Delete set"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </span>

                                    {/* PREVIOUS 3 WEIGHTS WITH DATES */}
                                    <div className="col-span-4 text-left pl-1 overflow-x-auto no-scrollbar py-0.5">
                                      {historyEntries.length > 0 ? (
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          {historyEntries.map((hist, hIdx) => (
                                            <div
                                              key={hIdx}
                                              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#CCFF00] bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap shadow-sm"
                                              title={`Logged on ${hist.date}: ${hist.weight} lbs × ${hist.reps} reps`}
                                            >
                                              <span className="text-[#8E9299] text-[9.5px] font-medium border-r border-[#CCFF00]/20 pr-1">{hist.date}</span>
                                              <span className="text-white">{hist.weight} <span className="text-[9px] text-[#CCFF00]">lbs</span></span>
                                              <span className="text-[#8E9299] text-[9px]">×</span>
                                              <span className="text-[#CCFF00]">{hist.reps}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-[#8E9299] italic">No previous log</span>
                                      )}
                                    </div>

                                    {/* Weight Input + BW Checkbox */}
                                    <div className="col-span-3 flex items-center bg-[#1C1E22] border border-[#2C2E33] rounded-lg px-2 gap-1 focus-within:border-[#CCFF00]">
                                      <label className="flex items-center gap-1 cursor-pointer select-none shrink-0" title="Toggle Bodyweight / No Weight">
                                        <input
                                          type="checkbox"
                                          checked={!!set.isBodyweight}
                                          onChange={() => handleToggleBodyweight(we.id, set.id)}
                                          className="w-3 h-3 accent-[#CCFF00] rounded cursor-pointer"
                                        />
                                        <span className={`text-[10px] font-mono font-bold ${set.isBodyweight ? 'text-[#CCFF00]' : 'text-[#8E9299]'}`}>
                                          BW
                                        </span>
                                      </label>

                                      {set.isBodyweight ? (
                                        <span className="w-full text-center py-2 font-mono text-xs text-[#CCFF00] italic font-semibold">
                                          Bodyweight
                                        </span>
                                      ) : (
                                        <input
                                          type="number"
                                          step="any"
                                          value={set.weight === 0 || isNaN(set.weight) ? '' : set.weight}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            handleUpdateSetField(
                                              we.id,
                                              set.id,
                                              'weight',
                                              val === '' ? 0 : parseFloat(val)
                                            );
                                          }}
                                          className="w-full bg-transparent text-white font-mono font-bold text-center py-2 focus:outline-none text-sm"
                                          placeholder="0"
                                          min="0"
                                        />
                                      )}
                                    </div>

                                    {/* Reps Input */}
                                    <div className="col-span-3 flex items-center bg-[#1C1E22] border border-[#2C2E33] rounded-lg px-2 focus-within:border-[#CCFF00]">
                                      <input
                                        type="number"
                                        value={set.reps === 0 || isNaN(set.reps) ? '' : set.reps}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          handleUpdateSetField(
                                            we.id,
                                            set.id,
                                            'reps',
                                            val === '' ? 0 : parseInt(val, 10)
                                          );
                                        }}
                                        className="w-full bg-transparent text-white font-mono font-bold text-center py-2 focus:outline-none text-sm"
                                        placeholder="0"
                                        min="0"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-[#8E9299] italic py-1">No sets logged yet.</p>
                          )}

                          <button
                            type="button"
                            onClick={() => handleAddSet(we.id, we.exerciseId)}
                            className="w-full border border-[#2C2E33] border-dashed hover:border-[#CCFF00]/40 hover:bg-[#0F1113] py-2.5 rounded-xl text-xs font-bold text-[#8E9299] hover:text-white transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                          >
                            <Plus className="w-4 h-4 text-[#CCFF00]" />
                            Add Next Set
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center bg-[#1C1E22]/50 border border-dashed border-[#2C2E33] rounded-2xl py-14 px-4 flex flex-col items-center">
                  <Dumbbell className="w-12 h-12 text-[#8E9299] mb-3" />
                  <p className="text-slate-300 font-bold text-base">Your Active Gym Log Is Empty</p>
                  <p className="text-xs text-[#8E9299] mt-1 max-w-xs leading-relaxed">
                    Search and add movements using the selector button below.
                  </p>
                </div>
              )}

              {/* Add Exercise Trigger Button */}
              <button
                type="button"
                onClick={() => setShowAddExModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#1C1E22] border border-[#2C2E33] hover:border-[#CCFF00]/40 hover:bg-[#15171A] py-4 rounded-xl text-sm font-bold text-white transition duration-150 cursor-pointer shadow-md"
              >
                <PlusCircle className="w-5 h-5 text-[#CCFF00]" />
                Add Exercise Movement
              </button>
            </div>

            {/* Right Column: Workout Notes */}
            <div className="space-y-6">
              <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-[#2C2E33] pb-2">
                  <BookOpen className="w-4 h-4 text-[#CCFF00]" />
                  Session Notes
                </h3>

                <textarea
                  value={workoutNotes}
                  onChange={(e) => {
                    setWorkoutNotes(e.target.value);
                    if (activeSession) {
                      onUpdateActiveSession({ ...activeSession, notes: e.target.value });
                    }
                  }}
                  className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-lg px-3 py-3.5 text-xs focus:outline-none focus:border-[#CCFF00] transition min-h-[160px] resize-none leading-relaxed"
                  placeholder="Add workout notes, energy levels, or custom equipment adjustments..."
                />
              </div>

              {/* Auto Save info widget */}
              <div className="bg-[#0F1113] rounded-xl p-4 border border-[#2C2E33] text-[#8E9299] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#CCFF00] shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-bold text-slate-200">Auto-Logging Active</p>
                  <p className="mt-0.5">Entering weight and reps automatically records your sets. Click Finish Session when you are done!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercises Search Selection Modal */}
      {showAddExModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-5 animate-fade-in">
          <div className="bg-[#15171A] border border-[#2C2E33] rounded-2xl w-full max-w-4xl flex flex-col max-h-[92vh] sm:max-h-[88vh] shadow-2xl animate-scale-in overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#2C2E33] flex items-center justify-between bg-[#1C1E22] shrink-0">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-[#CCFF00]" />
                  Select Movement for Session
                </h3>
                <p className="text-xs text-[#8E9299] mt-0.5">Filter by Muscle or Equipment to insert exercises into your active workout.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExModal(false)}
                className="p-2 hover:bg-[#0F1113] text-[#8E9299] hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Exercises list with Muscle & Equipment filters */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <ActivityFilterSelector
                exercises={exercises}
                onSelectExercise={(selectedEx) => {
                  handleAddExerciseFromLibrary(selectedEx);
                  setShowAddExModal(false);
                }}
                actionButtonLabel="Add to Session"
                isModal={true}
                onCloseModal={() => setShowAddExModal(false)}
                onAddCustomExercise={onAddExercise}
              />
            </div>
          </div>
        </div>
      )}

      {/* Discard Active Session Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1C1E22] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Discard Active Workout?</h3>
                <p className="text-xs text-[#8E9299] mt-0.5">This action cannot be undone. All unsaved sets and workout data for this session will be discarded.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2.5 bg-[#0F1113] hover:bg-[#15171A] text-slate-300 rounded-xl text-xs font-bold border border-[#2C2E33] transition cursor-pointer"
              >
                Keep Working Out
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onCancelWorkout();
                }}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-red-500/20 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Discard Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
