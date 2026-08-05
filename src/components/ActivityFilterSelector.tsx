import React, { useState, useMemo } from 'react';
import { Exercise } from '../types';
import { generateId } from '../utils';
import { saveExerciseToCloud } from '../firebase';
import {
  Search,
  Dumbbell,
  BookOpen,
  X,
  Plus,
  Check,
  Flame,
  Zap,
  Activity,
  Layers,
  Shield,
  Target,
  Sparkles,
  Footprints,
  Hand,
  Circle,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Award,
  Table,
  LayoutGrid,
  PlusCircle
} from 'lucide-react';

interface ActivityFilterSelectorProps {
  exercises: Exercise[];
  onSelectExercise?: (exercise: Exercise) => void;
  actionButtonLabel?: string;
  isModal?: boolean;
  onCloseModal?: () => void;
  onAddCustomExercise?: (exercise: Exercise) => void;
}

// 1. Muscle Filter Definitions matching screenshot
const MUSCLE_FILTERS = [
  { id: 'all', label: 'All Muscles', key: 'all', icon: Target },
  { id: 'abs', label: 'Abs', key: 'abdominals', icon: Activity },
  { id: 'back', label: 'Back', keys: ['middle back', 'lower back', 'lats', 'traps'], icon: Layers },
  { id: 'biceps', label: 'Biceps', key: 'biceps', icon: Dumbbell },
  { id: 'cardio', label: 'Cardio', keys: ['cardio', 'neck', 'adductors', 'abductors'], icon: Flame },
  { id: 'chest', label: 'Chest', key: 'chest', icon: Shield },
  { id: 'forearms', label: 'Forearms', key: 'forearms', icon: Hand },
  { id: 'glutes', label: 'Glutes', key: 'glutes', icon: Circle },
  { id: 'shoulders', label: 'Shoulders', key: 'shoulders', icon: Sparkles },
  { id: 'triceps', label: 'Triceps', key: 'triceps', icon: Zap },
  { id: 'upper_legs', label: 'Upper Legs', keys: ['quadriceps', 'hamstrings'], icon: Footprints },
  { id: 'lower_legs', label: 'Lower Legs', key: 'calves', icon: Footprints },
];

// 2. Equipment Filter Definitions matching screenshot
const EQUIPMENT_FILTERS = [
  { id: 'all', label: 'All Equipment', icon: Target },
  { id: 'bodyweight', label: 'Body Weight', keys: ['body weight', 'body only'], icon: Footprints },
  { id: 'bands', label: 'Bands', keys: ['bands'], icon: Activity },
  { id: 'barbell', label: 'Barbell', keys: ['barbell'], icon: Dumbbell },
  { id: 'bench', label: 'Bench', keys: ['bench', 'other'], icon: Layers },
  { id: 'dumbbell', label: 'Dumbbell', keys: ['dumbbell'], icon: Dumbbell },
  { id: 'exercise_ball', label: 'Exercise Ball', keys: ['exercise ball', 'medicine ball', 'foam roll'], icon: Circle },
  { id: 'ez_bar', label: 'EZ Curl Bar', keys: ['e-z curl bar'], icon: Activity },
  { id: 'kettlebell', label: 'Kettlebell', keys: ['kettlebells', 'kettlebell'], icon: Shield },
  { id: 'cardio_machine', label: 'Cardio Machine', keys: ['machine', 'other'], categoryMatch: 'cardio', icon: Flame },
  { id: 'strength_machine', label: 'Strength Machine', keys: ['machine', 'cable'], icon: SlidersHorizontal },
  { id: 'pullup_bar', label: 'Pullup Bar', keys: ['body only', 'other'], nameMatch: 'pullup', icon: Sparkles },
];

