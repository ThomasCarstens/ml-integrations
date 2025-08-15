import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { generatePupilAnalysis } from '../../lib/firebase';
import { processAndSaveAnalysis } from '../../services/analysisService';

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

export default function AnalysisScreen() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [pupilSelection, setPupilSelection] = useState<string>('both');
  const [tvModel, setTvModel] = useState<string>('ResNet18');
  const [blinkDetection, setBlinkDetection] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');

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
        setAnalysisResult(null);
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
    setAnalysisProgress('Preparing video...');

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

      setAnalysisProgress('Converting video to base64...');

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

      setAnalysisProgress('Analyzing cognitive fatigue patterns...');

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
        // Parse and save the analysis data
        const analysisData = await parseAndSaveAnalysis(result);
        
        Alert.alert(
          '🧠 Analysis Complete!', 
          'Your cognitive fatigue analysis is ready. The results have been saved to your dashboard.',
          [
            { text: 'View Results', style: 'default' },
            { text: 'Go to Dashboard', style: 'default' }
          ]
        );
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
      setAnalysisProgress('');
    }
  };

  const parseAndSaveAnalysis = async (result: AnalysisResult) => {
    try {
      // Get the result text - this should contain the result.txt format data
      let resultText = result.data?.summary || '';

      // If we have structured results, try to extract the raw data
      if (result.data?.results) {
        // The results might contain the raw CSV data
        resultText = JSON.stringify(result.data.results);
      }

      // Use the analysis service to process and save
      const processResult = await processAndSaveAnalysis(
        resultText,
        result.data?.analysisUrl,
        result.data?.metadata,
        {
          pupilSelection,
          tvModel,
          blinkDetection
        }
      );

      if (processResult.success) {
        console.log('Analysis processed and saved:', processResult.data);
        return processResult.data;
      } else {
        console.error('Failed to process analysis:', processResult.error);
        return null;
      }
    } catch (error) {
      console.error('Failed to parse and save analysis:', error);
      return null;
    }
  };

  const clearSelection = () => {
    setSelectedVideo(null);
    setAnalysisResult(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={['#1a365d', '#2d5a87']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>🔬 Cognitive Analysis</Text>
          <Text style={styles.headerSubtitle}>Upload a video to analyze your cognitive fatigue</Text>
        </LinearGradient>

        {/* Upload Section */}
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

        {/* Settings */}
        {selectedVideo && (
          <View style={styles.settingsSection}>
            <TouchableOpacity 
              style={styles.settingsHeader}
              onPress={() => setShowSettings(!showSettings)}
            >
              <Text style={styles.settingsTitle}>⚙️ Analysis Settings</Text>
              <Text style={styles.settingsToggle}>{showSettings ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {showSettings && (
              <View style={styles.settingsContent}>
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
                  <Text style={styles.settingLabel}>AI Model:</Text>
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
          </View>
        )}

        {/* Analyze Button */}
        {selectedVideo && (
          <TouchableOpacity
            style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
            onPress={analyzeVideo}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <View style={styles.loadingTextContainer}>
                  <Text style={styles.analyzeButtonText}>Analyzing...</Text>
                  {analysisProgress && (
                    <Text style={styles.progressText}>{analysisProgress}</Text>
                  )}
                </View>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>🧠 Analyze Cognitive Fatigue</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Results */}
        {analysisResult && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {analysisResult.success ? '✅ Analysis Complete' : '❌ Analysis Failed'}
            </Text>

            {analysisResult.success ? (
              <View>
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
                    <Text style={styles.resultText}>{analysisResult.data.summary}</Text>
                  </View>
                )}

                <View style={styles.resultItem}>
                  <Text style={styles.successMessage}>
                    ✅ Results saved to your dashboard! You can navigate away and check your dashboard for updates.
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.errorText}>{analysisResult.error}</Text>
            )}
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 About Cognitive Fatigue Analysis</Text>
          <Text style={styles.infoText}>
            • Analyzes pupil diameter changes to detect cognitive fatigue{'\n'}
            • Uses AI models to process eye movement patterns{'\n'}
            • Provides personalized recommendations{'\n'}
            • Tracks your cognitive health over time{'\n'}
            • Helps optimize your mental performance
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e2e8f0',
    textAlign: 'center',
  },
  uploadSection: {
    padding: 20,
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
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
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedVideoText: {
    color: '#065f46',
    fontSize: 14,
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#ef4444',
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
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  settingsToggle: {
    fontSize: 16,
    color: '#6b7280',
  },
  settingsContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  optionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  optionButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  toggleButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignSelf: 'flex-start',
  },
  toggleButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  toggleButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  analyzeButton: {
    backgroundColor: '#1a365d',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingTextContainer: {
    alignItems: 'center',
  },
  progressText: {
    color: '#e2e8f0',
    fontSize: 12,
    marginTop: 4,
  },
  resultsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    color: '#6b7280',
    lineHeight: 20,
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  successMessage: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
