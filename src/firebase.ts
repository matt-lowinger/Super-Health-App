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
  getDocs,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import {
  CompletedWorkout,
  WorkoutTemplate,
  Exercise,
  ActiveSession,
  BreathPattern,
  BreathworkSession,
  BreathActivityLog
} from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operation: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const err = error as { code?: string; message?: string };
  if (err?.code === 'permission-denied') {
    const errorInfo: FirestoreErrorInfo = {
      error: err.message || 'Permission denied',
      operation: operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
    };
    console.error('Firestore Permission Error: ', JSON.stringify(errorInfo));
    throw new Error(JSON.stringify(errorInfo));
  }
  console.warn(`Firestore ${operationType} warning on ${path}:`, error);
}

// Boot-time Firestore connection verification
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore offline notice: Local caching is active.");
    }
  }
}
testConnection();

// Firestore Collections (supporting all requested collections, aliases, and breath coach schema)
export const COLLECTIONS = {
  COMPLETED_WORKOUTS: 'completed_workouts',
  COMPLETED_SESSIONS: 'completed_sessions',
  TEMPLATES: 'workout_templates',
  EXERCISES: 'exercises',
  EXCERCISES_ALIAS: 'excercises',
  ACTIVE_SESSIONS: 'active_sessions',
  BREATH_PATTERNS: 'breath_patterns',
  BREATHWORK_SESSIONS: 'breathwork_sessions',
  ACTIVITY_LOGS: 'activity_logs'
};

// Helper to remove undefined properties before sending to Firestore
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// --- Workouts & Completed Sessions Operations ---
// Subscribes to BOTH completed_workouts and completed_sessions, merging any logged workouts
export function subscribeWorkouts(callback: (workouts: CompletedWorkout[]) => void) {
  let workoutsMap = new Map<string, CompletedWorkout>();

  const updateAndNotify = () => {
    const list = Array.from(workoutsMap.values());
    list.sort((a, b) => b.startTime - a.startTime);
    callback(list);
  };

  // 1. Listen to completed_workouts
  const unsub1 = onSnapshot(collection(db, COLLECTIONS.COMPLETED_WORKOUTS), (snapshot) => {
    snapshot.forEach((doc) => {
      workoutsMap.set(doc.id, { ...doc.data(), id: doc.id } as CompletedWorkout);
    });
    // Check for removed docs
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'removed') {
        workoutsMap.delete(change.doc.id);
      }
    });
    updateAndNotify();
  }, (error) => {
    console.warn("Firestore completed_workouts sync notice:", error);
  });

  // 2. Also listen to completed_sessions
  const unsub2 = onSnapshot(collection(db, COLLECTIONS.COMPLETED_SESSIONS), (snapshot) => {
    snapshot.forEach((doc) => {
      workoutsMap.set(doc.id, { ...doc.data(), id: doc.id } as CompletedWorkout);
    });
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'removed') {
        workoutsMap.delete(change.doc.id);
      }
    });
    updateAndNotify();
  }, (error) => {
    console.warn("Firestore completed_sessions sync notice:", error);
  });

  return () => {
    unsub1();
    unsub2();
  };
}

export async function saveWorkoutToCloud(workout: CompletedWorkout) {
  try {
    const sanitized = sanitizeForFirestore(workout);
    // Save to both completed_workouts and completed_sessions so data is mirrored
    await Promise.allSettled([
      setDoc(doc(db, COLLECTIONS.COMPLETED_WORKOUTS, workout.id), sanitized),
      setDoc(doc(db, COLLECTIONS.COMPLETED_SESSIONS, workout.id), sanitized)
    ]);
  } catch (err) {
    console.error("Error saving workout to Firestore:", err);
  }
}

export async function deleteWorkoutFromCloud(workoutId: string) {
  try {
    await Promise.allSettled([
      deleteDoc(doc(db, COLLECTIONS.COMPLETED_WORKOUTS, workoutId)),
      deleteDoc(doc(db, COLLECTIONS.COMPLETED_SESSIONS, workoutId))
    ]);
  } catch (err) {
    console.error("Error deleting workout from Firestore:", err);
  }
}

// --- Templates Operations ---
export function subscribeTemplates(callback: (templates: WorkoutTemplate[]) => void) {
  return onSnapshot(collection(db, COLLECTIONS.TEMPLATES), (snapshot) => {
    const templates: WorkoutTemplate[] = [];
    snapshot.forEach((doc) => {
      templates.push({ ...doc.data(), id: doc.id } as WorkoutTemplate);
    });
    templates.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(templates);
  }, (error) => {
    console.warn("Firestore templates sync notice:", error);
  });
}

