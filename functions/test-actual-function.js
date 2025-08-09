#!/usr/bin/env node

/**
 * Test script that calls the actual Firebase Functions
 * This requires the Firebase Functions to be running (either emulator or deployed)
 */

const path = require('path');

// Import the actual Firebase Functions
const { testVideoUpload, generatePupilAnalysis } = require('./index.js');

/**
 * Test the testVideoUpload function with the real video
 */
async function testVideoUploadFunction() {
  console.log('🧪 Testing testVideoUpload Firebase Function');
  console.log('='.repeat(50));

  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  console.log(`📹 Testing with video: ${path.basename(videoPath)}`);
  console.log(`📁 Full path: ${videoPath}`);

  // Create a mock request object like Firebase would provide
  const mockRequest = {
    data: {
      video_path: videoPath
    }
  };

  try {
    console.log('\n🚀 Calling testVideoUpload function...');
    const startTime = Date.now();
    
    const result = await testVideoUpload(mockRequest);
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n📥 Function response:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log(`\n⏱️  Total execution time: ${totalTime}ms`);
    
    if (result.success) {
      console.log('\n✅ testVideoUpload function completed successfully!');
      
      if (result.data && result.data.testResults) {
        console.log('\n📊 Test Results Summary:');
        result.data.testResults.forEach((testResult, index) => {
          const status = testResult.success ? '✅' : '❌';
          console.log(`   ${status} ${testResult.name}: ${testResult.success ? 'Success' : testResult.error}`);
          if (testResult.success && testResult.blobSize) {
            console.log(`      Size: ${(testResult.blobSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`      Type: ${testResult.blobType}`);
          }
        });
      }
      
      return true;
    } else {
      console.log('\n❌ testVideoUpload function failed!');
      console.log(`Error: ${result.error}`);
      return false;
    }

  } catch (error) {
    console.error('\n💥 Function call failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

/**
 * Test the generatePupilAnalysis function with the real video
 */
async function testGeneratePupilAnalysisFunction() {
  console.log('\n🎬 Testing generatePupilAnalysis Firebase Function');
  console.log('='.repeat(50));

  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  console.log(`📹 Testing with video: ${path.basename(videoPath)}`);

  // Create a mock request object like Firebase would provide
  const mockRequest = {
    data: {
      video_input: videoPath,
      pupil_selection: 'both',
      tv_model: 'ResNet18',
      blink_detection: true
    }
  };

  console.log('\n📤 Request data:');
  console.log(JSON.stringify(mockRequest.data, null, 2));

  try {
    console.log('\n🚀 Calling generatePupilAnalysis function...');
    console.log('⚠️  Note: This will attempt to connect to the real PupilSense API');
    
    const startTime = Date.now();
    
    const result = await generatePupilAnalysis(mockRequest);
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n📥 Function response:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log(`\n⏱️  Total execution time: ${totalTime}ms`);
    
    if (result.success) {
      console.log('\n✅ generatePupilAnalysis function completed successfully!');
      console.log('🎯 Key results:');
      console.log(`   - Analysis URL: ${result.data?.analysisUrl || 'Not provided'}`);
      console.log(`   - Working endpoint: ${result.data?.metadata?.workingEndpoint || 'Unknown'}`);
      console.log(`   - Summary: ${result.data?.summary || 'No summary'}`);
      
      return true;
    } else {
      console.log('\n❌ generatePupilAnalysis function failed!');
      console.log(`Error: ${result.error}`);
      return false;
    }

  } catch (error) {
    console.error('\n💥 Function call failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

/**
 * Test just the video processing part without calling external APIs
 */
async function testVideoProcessingOnly() {
  console.log('\n📁 Testing Video Processing Only');
  console.log('='.repeat(50));

  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  try {
    // Import the processVideoInput function from the Firebase Functions
    const fs = require('fs');
    
    // Recreate the processVideoInput function for testing
    const processVideoInput = async (videoInput) => {
      if (!videoInput) {
        throw new Error("Video input is required");
      }

      if (typeof videoInput === 'string' && fs.existsSync(videoInput)) {
        console.log("Reading video from local file path:", { path: videoInput });
        const videoBuffer = fs.readFileSync(videoInput);
        return new Blob([videoBuffer], { type: 'video/webm' });
      }
      
      throw new Error("Unsupported video input format for this test");
    };

    console.log(`📹 Processing video: ${path.basename(videoPath)}`);
    
    const startTime = Date.now();
    const videoBlob = await processVideoInput(videoPath);
    const processingTime = Date.now() - startTime;
    
    console.log('✅ Video processing successful!');
    console.log(`📏 Blob size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🎭 MIME type: ${videoBlob.type}`);
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    
    return true;

  } catch (error) {
    console.error('❌ Video processing failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🔥 Firebase Functions Test Suite');
  console.log('='.repeat(60));
  console.log('Testing with real video file: AllSmilesAhead.webm');
  console.log('File size: 0.91 MB, Format: WebM');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Video Processing Only', fn: testVideoProcessingOnly },
    { name: 'testVideoUpload Function', fn: testVideoUploadFunction },
    { name: 'generatePupilAnalysis Function', fn: testGeneratePupilAnalysisFunction }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`\n🔍 Running: ${test.name}`);
      const success = await test.fn();
      results.push({ name: test.name, success });
      
      if (success) {
        console.log(`✅ ${test.name} - PASSED`);
      } else {
        console.log(`❌ ${test.name} - FAILED`);
      }
      
    } catch (error) {
      console.error(`💥 ${test.name} - ERROR:`, error.message);
      results.push({ name: test.name, success: false, error: error.message });
    }
  }

  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests completed successfully!');
    console.log('✅ The video upload API is working correctly with real video files');
    return true;
  } else {
    console.log('⚠️  Some tests failed - check the errors above');
    return false;
  }
}

// Run the tests
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testVideoUploadFunction,
  testGeneratePupilAnalysisFunction,
  testVideoProcessingOnly,
  runAllTests
};
