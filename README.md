# CogniFocus - Cognitive Fatigue Assistant 🧠

This is a React Native app built with Expo EAS that helps users monitor and manage cognitive fatigue through pupil diameter analysis. The app uses Firebase Realtime Database to store analysis results and provides personalized recommendations based on cognitive patterns.

## Features

- **🔬 Cognitive Fatigue Analysis**: Upload videos to analyze pupil diameter and detect cognitive fatigue levels
- **📊 Real-time Dashboard**: Track daily and weekly measurements with personalized recommendations
- **🧠 Smart Insights**: AI-powered analysis of cognitive patterns and fatigue levels
- **📱 Cross-platform**: Built with Expo EAS for iOS, Android, and web
- **🔥 Firebase Integration**: Real-time database for storing and syncing analysis results
- **📈 Progress Tracking**: Monitor cognitive health trends over time

## Architecture

- **React Native App (Expo EAS)**: Cross-platform mobile application
- **Firebase Functions**: Backend processing for pupil analysis using PupilSense API
- **Firebase Realtime Database**: Real-time data storage and synchronization
- **PupilSense AI**: Advanced pupil diameter analysis and cognitive fatigue detection

## Quick Start

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up EAS CLI (if not already installed)

   ```bash
   npm install -g eas-cli
   eas login
   ```

3. Start the development server

   ```bash
   npm start
   ```

4. For Firebase Functions development

   ```bash
   npm run dev:functions-app
   ```

   This will start:
   - Firebase Functions emulator on port 5001
   - Expo development server

## App Structure

### Main Screens

- **Dashboard** (`/dashboard`): Main screen showing cognitive health metrics, daily/weekly measurement counts, and personalized recommendations
- **Analysis** (`/analysis`): Video upload and analysis screen for cognitive fatigue detection
- **Settings**: Configuration and user preferences

### Key Components

- **Firebase Integration**: Real-time database for storing analysis results
- **Analysis Service**: Processes result.txt data and calculates cognitive fatigue levels
- **Dashboard Metrics**: Tracks measurement frequency and provides recommendations
- **Real-time Notifications**: Alerts users when analysis is complete

## Cognitive Fatigue Analysis

The app analyzes pupil diameter changes to detect cognitive fatigue levels:

- **Low Fatigue** (🟢): Pupil diameter > 2.6mm - Good cognitive alertness
- **Moderate Fatigue** (🟡): Pupil diameter 2.2-2.6mm - Balanced cognitive state
- **High Fatigue** (🔴): Pupil diameter < 2.2mm - Increased cognitive fatigue

### Analysis Process

1. User uploads a video file
2. Video is processed by PupilSense AI via Firebase Functions
3. Results are parsed and saved to Firebase Realtime Database
4. Dashboard updates with new analysis and recommendations
5. Real-time notifications alert user when analysis is complete

3. Open the app

   - Scan the QR code with Expo Go app
   - Or run on Android emulator: `npm run android`
   - Or run on iOS simulator: `npm run ios`

## Detailed Setup

For detailed setup instructions, troubleshooting, and deployment information, see [DEV_SETUP.md](./DEV_SETUP.md).

## Features

- High-quality text-to-speech using Chatterbox AI
- Adjustable voice parameters (exaggeration, temperature, seed, CFGW)
- Audio playback controls
- Generation history
- Offline audio storage

## Development

The app uses [file-based routing](https://docs.expo.dev/router/introduction) with the main TTS interface in `app/(tabs)/index.tsx`.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