export default function ActivityFilterSelector({
  exercises,
  onSelectExercise,
  actionButtonLabel = 'Select Exercise',
  isModal = false,
  onCloseModal,
  onAddCustomExercise
}: ActivityFilterSelectorProps) {
  // Filter States
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedForce, setSelectedForce] = useState<string>('all');
  const [selectedMechanic, setSelectedMechanic] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Inline Custom Exercise Creation States
  const [showCreateCustom, setShowCreateCustom] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('Chest');
  const [customMuscle, setCustomMuscle] = useState<string>('Chest');
  const [customEquipment, setCustomEquipment] = useState<string>('Barbell');

  // Detail Modal State
  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);

  const handleCreateCustomAndSelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newEx: Exercise = {
      id: `ex-custom-${generateId()}`,
      name: customName.trim(),
      category: customCategory,
      primaryMuscles: [customMuscle.toLowerCase()],
      equipment: customEquipment,
      isCustom: true
    };

    // Save to Firestore & global state
    saveExerciseToCloud(newEx);
    if (onAddCustomExercise) {
      onAddCustomExercise(newEx);
    }

    // Auto-select into workout session or routine if handler provided
    if (onSelectExercise) {
      onSelectExercise(newEx);
    }

    setCustomName('');
    setShowCreateCustom(false);
  };

  // Filter Computation
  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      // Search term filter (name or instructions)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = ex.name.toLowerCase().includes(term);
        const muscleMatch = ex.primaryMuscles?.some(m => m.toLowerCase().includes(term));
        const equipMatch = ex.equipment?.toLowerCase().includes(term);
        if (!nameMatch && !muscleMatch && !equipMatch) {
          return false;
        }
      }

      // Muscle filter
      if (selectedMuscle !== 'all') {
        const muscleObj = MUSCLE_FILTERS.find(m => m.id === selectedMuscle);
        if (muscleObj) {
          const exMuscles = (ex.primaryMuscles || []).map(m => m.toLowerCase());
          if (muscleObj.key) {
            if (!exMuscles.includes(muscleObj.key.toLowerCase())) return false;
          } else if (muscleObj.keys) {
            const hasAny = muscleObj.keys.some(k => exMuscles.includes(k.toLowerCase()));
            if (!hasAny) return false;
          }
        }
      }

      // Equipment filter
      if (selectedEquipment !== 'all') {
        const equipObj = EQUIPMENT_FILTERS.find(e => e.id === selectedEquipment);
        if (equipObj) {
          const exEquip = (ex.equipment || '').toLowerCase();
          if (equipObj.nameMatch) {
            if (!ex.name.toLowerCase().includes(equipObj.nameMatch)) return false;
          } else if (equipObj.categoryMatch) {
            if (ex.category.toLowerCase() !== 'cardio' && !exEquip.includes('machine')) return false;
          } else if (equipObj.keys) {
            const hasMatch = equipObj.keys.some(k => exEquip.includes(k.toLowerCase()));
            if (!hasMatch) return false;
          }
        }
      }

      // Level filter
      if (selectedLevel !== 'all') {
        if ((ex.level || 'beginner').toLowerCase() !== selectedLevel) return false;
      }

      // Force filter
      if (selectedForce !== 'all') {
        if ((ex.force || '').toLowerCase() !== selectedForce) return false;
      }

      // Mechanic filter
      if (selectedMechanic !== 'all') {
        if ((ex.mechanic || '').toLowerCase() !== selectedMechanic) return false;
      }

      return true;
    });
  }, [
    exercises,
    searchTerm,
    selectedMuscle,
    selectedEquipment,
    selectedLevel,
    selectedForce,
    selectedMechanic
  ]);

  const resetFilters = () => {
    setSelectedMuscle('all');
    setSelectedEquipment('all');
    setSelectedLevel('all');
    setSelectedForce('all');
    setSelectedMechanic('all');
    setSearchTerm('');
  };

  const hasActiveFilters =
    selectedMuscle !== 'all' ||
    selectedEquipment !== 'all' ||
    selectedLevel !== 'all' ||
    selectedForce !== 'all' ||
    selectedMechanic !== 'all' ||
    searchTerm.trim() !== '';

  return (
    <div className="space-y-6">
      {/* Search & Top Action Bar - Sticky at Top */}
      <div className="sticky top-0 z-30 bg-[#15171A] pt-1 pb-3">
        <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-2xl p-4 md:p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#CCFF00] w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F1113] border border-[#2C2E33] text-white pl-10 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#CCFF00] transition placeholder:text-[#8E9299]"
              placeholder="Search 870+ movements by name, muscle, equipment..."
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            {/* Create Custom Movement Button */}
            <button
              type="button"
              onClick={() => setShowCreateCustom(!showCreateCustom)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                showCreateCustom
                  ? 'bg-[#CCFF00] text-black shadow-md shadow-[#CCFF00]/20'
                  : 'bg-[#CCFF00]/15 text-[#CCFF00] border border-[#CCFF00]/30 hover:bg-[#CCFF00]/25'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Custom Movement</span>
            </button>

            {/* Toggle Advanced Filters Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                showAdvancedFilters || selectedLevel !== 'all' || selectedForce !== 'all' || selectedMechanic !== 'all'
                  ? 'bg-[#CCFF00]/10 border-[#CCFF00] text-[#CCFF00]'
                  : 'bg-[#0F1113] border-[#2C2E33] text-[#8E9299] hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Inline Create Custom Exercise Expander Form */}
        {showCreateCustom && (
          <form onSubmit={handleCreateCustomAndSelect} className="bg-[#0F1113] border border-[#CCFF00]/30 rounded-xl p-4 space-y-4 animate-fade-in mt-3">
            <div className="flex items-center justify-between border-b border-[#2C2E33] pb-2">
              <h4 className="text-xs font-black text-[#CCFF00] uppercase tracking-wider flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#CCFF00]" />
                Create New Custom Exercise
              </h4>
              <button
                type="button"
                onClick={() => setShowCreateCustom(false)}
                className="text-[#8E9299] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">
                  Movement Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#1C1E22] border border-[#2C2E33] text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#CCFF00]"
                  placeholder="e.g. Incline Smith Press"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">
                  Category
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    setCustomMuscle(e.target.value);
                  }}
                  className="w-full bg-[#1C1E22] border border-[#2C2E33] text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#CCFF00] cursor-pointer"
                >
                  {['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">
                  Equipment
                </label>
                <select
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value)}
                  className="w-full bg-[#1C1E22] border border-[#2C2E33] text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#CCFF00] cursor-pointer"
                >
                  {['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Body Weight', 'Bands', 'Kettlebell', 'Other'].map(eq => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateCustom(false)}
                className="px-3 py-2 bg-[#1C1E22] text-[#8E9299] hover:text-white rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#CCFF00] text-black hover:bg-[#CCFF00]/90 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                Save & Select Movement
              </button>
            </div>
          </form>
        )}

        {/* Collapsible Advanced Filters (Level, Force, Mechanic) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#2C2E33] animate-fade-in">
            {/* Level Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">
                Difficulty Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#CCFF00] transition cursor-pointer"
              >
                <option value="all">All Difficulty Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Force Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">
                Force Type
              </label>
              <select
                value={selectedForce}
                onChange={(e) => setSelectedForce(e.target.value)}
                className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#CCFF00] transition cursor-pointer"
              >
                <option value="all">All Force Types</option>
                <option value="push">Push</option>
                <option value="pull">Pull</option>
                <option value="static">Static</option>
              </select>
            </div>

            {/* Mechanic Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299]">
                Mechanic Type
              </label>
              <select
                value={selectedMechanic}
                onChange={(e) => setSelectedMechanic(e.target.value)}
                className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#CCFF00] transition cursor-pointer"
              >
                <option value="all">All Mechanics</option>
                <option value="compound">Compound</option>
                <option value="isolation">Isolation</option>
              </select>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* 1. VISUAL CAROUSEL: Select by Muscle (Matches attached screenshot) */}
      <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-2xl p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#2C2E33] pb-2.5">
          <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#CCFF00]" />
            Select by Muscle
          </h3>
          <span className="text-[10px] font-mono text-[#8E9299]">
            {selectedMuscle !== 'all' ? `Filtered by ${MUSCLE_FILTERS.find(m => m.id === selectedMuscle)?.label}` : 'Showing All'}
          </span>
        </div>

        {/* Scrollable Muscle Cards Row */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {MUSCLE_FILTERS.map(mf => {
            const IconComponent = mf.icon;
            const isSelected = selectedMuscle === mf.id;
            return (
              <button
                key={mf.id}
                type="button"
                onClick={() => setSelectedMuscle(mf.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[85px] h-[95px] transition cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-[#CCFF00] border-[#CCFF00] text-black shadow-lg shadow-[#CCFF00]/20 font-black scale-105'
                    : 'bg-[#0F1113] border-[#2C2E33] text-slate-300 hover:border-[#CCFF00]/40 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-xl mb-1.5 transition ${isSelected ? 'bg-black/10 text-black' : 'bg-[#1C1E22] text-[#CCFF00]'}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-center leading-tight whitespace-nowrap">
                  {mf.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. VISUAL CAROUSEL: Select by Equipment (Matches attached screenshot) */}
      <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-2xl p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#2C2E33] pb-2.5">
          <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-sky-400" />
            Select by Equipment
          </h3>
          <span className="text-[10px] font-mono text-[#8E9299]">
            {selectedEquipment !== 'all' ? `Filtered by ${EQUIPMENT_FILTERS.find(e => e.id === selectedEquipment)?.label}` : 'Showing All'}
          </span>
        </div>

        {/* Scrollable Equipment Cards Row */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {EQUIPMENT_FILTERS.map(ef => {
            const IconComponent = ef.icon;
            const isSelected = selectedEquipment === ef.id;
            return (
              <button
                key={ef.id}
                type="button"
                onClick={() => setSelectedEquipment(ef.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-full min-w-[90px] h-[90px] transition cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-sky-400 border-sky-400 text-black shadow-lg shadow-sky-400/20 font-black scale-105'
                    : 'bg-[#0F1113] border-[#2C2E33] text-slate-300 hover:border-sky-400/40 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-full mb-1 transition ${isSelected ? 'bg-black/10 text-black' : 'bg-[#1C1E22] text-sky-400'}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight max-w-[70px] truncate">
                  {ef.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#8E9299] px-1">
        <span className="font-mono">
          Found <strong className="text-[#CCFF00] font-bold">{filteredExercises.length}</strong> matching exercises
        </span>

        {hasActiveFilters && (
          <span className="text-[11px] text-[#CCFF00]">
            Active filters applied
          </span>
        )}
      </div>

      {/* EXERCISES DISPLAY (CARDS GRID ONLY) */}
      {filteredExercises.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredExercises.slice(0, 90).map(ex => {
              const primaryMuscle = ex.primaryMuscles?.[0] || 'General';
              return (
                <div
                  key={ex.id}
                  className="bg-[#1C1E22] border border-[#2C2E33] hover:border-[#CCFF00]/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 group transition shadow-md hover:shadow-xl"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#CCFF00] transition line-clamp-2">
                        {ex.name}
                      </h4>

                      {ex.level && (
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                          ex.level === 'beginner'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : ex.level === 'intermediate'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {ex.level}
                        </span>
                      )}
                    </div>

                    {/* Muscle & Equipment Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold bg-[#0F1113] text-[#CCFF00] border border-[#2C2E33] px-2 py-0.5 rounded-md capitalize">
                        {primaryMuscle}
                      </span>

                      {ex.equipment && (
                        <span className="text-[10px] font-semibold bg-[#0F1113] text-sky-300 border border-[#2C2E33] px-2 py-0.5 rounded-md capitalize">
                          {ex.equipment}
                        </span>
                      )}

                      {ex.force && (
                        <span className="text-[10px] font-semibold bg-[#0F1113] text-purple-300 border border-[#2C2E33] px-2 py-0.5 rounded-md capitalize">
                          {ex.force}
                        </span>
                      )}

                      {ex.mechanic && (
                        <span className="text-[10px] font-semibold bg-[#0F1113] text-amber-300 border border-[#2C2E33] px-2 py-0.5 rounded-md capitalize">
                          {ex.mechanic}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#2C2E33]/60">
                    {/* Inspect Instructions Button */}
                    <button
                      type="button"
                      onClick={() => setInspectExercise(ex)}
                      className="flex-1 py-2 px-3 bg-[#0F1113] hover:bg-[#15171A] text-[#8E9299] hover:text-white border border-[#2C2E33] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#CCFF00]" />
                      Guide
                    </button>

                    {/* Primary Selection Action Button */}
                    {onSelectExercise && (
                      <button
                        type="button"
                        onClick={() => onSelectExercise(ex)}
                        className="py-2 px-3 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black font-black rounded-xl text-xs transition flex items-center gap-1 cursor-pointer shadow-sm shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {actionButtonLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      ) : (
        <div className="text-center py-12 bg-[#1C1E22] rounded-2xl border border-[#2C2E33]">
          <Dumbbell className="w-12 h-12 text-[#8E9299] mx-auto mb-3" />
          <p className="text-white font-bold text-base">No Matching Exercises</p>
          <p className="text-xs text-[#8E9299] mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, muscle group filters, or equipment filters above.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 px-4 py-2 bg-[#CCFF00] text-black font-bold text-xs rounded-xl cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* 4. EXERCISE DETAIL & INSTRUCTIONS MODAL */}
      {inspectExercise && (
        <div className="fixed inset-0 bg-[#0F1113]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#15171A] border border-[#2C2E33] rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#2C2E33] flex items-center justify-between bg-[#1C1E22]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#CCFF00] text-black px-2 py-0.5 rounded">
                    {inspectExercise.category}
                  </span>
                  {inspectExercise.level && (
                    <span className="text-[10px] font-bold text-[#8E9299] uppercase font-mono">
                      Level: {inspectExercise.level}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white">{inspectExercise.name}</h3>
              </div>

              <button
                type="button"
                onClick={() => setInspectExercise(null)}
                className="p-2 hover:bg-[#0F1113] text-[#8E9299] hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Muscle & Mechanics Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-[#0F1113] p-3 rounded-xl border border-[#2C2E33]">
                  <p className="text-[10px] font-bold text-[#8E9299] uppercase">Primary Muscle</p>
                  <p className="text-xs font-black text-[#CCFF00] mt-1 capitalize">
                    {inspectExercise.primaryMuscles?.[0] || 'General'}
                  </p>
                </div>

                <div className="bg-[#0F1113] p-3 rounded-xl border border-[#2C2E33]">
                  <p className="text-[10px] font-bold text-[#8E9299] uppercase">Equipment</p>
                  <p className="text-xs font-black text-sky-400 mt-1 capitalize">
                    {inspectExercise.equipment || 'Body Weight'}
                  </p>
                </div>

                <div className="bg-[#0F1113] p-3 rounded-xl border border-[#2C2E33]">
                  <p className="text-[10px] font-bold text-[#8E9299] uppercase">Force</p>
                  <p className="text-xs font-black text-purple-400 mt-1 capitalize">
                    {inspectExercise.force || 'N/A'}
                  </p>
                </div>

                <div className="bg-[#0F1113] p-3 rounded-xl border border-[#2C2E33]">
                  <p className="text-[10px] font-bold text-[#8E9299] uppercase">Mechanic</p>
                  <p className="text-xs font-black text-amber-400 mt-1 capitalize">
                    {inspectExercise.mechanic || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Instructions Steps */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2C2E33] pb-2">
                  <BookOpen className="w-4 h-4 text-[#CCFF00]" />
                  Step-by-Step Instructions
                </h4>

                {inspectExercise.instructions && inspectExercise.instructions.length > 0 ? (
                  <ol className="space-y-3">
                    {inspectExercise.instructions.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 bg-[#0F1113] p-3 rounded-xl border border-[#2C2E33]">
                        <span className="w-6 h-6 rounded-full bg-[#CCFF00]/10 text-[#CCFF00] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-slate-200 leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-[#8E9299] italic">Standard execution procedure applies for this movement.</p>
                )}
              </div>
            </div>

            {/* Modal Footer Action */}
            <div className="p-4 border-t border-[#2C2E33] bg-[#1C1E22] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setInspectExercise(null)}
                className="px-4 py-2.5 bg-[#0F1113] hover:bg-[#15171A] border border-[#2C2E33] text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close Guide
              </button>

              {onSelectExercise && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectExercise(inspectExercise);
                    setInspectExercise(null);
                  }}
                  className="px-5 py-2.5 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#CCFF00]/20"
                >
                  <Plus className="w-4 h-4" />
                  {actionButtonLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
