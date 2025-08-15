/**
 * Eye Test Service
 * Handles eye test analysis and saves results to Firebase under /eye-test/{user}/{timestamp}
 */

import { saveEyeTestResult } from '../lib/firebase';
import { PupilData, EyeStats, calculateEyeStats, determineFatigueLevel } from './analysisService';

export interface EyeTestData {
  id?: string;
  timestamp?: number;
  date?: string;
  uid?: string;
  leftEyeStats?: EyeStats;
  rightEyeStats?: EyeStats;
  summary: string;
  fatigueLevel: 'low' | 'moderate' | 'high';
  pupilData: PupilData[];
  frameCount: number;
  analysisUrl?: string;
  metadata?: any;
  reactionTime?: number;
  testType: 'pupil_analysis' | 'blink_test' | 'eye_movement' | 'focus_test';
  testDuration?: number; // in seconds
  settings?: {
    pupilSelection: string;
    tvModel: string;
    blinkDetection: boolean;
  };
  // Eye test specific fields
  blinkCount?: number;
  averageBlinkRate?: number; // blinks per minute
  eyeMovementPattern?: string;
  focusAccuracy?: number; // percentage
  visualAcuity?: number;
  contrastSensitivity?: number;
}

/**
 * Generate mock reaction time based on fatigue level and pupil size
 */
const generateMockReactionTime = (fatigueLevel: 'low' | 'moderate' | 'high', avgPupilSize?: number): number => {
  let baseTime = 250; // Base reaction time in ms
  
  // Adjust based on fatigue level
  switch (fatigueLevel) {
    case 'low':
      baseTime += Math.random() * 50; // 250-300ms
      break;
    case 'moderate':
      baseTime += 50 + Math.random() * 100; // 300-400ms
      break;
    case 'high':
      baseTime += 150 + Math.random() * 150; // 400-550ms
      break;
  }
  
  // Adjust based on pupil size if available
  if (avgPupilSize) {
    if (avgPupilSize < 2.0) {
      baseTime += 50; // Smaller pupils = slower reaction
    } else if (avgPupilSize > 3.0) {
      baseTime -= 25; // Larger pupils = faster reaction
    }
  }
  
  return Math.round(baseTime);
};

/**
 * Calculate blink statistics from pupil data
 */
const calculateBlinkStats = (pupilData: PupilData[], testDuration: number = 30): { blinkCount: number; averageBlinkRate: number } => {
  // Simple blink detection: look for sudden drops in pupil diameter
  let blinkCount = 0;
  const threshold = 0.5; // Minimum diameter drop to consider a blink
  
  for (let i = 1; i < pupilData.length; i++) {
    const current = pupilData[i];
    const previous = pupilData[i - 1];
    
    if (current.eye === previous.eye && 
        previous.diameter - current.diameter > threshold) {
      blinkCount++;
    }
  }
  
  // Calculate blinks per minute
  const averageBlinkRate = (blinkCount / testDuration) * 60;
  
  return { blinkCount, averageBlinkRate };
};

/**
 * Generate mock eye movement pattern
 */
const generateEyeMovementPattern = (fatigueLevel: 'low' | 'moderate' | 'high'): string => {
  const patterns = {
    low: ['smooth', 'precise', 'coordinated'],
    moderate: ['slightly irregular', 'mostly coordinated', 'minor tremor'],
    high: ['irregular', 'uncoordinated', 'significant tremor', 'delayed']
  };
  
  const patternOptions = patterns[fatigueLevel];
  return patternOptions[Math.floor(Math.random() * patternOptions.length)];
};

/**
 * Generate mock focus accuracy based on fatigue level
 */
const generateFocusAccuracy = (fatigueLevel: 'low' | 'moderate' | 'high'): number => {
  let baseAccuracy = 85;
  
  switch (fatigueLevel) {
    case 'low':
      baseAccuracy = 90 + Math.random() * 10; // 90-100%
      break;
    case 'moderate':
      baseAccuracy = 75 + Math.random() * 15; // 75-90%
      break;
    case 'high':
      baseAccuracy = 60 + Math.random() * 15; // 60-75%
      break;
  }
  
  return Math.round(baseAccuracy);
};

/**
 * Process eye test results and save to Firebase
 */
