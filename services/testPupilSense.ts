/**
 * Test script for PupilSense service
 * Run this to verify the service configuration
 */

import { testPupilSenseConnection, getPupilSenseConfig } from './pupilSenseService';

export async function runPupilSenseTests() {
  console.log('🧪 Running PupilSense Service Tests');
  console.log('=' * 40);
  
  // Test 1: Configuration
  console.log('\n📋 Configuration Test:');
  const config = getPupilSenseConfig();
  console.log('API URL:', config.apiUrl);
  console.log('Timeout:', config.timeout, 'ms');
  console.log('Supported formats:', config.supportedFormats.join(', '));
  console.log('Max file size:', config.maxFileSize / 1024 / 1024, 'MB');
  console.log('Max duration:', config.maxDuration, 'seconds');
  
  // Test 2: Connection
  console.log('\n🌐 Connection Test:');
  const isConnected = await testPupilSenseConnection();
  
  if (isConnected) {
    console.log('✅ PupilSense API is accessible');
    console.log('🎉 Service is ready to use!');
  } else {
    console.log('❌ PupilSense API is not accessible');
    console.log('💡 Make sure:');
    console.log('   1. PupilSense Gradio app is running');
    console.log('   2. API URL in .env is correct');
    console.log('   3. Network connection is available');
  }
  
  return isConnected;
}

// Export for use in React Native components
export default runPupilSenseTests;
