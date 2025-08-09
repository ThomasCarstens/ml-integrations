/**
 * Firebase Functions for Chatterbox TTS
 * Direct integration with Chatterbox API using Gradio client
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fs = require('fs');
const path = require('path');
const os = require('os');

// For cost control, set maximum number of containers
setGlobalOptions({ maxInstances: 10 });

// Import Gradio client dynamically since it's an ES module
let Client;
const initGradioClient = async () => {
  if (!Client) {
    const gradioModule = await import("@gradio/client");
    Client = gradioModule.Client;
  }
  return Client;
};

/**
 * Helper function to convert video input to blob format
 * Handles local file paths, URLs, and existing blob data
 */
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
      logger.info("Reading video from local file path:", { path: videoInput });
      const videoBuffer = fs.readFileSync(videoInput);

      // Create a simple Blob like in our successful test
      const blob = new Blob([videoBuffer], { type: 'video/webm' });

      logger.info("Created video blob from local file:", {
        size: blob.size,
        type: blob.type
      });

      return blob;
    }

    // If it's a URL, fetch it
    if (videoInput.startsWith('http://') || videoInput.startsWith('https://')) {
      logger.info("Fetching video from URL:", { url: videoInput });
      const response = await fetch(videoInput);
      if (!response.ok) {
        throw new Error(`Failed to fetch video from URL: ${response.statusText}`);
      }
      return await response.blob();
    }

    // If it's a base64 string, convert it
    if (videoInput.startsWith('data:video/')) {
      logger.info("Converting base64 video data");

      // Extract MIME type from data URL
      const mimeTypeMatch = videoInput.match(/data:([^;]+)/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'video/mp4';

      const base64Data = videoInput.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      // Create a blob with the correct MIME type
      const blob = new Blob([buffer], { type: mimeType });

      logger.info("Created video blob:", {
        size: blob.size,
        type: blob.type,
        detectedMimeType: mimeType
      });

      return blob;
    }

    throw new Error("Invalid video input format: string must be a valid file path, URL, or base64 data");
  }

  // If it's a buffer, convert to blob
  if (Buffer.isBuffer(videoInput)) {
    logger.info("Converting buffer to blob");
    return new Blob([videoInput], { type: 'video/mp4' });
  }

  throw new Error("Unsupported video input format");
};

/**
 * Firebase Function to handle TTS generation requests
 * Direct integration with Chatterbox API using Gradio client
 */
exports.generateTTS = onCall(async (request) => {
  try {
    const { data } = request;

    // Validate input
    if (!data || !data.text_input) {
      throw new Error("Missing required field: text_input");
    }

    if (data.text_input.trim().length === 0) {
      throw new Error("Text input cannot be empty");
    }

    if (data.text_input.trim().length > 300) {
      throw new Error("Text must be 300 characters or less");
    }

    logger.info("TTS request received", {
      textLength: data.text_input.length,
      hasExaggeration: !!data.exaggeration_input,
      hasTemperature: !!data.temperature_input
    });

    // Initialize Gradio client
    const GradioClient = await initGradioClient();

    // Get example audio file for reference
    const response_0 = await fetch("https://github.com/gradio-app/gradio/raw/main/test/test_files/audio_sample.wav");
    const exampleAudio = await response_0.blob();

    logger.info("Connecting to Chatterbox client...");

    // Connect to the Chatterbox client
    const client = await GradioClient.connect("ResembleAI/Chatterbox");

    logger.info("Generating TTS audio...", { text: data.text_input.trim() });

    // Generate TTS audio
    const result = await client.predict("/generate_tts_audio", {
      text_input: data.text_input.trim(),
      audio_prompt_path_input: exampleAudio,
      exaggeration_input: data.exaggeration_input || 0.5,
      temperature_input: data.temperature_input || 0.8,
      seed_num_input: data.seed_num_input || 0,
      cfgw_input: data.cfgw_input || 0.5,
    });

    logger.info("TTS Result received", {
      hasData: !!result.data,
      dataLength: result.data?.length
    });

    // The result should contain audio data
    if (!result.data || !result.data[0]) {
      throw new Error('No audio data received from Chatterbox API');
    }

    // Extract audio data
    const audioData = result.data[0];
    let audioUrl;

    if (typeof audioData === 'string') {
      audioUrl = audioData;
    } else if (audioData.url) {
      audioUrl = audioData.url;
    } else if (audioData.path) {
      audioUrl = audioData.path;
    } else {
      throw new Error('Invalid audio data format received from Chatterbox API');
    }

    logger.info("TTS generation successful", {
      hasAudioUrl: !!audioUrl
    });

    return {
      success: true,
      data: {
        audioUrl: audioUrl,
        metadata: {
          text: data.text_input.trim(),
          exaggeration: data.exaggeration_input || 0.5,
          temperature: data.temperature_input || 0.8,
          seed: data.seed_num_input || 0,
          cfgw: data.cfgw_input || 0.5,
          timestamp: new Date().toISOString()
        }
      }
    };

  } catch (error) {
    logger.error("TTS generation failed", {
      error: error.message,
      stack: error.stack
    });

    // Return error in a format the client can handle
    return {
      success: false,
      error: error.message || "Unknown error occurred",
      details: error.stack || null
    };
  }
});

