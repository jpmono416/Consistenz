import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { palette } from '@/theme';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const { user, signIn, signUp, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) {
    return <Redirect href="/(app)/home" />;
  }

  const handleModeSwitch = (nextMode: Mode) => {
    setMode(nextMode);
    clearError();
  };

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (mode === 'login') {
      await signIn(email.trim(), password);
      return;
    }
    await signUp(email.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 32 }}>
          <View>
            <Text style={{ color: palette.signal, fontSize: 32, fontWeight: '800' }}>Signoise</Text>
            <Text style={{ color: palette.textSecondary, marginTop: 8 }}>
              Split what matters (Signal) from the Noise and keep momentum.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <AuthModeButton label="Login" active={mode === 'login'} onPress={() => handleModeSwitch('login')} />
            <AuthModeButton label="Create account" active={mode === 'signup'} onPress={() => handleModeSwitch('signup')} />
          </View>

          <View style={{ gap: 16 }}>
            <TextInput
              placeholder="Email"
              placeholderTextColor={palette.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={inputStyles}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={palette.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={inputStyles}
            />
            {error ? (
              <View
                style={{
                  backgroundColor: palette.elevated,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: palette.danger,
                }}
              >
                <Text style={{ color: palette.danger, textAlign: 'center' }}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={{
                backgroundColor: loading ? palette.muted : palette.signal,
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: palette.background, fontSize: 16, fontWeight: '700' }}>
                {mode === 'login' ? 'Continue' : 'Create account'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: active ? palette.signal : palette.border,
        backgroundColor: active ? palette.signal : palette.surface,
        paddingVertical: 14,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: active ? palette.background : palette.textPrimary, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const inputStyles = {
  backgroundColor: palette.surface,
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderWidth: 1,
  borderColor: palette.border,
  color: palette.textPrimary,
} as const;

