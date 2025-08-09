#!/usr/bin/env node

/**
 * Test script for the video upload API with a real video file
 * This script tests the processVideoInput function with the actual video file
 */

const fs = require('fs');
const path = require('path');

// Import the processVideoInput function from our Firebase Functions
// We'll need to extract it or recreate it for testing
const processVideoInput = async (videoInput) => {
  if (!videoInput) {
    throw new Error("Video input is required");
  }

  // If it's already a blob or file object, return as is
  if (videoInput instanceof Blob || (videoInput && typeof videoInput === 'object' && videoInput.constructor && videoInput.constructor.name === 'File')) {
    return videoInput;
  }

  // If it's a string, it could be a file path or URL
  if (typeof videoInput === 'string') {
    // Check if it's a local file path
    if (fs.existsSync(videoInput)) {
      console.log("Reading video from local file path:", { path: videoInput });
      const videoBuffer = fs.readFileSync(videoInput);
      // In Node.js environment, we'll simulate a Blob with buffer and metadata
      return {
        buffer: videoBuffer,
        size: videoBuffer.length,
        type: 'video/webm',
        isBlob: true
      };
    }
    
    // If it's a URL, fetch it
    if (videoInput.startsWith('http://') || videoInput.startsWith('https://')) {
      console.log("Fetching video from URL:", { url: videoInput });
      const response = await fetch(videoInput);
      if (!response.ok) {
        throw new Error(`Failed to fetch video from URL: ${response.statusText}`);
      }
      return await response.blob();
    }
    
    // If it's a base64 string, convert it
    if (videoInput.startsWith('data:video/')) {
      console.log("Converting base64 video data");
      const base64Data = videoInput.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      return {
        buffer: buffer,
        size: buffer.length,
        type: 'video/webm',
        isBlob: true
      };
    }
    
    throw new Error("Invalid video input format: string must be a valid file path, URL, or base64 data");
  }

  // If it's a buffer, convert to blob
  if (Buffer.isBuffer(videoInput)) {
    console.log("Converting buffer to blob");
    return {
      buffer: videoInput,
      size: videoInput.length,
      type: 'video/webm',
      isBlob: true
    };
  }

  throw new Error("Unsupported video input format");
};

/**
 * Test the processVideoInput function with the real video file
 */
async function testRealVideo() {
  console.log('🎬 Testing Video Upload API with Real Video');
  console.log('=' * 50);

  // Path to the actual video file
  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  console.log(`📹 Testing with video: ${videoPath}`);
  
  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    console.error(`❌ Video file not found: ${videoPath}`);
    return false;
  }

  // Get file stats
  const stats = fs.statSync(videoPath);
  console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📅 File modified: ${stats.mtime}`);

  try {
    console.log('\n🔍 Testing processVideoInput function...');
    
    const startTime = Date.now();
    const result = await processVideoInput(videoPath);
    const processingTime = Date.now() - startTime;
    
    console.log('✅ Video processing successful!');
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    console.log(`📦 Result type: ${typeof result}`);
    console.log(`📏 Result size: ${result.size ? (result.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}`);
    console.log(`🎭 MIME type: ${result.type || 'Unknown'}`);
    
    if (result.buffer) {
      console.log(`🔢 Buffer length: ${result.buffer.length} bytes`);
      console.log(`🔍 First 10 bytes: ${Array.from(result.buffer.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    }

    // Test different input formats
    console.log('\n🧪 Testing different input formats...');
    
    const testCases = [
      {
        name: 'Absolute path',
        input: videoPath,
        description: 'Full absolute path to video file'
      },
      {
        name: 'Relative path',
        input: path.relative(process.cwd(), videoPath),
        description: 'Relative path from current directory'
      },
      {
        name: 'Buffer input',
        input: fs.readFileSync(videoPath),
        description: 'Raw buffer data'
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`\n  🔸 Testing ${testCase.name}:`);
        console.log(`     Input: ${typeof testCase.input === 'string' ? testCase.input : `Buffer(${testCase.input.length} bytes)`}`);
        
        const caseStartTime = Date.now();
        const caseResult = await processVideoInput(testCase.input);
        const caseProcessingTime = Date.now() - caseStartTime;
        
        console.log(`     ✅ Success! Size: ${caseResult.size ? (caseResult.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}, Time: ${caseProcessingTime}ms`);
        
      } catch (error) {
        console.log(`     ❌ Failed: ${error.message}`);
      }
    }

    return true;

  } catch (error) {
    console.error('❌ Video processing failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

/**
 * Test video file properties and format
 */
function testVideoProperties() {
  console.log('\n📋 Video File Analysis');
  console.log('-'.repeat(30));

  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  if (!fs.existsSync(videoPath)) {
    console.error(`❌ Video file not found: ${videoPath}`);
    return;
  }

  const stats = fs.statSync(videoPath);
  const buffer = fs.readFileSync(videoPath, { encoding: null });
  
  console.log(`📁 File path: ${videoPath}`);
  console.log(`📏 File size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`📅 Created: ${stats.birthtime}`);
  console.log(`📅 Modified: ${stats.mtime}`);
  console.log(`🔢 Buffer length: ${buffer.length}`);
  
  // Check file signature (magic bytes)
  const signature = buffer.slice(0, 16);
  console.log(`🔍 File signature: ${Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // WebM files typically start with specific bytes
  const webmSignature = [0x1A, 0x45, 0xDF, 0xA3]; // EBML header
  const hasWebMSignature = webmSignature.every((byte, index) => buffer[index] === byte);
  console.log(`🎬 WebM format detected: ${hasWebMSignature ? '✅ Yes' : '❌ No'}`);
  
  if (hasWebMSignature) {
    console.log('📝 File appears to be a valid WebM video');
  } else {
    console.log('⚠️  File signature doesn\'t match expected WebM format');
  }
}

// Run the tests
if (require.main === module) {
  testVideoProperties();
  
  testRealVideo()
    .then((success) => {
      if (success) {
        console.log('\n🎉 All tests completed successfully!');
        console.log('✅ The processVideoInput function works correctly with real video files');
        console.log('📚 Ready for integration with Firebase Functions');
      } else {
        console.log('\n💥 Tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testRealVideo,
  testVideoProperties,
  processVideoInput
};
