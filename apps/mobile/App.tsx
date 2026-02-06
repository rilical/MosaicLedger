import * as React from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { TabBar, type TabKey } from './src/components/TabBar';
import { sample } from './src/mock/sample';
import { Colors } from './src/theme/colors';

import { ActionsScreen } from './src/screens/ActionsScreen';
import { MosaicScreen } from './src/screens/MosaicScreen';
import { Onboarding } from './src/screens/Onboarding';
import { RecurringScreen } from './src/screens/RecurringScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

export default function App() {
  const [boot, setBoot] = React.useState<'onboarding' | 'main'>('onboarding');
  const [tab, setTab] = React.useState<TabKey>('mosaic');

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.bg0, Colors.bg1]}
        start={{ x: 0.15, y: 0.0 }}
        end={{ x: 0.85, y: 1.0 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          {boot === 'onboarding' ? (
            <Onboarding
              onContinue={() => {
                setBoot('main');
                setTab('mosaic');
              }}
            />
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={{ paddingBottom: 92 }}
                showsVerticalScrollIndicator={false}
              >
                {tab === 'mosaic' ? (
                  <MosaicScreen
                    monthLabel={sample.monthLabel}
                    totalSpend={sample.totalSpend}
                    tiles={sample.tilesByCategory}
                  />
                ) : null}
                {tab === 'recurring' ? <RecurringScreen items={sample.recurring} /> : null}
                {tab === 'actions' ? <ActionsScreen items={sample.actions} /> : null}
                {tab === 'settings' ? <SettingsScreen /> : null}
              </ScrollView>

              <View
                style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  bottom: 14,
                }}
              >
                <TabBar active={tab} onChange={setTab} />
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
}
