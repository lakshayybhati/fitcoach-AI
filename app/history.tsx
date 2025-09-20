import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Calendar, TrendingUp, Activity, Target, Scale } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { useUserStore } from '@/hooks/useUserStore';
import { theme } from '@/constants/colors';

type TimeRange = '7d' | '14d' | '30d';

export default function HistoryScreen() {
  const { getRecentCheckins, plans, getWeightData, getWeightProgress, user } = useUserStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
  const recentCheckins = getRecentCheckins(days);
  const recentPlans = plans.slice(-days);
  const weightData = getWeightData();
  const weightProgress = getWeightProgress();

  const getAverageEnergy = () => {
    const energyLevels = recentCheckins
      .filter(c => c.energy)
      .map(c => c.energy!);
    
    if (energyLevels.length === 0) return 0;
    return energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length;
  };

  const getAverageStress = () => {
    const stressLevels = recentCheckins
      .filter(c => c.stress)
      .map(c => c.stress!);
    
    if (stressLevels.length === 0) return 0;
    return stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length;
  };

  const getCompletionRate = () => {
    if (recentPlans.length === 0) return 0;
    const completedPlans = recentPlans.filter(p => p.adherence && p.adherence > 0.5);
    return (completedPlans.length / recentPlans.length) * 100;
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeSelector}>
      {(['7d', '14d', '30d'] as TimeRange[]).map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            timeRange === range && styles.activeTimeRange,
          ]}
          onPress={() => setTimeRange(range)}
        >
          <Text style={[
            styles.timeRangeText,
            timeRange === range && styles.activeTimeRangeText,
          ]}>
            {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsGrid}>
      <Card style={styles.statCard}>
        <View style={styles.statContent}>
          <Activity color={theme.color.accent.primary} size={24} />
          <Text style={styles.statValue}>{recentCheckins.length}</Text>
          <Text style={styles.statLabel}>Check-ins</Text>
        </View>
      </Card>

      <Card style={styles.statCard}>
        <View style={styles.statContent}>
          <TrendingUp color={theme.color.accent.green} size={24} />
          <Text style={styles.statValue}>{getAverageEnergy().toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Energy</Text>
        </View>
      </Card>

      <Card style={styles.statCard}>
        <View style={styles.statContent}>
          <Calendar color={theme.color.accent.blue} size={24} />
          <Text style={styles.statValue}>{getCompletionRate().toFixed(0)}%</Text>
          <Text style={styles.statLabel}>Completion</Text>
        </View>
      </Card>
    </View>
  );

  const renderWeightChart = () => {
    if (!user?.goalWeight || weightData.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Progress</Text>
          <Text style={styles.noDataText}>
            {!user?.goalWeight ? 'Set a goal weight to track progress' : 'No weight data available'}
          </Text>
        </Card>
      );
    }

    const recentWeightData = weightData.slice(-10); // Show last 10 entries
    const minWeight = Math.min(...recentWeightData.map(d => d.weight), user.goalWeight) - 2;
    const maxWeight = Math.max(...recentWeightData.map(d => d.weight), user.goalWeight) + 2;
    const weightRange = maxWeight - minWeight;

    return (
      <Card style={styles.weightCard}>
        <View style={styles.weightHeader}>
          <View style={styles.weightTitleContainer}>
            <Scale color={theme.color.accent.primary} size={24} />
            <Text style={styles.chartTitle}>Weight Progress</Text>
          </View>
          {weightProgress && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {weightProgress.remaining.toFixed(1)} kg {weightProgress.isGaining ? 'to gain' : 'to lose'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.weightChart}>
          {/* Goal line */}
          <View 
            style={[
              styles.goalLine,
              { 
                bottom: `${((user.goalWeight - minWeight) / weightRange) * 100}%` 
              }
            ]}
          >
            <View style={styles.goalLineIndicator} />
            <Text style={styles.goalLineText}>Goal: {user.goalWeight}kg</Text>
          </View>
          
          {/* Weight points and line */}
          <View style={styles.weightLine}>
            {recentWeightData.map((point, index) => {
              const x = (index / (recentWeightData.length - 1)) * 100;
              const y = ((point.weight - minWeight) / weightRange) * 100;
              const date = new Date(point.date);
              
              return (
                <View key={index}>
                  <View 
                    style={[
                      styles.weightPoint,
                      { 
                        left: `${x}%`,
                        bottom: `${y}%`,
                      }
                    ]}
                  />
                  <Text 
                    style={[
                      styles.weightPointLabel,
                      { 
                        left: `${x}%`,
                        bottom: `${y + 8}%`,
                      }
                    ]}
                  >
                    {point.weight}kg
                  </Text>
                  <Text 
                    style={[
                      styles.weightDateLabel,
                      { 
                        left: `${x}%`,
                        bottom: `${y - 8}%`,
                      }
                    ]}
                  >
                    {date.getDate()}/{date.getMonth() + 1}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </Card>
    );
  };

  const renderEnergyChart = () => {
    const energyData = recentCheckins
      .filter(c => c.energy)
      .slice(0, 7)
      .reverse();

    if (energyData.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Energy Levels</Text>
          <Text style={styles.noDataText}>No energy data available</Text>
        </Card>
      );
    }

    const maxEnergy = Math.max(...energyData.map(c => c.energy!));

    return (
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Energy Levels (Last 7 Days)</Text>
        <View style={styles.chart}>
          {energyData.map((checkin, index) => {
            const height = (checkin.energy! / maxEnergy) * 100;
            const date = new Date(checkin.date);
            
            return (
              <View key={index} style={styles.chartBar}>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { height: `${height}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.barLabel}>
                  {date.getDate()}/{date.getMonth() + 1}
                </Text>
                <Text style={styles.barValue}>{checkin.energy}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    );
  };

  const renderRecentCheckins = () => (
    <Card style={styles.checkinsCard}>
      <Text style={styles.checkinsTitle}>Recent Check-ins</Text>
      {recentCheckins.length === 0 ? (
        <Text style={styles.noDataText}>No check-ins yet</Text>
      ) : (
        <ScrollView style={styles.checkinsList}>
          {recentCheckins.slice(0, 10).map((checkin, index) => {
            const date = new Date(checkin.date);
            
            return (
              <View key={index} style={styles.checkinItem}>
                <View style={styles.checkinDate}>
                  <Text style={styles.checkinDateText}>
                    {date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Text style={styles.checkinMode}>{checkin.mode}</Text>
                </View>
                
                <View style={styles.checkinMetrics}>
                  {checkin.energy && (
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Energy</Text>
                      <Text style={styles.metricValue}>{checkin.energy}/10</Text>
                    </View>
                  )}
                  {checkin.stress && (
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Stress</Text>
                      <Text style={styles.metricValue}>{checkin.stress}/10</Text>
                    </View>
                  )}
                  {checkin.mood && (
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Mood</Text>
                      <Text style={styles.metricValue}>{checkin.mood}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'History & Progress',
          headerStyle: { backgroundColor: theme.color.bg },
          headerTintColor: theme.color.ink,
        }} 
      />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderTimeRangeSelector()}
          {renderStatsCards()}
          {renderWeightChart()}
          {renderEnergyChart()}
          {renderRecentCheckins()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.space.lg,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: theme.space.lg,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTimeRange: {
    backgroundColor: theme.color.accent.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.color.muted,
  },
  activeTimeRangeText: {
    color: theme.color.bg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minHeight: 100,
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.color.ink,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.color.muted,
    marginTop: 4,
  },
  chartCard: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.ink,
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 80,
    width: 20,
    backgroundColor: theme.color.card,
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  bar: {
    backgroundColor: theme.color.accent.primary,
    width: '100%',
    borderRadius: 10,
  },
  barLabel: {
    fontSize: 10,
    color: theme.color.muted,
    marginTop: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.color.ink,
    marginTop: 2,
  },
  checkinsCard: {
    marginBottom: 20,
  },
  checkinsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.ink,
    marginBottom: 16,
  },
  checkinsList: {
    maxHeight: 300,
  },
  checkinItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  checkinDate: {
    width: 80,
    alignItems: 'center',
  },
  checkinDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.ink,
  },
  checkinMode: {
    fontSize: 10,
    color: theme.color.muted,
    marginTop: 2,
    backgroundColor: theme.color.card,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  checkinMetrics: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    marginLeft: 16,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: theme.color.muted,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.ink,
    marginTop: 2,
  },
  noDataText: {
    fontSize: 14,
    color: theme.color.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  // Weight chart styles
  weightCard: {
    marginBottom: 20,
    minHeight: 200,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  weightTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.accent.primary,
  },
  weightChart: {
    height: 150,
    position: 'relative',
    marginHorizontal: 10,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.color.accent.green,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  goalLineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.accent.green,
    marginRight: 8,
  },
  goalLineText: {
    fontSize: 12,
    color: theme.color.accent.green,
    fontWeight: '600',
  },
  weightLine: {
    position: 'relative',
    height: '100%',
  },
  weightPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.color.accent.primary,
    borderWidth: 2,
    borderColor: theme.color.bg,
    marginLeft: -6,
    marginBottom: -6,
    zIndex: 2,
  },
  weightPointLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '600',
    color: theme.color.ink,
    textAlign: 'center',
    minWidth: 40,
    marginLeft: -20,
  },
  weightDateLabel: {
    position: 'absolute',
    fontSize: 9,
    color: theme.color.muted,
    textAlign: 'center',
    minWidth: 40,
    marginLeft: -20,
  },
});