/**
 * HTTP endpoint version for testing
 */
exports.generateTTSHttp = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { text_input, exaggeration_input, temperature_input, seed_num_input, cfgw_input } = req.body;

    if (!text_input) {
      res.status(400).json({ error: "Missing required field: text_input" });
      return;
    }

    if (text_input.trim().length === 0) {
      res.status(400).json({ error: "Text input cannot be empty" });
      return;
    }

    if (text_input.trim().length > 300) {
      res.status(400).json({ error: "Text must be 300 characters or less" });
      return;
    }

    logger.info("HTTP TTS request received", { textLength: text_input.length });

    // Initialize Gradio client
    const GradioClient = await initGradioClient();

    // Get example audio file for reference
    const response_0 = await fetch("https://github.com/gradio-app/gradio/raw/main/test/test_files/audio_sample.wav");
    const exampleAudio = await response_0.blob();

    // Connect to the Chatterbox client
    const client = await GradioClient.connect("ResembleAI/Chatterbox");

    // Generate TTS audio
    const result = await client.predict("/generate_tts_audio", {
      text_input: text_input.trim(),
      audio_prompt_path_input: exampleAudio,
      exaggeration_input: exaggeration_input || 0.5,
      temperature_input: temperature_input || 0.8,
      seed_num_input: seed_num_input || 0,
      cfgw_input: cfgw_input || 0.5,
    });

    // The result should contain audio data
    if (!result.data || !result.data[0]) {
      throw new Error('No audio data received from Chatterbox API');
    }

    // Extract audio data
    const audioData = result.data[0];
    let audioUrl;

    if (typeof audioData === 'string') {
      audioUrl = audioData;
    } else if (audioData.url) {
      audioUrl = audioData.url;
    } else if (audioData.path) {
      audioUrl = audioData.path;
    } else {
      throw new Error('Invalid audio data format received from Chatterbox API');
    }

    res.json({
      success: true,
      audioUrl: audioUrl,
      metadata: {
        text: text_input.trim(),
        exaggeration: exaggeration_input || 0.5,
        temperature: temperature_input || 0.8,
        seed: seed_num_input || 0,
        cfgw: cfgw_input || 0.5,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error("HTTP TTS generation failed", { error: error.message });
    res.status(500).json({
      error: error.message || "Unknown error occurred",
      details: error.stack || null
    });
  }
});

/**
 * Firebase Function to test PupilSense API
 * Let's explore what the API expects and returns
 */
