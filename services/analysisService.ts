import { saveAnalysisResult, processAnalysisResult } from '../lib/firebase';
import { processEyeTestResult } from './eyeTestService';
import * as FileSystem from 'expo-file-system';

export interface PupilData {
  frame: number;
  eye: 'left_eye' | 'right_eye';
  diameter: number;
}

export interface EyeStats {
  mean: number;
  std: number;
  min: number;
  max: number;
}

export interface AnalysisData {
  leftEyeStats?: EyeStats;
  rightEyeStats?: EyeStats;
  summary: string;
  fatigueLevel: 'low' | 'moderate' | 'high';
  pupilData: PupilData[];
  frameCount: number;
  analysisUrl?: string;
  metadata?: any;
  reactionTime?: number; // Mock reaction time data (ms)
  settings?: {
    pupilSelection: string;
    tvModel: string;
    blinkDetection: boolean;
  };
}

/**
 * Parse the result.txt format data
 * Format: frame,eye_type,diameter_mm
 */
export const parseResultData = (resultText: string): { pupilData: PupilData[], summary: string } => {
  const lines = resultText.split('\n').filter(line => line.trim());
  const pupilData: PupilData[] = [];
  let summary = '';
  let inSummarySection = false;
  let inCSVSection = false;

  console.log('Parsing result data, total lines:', lines.length);

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for summary section
    if (trimmedLine.includes('Processed') && trimmedLine.includes('frames')) {
      inSummarySection = true;
      summary += trimmedLine + '\n';
      continue;
    }

    // Check for CSV section
    if (trimmedLine === '--- CSV Data ---') {
      inCSVSection = true;
      continue;
    }

    // Skip CSV header
    if (trimmedLine === 'Frame,Eye_Type,Diameter_mm') {
      continue;
    }

    // Parse summary lines
    if (inSummarySection && !inCSVSection) {
      if (trimmedLine.includes('Eye:') || trimmedLine.includes('Mean:') ||
          trimmedLine.includes('Std:') || trimmedLine.includes('Min:') ||
          trimmedLine.includes('Max:')) {
        summary += trimmedLine + '\n';
      }
      continue;
    }

    // Parse CSV data or direct frame data - handle both formats
    if (trimmedLine.includes(',')) {
      const parts = trimmedLine.split(',');
      if (parts.length >= 3) {
        const frame = parseInt(parts[0]);
        let eye = parts[1].trim() as 'left_eye' | 'right_eye';
        const diameter = parseFloat(parts[2]);

        // Handle different eye format variations
        if (eye === 'left_eye' || eye === 'right_eye') {
          // Already correct format
        } else if (eye === 'left' || eye === 'Left') {
          eye = 'left_eye';
        } else if (eye === 'right' || eye === 'Right') {
          eye = 'right_eye';
        }

        if (!isNaN(frame) && !isNaN(diameter) && (eye === 'left_eye' || eye === 'right_eye')) {
          pupilData.push({ frame, eye, diameter });
        }
      }
    }
  }

  console.log('Parsed pupil data points:', pupilData.length);
  console.log('Sample data points:', pupilData.slice(0, 5));

  return { pupilData, summary: summary.trim() };
};

/**
 * Calculate statistics for eye data
 */
export const calculateEyeStats = (data: PupilData[], eye: 'left_eye' | 'right_eye'): EyeStats => {
  const eyeData = data.filter(d => d.eye === eye).map(d => d.diameter);
  
  if (eyeData.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0 };
  }
  
  const mean = eyeData.reduce((sum, val) => sum + val, 0) / eyeData.length;
  const variance = eyeData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / eyeData.length;
  const std = Math.sqrt(variance);
  const min = Math.min(...eyeData);
  const max = Math.max(...eyeData);
  
  return { mean, std, min, max };
};

/**
 * Determine fatigue level based on pupil statistics
 */
