/**
 * Firebase Functions for Chatterbox TTS
 * Direct integration with Chatterbox API using Gradio client
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

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
