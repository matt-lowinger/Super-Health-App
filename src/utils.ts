import { Exercise, WorkoutTemplate, CompletedWorkout, UserSettings, HistoricalBest } from './types';

export const INITIAL_EXERCISES: Exercise[] = [
  // Chest
  { id: 'ex-1', name: 'Bench Press (Barbell)', category: 'Chest' },
  { id: 'ex-2', name: 'Incline Dumbbell Press', category: 'Chest' },
  { id: 'ex-3', name: 'Cable Chest Fly', category: 'Chest' },
  { id: 'ex-4', name: 'Pushups', category: 'Chest' },
  
  // Back
  { id: 'ex-5', name: 'Deadlift (Barbell)', category: 'Back' },
  { id: 'ex-6', name: 'Pullups', category: 'Back' },
  { id: 'ex-7', name: 'Lat Pulldown', category: 'Back' },
  { id: 'ex-8', name: 'Barbell Row', category: 'Back' },
  
  // Legs
  { id: 'ex-9', name: 'Barbell Back Squat', category: 'Legs' },
  { id: 'ex-10', name: 'Leg Press', category: 'Legs' },
  { id: 'ex-11', name: 'Romanian Deadlift (Barbell)', category: 'Legs' },
  { id: 'ex-12', name: 'Seated Calf Raise', category: 'Legs' },
  
  // Shoulders
  { id: 'ex-13', name: 'Overhead Press (Barbell)', category: 'Shoulders' },
  { id: 'ex-14', name: 'Dumbbell Lateral Raise', category: 'Shoulders' },
  { id: 'ex-15', name: 'Face Pulls', category: 'Shoulders' },
  
  // Arms
  { id: 'ex-16', name: 'Bicep Curl (Dumbbell)', category: 'Arms' },
  { id: 'ex-17', name: 'Hammer Curl (Dumbbell)', category: 'Arms' },
  { id: 'ex-18', name: 'Tricep Pushdown (Cable)', category: 'Arms' },
  { id: 'ex-19', name: 'Overhead Tricep Extension', category: 'Arms' },

  // Core & Cardio
  { id: 'ex-20', name: 'Plank', category: 'Core' },
  { id: 'ex-21', name: 'Hanging Leg Raise', category: 'Core' },
  { id: 'ex-22', name: 'Treadmill Run', category: 'Cardio' }
];

export const INITIAL_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'temp-push',
    name: 'Push Day',
    description: 'Chest, Shoulders & Triceps focus',
    createdAt: Date.now() - 86400000 * 10,
    exercises: [
      {
        id: 'we-push-1',
        exerciseId: 'ex-1',
        name: 'Bench Press (Barbell)',
        category: 'Chest',
        sets: [
          { id: 's1', weight: 135, reps: 10, completed: false },
          { id: 's2', weight: 135, reps: 8, completed: false },
          { id: 's3', weight: 145, reps: 6, completed: false }
        ]
      },
      {
        id: 'we-push-2',
        exerciseId: 'ex-13',
        name: 'Overhead Press (Barbell)',
        category: 'Shoulders',
        sets: [
          { id: 's4', weight: 95, reps: 8, completed: false },
          { id: 's5', weight: 95, reps: 8, completed: false }
        ]
      },
      {
        id: 'we-push-3',
        exerciseId: 'ex-18',
        name: 'Tricep Pushdown (Cable)',
        category: 'Arms',
        sets: [
          { id: 's6', weight: 50, reps: 12, completed: false },
          { id: 's7', weight: 60, reps: 10, completed: false }
        ]
      }
    ]
  },
  {
    id: 'temp-pull',
    name: 'Pull Day',
    description: 'Back, Biceps & Rear Delts focus',
    createdAt: Date.now() - 86400000 * 9,
    exercises: [
      {
        id: 'we-pull-1',
        exerciseId: 'ex-7',
        name: 'Lat Pulldown',
        category: 'Back',
        sets: [
          { id: 's8', weight: 120, reps: 10, completed: false },
          { id: 's9', weight: 130, reps: 8, completed: false },
          { id: 's10', weight: 130, reps: 8, completed: false }
        ]
      },
      {
        id: 'we-pull-2',
        exerciseId: 'ex-8',
        name: 'Barbell Row',
        category: 'Back',
        sets: [
          { id: 's11', weight: 115, reps: 10, completed: false },
          { id: 's12', weight: 115, reps: 10, completed: false }
        ]
      },
      {
        id: 'we-pull-3',
        exerciseId: 'ex-16',
        name: 'Bicep Curl (Dumbbell)',
        category: 'Arms',
        sets: [
          { id: 's13', weight: 25, reps: 12, completed: false },
          { id: 's14', weight: 25, reps: 12, completed: false }
        ]
      }
    ]
  },
  {
    id: 'temp-legs',
    name: 'Legs Day',
    description: 'Quads, Hamstrings & Calves powerhouse',
    createdAt: Date.now() - 86400000 * 8,
    exercises: [
      {
        id: 'we-legs-1',
        exerciseId: 'ex-9',
        name: 'Barbell Back Squat',
        category: 'Legs',
        sets: [
          { id: 's15', weight: 185, reps: 8, completed: false },
          { id: 's16', weight: 185, reps: 8, completed: false },
          { id: 's17', weight: 205, reps: 5, completed: false }
        ]
      },
      {
        id: 'we-legs-2',
        exerciseId: 'ex-11',
        name: 'Romanian Deadlift (Barbell)',
        category: 'Legs',
        sets: [
          { id: 's18', weight: 135, reps: 10, completed: false },
          { id: 's19', weight: 135, reps: 10, completed: false }
        ]
      }
    ]
  }
];

