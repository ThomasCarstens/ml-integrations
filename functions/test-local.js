#!/usr/bin/env node

/**
 * Local test script for Firebase Functions
 * Run with: node test-local.js
 */

const fs = require('fs');
const path = require('path');

// Mock Firebase Functions environment
process.env.FUNCTIONS_EMULATOR = 'true';

// We need to test the core logic directly, not the Firebase callable wrapper
// Let's extract the core logic from the Firebase function

// Import required modules for direct testing
const { Blob } = require('buffer');

// Mock logger for testing
const logger = {
  info: (...args) => console.log('📋 LOG:', ...args),
  error: (...args) => console.error('🚨 ERROR:', ...args),
  warn: (...args) => console.warn('⚠️  WARN:', ...args)
};

// Core function logic extracted from index.js
async function testPupilAnalysisCore(data) {
  console.log('🔧 Starting core analysis logic...');

  try {
    // Initialize Gradio client (from index.js)
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
      // Convert blob to buffer for direct upload
      const buffer = await videoBlob.arrayBuffer();
      const bufferData = Buffer.from(buffer);

      // Determine file extension based on blob type
      const blobType = videoBlob.type || 'video/mp4';
      const extension = blobType.includes('webm') ? 'webm' :
                       blobType.includes('quicktime') ? 'mov' :
                       blobType.includes('x-msvideo') ? 'avi' : 'mp4';

      console.log('📋 Preparing file for Gradio upload:', {
        size: bufferData.length,
        type: blobType,
        extension: extension
      });

      // Try to use Gradio's file upload if available
      try {
        console.log('🔍 Buffer data info:', {
          bufferExists: !!bufferData,
          bufferLength: bufferData ? bufferData.length : 'undefined',
          bufferType: typeof bufferData
        });

        // Create a proper file-like object that Gradio can understand
        console.log('📤 Creating file-like object for Gradio');

        if (!bufferData) {
          throw new Error('Buffer data is undefined');
        }

        // Try writing to temp file and let Gradio handle FileData creation
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `gradio_test_${Date.now()}.${extension}`);

        console.log('📁 Writing to temporary file:', tempFilePath);
        fs.writeFileSync(tempFilePath, bufferData);

        console.log('✅ File written successfully:', {
          path: tempFilePath,
          exists: fs.existsSync(tempFilePath),
          size: fs.statSync(tempFilePath).size
        });

        // Try different approaches to see which one preserves the file extension
        console.log('🧪 Testing different file input approaches...');

        // Approach 1: Direct file path (this might work better)
        console.log('� Approach 1: Using direct file path');
        console.log('🔍 File path details:', {
          path: tempFilePath,
          extension: path.extname(tempFilePath),
          basename: path.basename(tempFilePath)
        });

        // Create File object with simple filename (not full path)
        // The API needs file.name to have the correct extension
        try {
          const fileData = fs.readFileSync(tempFilePath);

          // Use a simple filename with correct extension
          const simpleFileName = `video.${extension}`;
          const file = new File([fileData], simpleFileName, {
            type: blobType,
            lastModified: Date.now()
          });

          console.log('✅ File object with simple name created:', {
            name: file.name,
            size: file.size,
            type: file.type,
            nameExtension: path.extname(file.name),
            expectedExtension: extension
          });

          // Test extension extraction like the API does
          const apiExtraction = file.name.split('.').pop();
          console.log('🔍 API extension extraction test:', {
            fileName: file.name,
            extractedExtension: apiExtraction,
            isVideo: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'].includes(apiExtraction.toLowerCase())
          });

          mediaInput = file;

        } catch (fileError) {
          console.log('❌ File creation failed:', fileError.message);
          mediaInput = tempFilePath;
        }

        console.log('✅ File prepared for Gradio:', {
          type: typeof mediaInput,
          hasData: !!mediaInput,
          mediaInputKeys: mediaInput ? Object.keys(mediaInput) : 'undefined'
        });

      } catch (uploadError) {
        console.error('❌ File upload preparation failed:', {
          error: uploadError.message,
          stack: uploadError.stack,
          bufferData: !!bufferData
        });
        throw new Error(`Failed to prepare file for upload: ${uploadError.message}`);
      }
    }

    // Call the API (from index.js)
    console.log('🚀 Calling PupilSense API...');
    console.log('📋 Parameters:', {
      mediaInput: typeof mediaInput === 'object' ? mediaInput.name || 'object' : mediaInput,
      pupil_selection: data.pupil_selection || "both",
      tv_model: data.tv_model || "ResNet18",
      blink_detection: data.blink_detection !== undefined ? data.blink_detection : true
    });

    // Try different API call approaches
    let result;
    const apiParams = {
      media_input: mediaInput,
      pupil_selection: data.pupil_selection || "both",
      tv_model: data.tv_model || "ResNet18",
      blink_detection: data.blink_detection !== undefined ? data.blink_detection : true
    };

    console.log('🎯 Focusing on Method 1 - /process_media_unified endpoint');

    try {
      // Method 1: Using endpoint name with proper FileData structure
      console.log('📞 Calling /process_media_unified endpoint');
      console.log('📋 MediaInput details:', {
        name: mediaInput.name,
        size: mediaInput.size,
        type: mediaInput.type,
        hasMeta: !!mediaInput.meta,
        metaType: mediaInput.meta?._type
      });

      result = await client.predict("/process_media_unified", apiParams);
      console.log('✅ Method 1 SUCCESS! API call completed');

    } catch (error1) {
      console.log('❌ Method 1 failed:', error1.message);
      console.log('🔍 Detailed error info:', {
        errorName: error1.name,
        errorMessage: error1.message,
        mediaInputStructure: {
          type: typeof mediaInput,
          keys: Object.keys(mediaInput),
          hasRequiredMeta: mediaInput.meta?._type === 'gradio.FileData'
        }
      });

      try {
        // Method 2: Try with function index (using positional args)
        console.log('📞 Method 2: Using function index');
        result = await client.predict(2, {
          media_input: mediaInput,
          pupil_selection: data.pupil_selection || "both",
          tv_model: data.tv_model || "ResNet18",
          blink_detection: data.blink_detection !== undefined ? data.blink_detection : true
        });
      } catch (error2) {
        console.log('❌ Method 2 failed:', error2.message);

        try {
          // Method 3: Try with different endpoint
          console.log('📞 Method 3: Using /predict endpoint');
          result = await client.predict("/predict", {
            media_input: mediaInput,
            pupil_selection: data.pupil_selection || "both",
            tv_model: data.tv_model || "ResNet18",
            blink_detection: data.blink_detection !== undefined ? data.blink_detection : true
          });

        } catch (error3) {
          console.log('❌ Method 3 failed:', error3.message);
          throw new Error(`All API methods failed. Last error: ${error3.message}`);
        }
      }
    }

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
    console.error('❌ Core analysis failed:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

async function testWithSampleVideo() {
  console.log('🧪 Testing Firebase Function Locally');
  console.log('=' .repeat(50));

  try {
    // Create a small test video file (or use an existing one)
    const testVideoPath = './test-video.webm';
    
    // Check if test video exists
    if (!fs.existsSync(testVideoPath)) {
      console.log('📹 Creating dummy test video file...');
      // Create a small dummy file for testing
      const dummyVideoData = Buffer.from('WEBM dummy data for testing', 'utf8');
      fs.writeFileSync(testVideoPath, dummyVideoData);
      console.log('✅ Created dummy test video file');
    }

    // Read the test video
    console.log('📖 Reading test video file...');
    const videoBuffer = fs.readFileSync(testVideoPath);
    const base64Video = videoBuffer.toString('base64');
    
    console.log(`📊 Video file size: ${(videoBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`📊 Base64 size: ${(base64Video.length / 1024).toFixed(2)} KB`);

    // Create test data in the same format as the app
    const testData = {
      video_input: `data:video/webm;base64,${base64Video}`,
      pupil_selection: 'both',
      tv_model: 'ResNet18',
      blink_detection: true
    };

    console.log('\n🚀 Calling core analysis function...');
    console.log('📋 Test parameters:', {
      pupil_selection: testData.pupil_selection,
      tv_model: testData.tv_model,
      blink_detection: testData.blink_detection,
      video_size: `${(base64Video.length / 1024).toFixed(2)} KB`
    });

    const startTime = Date.now();

    // Call the core function directly
    const result = await testPupilAnalysisCore(testData);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n⏱️  Function completed in ${duration}ms`);
    console.log('📊 Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS! Function executed without errors');
      
      if (result.data && result.data.results) {
        console.log('📈 Analysis results available');
        console.log('🔗 Analysis URL:', result.data.analysisUrl || 'None');
        console.log('📝 Summary:', result.data.summary || 'None');
      }
    } else {
      console.log('\n❌ FUNCTION FAILED');
      console.log('🚨 Error:', result.error);
      console.log('📋 Details:', result.details);
    }

  } catch (error) {
    console.log('\n💥 EXCEPTION CAUGHT');
    console.error('🚨 Error:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

async function testWithRealVideo() {
  console.log('\n🎬 Testing with Real Video File');
  console.log('=' .repeat(50));

  // Use the specific video file from assets
  const videoFile = '../assets/sample_video_txa.mp4';
  const videoPath = path.resolve(__dirname, videoFile);

  console.log(`📹 Looking for video file: ${videoPath}`);

  if (!fs.existsSync(videoPath)) {
    console.log('❌ Video file not found at:', videoPath);
    console.log('💡 Make sure sample_video_txa.mp4 exists in the assets directory');

    // Also check current directory as fallback
    const currentDir = process.cwd();
    const localVideoPath = path.join(currentDir, 'sample_video_txa.mp4');

    if (fs.existsSync(localVideoPath)) {
      console.log('✅ Found video file in current directory instead');
      return testWithSpecificVideo(localVideoPath);
    }

    return;
  }

  console.log(`✅ Found video file: ${videoFile}`);
  return testWithSpecificVideo(videoPath);
}

async function testWithSpecificVideo(videoPath) {

  try {
    const videoBuffer = fs.readFileSync(videoPath);
    const fileSizeMB = videoBuffer.length / (1024 * 1024);

    console.log(`📊 Video file size: ${fileSizeMB.toFixed(2)} MB`);
    console.log(`📂 Video path: ${videoPath}`);

    if (fileSizeMB > 10) {
      console.log('⚠️  Large file detected. This might take a while...');
    }

    // Detect video format from the file path
    const extension = path.extname(videoPath).toLowerCase();
    const mimeType = extension === '.webm' ? 'video/webm' :
                    extension === '.mov' ? 'video/quicktime' :
                    extension === '.avi' ? 'video/x-msvideo' : 'video/mp4';

    console.log('📋 Detected format:', mimeType);
    console.log('🔄 Converting to base64...');

    const base64Video = videoBuffer.toString('base64');
    const base64SizeMB = (base64Video.length / 1024 / 1024);

    console.log(`📊 Base64 size: ${base64SizeMB.toFixed(2)} MB`);

    const testData = {
      video_input: `data:${mimeType};base64,${base64Video}`,
      pupil_selection: 'both',
      tv_model: 'ResNet18',
      blink_detection: true
    };

    console.log('🚀 Processing sample_video_txa.mp4...');
    console.log('📋 Test parameters:', {
      pupil_selection: testData.pupil_selection,
      tv_model: testData.tv_model,
      blink_detection: testData.blink_detection,
      detected_format: mimeType
    });

    const startTime = Date.now();
    const result = await testPupilAnalysisCore(testData);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n⏱️  Processing completed in ${(duration/1000).toFixed(2)} seconds`);
    console.log('📊 Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS! Real video processed successfully');
    } else {
      console.log('\n❌ FAILED! Real video processing failed');
      console.log('🚨 Error:', result.error);
    }

  } catch (error) {
    console.error('💥 Error processing sample_video_txa.mp4:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

async function main() {
  console.log('🔧 Firebase Functions Local Test');
  console.log('🎯 Testing PupilSense Analysis Function');
  console.log('=' .repeat(60));

  // Test 1: Basic functionality with dummy data
  await testWithSampleVideo();

  // Test 2: Real video file if available
  await testWithRealVideo();

  console.log('\n🏁 Testing Complete!');
  console.log('💡 Tips:');
  console.log('  - Place a real video file in the functions directory for more realistic testing');
  console.log('  - Check the console output for detailed debugging information');
  console.log('  - Modify test parameters in this file as needed');
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWithSampleVideo, testWithRealVideo };
