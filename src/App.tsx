import { useState, useEffect, useRef } from 'react';
import { CompletedWorkout, WorkoutTemplate, Exercise, ActiveSession, BreathPattern, BreathworkSession } from './types';
import {
  INITIAL_EXERCISES,
  INITIAL_TEMPLATES,
  INITIAL_COMPLETED,
  calculateWorkoutVolume,
  generateId
} from './utils';
import {
  SCIENTIFIC_BREATH_PROTOCOLS,
  INITIAL_BREATHWORK_SESSIONS
} from './data/breathProtocols';
import {
  subscribeWorkouts,
  saveWorkoutToCloud,
  deleteWorkoutFromCloud,
  subscribeTemplates,
  saveTemplateToCloud,
  deleteTemplateFromCloud,
  subscribeExercises,
  saveExerciseToCloud,
  deleteExerciseFromCloud,
  seedAllExercisesToCloud,
  subscribeActiveSession,
  subscribeActiveSessions,
  saveActiveSessionToCloud,
  fetchAllLiveFirebaseData,
  subscribeBreathPatterns,
  saveCalibratedBreathPattern,
  resetCalibratedBreathPattern,
  subscribeBreathworkSessions,
  saveCompletedBreathworkSession,
  onUserAuthStateChanged,
  signInWithGooglePopup,
  signOutUser
} from './firebase';
import { User } from 'firebase/auth';

// Panels
import HistoryPanel from './components/HistoryPanel';
import TemplatesPanel from './components/TemplatesPanel';
import ActiveWorkoutPanel from './components/ActiveWorkoutPanel';
import ExerciseRegistryPanel from './components/ExerciseRegistryPanel';
import BreathCoachPanel from './components/breathing/BreathCoachPanel';

// Icons
import {
  Dumbbell,
  History,
  Layout,
  Flame,
  ChevronRight,
  Menu,
  X,
  RefreshCw,
  Database,
  Waves,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  LogIn
} from 'lucide-react';

