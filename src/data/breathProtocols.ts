import { BreathPattern } from '../types';

export const SCIENTIFIC_BREATH_PROTOCOLS: BreathPattern[] = [
  {
    id: 'box-breathing',
    patternId: 'box-breathing',
    name: 'Box Breathing (Sama Vritti)',
    subtitle: 'Navy SEAL Tactical Focus',
    scientificSource: 'Naval Special Warfare Physical Training & Autonomic Balance Research',
    clinicalMechanism:
      'Standardizes baroreflex input to balance sympathetic and parasympathetic tones, neutralizing acute cognitive tunnel vision under high stress.',
    targetEffect: 'Equalizes autonomic tone, enhances mental clarity, and mitigates panic-induced cognitive degradation.',
    category: 'stress',
    inhale: 4,
    inhaleHold: 4,
    exhale: 4,
    exhaleHold: 4,
    defaultInhale: 4,
    defaultInhaleHold: 4,
    defaultExhale: 4,
    defaultExhaleHold: 4
  },
  {
    id: 'parasympathetic-switch-4-7-8',
    patternId: 'parasympathetic-switch-4-7-8',
    name: '4-7-8 Parasympathetic Switch',
    subtitle: 'Weil Harvard Deep Relaxation',
    scientificSource: 'Dr. Andrew Weil (Harvard Medical School / Arizona Center for Integrative Medicine)',
    clinicalMechanism:
      'Pioneered by Dr. Andrew Weil; 7-second hold saturates alveolar oxygen extraction while 8-second exhalation stimulates vagal efferent fibers, releasing acetylcholine at the sinoatrial node to decelerate heart rate.',
    targetEffect: 'Rapidly triggers the diving reflex, drops systemic blood pressure, and prepares neural circuits for deep sleep.',
    category: 'sleep',
    inhale: 4,
    inhaleHold: 7,
    exhale: 8,
    exhaleHold: 0,
    defaultInhale: 4,
    defaultInhaleHold: 7,
    defaultExhale: 8,
    defaultExhaleHold: 0
  },
  {
    id: 'coherent-resonance',
    patternId: 'coherent-resonance',
    name: 'Coherent Resonance (5.5s)',
    subtitle: 'Peak HRV & Vascular Coupling',
    scientificSource: 'Dr. Evgeny Vaschillo & HeartMath Institute (0.1 Hz Baroreflex Studies)',
    clinicalMechanism:
      'At 5.5 breaths per minute, respiratory sinus arrhythmia phase-locks with natural Mayer blood pressure oscillations, maximizing Heart Rate Variability (HRV) amplitude and optimizing neuro-cardiac efficiency.',
    targetEffect: 'Maximizes vagal tone, establishes cardiovascular coherence, and optimizes emotional equilibrium.',
    category: 'hrv',
    inhale: 5.5,
    inhaleHold: 0,
    exhale: 5.5,
    exhaleHold: 0,
    defaultInhale: 5.5,
    defaultInhaleHold: 0,
    defaultExhale: 5.5,
    defaultExhaleHold: 0
  },
  {
    id: 'physiological-sigh',
    patternId: 'physiological-sigh',
    name: 'Physiological Cyclic Sigh',
    subtitle: 'Stanford Alveolar De-Stressor',
    scientificSource: 'Stanford Neurobiology (Dr. Andrew Huberman & Dr. Jack Feldman, Cell Reports Medicine 2023)',
    clinicalMechanism:
      'Stanford research proves double-nasal inhalation followed by prolonged oral exhalation re-expands collapsed lung alveoli (atelectasis), offloading excess CO2 more rapidly than any other behavioral intervention.',
    targetEffect: 'Fastest real-time autonomic down-regulator; halts sympathetic escalation within 2 to 3 breaths.',
    category: 'stress',
    inhale: 4,
    inhaleHold: 1.5,
    exhale: 7,
    exhaleHold: 0,
    defaultInhale: 4,
    defaultInhaleHold: 1.5,
    defaultExhale: 7,
    defaultExhaleHold: 0
  },
  {
    id: 'vagus-nerve-pacing',
    patternId: 'vagus-nerve-pacing',
    name: '4-4-6-2 Vagus Nerve Pacing',
    subtitle: 'Post-Workout Sympathetic Brake',
    scientificSource: 'Autonomic Neuroscience: Basic and Clinical Exercise Physiology',
    clinicalMechanism:
      'A 1.5x exhalation-to-inhalation ratio engages pulmonary stretch receptors and diaphragmatic mechanoreceptors to accelerate post-workout cardiac deceleration and lactate shuttling.',
    targetEffect: 'Transitions the body from catabolic workout stress to anabolic muscular repair and recovery.',
    category: 'recovery',
    inhale: 4,
    inhaleHold: 4,
    exhale: 6,
    exhaleHold: 2,
    defaultInhale: 4,
    defaultInhaleHold: 4,
    defaultExhale: 6,
    defaultExhaleHold: 2
  },
  {
    id: 'panic-reset-7-11',
    patternId: 'panic-reset-7-11',
    name: '7-11 Acute Panic Reset',
    subtitle: 'Amygdala Down-Regulation',
    scientificSource: 'Clinical Psychophysiology & Emergency Response Stress Protocols',
    clinicalMechanism:
      'Extended 11-second exhalations physically limit sympathetic outflow by lowering intrathoracic pressure and reducing locus coeruleus noradrenergic firing.',
    targetEffect: 'Mechanically overrides fight-or-flight hyperarousal, halting trembling and hyperventilation.',
    category: 'stress',
    inhale: 7,
    inhaleHold: 0,
    exhale: 11,
    exhaleHold: 0,
    defaultInhale: 7,
    defaultInhaleHold: 0,
    defaultExhale: 11,
    defaultExhaleHold: 0
  },
  {
    id: 'awake-energize',
    patternId: 'awake-energize',
    name: 'Awake & Energize (Kapalabhati)',
    subtitle: 'Pre-Workout Dopamine Primer',
    scientificSource: 'Cerebral Perfusion & Neuro-Vascular Activation Dynamics',
    clinicalMechanism:
      'Rapid rhythmic respiratory cycles increase frontal lobe cerebral blood flow and stimulate the sympathetic nervous system to mobilize glucose and heighten sensory vigilance.',
    targetEffect: 'Increases alertness, clears morning brain fog, and primes motor units for intense physical exertion.',
    category: 'energy',
    inhale: 2.5,
    inhaleHold: 1,
    exhale: 2.5,
    exhaleHold: 1,
    defaultInhale: 2.5,
    defaultInhaleHold: 1,
    defaultExhale: 2.5,
    defaultExhaleHold: 1
  },
  {
    id: 'buteyko-reduced',
    patternId: 'buteyko-reduced',
    name: 'Buteyko Reduced Breathing',
    subtitle: 'Bohr Effect CO2 Conditioning',
    scientificSource: 'Prof. Konstantin Buteyko & Respiratory Gas Exchange Physiology',
    clinicalMechanism:
      'Controlled hypoventilation gently raises arterial partial pressure of carbon dioxide (pCO2), shifting the hemoglobin-oxygen dissociation curve to the right (the Bohr Effect) to enhance oxygen release to working muscles.',
    targetEffect: 'Trains carbon dioxide tolerance, prevents hyperventilation, and optimizes cellular cellular respiration.',
    category: 'endurance',
    inhale: 4,
    inhaleHold: 0,
    exhale: 4,
    exhaleHold: 4,
    defaultInhale: 4,
    defaultInhaleHold: 0,
    defaultExhale: 4,
    defaultExhaleHold: 4
  }
];

export const INITIAL_BREATHWORK_SESSIONS = [
  {
    id: 'bs-demo-1',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    startTime: '08:15 AM',
    timestamp: Date.now() - 86400000,
    patternId: 'coherent-resonance',
    patternName: 'Coherent Resonance (5.5s)',
    durationMinutes: 5,
    durationSeconds: 300,
    cyclesCompleted: 27,
    feelingAfter: 'focused' as const,
    backgroundScene: 'lake-tahoe' as const,
    notes: 'Morning centering before lifting.'
  },
  {
    id: 'bs-demo-2',
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    startTime: '09:45 PM',
    timestamp: Date.now() - 172800000,
    patternId: 'parasympathetic-switch-4-7-8',
    patternName: '4-7-8 Parasympathetic Switch',
    durationMinutes: 6,
    durationSeconds: 360,
    cyclesCompleted: 19,
    feelingAfter: 'sleepy' as const,
    backgroundScene: 'twilight-sunset' as const,
    notes: 'Wind-down protocol.'
  }
];
