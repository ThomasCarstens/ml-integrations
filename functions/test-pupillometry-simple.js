#!/usr/bin/env node

/**
 * Simple direct test of txarst/pupillometry API endpoints
 * No Firebase, just pure Gradio client testing
 */

const fs = require('fs');

async function testPupillometryAPI() {
  console.log('🎬 Testing txarst/pupillometry API Directly');
  console.log('='.repeat(50));

  const videoPath = '/home/thermistor/Documents/biosignalapp/pupilsense_hf_deploy/sample_videos/AllSmilesAhead.webm';
  
  console.log(`📹 Video: ${videoPath.split('/').pop()}`);
  console.log(`📏 Size: ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(2)} MB`);

  try {
    // Import Gradio client
    console.log('\n🔌 Loading Gradio client...');
    const gradioModule = await import("@gradio/client");
    const Client = gradioModule.Client;
    
    // Try different spaces
    const spacesToTry = [
      "txarst/pupillometry",
      "vijulshah/pupilsense",
      "pupilsense/pupillometry"
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
      return { success: false, error: 'Could not connect to any pupillometry space' };
    }
    
    console.log(`\n📋 Connected to: ${connectedSpace}`);

    // Check for endpoints in different ways
    let endpoints = [];

    if (client.endpoints) {
      endpoints = Object.keys(client.endpoints);
    } else if (client.api_info) {
      endpoints = Object.keys(client.api_info);
    } else if (client.config && client.config.dependencies) {
      // Try to extract from config
      const deps = client.config.dependencies;
      endpoints = deps.map(dep => `/${dep.api_name || dep.fn_index}`).filter(Boolean);
    }

    console.log('\n📋 Available endpoints:');
    if (endpoints.length === 0) {
      console.log('   ❌ No endpoints found!');
      console.log('   🔍 Checking client structure...');
      console.log('   📊 Has api_info:', !!client.api_info);
      console.log('   📊 Has config:', !!client.config);
      if (client.config) {
        console.log('   📊 Config keys:', Object.keys(client.config));
      }
    } else {
      endpoints.forEach(ep => console.log(`   ${ep}`));
    }
    
    // Read video file
    console.log('\n📖 Reading video file...');
    const videoBuffer = fs.readFileSync(videoPath);
    const videoBlob = new Blob([videoBuffer], { type: 'video/webm' });
    console.log(`📦 Created blob: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
    
    // If no endpoints found, let's try some common ones anyway
    if (endpoints.length === 0) {
      console.log('\n🔍 No endpoints detected, trying common patterns...');

      // Try to call the space directly without specific endpoint
      try {
        console.log('📤 Trying direct predict call...');
        const directResult = await client.predict(videoBlob, "both", "ResNet18", true);
        console.log('✅ Direct predict worked!');
        console.log('📋 Response:', JSON.stringify(directResult.data, null, 2));
        return { success: true, endpoint: 'direct', data: directResult.data };
      } catch (directError) {
        console.log(`❌ Direct predict failed: ${directError.message}`);
      }

      return { success: false, error: 'No endpoints available and direct call failed' };
    }

    // Test endpoints one by one
    const testEndpoints = [
      "/process_media_unified",
      "/process_video_simple",
      "/predict_1",
      "/predict"
    ];

    for (const endpoint of testEndpoints) {
      if (!endpoints.includes(endpoint)) {
        console.log(`\n⏭️  ${endpoint} - Not available`);
        continue;
      }
      
      console.log(`\n🔍 Testing ${endpoint}:`);
      
      try {
        // Test with video_input
        console.log('   📤 Using video_input parameter...');
        const params = {
          video_input: videoBlob,
          pupil_selection: "both",
          tv_model: "ResNet18",
          blink_detection: true
        };
        
        const startTime = Date.now();
        const result = await client.predict(endpoint, params);
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ SUCCESS! (${duration}ms)`);
        console.log(`   📊 Response type: ${typeof result.data}`);
        console.log(`   📊 Is array: ${Array.isArray(result.data)}`);
        
        if (Array.isArray(result.data)) {
          console.log(`   📊 Array length: ${result.data.length}`);
          result.data.forEach((item, i) => {
            const type = typeof item;
            const preview = type === 'string' ? 
              (item.length > 50 ? item.substring(0, 50) + '...' : item) : 
              type === 'object' ? `{${Object.keys(item || {}).join(', ')}}` : 
              String(item);
            console.log(`   📊 [${i}] ${type}: ${preview}`);
          });
        }
        
        console.log('\n📋 FULL RESPONSE:');
        console.log(JSON.stringify(result.data, null, 2));
        
        return { success: true, endpoint, data: result.data };
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        
        // If this is the unified endpoint, try media_input
        if (endpoint === "/process_media_unified") {
          try {
            console.log('   📤 Trying media_input parameter...');
            const params2 = {
              media_input: videoBlob,
              pupil_selection: "both",
              tv_model: "ResNet18", 
              blink_detection: true
            };
            
            const result2 = await client.predict(endpoint, params2);
            console.log('   ✅ SUCCESS with media_input!');
            console.log('\n📋 RESPONSE:');
            console.log(JSON.stringify(result2.data, null, 2));
            
            return { success: true, endpoint, parameter: 'media_input', data: result2.data };
            
          } catch (error2) {
            console.log(`   ❌ Also failed with media_input: ${error2.message}`);
          }
        }
      }
    }
    
    // If we get here, try testing any available endpoints
    console.log('\n🔍 Testing any available endpoints...');
    for (const endpoint of endpoints) {
      console.log(`\n🧪 Testing ${endpoint}:`);
      try {
        const result = await client.predict(endpoint, {
          video_input: videoBlob,
          pupil_selection: "both",
          tv_model: "ResNet18",
          blink_detection: true
        });
        console.log('✅ SUCCESS!');
        console.log('📋 Response:', JSON.stringify(result.data, null, 2));
        return { success: true, endpoint, data: result.data };
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }

    return { success: false, error: 'All endpoints failed' };
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testPupillometryAPI()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 SUCCESS!');
        console.log(`✅ Working endpoint: ${result.endpoint}`);
        if (result.parameter) {
          console.log(`✅ Working parameter: ${result.parameter}`);
        }
      } else {
        console.log('\n💥 FAILED!');
        console.log(`❌ Error: ${result.error}`);
      }
    })
    .catch(error => {
      console.error('💥 Script error:', error);
    });
}

module.exports = { testPupillometryAPI };