export async function saveTemplateToCloud(template: WorkoutTemplate) {
  try {
    await setDoc(doc(db, COLLECTIONS.TEMPLATES, template.id), sanitizeForFirestore(template));
  } catch (err) {
    console.error("Error saving template to Firestore:", err);
  }
}

export async function deleteTemplateFromCloud(templateId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.TEMPLATES, templateId));
  } catch (err) {
    console.error("Error deleting template from Firestore:", err);
  }
}

// --- Exercises Operations ---
// Subscribes to BOTH exercises and excercises collections in Firestore
export function subscribeExercises(callback: (exercises: Exercise[]) => void) {
  const exercisesMap = new Map<string, Exercise>();

  const notify = () => {
    const list = Array.from(exercisesMap.values());
    callback(list);
  };

  const unsub1 = onSnapshot(collection(db, COLLECTIONS.EXERCISES), (snapshot) => {
    snapshot.forEach((doc) => {
      exercisesMap.set(doc.id, { ...doc.data(), id: doc.id } as Exercise);
    });
    notify();
  }, (error) => {
    console.warn("Firestore exercises sync notice:", error);
  });

  const unsub2 = onSnapshot(collection(db, COLLECTIONS.EXCERCISES_ALIAS), (snapshot) => {
    snapshot.forEach((doc) => {
      exercisesMap.set(doc.id, { ...doc.data(), id: doc.id } as Exercise);
    });
    notify();
  }, (error) => {
    // excercises might not exist, harmless warning
  });

  return () => {
    unsub1();
    unsub2();
  };
}

export async function saveExerciseToCloud(exercise: Exercise) {
  try {
    const sanitized = sanitizeForFirestore(exercise);
    await setDoc(doc(db, COLLECTIONS.EXERCISES, exercise.id), sanitized);
  } catch (err) {
    console.error("Error saving exercise to Firestore:", err);
  }
}

export async function deleteExerciseFromCloud(exerciseId: string) {
  try {
    await Promise.allSettled([
      deleteDoc(doc(db, COLLECTIONS.EXERCISES, exerciseId)),
      deleteDoc(doc(db, COLLECTIONS.EXCERCISES_ALIAS, exerciseId))
    ]);
  } catch (err) {
    console.error("Error deleting exercise from Firestore:", err);
  }
}

