import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { generatePupilAnalysis, testConnection } from '../../lib/firebase';

interface AnalysisResult {
  success: boolean;
  data?: {
    analysisUrl?: string;
    results?: any;
    summary?: string;
    metadata?: {
      timestamp: string;
      processingTime?: number;
      workingEndpoint?: string;
    };
  };
  error?: string;
}

export default function HomeScreen() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [pupilSelection, setPupilSelection] = useState<string>('both');
  const [tvModel, setTvModel] = useState<string>('ResNet18');
  const [blinkDetection, setBlinkDetection] = useState<boolean>(true);

  const selectVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Selected video:', asset.uri);
        setSelectedVideo(asset.uri);
        setAnalysisResult(null); // Clear previous results
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const analyzeVideo = async () => {
    if (!selectedVideo) {
      Alert.alert('Error', 'Please select a video first');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      console.log('Starting pupil analysis...');

      // Check file size first
      const fileInfo = await FileSystem.getInfoAsync(selectedVideo);
      if (fileInfo.exists && fileInfo.size) {
        const fileSizeMB = fileInfo.size / (1024 * 1024);
        console.log(`Video file size: ${fileSizeMB.toFixed(2)} MB`);

        if (fileSizeMB > 50) {
          Alert.alert('File Too Large', 'Please select a video file smaller than 50MB');
          return;
        }
      }

      console.log('Converting video to base64...');

      // Convert video file to base64
      const base64Video = await FileSystem.readAsStringAsync(selectedVideo, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Detect video format from file extension
      const fileExtension = selectedVideo.split('.').pop()?.toLowerCase() || 'mp4';
      const mimeType = fileExtension === 'webm' ? 'video/webm' :
                      fileExtension === 'mov' ? 'video/quicktime' :
                      fileExtension === 'avi' ? 'video/x-msvideo' : 'video/mp4';

      // Create data URL format with correct MIME type
      const videoDataUrl = `data:${mimeType};base64,${base64Video}`;
      console.log(`Video converted to base64, size: ${(base64Video.length / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Detected format: ${fileExtension}, MIME type: ${mimeType}`);

      const firebaseResult = await generatePupilAnalysis({
        video_input: videoDataUrl,
        pupil_selection: pupilSelection,
        tv_model: tvModel,
        blink_detection: blinkDetection,
      });

      // Extract the actual result from Firebase callable response
      const result = firebaseResult.data as AnalysisResult;
      console.log('Analysis result:', result);
      setAnalysisResult(result);

      if (result.success) {
        Alert.alert('Analysis Complete', 'Pupil analysis completed successfully!');
      } else {
        Alert.alert('Analysis Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult({
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      });
      Alert.alert('Error', 'Failed to analyze video');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearSelection = () => {
    setSelectedVideo(null);
    setAnalysisResult(null);
  };

  const testConnectionToAPI = async () => {
    try {
      console.log('Testing connection to PupilSense API...');
      const result = await testConnection({});
      console.log('Connection test result:', result);

      if (result.data.success) {
        Alert.alert('Connection Test', 'Successfully connected to PupilSense API!');
      } else {
        Alert.alert('Connection Test Failed', result.data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      Alert.alert('Connection Test Error', error instanceof Error ? error.message : 'Failed to test connection');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>👁️ PupilSense</Text>
          <Text style={styles.subtitle}>Pupil Diameter Analysis</Text>

          <TouchableOpacity style={styles.testButton} onPress={testConnectionToAPI}>
            <Text style={styles.testButtonText}>🔗 Test API Connection</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.uploadSection}>
          <TouchableOpacity style={styles.uploadButton} onPress={selectVideo}>
            <Text style={styles.uploadButtonText}>
              {selectedVideo ? '📹 Change Video' : '📹 Select Video'}
            </Text>
          </TouchableOpacity>

          {selectedVideo && (
            <View style={styles.selectedVideoInfo}>
              <Text style={styles.selectedVideoText}>
                ✅ Video selected: {selectedVideo.split('/').pop()}
              </Text>
              <TouchableOpacity style={styles.clearButton} onPress={clearSelection}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {selectedVideo && (
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>Analysis Settings</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Pupil Selection:</Text>
              <View style={styles.buttonGroup}>
                {['both', 'left_pupil', 'right_pupil'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      pupilSelection === option && styles.optionButtonActive
                    ]}
                    onPress={() => setPupilSelection(option)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      pupilSelection === option && styles.optionButtonTextActive
                    ]}>
                      {option === 'both' ? 'Both' : option === 'left_pupil' ? 'Left' : 'Right'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Model:</Text>
              <View style={styles.buttonGroup}>
                {['ResNet18', 'ResNet50'].map((model) => (
                  <TouchableOpacity
                    key={model}
                    style={[
                      styles.optionButton,
                      tvModel === model && styles.optionButtonActive
                    ]}
                    onPress={() => setTvModel(model)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      tvModel === model && styles.optionButtonTextActive
                    ]}>
                      {model}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Blink Detection:</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  blinkDetection && styles.toggleButtonActive
                ]}
                onPress={() => setBlinkDetection(!blinkDetection)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  blinkDetection && styles.toggleButtonTextActive
                ]}>
                  {blinkDetection ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {selectedVideo && (
          <TouchableOpacity
            style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
            onPress={analyzeVideo}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.analyzeButtonText}>Analyzing...</Text>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>🔍 Analyze Video</Text>
            )}
          </TouchableOpacity>
        )}

        {analysisResult && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {analysisResult.success ? '✅ Analysis Results' : '❌ Analysis Failed'}
            </Text>

            {analysisResult.success ? (
              <View>
                {analysisResult.data?.analysisUrl && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Analysis Image:</Text>
                    <Image
                      source={{ uri: analysisResult.data.analysisUrl }}
                      style={styles.resultImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {analysisResult.data?.summary && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Summary:</Text>
                    <Text style={styles.resultText}>{analysisResult.data.summary}</Text>
                  </View>
                )}

                {analysisResult.data?.metadata && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Details:</Text>
                    <Text style={styles.resultText}>
                      Endpoint: {analysisResult.data.metadata.workingEndpoint || 'Unknown'}
                    </Text>
                    <Text style={styles.resultText}>
                      Processed: {new Date(analysisResult.data.metadata.timestamp).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.errorText}>{analysisResult.error}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  selectedVideoInfo: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedVideoText: {
    color: '#2d5a2d',
    fontSize: 14,
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingRow: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'flex-start',
  },
  toggleButtonActive: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  toggleButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  analyzeButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#999',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  resultItem: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    lineHeight: 20,
  },
});
