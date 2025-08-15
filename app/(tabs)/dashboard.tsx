import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getUserAnalyses,
  getAnalysesForDateRange,
  subscribeToAnalysisUpdates,
  getUserEyeTests,
  subscribeToEyeTestUpdates,
  initializeAuth
} from '../../lib/firebase';
import { loadSampleAnalysisData } from '../../services/analysisService';
import { loadSampleEyeTestData, EyeTestData } from '../../services/eyeTestService';
import CognitiveMetricsChart from '../../components/CognitiveMetricsChart';

const { width } = Dimensions.get('window');

interface Analysis {
  id: string;
  timestamp: number;
  date: string;
  leftEyeStats?: {
    mean: number;
    std: number;
    min: number;
    max: number;
  };
  rightEyeStats?: {
    mean: number;
    std: number;
    min: number;
    max: number;
  };
  summary?: string;
  fatigueLevel?: 'low' | 'moderate' | 'high';
}

export default function DashboardScreen() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [eyeTests, setEyeTests] = useState<EyeTestData[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [eyeTestTodayCount, setEyeTestTodayCount] = useState(0);
  const [eyeTestWeekCount, setEyeTestWeekCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Analysis | null>(null);
  const [lastEyeTest, setLastEyeTest] = useState<EyeTestData | null>(null);

  useEffect(() => {
    initializeData();

    // Subscribe to real-time updates for analyses
    const unsubscribeAnalyses = subscribeToAnalysisUpdates((updatedAnalyses: Analysis[]) => {
      setAnalyses(updatedAnalyses);
      calculateStats(updatedAnalyses, eyeTests);

      // Check for new analysis and show notification
      if (updatedAnalyses.length > analyses.length) {
        const newest = updatedAnalyses[updatedAnalyses.length - 1];
        if (newest && newest.id !== lastAnalysis?.id) {
          Alert.alert(
            '🧠 Analysis Complete!',
            'Your cognitive fatigue analysis is ready. Check the results below.',
            [{ text: 'View Results', style: 'default' }]
          );
          setLastAnalysis(newest);
        }
      }
    });

    // Subscribe to real-time updates for eye tests
    const unsubscribeEyeTests = subscribeToEyeTestUpdates((updatedEyeTests: EyeTestData[]) => {
      setEyeTests(updatedEyeTests);
      calculateStats(analyses, updatedEyeTests);

      // Check for new eye test and show notification
      if (updatedEyeTests.length > eyeTests.length) {
        const newest = updatedEyeTests[updatedEyeTests.length - 1];
        if (newest && newest.id !== lastEyeTest?.id) {
          Alert.alert(
            '👁️ Eye Test Complete!',
            'Your eye test analysis is ready. Check the results below.',
            [{ text: 'View Results', style: 'default' }]
          );
          setLastEyeTest(newest);
        }
      }
    });

    return () => {
      unsubscribeAnalyses();
      unsubscribeEyeTests();
    };
  }, []);

  const initializeData = async () => {
    try {
      await initializeAuth();
      await loadAnalyses();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalyses = async () => {
    try {
      const allAnalyses = await getUserAnalyses();
      const allEyeTests = await getUserEyeTests();
      setAnalyses(allAnalyses);
      setEyeTests(allEyeTests);
      calculateStats(allAnalyses, allEyeTests);
    } catch (error) {
      console.error('Failed to load analyses:', error);
    }
  };

  const calculateStats = (analysesData: Analysis[], eyeTestsData: EyeTestData[] = []) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Calculate analysis stats
    const todayAnalyses = analysesData.filter(a => a.date === today);
    const weekAnalyses = analysesData.filter(a => a.date >= weekAgo);

    setTodayCount(todayAnalyses.length);
    setWeekCount(weekAnalyses.length);

    // Calculate eye test stats
    const todayEyeTests = eyeTestsData.filter(e => e.date === today);
    const weekEyeTests = eyeTestsData.filter(e => e.date && e.date >= weekAgo);

    setEyeTestTodayCount(todayEyeTests.length);
    setEyeTestWeekCount(weekEyeTests.length);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyses();
    setRefreshing(false);
  };

  const loadSampleData = async () => {
    try {
      setIsLoading(true);
      const result = await loadSampleAnalysisData();

      if (result.success) {
        Alert.alert(
          '✅ Sample Data Loaded',
          'Sample cognitive fatigue analysis data has been added to your dashboard!',
          [{ text: 'OK', onPress: () => loadAnalyses() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to load sample data');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load sample data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleEyeTest = async () => {
    try {
      setIsLoading(true);
      const result = await loadSampleEyeTestData('pupil_analysis');

      if (result.success) {
        Alert.alert(
          '✅ Sample Eye Test Data Loaded',
          'Sample eye test analysis data has been added to your dashboard!',
          [{ text: 'OK', onPress: () => loadAnalyses() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to load sample eye test data');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load sample eye test data');
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationBasedOnCount = () => {
    const totalToday = todayCount + eyeTestTodayCount;

    if (totalToday === 0) {
      return {
        title: "Start Your Day Right",
        message: "Take your first cognitive assessment or eye test to establish a baseline for today.",
        color: "#3B82F6",
        icon: "🌅"
      };
    } else if (totalToday < 3) {
      return {
        title: "Keep Monitoring",
        message: "Consider taking 2-3 assessments throughout the day for better insights.",
        color: "#10B981",
        icon: "📈"
      };
    } else if (totalToday >= 3 && totalToday < 6) {
      return {
        title: "Great Progress!",
        message: "You're doing well with regular monitoring. This helps track your cognitive and visual patterns.",
        color: "#059669",
        icon: "✅"
      };
    } else {
      return {
        title: "Excellent Monitoring",
        message: "You're taking great care of your cognitive and visual health with frequent assessments.",
        color: "#7C3AED",
        icon: "🏆"
      };
    }
  };

  const getDataPatternRecommendation = () => {
    const totalAssessments = analyses.length + eyeTests.length;

    if (totalAssessments < 3) {
      return {
        title: "Building Your Profile",
        message: "Take a few more assessments to start seeing meaningful patterns in your cognitive and visual data.",
        color: "#6B7280",
        icon: "📊"
      };
    }

    // Analyze recent patterns from both analyses and eye tests
    const recentAnalyses = analyses.slice(-3);
    const recentEyeTests = eyeTests.slice(-3);

    let avgPupilSize = 0;
    let avgFocusAccuracy = 0;
    let pupilCount = 0;
    let focusCount = 0;

    // Calculate average pupil size from analyses
    recentAnalyses.forEach(analysis => {
      const leftMean = analysis.leftEyeStats?.mean || 0;
      const rightMean = analysis.rightEyeStats?.mean || 0;
      if (leftMean > 0 || rightMean > 0) {
        avgPupilSize += (leftMean + rightMean) / 2;
        pupilCount++;
      }
    });

    // Calculate average focus accuracy from eye tests
    recentEyeTests.forEach(eyeTest => {
      if (eyeTest.focusAccuracy) {
        avgFocusAccuracy += eyeTest.focusAccuracy;
        focusCount++;
      }
    });

    avgPupilSize = pupilCount > 0 ? avgPupilSize / pupilCount : 0;
    avgFocusAccuracy = focusCount > 0 ? avgFocusAccuracy / focusCount : 0;

    // Determine recommendation based on combined data
    if (avgPupilSize < 2.2 || avgFocusAccuracy < 70) {
      return {
        title: "Potential Fatigue Detected",
        message: "Your recent assessments suggest increased cognitive fatigue or reduced visual performance. Consider taking breaks and ensuring adequate rest.",
        color: "#EF4444",
        icon: "⚠️"
      };
    } else if (avgPupilSize > 2.5 && avgFocusAccuracy > 85) {
      return {
        title: "Excellent Performance",
        message: "Your assessments indicate excellent cognitive alertness and visual performance. Keep up the great work!",
        color: "#10B981",
        icon: "🎯"
      };
    } else {
      return {
        title: "Balanced State",
        message: "Your cognitive and visual state appears balanced. Continue your current routine for optimal performance.",
        color: "#3B82F6",
        icon: "⚖️"
      };
    }
  };

  const countRecommendation = getRecommendationBasedOnCount();
  const patternRecommendation = getDataPatternRecommendation();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your cognitive health data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#1a365d', '#2d5a87']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>🧠 CogniFocus</Text>
          <Text style={styles.headerSubtitle}>Your Cognitive Fatigue Assistant</Text>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayCount}</Text>
            <Text style={styles.statLabel}>Analyses Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{eyeTestTodayCount}</Text>
            <Text style={styles.statLabel}>Eye Tests Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{weekCount + eyeTestWeekCount}</Text>
            <Text style={styles.statLabel}>Total This Week</Text>
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsContainer}>
          <Text style={styles.sectionTitle}>📋 Recommendations</Text>
          
          {/* Count-based recommendation */}
          <View style={[styles.recommendationCard, { borderLeftColor: countRecommendation.color }]}>
            <View style={styles.recommendationHeader}>
              <Text style={styles.recommendationIcon}>{countRecommendation.icon}</Text>
              <Text style={styles.recommendationTitle}>{countRecommendation.title}</Text>
            </View>
            <Text style={styles.recommendationMessage}>{countRecommendation.message}</Text>
          </View>

          {/* Pattern-based recommendation */}
          <View style={[styles.recommendationCard, { borderLeftColor: patternRecommendation.color }]}>
            <View style={styles.recommendationHeader}>
              <Text style={styles.recommendationIcon}>{patternRecommendation.icon}</Text>
              <Text style={styles.recommendationTitle}>{patternRecommendation.title}</Text>
            </View>
            <Text style={styles.recommendationMessage}>{patternRecommendation.message}</Text>
          </View>
        </View>

        {/* Cognitive Metrics Chart */}
        <View style={styles.chartContainer}>
          <CognitiveMetricsChart
            analyses={analyses}
            showReactionTime={true}
          />
        </View>

        {/* Recent Analysis Summary */}
        {lastAnalysis && (
          <View style={styles.recentAnalysisContainer}>
            <Text style={styles.sectionTitle}>🔬 Latest Analysis</Text>
            <View style={styles.analysisCard}>
              <Text style={styles.analysisDate}>
                {new Date(lastAnalysis.timestamp).toLocaleString()}
              </Text>
              {lastAnalysis.summary && (
                <Text style={styles.analysisSummary}>{lastAnalysis.summary}</Text>
              )}
              {lastAnalysis.leftEyeStats && (
                <Text style={styles.analysisStats}>
                  Left Eye: {lastAnalysis.leftEyeStats.mean.toFixed(2)}mm avg
                </Text>
              )}
              {lastAnalysis.rightEyeStats && (
                <Text style={styles.analysisStats}>
                  Right Eye: {lastAnalysis.rightEyeStats.mean.toFixed(2)}mm avg
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Recent Eye Test */}
        {lastEyeTest && (
          <View style={styles.recentAnalysisContainer}>
            <Text style={styles.sectionTitle}>👁️ Latest Eye Test</Text>
            <View style={styles.analysisCard}>
              <Text style={styles.analysisDate}>
                {lastEyeTest.timestamp ? new Date(lastEyeTest.timestamp).toLocaleString() : 'Recent'}
              </Text>
              <Text style={styles.analysisSummary}>
                Test Type: {lastEyeTest.testType?.replace('_', ' ').toUpperCase()}
              </Text>
              {lastEyeTest.summary && (
                <Text style={styles.analysisSummary}>{lastEyeTest.summary}</Text>
              )}
              {lastEyeTest.focusAccuracy && (
                <Text style={styles.analysisStats}>
                  Focus Accuracy: {lastEyeTest.focusAccuracy}%
                </Text>
              )}
              {lastEyeTest.reactionTime && (
                <Text style={styles.analysisStats}>
                  Reaction Time: {lastEyeTest.reactionTime}ms
                </Text>
              )}
              {lastEyeTest.blinkCount && (
                <Text style={styles.analysisStats}>
                  Blinks: {lastEyeTest.blinkCount} ({lastEyeTest.averageBlinkRate}/min)
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📹 New Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 View History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.sampleDataButton]}
            onPress={loadSampleData}
          >
            <Text style={styles.actionButtonText}>🧪 Load Sample Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.sampleDataButton]}
            onPress={loadSampleEyeTest}
          >
            <Text style={styles.actionButtonText}>👁️ Load Sample Eye Test</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e2e8f0',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  recommendationsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  recommendationCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  recommendationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  recentAnalysisContainer: {
    padding: 20,
  },
  analysisCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  analysisDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  analysisSummary: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  analysisStats: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  actionsContainer: {
    padding: 20,
  },
  actionButton: {
    backgroundColor: '#1a365d',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sampleDataButton: {
    backgroundColor: '#7c3aed',
  },
  chartContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
});
