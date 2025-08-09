#!/usr/bin/env node

/**
 * Test script for the updated video upload API
 * This script demonstrates how to use the new video_input parameter
 * with local file paths and other input formats.
 */

const { initializeApp } = require('firebase-admin/app');
const { getFunctions } = require('firebase-admin/functions');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin (you'll need to set up credentials)
// initializeApp();

/**
 * Test the video upload functionality
 */
async function testVideoUpload() {
  console.log('🧪 Testing Video Upload API');
  console.log('=' * 50);

  // Test cases for different input formats
  const testCases = [
    {
      name: 'Local File Path',
      data: {
        video_input: './sample_videos/test_video.mp4',
        pupil_selection: 'both',
        tv_model: 'ResNet18',
        blink_detection: true
      },
      description: 'Testing with local file path'
    },
    {
      name: 'Remote URL',
      data: {
        video_input: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        pupil_selection: 'left',
        tv_model: 'ResNet50',
        blink_detection: false
      },
      description: 'Testing with remote video URL'
    },
    {
      name: 'Test Function',
      data: {
        video_path: './sample_videos/test_video.mp4'
      },
      description: 'Testing the testVideoUpload function',
      functionName: 'testVideoUpload'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Running Test: ${testCase.name}`);
    console.log('-'.repeat(30));
    console.log(`Description: ${testCase.description}`);
    console.log(`Data:`, JSON.stringify(testCase.data, null, 2));

    try {
      // In a real implementation, you would call the Firebase function here
      // const result = await callFunction(testCase.functionName || 'generatePupilAnalysis', testCase.data);
      
      // For demonstration, we'll just show what the call would look like
      console.log('✅ Function call would be:');
      console.log(`   Function: ${testCase.functionName || 'generatePupilAnalysis'}`);
      console.log(`   Parameters:`, testCase.data);
      
      // Simulate a successful response
      const mockResponse = {
        success: true,
        data: {
          analysisUrl: 'https://example.com/analysis_result.mp4',
          summary: 'Pupil diameter analysis completed successfully',
          metadata: {
            pupilSelection: testCase.data.pupil_selection || 'both',
            tvModel: testCase.data.tv_model || 'ResNet18',
            blinkDetection: testCase.data.blink_detection !== undefined ? testCase.data.blink_detection : true,
            workingEndpoint: '/process_video_simple',
            timestamp: new Date().toISOString()
          }
        }
      };
      
      console.log('📊 Expected Response:');
      console.log(JSON.stringify(mockResponse, null, 2));

    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
  }

  console.log('\n📋 Summary');
  console.log('=' * 50);
  console.log('✅ All test cases defined successfully');
  console.log('📝 To run actual tests, set up Firebase Admin credentials');
  console.log('🔧 Update the initializeApp() call with your project config');
}

/**
 * Example of how to call Firebase functions (requires proper setup)
 */
async function callFunction(functionName, data) {
  // This is a placeholder - in real usage you would:
  // 1. Set up Firebase Admin credentials
  // 2. Initialize the app with your project config
  // 3. Call the function using the Firebase Admin SDK
  
  /*
  const functions = getFunctions();
  const callable = functions.httpsCallable(functionName);
  const result = await callable(data);
  return result.data;
  */
  
  throw new Error('Firebase Admin not configured - this is a demo script');
}

/**
 * Example HTTP request using fetch (for HTTP endpoints)
 */
async function testHttpEndpoint() {
  console.log('\n🌐 HTTP Endpoint Test Example');
  console.log('-'.repeat(30));

  const endpoint = 'https://your-project.cloudfunctions.net/generatePupilAnalysisHttp';
  const data = {
    video_input: './sample_videos/test_video.mp4',
    pupil_selection: 'both',
    tv_model: 'ResNet18',
    blink_detection: true
  };

  console.log('📡 HTTP Request:');
  console.log(`URL: ${endpoint}`);
  console.log(`Method: POST`);
  console.log(`Body:`, JSON.stringify(data, null, 2));

  /*
  // Actual HTTP request (uncomment to use):
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    console.log('📊 Response:', result);
  } catch (error) {
    console.log('❌ HTTP request failed:', error.message);
  }
  */
}

// Run the tests
if (require.main === module) {
  testVideoUpload()
    .then(() => testHttpEndpoint())
    .then(() => {
      console.log('\n🎉 Test script completed!');
      console.log('📚 See VIDEO_UPLOAD_API.md for detailed documentation');
    })
    .catch(error => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testVideoUpload,
  callFunction,
  testHttpEndpoint
};
