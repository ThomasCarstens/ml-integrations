import { initializeApp } from 'firebase/app';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getDatabase, ref, push, set, get, onValue, off, serverTimestamp } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

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

// Initialize services
const functions = getFunctions(app);
const database = getDatabase(app);
const auth = getAuth(app);

// Connect to Functions emulator in development (disabled - using deployed functions)
// if (__DEV__) {
//   // Use localhost for emulator
//   connectFunctionsEmulator(functions, 'localhost', 5001);
// }

// Create callable function references
export const generateTTS = httpsCallable(functions, 'generateTTS');
export const generatePupilAnalysis = httpsCallable(functions, 'generatePupilAnalysis');
export const testVideoUpload = httpsCallable(functions, 'testVideoUpload');
export const testConnection = httpsCallable(functions, 'testConnection');
export const processAnalysisResult = httpsCallable(functions, 'processAnalysisResult');

// Fake UID for demo purposes
const FAKE_UID = 'demo-user-12345';

// Authentication helper
export const initializeAuth = async () => {
  try {
    await signInAnonymously(auth);
    return FAKE_UID; // Use fake UID for demo
  } catch (error) {
    console.error('Auth initialization failed:', error);
    return FAKE_UID; // Fallback to fake UID
  }
};

// Database helper functions
export const saveAnalysisResult = async (analysisData) => {
  try {
    const uid = FAKE_UID;
    const timestamp = Date.now();
    const analysisRef = ref(database, `users/${uid}/analyses/${timestamp}`);

    // Clean the data to remove undefined values
    const cleanData = {};
    Object.keys(analysisData).forEach(key => {
      if (analysisData[key] !== undefined && analysisData[key] !== null) {
        cleanData[key] = analysisData[key];
      }
    });

    const dataToSave = {
      ...cleanData,
      timestamp: serverTimestamp(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      uid,
      id: timestamp.toString()
    };

    console.log('Saving analysis data:', Object.keys(dataToSave));
    await set(analysisRef, dataToSave);
    return { success: true, id: timestamp };
  } catch (error) {
    console.error('Failed to save analysis:', error);
    return { success: false, error: error.message };
  }
};

export const getUserAnalyses = async (uid = FAKE_UID) => {
  try {
    const analysesRef = ref(database, `users/${uid}/analyses`);
    const snapshot = await get(analysesRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data).map(([id, analysis]) => ({
        id,
        ...analysis
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to get analyses:', error);
    return [];
  }
};

export const getAnalysesForDateRange = async (startDate, endDate, uid = FAKE_UID) => {
  try {
    const analyses = await getUserAnalyses(uid);
    return analyses.filter(analysis => {
      const analysisDate = analysis.date;
      return analysisDate >= startDate && analysisDate <= endDate;
    });
  } catch (error) {
    console.error('Failed to get analyses for date range:', error);
    return [];
  }
};

export const subscribeToAnalysisUpdates = (callback, uid = FAKE_UID) => {
  const analysesRef = ref(database, `users/${uid}/analyses`);
  onValue(analysesRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const analyses = Object.entries(data).map(([id, analysis]) => ({
        id,
        ...analysis
      }));
      callback(analyses);
    } else {
      callback([]);
    }
  });

  return () => off(analysesRef);
};

// Eye test specific functions
export const saveEyeTestResult = async (eyeTestData, uid = FAKE_UID) => {
  try {
    const timestamp = Date.now();
    const eyeTestRef = ref(database, `eye-test/${uid}/${timestamp}`);

    // Clean the data to remove undefined values
    const cleanData = {};
    Object.keys(eyeTestData).forEach(key => {
      if (eyeTestData[key] !== undefined && eyeTestData[key] !== null) {
        cleanData[key] = eyeTestData[key];
      }
    });

    const dataToSave = {
      ...cleanData,
      timestamp: serverTimestamp(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      uid,
      id: timestamp.toString()
    };

    console.log('Saving eye test data:', Object.keys(dataToSave));
    await set(eyeTestRef, dataToSave);
    return { success: true, id: timestamp };
  } catch (error) {
    console.error('Failed to save eye test result:', error);
    return { success: false, error: error.message };
  }
};

export const getUserEyeTests = async (uid = FAKE_UID) => {
  try {
    const eyeTestsRef = ref(database, `eye-test/${uid}`);
    const snapshot = await get(eyeTestsRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data).map(([id, eyeTest]) => ({
        id,
        ...eyeTest
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to get eye tests:', error);
    return [];
  }
};

export const getEyeTestsForDateRange = async (startDate, endDate, uid = FAKE_UID) => {
  try {
    const eyeTests = await getUserEyeTests(uid);
    return eyeTests.filter(eyeTest => {
      const eyeTestDate = eyeTest.date;
      return eyeTestDate >= startDate && eyeTestDate <= endDate;
    });
  } catch (error) {
    console.error('Failed to get eye tests for date range:', error);
    return [];
  }
};

export const subscribeToEyeTestUpdates = (callback, uid = FAKE_UID) => {
  const eyeTestsRef = ref(database, `eye-test/${uid}`);
  onValue(eyeTestsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const eyeTests = Object.entries(data).map(([id, eyeTest]) => ({
        id,
        ...eyeTest
      }));
      callback(eyeTests);
    } else {
      callback([]);
    }
  });

  return () => off(eyeTestsRef);
};

export { app, functions, database, auth };
