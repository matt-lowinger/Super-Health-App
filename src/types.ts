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
