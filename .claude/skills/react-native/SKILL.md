---
name: react-native
description: React Native and Expo development patterns, navigation, native modules, and cross-platform optimization
layer: domain
category: mobile
triggers:
  - "react native"
  - "expo"
  - "mobile app"
  - "react native navigation"
  - "native module"
  - "cross-platform mobile"
  - "expo router"
inputs:
  - requirements: App features, platforms (iOS, Android, web), performance targets
  - framework: Expo (managed) | Expo (bare) | React Native CLI
  - navigation: Expo Router | React Navigation
  - features: Push notifications, camera, biometrics, offline support
outputs:
  - project_setup: Project configuration and dependencies
  - navigation_structure: Screen hierarchy and navigation setup
  - components: Cross-platform component implementations
  - native_integration: Native module configuration
  - build_config: EAS Build and submission configuration
linksTo:
  - react
  - typescript-frontend
  - state-management
  - forms
linkedFrom:
  - cook
  - plan
  - react
preferredNextSkills:
  - react
  - state-management
fallbackSkills:
  - react
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# React Native / Expo Skill

## Purpose

Build cross-platform mobile applications with React Native and Expo. This skill covers project setup with Expo, file-based routing with Expo Router, navigation patterns, native module integration, platform-specific code, performance optimization, and deployment with EAS Build. The goal: write once, run natively on iOS, Android, and optionally web.

## Key Concepts

### Expo vs. React Native CLI

```
EXPO (RECOMMENDED for most projects):
  - Managed workflow: no Xcode/Android Studio needed for most features
  - Expo Router: file-based navigation (like Next.js for mobile)
  - EAS Build: cloud builds for iOS and Android
  - Expo SDK: curated set of native modules (camera, auth, notifications)
  - Over-the-air updates with EAS Update

REACT NATIVE CLI (when you need):
  - Custom native modules not available in Expo
  - Fine-grained control over native build configuration
  - Brownfield integration (adding RN to existing native app)

DECISION: Start with Expo. Eject only if you hit a wall.
```

### Project Structure

```
app/
  (tabs)/
    _layout.tsx          # Tab navigator layout
    index.tsx            # Home tab
    explore.tsx          # Explore tab
    profile.tsx          # Profile tab
  (auth)/
    _layout.tsx          # Auth flow layout
    login.tsx            # Login screen
    register.tsx         # Register screen
  settings/
    index.tsx            # Settings screen
    notifications.tsx    # Notification preferences
  _layout.tsx            # Root layout
  +not-found.tsx         # 404 screen
components/
  ui/                    # Reusable UI components
  features/              # Feature-specific components
constants/
  Colors.ts              # Theme colors
  Layout.ts              # Responsive breakpoints
hooks/
  useColorScheme.ts      # Dark mode hook
lib/
  api.ts                 # API client
  auth.ts                # Auth utilities
  storage.ts             # Async storage helpers
```

## Patterns

### Expo Router Navigation

```typescript
// app/_layout.tsx (Root layout)
import { Stack } from 'expo-router';
import { ThemeProvider } from '@react-navigation/native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{ presentation: 'modal', title: 'Settings' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

// app/(tabs)/_layout.tsx (Tab navigator)
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarStyle: { paddingBottom: 8, height: 60 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### Platform-Specific Code

```typescript
import { Platform, StyleSheet } from 'react-native';

// Platform-specific styles
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
      android: { elevation: 4 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    }),
  },
});

// Platform-specific files
// Button.ios.tsx, Button.android.tsx, Button.web.tsx
// Import as: import Button from './Button';
// Metro bundler resolves the correct platform file automatically
```

### Safe Area and Responsive Layout

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';

function ScreenContainer({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View style={{
        flex: 1,
        paddingHorizontal: isTablet ? 32 : 16,
        maxWidth: isTablet ? 720 : undefined,
        alignSelf: isTablet ? 'center' : undefined,
        width: '100%',
      }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
```

### Data Fetching with TanStack Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json() as Promise<Product[]>;
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}

function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

### Secure Storage

```typescript
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

### Push Notifications

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PROJECT_ID,
  });

  return token.data;
}
```

## Best Practices

1. **Start with Expo** -- eject to bare workflow only when truly necessary
2. **Use Expo Router** -- file-based routing is simpler and mirrors Next.js patterns
3. **Test on real devices** -- simulators miss touch, performance, and hardware issues
4. **Use SafeAreaView** -- respect notches, home indicators, and status bars
5. **Optimize FlatList** -- use `keyExtractor`, `getItemLayout`, `windowSize` for long lists
6. **Minimize bridge crossings** -- batch native module calls, use Reanimated for animations
7. **Use EAS Build** -- cloud builds eliminate local environment issues
8. **Secure sensitive data** -- use `expo-secure-store`, never AsyncStorage for tokens
9. **Handle offline state** -- check `NetInfo`, queue requests, show offline indicator
10. **Profile with Flipper** -- identify performance bottlenecks before they become problems

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| AsyncStorage for tokens | Tokens readable without encryption | Use `expo-secure-store` |
| Inline styles in FlatList items | Re-renders on every frame | Extract to `StyleSheet.create` |
| No keyboard avoidance | Input fields hidden behind keyboard | Use `KeyboardAvoidingView` |
| Ignoring safe areas | Content under notch/status bar | Wrap in `SafeAreaView` |
| Large images without caching | Slow loading, excessive bandwidth | Use `expo-image` with caching |
| No error boundaries | White screen crash | Wrap screens in ErrorBoundary |
