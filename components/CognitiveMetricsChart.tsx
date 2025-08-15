import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

interface DataPoint {
  time: string;
  pupilDiameter: number;
  reactionTime?: number;
}

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
  reactionTime?: number; // Future implementation
}

interface CognitiveMetricsChartProps {
  analyses: Analysis[];
  showReactionTime?: boolean;
}

export default function CognitiveMetricsChart({ 
  analyses, 
  showReactionTime = false 
}: CognitiveMetricsChartProps) {
  // Process data for today only
  const today = new Date().toISOString().split('T')[0];
  const todayAnalyses = analyses
    .filter(analysis => analysis.date === today)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (todayAnalyses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>📊 No data for today</Text>
        <Text style={styles.emptySubtext}>
          Take your first measurement to see cognitive trends throughout the day
        </Text>
      </View>
    );
  }

  // Prepare chart data
  const chartData = todayAnalyses.map(analysis => {
    const time = new Date(analysis.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    let avgPupilDiameter = 0;
    let count = 0;

    if (analysis.leftEyeStats && analysis.leftEyeStats.mean > 0) {
      avgPupilDiameter += analysis.leftEyeStats.mean;
      count++;
    }

    if (analysis.rightEyeStats && analysis.rightEyeStats.mean > 0) {
      avgPupilDiameter += analysis.rightEyeStats.mean;
      count++;
    }

    avgPupilDiameter = count > 0 ? avgPupilDiameter / count : 0;

    return {
      time,
      pupilDiameter: avgPupilDiameter,
      reactionTime: analysis.reactionTime || Math.random() * 200 + 300 // Mock data for now
    };
  });

  // Generate conclusions based on the data
  const generateConclusions = (data: DataPoint[]) => {
    if (data.length < 2) {
      return {
        trend: 'insufficient',
        message: 'Need more measurements to identify trends',
        recommendation: 'Take additional measurements throughout the day',
        icon: '📊'
      };
    }

    const pupilSizes = data.map(d => d.pupilDiameter);
    const firstHalf = pupilSizes.slice(0, Math.ceil(pupilSizes.length / 2));
    const secondHalf = pupilSizes.slice(Math.ceil(pupilSizes.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const pupilTrend = secondHalfAvg - firstHalfAvg;
    const pupilVariability = Math.sqrt(
      pupilSizes.reduce((sum, val) => sum + Math.pow(val - (pupilSizes.reduce((s, v) => s + v, 0) / pupilSizes.length), 2), 0) / pupilSizes.length
    );

    // Analyze trends
    if (pupilTrend < -0.1) {
      return {
        trend: 'declining',
        message: 'Pupil diameter decreasing throughout the day - indicates increasing cognitive fatigue',
        recommendation: 'Consider taking breaks, reducing cognitive load, or checking sleep quality',
        icon: '📉',
        color: '#EF4444'
      };
    } else if (pupilTrend > 0.1) {
      return {
        trend: 'improving',
        message: 'Pupil diameter increasing - cognitive alertness improving throughout the day',
        recommendation: 'Great! Your cognitive state is improving. Maintain current activities',
        icon: '📈',
        color: '#10B981'
      };
    } else if (pupilVariability > 0.15) {
      return {
        trend: 'variable',
        message: 'High variability in pupil diameter - inconsistent cognitive state',
        recommendation: 'Try to maintain consistent work patterns and minimize distractions',
        icon: '📊',
        color: '#F59E0B'
      };
    } else {
      return {
        trend: 'stable',
        message: 'Stable pupil diameter - consistent cognitive performance',
        recommendation: 'Excellent cognitive stability. Continue your current routine',
        icon: '⚖️',
        color: '#3B82F6'
      };
    }
  };

  const conclusions = generateConclusions(chartData);

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(26, 54, 93, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#1a365d',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
  };

  // Prepare data for LineChart
  const pupilData = {
    labels: chartData.map(d => d.time),
    datasets: [
      {
        data: chartData.map(d => d.pupilDiameter),
        color: (opacity = 1) => `rgba(26, 54, 93, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const reactionTimeData = showReactionTime ? {
    labels: chartData.map(d => d.time),
    datasets: [
      {
        data: chartData.map(d => d.reactionTime || 0),
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  } : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📈 Today's Cognitive Trends</Text>
      
      {/* Pupil Diameter Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Average Pupil Diameter (mm)</Text>
        <LineChart
          data={pupilData}
          width={screenWidth - 60}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={true}
          withHorizontalLines={true}
          fromZero={false}
        />
      </View>

      {/* Reaction Time Chart (if enabled) */}
      {showReactionTime && reactionTimeData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Reaction Time (ms)</Text>
          <Text style={styles.comingSoonText}>🚧 Coming Soon - Reaction Time Analysis</Text>
          <LineChart
            data={reactionTimeData}
            width={screenWidth - 60}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
            }}
            bezier
            style={[styles.chart, styles.disabledChart]}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            fromZero={false}
          />
        </View>
      )}

      {/* Conclusions */}
      <View style={[styles.conclusionsContainer, { borderLeftColor: conclusions.color }]}>
        <View style={styles.conclusionHeader}>
          <Text style={styles.conclusionIcon}>{conclusions.icon}</Text>
          <Text style={styles.conclusionTitle}>Cognitive Pattern Analysis</Text>
        </View>
        <Text style={styles.conclusionMessage}>{conclusions.message}</Text>
        <Text style={styles.conclusionRecommendation}>
          💡 <Text style={styles.recommendationText}>{conclusions.recommendation}</Text>
        </Text>
      </View>

      {/* Data Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>📊 Today's Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Measurements:</Text>
          <Text style={styles.summaryValue}>{chartData.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Avg Pupil Size:</Text>
          <Text style={styles.summaryValue}>
            {(chartData.reduce((sum, d) => sum + d.pupilDiameter, 0) / chartData.length).toFixed(2)}mm
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time Range:</Text>
          <Text style={styles.summaryValue}>
            {chartData[0]?.time} - {chartData[chartData.length - 1]?.time}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#f59e0b',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  chart: {
    borderRadius: 8,
  },
  disabledChart: {
    opacity: 0.6,
  },
  conclusionsContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  conclusionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conclusionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  conclusionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  conclusionMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  conclusionRecommendation: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  recommendationText: {
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '500',
  },
});