export default function App() {
  // --- Core State ---
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    const saved = localStorage.getItem('workout_exercises');
    return saved ? JSON.parse(saved) : INITIAL_EXERCISES;
  });

  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => {
    const saved = localStorage.getItem('workout_templates');
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });

  const [completedWorkouts, setCompletedWorkouts] = useState<CompletedWorkout[]>(() => {
    const saved = localStorage.getItem('completed_workouts');
    return saved ? JSON.parse(saved) : INITIAL_COMPLETED;
  });

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => {
    const saved = localStorage.getItem('active_workout_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [allActiveSessions, setAllActiveSessions] = useState<ActiveSession[]>([]);
  const [cloudSyncInfo, setCloudSyncInfo] = useState({
    isSyncing: false,
    counts: {
      activeSessions: 1,
      completedWorkouts: 2,
      exercises: 889,
      workoutTemplates: 4
    }
  });

  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- Navigation Architecture (Per PRD Constraint 3) ---
  // Dedicated top-level "Breathing" tab. Workout section is a single top-level tab with 3 sub-buttons.
  const [mainTab, setMainTab] = useState<'workout' | 'breathing'>('workout');
  const [workoutSubTab, setWorkoutSubTab] = useState<'routines' | 'history' | 'exercises' | 'active'>('routines');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isInitialMount = useRef(true);

  // --- Pocket Breath Coach State ---
  const [breathPatterns, setBreathPatterns] = useState<BreathPattern[]>(() => {
    const saved = localStorage.getItem('breath_patterns_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return SCIENTIFIC_BREATH_PROTOCOLS.map((proto) => {
          const calibration = parsed[proto.id];
          return calibration ? { ...proto, ...calibration } : proto;
        });
      } catch (e) {
        // fallback to default
      }
    }
    return SCIENTIFIC_BREATH_PROTOCOLS;
  });

  const [breathSessions, setBreathSessions] = useState<BreathworkSession[]>(() => {
    const saved = localStorage.getItem('breathwork_sessions_cache');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_BREATHWORK_SESSIONS;
  });

  // Hardcoded unit as requested
  const unit = 'lbs';

  // --- Firebase Auth Listener ---
  useEffect(() => {
    const unsub = onUserAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // --- Real-Time Firestore Synchronization ---
  useEffect(() => {
    // 1. Subscribe to completed workouts in Cloud Firestore (completed_workouts & completed_sessions)
    const unsubWorkouts = subscribeWorkouts((cloudWorkouts) => {
      if (cloudWorkouts && cloudWorkouts.length > 0) {
        setCompletedWorkouts(cloudWorkouts);
        localStorage.setItem('completed_workouts', JSON.stringify(cloudWorkouts));
        setCloudSyncInfo(prev => ({
          ...prev,
          counts: { ...prev.counts, completedWorkouts: cloudWorkouts.length }
        }));
      } else {
        // Seed initial workouts if completely empty
        INITIAL_COMPLETED.forEach(cw => {
          saveWorkoutToCloud(cw);
        });
        setCompletedWorkouts(INITIAL_COMPLETED);
        localStorage.setItem('completed_workouts', JSON.stringify(INITIAL_COMPLETED));
      }
    });

    // 2. Subscribe to workout templates in Cloud Firestore (workout_templates)
    const unsubTemplates = subscribeTemplates((cloudTemplates) => {
      if (cloudTemplates && cloudTemplates.length > 0) {
        setTemplates(cloudTemplates);
        localStorage.setItem('workout_templates', JSON.stringify(cloudTemplates));
        setCloudSyncInfo(prev => ({
          ...prev,
          counts: { ...prev.counts, workoutTemplates: cloudTemplates.length }
        }));
      } else {
        // Seed initial routines if empty
        INITIAL_TEMPLATES.forEach(t => saveTemplateToCloud(t));
        setTemplates(INITIAL_TEMPLATES);
        localStorage.setItem('workout_templates', JSON.stringify(INITIAL_TEMPLATES));
      }
    });

    // 3. Subscribe to exercise library in Cloud Firestore (exercises & excercises)
    const unsubExercises = subscribeExercises((cloudExercises) => {
      if (cloudExercises && cloudExercises.length > 0) {
        setExercises(cloudExercises);
        localStorage.setItem('workout_exercises', JSON.stringify(cloudExercises));
        setCloudSyncInfo(prev => ({
          ...prev,
          counts: { ...prev.counts, exercises: cloudExercises.length }
        }));
      } else {
        // Fallback / seed initial if collection empty
        seedAllExercisesToCloud(INITIAL_EXERCISES);
        setExercises(INITIAL_EXERCISES);
        localStorage.setItem('workout_exercises', JSON.stringify(INITIAL_EXERCISES));
      }
    });

    // 4. Subscribe to active workout sessions in Cloud Firestore (active_sessions)
    const unsubActiveSessions = subscribeActiveSessions((cloudSessions) => {
      setAllActiveSessions(cloudSessions);
      setCloudSyncInfo(prev => ({
        ...prev,
        counts: { ...prev.counts, activeSessions: cloudSessions.length }
      }));

      if (cloudSessions.length > 0) {
        const current = cloudSessions.find(s => s.id === 'current_session') || cloudSessions[0];
        setActiveSession(prev => {
          if (!prev) {
            localStorage.setItem('active_workout_session', JSON.stringify(current));
            return current;
          }
          return prev;
        });
      }
    });

    // 5. Subscribe to Breath Patterns Calibrations
    const unsubPatterns = subscribeBreathPatterns(currentUser?.uid || null, (calibrations) => {
      setBreathPatterns((prev) =>
        prev.map((proto) => {
          const cal = calibrations[proto.id];
          return cal ? { ...proto, ...cal } : proto;
        })
      );
      localStorage.setItem('breath_patterns_cache', JSON.stringify(calibrations));
    });

    // 6. Subscribe to Breathwork Sessions
    const unsubBreathSessions = subscribeBreathworkSessions(currentUser?.uid || null, (cloudSessions) => {
      if (cloudSessions && cloudSessions.length > 0) {
        setBreathSessions(cloudSessions);
        localStorage.setItem('breathwork_sessions_cache', JSON.stringify(cloudSessions));
      }
    });

    return () => {
      unsubWorkouts();
      unsubTemplates();
      unsubExercises();
      unsubActiveSessions();
      unsubPatterns();
      unsubBreathSessions();
    };
  }, [currentUser]);

  // Sync active workout session changes to local storage & Firestore
  // Guarded by isInitialMount to prevent overwriting cloud session on initial load
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (activeSession) {
      localStorage.setItem('active_workout_session', JSON.stringify(activeSession));
      saveActiveSessionToCloud(activeSession);
    } else {
      localStorage.removeItem('active_workout_session');
      saveActiveSessionToCloud(null);
    }
  }, [activeSession]);

  // Pull all live data from Firebase on demand
  const handleRefreshCloudData = async () => {
    setCloudSyncInfo(prev => ({ ...prev, isSyncing: true }));
    try {
      const data = await fetchAllLiveFirebaseData();
      if (data.templates && data.templates.length > 0) {
        setTemplates(data.templates);
        localStorage.setItem('workout_templates', JSON.stringify(data.templates));
      }
      if (data.completedWorkouts && data.completedWorkouts.length > 0) {
        setCompletedWorkouts(data.completedWorkouts);
        localStorage.setItem('completed_workouts', JSON.stringify(data.completedWorkouts));
      }
      if (data.exercises && data.exercises.length > 0) {
        setExercises(data.exercises);
        localStorage.setItem('workout_exercises', JSON.stringify(data.exercises));
      }
      if (data.activeSessions && data.activeSessions.length > 0) {
        setAllActiveSessions(data.activeSessions);
        const current = data.activeSessions.find(s => s.id === 'current_session') || data.activeSessions[0];
        setActiveSession(current);
        localStorage.setItem('active_workout_session', JSON.stringify(current));
      }

      setCloudSyncInfo({
        isSyncing: false,
        counts: {
          activeSessions: data.counts.activeSessions,
          completedWorkouts: data.counts.completedWorkouts + data.counts.completedSessions,
          exercises: data.counts.exercises,
          workoutTemplates: data.counts.workoutTemplates
        }
      });
    } catch (err) {
      console.error("Manual refresh error:", err);
      setCloudSyncInfo(prev => ({ ...prev, isSyncing: false }));
    }
  };

  // --- Handlers & Operations (Workouts) ---

  // Start empty custom session
  const handleStartEmptyWorkout = () => {
    const newSession: ActiveSession = {
      name: `Custom Workout - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      startTime: Date.now(),
      exercises: [],
      notes: ''
    };
    setActiveSession(newSession);
    setMainTab('workout');
    setWorkoutSubTab('active');
  };

  // Launch session from template
  const handleStartWorkoutFromTemplate = (template: WorkoutTemplate) => {
    const activeExercises = template.exercises.map(ex => ({
      ...ex,
      id: `we-active-${generateId()}`,
      sets: ex.sets.map(s => ({
        ...s,
        id: `s-active-${generateId()}`,
        completed: true // Auto log enabled
      }))
    }));

    const newSession: ActiveSession = {
      name: template.name,
      templateId: template.id,
      startTime: Date.now(),
      exercises: activeExercises,
      notes: template.description || ''
    };

    setActiveSession(newSession);
    setMainTab('workout');
    setWorkoutSubTab('active');
  };

  // Complete active session and log to Firestore + local state
  const handleFinishWorkout = (notes: string, name: string) => {
    if (!activeSession) return;

    // Collect all exercises and sets
    const finalExercises = activeSession.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.filter(s => s.weight > 0 || s.reps > 0)
    })).filter(ex => ex.sets.length > 0);

    const completed: CompletedWorkout = {
      id: `cw-${generateId()}`,
      ...(activeSession.templateId ? { templateId: activeSession.templateId } : {}),
      name: name || activeSession.name,
      startTime: activeSession.startTime,
      endTime: Date.now(),
      exercises: finalExercises.length > 0 ? finalExercises : activeSession.exercises,
      notes: notes || activeSession.notes || '',
      totalVolume: calculateWorkoutVolume(finalExercises.length > 0 ? finalExercises : activeSession.exercises)
    };

    // Save to Firestore Database
    saveWorkoutToCloud(completed);

    // Update local state
    setCompletedWorkouts(prev => {
      const updated = [completed, ...prev];
      localStorage.setItem('completed_workouts', JSON.stringify(updated));
      return updated;
    });
    setActiveSession(null);
    setWorkoutSubTab('history');
  };

  // Discard active workout
  const handleCancelWorkout = () => {
    setActiveSession(null);
    setWorkoutSubTab('routines');
  };

  // Update active logging session
  const handleUpdateActiveSession = (updatedSession: ActiveSession) => {
    setActiveSession(updatedSession);
  };

  // Delete Workout Log
  const handleDeleteWorkout = (id: string) => {
    deleteWorkoutFromCloud(id);
    setCompletedWorkouts(prev => {
      const updated = prev.filter(w => w.id !== id);
      localStorage.setItem('completed_workouts', JSON.stringify(updated));
      return updated;
    });
  };

  // Update Workout Log
  const handleUpdateWorkout = (updatedWorkout: CompletedWorkout) => {
    saveWorkoutToCloud(updatedWorkout);
    setCompletedWorkouts(prev => {
      const updated = prev.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
      localStorage.setItem('completed_workouts', JSON.stringify(updated));
      return updated;
    });
  };

  // Templates CRUD
  const handleAddTemplate = (newTemplate: WorkoutTemplate) => {
    saveTemplateToCloud(newTemplate);
    setTemplates(prev => {
      const updated = [newTemplate, ...prev];
      localStorage.setItem('workout_templates', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateTemplate = (updatedTemplate: WorkoutTemplate) => {
    saveTemplateToCloud(updatedTemplate);
    setTemplates(prev => {
      const updated = prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
      localStorage.setItem('workout_templates', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplateFromCloud(id);
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('workout_templates', JSON.stringify(updated));
      return updated;
    });
  };

  // Exercises CRUD
  const handleAddExercise = (newEx: Exercise) => {
    saveExerciseToCloud(newEx);
    setExercises(prev => [...prev, newEx]);
  };

  const handleDeleteExercise = (id: string) => {
    deleteExerciseFromCloud(id);
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  // --- Handlers & Operations (Pocket Breath Coach) ---

  // Save Calibrated Breath Pattern
  const handleSaveBreathPattern = (updatedPattern: BreathPattern) => {
    saveCalibratedBreathPattern(updatedPattern, currentUser?.uid);
    setBreathPatterns((prev) =>
      prev.map((p) => (p.id === updatedPattern.id ? updatedPattern : p))
    );
  };

  // Reset Calibrated Breath Pattern to Scientific Defaults
  const handleResetBreathPattern = (patternId: string) => {
    resetCalibratedBreathPattern(patternId, currentUser?.uid);
    const original = SCIENTIFIC_BREATH_PROTOCOLS.find((p) => p.id === patternId);
    if (original) {
      setBreathPatterns((prev) =>
        prev.map((p) => (p.id === patternId ? { ...original } : p))
      );
    }
  };

  // Save Completed Breathwork Session
  const handleSaveBreathSession = (newSession: BreathworkSession) => {
    saveCompletedBreathworkSession(newSession, currentUser?.uid);
    setBreathSessions((prev) => [newSession, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0F1113] text-[#E0E0E0] flex flex-col md:flex-row antialiased select-none font-sans">
      {/* ============================================================== */}
      {/* 1. Sidebar Navigation (Desktop)                                 */}
      {/* ============================================================== */}
      <aside className="hidden md:flex flex-col w-64 bg-[#15171A] border-r border-[#2C2E33] shrink-0 sticky top-0 h-screen p-6 justify-between z-30">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#CCFF00] text-black font-black rounded-xl flex items-center justify-center shadow-lg shadow-[#CCFF00]/25 shrink-0">
              {mainTab === 'workout' ? (
                <Dumbbell className="w-5 h-5 text-black" />
              ) : (
                <Waves className="w-5 h-5 text-black" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide uppercase">
                {mainTab === 'workout' ? 'Gym Logger' : 'Breath Coach'}
              </h2>
              <span className="text-[10px] text-[#CCFF00] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse"></span>
                LIVE FIREBASE
              </span>
            </div>
          </div>

          {/* Primary Top-Level Navigation Tabs */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9299] block mb-2 px-1">
              Main Modules
            </span>
            <nav className="space-y-1.5">
              {/* Top-Level 1: Workout Tab */}
              <button
                type="button"
                id="main-workout-tab"
                onClick={() => setMainTab('workout')}
                className={`w-full flex items-center justify-between px-3.5 py-3 text-sm font-bold transition duration-150 cursor-pointer rounded-xl ${
                  mainTab === 'workout'
                    ? 'bg-[#CCFF00] text-black shadow-md'
                    : 'text-[#8E9299] hover:text-white hover:bg-[#1C1E22]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Dumbbell className="w-4.5 h-4.5" />
                  Workout
                </span>
                {activeSession && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                )}
              </button>

              {/* Nested Sub-buttons under Workout when active in Sidebar */}
              {mainTab === 'workout' && (
                <div className="pl-3 py-1 space-y-1 border-l-2 border-[#2C2E33] ml-4 my-1">
                  <button
                    type="button"
                    onClick={() => setWorkoutSubTab('routines')}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      workoutSubTab === 'routines'
                        ? 'bg-[#CCFF00]/15 text-[#CCFF00] font-bold'
                        : 'text-[#8E9299] hover:text-white hover:bg-[#1A1C20]'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    Routines & Programs
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkoutSubTab('history')}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      workoutSubTab === 'history'
                        ? 'bg-[#CCFF00]/15 text-[#CCFF00] font-bold'
                        : 'text-[#8E9299] hover:text-white hover:bg-[#1A1C20]'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    Workout Log History
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkoutSubTab('exercises')}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      workoutSubTab === 'exercises'
                        ? 'bg-[#CCFF00]/15 text-[#CCFF00] font-bold'
                        : 'text-[#8E9299] hover:text-white hover:bg-[#1A1C20]'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    Exercise Database
                  </button>
                  {activeSession && (
                    <button
                      type="button"
                      onClick={() => setWorkoutSubTab('active')}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                        workoutSubTab === 'active'
                          ? 'bg-red-500/20 text-red-400 font-bold border border-red-500/30'
                          : 'text-amber-400 hover:bg-[#1A1C20]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 animate-pulse text-red-400" />
                        Active Session
                      </span>
                      <span className="text-[9px] bg-red-500/20 px-1.5 py-0.5 rounded text-red-400 font-mono">
                        LIVE
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Top-Level 2: Dedicated Breathing Tab */}
              <button
                type="button"
                id="main-breathing-tab"
                onClick={() => setMainTab('breathing')}
                className={`w-full flex items-center justify-between px-3.5 py-3 text-sm font-bold transition duration-150 cursor-pointer rounded-xl ${
                  mainTab === 'breathing'
                    ? 'bg-[#CCFF00] text-black shadow-md'
                    : 'text-[#8E9299] hover:text-white hover:bg-[#1C1E22]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Waves className="w-4.5 h-4.5" />
                  Breathing
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Database & User Status Footer Badge */}
        <div className="space-y-2 pt-4 border-t border-[#2C2E33]">
          {/* User Sign In / Profile */}
          <div className="bg-[#0F1113] border border-[#2C2E33] p-2.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#1F2228] border border-[#2C2E33] flex items-center justify-center text-[#CCFF00] shrink-0">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate">
                  {currentUser ? currentUser.displayName || currentUser.email : 'matt.lowinger@gmail.com'}
                </p>
                <p className="text-[9px] text-[#8E9299] truncate font-mono">
                  {currentUser ? 'Google Connected' : 'Auto-Sync Active'}
                </p>
              </div>
            </div>

            {currentUser ? (
              <button
                type="button"
                onClick={() => signOutUser()}
                title="Sign out"
                className="p-1.5 text-[#8E9299] hover:text-white rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signInWithGooglePopup()}
                title="Sign in with Google"
                className="p-1.5 text-[#8E9299] hover:text-[#CCFF00] rounded-lg transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="bg-[#0F1113] border border-[#2C2E33] p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse" />
              <span className="text-xs font-bold text-slate-300">Cloud Sync Connected</span>
            </div>
            <span className="bg-[#CCFF00]/10 text-[#CCFF00] text-[10px] font-bold px-2 py-0.5 rounded font-mono">
              {unit.toUpperCase()}
            </span>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. Top Header (Mobile)                                          */}
      {/* ============================================================== */}
      <header className="md:hidden bg-[#15171A] border-b border-[#2C2E33] px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 bg-[#CCFF00] text-black rounded-lg flex items-center justify-center font-black shadow shadow-[#CCFF00]/20">
            {mainTab === 'workout' ? (
              <Dumbbell className="w-4.5 h-4.5 text-black" />
            ) : (
              <Waves className="w-4.5 h-4.5 text-black" />
            )}
          </div>
          <div>
            <span className="text-xs font-black text-white tracking-wide uppercase">
              {mainTab === 'workout' ? 'Gym Logger' : 'Pocket Breath Coach'}
            </span>
            {activeSession && mainTab === 'workout' && (
              <span className="text-[10px] text-[#CCFF00] block font-mono font-bold">SESSION ACTIVE</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-[#0F1113] border border-[#2C2E33] rounded-lg text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#0F1113]/95 backdrop-blur-md pt-20 px-6 space-y-6 flex flex-col justify-between pb-8">
          <nav className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8E9299]">Modules</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMainTab('workout');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm ${
                  mainTab === 'workout' ? 'bg-[#CCFF00] text-black' : 'bg-[#1C1E22] text-white'
                }`}
              >
                <Dumbbell className="w-4 h-4" />
                Workout
              </button>
              <button
                type="button"
                onClick={() => {
                  setMainTab('breathing');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm ${
                  mainTab === 'breathing' ? 'bg-[#CCFF00] text-black' : 'bg-[#1C1E22] text-white'
                }`}
              >
                <Waves className="w-4 h-4" />
                Breathing
              </button>
            </div>

            {mainTab === 'workout' && (
              <div className="pt-4 border-t border-[#2C2E33] space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8E9299]">Workout Views</span>
                {[
                  { id: 'routines', label: 'Routines & Programs', icon: Layout },
                  { id: 'history', label: 'Workout Log History', icon: History },
                  { id: 'exercises', label: 'Exercise Database', icon: Database },
                  { id: 'active', label: 'Active Session', icon: Flame }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = workoutSubTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setWorkoutSubTab(item.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition ${
                        isActive
                          ? 'bg-[#CCFF00] text-black shadow-lg'
                          : 'text-slate-300 hover:bg-[#1C1E22]'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4.5 h-4.5" />
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>

          <div className="bg-[#15171A] border border-[#2C2E33] p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
              <p className="text-xs font-bold text-white">Live Cloud Database Sync</p>
            </div>
            <span className="bg-[#CCFF00]/10 text-[#CCFF00] text-xs font-bold px-2 py-1 rounded font-mono">
              LBS
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. Main Workspace                                               */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Floating Active Workout Banner (when a workout is active but user is browsing) */}
        {activeSession && (mainTab !== 'workout' || workoutSubTab !== 'active') && (
          <div className="bg-[#1C1E22] border-b border-[#2C2E33] px-4 py-3 flex items-center justify-between gap-4 sticky top-0 md:relative z-20 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-[#CCFF00]/10 rounded-lg text-[#CCFF00] shrink-0">
                <Flame className="w-5 h-5 text-[#CCFF00] animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  Active Workout: <span className="text-[#CCFF00] font-black">"{activeSession.name}"</span>
                </p>
                <p className="text-[10px] text-[#8E9299]">
                  {activeSession.exercises.length} exercises logged
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMainTab('workout');
                setWorkoutSubTab('active');
              }}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black font-black text-xs rounded-lg transition duration-150 cursor-pointer shrink-0 shadow-sm"
            >
              Resume
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Panels */}
        <div className="flex-1 p-3 sm:p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {/* ========================================================== */}
          {/* MODULE A: WORKOUT (with the 3 required sub-buttons)       */}
          {/* ========================================================== */}
          {mainTab === 'workout' && (
            <div className="space-y-6">
              {/* Sub-buttons Bar: Routines & Programs | Workout Log History | Exercise Database (+ Active Session) */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#2C2E33]">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    id="sub-routines-btn"
                    onClick={() => setWorkoutSubTab('routines')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      workoutSubTab === 'routines'
                        ? 'bg-[#CCFF00] text-black shadow-md'
                        : 'bg-[#15171A] text-[#8E9299] hover:text-white border border-[#2C2E33]'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    Routines & Programs
                  </button>

                  <button
                    type="button"
                    id="sub-history-btn"
                    onClick={() => setWorkoutSubTab('history')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      workoutSubTab === 'history'
                        ? 'bg-[#CCFF00] text-black shadow-md'
                        : 'bg-[#15171A] text-[#8E9299] hover:text-white border border-[#2C2E33]'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    Workout Log History
                  </button>

                  <button
                    type="button"
                    id="sub-exercises-btn"
                    onClick={() => setWorkoutSubTab('exercises')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      workoutSubTab === 'exercises'
                        ? 'bg-[#CCFF00] text-black shadow-md'
                        : 'bg-[#15171A] text-[#8E9299] hover:text-white border border-[#2C2E33]'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    Exercise Database
                  </button>

                  {/* Active Workout Tab / Indicator */}
                  {activeSession && (
                    <button
                      type="button"
                      id="sub-active-btn"
                      onClick={() => setWorkoutSubTab('active')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        workoutSubTab === 'active'
                          ? 'bg-red-500 text-white shadow-md'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 animate-pulse" />
                      Active Session
                    </button>
                  )}
                </div>

                {/* Cloud Sync Manual Trigger */}
                <button
                  type="button"
                  onClick={handleRefreshCloudData}
                  disabled={cloudSyncInfo.isSyncing}
                  className="px-3 py-1.5 bg-[#15171A] hover:bg-[#1E2025] border border-[#2C2E33] text-xs font-medium text-[#8E9299] hover:text-white rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncInfo.isSyncing ? 'animate-spin text-[#CCFF00]' : ''}`} />
                  <span>{cloudSyncInfo.isSyncing ? 'Syncing...' : 'Sync Live Firebase'}</span>
                </button>
              </div>

              {/* Sub-view 1: Routines & Programs */}
              {workoutSubTab === 'routines' && (
                <TemplatesPanel
                  templates={templates}
                  exercises={exercises}
                  onAddTemplate={handleAddTemplate}
                  onUpdateTemplate={handleUpdateTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                  onStartWorkout={handleStartWorkoutFromTemplate}
                  unit={unit}
                  onAddExercise={handleAddExercise}
                />
              )}

              {/* Sub-view 2: Workout Log History */}
              {workoutSubTab === 'history' && (
                <HistoryPanel
                  completedWorkouts={completedWorkouts}
                  exercises={exercises}
                  onDeleteWorkout={handleDeleteWorkout}
                  onUpdateWorkout={handleUpdateWorkout}
                />
              )}

              {/* Sub-view 3: Exercise Database */}
              {workoutSubTab === 'exercises' && (
                <ExerciseRegistryPanel
                  exercises={exercises}
                  onAddExercise={handleAddExercise}
                  onDeleteExercise={handleDeleteExercise}
                />
              )}

              {/* Sub-view 4: Active Workout Session */}
              {workoutSubTab === 'active' && (
                <ActiveWorkoutPanel
                  activeSession={activeSession}
                  exercises={exercises}
                  completedWorkouts={completedWorkouts}
                  templates={templates}
                  allActiveSessions={allActiveSessions}
                  onStartEmptyWorkout={handleStartEmptyWorkout}
                  onStartWorkoutFromTemplate={handleStartWorkoutFromTemplate}
                  onSelectActiveSession={(sess) => {
                    setActiveSession(sess);
                    setWorkoutSubTab('active');
                  }}
                  onFinishWorkout={handleFinishWorkout}
                  onCancelWorkout={handleCancelWorkout}
                  onUpdateActiveSession={handleUpdateActiveSession}
                  onAddExercise={handleAddExercise}
                  onRefreshCloudData={handleRefreshCloudData}
                  cloudSyncInfo={cloudSyncInfo}
                />
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* MODULE B: POCKET BREATH COACH (DEDICATED TOP-LEVEL TAB)   */}
          {/* ========================================================== */}
          {mainTab === 'breathing' && (
            <BreathCoachPanel
              patterns={breathPatterns}
              sessions={breathSessions}
              onSavePattern={handleSaveBreathPattern}
              onResetPattern={handleResetBreathPattern}
              onSaveSession={handleSaveBreathSession}
              cloudSyncStatus={
                currentUser ? `Synced as ${currentUser.email}` : 'Synced with Firebase Cloud'
              }
              onManualSync={handleRefreshCloudData}
            />
          )}
        </div>
      </main>

      {/* ============================================================== */}
      {/* 4. Bottom Mobile Tab Navigation (Workout & Breathing)           */}
      {/* ============================================================== */}
      <footer className="md:hidden sticky bottom-0 bg-[#15171A] border-t border-[#2C2E33] grid grid-cols-2 py-2.5 px-4 z-40 text-xs font-bold text-[#8E9299] shrink-0">
        <button
          type="button"
          onClick={() => setMainTab('workout')}
          className={`flex flex-col items-center gap-1 py-1 transition cursor-pointer ${
            mainTab === 'workout' ? 'text-[#CCFF00]' : 'hover:text-white'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span>Workout</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('breathing')}
          className={`flex flex-col items-center gap-1 py-1 transition cursor-pointer ${
            mainTab === 'breathing' ? 'text-[#CCFF00]' : 'hover:text-white'
          }`}
        >
          <Waves className="w-5 h-5" />
          <span>Breathing</span>
        </button>
      </footer>
    </div>
  );
}
