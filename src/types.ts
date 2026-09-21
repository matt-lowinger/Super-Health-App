export interface Exercise {
  id: string;
  name: string;
  category: string; // e.g., Chest, Back, Legs, Shoulders, Arms, Core, Cardio
  force?: 'push' | 'pull' | 'static' | string | null;
  level?: 'beginner' | 'intermediate' | 'expert' | string | null;
  mechanic?: 'compound' | 'isolation' | string | null;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  weight: number; // in lbs or kgs
  reps: number;
  completed: boolean;
  isWarmup?: boolean;
  isBodyweight?: boolean;
}

export interface WorkoutExercise {
  id: string; // unique instance ID in active session
  exerciseId: string;
  name: string;
  category: string;
  sets: WorkoutSet[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  createdAt: number;
}

export interface CompletedWorkout {
  id: string;
  templateId?: string;
  name: string;
  startTime: number;
  endTime: number;
  exercises: WorkoutExercise[];
  notes?: string;
  totalVolume: number; // pre-calculated for history
}

export interface ActiveSession {
  id?: string;
  name: string;
  templateId?: string;
  startTime: number;
  exercises: WorkoutExercise[];
  notes?: string;
}

export interface UserSettings {
  apiKey: string;
  apiEndpoint: string;
  unit: 'lbs' | 'kg';
  userName: string;
}

export interface HistoricalBest {
  bestWeight: number;
  bestReps: number;
  lastDate?: string;
  lastWeight?: number;
  lastReps?: number;
  history: { date: string; weight: number; reps: number; oneRepMax: number }[];
}

// ==========================================
// Pocket Breath Coach Types
// ==========================================

export type BreathPhase = 'inhale' | 'inhaleHold' | 'exhale' | 'exhaleHold';

export type ScientificProtocolId =
  | 'box-breathing'
  | 'parasympathetic-switch-4-7-8'
  | 'coherent-resonance'
  | 'physiological-sigh'
  | 'vagus-nerve-pacing'
  | 'panic-reset-7-11'
  | 'awake-energize'
  | 'buteyko-reduced';

export interface BreathPattern {
  id: string;
  patternId: ScientificProtocolId;
  name: string;
  subtitle: string;
  scientificSource: string;
  clinicalMechanism: string;
  targetEffect: string;
  category: 'stress' | 'sleep' | 'hrv' | 'recovery' | 'energy' | 'endurance';
  inhale: number;
  inhaleHold: number;
  exhale: number;
  exhaleHold: number;
  defaultInhale: number;
  defaultInhaleHold: number;
  defaultExhale: number;
  defaultExhaleHold: number;
  updatedAt?: string;
  userId?: string;
}

export type VisualMode = 'wave';

export type DynamicBackgroundScene =
  | 'lake-tahoe'
  | 'aurora-borealis'
  | 'twilight-sunset'
  | 'forest-mist'
  | 'minimal-zen';

export type AmbientSoundscape = 'none' | 'ocean-waves' | 'forest-rain' | 'tibetan-bowls' | 'brown-noise';

export type PostSessionFeeling = 'calm' | 'focused' | 'energized' | 'sleepy';

export interface BreathworkSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // Clock time
  timestamp: number;
  patternId: string;
  patternName: string;
  durationMinutes: number;
  durationSeconds: number;
  cyclesCompleted: number;
  feelingAfter?: PostSessionFeeling;
  backgroundScene: DynamicBackgroundScene;
  userId?: string;
  notes?: string;
}

export interface BreathActivityLog {
  id: string;
  eventType: 'session_start' | 'session_complete' | 'pattern_calibrated' | 'pattern_reset';
  patternId: string;
  timestamp: string;
  userId?: string;
  details?: Record<string, unknown>;
}

