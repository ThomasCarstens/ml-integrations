import { Client } from "@gradio/client";
import cors from 'cors';

// Initialize CORS middleware
const corsMiddleware = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Helper function to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  // Run CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      text_input,
      exaggeration_input = 0.5,
      temperature_input = 0.8,
      seed_num_input = 0,
      cfgw_input = 0.5
    } = req.body;

    if (!text_input || text_input.trim().length === 0) {
      return res.status(400).json({ error: 'Text input is required' });
    }

    if (text_input.trim().length > 300) {
      return res.status(400).json({ error: 'Text must be 300 characters or less' });
    }

    console.log('Generating TTS for:', text_input.trim());

    // Get example audio file for reference
    const response_0 = await fetch("https://github.com/gradio-app/gradio/raw/main/test/test_files/audio_sample.wav");
    const exampleAudio = await response_0.blob();

    // Connect to the Chatterbox client
    const client = await Client.connect("ResembleAI/Chatterbox");
    
    // Generate TTS audio
    const result = await client.predict("/generate_tts_audio", { 		
      text_input: text_input.trim(), 
      audio_prompt_path_input: exampleAudio, 		
      exaggeration_input: exaggeration_input, 		
      temperature_input: temperature_input, 		
      seed_num_input: seed_num_input, 		
      cfgw_input: cfgw_input, 
    });

    console.log('TTS Result:', result.data);

    // The result should contain audio data
    if (!result.data || !result.data[0]) {
      throw new Error('No audio data received from API');
    }

    // Return the audio data URL and metadata
    const audioData = result.data[0];
    
    res.status(200).json({
      success: true,
      audioUrl: audioData.url || audioData,
      metadata: {
        text: text_input.trim(),
        exaggeration: exaggeration_input,
        temperature: temperature_input,
        seed: seed_num_input,
        cfgw: cfgw_input,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('TTS Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate speech', 
      details: errorMessage 
    });
  }
}