exports.testPupilSense = onCall(async (request) => {
  try {
    logger.info("Testing PupilSense API connection...");

    // Initialize Gradio client
    const GradioClient = await initGradioClient();

    // Connect to the PupilSense client with better error handling
    let client;
    let connectedSpace = null;

    const spacesToTry = [
      // "vijulshah/pupilsense",  // Use working space for testing
      "txarst/pupillometry"
    ];

    for (const space of spacesToTry) {
      try {
        logger.info(`Attempting to connect to ${space}...`);
        client = await GradioClient.connect(space);
        connectedSpace = space;
        logger.info(`Successfully connected to ${space}!`);
        break;
      } catch (connectError) {
        logger.error(`Failed to connect to ${space}:`, {
          error: connectError.message,
          errorType: connectError.constructor.name
        });

        // If this is the last space to try, throw the error
        if (space === spacesToTry[spacesToTry.length - 1]) {
          throw new Error(`Unable to connect to any PupilSense space. Last error: ${connectError.message}`);
        }
      }
    }

    // Let's see what endpoints are available
    const endpoints = client.endpoints || {};
    const endpointKeys = Object.keys(endpoints);
    logger.info("Available endpoints:", {
      connectedSpace: connectedSpace,
      endpoints: endpointKeys,
      endpointCount: endpointKeys.length,
      hasPredict: endpointKeys.includes('/predict'),
      hasPredict1: endpointKeys.includes('/predict_1'),
      hasProcessMediaUnified: endpointKeys.includes('/process_media_unified'),
      hasProcessVideoSimple: endpointKeys.includes('/process_video_simple'),
      hasProcessImageSimple: endpointKeys.includes('/process_image_simple'),
      allEndpoints: endpoints
    });

    // Try to get a sample video file for testing
    const response_0 = await fetch("https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4");
    const sampleVideo = await response_0.blob();

    logger.info("Got sample video, attempting analysis...");

    // Try the correct PupilSense endpoints based on deployment structure
    const endpointsToTry = [
      "/process_media_unified",  // Primary unified API endpoint
      "/process_video_simple",   // Video-specific endpoint
      "/predict",               // Legacy endpoint
      "/predict_1"              // Alternative legacy endpoint
    ];

    let workingEndpoint = null;
    let result = null;

    for (const endpoint of endpointsToTry) {
      try {
        logger.info(`Trying endpoint: ${endpoint}`);

        // Use proper parameter structure for PupilSense API
        const params = {
          media_input: sampleVideo,     // Use media_input for unified endpoint
          pupil_selection: "both",      // Use string instead of boolean
          tv_model: "ResNet18",         // Correct parameter name
          blink_detection: true
        };

        result = await client.predict(endpoint, params);
        workingEndpoint = endpoint;

        logger.info(`Success with ${endpoint}:`, {
          hasData: !!result.data,
          dataLength: result.data?.length,
          resultStructure: typeof result.data
        });

        break;

      } catch (err) {
        logger.info(`${endpoint} failed:`, { error: err.message });

        // If this is the last endpoint and we still haven't succeeded
        if (endpoint === endpointsToTry[endpointsToTry.length - 1]) {
          throw new Error(`All endpoints failed. Last error: ${err.message}`);
        }
      }
    }

    return {
      success: true,
      data: {
        workingEndpoint: workingEndpoint,
        endpoints: Object.keys(client.endpoints || {}),
        result: result.data,
        metadata: {
          timestamp: new Date().toISOString(),
          connectedSpace: connectedSpace
        }
      }
    };

  } catch (error) {
    logger.error("PupilSense test failed", {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message || "Unknown error occurred",
      details: error.stack || null
    };
  }
});

/**
 * Firebase Function to generate PupilSense analysis
 * This is the main function that the frontend will call
 */
exports.generatePupilAnalysis = onCall(async (request) => {
  try {
    const { data } = request;

    // Validate input
    if (!data || !data.video_input) {
      throw new Error("Missing required field: video_input");
    }

    logger.info("PupilSense analysis request received", {
      hasVideo: !!data.video_input,
      videoInputType: typeof data.video_input,
      pupilSelection: data.pupil_selection,
      tvModel: data.tv_model,
      blinkDetection: data.blink_detection
    });

    // Initialize Gradio client
    const GradioClient = await initGradioClient();

    logger.info("Connecting to PupilSense client...");

    // Add debugging info
    logger.info("Environment info:", {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });

    // Connect to the PupilSense client with timeout
    const client = await GradioClient.connect("txarst/pupillometry");

    logger.info("Connected to PupilSense successfully!");

    // Process video input using the helper function
    logger.info("Processing video input...", {
      inputType: typeof data.video_input,
      inputLength: data.video_input?.length || 0,
      isBase64: data.video_input?.startsWith?.('data:video/') || false
    });

    const videoBlob = await processVideoInput(data.video_input);

    logger.info("Video blob created:", {
      blobSize: videoBlob.size,
      blobType: videoBlob.type,
      isBlob: videoBlob instanceof Blob
    });

    logger.info("Processing video with PupilSense...");

    // Use the video-specific function since we're processing videos
    const workingEndpoint = "process_video_simple";

    let result;
    try {
      logger.info(`Calling ${workingEndpoint} with parameters`);

      // Call the API with the correct parameter format
      // If videoBlob is a string (file path), use it directly
      // If it's a Blob, we need to handle it differently
      let mediaInput = videoBlob;

      if (videoBlob instanceof Blob) {
        // NEW APPROACH: Use base64 direct approach (like test-local.js)
        logger.info("Using base64 direct approach (API now supports this!)");

        // Convert blob back to base64 data URL
        const buffer = await videoBlob.arrayBuffer();
        const bufferData = Buffer.from(buffer);
        const blobType = videoBlob.type || 'video/mp4';

        // Create base64 data URL
        const base64Data = bufferData.toString('base64');
        const dataUrl = `data:${blobType};base64,${base64Data}`;

        logger.info("Base64 data URL created:", {
          mimeType: blobType,
          dataLength: dataUrl.length,
          isVideo: blobType.startsWith('video/'),
          isImage: blobType.startsWith('image/')
        });

        // Pass the base64 data URL directly to the API
        mediaInput = dataUrl;
      }

      // Use the API Testing tab (index 2) which uses process_media_unified
      // This matches the gr.Blocks structure in pupilsense_hf_deploy/gradio_app.py
      logger.info("Calling /process_media_unified endpoint with base64 data");
      logger.info("API Parameters:", {
        mediaInputType: typeof mediaInput,
        mediaInputLength: mediaInput.length,
        pupil_selection: data.pupil_selection || "both",
        tv_model: data.tv_model || "ResNet18",
        blink_detection: data.blink_detection !== undefined ? data.blink_detection : true
      });
      result = await client.predict(
        // 2,  // Index 2 = API Testing tab with process_media_unified
        "/process_media_unified", {
        media_input: mediaInput,
        pupil_selection: data.pupil_selection || "both",
        tv_model: data.tv_model || "ResNet18",
        blink_detection: data.blink_detection !== undefined ? data.blink_detection : true
      });

      logger.info(`Video processing successful with ${workingEndpoint}`);

    } catch (endpointError) {
      logger.error(`${workingEndpoint} failed:`, { error: endpointError.message });
      throw new Error(`PupilSense API call failed: ${endpointError.message}`);
    }

    logger.info("PupilSense analysis complete", {
      hasData: !!result.data,
      dataLength: result.data?.length,
      resultType: typeof result.data
    });

    // Process the result based on the actual API response format
    if (!result.data) {
      throw new Error('No analysis data received from PupilSense API');
    }

    // Based on our test, the API returns [fileObject, textSummary]
    let analysisUrl = null;
    let summary = null;
    let analysisResults = null;

    if (Array.isArray(result.data) && result.data.length >= 2) {
      // First element is the file object with the analysis image
      const fileObject = result.data[0];
      if (fileObject && typeof fileObject === 'object') {
        analysisUrl = fileObject.url || fileObject.path;
      }

      // Second element is the text summary
      summary = result.data[1];

      // Store the full response as results
      analysisResults = result.data;
    } else {
      // Fallback for unexpected format
      analysisUrl = result.data.url || result.data.path || result.data.image;
      analysisResults = result.data.results || result.data.analysis;
      summary = result.data.summary || result.data.description || "Analysis completed";
    }

    logger.info("PupilSense analysis successful", {
      hasAnalysisUrl: !!analysisUrl,
      hasResults: !!analysisResults,
      hasSummary: !!summary,
      summaryPreview: typeof summary === 'string' ? summary.substring(0, 100) : 'Not a string'
    });

    return {
      success: true,
      data: {
        analysisUrl: analysisUrl,
        results: analysisResults,
        summary: summary || "Pupil diameter analysis completed successfully",
        metadata: {
          pupilSelection: data.pupil_selection || "both",
          tvModel: data.tv_model || "ResNet18",
          blinkDetection: data.blink_detection || true,
          workingEndpoint: workingEndpoint,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - Date.now() // Will be calculated properly
        }
      }
    };

  } catch (error) {
    logger.error("PupilSense analysis failed", {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message || "Unknown error occurred",
      details: error.stack || null
    };
  }
});

/**
 * HTTP endpoint to test PupilSense API
 */
exports.testPupilSenseHttp = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    logger.info("Testing PupilSense API connection...");

    // Initialize Gradio client
    const GradioClient = await initGradioClient();

    // Connect to the PupilSense client
    const client = await GradioClient.connect("txarst/pupillometry");

    logger.info("Connected to PupilSense! Exploring API...");

    // Let's see what endpoints are available
    const endpoints = client.endpoints || {};
    const endpointKeys = Object.keys(endpoints);
    logger.info("HTTP Test: Available endpoints:", {
      endpoints: endpointKeys,
      endpointCount: endpointKeys.length,
      hasPredict: endpointKeys.includes('/predict'),
      hasPredict1: endpointKeys.includes('/predict_1'),
      hasProcessMediaUnified: endpointKeys.includes('/process_media_unified'),
      hasProcessVideoSimple: endpointKeys.includes('/process_video_simple'),
      hasProcessImageSimple: endpointKeys.includes('/process_image_simple')
    });

    // Try to get a sample video file for testing
    const response_0 = await fetch("https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4");
    const sampleVideo = await response_0.blob();

    logger.info("Got sample video, attempting analysis...");

    // Try the correct PupilSense endpoints based on deployment structure
    const endpointsToTry = [
      "/process_media_unified",  // Primary unified API endpoint
      "/process_video_simple",   // Video-specific endpoint
      "/predict",               // Legacy endpoint
      "/predict_1"              // Alternative legacy endpoint
    ];

    let workingEndpoint = null;
    let result = null;

    for (const endpoint of endpointsToTry) {
      try {
        logger.info(`HTTP Test: Trying endpoint: ${endpoint}`);

        // Use proper parameter structure for PupilSense API
        const params = {
          media_input: sampleVideo,     // Use media_input for unified endpoint
          pupil_selection: "both",      // Use string instead of boolean
          tv_model: "ResNet18",         // Correct parameter name
          blink_detection: true
        };

        result = await client.predict(endpoint, params);
        workingEndpoint = endpoint;

        logger.info(`HTTP Test: Success with ${endpoint}:`, {
          hasData: !!result.data,
          dataLength: result.data?.length,
          resultStructure: typeof result.data
        });

        res.json({
          success: true,
          data: {
            workingEndpoint: workingEndpoint,
            endpoints: Object.keys(client.endpoints || {}),
            result: result.data,
            metadata: {
              timestamp: new Date().toISOString(),
              connectedSpace: "txarst/pupillometry"
            }
          }
        });
        return;

      } catch (err) {
        logger.info(`HTTP Test: ${endpoint} failed:`, { error: err.message });

        // If this is the last endpoint and we still haven't succeeded
        if (endpoint === endpointsToTry[endpointsToTry.length - 1]) {
          throw new Error(`All HTTP test endpoints failed. Last error: ${err.message}`);
        }
      }
    }

  } catch (error) {
    logger.error("PupilSense test failed", {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: error.message || "Unknown error occurred",
      details: error.stack || null
    });
  }
});

