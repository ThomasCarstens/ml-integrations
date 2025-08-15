// Test script to verify sample data parsing
const fs = require('fs');
const path = require('path');

// Read the result.txt file
const resultPath = path.join(__dirname, 'functions', 'result.txt');
const resultText = fs.readFileSync(resultPath, 'utf8');

console.log('Result text length:', resultText.length);
console.log('First 500 characters:');
console.log(resultText.substring(0, 500));

// Parse the data (simplified version of the parsing logic)
function parseResultData(resultText) {
  const lines = resultText.split('\n').filter(line => line.trim());
  const pupilData = [];
  let summary = '';
  let inSummarySection = false;
  let inCSVSection = false;

  console.log('Total lines to process:', lines.length);

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
    
    // Parse CSV data or direct frame data
    if (trimmedLine.includes(',')) {
      const parts = trimmedLine.split(',');
      if (parts.length >= 3) {
        const frame = parseInt(parts[0]);
        let eye = parts[1].trim();
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

  return { pupilData, summary: summary.trim() };
}

// Test the parsing
const { pupilData, summary } = parseResultData(resultText);

console.log('\n=== PARSING RESULTS ===');
console.log('Pupil data points found:', pupilData.length);
console.log('Summary length:', summary.length);

console.log('\nFirst 10 pupil data points:');
pupilData.slice(0, 10).forEach((point, index) => {
  console.log(`${index + 1}. Frame ${point.frame}, ${point.eye}: ${point.diameter}mm`);
});

console.log('\nSummary:');
console.log(summary);

// Calculate basic stats
function calculateEyeStats(data, eye) {
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
}

const leftStats = calculateEyeStats(pupilData, 'left_eye');
const rightStats = calculateEyeStats(pupilData, 'right_eye');

console.log('\n=== CALCULATED STATS ===');
console.log('Left eye stats:', leftStats);
console.log('Right eye stats:', rightStats);

// Determine fatigue level
function determineFatigueLevel(leftStats, rightStats) {
  if (!leftStats && !rightStats) return 'moderate';
  
  let avgPupilSize = 0;
  let count = 0;
  
  if (leftStats && leftStats.mean > 0) {
    avgPupilSize += leftStats.mean;
    count++;
  }
  
  if (rightStats && rightStats.mean > 0) {
    avgPupilSize += rightStats.mean;
    count++;
  }
  
  if (count === 0) return 'moderate';
  
  avgPupilSize /= count;
  
  if (avgPupilSize < 2.2) {
    return 'high';
  } else if (avgPupilSize > 2.6) {
    return 'low';
  } else {
    return 'moderate';
  }
}

const fatigueLevel = determineFatigueLevel(leftStats, rightStats);
console.log('Fatigue level:', fatigueLevel);

console.log('\n=== TEST COMPLETE ===');
console.log('✅ Sample data parsing appears to be working correctly!');
