# Video Upload API Documentation

## Overview

The updated Firebase Functions now support uploading videos from local file paths, URLs, and various data formats for PupilSense analysis. The API has been standardized to use `video_input` as the primary parameter.

## Key Changes

### 1. Consistent Parameter Naming
- **Primary parameter**: `video_input` (used consistently across all endpoints)
- **Fallback parameter**: `media_input` (only for unified endpoint compatibility)

### 2. Enhanced Video Input Processing
The `processVideoInput()` helper function now supports:
- **Local file paths**: `/path/to/video.mp4`
- **URLs**: `https://example.com/video.mp4`
- **Base64 data**: `data:video/mp4;base64,<data>`
- **Blob objects**: Direct blob/file uploads
- **Buffer data**: Raw video buffer data

### 3. New Functions

#### `generatePupilAnalysis` (Updated)
Main function for pupil analysis with enhanced video input handling.

**Parameters:**
```javascript
{
  video_input: string | Blob | Buffer,  // Required: video file
  pupil_selection: string,              // Optional: "both", "left", "right" (default: "both")
  tv_model: string,                     // Optional: "ResNet18", "ResNet50" (default: "ResNet18")
  blink_detection: boolean              // Optional: enable blink detection (default: true)
}
```

#### `testVideoUpload` (New)
Test function to validate video upload functionality.

**Parameters:**
```javascript
{
  video_path: string  // Optional: path to test video file
}
```

## Usage Examples

### 1. Upload from Local File Path

```javascript
// Firebase callable function
const result = await generatePupilAnalysis({
  video_input: "/path/to/local/video.mp4",
  pupil_selection: "both",
  tv_model: "ResNet18",
  blink_detection: true
});
```

### 2. Upload from URL

```javascript
const result = await generatePupilAnalysis({
  video_input: "https://example.com/sample-video.mp4",
  pupil_selection: "both"
});
```

### 3. Upload Base64 Data

```javascript
const result = await generatePupilAnalysis({
  video_input: "data:video/mp4;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...",
  pupil_selection: "left",
  tv_model: "ResNet50"
});
```

### 4. HTTP Endpoint Usage

```bash
curl -X POST https://your-project.cloudfunctions.net/generatePupilAnalysisHttp \
  -H "Content-Type: application/json" \
  -d '{
    "video_input": "/path/to/video.mp4",
    "pupil_selection": "both",
    "tv_model": "ResNet18",
    "blink_detection": true
  }'
```

## Response Format

### Success Response
```javascript
{
  success: true,
  data: {
    analysisUrl: "https://...",           // URL to analysis result video/image
    results: [...],                       // Additional analysis data
    summary: "Analysis completed...",     // Human-readable summary
    metadata: {
      pupilSelection: "both",
      tvModel: "ResNet18",
      blinkDetection: true,
      workingEndpoint: "/process_video_simple",  // Which API endpoint was used
      timestamp: "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Error Response
```javascript
{
  success: false,
  error: "Error message",
  details: "Stack trace or additional details"
}
```

## API Endpoints

The system tries multiple endpoints in order of preference:

1. `/process_media_unified` - Primary unified API endpoint
2. `/process_video_simple` - Video-specific endpoint  
3. `/predict_1` - Legacy video endpoint
4. `/predict` - Fallback endpoint

## Error Handling

The API includes comprehensive error handling for:
- Invalid file paths
- Network errors when fetching URLs
- Unsupported video formats
- API endpoint failures
- Processing timeouts

## Testing

Use the `testVideoUpload` function to validate the video processing pipeline:

```javascript
const testResult = await testVideoUpload({
  video_path: "/path/to/test/video.mp4"
});
```

## Dependencies

The following packages have been added to support file operations:
- `form-data`: For multipart form handling
- `multer`: For file upload processing

## Notes

- The API automatically detects the input format and processes accordingly
- Local file paths require the file to exist on the server filesystem
- Large video files may require increased timeout settings
- The `workingEndpoint` in the response indicates which API endpoint successfully processed the request
