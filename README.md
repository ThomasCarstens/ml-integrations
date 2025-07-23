# Chatterbox TTS App 🎙️

This is a React Native app built with Expo that provides high-quality text-to-speech functionality using the Chatterbox AI model. The app uses a distributed architecture with Firebase Functions and a Next.js server to handle TTS generation.

## Architecture

- **React Native App (Expo)**: User interface and audio playback
- **Firebase Functions**: Direct integration with Chatterbox TTS using Gradio client
- **Chatterbox AI**: High-quality TTS generation service

## Quick Start

1. Install dependencies

   ```bash
   npm install
   ```

2. Start all services for development

   ```bash
   npm run dev:functions-app
   ```

   This will start:
   - Firebase Functions emulator on port 5001
   - Expo development server

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