export const determineFatigueLevel = (leftStats?: EyeStats, rightStats?: EyeStats): 'low' | 'moderate' | 'high' => {
  if (!leftStats && !rightStats) return 'moderate';

  let avgPupilSize = 0;
  let count = 0;

  if (leftStats) {
    avgPupilSize += leftStats.mean;
    count++;
  }

  if (rightStats) {
    avgPupilSize += rightStats.mean;
    count++;
  }

  avgPupilSize /= count;

  // Thresholds based on typical pupil diameter ranges
  // Smaller pupils often indicate fatigue/drowsiness
  if (avgPupilSize < 2.2) {
    return 'high'; // High fatigue
  } else if (avgPupilSize > 2.6) {
    return 'low'; // Low fatigue (alert)
  } else {
    return 'moderate'; // Moderate fatigue
  }
};

/**
 * Generate mock reaction time based on fatigue level and pupil data
 */
export const generateMockReactionTime = (fatigueLevel: 'low' | 'moderate' | 'high', avgPupilSize?: number): number => {
  // Base reaction times (in milliseconds)
  const baseReactionTimes = {
    low: 280,      // Alert state - faster reactions
    moderate: 350, // Normal state
    high: 450      // Fatigued state - slower reactions
  };

  let baseTime = baseReactionTimes[fatigueLevel];

  // Add some variability based on pupil size if available
  if (avgPupilSize) {
    // Smaller pupils (more fatigue) = slower reaction time
    const pupilFactor = (3.0 - avgPupilSize) * 50; // Adjust reaction time based on pupil size
    baseTime += pupilFactor;
  }

  // Add random variation (±20ms)
  const variation = (Math.random() - 0.5) * 40;

  return Math.max(200, Math.round(baseTime + variation)); // Minimum 200ms reaction time
};

/**
 * Generate cognitive fatigue recommendations
 */
export const generateRecommendations = (fatigueLevel: 'low' | 'moderate' | 'high', analysisData: AnalysisData): string[] => {
  const recommendations: string[] = [];
  
  switch (fatigueLevel) {
    case 'high':
      recommendations.push('🛑 High cognitive fatigue detected. Consider taking a break.');
      recommendations.push('💤 Ensure you get adequate sleep (7-9 hours).');
      recommendations.push('🚶‍♂️ Take a short walk or do light exercise.');
      recommendations.push('💧 Stay hydrated and avoid excessive caffeine.');
      break;
      
    case 'moderate':
      recommendations.push('⚖️ Moderate cognitive load detected.');
      recommendations.push('⏰ Consider taking short breaks every 25-30 minutes.');
      recommendations.push('🧘‍♂️ Practice brief mindfulness or breathing exercises.');
      recommendations.push('👀 Give your eyes a rest with the 20-20-20 rule.');
      break;
      
    case 'low':
      recommendations.push('✅ Good cognitive alertness detected!');
      recommendations.push('🎯 This is a good time for focused work.');
      recommendations.push('📚 Consider tackling challenging tasks now.');
      recommendations.push('🔄 Maintain your current routine for optimal performance.');
      break;
  }
  
  // Add specific recommendations based on pupil variability
  if (analysisData.leftEyeStats && analysisData.rightEyeStats) {
    const avgStd = (analysisData.leftEyeStats.std + analysisData.rightEyeStats.std) / 2;
    
    if (avgStd > 0.15) {
      recommendations.push('📊 High pupil variability detected - this may indicate stress or distraction.');
    }
  }
  
  return recommendations;
};

/**
 * Process and save analysis results
 */
