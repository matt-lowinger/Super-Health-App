import { Exercise } from './types';

// External Exercise Database Loader (fetches directly or from cache)
export async function fetchExternalExercises(): Promise<Exercise[]> {
  try {
    // Check local storage cache first
    const cached = localStorage.getItem('cached_free_exercise_db');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 200) {
          return parsed;
        }
      } catch (e) {
        // ignore cache parse error
      }
    }

    // Attempt fetching from internal proxy endpoint or direct URL
    let rawList: any[] = [];
    try {
      const res = await fetch('/api/external-exercises');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        rawList = data.data;
      }
    } catch (e) {
      console.warn('Proxy API fetch failed, falling back to direct GitHub URL...');
    }

    if (!rawList || rawList.length === 0) {
      const directRes = await fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json');
      rawList = await directRes.json();
    }

    // Map and normalize to Exercise format
    const formatted = rawList.map((item: any) => {
      const pMuscle = item.primaryMuscles?.[0] || 'General';
      let category = 'Other';
      const pmLower = pMuscle.toLowerCase();
      if (pmLower.includes('chest')) category = 'Chest';
      else if (pmLower.includes('back') || pmLower.includes('lat') || pmLower.includes('trap')) category = 'Back';
      else if (pmLower.includes('quad') || pmLower.includes('hamstring') || pmLower.includes('glute') || pmLower.includes('calf') || pmLower.includes('adductor') || pmLower.includes('abductor')) category = 'Legs';
      else if (pmLower.includes('shoulder')) category = 'Shoulders';
      else if (pmLower.includes('bicep') || pmLower.includes('tricep') || pmLower.includes('forearm')) category = 'Arms';
      else if (pmLower.includes('abdominal') || pmLower.includes('core')) category = 'Core';
      else if (pmLower.includes('cardio') || item.category === 'cardio') category = 'Cardio';

      return {
        id: item.id || `ex-${item.name.replace(/\s+/g, '-')}`,
        name: item.name,
        category: category,
        force: item.force || null,
        level: item.level || 'beginner',
        mechanic: item.mechanic || null,
        equipment: item.equipment || null,
        primaryMuscles: item.primaryMuscles || [],
        secondaryMuscles: item.secondaryMuscles || [],
        instructions: Array.isArray(item.instructions) ? item.instructions : [],
        images: Array.isArray(item.images) ? item.images : []
      };
    });

    localStorage.setItem('cached_free_exercise_db', JSON.stringify(formatted));
    return formatted;
  } catch (err) {
    console.error('Error fetching external exercises:', err);
    return [];
  }
}

