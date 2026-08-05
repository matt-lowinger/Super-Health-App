import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CompletedWorkout, WorkoutTemplate, Exercise, ActiveSession } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Firestore Collections
const WORKOUTS_COLLECTION = 'completed_workouts';
const TEMPLATES_COLLECTION = 'workout_templates';
const EXERCISES_COLLECTION = 'exercises';
const ACTIVE_SESSIONS_COLLECTION = 'active_sessions';

// Helper to remove undefined properties before sending to Firestore
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// --- Workouts Operations ---
export function subscribeWorkouts(callback: (workouts: CompletedWorkout[]) => void) {
  const q = query(collection(db, WORKOUTS_COLLECTION), orderBy('startTime', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const workouts: CompletedWorkout[] = [];
    snapshot.forEach((doc) => {
      workouts.push(doc.data() as CompletedWorkout);
    });
    callback(workouts);
  }, (error) => {
    console.warn("Firestore workouts sync notice:", error);
  });
}

export async function saveWorkoutToCloud(workout: CompletedWorkout) {
  try {
    await setDoc(doc(db, WORKOUTS_COLLECTION, workout.id), sanitizeForFirestore(workout));
  } catch (err) {
    console.error("Error saving workout to Firestore:", err);
  }
}

export async function deleteWorkoutFromCloud(workoutId: string) {
  try {
    await deleteDoc(doc(db, WORKOUTS_COLLECTION, workoutId));
  } catch (err) {
    console.error("Error deleting workout from Firestore:", err);
  }
}

// --- Templates Operations ---
export function subscribeTemplates(callback: (templates: WorkoutTemplate[]) => void) {
  const q = query(collection(db, TEMPLATES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const templates: WorkoutTemplate[] = [];
    snapshot.forEach((doc) => {
      templates.push(doc.data() as WorkoutTemplate);
    });
    callback(templates);
  }, (error) => {
    console.warn("Firestore templates sync notice:", error);
  });
}

export async function saveTemplateToCloud(template: WorkoutTemplate) {
  try {
    await setDoc(doc(db, TEMPLATES_COLLECTION, template.id), sanitizeForFirestore(template));
  } catch (err) {
    console.error("Error saving template to Firestore:", err);
  }
}

export async function deleteTemplateFromCloud(templateId: string) {
  try {
    await deleteDoc(doc(db, TEMPLATES_COLLECTION, templateId));
  } catch (err) {
    console.error("Error deleting template from Firestore:", err);
  }
}

// --- Exercises Operations ---
export function subscribeExercises(callback: (exercises: Exercise[]) => void) {
  return onSnapshot(collection(db, EXERCISES_COLLECTION), (snapshot) => {
    const exercises: Exercise[] = [];
    snapshot.forEach((doc) => {
      exercises.push(doc.data() as Exercise);
    });
    callback(exercises);
  }, (error) => {
    console.warn("Firestore exercises sync notice:", error);
  });
}

export async function saveExerciseToCloud(exercise: Exercise) {
  try {
    await setDoc(doc(db, EXERCISES_COLLECTION, exercise.id), sanitizeForFirestore(exercise));
  } catch (err) {
    console.error("Error saving exercise to Firestore:", err);
  }
}

export async function deleteExerciseFromCloud(exerciseId: string) {
  try {
    await deleteDoc(doc(db, EXERCISES_COLLECTION, exerciseId));
  } catch (err) {
    console.error("Error deleting exercise from Firestore:", err);
  }
}

// Batch seed all 800+ exercises to Firestore collection
export async function seedAllExercisesToCloud(exercisesList: Exercise[]) {
  if (!exercisesList || exercisesList.length === 0) return;
  try {
    console.log(`[Firestore Seed] Seeding ${exercisesList.length} exercises into Firestore...`);
    const chunkSize = 400; // Firestore limit is 500 ops per batch
    for (let i = 0; i < exercisesList.length; i += chunkSize) {
      const chunk = exercisesList.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(ex => {
        const ref = doc(db, EXERCISES_COLLECTION, ex.id);
        batch.set(ref, sanitizeForFirestore(ex), { merge: true });
      });
      await batch.commit();
    }
    console.log(`[Firestore Seed] Successfully seeded ${exercisesList.length} exercises to Firestore!`);
  } catch (err) {
    console.error("Error batch seeding exercises to Firestore:", err);
  }
}

// --- Active Session Operations ---
export function subscribeActiveSession(callback: (session: ActiveSession | null) => void) {
  return onSnapshot(doc(db, ACTIVE_SESSIONS_COLLECTION, 'current_session'), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as ActiveSession);
    } else {
      callback(null);
    }
  }, (error) => {
    console.warn("Firestore active session sync notice:", error);
  });
}

export async function saveActiveSessionToCloud(session: ActiveSession | null) {
  try {
    if (!session) {
      await deleteDoc(doc(db, ACTIVE_SESSIONS_COLLECTION, 'current_session'));
    } else {
      await setDoc(doc(db, ACTIVE_SESSIONS_COLLECTION, 'current_session'), sanitizeForFirestore(session));
    }
  } catch (err) {
    console.error("Error saving active session to Firestore:", err);
  }
}