// Batch seed exercises to Firestore collection
export async function seedAllExercisesToCloud(exercisesList: Exercise[]) {
  if (!exercisesList || exercisesList.length === 0) return;
  try {
    const chunkSize = 400;
    for (let i = 0; i < exercisesList.length; i += chunkSize) {
      const chunk = exercisesList.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(ex => {
        const ref = doc(db, COLLECTIONS.EXERCISES, ex.id);
        batch.set(ref, sanitizeForFirestore(ex), { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    console.error("Error batch seeding exercises to Firestore:", err);
  }
}

// --- Active Session Operations ---
// Subscribes to ALL active_sessions in Firestore
export function subscribeActiveSessions(callback: (sessions: ActiveSession[]) => void) {
  return onSnapshot(collection(db, COLLECTIONS.ACTIVE_SESSIONS), (snapshot) => {
    const sessions: ActiveSession[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as ActiveSession;
      sessions.push({ ...data, id: doc.id });
    });
    // Order by startTime descending
    sessions.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
    callback(sessions);
  }, (error) => {
    console.warn("Firestore active sessions collection sync notice:", error);
  });
}

// Backward-compatible single active session subscription
export function subscribeActiveSession(callback: (session: ActiveSession | null) => void) {
  return onSnapshot(collection(db, COLLECTIONS.ACTIVE_SESSIONS), (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    // Check if current_session exists, otherwise pick the most recent one
    let targetDoc = snapshot.docs.find(d => d.id === 'current_session') || snapshot.docs[0];
    if (targetDoc) {
      const data = targetDoc.data() as ActiveSession;
      callback({ ...data, id: targetDoc.id });
    } else {
      callback(null);
    }
  }, (error) => {
    console.warn("Firestore active session sync notice:", error);
  });
}

export async function saveActiveSessionToCloud(session: ActiveSession | null, targetId: string = 'current_session') {
  try {
    if (!session) {
      await Promise.allSettled([
        deleteDoc(doc(db, COLLECTIONS.ACTIVE_SESSIONS, 'current_session')),
        deleteDoc(doc(db, COLLECTIONS.ACTIVE_SESSIONS, targetId))
      ]);
    } else {
      const sanitized = sanitizeForFirestore(session);
      await Promise.allSettled([
        setDoc(doc(db, COLLECTIONS.ACTIVE_SESSIONS, 'current_session'), sanitized),
        setDoc(doc(db, COLLECTIONS.ACTIVE_SESSIONS, session.id || targetId), sanitized)
      ]);
    }
  } catch (err) {
    console.error("Error saving active session to Firestore:", err);
  }
}

// Direct live fetcher for on-demand sync from all 4 Firebase collections
export async function fetchAllLiveFirebaseData() {
  const result = {
    activeSessions: [] as ActiveSession[],
    completedWorkouts: [] as CompletedWorkout[],
    exercises: [] as Exercise[],
    templates: [] as WorkoutTemplate[],
    counts: {
      activeSessions: 0,
      completedWorkouts: 0,
      completedSessions: 0,
      exercises: 0,
      workoutTemplates: 0
    },
    syncedAt: Date.now()
  };

  try {
    // 1. active_sessions
    const activeSnap = await getDocs(collection(db, COLLECTIONS.ACTIVE_SESSIONS));
    result.counts.activeSessions = activeSnap.size;
    activeSnap.forEach(d => {
      result.activeSessions.push({ ...d.data(), id: d.id } as ActiveSession);
    });

    // 2. completed_workouts & completed_sessions
    const workoutsMap = new Map<string, CompletedWorkout>();
    const cwSnap = await getDocs(collection(db, COLLECTIONS.COMPLETED_WORKOUTS));
    result.counts.completedWorkouts = cwSnap.size;
    cwSnap.forEach(d => {
      workoutsMap.set(d.id, { ...d.data(), id: d.id } as CompletedWorkout);
    });

    try {
      const csSnap = await getDocs(collection(db, COLLECTIONS.COMPLETED_SESSIONS));
      result.counts.completedSessions = csSnap.size;
      csSnap.forEach(d => {
        workoutsMap.set(d.id, { ...d.data(), id: d.id } as CompletedWorkout);
      });
    } catch (e) {
      // ignore
    }
    result.completedWorkouts = Array.from(workoutsMap.values()).sort((a, b) => b.startTime - a.startTime);

    // 3. exercises & excercises
    const exMap = new Map<string, Exercise>();
    const exSnap = await getDocs(collection(db, COLLECTIONS.EXERCISES));
    result.counts.exercises = exSnap.size;
    exSnap.forEach(d => {
      exMap.set(d.id, { ...d.data(), id: d.id } as Exercise);
    });
    try {
      const aliasSnap = await getDocs(collection(db, COLLECTIONS.EXCERCISES_ALIAS));
      aliasSnap.forEach(d => {
        exMap.set(d.id, { ...d.data(), id: d.id } as Exercise);
      });
    } catch (e) {
      // ignore
    }
    result.exercises = Array.from(exMap.values());

    // 4. workout_templates
    const tempSnap = await getDocs(collection(db, COLLECTIONS.TEMPLATES));
    result.counts.workoutTemplates = tempSnap.size;
    tempSnap.forEach(d => {
      result.templates.push({ ...d.data(), id: d.id } as WorkoutTemplate);
    });
    result.templates.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  } catch (err) {
    console.error("Error fetching live data from Firebase:", err);
  }

  return result;
}

// --- Firebase Authentication Helpers ---
export async function signInWithGooglePopup(): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-Out Error:", error);
  }
}

export function onUserAuthStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// --- Pocket Breath Coach Firestore Operations ---

/**
 * Subscribes to user's calibrated breath patterns.
 * Supports both users/{userId}/breathPatterns and fallback collection breath_patterns.
 */
export function subscribeBreathPatterns(
  userId: string | null,
  callback: (calibrations: Record<string, Partial<BreathPattern>>) => void
) {
  const map: Record<string, Partial<BreathPattern>> = {};

  const handleSnap = (snap: any) => {
    snap.forEach((doc: any) => {
      map[doc.id] = doc.data() as Partial<BreathPattern>;
    });
    snap.docChanges().forEach((change: any) => {
      if (change.type === 'removed') {
        delete map[change.doc.id];
      }
    });
    callback({ ...map });
  };

  // 1. Listen to top-level breath_patterns
  const unsubTop = onSnapshot(collection(db, COLLECTIONS.BREATH_PATTERNS), handleSnap, (err) => {
    console.warn("Firestore breath_patterns subscription notice:", err);
  });

  // 2. If authenticated, also listen to user-scoped subcollection
  let unsubUser: (() => void) | null = null;
  if (userId) {
    try {
      unsubUser = onSnapshot(collection(db, 'users', userId, 'breathPatterns'), handleSnap, (err) => {
        console.warn("User breathPatterns subcollection notice:", err);
      });
    } catch (e) {
      console.warn("Could not attach user breathPatterns listener:", e);
    }
  }

  return () => {
    unsubTop();
    if (unsubUser) unsubUser();
  };
}

/**
 * Saves calibrated phase seconds for a scientific protocol to Firestore
 */
export async function saveCalibratedBreathPattern(pattern: BreathPattern, userId?: string) {
  try {
    const payload = sanitizeForFirestore({
      id: pattern.id,
      patternId: pattern.patternId,
      inhale: pattern.inhale,
      inhaleHold: pattern.inhaleHold,
      exhale: pattern.exhale,
      exhaleHold: pattern.exhaleHold,
      updatedAt: new Date().toISOString(),
      userId: userId || null
    });

    // Save to global collection
    await setDoc(doc(db, COLLECTIONS.BREATH_PATTERNS, pattern.id), payload);

    // If user is authenticated, also save in users/{userId}/breathPatterns/{patternId}
    if (userId) {
      await setDoc(doc(db, 'users', userId, 'breathPatterns', pattern.id), payload);

      // Audit telemetry event
      await logBreathActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        eventType: 'pattern_calibrated',
        patternId: pattern.id,
        timestamp: new Date().toISOString(),
        userId,
        details: { inhale: pattern.inhale, inhaleHold: pattern.inhaleHold, exhale: pattern.exhale, exhaleHold: pattern.exhaleHold }
      });
    }
  } catch (error) {
    console.error("Error saving calibrated breath pattern to Firebase:", error);
  }
}

