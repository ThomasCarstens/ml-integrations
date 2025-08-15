// PupilSense Screen - Pupil diameter analysis
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
import { generatePupilAnalysis } from '../../lib/firebase';
import { processEyeTestResult } from '../../services/eyeTestService';

interface AnalysisResult {
  success: boolean;
  data?: {
    analysisUrl?: string;
    results?: any;
    summary?: string;
    metadata?: {
      timestamp: string;
      processingTime?: number;
    };
  };
  error?: string;
}

export default function PupilSenseScreen() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

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
      const firebaseResult = await generatePupilAnalysis({
        video_input: selectedVideo,
        pupil_selection: 'both',
        tv_model: 'ResNet18',
        blink_detection: true,
      });

      // Extract the actual result from Firebase callable response
      const result = firebaseResult.data as AnalysisResult;
      console.log('Analysis result:', result);
      setAnalysisResult(result);

      if (result.success && result.data?.results) {
        // Save to eye test database as well
        try {
          console.log('Saving eye test result...');
          const eyeTestResult = await processEyeTestResult(
            result.data.results, // The raw analysis results
            result.data.analysisUrl,
            {
              ...result.data.metadata,
              source: 'pupilsense_analysis',
              originalAnalysis: true
            },
            'pupil_analysis',
            30, // Default test duration
            {
              pupilSelection: 'both',
              tvModel: 'ResNet18',
              blinkDetection: true
            }
          );

          if (eyeTestResult.success) {
            console.log('Eye test result saved successfully');
            Alert.alert(
              '✅ Analysis Complete',
              'Pupil analysis completed and saved to your eye test history!',
              [{ text: 'View Dashboard', style: 'default' }]
            );
          } else {
            console.warn('Failed to save eye test result:', eyeTestResult.error);
            Alert.alert('Analysis Complete', 'Pupil analysis completed successfully!');
          }
        } catch (eyeTestError) {
          console.error('Error saving eye test result:', eyeTestError);
          Alert.alert('Analysis Complete', 'Pupil analysis completed successfully!');
        }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>PupilSense</Text>
          <Text style={styles.subtitle}>
            Select a video from your gallery to analyze pupil diameter and blink patterns
          </Text>
        </View>

        <View style={styles.uploadSection}>
          <TouchableOpacity style={styles.selectButton} onPress={selectVideo}>
            <Text style={styles.selectButtonText}>📹 Select Video from Gallery</Text>
          </TouchableOpacity>

          {selectedVideo && (
            <View style={styles.selectedVideoInfo}>
              <Text style={styles.selectedVideoText}>✅ Video selected</Text>
              <Text style={styles.videoPath} numberOfLines={2}>
                {selectedVideo}
              </Text>
            </View>
          )}
        </View>

        {selectedVideo && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.analyzeButton, isAnalyzing && styles.disabledButton]}
              onPress={analyzeVideo}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.analyzeButtonText}>Analyzing...</Text>
                </View>
              ) : (
                <Text style={styles.analyzeButtonText}>🧠 Analyze Pupil Diameter</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearSelection}
              disabled={isAnalyzing}
            >
              <Text style={styles.clearButtonText}>🗑️ Clear Selection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Analysis Results</Text>

            {analysisResult.success ? (
              <View style={styles.successResults}>
                <Text style={styles.successText}>✅ Analysis completed successfully!</Text>

                {analysisResult.data?.analysisUrl && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Analysis Visualization:</Text>
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
                    <Text style={styles.resultText}>
                      {analysisResult.data.summary}
                    </Text>
                  </View>
                )}

                {analysisResult.data?.metadata && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Processing Info:</Text>
                    <Text style={styles.resultText}>
                      Completed: {new Date(analysisResult.data.metadata.timestamp).toLocaleString()}
                    </Text>
                    {analysisResult.data.metadata.processingTime && (
                      <Text style={styles.resultText}>
                        Processing time: {(analysisResult.data.metadata.processingTime / 1000).toFixed(1)}s
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.errorResults}>
                <Text style={styles.errorText}>
                  ❌ Analysis failed: {analysisResult.error}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About PupilSense</Text>
          <Text style={styles.infoText}>
            • Upload videos from your gallery{'\n'}
            • Analyzes pupil diameter using AI models{'\n'}
            • Detects blink patterns and timing{'\n'}
            • Provides detailed visual analysis{'\n'}
            • Supports common video formats (MP4, MOV, etc.)
          </Text>
        </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  uploadSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedVideoInfo: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  selectedVideoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 5,
  },
  videoPath: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  actionSection: {
    gap: 15,
  },
  analyzeButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clearButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  successResults: {
    // Success results container
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 15,
  },
  errorResults: {
    // Error results container
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    padding: 15,
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  resultItem: {
    marginBottom: 15,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
    backgroundColor: '#f8f9fa',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