/**
 * HTTP endpoint for PupilSense analysis
 */
exports.generatePupilAnalysisHttp = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { video_input, pupil_selection, tv_model, blink_detection } = req.body;

    if (!video_input) {
      res.status(400).json({ error: "Missing required field: video_input" });
      return;
    }

    logger.info("HTTP PupilSense analysis request received");

    // Initialize Gradio client
    const GradioClient = await initGradioClient();

    // Connect to the PupilSense client
    const client = await GradioClient.connect("txarst/pupillometry");

    // Process video input using the helper function
    logger.info("Processing video input...");
    let videoBlob;
    try {
      videoBlob = await processVideoInput(video_input);
    } catch (processError) {
      logger.error("Failed to process video input:", { error: processError.message });
      res.status(400).json({ error: `Failed to process video input: ${processError.message}` });
      return;
    }

    // Process with PupilSense using the video-specific function
    const workingEndpoint = "process_video_simple";

    let result;
    try {
      logger.info(`HTTP: Calling ${workingEndpoint} with parameters`);

      // Call the API with the correct parameter format
      // If videoBlob is a string (file path), use it directly
      // If it's a Blob, we need to handle it differently
      let mediaInput = videoBlob;

      if (videoBlob instanceof Blob) {
        // NEW APPROACH: Use base64 direct approach (like test-local.js)
        logger.info("HTTP: Using base64 direct approach (API now supports this!)");

        // Convert blob back to base64 data URL
        const buffer = await videoBlob.arrayBuffer();
        const bufferData = Buffer.from(buffer);
        const blobType = videoBlob.type || 'video/mp4';

        // Create base64 data URL
        const base64Data = bufferData.toString('base64');
        const dataUrl = `data:${blobType};base64,${base64Data}`;

        logger.info("HTTP: Base64 data URL created:", {
          mimeType: blobType,
          dataLength: dataUrl.length,
          isVideo: blobType.startsWith('video/'),
          isImage: blobType.startsWith('image/')
        });

        // Pass the base64 data URL directly to the API
        mediaInput = dataUrl;
      }

      // Use the API Testing tab (index 2) which uses process_media_unified
      // This matches the gr.Blocks structure in pupilsense_hf_deploy/gradio_app.py
      logger.info("HTTP: Calling /process_media_unified endpoint with base64 data");
      logger.info("HTTP: API Parameters:", {
        mediaInputType: typeof mediaInput,
        mediaInputLength: mediaInput.length,
        pupil_selection: pupil_selection || "both",
        tv_model: tv_model || "ResNet18",
        blink_detection: blink_detection !== undefined ? blink_detection : true
      });

      result = await client.predict("/process_media_unified", {
        media_input: mediaInput,
        pupil_selection: pupil_selection || "both",
        tv_model: tv_model || "ResNet18",
        blink_detection: blink_detection !== undefined ? blink_detection : true
      });

      logger.info(`HTTP: Processing successful with ${workingEndpoint}`);

    } catch (endpointError) {
      logger.error(`HTTP: ${workingEndpoint} failed:`, { error: endpointError.message });
      throw new Error(`HTTP PupilSense API call failed: ${endpointError.message}`);
    }

    if (!result.data) {
      throw new Error('No analysis data received from PupilSense API');
    }

    // Extract analysis results using the same logic as the callable function
    let analysisUrl = null;
    let analysisResults = null;
    let summary = null;

    if (Array.isArray(result.data) && result.data.length >= 2) {
      // First element is the file object with the analysis image
      const fileObject = result.data[0];
      if (fileObject && typeof fileObject === 'object') {
        analysisUrl = fileObject.url || fileObject.path;
      }

      // Second element is the text summary
      summary = result.data[1];

      // Store the full response as results
      analysisResults = result.data;
    } else {
      // Fallback for unexpected format
      analysisUrl = result.data.url || result.data.path || result.data.image;
      analysisResults = result.data.results || result.data.analysis;
      summary = result.data.summary || result.data.description || "Analysis completed";
    }

    res.json({
      success: true,
      data: {
        analysisUrl: analysisUrl,
        results: analysisResults,
        summary: summary || "Pupil diameter analysis completed successfully",
        metadata: {
          pupilSelection: pupil_selection || "both",
          tvModel: tv_model || "ResNet18",
          blinkDetection: blink_detection || true,
          workingEndpoint: workingEndpoint,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error("HTTP PupilSense analysis failed", { error: error.message });
    res.status(500).json({
      error: error.message || "Unknown error occurred",
      details: error.stack || null
    });
  }
});

/**
 * Simple test function to check Gradio connection
 */
exports.testConnection = onCall(async (request) => {
  try {
    logger.info("Testing Gradio connection...");

    // Initialize Gradio client
    const GradioClient = await initGradioClient();

    logger.info("Attempting to connect to txarst/pupillometry...");
    const client = await GradioClient.connect("txarst/pupillometry");

    logger.info("Connection successful!");

    // Log available endpoints
    const endpoints = client.endpoints || {};
    const endpointKeys = Object.keys(endpoints);
    logger.info("Available endpoints:", { endpoints: endpointKeys });

    // Also check if there's an api_info
    if (client.api_info) {
      logger.info("API info available:", { apiInfo: Object.keys(client.api_info) });
    }

    return {
      success: true,
      data: {
        message: "Successfully connected to PupilSense space",
        availableEndpoints: endpointKeys,
        hasApiInfo: !!client.api_info,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error("Connection test failed:", {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
});

/**
 * Test function to demonstrate video upload from local file path
 * This function shows how to use the updated API with local video files
 */
exports.testVideoUpload = onCall(async (request) => {
  try {
    const { data } = request;

    // This is a test function - in production, you'd get the file path from the request
    const testVideoPath = data.video_path || "/tmp/test_video.mp4";

    logger.info("Testing video upload from local path", {
      videoPath: testVideoPath,
      pathExists: fs.existsSync(testVideoPath)
    });

    // Test the processVideoInput function with different input types
    const testCases = [
      {
        name: "Local file path",
        input: testVideoPath,
        description: "Testing with local file path"
      },
      {
        name: "URL",
        input: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        description: "Testing with remote URL"
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        logger.info(`Testing ${testCase.name}:`, { input: testCase.input });

        if (testCase.name === "Local file path" && !fs.existsSync(testCase.input)) {
          results.push({
            name: testCase.name,
            success: false,
            error: "Test video file not found - this is expected in test environment"
          });
          continue;
        }

        const videoBlob = await processVideoInput(testCase.input);

        results.push({
          name: testCase.name,
          success: true,
          blobSize: videoBlob.size,
          blobType: videoBlob.type,
          description: testCase.description
        });

      } catch (error) {
        results.push({
          name: testCase.name,
          success: false,
          error: error.message,
          description: testCase.description
        });
      }
    }

    return {
      success: true,
      data: {
        testResults: results,
        summary: `Tested ${results.length} video input formats`,
        metadata: {
          timestamp: new Date().toISOString(),
          nodeVersion: process.version
        }
      }
    };

  } catch (error) {
    logger.error("Video upload test failed", {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message || "Unknown error occurred",
      details: error.stack || null
    };
  }
});
