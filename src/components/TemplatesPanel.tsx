import React, { useState } from 'react';
import { WorkoutTemplate, Exercise, WorkoutExercise, WorkoutSet } from '../types';
import { Plus, Play, Edit2, Trash2, Search, Dumbbell, Tag, Save, X, PlusCircle, MinusCircle, AlertCircle, Sparkles, Table, LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react';
import { generateId } from '../utils';
import ActivityFilterSelector from './ActivityFilterSelector';

interface TemplatesPanelProps {
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  onAddTemplate: (template: WorkoutTemplate) => void;
  onUpdateTemplate: (template: WorkoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onStartWorkout: (template: WorkoutTemplate) => void;
  unit: string;
  onAddExercise?: (exercise: Exercise) => void;
}

export default function TemplatesPanel({
  templates,
  exercises,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onStartWorkout,
  unit,
  onAddExercise
}: TemplatesPanelProps) {
  // Navigation: list vs edit vs create
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<WorkoutTemplate | null>(null);

  // Form States for Template Builder
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateExercises, setTemplateExercises] = useState<WorkoutExercise[]>([]);

  // Search Exercises modal states inside builder
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [selectedExCategory, setSelectedExCategory] = useState('All');
  const [showAddExModal, setShowAddExModal] = useState(false);

  // Init Create View
  const handleInitCreate = () => {
    setTemplateName('');
    setTemplateDesc('');
    setTemplateExercises([]);
    setViewState('create');
    setActiveTemplateId(null);
  };

  // Init Edit View
  const handleInitEdit = (template: WorkoutTemplate) => {
    setTemplateName(template.name);
    setTemplateDesc(template.description || '');
    // Deep copy exercises to avoid premature modification of actual state
    setTemplateExercises(JSON.parse(JSON.stringify(template.exercises)));
    setActiveTemplateId(template.id);
    setViewState('edit');
  };

  // Save template (Create or Update)
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    if (templateExercises.length === 0) {
      alert('Please add at least one exercise to your template routine!');
      return;
    }

    // Verify all exercises have at least one set
    const emptyExercise = templateExercises.find(ex => ex.sets.length === 0);
    if (emptyExercise) {
      alert(`Please add at least one set for "${emptyExercise.name}"!`);
      return;
    }

    if (viewState === 'create') {
      const newTemplate: WorkoutTemplate = {
        id: `temp-${generateId()}`,
        name: templateName.trim(),
        description: templateDesc.trim() || undefined,
        exercises: templateExercises,
        createdAt: Date.now()
      };
      onAddTemplate(newTemplate);
    } else if (viewState === 'edit' && activeTemplateId) {
      const updatedTemplate: WorkoutTemplate = {
        id: activeTemplateId,
        name: templateName.trim(),
        description: templateDesc.trim() || undefined,
        exercises: templateExercises,
        createdAt: Date.now()
      };
      onUpdateTemplate(updatedTemplate);
    }

    setViewState('list');
  };

  // Add Exercise to builder
  const handleAddExerciseToBuilder = (ex: Exercise) => {
    const newExInstance: WorkoutExercise = {
      id: `we-builder-${generateId()}`,
      exerciseId: ex.id,
      name: ex.name,
      category: ex.category,
      sets: [
        { id: `s-${generateId()}`, weight: 100, reps: 11, completed: false } // default single set with 11 reps
      ]
    };
    setTemplateExercises(prev => [...prev, newExInstance]);
    setShowAddExModal(false);
    setExerciseSearchTerm('');
  };

  // Move Exercise Up/Down in builder
  const handleMoveExerciseInBuilder = (index: number, direction: 'up' | 'down') => {
    setTemplateExercises(prev => {
      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr;
    });
  };

  // Remove Exercise from builder
  const handleRemoveExerciseFromBuilder = (instanceId: string) => {
    setTemplateExercises(prev => prev.filter(ex => ex.id !== instanceId));
  };

  // Add a Set to builder exercise
  const handleAddSetToBuilderExercise = (instanceId: string) => {
    setTemplateExercises(prev =>
      prev.map(ex => {
        if (ex.id !== instanceId) return ex;
        
        // Grab values from last set to propagate as baseline values, or default to standard
        const lastSet = ex.sets[ex.sets.length - 1];
        const defaultWeight = lastSet ? lastSet.weight : 100;
        const defaultReps = lastSet ? lastSet.reps : 11;
        const defaultBw = lastSet ? lastSet.isBodyweight : false;

        const newSet: WorkoutSet = {
          id: `s-${generateId()}`,
          weight: defaultWeight,
          reps: defaultReps,
          completed: false,
          isBodyweight: defaultBw
        };

        return {
          ...ex,
          sets: [...ex.sets, newSet]
        };
      })
    );
  };

  // Remove a Set from builder exercise
  const handleRemoveSetFromBuilderExercise = (instanceId: string, setId: string) => {
    setTemplateExercises(prev =>
      prev.map(ex => {
        if (ex.id !== instanceId) return ex;
        return {
          ...ex,
          sets: ex.sets.filter(s => s.id !== setId)
        };
      })
    );
  };

  // Toggle Bodyweight (No Weight) for set in builder
  const handleToggleBodyweightInBuilder = (instanceId: string, setId: string) => {
    setTemplateExercises(prev =>
      prev.map(ex => {
        if (ex.id !== instanceId) return ex;
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id !== setId) return s;
            const isBw = !s.isBodyweight;
            return {
              ...s,
              isBodyweight: isBw,
              weight: isBw ? 0 : (s.weight || 0)
            };
          })
        };
      })
    );
  };

  // Update Set fields in builder
  const handleUpdateSetInBuilder = (instanceId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    setTemplateExercises(prev =>
      prev.map(ex => {
        if (ex.id !== instanceId) return ex;
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id !== setId) return s;
            return {
              ...s,
              [field]: Math.max(0, value) // prevent negatives
            };
          })
        };
      })
    );
  };

  // Filter exercises in selector modal
  const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase());
    const matchesCategory = selectedExCategory === 'All' || ex.category === selectedExCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12" id="templates-panel">
      {/* List View */}
      {viewState === 'list' && (
        <>
          {/* Header & Create Button */}
          <div className="border-b border-[#2C2E33] pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight font-sans">Routine Templates</h1>
              <p className="text-sm text-[#8E9299] mt-1">
                Design custom templates or boot up preset configurations to start tracking workouts instantly.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleInitCreate}
              className="flex items-center justify-center gap-2 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black font-black px-5 py-2.5 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-[#CCFF00]/15 shrink-0 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          {/* Routine Cards Grid View */}
          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-[#1C1E22] border border-[#2C2E33] rounded-xl overflow-hidden hover:border-[#CCFF00]/30 transition duration-150 flex flex-col h-full"
                >
                  <div className="p-6 flex-1 space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-white line-clamp-1">{template.name}</h2>
                      <p className="text-xs text-[#8E9299] min-h-[32px] line-clamp-2">
                        {template.description || 'No routine description provided.'}
                      </p>
                    </div>

                    <div className="border-t border-[#2C2E33]/60 pt-4 space-y-3">
                      <h3 className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                        Exercises ({template.exercises.length})
                      </h3>
                      
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1 no-scrollbar text-xs">
                        {template.exercises.map((ex, idx) => (
                          <div key={ex.id} className="flex justify-between text-slate-300">
                            <span className="truncate max-w-[180px] font-medium">
                              {idx + 1}. {ex.name}
                            </span>
                            <span className="text-slate-500 shrink-0 font-mono">
                              {ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="bg-[#0F1113] px-6 py-4 flex items-center justify-between border-t border-[#2C2E33] gap-2">
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleInitEdit(template)}
                        className="p-2 hover:bg-[#1C1E22] border border-transparent hover:border-[#2C2E33] text-[#8E9299] hover:text-white rounded-lg transition"
                        title="Edit Routine"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTemplate(template)}
                        className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-[#8E9299] hover:text-red-500 rounded-lg transition cursor-pointer"
                        title="Delete Routine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartWorkout(template)}
                      className="flex items-center gap-1.5 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black font-black px-4 py-2 rounded-lg text-xs transition duration-200 cursor-pointer shadow-sm shadow-[#CCFF00]/10"
                    >
                      <Play className="w-3.5 h-3.5 fill-black text-black" />
                      Start Workout
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center bg-[#1C1E22]/50 border border-dashed border-[#2C2E33] rounded-2xl py-16 px-4">
              <Sparkles className="w-12 h-12 text-[#8E9299] mx-auto mb-3" />
              <p className="text-slate-300 font-semibold text-lg">No workout routines created yet</p>
              <p className="text-[#8E9299] text-xs mt-1 max-w-sm mx-auto">
                Create custom templates with exercises, weight parameters, and targeting reps to plan your gym session or launch routine setups immediately.
              </p>
              <button
                onClick={handleInitCreate}
                className="mt-6 inline-flex items-center gap-2 bg-[#1C1E22] hover:bg-[#24272B] text-white font-semibold px-5 py-2.5 rounded-lg text-xs transition border border-[#2C2E33]"
              >
                <Plus className="w-4 h-4" />
                Build First Template
              </button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit View */}
      {(viewState === 'create' || viewState === 'edit') && (
        <form onSubmit={handleSaveTemplate} className="space-y-6 max-w-4xl mx-auto">
          {/* Form Header */}
          <div className="border-b border-[#2C2E33] pb-5 flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {viewState === 'create' ? 'Build Routine Template' : 'Modify Routine Template'}
              </h1>
              <p className="text-xs text-[#8E9299]">
                Plan sets, repetitions, and targets to construct your standard workout routine.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setViewState('list')}
              className="p-2.5 bg-[#1C1E22] hover:bg-[#24272B] border border-[#2C2E33] text-[#8E9299] hover:text-white rounded-lg transition animate-fade-in"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Template Information Info Column */}
            <div className="space-y-6">
              <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-[#2C2E33] pb-2">
                  Routine Details
                </h3>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00] transition"
                    placeholder="e.g., Pull Day A"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5">
                    Description (optional)
                  </label>
                  <textarea
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#CCFF00] transition min-h-[100px] resize-none"
                    placeholder="Describe target areas, supersets, or routine focus"
                  />
                </div>
              </div>

              {/* Quick actions box */}
              <div className="bg-[#1C1E22]/40 border border-[#2C2E33] border-dashed rounded-xl p-5 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowAddExModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black font-black py-3 rounded-xl text-sm transition duration-150 cursor-pointer shadow-lg shadow-[#CCFF00]/10"
                >
                  <PlusCircle className="w-5 h-5" />
                  Add Exercise
                </button>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[#15171A] hover:bg-[#1C1E22] text-white border border-[#2C2E33] py-3 rounded-xl text-sm font-semibold transition"
                >
                  <Save className="w-5 h-5 text-[#CCFF00]" />
                  Save Template
                </button>
              </div>
            </div>

            {/* Template Exercises Log list Column */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-[#8E9299] uppercase tracking-wider flex items-center justify-between">
                <span>Routine Exercises ({templateExercises.length})</span>
                <span className="text-xs font-mono text-[#CCFF00] font-semibold">{unit} selected</span>
              </h3>

              {templateExercises.length > 0 ? (
                <div className="space-y-4">
                  {templateExercises.map((we, exIdx) => (
                    <div
                      key={we.id}
                      className="bg-[#1C1E22] border border-[#2C2E33] rounded-xl p-5 space-y-4 relative"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-white flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-[#0F1113] border border-[#2C2E33] text-[#8E9299] w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                              {exIdx + 1}
                            </span>
                            {we.name}
                          </p>
                          <span className="inline-block mt-1 text-[10px] font-semibold text-[#8E9299] px-2 py-0.5 bg-[#0F1113] rounded border border-[#2C2E33] uppercase">
                            {we.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Reorder Up/Down */}
                          <div className="flex items-center bg-[#0F1113] border border-[#2C2E33] rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveExerciseInBuilder(exIdx, 'up')}
                              disabled={exIdx === 0}
                              className={`p-1 rounded transition cursor-pointer ${
                                exIdx === 0 ? 'text-[#8E9299]/30 cursor-not-allowed' : 'text-[#8E9299] hover:text-[#CCFF00] hover:bg-[#1C1E22]'
                              }`}
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveExerciseInBuilder(exIdx, 'down')}
                              disabled={exIdx === templateExercises.length - 1}
                              className={`p-1 rounded transition cursor-pointer ${
                                exIdx === templateExercises.length - 1 ? 'text-[#8E9299]/30 cursor-not-allowed' : 'text-[#8E9299] hover:text-[#CCFF00] hover:bg-[#1C1E22]'
                              }`}
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseFromBuilder(we.id)}
                            className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-[#8E9299] hover:text-red-500 rounded-lg transition"
                            title="Remove Exercise"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sets list inside builder exercise */}
                      <div className="space-y-2">
                        {we.sets.length > 0 ? (
                          <div className="space-y-1.5">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-1">
                              <span className="col-span-2 text-left">Set</span>
                              <span className="col-span-4">Weight ({unit})</span>
                              <span className="col-span-4">Reps</span>
                              <span className="col-span-2">Remove</span>
                            </div>

                            {we.sets.map((set, setIdx) => (
                              <div
                                key={set.id}
                                className="grid grid-cols-12 gap-2 items-center text-center text-xs"
                              >
                                <span className="col-span-2 text-left font-mono text-slate-400 font-bold">
                                  {setIdx + 1}
                                </span>

                                <div className="col-span-4 flex items-center bg-[#0F1113] border border-[#2C2E33] rounded px-2 gap-1.5">
                                  {/* Bodyweight Toggle Checkbox */}
                                  <label className="flex items-center gap-1 cursor-pointer select-none shrink-0" title="Toggle Bodyweight / No Weight">
                                    <input
                                      type="checkbox"
                                      checked={!!set.isBodyweight}
                                      onChange={() => handleToggleBodyweightInBuilder(we.id, set.id)}
                                      className="w-3 h-3 accent-[#CCFF00] rounded cursor-pointer"
                                    />
                                    <span className={`text-[10px] font-mono font-bold ${set.isBodyweight ? 'text-[#CCFF00]' : 'text-[#8E9299]'}`}>
                                      BW
                                    </span>
                                  </label>

                                  {set.isBodyweight ? (
                                    <span className="w-full text-center py-1.5 font-mono text-xs text-[#CCFF00] italic font-semibold">
                                      Bodyweight
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      step="any"
                                      value={set.weight === 0 || isNaN(set.weight) ? '' : set.weight}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        handleUpdateSetInBuilder(
                                          we.id,
                                          set.id,
                                          'weight',
                                          val === '' ? 0 : parseFloat(val)
                                        );
                                      }}
                                      className="w-full bg-transparent text-white font-mono text-center py-1.5 focus:outline-none focus:text-[#CCFF00]"
                                      placeholder="0"
                                      min="0"
                                    />
                                  )}
                                </div>

                                <div className="col-span-4 flex items-center bg-[#0F1113] border border-[#2C2E33] rounded px-2">
                                  <input
                                    type="number"
                                    value={set.reps === 0 || isNaN(set.reps) ? '' : set.reps}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      handleUpdateSetInBuilder(
                                        we.id,
                                        set.id,
                                        'reps',
                                        val === '' ? 0 : parseInt(val, 10)
                                      );
                                    }}
                                    className="w-full bg-transparent text-white font-mono text-center py-1.5 focus:outline-none focus:text-[#CCFF00]"
                                    placeholder="0"
                                    min="0"
                                  />
                                </div>

                                <div className="col-span-2 flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSetFromBuilderExercise(we.id, set.id)}
                                    className="p-1 hover:bg-[#15171A] text-[#8E9299] hover:text-red-500 rounded transition"
                                  >
                                    <MinusCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#8E9299] italic">No sets added. Add sets to configure weights!</p>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAddSetToBuilderExercise(we.id)}
                          className="w-full border border-[#2C2E33] border-dashed hover:border-[#CCFF00]/40 py-2 rounded text-xs font-semibold text-[#8E9299] hover:text-white transition flex items-center justify-center gap-1 mt-2 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Set Row
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center bg-[#1C1E22]/50 border border-dashed border-[#2C2E33] rounded-xl py-12 px-4 flex flex-col items-center">
                  <AlertCircle className="w-10 h-10 text-[#8E9299] mb-2" />
                  <p className="text-[#8E9299] text-sm font-semibold">Empty routine list</p>
                  <p className="text-xs text-[#8E9299] mt-1 max-w-xs leading-relaxed">
                    Click the "Add Exercise" button on the left panel to search the movement directory and populate this routine layout!
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
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
                  Select Movement for Routine
                </h3>
                <p className="text-xs text-[#8E9299] mt-0.5">Filter by Muscle or Equipment to insert exercises into your template layout.</p>
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
                  handleAddExerciseToBuilder(selectedEx);
                  setShowAddExModal(false);
                }}
                actionButtonLabel="Add to Routine"
                isModal={true}
                onCloseModal={() => setShowAddExModal(false)}
                onAddCustomExercise={onAddExercise}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Routine Confirmation Modal */}
      {deletingTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1C1E22] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Routine Template?</h3>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Are you sure you want to delete <strong className="text-white">"{deletingTemplate.name}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                className="px-4 py-2.5 bg-[#0F1113] hover:bg-[#15171A] text-slate-300 rounded-xl text-xs font-bold border border-[#2C2E33] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTemplate(deletingTemplate.id);
                  setDeletingTemplate(null);
                }}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-red-500/20 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete Routine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
