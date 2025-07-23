import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { generateTTSViaFirebase } from '../../services/ttsService';

// Define types for our data structures
interface HistoryItem {
  id: number;
  text: string;
  exaggeration: number;
  temperature: number;
  seed: number;
  cfgw: number;
  uri: string;
  timestamp: string;
}

function TTSScreen() {
  const [text, setText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [exaggeration, setExaggeration] = useState<number>(0.5);
  const [temperature, setTemperature] = useState<number>(0.8);
  const [seed, setSeed] = useState<number>(0);
  const [cfgw, setCfgw] = useState<number>(0.5);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Generate TTS using Firebase Functions
  const generateTTSAudio = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter some text to convert to speech');
      return;
    }

    if (text.trim().length > 300) {
      Alert.alert('Error', 'Text must be 300 characters or less');
      return;
    }

    setIsGenerating(true);

    try {
      // Call Firebase Function to generate TTS
      const result = await generateTTSViaFirebase({
        text_input: text.trim(),
        exaggeration_input: exaggeration,
        temperature_input: temperature,
        seed_num_input: seed,
        cfgw_input: cfgw,
      });

      console.log('Firebase TTS Result:', result);

      // Check if the request was successful
      if (!result.success) {
        throw new Error(result.error || 'TTS generation failed');
      }

      // Extract audio URL from the response
      const audioUrl = result.data.audioUrl;
      if (!audioUrl) {
        throw new Error('No audio URL received from server');
      }

      // Download and save the audio file
      const fileName = `tts_${Date.now()}.wav`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(audioUrl, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download audio file: ${downloadResult.status}`);
      }

      setAudioUri(fileUri);

      // Create a history entry
      const historyItem: HistoryItem = {
        id: Date.now(),
        text: text.trim(),
        exaggeration,
        temperature,
        seed,
        cfgw,
        uri: fileUri,
        timestamp: new Date().toLocaleString()
      };

      setHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Keep last 10

      // Auto-play the generated audio
      await playAudio(fileUri);

      Alert.alert('Success', 'High-quality speech generated with Chatterbox!');

    } catch (error) {
      console.error('TTS Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('TTS Error', `Failed to generate speech: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Play audio function
  const playAudio = async (uri: string) => {
    try {
      setIsPlaying(true);
      
      // Unload any existing sound first
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      // Set up playback status update
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
        }
      });

    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio');
      setIsPlaying(false);
    }
  };

  // Stop audio playback
  const stopAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      setIsPlaying(false);
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  // Play history item
  const playHistoryItem = async (item: HistoryItem) => {
    try {
      await playAudio(item.uri);
    } catch (error) {
      console.error('Error playing history item:', error);
      Alert.alert('Error', 'Failed to play audio');
      setIsPlaying(false);
    }
  };

  // Clear text
  const clearText = () => {
    setText('');
  };

  // Reset parameters to defaults
  const resetParameters = () => {
    setExaggeration(0.5);
    setTemperature(0.8);
    setSeed(0);
    setCfgw(0.5);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Text-to-Speech</Text>
          <Text style={styles.subtitle}>Convert your text to natural speech with Chatterbox</Text>
        </View>

        {/* Text Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Text (Max 300 characters)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Type or paste your text here..."
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
            maxLength={300}
          />
          <View style={styles.textInfo}>
            <Text style={[styles.charCount, text.length > 300 && styles.charCountError]}>
              {text.length}/300 characters
            </Text>
            <TouchableOpacity onPress={clearText} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Parameters */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Voice Parameters</Text>
            <TouchableOpacity onPress={resetParameters} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
          
          {/* Exaggeration */}
          <View style={styles.parameterRow}>
            <Text style={styles.parameterLabel}>Exaggeration: {exaggeration.toFixed(2)}</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>0</Text>
              <View style={styles.slider}>
                <TouchableOpacity 
                  style={[styles.sliderTrack, { width: `${exaggeration * 100}%` }]}
                  onPress={() => {}}
                />
              </View>
              <Text style={styles.sliderLabel}>1</Text>
            </View>
          </View>

          {/* Temperature */}
          <View style={styles.parameterRow}>
            <Text style={styles.parameterLabel}>Temperature: {temperature.toFixed(2)}</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>0</Text>
              <View style={styles.slider}>
                <TouchableOpacity 
                  style={[styles.sliderTrack, { width: `${temperature * 100}%` }]}
                  onPress={() => {}}
                />
              </View>
              <Text style={styles.sliderLabel}>1</Text>
            </View>
          </View>

          {/* Seed */}
          <View style={styles.parameterRow}>
            <Text style={styles.parameterLabel}>Seed: {seed}</Text>
            <View style={styles.seedControls}>
              <TouchableOpacity 
                style={styles.seedButton}
                onPress={() => setSeed(Math.max(0, seed - 1))}
              >
                <Text style={styles.seedButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.seedValue}>{seed}</Text>
              <TouchableOpacity 
                style={styles.seedButton}
                onPress={() => setSeed(seed + 1)}
              >
                <Text style={styles.seedButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CFGW */}
          <View style={styles.parameterRow}>
            <Text style={styles.parameterLabel}>CFGW: {cfgw.toFixed(2)}</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>0</Text>
              <View style={styles.slider}>
                <TouchableOpacity 
                  style={[styles.sliderTrack, { width: `${cfgw * 100}%` }]}
                  onPress={() => {}}
                />
              </View>
              <Text style={styles.sliderLabel}>1</Text>
            </View>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, (isGenerating || !text.trim() || text.length > 300) && styles.generateButtonDisabled]}
          onPress={generateTTSAudio}
          disabled={isGenerating || !text.trim() || text.length > 300}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Speech</Text>
          )}
        </TouchableOpacity>

        {/* Audio Controls */}
        {audioUri && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generated Audio</Text>
            <View style={styles.audioControls}>
              <TouchableOpacity
                style={[styles.audioButton, isPlaying && styles.audioButtonActive]}
                onPress={() => playAudio(audioUri)}
                disabled={isPlaying}
              >
                <Text style={styles.audioButtonText}>
                  {isPlaying ? 'Playing...' : 'Play Audio'}
                </Text>
              </TouchableOpacity>

              {isPlaying && (
                <TouchableOpacity
                  style={styles.audioButton}
                  onPress={stopAudio}
                >
                  <Text style={styles.audioButtonText}>Stop</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Generations</Text>
            {history.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyText} numberOfLines={2}>
                    {item.text}
                  </Text>
                  <TouchableOpacity
                    style={styles.historyPlayButton}
                    onPress={() => playHistoryItem(item)}
                  >
                    <Text style={styles.historyPlayButtonText}>▶</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.historyTimestamp}>{item.timestamp}</Text>
                <Text style={styles.historyParams}>
                  Exag: {item.exaggeration.toFixed(2)} | Temp: {item.temperature.toFixed(2)} |
                  Seed: {item.seed} | CFGW: {item.cfgw.toFixed(2)}
                </Text>
              </View>
            ))}
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
  scrollView: {
    flex: 1,
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
  },
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  textInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  charCount: {
    fontSize: 14,
    color: '#666',
  },
  charCountError: {
    color: '#e74c3c',
  },
  clearButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  clearButtonText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  resetButtonText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
  },
  parameterRow: {
    marginBottom: 20,
  },
  parameterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    width: 20,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    position: 'relative',
  },
  sliderTrack: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 3,
  },
  seedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  seedButton: {
    width: 40,
    height: 40,
    backgroundColor: '#007bff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  seedValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  generateButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  audioControls: {
    flexDirection: 'row',
    gap: 10,
  },
  audioButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  audioButtonActive: {
    backgroundColor: '#0056b3',
  },
  audioButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 15,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginRight: 10,
  },
  historyPlayButton: {
    width: 30,
    height: 30,
    backgroundColor: '#007bff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyPlayButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  historyTimestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyParams: {
    fontSize: 11,
    color: '#999',
  },
});

export default TTSScreen;