/**
 * Resets a protocol back to scientific defaults
 */
export async function resetCalibratedBreathPattern(patternId: string, userId?: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.BREATH_PATTERNS, patternId));
    if (userId) {
      await deleteDoc(doc(db, 'users', userId, 'breathPatterns', patternId));
      await logBreathActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        eventType: 'pattern_reset',
        patternId,
        timestamp: new Date().toISOString(),
        userId
      });
    }
  } catch (error) {
    console.error("Error resetting breath pattern in Firebase:", error);
  }
}

/**
 * Subscribes to completed breathwork sessions
 */
export function subscribeBreathworkSessions(
  userId: string | null,
  callback: (sessions: BreathworkSession[]) => void
) {
  const sessionsMap = new Map<string, BreathworkSession>();

  const update = () => {
    const list = Array.from(sessionsMap.values());
    list.sort((a, b) => b.timestamp - a.timestamp);
    callback(list);
  };

  const handleSnap = (snap: any) => {
    snap.forEach((doc: any) => {
      sessionsMap.set(doc.id, { ...doc.data(), id: doc.id } as BreathworkSession);
    });
    snap.docChanges().forEach((change: any) => {
      if (change.type === 'removed') {
        sessionsMap.delete(change.doc.id);
      }
    });
    update();
  };

  const unsubTop = onSnapshot(collection(db, COLLECTIONS.BREATHWORK_SESSIONS), handleSnap, (err) => {
    console.warn("Firestore breathwork_sessions subscription notice:", err);
  });

  let unsubUser: (() => void) | null = null;
  if (userId) {
    try {
      unsubUser = onSnapshot(collection(db, 'users', userId, 'breathworkSessions'), handleSnap, (err) => {
        console.warn("User breathworkSessions subscription notice:", err);
      });
    } catch (e) {
      console.warn("Could not attach user breathworkSessions listener:", e);
    }
  }

  return () => {
    unsubTop();
    if (unsubUser) unsubUser();
  };
}

/**
 * Saves a completed breathwork session to Firestore
 */
export async function saveCompletedBreathworkSession(session: BreathworkSession, userId?: string) {
  try {
    const payload = sanitizeForFirestore({
      ...session,
      userId: userId || null
    });

    // Save to global collection
    await setDoc(doc(db, COLLECTIONS.BREATHWORK_SESSIONS, session.id), payload);

    // Save to user subcollection if signed in
    if (userId) {
      await setDoc(doc(db, 'users', userId, 'breathworkSessions', session.id), payload);

      // Audit telemetry event
      await logBreathActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        eventType: 'session_complete',
        patternId: session.patternId,
        timestamp: new Date().toISOString(),
        userId,
        details: {
          durationMinutes: session.durationMinutes,
          cyclesCompleted: session.cyclesCompleted,
          feelingAfter: session.feelingAfter
        }
      });
    }
  } catch (error) {
    console.error("Error saving breathwork session to Firebase:", error);
  }
}

/**
 * Audit telemetry logging
 */
export async function logBreathActivity(activity: BreathActivityLog) {
  try {
    const payload = sanitizeForFirestore(activity);
    if (activity.userId) {
      await setDoc(doc(db, 'users', activity.userId, 'activityLogs', activity.id), payload);
    }
    await setDoc(doc(db, COLLECTIONS.ACTIVITY_LOGS, activity.id), payload);
  } catch (e) {
    // Non-blocking telemetry
    console.warn("Activity log notice:", e);
  }
}



