import { useState, useEffect } from 'react';
import { CompletedWorkout, WorkoutTemplate, Exercise, ActiveSession } from './types';
import {
  INITIAL_EXERCISES,
  INITIAL_TEMPLATES,
  INITIAL_COMPLETED,
  calculateWorkoutVolume,
  generateId
} from './utils';
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
  saveActiveSessionToCloud
} from './firebase';
import { fetchExternalExercises } from './api';

// Panels
import HistoryPanel from './components/HistoryPanel';
import TemplatesPanel from './components/TemplatesPanel';
import ActiveWorkoutPanel from './components/ActiveWorkoutPanel';
import ExerciseRegistryPanel from './components/ExerciseRegistryPanel';

// Icons
import {
  Dumbbell,
  History,
  Layout,
  Flame,
  ChevronRight,
  Menu,
  X
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

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'templates' | 'active'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hardcoded unit as requested
  const unit = 'lbs';

  // --- Real-Time Firestore Synchronization ---
  useEffect(() => {
    // 1. Subscribe to completed workouts in Cloud Firestore
    const unsubWorkouts = subscribeWorkouts((cloudWorkouts) => {
      if (cloudWorkouts && cloudWorkouts.length > 0) {
        setCompletedWorkouts(cloudWorkouts);
        localStorage.setItem('completed_workouts', JSON.stringify(cloudWorkouts));
      } else {
        // Seed initial workouts if empty
        INITIAL_COMPLETED.forEach(cw => {
          saveWorkoutToCloud(cw);
        });
        setCompletedWorkouts(INITIAL_COMPLETED);
        localStorage.setItem('completed_workouts', JSON.stringify(INITIAL_COMPLETED));
      }
    });

    // 2. Subscribe to workout templates in Cloud Firestore
    const unsubTemplates = subscribeTemplates((cloudTemplates) => {
      if (cloudTemplates && cloudTemplates.length > 0) {
        setTemplates(cloudTemplates);
        localStorage.setItem('workout_templates', JSON.stringify(cloudTemplates));
      } else {
        // Seed initial routines if empty
        INITIAL_TEMPLATES.forEach(t => saveTemplateToCloud(t));
        setTemplates(INITIAL_TEMPLATES);
        localStorage.setItem('workout_templates', JSON.stringify(INITIAL_TEMPLATES));
      }
    });

    // 3. Subscribe to exercise library in Cloud Firestore & seed 800+ exercises
    const unsubExercises = subscribeExercises((cloudExercises) => {
      fetchExternalExercises().then(extList => {
        const mergedMap = new Map<string, Exercise>();
        // Add external exercises
        extList.forEach(ex => mergedMap.set(ex.id, ex));
        // Add or override with cloud/custom exercises
        if (cloudExercises && cloudExercises.length > 0) {
          cloudExercises.forEach(ex => mergedMap.set(ex.id, ex));
        } else {
          INITIAL_EXERCISES.forEach(ex => mergedMap.set(ex.id, ex));
        }
        const fullList = Array.from(mergedMap.values());
        setExercises(fullList);
        localStorage.setItem('workout_exercises', JSON.stringify(fullList));

        // Seed ALL 800+ exercises directly into Firestore collection if Firestore is missing them
        if (!cloudExercises || cloudExercises.length < 500) {
          seedAllExercisesToCloud(fullList);
        }
      });
    });

    // 4. Subscribe to active workout session in Cloud Firestore
    const unsubActiveSession = subscribeActiveSession((cloudSession) => {
      if (cloudSession) {
        setActiveSession(cloudSession);
      }
    });

    return () => {
      unsubWorkouts();
      unsubTemplates();
      unsubExercises();
      unsubActiveSession();
    };
  }, []);

  // Sync active workout session to local storage & Firestore for resilience
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('active_workout_session', JSON.stringify(activeSession));
      saveActiveSessionToCloud(activeSession);
    } else {
      localStorage.removeItem('active_workout_session');
      saveActiveSessionToCloud(null);
    }
  }, [activeSession]);

  // --- Handlers & Operations ---

  // Start empty custom session
  const handleStartEmptyWorkout = () => {
    const newSession: ActiveSession = {
      name: `Custom Workout - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      startTime: Date.now(),
      exercises: [],
      notes: ''
    };
    setActiveSession(newSession);
    setCurrentTab('active');
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
    setCurrentTab('active');
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
    setCurrentTab('dashboard');
  };

  // Discard active workout
  const handleCancelWorkout = () => {
    setActiveSession(null);
    setCurrentTab('dashboard');
  };

  // Update active logging session
  const handleUpdateActiveSession = (updatedSession: ActiveSession) => {
    setActiveSession(updatedSession);
  };

  // --- Delete Workout Log ---
  const handleDeleteWorkout = (id: string) => {
    deleteWorkoutFromCloud(id);
    setCompletedWorkouts(prev => {
      const updated = prev.filter(w => w.id !== id);
      localStorage.setItem('completed_workouts', JSON.stringify(updated));
      return updated;
    });
  };

  // --- Update Workout Log ---
  const handleUpdateWorkout = (updatedWorkout: CompletedWorkout) => {
    saveWorkoutToCloud(updatedWorkout);
    setCompletedWorkouts(prev => {
      const updated = prev.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
      localStorage.setItem('completed_workouts', JSON.stringify(updated));
      return updated;
    });
  };

  // --- Templates CRUD ---
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

  // --- Exercises CRUD ---
  const handleAddExercise = (newEx: Exercise) => {
    saveExerciseToCloud(newEx);
    setExercises(prev => [...prev, newEx]);
  };

  const handleDeleteExercise = (id: string) => {
    deleteExerciseFromCloud(id);
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0F1113] text-[#E0E0E0] flex flex-col md:flex-row antialiased select-none font-sans">
      {/* 1. Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#15171A] border-r border-[#2C2E33] shrink-0 sticky top-0 h-screen p-6 justify-between">
        <div className="space-y-8">
          {/* Brand header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#CCFF00] text-black font-black rounded-xl flex items-center justify-center shadow-lg shadow-[#CCFF00]/25">
              <Dumbbell className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide uppercase">Gym Logger</h2>
              <span className="text-[10px] text-[#CCFF00] font-mono">LIVE DATABASE</span>
            </div>
          </div>

          {/* Navigation Links (No welcome message, no settings) */}
          <nav className="space-y-1.5">
            <button
              type="button"
              onClick={() => setCurrentTab('dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-bold transition duration-150 cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-l-2 border-[#CCFF00] font-black rounded-r-xl rounded-l-none'
                  : 'text-[#8E9299] hover:text-white hover:bg-[#1C1E22] rounded-xl'
              }`}
            >
              <History className="w-4.5 h-4.5" />
              History Log
            </button>

            <button
              type="button"
              id="templates-tab-btn"
              data-tab="templates"
              onClick={() => setCurrentTab('templates')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-bold transition duration-150 cursor-pointer ${
                currentTab === 'templates'
                  ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-l-2 border-[#CCFF00] font-black rounded-r-xl rounded-l-none'
                  : 'text-[#8E9299] hover:text-white hover:bg-[#1C1E22] rounded-xl'
              }`}
            >
              <Layout className="w-4.5 h-4.5" />
              Routines
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('active')}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition duration-150 relative cursor-pointer ${
                currentTab === 'active'
                  ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-l-2 border-[#CCFF00] font-black rounded-r-xl rounded-l-none'
                  : 'text-[#8E9299] hover:text-white hover:bg-[#1C1E22] rounded-xl'
              }`}
            >
              <span className="flex items-center gap-3.5">
                <Dumbbell className="w-4.5 h-4.5" />
                Active Session
              </span>
            </button>

          </nav>
        </div>

        {/* Database Status footer badge */}
        <div className="bg-[#0F1113] border border-[#2C2E33] p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse" />
            <span className="text-xs font-bold text-slate-300">Cloud Sync Connected</span>
          </div>
          <span className="bg-[#CCFF00]/10 text-[#CCFF00] text-[10px] font-bold px-2 py-0.5 rounded font-mono">
            {unit.toUpperCase()}
          </span>
        </div>
      </aside>

      {/* 2. Top Header (Mobile) */}
      <header className="md:hidden bg-[#15171A] border-b border-[#2C2E33] px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 bg-[#CCFF00] text-black rounded-lg flex items-center justify-center font-black shadow shadow-[#CCFF00]/20">
            <Dumbbell className="w-4.5 h-4.5 text-black" />
          </div>
          <div>
            <span className="text-xs font-black text-white tracking-wide uppercase">Gym Logger</span>
            {activeSession && (
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
        <div className="md:hidden fixed inset-0 z-30 bg-[#0F1113]/95 backdrop-blur-md pt-20 px-6 space-y-6 flex flex-col justify-between pb-8">
          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'History Log', icon: History },
              { id: 'templates', label: 'Routines', icon: Layout },
              { id: 'active', label: 'Active Session', icon: Dumbbell }
            ].map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCurrentTab(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-xl text-base font-bold transition ${
                    isActive ? 'bg-[#CCFF00] text-black shadow-lg shadow-[#CCFF00]/10' : 'text-slate-300 hover:bg-[#1C1E22]'
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </span>
                </button>
              );
            })}
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

      {/* 3. Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Floating Active Session Banner */}
        {activeSession && currentTab !== 'active' && (
          <div className="bg-[#1C1E22] border-b border-[#2C2E33] px-4 py-3 flex items-center justify-between gap-4 sticky top-0 md:relative z-20 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-[#CCFF00]/10 rounded-lg text-[#CCFF00] shrink-0">
                <Flame className="w-5 h-5 text-[#CCFF00] animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  Active Session: <span className="text-[#CCFF00] font-black">"{activeSession.name}"</span>
                </p>
                <p className="text-[10px] text-[#8E9299]">
                  {activeSession.exercises.length} exercises logged
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentTab('active')}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-[#CCFF00] hover:bg-[#CCFF00]/90 text-black font-black text-xs rounded-lg transition duration-150 cursor-pointer shrink-0 shadow-sm"
            >
              Resume
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Panels */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <HistoryPanel
              completedWorkouts={completedWorkouts}
              exercises={exercises}
              onDeleteWorkout={handleDeleteWorkout}
              onUpdateWorkout={handleUpdateWorkout}
            />
          )}

          {currentTab === 'templates' && (
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

          {currentTab === 'active' && (
            <ActiveWorkoutPanel
              activeSession={activeSession}
              exercises={exercises}
              completedWorkouts={completedWorkouts}
              onStartEmptyWorkout={handleStartEmptyWorkout}
              onFinishWorkout={handleFinishWorkout}
              onCancelWorkout={handleCancelWorkout}
              onUpdateActiveSession={handleUpdateActiveSession}
              onAddExercise={handleAddExercise}
            />
          )}
        </div>
      </main>

      {/* 4. Bottom Mobile Tab Navigation (3 tabs: History, Routines, Active) */}
      <footer className="md:hidden sticky bottom-0 bg-[#15171A] border-t border-[#2C2E33] grid grid-cols-3 py-2.5 px-1 z-40 text-[10px] font-bold text-[#8E9299] shrink-0">
        <button
          type="button"
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 transition cursor-pointer ${currentTab === 'dashboard' ? 'text-[#CCFF00]' : 'hover:text-white'}`}
        >
          <History className="w-5 h-5" />
          <span>History</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('templates')}
          className={`flex flex-col items-center gap-1 py-1 transition cursor-pointer ${currentTab === 'templates' ? 'text-[#CCFF00]' : 'hover:text-white'}`}
        >
          <Layout className="w-5 h-5" />
          <span>Routines</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('active')}
          className={`flex flex-col items-center gap-1 py-1 transition relative cursor-pointer ${currentTab === 'active' ? 'text-[#CCFF00]' : 'hover:text-white'}`}
        >
          <div className="relative">
            <Dumbbell className="w-5 h-5" />
          </div>
          <span>Active</span>
        </button>
      </footer>
    </div>
  );
}
