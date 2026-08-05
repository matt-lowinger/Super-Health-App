import React, { useState, useMemo } from 'react';
import { CompletedWorkout, Exercise, WorkoutExercise, WorkoutSet } from '../types';
import { Calendar, Trash2, Dumbbell, Award, Filter, X, RefreshCw, Edit2, Plus, Check, TrendingUp, TrendingDown, Minus, ArrowUpDown, Search } from 'lucide-react';
import { formatDate, calculateWorkoutVolume, generateId } from '../utils';
import ActivityFilterSelector from './ActivityFilterSelector';

interface HistoryPanelProps {
  completedWorkouts: CompletedWorkout[];
  exercises: Exercise[];
  onDeleteWorkout: (id: string) => void;
  onUpdateWorkout?: (updatedWorkout: CompletedWorkout) => void;
}

export default function HistoryPanel({
  completedWorkouts,
  exercises,
  onDeleteWorkout,
  onUpdateWorkout
}: HistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'dayByDay' | 'allSetsTable'>('allSetsTable');

  // Filter States for Day-by-Day Weight Logs
  const [filterExerciseId, setFilterExerciseId] = useState<string>('All');
  const [filterDate, setFilterDate] = useState<string>('All');

  // Filter States for Master Sets Data Table
  const [masterSearch, setMasterSearch] = useState('');
  const [masterExerciseFilter, setMasterExerciseFilter] = useState<string>('All');
  const [masterTimeframeFilter, setMasterTimeframeFilter] = useState<string>('All');
  const [masterSortDir, setMasterSortDir] = useState<'desc' | 'asc'>('desc');

  // Editing state for completed workout
  const [editingWorkout, setEditingWorkout] = useState<CompletedWorkout | null>(null);
  const [showAddExModal, setShowAddExModal] = useState(false);

  // 1. Get ONLY exercises that have actually been logged
  const loggedExercises = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string }>();
    for (const cw of completedWorkouts) {
      for (const ex of cw.exercises) {
        if (!map.has(ex.exerciseId)) {
          const matchingEx = exercises.find(e => e.id === ex.exerciseId);
          map.set(ex.exerciseId, {
            id: ex.exerciseId,
            name: ex.name || matchingEx?.name || 'Unknown Exercise',
            category: ex.category || matchingEx?.category || 'General'
          });
        }
      }
    }
    return Array.from(map.values());
  }, [completedWorkouts, exercises]);

  // 2. Compute Master Flat Sets List with Chronological Progression Tracking
  const masterSetsList = useMemo(() => {
    // Sort workouts chronologically (oldest to newest) to track week-over-week progression
    const sortedChronological = [...completedWorkouts].sort((a, b) => a.startTime - b.startTime);

    // Track previous weight logged for each exercise movement
    const lastWeightTracker = new Map<string, number>();

    const flatList: {
      workoutId: string;
      workoutName: string;
      dateStr: string;
      timestamp: number;
      exerciseId: string;
      exerciseName: string;
      category: string;
      setIndex: number;
      weight: number;
      reps: number;
      prevWeight: number | null;
      weightDiff: number | null;
    }[] = [];

    for (const cw of sortedChronological) {
      const dateStr = formatDate(cw.startTime);
      for (const ex of cw.exercises) {
        const exKey = ex.exerciseId || ex.name.toLowerCase();
        ex.sets.forEach((set, sIdx) => {
          const prevW = lastWeightTracker.has(exKey) ? lastWeightTracker.get(exKey)! : null;
          const diff = prevW !== null && set.weight > 0 ? set.weight - prevW : null;

          flatList.push({
            workoutId: cw.id,
            workoutName: cw.name,
            dateStr,
            timestamp: cw.startTime,
            exerciseId: ex.exerciseId,
            exerciseName: ex.name,
            category: ex.category || 'General',
            setIndex: sIdx + 1,
            weight: set.weight,
            reps: set.reps,
            prevWeight: prevW,
            weightDiff: diff
          });

          // Update last logged weight for this exercise
          if (set.weight > 0) {
            lastWeightTracker.set(exKey, set.weight);
          }
        });
      }
    }

    return flatList;
  }, [completedWorkouts]);

  // 3. Filter and Sort Master Sets for the Master Data Table
  const filteredMasterSets = useMemo(() => {
    const now = Date.now();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    return masterSetsList.filter(row => {
      // Search term filter (exercise name, session name, or category)
      if (masterSearch.trim()) {
        const q = masterSearch.toLowerCase();
        const matchName = row.exerciseName.toLowerCase().includes(q);
        const matchWorkout = row.workoutName.toLowerCase().includes(q);
        const matchCat = row.category.toLowerCase().includes(q);
        if (!matchName && !matchWorkout && !matchCat) return false;
      }

      // Movement / Exercise filter
      if (masterExerciseFilter !== 'All') {
        if (row.exerciseId !== masterExerciseFilter && row.exerciseName !== masterExerciseFilter) {
          return false;
        }
      }

      // Date / Timeframe filter
      if (masterTimeframeFilter !== 'All') {
        if (masterTimeframeFilter === '7days') {
          if (now - row.timestamp > 7 * MS_PER_DAY) return false;
        } else if (masterTimeframeFilter === '30days') {
          if (now - row.timestamp > 30 * MS_PER_DAY) return false;
        } else if (masterTimeframeFilter === '90days') {
          if (now - row.timestamp > 90 * MS_PER_DAY) return false;
        } else {
          // Exact date string match
          if (row.dateStr !== masterTimeframeFilter) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      return masterSortDir === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });
  }, [masterSetsList, masterSearch, masterExerciseFilter, masterTimeframeFilter, masterSortDir]);

  // 4. Get unique dates from all completed workouts
  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const cw of completedWorkouts) {
      dateSet.add(formatDate(cw.startTime));
    }
    return Array.from(dateSet);
  }, [completedWorkouts]);

  // Filter workouts for Day-by-Day View based on user selected Date and Exercise filters
  const filteredWorkouts = useMemo(() => {
    return completedWorkouts.filter(cw => {
      // Date filter check
      const dStr = formatDate(cw.startTime);
      if (filterDate !== 'All' && dStr !== filterDate) {
        return false;
      }

      // Exercise filter check
      if (filterExerciseId !== 'All') {
        const hasEx = cw.exercises.some(e => e.exerciseId === filterExerciseId);
        if (!hasEx) return false;
      }

      return true;
    });
  }, [completedWorkouts, filterDate, filterExerciseId]);

  // Group filtered workouts day-by-day (formatted date string)
  const groupedByDay: { [dateStr: string]: CompletedWorkout[] } = {};
  for (const cw of filteredWorkouts) {
    const dStr = formatDate(cw.startTime);
    if (!groupedByDay[dStr]) {
      groupedByDay[dStr] = [];
    }
    groupedByDay[dStr].push(cw);
  }

  const hasActiveDayFilters = filterExerciseId !== 'All' || filterDate !== 'All';
  const hasActiveMasterFilters = masterExerciseFilter !== 'All' || masterTimeframeFilter !== 'All' || masterSearch !== '';

  const handleResetDayFilters = () => {
    setFilterExerciseId('All');
    setFilterDate('All');
  };

  const handleResetMasterFilters = () => {
    setMasterExerciseFilter('All');
    setMasterTimeframeFilter('All');
    setMasterSearch('');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" id="history-panel">
      {/* Page Header */}
      <div className="border-b border-[#2C2E33] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-sans">Lifting History & Weight Progression</h1>
          <p className="text-sm text-[#8E9299] mt-1">
            Track your weight logs and monitor exercise progression week over week.
          </p>
        </div>

        {/* View Switcher Toggles */}
        <div className="flex bg-[#1C1E22] border border-[#2C2E33] p-1 rounded-xl self-start sm:self-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('allSetsTable')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'allSetsTable'
                ? 'bg-[#CCFF00] text-black shadow-md shadow-[#CCFF00]/10'
                : 'text-[#8E9299] hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Master Sets Data Table
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dayByDay')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'dayByDay'
                ? 'bg-[#CCFF00] text-black shadow-md shadow-[#CCFF00]/10'
                : 'text-[#8E9299] hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            History Sessions
          </button>
        </div>
      </div>

      {/* MASTER SETS DATA TABLE TAB */}
      {activeTab === 'allSetsTable' && (
        <div className="space-y-6">
          {/* MASTER DATA TABLE FILTERS & SEARCH TOOLBAR */}
          <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#2C2E33] pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#CCFF00]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Exercise & Date Filters</h3>
              </div>

              {hasActiveMasterFilters && (
                <button
                  type="button"
                  onClick={handleResetMasterFilters}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#CCFF00] hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Table Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Exercise Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[#CCFF00]" />
                  Filter Movement
                </label>
                <select
                  value={masterExerciseFilter}
                  onChange={(e) => setMasterExerciseFilter(e.target.value)}
                  className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-[#CCFF00] transition cursor-pointer"
                >
                  <option value="All">All Exercises ({loggedExercises.length})</option>
                  {loggedExercises.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Date / Timeframe Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#CCFF00]" />
                  Filter Timeframe / Date
                </label>
                <select
                  value={masterTimeframeFilter}
                  onChange={(e) => setMasterTimeframeFilter(e.target.value)}
                  className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-[#CCFF00] transition cursor-pointer"
                >
                  <option value="All">All Time ({availableDates.length} Dates)</option>
                  <option value="7days">Past 7 Days (This Week)</option>
                  <option value="30days">Past 30 Days</option>
                  <option value="90days">Past 90 Days</option>
                  <optgroup label="Specific Session Dates">
                    {availableDates.map(dStr => (
                      <option key={dStr} value={dStr}>{dStr}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* 3. Search Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[#CCFF00]" />
                  Search Sets
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={masterSearch}
                    onChange={(e) => setMasterSearch(e.target.value)}
                    placeholder="Search movement, session..."
                    className="w-full bg-[#0F1113] border border-[#2C2E33] text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#CCFF00]"
                  />
                  {masterSearch && (
                    <button
                      type="button"
                      onClick={() => setMasterSearch('')}
                      className="absolute right-3 top-2.5 text-[#8E9299] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sort & Counter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#2C2E33]/60">
              <span className="text-xs font-mono font-bold text-[#8E9299]">
                Showing <strong className="text-[#CCFF00]">{filteredMasterSets.length}</strong> sets of {masterSetsList.length} total logged
              </span>

              <button
                type="button"
                onClick={() => setMasterSortDir(masterSortDir === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 text-xs font-bold text-[#8E9299] hover:text-white bg-[#0F1113] border border-[#2C2E33] px-3 py-1.5 rounded-lg cursor-pointer transition"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#CCFF00]" />
                Sort: {masterSortDir === 'desc' ? 'Newest First' : 'Oldest First'}
              </button>
            </div>
          </div>

          {/* MASTER DATA TABLE */}
          <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0F1113] text-[#8E9299] uppercase tracking-wider font-mono font-bold border-b border-[#2C2E33]">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Workout Session</th>
                    <th className="py-3.5 px-4">Movement</th>
                    <th className="py-3.5 px-4 text-center">Set #</th>
                    <th className="py-3.5 px-4 text-center">Weight</th>
                    <th className="py-3.5 px-4 text-center">Reps</th>
                    <th className="py-3.5 px-4 text-right">Progression (vs Prev Set)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2E33] bg-[#15171A]">
                  {filteredMasterSets.length > 0 ? (
                    filteredMasterSets.map((row, idx) => {
                      const hasDiff = row.weightDiff !== null;
                      const isUp = hasDiff && row.weightDiff! > 0;
                      const isDown = hasDiff && row.weightDiff! < 0;
                      const isSame = hasDiff && row.weightDiff === 0;

                      return (
                        <tr
                          key={`${row.workoutId}-${row.exerciseName}-${row.setIndex}-${idx}`}
                          className={idx % 2 === 0 ? 'bg-[#15171A] hover:bg-[#1C1E22]' : 'bg-[#181A1E] hover:bg-[#1C1E22]'}
                        >
                          <td className="py-3 px-4 font-mono text-[#8E9299] font-medium whitespace-nowrap">{row.dateStr}</td>
                          <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{row.workoutName}</td>
                          <td className="py-3 px-4 text-white font-bold flex items-center gap-2 whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                            {row.exerciseName}
                            <span className="text-[10px] font-normal text-[#8E9299] bg-[#0F1113] border border-[#2C2E33] px-1.5 py-0.5 rounded uppercase">
                              {row.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[#8E9299]">Set {row.setIndex}</td>
                          <td className="py-3 px-4 text-center font-mono font-black text-[#CCFF00] text-sm">
                            {row.weight} <span className="text-[10px] text-[#8E9299] font-normal">lbs</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-white">
                            {row.reps} <span className="text-[10px] text-[#8E9299] font-normal">reps</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isUp && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-black text-[#CCFF00] bg-[#CCFF00]/15 border border-[#CCFF00]/30 px-2.5 py-1 rounded-lg">
                                <TrendingUp className="w-3.5 h-3.5" /> +{row.weightDiff} lbs
                              </span>
                            )}
                            {isDown && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-black text-red-400 bg-red-500/15 border border-red-500/30 px-2.5 py-1 rounded-lg">
                                <TrendingDown className="w-3.5 h-3.5" /> {row.weightDiff} lbs
                              </span>
                            )}
                            {isSame && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-300 bg-[#0F1113] border border-[#2C2E33] px-2 py-0.5 rounded-lg">
                                <Minus className="w-3 h-3 text-[#8E9299]" /> Baseline
                              </span>
                            )}
                            {!hasDiff && (
                              <span className="text-[10px] font-mono text-[#8E9299] italic">
                                -- First Log
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#8E9299] italic">
                        No sets matching selected movement or date filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DAY BY DAY WORKOUT SESSIONS VIEW */}
      {activeTab === 'dayByDay' && (
        <div className="space-y-6">
          {/* FILTERS TOOLBAR */}
          <div className="bg-[#1C1E22] border border-[#2C2E33] rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2E33] pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#CCFF00]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Filter Session Logs</h3>
              </div>

              {hasActiveDayFilters && (
                <button
                  type="button"
                  onClick={handleResetDayFilters}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#CCFF00] hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Filter by Previously Done Exercise */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[#CCFF00]" />
                  Filter Movement
                </label>
                <select
                  value={filterExerciseId}
                  onChange={(e) => setFilterExerciseId(e.target.value)}
                  className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#CCFF00] transition cursor-pointer"
                >
                  <option value="All">All Exercises ({loggedExercises.length})</option>
                  {loggedExercises.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Activity Session Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#CCFF00]" />
                  Filter Date
                </label>
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-[#0F1113] border border-[#2C2E33] text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#CCFF00] transition cursor-pointer"
                >
                  <option value="All">All Dates ({availableDates.length})</option>
                  {availableDates.map(dStr => (
                    <option key={dStr} value={dStr}>
                      {dStr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Indication */}
            {hasActiveDayFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#2C2E33]/50">
                <span className="text-[10px] text-[#8E9299] font-bold uppercase">Active Filters:</span>
                {filterExerciseId !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#CCFF00]/10 border border-[#CCFF00]/25 text-[#CCFF00] text-xs font-bold">
                    Movement: {loggedExercises.find(e => e.id === filterExerciseId)?.name}
                    <button type="button" onClick={() => setFilterExerciseId('All')} className="hover:text-white cursor-pointer ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterDate !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#CCFF00]/10 border border-[#CCFF00]/25 text-[#CCFF00] text-xs font-bold">
                    Date: {filterDate}
                    <button type="button" onClick={() => setFilterDate('All')} className="hover:text-white cursor-pointer ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* WORKOUT LOGS DISPLAY */}
          <div className="space-y-8">
            {Object.keys(groupedByDay).length > 0 ? (
              Object.entries(groupedByDay).map(([dayDate, workouts]) => (
                <div key={dayDate} className="space-y-4">
                  {/* Date Header Badge */}
                  <div className="flex items-center gap-3">
                    <div className="px-3.5 py-1.5 bg-[#CCFF00]/10 border border-[#CCFF00]/25 rounded-xl flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#CCFF00]" />
                      <span className="text-xs font-black text-[#CCFF00] uppercase tracking-wider">{dayDate}</span>
                    </div>
                    <div className="h-px bg-[#2C2E33] flex-1" />
                  </div>

                  {/* Workouts on this Day */}
                  <div className="space-y-4">
                    {workouts.map((workout) => {
                      const totalSetsCount = workout.exercises.reduce((s, ex) => s + ex.sets.length, 0);

                      // If specific exercise filter is active, filter exercises inside card
                      const exercisesToDisplay = filterExerciseId !== 'All'
                        ? workout.exercises.filter(e => e.exerciseId === filterExerciseId)
                        : workout.exercises;

                      return (
                        <div
                          key={workout.id}
                          className="bg-[#1C1E22] border border-[#2C2E33] rounded-2xl overflow-hidden shadow-lg p-5 space-y-5 hover:border-[#CCFF00]/30 transition"
                        >
                          {/* Workout Header Info */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2E33] pb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-white">{workout.name}</h3>
                                <span className="bg-[#CCFF00]/15 text-[#CCFF00] text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                                  Logged
                                </span>
                              </div>
                              <p className="text-xs text-[#8E9299] mt-1 font-mono">
                                {workout.exercises.length} Exercises • {totalSetsCount} Total Sets
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <button
                                type="button"
                                onClick={() => setEditingWorkout(JSON.parse(JSON.stringify(workout)))}
                                className="flex items-center gap-1.5 text-xs text-[#CCFF00] hover:text-[#CCFF00]/90 bg-[#CCFF00]/10 hover:bg-[#CCFF00]/20 border border-[#CCFF00]/20 px-3 py-1.5 rounded-xl transition font-bold cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit Log
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Delete this workout log from history?')) {
                                    onDeleteWorkout(workout.id);
                                  }
                                }}
                                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-xl transition font-semibold cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Log
                              </button>
                            </div>
                          </div>

                          {workout.notes && (
                            <div className="bg-[#0F1113] border border-[#2C2E33] rounded-xl p-3 text-xs text-slate-300 italic">
                              "{workout.notes}"
                            </div>
                          )}

                          {/* FULL WEIGHTS BREAKDOWN */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">
                              Full Exercise & Weight Breakdown
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {exercisesToDisplay.map((we) => (
                                <div
                                  key={we.id}
                                  className="bg-[#0F1113] border border-[#2C2E33] rounded-xl p-4 space-y-3"
                                >
                                  <div className="flex items-center justify-between border-b border-[#2C2E33] pb-2">
                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                                      {we.name}
                                    </p>
                                    <span className="text-[10px] font-bold text-[#8E9299] px-2 py-0.5 bg-[#1C1E22] rounded border border-[#2C2E33] uppercase">
                                      {we.category}
                                    </span>
                                  </div>

                                  {/* Table Grid of Sets with Full Weights Display */}
                                  <div className="space-y-1.5">
                                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-[#8E9299] uppercase pb-1 border-b border-[#2C2E33]/40">
                                      <span className="text-left">Set</span>
                                      <span>Weight</span>
                                      <span>Reps</span>
                                    </div>

                                    {we.sets.map((set, idx) => (
                                      <div
                                        key={set.id}
                                        className="grid grid-cols-3 gap-2 items-center text-center text-xs py-1.5 px-2 bg-[#1C1E22] rounded-lg border border-[#2C2E33]"
                                      >
                                        <span className="text-left font-mono font-bold text-[#8E9299]">Set {idx + 1}</span>
                                        <span className="font-mono font-black text-[#CCFF00] text-sm">
                                          {set.weight} <span className="text-[10px] text-[#8E9299] font-normal">lbs</span>
                                        </span>
                                        <span className="font-mono font-bold text-white">
                                          {set.reps} <span className="text-[10px] text-[#8E9299] font-normal">reps</span>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center bg-[#1C1E22]/50 border border-dashed border-[#2C2E33] rounded-2xl py-14 px-4">
                <Dumbbell className="w-12 h-12 text-[#8E9299] mx-auto mb-3" />
                <p className="text-slate-200 font-bold text-base">
                  {hasActiveDayFilters ? 'No Matching Workout Logs Found' : 'No Weight Logs Recorded Yet'}
                </p>
                <p className="text-[#8E9299] text-xs mt-1 max-w-sm mx-auto">
                  {hasActiveDayFilters
                    ? 'Try adjusting or clearing your movement and date filters above.'
                    : 'Launch an active workout session or template routine to record your sets.'}
                </p>
                {hasActiveDayFilters && (
                  <button
                    type="button"
                    onClick={handleResetDayFilters}
                    className="mt-4 px-4 py-2 bg-[#CCFF00] text-black text-xs font-bold rounded-xl transition hover:bg-[#CCFF00]/90 cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Workout Log Modal */}
      {editingWorkout && (
        <div className="fixed inset-0 bg-[#0F1113]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#15171A] border border-[#2C2E33] rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#2C2E33] flex items-center justify-between bg-[#1C1E22]">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-[#CCFF00]" />
                  Edit Workout Log
                </h3>
                <p className="text-xs text-[#8E9299] mt-0.5">Modify session details, weights, reps, or exercises.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingWorkout(null)}
                className="p-2 hover:bg-[#0F1113] text-[#8E9299] hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Workout Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Workout Title</label>
                <input
                  type="text"
                  value={editingWorkout.name}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
                  className="w-full bg-[#0F1113] border border-[#2C2E33] text-white px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-[#CCFF00]"
                />
              </div>

              {/* Workout Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Notes</label>
                <input
                  type="text"
                  value={editingWorkout.notes || ''}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, notes: e.target.value })}
                  className="w-full bg-[#0F1113] border border-[#2C2E33] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#CCFF00]"
                  placeholder="Session notes..."
                />
              </div>

              {/* Exercises & Sets */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Logged Movements & Sets</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddExModal(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#CCFF00] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Movement
                  </button>
                </div>

                <div className="space-y-4">
                  {editingWorkout.exercises.map((ex, exIdx) => (
                    <div key={ex.id} className="bg-[#0F1113] border border-[#2C2E33] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#2C2E33] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#CCFF00]">{exIdx + 1}.</span>
                          <span className="text-sm font-bold text-white">{ex.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWorkout({
                              ...editingWorkout,
                              exercises: editingWorkout.exercises.filter(e => e.id !== ex.id)
                            });
                          }}
                          className="text-[#8E9299] hover:text-red-500 transition cursor-pointer p-1"
                          title="Remove Exercise"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Sets list */}
                      <div className="space-y-2">
                        {ex.sets.map((set, setIdx) => (
                          <div key={set.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                            <span className="col-span-3 text-[#8E9299] font-mono font-bold">Set {setIdx + 1}</span>
                            <div className="col-span-4 flex items-center bg-[#1C1E22] border border-[#2C2E33] rounded-lg px-2">
                              <input
                                type="number"
                                value={set.weight}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const updated = editingWorkout.exercises.map(item => {
                                    if (item.id !== ex.id) return item;
                                    return {
                                      ...item,
                                      sets: item.sets.map(s => s.id === set.id ? { ...s, weight: val } : s)
                                    };
                                  });
                                  setEditingWorkout({ ...editingWorkout, exercises: updated });
                                }}
                                className="w-full bg-transparent text-white font-mono font-bold py-1.5 text-center focus:outline-none"
                              />
                              <span className="text-[10px] text-[#8E9299] ml-1">lbs</span>
                            </div>

                            <div className="col-span-4 flex items-center bg-[#1C1E22] border border-[#2C2E33] rounded-lg px-2">
                              <input
                                type="number"
                                value={set.reps}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const updated = editingWorkout.exercises.map(item => {
                                    if (item.id !== ex.id) return item;
                                    return {
                                      ...item,
                                      sets: item.sets.map(s => s.id === set.id ? { ...s, reps: val } : s)
                                    };
                                  });
                                  setEditingWorkout({ ...editingWorkout, exercises: updated });
                                }}
                                className="w-full bg-transparent text-white font-mono font-bold py-1.5 text-center focus:outline-none"
                              />
                              <span className="text-[10px] text-[#8E9299] ml-1">reps</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = editingWorkout.exercises.map(item => {
                                  if (item.id !== ex.id) return item;
                                  return { ...item, sets: item.sets.filter(s => s.id !== set.id) };
                                });
                                setEditingWorkout({ ...editingWorkout, exercises: updated });
                              }}
                              className="col-span-1 text-[#8E9299] hover:text-red-500 flex justify-center cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const lastSet = ex.sets[ex.sets.length - 1];
                            const newSet: WorkoutSet = {
                              id: `s-edit-${generateId()}`,
                              weight: lastSet ? lastSet.weight : 100,
                              reps: lastSet ? lastSet.reps : 10,
                              completed: true
                            };
                            const updated = editingWorkout.exercises.map(item => {
                              if (item.id !== ex.id) return item;
                              return { ...item, sets: [...item.sets, newSet] };
                            });
                            setEditingWorkout({ ...editingWorkout, exercises: updated });
                          }}
                          className="w-full text-center text-xs text-[#8E9299] hover:text-[#CCFF00] py-1 border border-dashed border-[#2C2E33] rounded-lg mt-1 cursor-pointer transition"
                        >
                          + Add Set
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#1C1E22] border-t border-[#2C2E33] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingWorkout(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#8E9299] hover:text-white hover:bg-[#0F1113] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated: CompletedWorkout = {
                    ...editingWorkout,
                    totalVolume: calculateWorkoutVolume(editingWorkout.exercises)
                  };
                  if (onUpdateWorkout) {
                    onUpdateWorkout(updated);
                  }
                  setEditingWorkout(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#CCFF00] text-black hover:bg-[#CCFF00]/90 transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Save Log Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal for Edit Workout */}
      {showAddExModal && editingWorkout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-[#15171A] border border-[#2C2E33] rounded-2xl w-full max-w-4xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden my-auto">
            <div className="p-4 sm:p-5 border-b border-[#2C2E33] flex items-center justify-between bg-[#1C1E22] shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[#CCFF00]" />
                Select Movement to Add
              </h3>
              <button
                type="button"
                onClick={() => setShowAddExModal(false)}
                className="p-2 hover:bg-[#0F1113] text-[#8E9299] hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <ActivityFilterSelector
                exercises={exercises}
                onSelectExercise={(selectedEx) => {
                  const newEx: WorkoutExercise = {
                    id: `we-edit-${generateId()}`,
                    exerciseId: selectedEx.id,
                    name: selectedEx.name,
                    category: selectedEx.category,
                    sets: [{ id: `s-edit-${generateId()}`, weight: 100, reps: 10, completed: true }]
                  };
                  setEditingWorkout({
                    ...editingWorkout,
                    exercises: [...editingWorkout.exercises, newEx]
                  });
                  setShowAddExModal(false);
                }}
                actionButtonLabel="Add to Log"
                isModal={true}
                onCloseModal={() => setShowAddExModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
