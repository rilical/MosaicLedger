import * as React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassCard } from '../components/GlassCard';
import { Pill } from '../components/Pill';
import { Colors } from '../theme/colors';

export function Onboarding({
  onContinue,
}: {
  onContinue: (mode: 'sample' | 'bank' | 'csv') => void;
}) {
  return (
    <LinearGradient
      colors={[Colors.bg0, Colors.bg1]}
      start={{ x: 0.2, y: 0.0 }}
      end={{ x: 0.8, y: 1.0 }}
      style={{ flex: 1, padding: 18, justifyContent: 'center' }}
    >
      <View style={{ gap: 14 }}>
        <View>
          <Text
            style={{ color: Colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.6 }}
          >
            MosaicLedger
          </Text>
          <Text style={{ color: Colors.muted, marginTop: 6, fontSize: 14, lineHeight: 20 }}>
            Enter with fragments. Leave with something whole.
          </Text>
        </View>

        <GlassCard>
          <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '700' }}>
            Choose your starting point
          </Text>
          <Text style={{ color: Colors.muted, marginTop: 6, fontSize: 13, lineHeight: 18 }}>
            Demo-safe by default. No bank scraping. You stay in control.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            <Pill label="Load sample (Recommended)" active onPress={() => onContinue('sample')} />
            <Pill label="Connect bank (UI only)" onPress={() => onContinue('bank')} />
            <Pill label="Upload CSV (UI only)" onPress={() => onContinue('csv')} />
          </View>
        </GlassCard>

        <GlassCard>
          <Text
            style={{
              color: Colors.muted,
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            What you get
          </Text>
          <Text style={{ color: Colors.text, marginTop: 10, fontSize: 14, lineHeight: 20 }}>
            A month becomes a mural. Tiles sized by spend, colored by category, then a ranked
            next-actions plan.
          </Text>
        </GlassCard>

        <Text style={{ color: Colors.faint, fontSize: 12, lineHeight: 17 }}>
          Guidance, not financial advice. This build is UI-first (2026-02-06).
        </Text>
      </View>
    </LinearGradient>
  );
}
