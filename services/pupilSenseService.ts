/**
 * PupilSense Service
 * Connects to the PupilSense Gradio API for pupil diameter analysis
 */

import * as FileSystem from 'expo-file-system';

// Configuration
const PUPILSENSE_API_URL = process.env.EXPO_PUBLIC_PUPILSENSE_API_URL || 'https://your-huggingface-space-url.hf.space';
const API_TIMEOUT = 120000; // 2 minutes timeout for video processing

interface PupilAnalysisParams {
  video_input: string; // Local file URI
  pupil_selection?: boolean | string; // true for both, or "left_pupil", "right_pupil", "both"
  tv_model?: string; // "ResNet18" or "ResNet50"
  blink_detection?: boolean;
}

interface PupilAnalysisResult {
  success: boolean;
  data?: {
    analysisUrl?: string; // URL to the analysis plot image
    results?: any; // Analysis results data
    summary?: string; // Summary statistics
    metadata?: {
      timestamp: string;
      processingTime?: number;
    };
  };
  error?: string;
}

/**
 * Upload video file to PupilSense API and get analysis results
 */
export async function generatePupilAnalysis(params: PupilAnalysisParams): Promise<PupilAnalysisResult> {
  const startTime = Date.now();
  
  try {
    console.log('🎬 Starting PupilSense analysis...');
    console.log('📹 Video URI:', params.video_input);
    
    // Validate input
    if (!params.video_input) {
      throw new Error('Video input is required');
    }

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(params.video_input);
    if (!fileInfo.exists) {
      throw new Error('Video file does not exist');
    }

    console.log(`📊 File size: ${((fileInfo.size || 0) / 1024 / 1024).toFixed(2)} MB`);

    // Convert pupil_selection to the expected format
    let pupilSelection = 'both';
    if (typeof params.pupil_selection === 'string') {
      pupilSelection = params.pupil_selection;
    } else if (params.pupil_selection === true) {
      pupilSelection = 'both';
    }

    console.log('🚀 Sending request to PupilSense API...');
    console.log('🌐 API URL:', `${PUPILSENSE_API_URL}/api/predict`);

    // For Gradio API, we need to send the file and parameters correctly
    const formData = new FormData();

    // Add the video file
    formData.append('data', JSON.stringify([
      null, // video file will be uploaded separately
      pupilSelection,
      params.tv_model || 'ResNet18',
      params.blink_detection !== false // Default to true
    ]));

    // Add the actual video file
    formData.append('files', {
      uri: params.video_input,
      type: 'video/mp4',
      name: 'video.mp4'
    } as any);

    // Add function index for video processing (usually 1 for video tab)
    formData.append('fn_index', '1');

    // Make API request
    const response = await fetch(`${PUPILSENSE_API_URL}/api/predict`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let fetch set it with boundary
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ API Response received');

    // Process the response
    const processingTime = Date.now() - startTime;
    
    if (result.data && Array.isArray(result.data) && result.data.length >= 2) {
      const [plotData, summaryData] = result.data;
      
      // Handle plot data (could be base64 image or URL)
      let analysisUrl: string | undefined;
      if (plotData) {
        if (typeof plotData === 'string' && plotData.startsWith('data:image')) {
          // Base64 image data
          analysisUrl = plotData;
        } else if (typeof plotData === 'string' && plotData.startsWith('http')) {
          // URL to image
          analysisUrl = plotData;
        } else {
          console.log('📊 Plot data type:', typeof plotData);
        }
      }

      return {
        success: true,
        data: {
          analysisUrl,
          results: summaryData,
          summary: typeof summaryData === 'string' ? summaryData : JSON.stringify(summaryData),
          metadata: {
            timestamp: new Date().toISOString(),
            processingTime
          }
        }
      };
    } else {
      console.warn('⚠️ Unexpected response format:', result);
      return {
        success: false,
        error: 'Unexpected response format from API'
      };
    }

  } catch (error) {
    console.error('❌ PupilSense analysis error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: {
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime
        }
      }
    };
  }
}

/**
 * Alternative method using gradio_client approach
 */
export async function generatePupilAnalysisWithClient(params: PupilAnalysisParams): Promise<PupilAnalysisResult> {
  const startTime = Date.now();
  
  try {
    console.log('🎬 Starting PupilSense analysis (client method)...');
    
    // This would require a different approach using gradio_client
    // For now, fall back to the direct API method
    return await generatePupilAnalysis(params);
    
  } catch (error) {
    console.error('❌ Client method error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Client method failed'
    };
  }
}

/**
 * Test connection to PupilSense API
 */
export async function testPupilSenseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing PupilSense API connection...');
    
    const response = await fetch(PUPILSENSE_API_URL, {
      method: 'GET',
      timeout: 10000, // 10 second timeout
    });
    
    const isConnected = response.ok;
    console.log(isConnected ? '✅ PupilSense API is accessible' : '❌ PupilSense API is not accessible');
    
    return isConnected;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

/**
 * Get API configuration
 */
export function getPupilSenseConfig() {
  return {
    apiUrl: PUPILSENSE_API_URL,
    timeout: API_TIMEOUT,
    supportedFormats: ['mp4', 'mov', 'avi', 'webm'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxDuration: 30, // 30 seconds
  };
}

// Export types for use in components
export type { PupilAnalysisParams, PupilAnalysisResult };
