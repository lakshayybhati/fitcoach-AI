import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { useProfile } from '@/hooks/useProfile';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Save } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading, updateProfile, uploadAvatar, updateAvatarUrl } = useProfile();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState<string>(profile?.name ?? '');
  const [saving, setSaving] = useState<boolean>(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const canSave = useMemo(() => name.trim().length > 1, [name]);

  const pickImage = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Permission required to select an image');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled) {
        setAvatar(result.assets[0]?.uri ?? null);
      }
    } catch (e) {
      console.error('pick image error', e);
    }
  }, []);

  const onSave = useCallback(async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      await updateProfile({ name: name.trim() });
      if (avatar) {
        const publicUrl = await uploadAvatar(avatar);
        await updateAvatarUrl(publicUrl);
      }
      router.back();
    } catch (e) {
      console.error('save profile error', e);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [canSave, name, avatar, updateProfile, uploadAvatar, updateAvatarUrl, router]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      {isLoading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <View style={styles.form}>
          <TouchableOpacity style={styles.avatarBtn} onPress={pickImage} testID="pick-avatar">
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Camera color={theme.color.muted} size={20} />
              </View>
            )}
            <Text style={styles.avatarText}>Change Photo</Text>
          </TouchableOpacity>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.color.muted}
              testID="profile-name"
            />
          </View>

          <Button title={saving ? 'Saving…' : 'Save'} onPress={onSave} disabled={!canSave || saving} icon={<Save color="#fff" size={18} />} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.bg, padding: 16 },
  loading: { color: theme.color.muted },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { color: theme.color.muted },
  input: { borderWidth: 1, borderColor: theme.color.line, borderRadius: 12, paddingHorizontal: 14, height: 48, color: theme.color.ink, backgroundColor: theme.color.card },
  avatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.color.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.color.line },
  avatarText: { color: theme.color.accent.blue, fontWeight: '600' },
});