export const processEyeTestResult = async (
  resultText: string,
  analysisUrl?: string,
  metadata?: any,
  testType: 'pupil_analysis' | 'blink_test' | 'eye_movement' | 'focus_test' = 'pupil_analysis',
  testDuration: number = 30,
  settings?: {
    pupilSelection: string;
    tvModel: string;
    blinkDetection: boolean;
  }
): Promise<{ success: boolean; data?: EyeTestData; error?: string }> => {
  try {
    // Parse the result data (reuse existing parsing logic)
    const { parseResultData } = await import('./analysisService');
    const { pupilData, summary } = parseResultData(resultText);

    if (pupilData.length === 0) {
      return { success: false, error: 'No valid pupil data found in results' };
    }

    // Calculate statistics
    const leftEyeStats = calculateEyeStats(pupilData, 'left_eye');
    const rightEyeStats = calculateEyeStats(pupilData, 'right_eye');

    // Determine fatigue level
    const fatigueLevel = determineFatigueLevel(leftEyeStats, rightEyeStats);

    // Calculate average pupil size for reaction time generation
    let avgPupilSize = 0;
    let count = 0;
    if (leftEyeStats.mean > 0) {
      avgPupilSize += leftEyeStats.mean;
      count++;
    }
    if (rightEyeStats.mean > 0) {
      avgPupilSize += rightEyeStats.mean;
      count++;
    }
    avgPupilSize = count > 0 ? avgPupilSize / count : undefined;

    // Generate mock reaction time
    const reactionTime = generateMockReactionTime(fatigueLevel, avgPupilSize);

    // Calculate blink statistics
    const { blinkCount, averageBlinkRate } = calculateBlinkStats(pupilData, testDuration);

    // Generate additional eye test metrics
    const eyeMovementPattern = generateEyeMovementPattern(fatigueLevel);
    const focusAccuracy = generateFocusAccuracy(fatigueLevel);

    // Generate mock visual acuity and contrast sensitivity
    const visualAcuity = fatigueLevel === 'low' ? 20/20 : fatigueLevel === 'moderate' ? 20/25 : 20/30;
    const contrastSensitivity = fatigueLevel === 'low' ? 95 + Math.random() * 5 : 
                               fatigueLevel === 'moderate' ? 80 + Math.random() * 15 : 
                               65 + Math.random() * 15;

    // Create eye test data
    const eyeTestData: EyeTestData = {
      leftEyeStats: leftEyeStats.mean > 0 ? leftEyeStats : undefined,
      rightEyeStats: rightEyeStats.mean > 0 ? rightEyeStats : undefined,
      summary,
      fatigueLevel,
      pupilData,
      frameCount: Math.max(...pupilData.map(d => d.frame)) + 1,
      analysisUrl,
      metadata,
      reactionTime,
      testType,
      testDuration,
      settings,
      blinkCount,
      averageBlinkRate: Math.round(averageBlinkRate * 10) / 10, // Round to 1 decimal
      eyeMovementPattern,
      focusAccuracy,
      visualAcuity,
      contrastSensitivity: Math.round(contrastSensitivity * 10) / 10
    };

    // Save to Firebase under /eye-test/{user}/{timestamp}
    const saveResult = await saveEyeTestResult(eyeTestData);

    if (saveResult.success) {
      return { success: true, data: eyeTestData };
    } else {
      return { success: false, error: saveResult.error };
    }
  } catch (error) {
    console.error('Error processing eye test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Load sample eye test data for demo purposes
 */
export const loadSampleEyeTestData = async (testType: 'pupil_analysis' | 'blink_test' | 'eye_movement' | 'focus_test' = 'pupil_analysis'): Promise<{ success: boolean; data?: EyeTestData; error?: string }> => {
  try {
    // Sample result.txt data
    const sampleResultText = `37,left_eye,2.300457715988159
38,left_eye,2.3212697505950928
39,left_eye,2.3268024921417236
40,left_eye,2.325519323348999
41,left_eye,2.3016486167907715
42,left_eye,2.2915494441986084
43,left_eye,2.307129144668579
44,left_eye,2.3017423152923584
45,left_eye,2.306887149810791
46,left_eye,2.287179708480835
47,left_eye,2.2922284603118896
48,left_eye,2.2548787593841553
49,left_eye,2.260747194290161
50,left_eye,2.299243927001953
51,right_eye,2.1234567890123456
52,right_eye,2.2345678901234567
53,right_eye,2.3456789012345678
54,right_eye,2.4567890123456789
55,right_eye,2.5678901234567890`;

    const result = await processEyeTestResult(
      sampleResultText,
      undefined,
      { 
        source: 'sample_data',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      testType,
      30,
      {
        pupilSelection: 'both',
        tvModel: 'ResNet18',
        blinkDetection: true
      }
    );

    return result;
  } catch (error) {
    console.error('Error loading sample eye test data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load sample data'
    };
  }
};
