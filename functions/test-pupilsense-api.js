#!/usr/bin/env node

/**
 * Test the actual PupilSense API endpoints based on the gradio_app.py structure
 */

const fs = require('fs');

async function testPupilSenseAPI() {
  console.log('🎬 Testing PupilSense API with Real Functions');
  console.log('='.repeat(50));

  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  console.log(`📹 Video: ${videoPath.split('/').pop()}`);
  console.log(`📏 Size: ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(2)} MB`);

  try {
    // Import Gradio client from the functions directory
    console.log('\n🔌 Loading Gradio client...');
    const gradioModule = await import("@gradio/client");
    const Client = gradioModule.Client;
    
    // Try connecting to different spaces
    const spacesToTry = [
      "txarst/pupillometry",
      "vijulshah/pupilsense"
    ];
    
    let client = null;
    let connectedSpace = null;
    
    for (const space of spacesToTry) {
      try {
        console.log(`🌐 Trying to connect to ${space}...`);
        client = await Client.connect(space);
        connectedSpace = space;
        console.log(`✅ Connected to ${space}!`);
        break;
      } catch (error) {
        console.log(`❌ Failed to connect to ${space}: ${error.message}`);
      }
    }
    
    if (!client) {
      console.log('\n🏠 Trying local connection (localhost:7860)...');
      try {
        client = await Client.connect("http://localhost:7860");
        connectedSpace = "localhost:7860";
        console.log('✅ Connected to local instance!');
      } catch (localError) {
        return { success: false, error: 'Could not connect to any PupilSense instance' };
      }
    }
    
    console.log(`\n📋 Connected to: ${connectedSpace}`);
    
    // Read video file
    console.log('\n📖 Reading video file...');
    const videoBuffer = fs.readFileSync(videoPath);
    const videoBlob = new Blob([videoBuffer], { type: 'video/webm' });
    console.log(`📦 Created blob: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Test the actual API functions based on gradio_app.py
    const testFunctions = [
      {
        name: "process_media_unified",
        description: "Unified function for both images and videos",
        params: [videoBlob, "both", "ResNet18", true]
      },
      {
        name: "process_video_simple", 
        description: "Video-specific processing function",
        params: [videoBlob, "both", "ResNet18", true]
      }
    ];
    
    for (const testFunc of testFunctions) {
      console.log(`\n🔍 Testing ${testFunc.name}:`);
      console.log(`   📝 ${testFunc.description}`);
      
      try {
        console.log('   📤 Making API call...');
        const startTime = Date.now();
        
        const result = await client.predict(testFunc.name, ...testFunc.params);
        
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ SUCCESS! (${duration}ms)`);
        console.log(`   📊 Response type: ${typeof result.data}`);
        console.log(`   📊 Is array: ${Array.isArray(result.data)}`);
        
        if (Array.isArray(result.data)) {
          console.log(`   📊 Array length: ${result.data.length}`);
          result.data.forEach((item, i) => {
            const type = typeof item;
            let preview = '';
            
            if (type === 'string') {
              preview = item.length > 100 ? item.substring(0, 100) + '...' : item;
            } else if (type === 'object' && item !== null) {
              preview = `{${Object.keys(item).join(', ')}}`;
            } else {
              preview = String(item);
            }
            
            console.log(`   📊 [${i}] ${type}: ${preview}`);
          });
        }
        
        console.log('\n📋 FULL RESPONSE:');
        console.log(JSON.stringify(result.data, null, 2));
        
        return { 
          success: true, 
          function: testFunc.name, 
          data: result.data,
          processingTime: duration,
          space: connectedSpace
        };
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        
        // Try with different parameter formats
        if (testFunc.name === "process_media_unified") {
          console.log('   🔄 Trying with file object format...');
          try {
            // Create a file-like object
            const fileObj = {
              name: videoPath,
              type: 'video/webm',
              size: videoBlob.size
            };
            
            const result2 = await client.predict(testFunc.name, fileObj, "both", "ResNet18", true);
            console.log('   ✅ SUCCESS with file object format!');
            console.log('\n📋 RESPONSE:');
            console.log(JSON.stringify(result2.data, null, 2));
            
            return { 
              success: true, 
              function: testFunc.name, 
              format: 'file_object',
              data: result2.data,
              space: connectedSpace
            };
            
          } catch (error2) {
            console.log(`   ❌ Also failed with file object: ${error2.message}`);
          }
        }
      }
    }
    
    return { success: false, error: 'All API functions failed' };
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test with different parameter combinations
async function testParameterVariations() {
  console.log('\n🧪 Testing Parameter Variations');
  console.log('='.repeat(40));
  
  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  try {
    const gradioModule = await import("@gradio/client");
    const Client = gradioModule.Client;
    
    // Try local first, then remote
    let client;
    try {
      client = await Client.connect("http://localhost:7860");
      console.log('🏠 Connected to local instance');
    } catch {
      client = await Client.connect("txarst/pupillometry");
      console.log('🌐 Connected to remote space');
    }
    
    const videoBuffer = fs.readFileSync(videoPath);
    const videoBlob = new Blob([videoBuffer], { type: 'video/webm' });
    
    // Test different parameter combinations
    const parameterTests = [
      {
        name: 'Both pupils, ResNet18',
        params: [videoBlob, "both", "ResNet18", true]
      },
      {
        name: 'Left pupil only',
        params: [videoBlob, "left_pupil", "ResNet18", true]
      },
      {
        name: 'Right pupil only', 
        params: [videoBlob, "right_pupil", "ResNet18", true]
      },
      {
        name: 'ResNet50 model',
        params: [videoBlob, "both", "ResNet50", true]
      },
      {
        name: 'No blink detection',
        params: [videoBlob, "both", "ResNet18", false]
      }
    ];
    
    console.log('🎯 Using process_media_unified function');
    
    for (const test of parameterTests) {
      console.log(`\n🔸 Testing: ${test.name}`);
      
      try {
        const result = await client.predict("process_media_unified", ...test.params);
        console.log(`   ✅ Success! Response type: ${typeof result.data}`);
        
        if (Array.isArray(result.data) && result.data.length > 0) {
          console.log(`   📊 Array with ${result.data.length} items`);
          if (typeof result.data[0] === 'string') {
            console.log(`   🔗 First item preview: ${result.data[0].substring(0, 50)}...`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Parameter variation test failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  testPupilSenseAPI()
    .then(async (result) => {
      if (result.success) {
        console.log('\n🎉 API test successful!');
        console.log(`✅ Working function: ${result.function}`);
        console.log(`✅ Connected to: ${result.space}`);
        if (result.processingTime) {
          console.log(`⏱️  Processing time: ${result.processingTime}ms`);
        }
        
        // Run parameter variation tests if we have a working connection
        await testParameterVariations();
        
      } else {
        console.log('\n💥 API test failed!');
        console.log(`❌ Error: ${result.error}`);
      }
    })
    .catch(error => {
      console.error('💥 Test script failed:', error);
    });
}

module.exports = {
  testPupilSenseAPI,
  testParameterVariations
};
