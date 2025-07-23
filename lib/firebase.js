import { initializeApp } from 'firebase/app';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

// Firebase configuration from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyAOl1F9SBcnWnDpJYw0kuwivEJ3Pf8XUWo",
  authDomain: "esculappl-france.firebaseapp.com",
  databaseURL: "https://esculappl-france-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "esculappl-france",
  storageBucket: "esculappl-france.appspot.com",
  messagingSenderId: "891359673788",
  appId: "1:891359673788:android:090f0b36865f9e4b3e7fb9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Functions
const functions = getFunctions(app);

// Connect to Functions emulator in development
if (__DEV__) {
  // Use localhost for emulator
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Create callable function reference
export const generateTTS = httpsCallable(functions, 'generateTTS');

export { app, functions };