export const processAndSaveAnalysis = async (
  resultText: string,
  analysisUrl?: string,
  metadata?: any,
  settings?: {
    pupilSelection: string;
    tvModel: string;
    blinkDetection: boolean;
  }
): Promise<{ success: boolean; data?: AnalysisData; error?: string }> => {
  try {
    // Parse the result data
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

    // Create analysis data
    const analysisData: AnalysisData = {
      leftEyeStats: leftEyeStats.mean > 0 ? leftEyeStats : undefined,
      rightEyeStats: rightEyeStats.mean > 0 ? rightEyeStats : undefined,
      summary,
      fatigueLevel,
      pupilData,
      frameCount: Math.max(...pupilData.map(d => d.frame)) + 1,
      analysisUrl,
      metadata,
      reactionTime,
      settings
    };

    // Save to Firebase (regular analysis)
    const saveResult = await saveAnalysisResult(analysisData);

    // Also save to eye test database
    let eyeTestSaved = false;
    try {
      const eyeTestResult = await processEyeTestResult(
        resultText,
        analysisUrl,
        {
          ...metadata,
          source: 'analysis_service',
          originalAnalysis: true
        },
        'pupil_analysis',
        30, // Default test duration
        settings
      );
      eyeTestSaved = eyeTestResult.success;
      if (!eyeTestSaved) {
        console.warn('Failed to save to eye test database:', eyeTestResult.error);
      }
    } catch (error) {
      console.error('Error saving to eye test database:', error);
    }

    if (saveResult.success) {
      return {
        success: true,
        data: analysisData,
        eyeTestSaved
      };
    } else {
      return { success: false, error: saveResult.error };
    }
  } catch (error) {
    console.error('Error processing analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Load and process sample result.txt data for demo purposes
 */
export const loadSampleAnalysisData = async (): Promise<{ success: boolean; data?: AnalysisData; error?: string }> => {
  try {
    // Sample result.txt data (from the functions/result.txt file)
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
0,right_eye,2.2755913734436035
1,right_eye,2.2151496410369873
2,right_eye,2.203460454940796
3,right_eye,2.2932863235473633
4,right_eye,2.2873587608337402
5,right_eye,2.322633981704712
6,right_eye,2.327956199645996
7,right_eye,2.310279607772827
8,right_eye,2.3053176403045654
9,right_eye,2.301894187927246
10,right_eye,2.328364610671997
11,right_eye,2.358999490737915
12,right_eye,2.3684120178222656
13,right_eye,2.3732266426086426
14,right_eye,2.3003456592559814

Processed 255 frames

Left Eye:
  Mean: 2.40 mm
  Std: 0.11 mm
  Min: 2.20 mm
  Max: 2.71 mm

Right Eye:
  Mean: 2.28 mm
  Std: 0.10 mm
  Min: 2.09 mm
  Max: 2.53 mm

--- CSV Data ---
Frame,Eye_Type,Diameter_mm
0,left_eye,2.3495993614196777
1,left_eye,2.3160369396209717
2,left_eye,2.31215500831604
3,left_eye,2.2922122478485107
4,left_eye,2.3858745098114014
5,left_eye,2.389317035675049`;

    const result = await processAndSaveAnalysis(
      sampleResultText,
      undefined,
      {
        source: 'sample_data',
        timestamp: new Date().toISOString(),
        note: 'Sample cognitive fatigue analysis with mock reaction time data'
      },
      {
        pupilSelection: 'both',
        tvModel: 'ResNet18',
        blinkDetection: true
      }
    );

    console.log('Sample data loaded with reaction time:', result.data?.reactionTime);
    return result;
  } catch (error) {
    console.error('Error loading sample data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load sample data'
    };
  }
};

/**
 * Get fatigue level color for UI
 */
export const getFatigueLevelColor = (level: 'low' | 'moderate' | 'high'): string => {
  switch (level) {
    case 'low': return '#10B981'; // Green
    case 'moderate': return '#F59E0B'; // Yellow
    case 'high': return '#EF4444'; // Red
    default: return '#6B7280'; // Gray
  }
};

/**
 * Get fatigue level emoji
 */
export const getFatigueLevelEmoji = (level: 'low' | 'moderate' | 'high'): string => {
  switch (level) {
    case 'low': return '🟢';
    case 'moderate': return '🟡';
    case 'high': return '🔴';
    default: return '⚪';
  }
};

/**
 * Format pupil diameter for display
 */
export const formatPupilDiameter = (diameter: number): string => {
  return `${diameter.toFixed(2)}mm`;
};

/**
 * Get time-based greeting
 */
export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return 'Good morning! 🌅';
  } else if (hour < 17) {
    return 'Good afternoon! ☀️';
  } else {
    return 'Good evening! 🌙';
  }
};
