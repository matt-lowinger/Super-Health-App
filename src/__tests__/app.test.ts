import { describe, it, expect } from 'vitest';
import {
  calculate1RM,
  formatDuration,
  formatDate,
  calculateWorkoutVolume,
  generateId,
  getExerciseHistory,
  INITIAL_EXERCISES,
  INITIAL_TEMPLATES,
  INITIAL_COMPLETED
} from '../utils';

describe('Gym Logger App - Unit Tests', () => {
  describe('1RM Calculation', () => {
    it('calculates 1RM using Epley formula correctly', () => {
      expect(calculate1RM(200, 1)).toBe(200);
      expect(calculate1RM(200, 10)).toBe(267); // 200 * (1 + 10/30) = 266.66 -> 267
      expect(calculate1RM(0, 10)).toBe(0);
      expect(calculate1RM(100, 0)).toBe(0);
    });
  });

  describe('Duration Formatting', () => {
    it('formats duration in seconds to standard HH:MM:SS or MM:SS', () => {
      expect(formatDuration(45)).toBe('00:45');
      expect(formatDuration(125)).toBe('02:05');
      expect(formatDuration(3665)).toBe('1:01:05');
    });
  });

  describe('Workout Volume Calculation', () => {
    it('sums total volume for completed sets only', () => {
      const mockExercises = [
        {
          sets: [
            { weight: 100, reps: 10, completed: true },
            { weight: 100, reps: 8, completed: true },
            { weight: 100, reps: 5, completed: false } // Incomplete set ignored
          ]
        }
      ];
      expect(calculateWorkoutVolume(mockExercises)).toBe(1800); // 1000 + 800
    });
  });

  describe('Unique ID Generator', () => {
    it('generates non-empty string IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
  });

  describe('Exercise History Aggregator', () => {
    it('extracts historical best and last recorded metrics', () => {
      const history = getExerciseHistory('ex-1', INITIAL_COMPLETED);
      expect(history.bestWeight).toBe(155);
      expect(history.bestReps).toBe(6);
      expect(history.lastWeight).toBe(155);
      expect(history.lastReps).toBe(6);
      expect(history.history.length).toBe(3);
    });
  });

  describe('Initial Data Schema Integrity', () => {
    it('contains valid default exercises with categories and muscles', () => {
      expect(INITIAL_EXERCISES.length).toBeGreaterThan(15);
      INITIAL_EXERCISES.forEach(ex => {
        expect(ex.id).toBeTruthy();
        expect(ex.name).toBeTruthy();
        expect(ex.category).toBeTruthy();
      });
    });

    it('contains default templates with non-empty sets', () => {
      expect(INITIAL_TEMPLATES.length).toBeGreaterThan(0);
      INITIAL_TEMPLATES.forEach(tmpl => {
        expect(tmpl.id).toBeTruthy();
        expect(tmpl.name).toBeTruthy();
        expect(tmpl.exercises.length).toBeGreaterThan(0);
      });
    });

    it('contains completed history logs with valid total volumes', () => {
      expect(INITIAL_COMPLETED.length).toBeGreaterThan(0);
      INITIAL_COMPLETED.forEach(cw => {
        expect(cw.id).toBeTruthy();
        expect(cw.totalVolume).toBeGreaterThan(0);
      });
    });
  });
});
