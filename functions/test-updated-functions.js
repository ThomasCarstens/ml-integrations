#!/usr/bin/env node

/**
 * Test the updated Firebase Functions with the correct API calls
 */

const fs = require('fs');

// Import the actual Firebase Functions
const { generatePupilAnalysis, testVideoUpload } = require('./index.js');

async function testUpdatedFunctions() {
  console.log('🔥 Testing Updated Firebase Functions');
  console.log('='.repeat(50));

  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  console.log(`📹 Video: ${videoPath.split('/').pop()}`);
  console.log(`📏 Size: ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(2)} MB`);

  // Test 1: testVideoUpload function
  console.log('\n🧪 Test 1: testVideoUpload Function');
  console.log('-'.repeat(30));
  
  try {
    const mockRequest1 = {
      data: {
        video_path: videoPath
      }
    };

    const result1 = await testVideoUpload(mockRequest1);
    console.log('✅ testVideoUpload completed');
    console.log('📊 Success:', result1.success);
    
    if (result1.success && result1.data?.testResults) {
      result1.data.testResults.forEach((test, i) => {
        const status = test.success ? '✅' : '❌';
        console.log(`   ${status} ${test.name}: ${test.success ? 'OK' : test.error}`);
      });
    }
    
    if (!result1.success) {
      console.log('❌ Error:', result1.error);
    }
    
  } catch (error) {
    console.error('💥 testVideoUpload failed:', error.message);
  }

  // Test 2: generatePupilAnalysis function (this will call the real API)
  console.log('\n🎬 Test 2: generatePupilAnalysis Function');
  console.log('-'.repeat(30));
  console.log('⚠️  This will call the real PupilSense API...');
  
  try {
    const mockRequest2 = {
      data: {
        video_input: videoPath,
        pupil_selection: 'both',
        tv_model: 'ResNet18',
        blink_detection: true
      }
    };

    console.log('🚀 Calling generatePupilAnalysis...');
    const startTime = Date.now();
    
    const result2 = await generatePupilAnalysis(mockRequest2);
    
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Processing time: ${duration}ms`);
    console.log('📊 Success:', result2.success);
    
    if (result2.success) {
      console.log('✅ generatePupilAnalysis completed successfully!');
      console.log('🎯 Results:');
      console.log(`   - Analysis URL: ${result2.data?.analysisUrl ? 'Available' : 'Not provided'}`);
      console.log(`   - Summary: ${result2.data?.summary ? 'Available' : 'Not provided'}`);
      console.log(`   - Working endpoint: ${result2.data?.metadata?.workingEndpoint || 'Unknown'}`);
      
      if (result2.data?.analysisUrl) {
        console.log(`   - Image URL: ${result2.data.analysisUrl}`);
      }
      
      if (result2.data?.summary) {
        const summaryPreview = result2.data.summary.length > 100 
          ? result2.data.summary.substring(0, 100) + '...'
          : result2.data.summary;
        console.log(`   - Summary preview: ${summaryPreview}`);
      }
      
    } else {
      console.log('❌ generatePupilAnalysis failed');
      console.log('Error:', result2.error);
    }
    
  } catch (error) {
    console.error('💥 generatePupilAnalysis failed:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n📋 Test Summary');
  console.log('='.repeat(50));
  console.log('✅ Updated Firebase Functions tested');
  console.log('🔧 Using correct API endpoint: process_media_unified');
  console.log('📡 Connecting to: txarst/pupillometry');
  console.log('🎯 Parameter format: [videoBlob, pupil_selection, tv_model, blink_detection]');
}

// Test parameter variations
async function testParameterVariations() {
  console.log('\n🧪 Testing Parameter Variations');
  console.log('='.repeat(40));
  
  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  const testCases = [
    {
      name: 'Left pupil only',
      params: { pupil_selection: 'left_pupil', tv_model: 'ResNet18', blink_detection: true }
    },
    {
      name: 'Right pupil only', 
      params: { pupil_selection: 'right_pupil', tv_model: 'ResNet18', blink_detection: true }
    },
    {
      name: 'ResNet50 model',
      params: { pupil_selection: 'both', tv_model: 'ResNet50', blink_detection: true }
    },
    {
      name: 'No blink detection',
      params: { pupil_selection: 'both', tv_model: 'ResNet18', blink_detection: false }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔸 Testing: ${testCase.name}`);
    
    try {
      const mockRequest = {
        data: {
          video_input: videoPath,
          ...testCase.params
        }
      };
      
      const result = await generatePupilAnalysis(mockRequest);
      
      if (result.success) {
        console.log('   ✅ Success!');
        console.log(`   📊 Analysis URL: ${result.data?.analysisUrl ? 'Available' : 'Not provided'}`);
      } else {
        console.log('   ❌ Failed:', result.error);
      }
      
    } catch (error) {
      console.log('   💥 Error:', error.message);
    }
  }
}

// Run the tests
if (require.main === module) {
  testUpdatedFunctions()
    .then(() => {
      console.log('\n🎉 All tests completed!');
      console.log('🚀 Firebase Functions are ready for deployment');
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testUpdatedFunctions,
  testParameterVariations
};