export const INITIAL_COMPLETED: CompletedWorkout[] = [
  {
    id: 'cw-legs-1',
    name: 'Legs Day',
    templateId: 'temp-legs',
    startTime: Date.now() - 86400000 * 2 - 3600000,
    endTime: Date.now() - 86400000 * 2,
    exercises: [
      {
        id: 'we-c-l1',
        exerciseId: 'ex-9',
        name: 'Barbell Back Squat',
        category: 'Legs',
        sets: [
          { id: 'cs-l1', weight: 180, reps: 8, completed: true },
          { id: 'cs-l2', weight: 180, reps: 8, completed: true },
          { id: 'cs-l3', weight: 200, reps: 6, completed: true }
        ]
      },
      {
        id: 'we-c-l2',
        exerciseId: 'ex-11',
        name: 'Romanian Deadlift (Barbell)',
        category: 'Legs',
        sets: [
          { id: 'cs-l4', weight: 130, reps: 10, completed: true },
          { id: 'cs-l5', weight: 130, reps: 10, completed: true }
        ]
      }
    ],
    notes: 'Heavy squat day, clean reps.',
    totalVolume: 6680
  },
  {
    id: 'cw-legs-2',
    name: 'Legs Day',
    templateId: 'temp-legs',
    startTime: Date.now() - 86400000 * 7 - 3600000,
    endTime: Date.now() - 86400000 * 7,
    exercises: [
      {
        id: 'we-c-l3',
        exerciseId: 'ex-9',
        name: 'Barbell Back Squat',
        category: 'Legs',
        sets: [
          { id: 'cs-l6', weight: 175, reps: 10, completed: true },
          { id: 'cs-l7', weight: 175, reps: 8, completed: true },
          { id: 'cs-l8', weight: 190, reps: 6, completed: true }
        ]
      },
      {
        id: 'we-c-l4',
        exerciseId: 'ex-11',
        name: 'Romanian Deadlift (Barbell)',
        category: 'Legs',
        sets: [
          { id: 'cs-l9', weight: 125, reps: 12, completed: true },
          { id: 'cs-l10', weight: 125, reps: 10, completed: true }
        ]
      }
    ],
    notes: 'Pushed volume on Romanian Deadlifts.',
    totalVolume: 6040
  },
  {
    id: 'cw-legs-3',
    name: 'Legs Day',
    templateId: 'temp-legs',
    startTime: Date.now() - 86400000 * 14 - 3600000,
    endTime: Date.now() - 86400000 * 14,
    exercises: [
      {
        id: 'we-c-l5',
        exerciseId: 'ex-9',
        name: 'Barbell Back Squat',
        category: 'Legs',
        sets: [
          { id: 'cs-l11', weight: 165, reps: 10, completed: true },
          { id: 'cs-l12', weight: 165, reps: 10, completed: true },
          { id: 'cs-l13', weight: 180, reps: 8, completed: true }
        ]
      },
      {
        id: 'we-c-l6',
        exerciseId: 'ex-11',
        name: 'Romanian Deadlift (Barbell)',
        category: 'Legs',
        sets: [
          { id: 'cs-l14', weight: 115, reps: 12, completed: true },
          { id: 'cs-l15', weight: 115, reps: 12, completed: true }
        ]
      }
    ],
    notes: 'Solid base leg workout.',
    totalVolume: 7500
  },
  {
    id: 'cw-1',
    name: 'Push Day',
    templateId: 'temp-push',
    startTime: Date.now() - 86400000 * 3 - 3600000,
    endTime: Date.now() - 86400000 * 3,
    exercises: [
      {
        id: 'we-c-1',
        exerciseId: 'ex-1',
        name: 'Bench Press (Barbell)',
        category: 'Chest',
        sets: [
          { id: 'cs1', weight: 135, reps: 10, completed: true },
          { id: 'cs2', weight: 145, reps: 8, completed: true },
          { id: 'cs3', weight: 155, reps: 6, completed: true }
        ]
      },
      {
        id: 'we-c-2',
        exerciseId: 'ex-13',
        name: 'Overhead Press (Barbell)',
        category: 'Shoulders',
        sets: [
          { id: 'cs4', weight: 95, reps: 8, completed: true },
          { id: 'cs5', weight: 100, reps: 6, completed: true }
        ]
      }
    ],
    notes: 'Feeling strong, pushed Bench Press PR to 155 lbs for 6 reps!',
    totalVolume: 3265
  },
  {
    id: 'cw-2',
    name: 'Pull Day',
    templateId: 'temp-pull',
    startTime: Date.now() - 86400000 * 1 - 3300000,
    endTime: Date.now() - 86400000 * 1,
    exercises: [
      {
        id: 'we-c-3',
        exerciseId: 'ex-7',
        name: 'Lat Pulldown',
        category: 'Back',
        sets: [
          { id: 'cs6', weight: 120, reps: 10, completed: true },
          { id: 'cs7', weight: 130, reps: 8, completed: true }
        ]
      },
      {
        id: 'we-c-4',
        exerciseId: 'ex-16',
        name: 'Bicep Curl (Dumbbell)',
        category: 'Arms',
        sets: [
          { id: 'cs8', weight: 25, reps: 12, completed: true },
          { id: 'cs9', weight: 30, reps: 10, completed: true }
        ]
      }
    ],
    notes: 'Good squeeze on curls. Strict form.',
    totalVolume: 2840
  }
];

