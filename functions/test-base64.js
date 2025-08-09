#!/usr/bin/env node

/**
 * Test script for base64 direct approach
 * Run with: node test-base64.js
 */

const fs = require('fs');
const path = require('path');

// Mock Firebase Functions environment
process.env.FUNCTIONS_EMULATOR = 'true';

// Core function logic for base64 direct approach
async function testBase64Direct(data) {
  console.log('🔧 Testing base64 direct approach...');
  
  try {
    // Initialize Gradio client
    console.log('📡 Initializing Gradio client...');
    
    let GradioClient;
    try {
      GradioClient = await import('@gradio/client');
      console.log('✅ Gradio client imported successfully');
    } catch (importError) {
      throw new Error(`Failed to import Gradio client: ${importError.message}`);
    }

    // Connect to PupilSense
    console.log('🔗 Connecting to PupilSense client...');
    const client = await GradioClient.Client.connect("txarst/pupillometry");
    console.log('✅ Connected to PupilSense successfully!');

    // NEW APPROACH: Send base64 data directly to the updated API
    console.log('🎬 Using base64 direct approach (API now supports this!)');
    const videoInput = data.video_input;
    
    let mediaInput;
    if (videoInput.startsWith('data:video/') || videoInput.startsWith('data:image/')) {
      console.log('✅ Detected base64 data URL');
      
      // Extract MIME type from data URL
      const mimeTypeMatch = videoInput.match(/data:([^;]+)/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'video/mp4';
      
      console.log('📋 Base64 data details:', {
        mimeType: mimeType,
        dataLength: videoInput.length,
        isVideo: mimeType.startsWith('video/'),
        isImage: mimeType.startsWith('image/')
      });
      
      // Pass the base64 data URL directly to the API
      mediaInput = videoInput;
      
    } else {
      throw new Error('Invalid video input format - expected base64 data URL');
    }

    console.log('✅ Media input prepared for direct base64 processing');

    // Call the API using the updated endpoint
    console.log('🚀 Calling PupilSense API with base64 data...');
    console.log('📋 Parameters:', {
      mediaInputType: typeof mediaInput,
      mediaInputLength: mediaInput.length,
      pupil_selection: data.pupil_selection || "both",
      tv_model: data.tv_model || "ResNet18",
      blink_detection: data.blink_detection !== undefined ? data.blink_detection : true
    });
    
    const apiParams = {
      media_input: mediaInput,
      pupil_selection: data.pupil_selection || "both",
      tv_model: data.tv_model || "ResNet18",
      blink_detection: data.blink_detection !== undefined ? data.blink_detection : true
    };
    
    const result = await client.predict("/process_media_unified", apiParams);
    console.log('✅ Method 1 SUCCESS! API call completed');

    console.log('✅ PupilSense analysis complete:', {
      hasData: !!result.data,
      dataLength: result.data?.length,
      resultType: typeof result.data
    });

    return {
      success: true,
      data: {
        results: result.data,
        metadata: {
          timestamp: new Date().toISOString(),
          pupilSelection: data.pupil_selection || "both",
          tvModel: data.tv_model || "ResNet18",
          blinkDetection: data.blink_detection !== undefined ? data.blink_detection : true
        }
      }
    };

  } catch (error) {
    console.error('❌ Base64 direct approach failed:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

async function testWithSampleVideo() {
  console.log('🧪 Testing Base64 Direct Approach');
  console.log('=' .repeat(50));

  try {
    // Use the specific video file from assets
    const videoFile = '../assets/sample_video_txa.mp4';
    const videoPath = path.resolve(__dirname, videoFile);
    
    console.log(`📹 Looking for video file: ${videoPath}`);
    
    if (!fs.existsSync(videoPath)) {
      console.log('❌ Video file not found at:', videoPath);
      return;
    }

    console.log(`✅ Found video file: ${videoFile}`);
    
    const videoBuffer = fs.readFileSync(videoPath);
    const fileSizeMB = videoBuffer.length / (1024 * 1024);

    console.log(`📊 Video file size: ${fileSizeMB.toFixed(2)} MB`);

    // Convert to base64 data URL
    const base64Video = videoBuffer.toString('base64');
    const dataUrl = `data:video/mp4;base64,${base64Video}`;
    
    const testData = {
      video_input: dataUrl,
      pupil_selection: 'both',
      tv_model: 'ResNet18',
      blink_detection: true
    };

    console.log('🚀 Processing with base64 direct approach...');
    console.log('📋 Test parameters:', {
      pupil_selection: testData.pupil_selection,
      tv_model: testData.tv_model,
      blink_detection: testData.blink_detection,
      dataUrlLength: dataUrl.length
    });

    const startTime = Date.now();
    const result = await testBase64Direct(testData);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n⏱️  Processing completed in ${(duration/1000).toFixed(2)} seconds`);
    console.log('📊 Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS! Base64 direct approach worked!');
      
      if (result.data && result.data.results) {
        console.log('📈 Analysis results available');
        console.log('📝 Results:', result.data.results);
      }
    } else {
      console.log('\n❌ FAILED! Base64 direct approach failed');
      console.log('🚨 Error:', result.error);
    }

  } catch (error) {
    console.error('💥 Error in test:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

async function main() {
  console.log('🔧 Base64 Direct Approach Test');
  console.log('🎯 Testing Updated PupilSense API');
  console.log('=' .repeat(60));

  await testWithSampleVideo();

  console.log('\n🏁 Testing Complete!');
  console.log('💡 This test uses the updated API that supports base64 input directly');
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testBase64Direct };
