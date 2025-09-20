import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { router, Stack } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';
import { Chip } from '@/components/ui/Chip';
import { useUserStore } from '@/hooks/useUserStore';
import { 
  MOOD_CHARACTERS,
  SORENESS_AREAS, 
  DIGESTION_OPTIONS, 
  WOKE_FEELING_OPTIONS 
} from '@/constants/fitness';
import { MoodCharacter } from '@/components/ui/MoodCharacter';
import type { CheckinMode, CheckinData } from '@/types/user';

export default function CheckinScreen() {
  const { addCheckin } = useUserStore();
  const [mode, setMode] = useState<CheckinMode>('LOW');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [checkinData, setCheckinData] = useState<Partial<CheckinData>>({
    bodyWeight: undefined,
    mood: '🙂',
    moodCharacter: 'excited',
    energy: 7,
    sleepHrs: 7,
    sleepQuality: 3,
    wokeFeeling: 'Refreshed',
    soreness: [],
    digestion: 'Normal',
    stress: 3,
    waterL: 2.5,
    saltYN: false,
    suppsYN: false,
    steps: undefined,
    kcalEst: undefined,
    caffeineYN: false,
    alcoholYN: false,
    motivation: 7,
  });

  const handleSorenessToggle = (area: string) => {
    setCheckinData(prev => ({
      ...prev,
      soreness: prev.soreness?.includes(area)
        ? prev.soreness.filter(s => s !== area)
        : [...(prev.soreness || []), area]
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const checkin: CheckinData = {
        id: Date.now().toString(),
        mode,
        date: new Date().toISOString().split('T')[0],
        ...checkinData,
      };

      await addCheckin(checkin);
      
      router.push('/generating-plan');
    } catch (error) {
      console.error('Error submitting checkin:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderModeSelector = () => (
    <Card style={styles.modeCard}>
      <Text style={styles.modeTitle}>Check-in Mode</Text>
      <View style={styles.modeButtons}>
        {(['LOW', 'HIGH', 'PRO'] as CheckinMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.modeButton,
              mode === m && styles.selectedMode,
            ]}
            onPress={() => setMode(m)}
          >
            <Text style={[
              styles.modeButtonText,
              mode === m && styles.selectedModeText,
            ]}>
              {m}
            </Text>
            <Text style={[
              styles.modeDescription,
              mode === m && styles.selectedModeText,
            ]}>
              {m === 'LOW' ? '~60s' : m === 'HIGH' ? '~120s' : '~180s'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );

  const renderBasicMetrics = () => (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>How are you feeling?</Text>
      
      <View style={styles.moodContainer}>
        <Text style={styles.fieldLabel}>How are you today?</Text>
        <View style={styles.moodCharactersGrid}>
          {MOOD_CHARACTERS.map((mood) => (
            <MoodCharacter
              key={mood.id}
              mood={mood}
              selected={checkinData.moodCharacter === mood.id}
              onPress={() => setCheckinData(prev => ({ ...prev, moodCharacter: mood.id }))}
              size={70}
            />
          ))}
        </View>
      </View>

      <Slider
        label="Energy Level"
        value={checkinData.energy || 7}
        onValueChange={(value) => setCheckinData(prev => ({ ...prev, energy: value }))}
        minimumValue={1}
        maximumValue={10}
      />

      <Slider
        label="Stress Level"
        value={checkinData.stress || 3}
        onValueChange={(value) => setCheckinData(prev => ({ ...prev, stress: value }))}
        minimumValue={1}
        maximumValue={10}
      />
    </Card>
  );

  const renderSleepMetrics = () => (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Sleep & Recovery</Text>
      
      <Slider
        label="Hours of Sleep"
        value={checkinData.sleepHrs || 7}
        onValueChange={(value) => setCheckinData(prev => ({ ...prev, sleepHrs: value }))}
        minimumValue={3}
        maximumValue={12}
        step={0.5}
      />

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Woke up feeling</Text>
        <View style={styles.chipsContainer}>
          {WOKE_FEELING_OPTIONS.map((feeling) => (
            <Chip
              key={feeling}
              label={feeling}
              selected={checkinData.wokeFeeling === feeling}
              onPress={() => setCheckinData(prev => ({ ...prev, wokeFeeling: feeling }))}
              color="#4ECDC4"
            />
          ))}
        </View>
      </View>
    </Card>
  );

  const renderPhysicalMetrics = () => (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Physical State</Text>
      
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Any soreness?</Text>
        <View style={styles.chipsContainer}>
          {SORENESS_AREAS.map((area) => (
            <Chip
              key={area}
              label={area}
              selected={checkinData.soreness?.includes(area) || false}
              onPress={() => handleSorenessToggle(area)}
              color="#FF6B9D"
            />
          ))}
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Digestion</Text>
        <View style={styles.chipsContainer}>
          {DIGESTION_OPTIONS.map((digestion) => (
            <Chip
              key={digestion}
              label={digestion}
              selected={checkinData.digestion === digestion}
              onPress={() => setCheckinData(prev => ({ ...prev, digestion }))}
              color="#44A08D"
            />
          ))}
        </View>
      </View>
    </Card>
  );

  const renderHighModeExtras = () => {
    if (mode === 'LOW') return null;

    return (
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Additional Metrics</Text>
        
        <Slider
          label="Motivation Level"
          value={checkinData.motivation || 7}
          onValueChange={(value) => setCheckinData(prev => ({ ...prev, motivation: value }))}
          minimumValue={1}
          maximumValue={10}
        />

        <View style={styles.waterInputContainer}>
          <Text style={styles.fieldLabel}>Water Yesterday (L)</Text>
          <TextInput
            style={styles.waterInput}
            value={checkinData.waterL?.toString() || ''}
            onChangeText={(text) => {
              const water = parseFloat(text);
              setCheckinData(prev => ({ 
                ...prev, 
                waterL: isNaN(water) ? undefined : water 
              }));
            }}
            placeholder="Enter liters of water"
            placeholderTextColor="#A6A6AD"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              checkinData.caffeineYN && styles.toggleActive,
            ]}
            onPress={() => setCheckinData(prev => ({ ...prev, caffeineYN: !prev.caffeineYN }))}
          >
            <Text style={[
              styles.toggleText,
              checkinData.caffeineYN && styles.toggleActiveText,
            ]}>
              Had Caffeine ☕
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              checkinData.alcoholYN && styles.toggleActive,
            ]}
            onPress={() => setCheckinData(prev => ({ ...prev, alcoholYN: !prev.alcoholYN }))}
          >
            <Text style={[
              styles.toggleText,
              checkinData.alcoholYN && styles.toggleActiveText,
            ]}>
              Had Alcohol 🍷
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderProModeExtras = () => {
    if (mode !== 'PRO') return null;

    return (
      <>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Weight Tracking</Text>
          
          <View style={styles.weightInputContainer}>
            <Text style={styles.fieldLabel}>Today's Weight (kg)</Text>
            <TextInput
              style={styles.weightInput}
              value={checkinData.currentWeight?.toString() || ''}
              onChangeText={(text) => {
                const weight = parseFloat(text);
                setCheckinData(prev => ({ 
                  ...prev, 
                  currentWeight: isNaN(weight) ? undefined : weight 
                }));
              }}
              placeholder="Enter your current weight"
              placeholderTextColor="#A6A6AD"
              keyboardType="numeric"
            />
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Yesterday's Intake</Text>
          
          <View style={styles.waterInputContainer}>
            <Text style={styles.fieldLabel}>Water Yesterday (L)</Text>
            <TextInput
              style={styles.waterInput}
              value={checkinData.waterL?.toString() || ''}
              onChangeText={(text) => {
                const water = parseFloat(text);
                setCheckinData(prev => ({ 
                  ...prev, 
                  waterL: isNaN(water) ? undefined : water 
                }));
              }}
              placeholder="Enter liters of water"
              placeholderTextColor="#A6A6AD"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                checkinData.saltYN && styles.toggleActive,
              ]}
              onPress={() => setCheckinData(prev => ({ ...prev, saltYN: !prev.saltYN }))}
            >
              <Text style={[
                styles.toggleText,
                checkinData.saltYN && styles.toggleActiveText,
              ]}>
                Salt Yesterday (Y/N) 🧂
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                checkinData.suppsYN && styles.toggleActive,
              ]}
              onPress={() => setCheckinData(prev => ({ ...prev, suppsYN: !prev.suppsYN }))}
            >
              <Text style={[
                styles.toggleText,
                checkinData.suppsYN && styles.toggleActiveText,
              ]}>
                Supps Yesterday (Y/N) 💊
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Check-in time',
          headerStyle: { backgroundColor: '#0C0C0D' },
          headerTintColor: '#F7F7F8',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          },
        }} 
      />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>How are you today?</Text>
            <Text style={styles.subtitle}>
              Help us create the perfect plan for you
            </Text>
          </View>

          {renderModeSelector()}
          {renderBasicMetrics()}
          {renderSleepMetrics()}
          {renderPhysicalMetrics()}
          {renderHighModeExtras()}
          {renderProModeExtras()}

          <Button
            title={isSubmitting ? "Generating Plan..." : "Generate My Plan"}
            onPress={handleSubmit}
            disabled={isSubmitting}
            size="large"
            style={styles.submitButton}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0D',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 44,
    fontWeight: '700',
    color: '#F7F7F8',
    textAlign: 'center',
    lineHeight: 44 * 0.9,
  },
  subtitle: {
    fontSize: 16,
    color: '#A6A6AD',
    textAlign: 'center',
    marginTop: 12,
  },
  modeCard: {
    marginBottom: 24,
    backgroundColor: '#131316',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#26262B',
    padding: 24,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F7F7F8',
    marginBottom: 16,
    textAlign: 'center',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#26262B',
    backgroundColor: '#131316',
    alignItems: 'center',
  },
  selectedMode: {
    borderColor: '#FF6FB2',
    backgroundColor: '#FF6FB2',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F7F7F8',
  },
  modeDescription: {
    fontSize: 12,
    color: '#A6A6AD',
    marginTop: 2,
  },
  selectedModeText: {
    color: '#0C0C0D',
  },
  sectionCard: {
    marginBottom: 24,
    backgroundColor: '#131316',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#26262B',
    padding: 24,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#F7F7F8',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 30,
  },
  moodContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F7F7F8',
    marginBottom: 16,
    textAlign: 'center',
  },
  moodCharactersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  toggleContainer: {
    gap: 12,
  },
  toggleButton: {
    padding: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#26262B',
    backgroundColor: '#131316',
    alignItems: 'center',
  },
  toggleActive: {
    borderColor: '#7EE08A',
    backgroundColor: '#7EE08A',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F7F7F8',
  },
  toggleActiveText: {
    color: '#0C0C0D',
  },
  weightInputContainer: {
    marginBottom: 20,
  },
  weightInput: {
    backgroundColor: '#131316',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#26262B',
    padding: 16,
    color: '#F7F7F8',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  waterInputContainer: {
    marginBottom: 20,
  },
  waterInput: {
    backgroundColor: '#131316',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#26262B',
    padding: 16,
    color: '#F7F7F8',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});