export const INITIAL_SETTINGS: UserSettings = {
  apiKey: '',
  apiEndpoint: 'https://workoutxapp.com/dashboard.html',
  unit: 'lbs',
  userName: 'Athlete'
};

// Calculate 1RM (One Rep Max) using Epley Formula
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Format duration in seconds to HH:MM:SS or MM:SS
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const hStr = h > 0 ? `${h}:` : '';
  const mStr = `${m.toString().padStart(2, '0')}:`;
  const sStr = s.toString().padStart(2, '0');
  
  return `${hStr}${mStr}${sStr}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function calculateWorkoutVolume(exercises: any[]): number {
  return exercises.reduce((acc, ex) => {
    return acc + ex.sets.reduce((setAcc: number, set: any) => {
      if (set.completed) {
        return setAcc + (set.weight * set.reps);
      }
      return setAcc;
    }, 0);
  }, 0);
}

// Generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getExerciseHistory(exerciseId: string, completedWorkouts: CompletedWorkout[]): HistoricalBest {
  const history: { date: string; weight: number; reps: number; oneRepMax: number }[] = [];
  let bestWeight = 0;
  let bestReps = 0;
  let lastWeight: number | undefined;
  let lastReps: number | undefined;
  let lastDate: string | undefined;

  // Sort workouts chronological to find last and best
  const sortedWorkouts = [...completedWorkouts].sort((a, b) => a.startTime - b.startTime);

  for (const cw of sortedWorkouts) {
    const matchedEx = cw.exercises.find((e) => e.exerciseId === exerciseId);
    if (matchedEx) {
      const dateStr = formatDate(cw.startTime);
      for (const set of matchedEx.sets) {
        if (set.completed) {
          const oneRm = calculate1RM(set.weight, set.reps);
          history.push({
            date: dateStr,
            weight: set.weight,
            reps: set.reps,
            oneRepMax: oneRm,
          });

          if (set.weight > bestWeight) {
            bestWeight = set.weight;
            bestReps = set.reps;
          }
          
          // Latest set completed
          lastWeight = set.weight;
          lastReps = set.reps;
          lastDate = dateStr;
        }
      }
    }
  }

  return {
    bestWeight,
    bestReps,
    lastDate,
    lastWeight,
    lastReps,
    history: history.reverse() // latest first
  };
}

export interface SetHistoryEntry {
  date: string;
  weight: number;
  reps: number;
  startTime: number;
}

export function getLastSetHistoryEntries(
  exerciseId: string,
  setIndex: number,
  completedWorkouts: CompletedWorkout[],
  maxCount: number = 3
): SetHistoryEntry[] {
  if (!completedWorkouts || completedWorkouts.length === 0) return [];

  // Sort completed workouts descending by startTime (most recent first)
  const sorted = [...completedWorkouts].sort((a, b) => b.startTime - a.startTime);
  const entries: SetHistoryEntry[] = [];

  for (const cw of sorted) {
    if (entries.length >= maxCount) break;

    const matchedEx = cw.exercises?.find((e) => e.exerciseId === exerciseId);
    if (matchedEx && matchedEx.sets && matchedEx.sets.length > 0) {
      // Pick set at setIndex if available, or closest available set
      const targetSet = matchedEx.sets[setIndex] || matchedEx.sets[matchedEx.sets.length - 1];
      if (targetSet && (targetSet.weight > 0 || targetSet.reps > 0)) {
        const dateStr = new Date(cw.startTime).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
        entries.push({
          date: dateStr,
          weight: targetSet.weight,
          reps: targetSet.reps,
          startTime: cw.startTime
        });
      }
    }
  }

  return entries;
}


