# Development Setup Guide

This guide explains how to set up and run the Chatterbox TTS system with Next.js server, Firebase Functions, and React Native app.

**Note: This project uses Expo SDK 51 for compatibility with Expo Go.**

## Architecture Overview

```
React Native App (Expo)
    ↓ (Firebase Functions Call)
Firebase Functions (Direct Integration)
    ↓ (Gradio API)
Chatterbox TTS Service
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app (compatible with SDK 51)
- Android Studio (for Android emulator) or Xcode (for iOS simulator)

## Setup Instructions

### 1. Install Dependencies

```bash
# Install main project dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### 2. Firebase Setup

The project is already configured for the `esculappl-france` Firebase project. If you need to use a different project:

```bash
firebase use --add
# Select your Firebase project
```

### 3. Development Environment

#### Option A: Run All Services Together (Recommended)

```bash
# This will start both services concurrently:
# - Firebase Functions emulator on port 5001
# - Expo development server
npm run dev:functions-app
```

#### Option B: Run Services Individually

**Terminal 1 - Firebase Functions Emulator:**
```bash
npm run dev:functions
# Functions will run on http://localhost:5001
```

**Terminal 2 - React Native App:**
```bash
npm start
# Follow Expo instructions to run on device/emulator
```

## Testing the Setup

### 1. Test Firebase Functions

The functions emulator UI will be available at `http://localhost:4000` (if enabled).

Test the function directly:
```bash
curl -X POST http://localhost:5001/esculappl-france/us-central1/generateTTSHttp \
  -H "Content-Type: application/json" \
  -d '{"text_input": "Hello world"}'
```

### 2. Test React Native App

1. Start the Expo development server: `npm start`
2. Scan the QR code with Expo Go app or run on emulator
3. Enter text in the TTS screen and tap "Generate Speech"

## Configuration

### Environment Variables

Create a `.env` file in the `chatterbox-server` directory:

```env
NEXTJS_SERVER_URL=http://localhost:3001
```

For production, update this to your deployed Next.js server URL.

### Firebase Configuration

The Firebase configuration is in `services/ttsService.js`. Update the `firebaseConfig` object if using a different Firebase project.

**Important for Android Emulator**: The React Native app uses `10.0.2.2:5001` to connect to the Firebase Functions emulator running on the host machine.

## Troubleshooting

### Common Issues

1. **Firebase Functions not connecting to emulator:**
   - Ensure the emulator is running on port 5001
   - Check that `__DEV__` is true in React Native
   - Verify the localhost address is correct for your platform

2. **Next.js server connection issues:**
   - Ensure the server is running on port 3001
   - Check firewall settings
   - Update the `NEXTJS_SERVER_URL` in Firebase Functions

3. **Gradio client errors:**
   - The Chatterbox service might be temporarily unavailable
   - Check network connectivity
   - Verify the Gradio API endpoint is accessible

4. **Audio playback issues:**
   - Ensure device audio permissions are granted
   - Check that the audio file was downloaded successfully
   - Verify Expo AV is properly configured

### Logs and Debugging

- **Next.js Server:** Check terminal output where server is running
- **Firebase Functions:** Use Firebase emulator logs
- **React Native:** Use Expo development tools and device logs

## Deployment

### Next.js Server
Deploy to Vercel, Netlify, or any Node.js hosting service.

### Firebase Functions
```bash
firebase deploy --only functions
```

### React Native App
Build and deploy using Expo's build service or EAS Build.

## Port Configuration

- **Next.js Server:** 3001
- **Firebase Functions Emulator:** 5001
- **Firebase Emulator UI:** 4000 (optional)
- **Expo Development Server:** 8081 (default)

Make sure these ports are available and not blocked by firewall.
