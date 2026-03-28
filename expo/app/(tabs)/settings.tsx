import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Target, Dumbbell, Utensils, Trash2, Download, Settings as SettingsIcon, ChevronRight, LogOut, Pencil, UserCog } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { useUserStore } from '@/hooks/useUserStore';
import { GOALS } from '@/constants/fitness';
import { router } from 'expo-router';
import { theme } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export default function SettingsScreen() {
  const { user, checkins, plans, clearAllData } = useUserStore();
  const { signOut, session } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const insets = useSafeAreaInsets();
  const [isClearing, setIsClearing] = useState(false);

  const handleExportData = () => {
    try {
      const data = {
        user: user ? {
          id: user.id,
          name: user.name,
          goal: user.goal,
          trainingDays: user.trainingDays,
          equipment: user.equipment,
          dietaryPrefs: user.dietaryPrefs,
        } : null,
        checkins: checkins.map(c => ({
          id: c.id,
          date: c.date,
          mode: c.mode,
          bodyWeight: c.bodyWeight,
          mood: c.mood,
          energy: c.energy,
          sleepHrs: c.sleepHrs,
          sleepQuality: c.sleepQuality,
        })),
        plans: plans.map(p => ({
          id: p.id,
          date: p.date,
          workout: p.workout,
          nutrition: p.nutrition,
          recovery: p.recovery,
        })),
        exportDate: new Date().toISOString(),
      };
      
      // Use Alert to show the data instead of console.log with JSON.stringify
      Alert.alert(
        'Data Export',
        'Your data has been prepared for export. Check the console for details.',
        [{ text: 'OK' }]
      );
      
      // Log without JSON.stringify to avoid circular reference issues
      console.log('Export data prepared:', data);
      console.log('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert(
        'Export Error',
        'Failed to export data. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your data including:\n\n• Profile information\n• All check-ins\n• Generated plans\n• Progress history\n\nThis action cannot be undone. Are you sure you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: confirmClearData,
        },
      ],
      { cancelable: true }
    );
  };

  const confirmClearData = async () => {
    try {
      setIsClearing(true);
      
      // Clear data and navigate immediately
      await clearAllData();
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        router.replace('/onboarding');
      }, 100);
      
    } catch (error) {
      console.error('Failed to clear data:', error);
      Alert.alert(
        'Error',
        'Failed to clear data. Please try again.',
        [{ text: 'OK' }]
      );
      setIsClearing(false);
    }
  };

  if (!user && isProfileLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.color.bg }]}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your FitCoach experience</Text>
          </View>

          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              {session?.user?.user_metadata?.avatar_url ? (
                <Image
                  source={{ uri: session.user.user_metadata.avatar_url as string }}
                  style={styles.avatarSmall}
                />
              ) : (
                <User color={theme.color.accent.primary} size={24} />
              )}
              <Text style={styles.profileTitle}>Profile</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} testID="settings-profile-name">
                {profile?.name ?? session?.user?.user_metadata?.name ?? user?.name ?? session?.user?.email ?? '—'}
              </Text>
              {!!session?.user?.email && (
                <Text style={styles.profileDetail}>{session.user.email}</Text>
              )}
              <Text style={styles.profileDetail}>
                Goal: {GOALS.find(g => g.id === user?.goal)?.label ?? '—'}
              </Text>
              <Text style={styles.profileDetail}>
                Training Days: {user?.trainingDays ?? 0} per week
              </Text>
            </View>
          </Card>

          <Card style={styles.quickManageCard}>
            <View style={styles.quickManageInner}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/profile')}
                testID="edit-profile"
              >
                <View style={styles.actionButtonLeft}>
                  <Pencil color={theme.color.accent.blue} size={20} />
                  <Text style={styles.actionButtonText}>Edit Profile</Text>
                </View>
                <ChevronRight color={theme.color.muted} size={16} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/program-settings')}
                testID="program-settings"
              >
                <View style={styles.actionButtonLeft}>
                  <UserCog color={theme.color.accent.green} size={20} />
                  <Text style={styles.actionButtonText}>Edit Preferences</Text>
                </View>
                <ChevronRight color={theme.color.muted} size={16} />
              </TouchableOpacity>
            </View>
          </Card>

          <Card style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Target color={theme.color.accent.green} size={24} />
              <Text style={styles.settingTitle}>Fitness Goal</Text>
            </View>
            <Text style={styles.settingValue}>
              {GOALS.find(g => g.id === user?.goal)?.description ?? 'No goal selected'}
            </Text>
          </Card>

          <Card style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Dumbbell color={theme.color.accent.blue} size={24} />
              <Text style={styles.settingTitle}>Equipment</Text>
            </View>
            <Text style={styles.settingValue}>
              {user?.equipment && user.equipment.length > 0 ? user.equipment.join(', ') : 'None specified'}
            </Text>
          </Card>

          <Card style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Utensils color={theme.color.accent.green} size={24} />
              <Text style={styles.settingTitle}>Dietary Preferences</Text>
            </View>
            <Text style={styles.settingValue}>
              {(user?.dietaryPrefs ?? []).join(', ')}
            </Text>
          </Card>

          <Card style={styles.statsCard}>
            <Text style={styles.statsTitle}>Your Progress</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{checkins.length}</Text>
                <Text style={styles.statLabel}>Total Check-ins</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{plans.length}</Text>
                <Text style={styles.statLabel}>Plans Generated</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Account</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={async () => { await signOut(); router.replace('/auth/login'); }}
              testID="sign-out"
            >
              <View style={styles.actionButtonLeft}>
                <LogOut color={theme.color.accent.primary} size={20} />
                <Text style={styles.actionButtonText}>Sign out</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Data Management</Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleExportData}
            >
              <View style={styles.actionButtonLeft}>
                <Download color={theme.color.accent.green} size={20} />
                <Text style={styles.actionButtonText}>Export My Data</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.dangerButton, isClearing && styles.disabledButton]}
              onPress={handleClearData}
              disabled={isClearing}
            >
              <View style={styles.actionButtonLeft}>
                <Trash2 color={isClearing ? theme.color.muted : theme.color.accent.primary} size={20} />
                <Text style={[styles.actionButtonText, styles.dangerText, isClearing && styles.disabledText]}>
                  {isClearing ? 'Clearing Data...' : 'Clear All Data'}
                </Text>
              </View>
            </TouchableOpacity>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>FitCoach v1.0</Text>
            <Text style={styles.footerSubtext}>
              Your AI-powered fitness companion
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.space.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.space.xxl,
    marginTop: theme.space.lg,
  },
  title: {
    fontSize: theme.size.h1,
    fontWeight: '700',
    color: theme.color.ink,
  },
  subtitle: {
    fontSize: theme.size.body,
    color: theme.color.muted,
    marginTop: 4,
  },
  profileCard: {
    marginBottom: theme.space.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.space.md,
    gap: theme.space.sm,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.ink,
  },
  profileInfo: {
    gap: theme.space.xs,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.color.ink,
  },
  profileDetail: {
    fontSize: 14,
    color: theme.color.muted,
  },
  settingCard: {
    marginBottom: theme.space.md,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.space.xs,
    gap: theme.space.sm,
  },
  settingTitle: {
    fontSize: theme.size.body,
    fontWeight: '600',
    color: theme.color.ink,
  },
  settingValue: {
    fontSize: 14,
    color: theme.color.muted,
    lineHeight: 20,
  },
  statsCard: {
    marginBottom: theme.space.lg,
    marginTop: theme.space.sm,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.ink,
    marginBottom: theme.space.md,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.color.accent.primary,
  },
  statLabel: {
    fontSize: theme.size.label,
    color: theme.color.muted,
    marginTop: 4,
  },
  actionsCard: {
    marginBottom: theme.space.lg,
  },
  quickManageCard: {
    marginBottom: theme.space.lg,
  },
  quickManageInner: {
    gap: theme.space.sm,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.ink,
    marginBottom: theme.space.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.space.md,
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.line,
    marginBottom: theme.space.sm,
  },
  actionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  dangerButton: {
    backgroundColor: theme.color.accent.primary + '10',
    borderColor: theme.color.accent.primary + '30',
  },
  actionButtonText: {
    fontSize: theme.size.body,
    fontWeight: '500',
    color: theme.color.ink,
  },
  dangerText: {
    color: theme.color.accent.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    color: theme.color.muted,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.space.lg,
    paddingTop: theme.space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color.line,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.muted,
  },
  footerSubtext: {
    fontSize: theme.size.label,
    color: theme.color.muted,
    opacity: 0.7,
    marginTop: 4,
  },
  avatarSmall: { width: 28, height: 28, borderRadius: 14 },
});