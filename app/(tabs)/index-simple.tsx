import * as FileSystem from 'expo-file-system';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions
} from 'react-native';

// Define types for our data structures
interface HistoryItem {
  id: number;
  text: string;
  voice: string;
  speed: number;
  uri: string;
  timestamp: string;
}

const { width } = Dimensions.get('window');

function TTSScreen() {
  const [text, setText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [voice, setVoice] = useState<string>('alloy');
  const [speed, setSpeed] = useState<number>(1.0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Available voices (OpenAI TTS voices)
  const voices = [
    { label: 'Alloy (Neutral)', value: 'alloy' },
    { label: 'Echo (Male)', value: 'echo' },
    { label: 'Fable (British)', value: 'fable' },
    { label: 'Onyx (Deep Male)', value: 'onyx' },
    { label: 'Nova (Female)', value: 'nova' },
    { label: 'Shimmer (Soft Female)', value: 'shimmer' },
  ];

  // Mock TTS generation for demo purposes
  const generateTTS = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter some text to convert to speech');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a mock audio file
      const fileName = `tts_${Date.now()}.mp3`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // For demo, we'll create an empty file
      await FileSystem.writeAsStringAsync(fileUri, '', {
        encoding: FileSystem.EncodingType.UTF8,
      });

      setAudioUri(fileUri);
      
      // Add to history
      const historyItem: HistoryItem = {
        id: Date.now(),
        text: text.trim(),
        voice,
        speed,
        uri: fileUri,
        timestamp: new Date().toLocaleString()
      };
      
      setHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Keep last 10
      
      Alert.alert('Demo Mode', 'TTS generation simulated successfully! In a real app, this would generate actual audio.');
      
    } catch (error) {
      console.error('TTS Error:', error);
      Alert.alert('TTS Error', 'Failed to generate speech. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Play audio (demo mode)
  const playAudio = async (_uri: string) => {
    try {
      setIsPlaying(true);
      
      // Simulate playback duration
      setTimeout(() => {
        setIsPlaying(false);
      }, 3000);
      
      Alert.alert('Demo Mode', 'Audio playback simulated! In a real app, this would play the generated speech.');
      
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio');
      setIsPlaying(false);
    }
  };

  // Stop audio (demo mode)
  const stopAudio = async () => {
    setIsPlaying(false);
    Alert.alert('Demo Mode', 'Audio playback stopped!');
  };

  // Clear text
  const clearText = () => {
    setText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Text-to-Speech</Text>
          <Text style={styles.subtitle}>Convert your text to natural speech</Text>
        </View>

        {/* Text Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Text</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Type or paste your text here..."
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
          <View style={styles.textInfo}>
            <Text style={styles.charCount}>{text.length}/1000 characters</Text>
            <TouchableOpacity onPress={clearText} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice: {voice}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voiceScroll}>
            {voices.map((v) => (
              <TouchableOpacity
                key={v.value}
                style={[styles.voiceButton, voice === v.value && styles.voiceButtonActive]}
                onPress={() => setVoice(v.value)}
              >
                <Text style={[styles.voiceButtonText, voice === v.value && styles.voiceButtonTextActive]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Speed Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Speed: {speed.toFixed(1)}x</Text>
          <View style={styles.speedContainer}>
            <TouchableOpacity
              style={styles.speedButton}
              onPress={() => setSpeed(Math.max(0.5, speed - 0.1))}
            >
              <Text style={styles.speedButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.speedValue}>{speed.toFixed(1)}x</Text>
            <TouchableOpacity
              style={styles.speedButton}
              onPress={() => setSpeed(Math.min(2.0, speed + 0.1))}
            >
              <Text style={styles.speedButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, (isGenerating || !text.trim()) && styles.generateButtonDisabled]}
          onPress={generateTTS}
          disabled={isGenerating || !text.trim()}
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
            <Text style={styles.sectionTitle}>Audio Controls</Text>
            <View style={styles.audioControls}>
              <TouchableOpacity
                style={[styles.audioButton, isPlaying && styles.audioButtonActive]}
                onPress={() => isPlaying ? stopAudio() : playAudio(audioUri)}
              >
                <Text style={styles.audioButtonText}>
                  {isPlaying ? 'Stop' : 'Play'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Generations</Text>
            {history.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <Text style={styles.historyText} numberOfLines={2}>
                  {item.text}
                </Text>
                <Text style={styles.historyMeta}>
                  {item.voice} • {item.speed}x • {item.timestamp}
                </Text>
                <TouchableOpacity
                  style={styles.historyPlayButton}
                  onPress={() => playAudio(item.uri)}
                >
                  <Text style={styles.historyPlayButtonText}>Play</Text>
                </TouchableOpacity>
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
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#ff6b6b',
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  voiceScroll: {
    marginTop: 5,
  },
  voiceButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  voiceButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  voiceButtonText: {
    fontSize: 14,
    color: '#333',
  },
  voiceButtonTextActive: {
    color: '#fff',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  speedButton: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  speedValue: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    minWidth: 50,
    textAlign: 'center',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  audioControls: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  audioButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  audioButtonActive: {
    backgroundColor: '#dc3545',
  },
  audioButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  historyText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  historyMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  historyPlayButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  historyPlayButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TTSScreen;
