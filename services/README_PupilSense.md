# PupilSense Service Integration

This service connects your React Native app to the PupilSense Gradio API for pupil diameter analysis.

## Setup

### 1. Environment Configuration

Add the PupilSense API URL to your `.env` file:

```env
# For local development (if running PupilSense locally)
EXPO_PUBLIC_PUPILSENSE_API_URL="http://localhost:7860"

# For production (replace with your Hugging Face Space URL)
EXPO_PUBLIC_PUPILSENSE_API_URL="https://your-username-pupilsense.hf.space"
```

### 2. Service Usage

Import and use the service in your React Native components:

```typescript
import { generatePupilAnalysis } from '../services/pupilSenseService';

// In your component
const analyzeVideo = async (videoUri: string) => {
  try {
    const result = await generatePupilAnalysis({
      video_input: videoUri,
      pupil_selection: 'both', // 'left_pupil', 'right_pupil', or 'both'
      tv_model: 'ResNet18', // 'ResNet18' or 'ResNet50'
      blink_detection: true
    });

    if (result.success) {
      console.log('Analysis completed!', result.data);
      // Handle successful analysis
    } else {
      console.error('Analysis failed:', result.error);
      // Handle error
    }
  } catch (error) {
    console.error('Service error:', error);
  }
};
```

## API Reference

### `generatePupilAnalysis(params)`

Analyzes a video file for pupil diameter and blink detection.

**Parameters:**
- `video_input` (string): Local file URI of the video to analyze
- `pupil_selection` (string, optional): Which pupils to analyze
  - `'left_pupil'`: Analyze left pupil only
  - `'right_pupil'`: Analyze right pupil only  
  - `'both'`: Analyze both pupils (default)
- `tv_model` (string, optional): Model to use for analysis
  - `'ResNet18'`: Faster, good accuracy (default)
  - `'ResNet50'`: Slower, higher accuracy
- `blink_detection` (boolean, optional): Enable blink detection (default: true)

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    analysisUrl?: string; // URL to analysis plot image
    results?: any; // Analysis results data
    summary?: string; // Summary statistics
    metadata?: {
      timestamp: string;
      processingTime?: number;
    };
  };
  error?: string;
}
```

### `testPupilSenseConnection()`

Tests if the PupilSense API is accessible.

**Returns:** `Promise<boolean>`

### `getPupilSenseConfig()`

Gets the current service configuration.

**Returns:**
```typescript
{
  apiUrl: string;
  timeout: number;
  supportedFormats: string[];
  maxFileSize: number;
  maxDuration: number;
}
```

## Deployment Options

### Option 1: Local Development
1. Run the PupilSense Gradio app locally:
   ```bash
   cd pupilsense
   source venv/bin/activate
   python app.py
   ```
2. Use `http://localhost:7860` as the API URL

### Option 2: Hugging Face Spaces
1. Deploy PupilSense to Hugging Face Spaces
2. Update the API URL in `.env` to your Space URL
3. Ensure your Space is public or properly authenticated

## Troubleshooting

### Common Issues

1. **"Unable to resolve module"**
   - Make sure `pupilSenseService.ts` exists in the `services/` directory
   - Check the import path in your component

2. **"Network request failed"**
   - Verify the API URL is correct
   - Check if the PupilSense service is running
   - Ensure network connectivity

3. **"API request failed: 500"**
   - Check PupilSense service logs for errors
   - Verify video file format is supported
   - Ensure video file size is within limits

4. **"Timeout error"**
   - Video processing can take time (up to 2 minutes)
   - Check if video is too long (max 30 seconds recommended)
   - Verify API timeout settings

### Testing

Run the test function to verify setup:

```typescript
import { runPupilSenseTests } from '../services/testPupilSense';

// In your component or test file
const testService = async () => {
  const isWorking = await runPupilSenseTests();
  console.log('Service working:', isWorking);
};
```

## File Formats

**Supported video formats:**
- MP4 (recommended)
- MOV
- AVI
- WEBM

**Recommendations:**
- Maximum duration: 30 seconds
- Maximum file size: 100MB
- Resolution: 720p or lower for faster processing
- Frame rate: 30fps or lower

## Performance Notes

- Video processing typically takes 10-60 seconds depending on:
  - Video length and resolution
  - Model choice (ResNet18 vs ResNet50)
  - Server performance
- Use ResNet18 for faster processing
- Use ResNet50 for higher accuracy
- Consider showing a loading indicator during processing
