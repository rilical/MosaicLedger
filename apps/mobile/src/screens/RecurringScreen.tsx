import * as React from 'react';
import { Text, View } from 'react-native';

import { GlassCard } from '../components/GlassCard';
import { Pill } from '../components/Pill';
import { SectionHeader } from '../components/SectionHeader';
import { Colors } from '../theme/colors';

import type { Recurring } from '../mock/sample';

function cadenceLabel(c: Recurring['cadence']) {
  if (c === 'weekly') return 'Weekly';
  if (c === 'biweekly') return 'Biweekly';
  return 'Monthly';
}

function confidenceLabel(v: number) {
  if (v >= 0.8) return { t: 'High', c: Colors.good };
  if (v >= 0.6) return { t: 'Medium', c: Colors.warn };
  return { t: 'Low', c: Colors.bad };
}

export function RecurringScreen({ items }: { items: Recurring[] }) {
  return (
    <View style={{ flex: 1, padding: 18, gap: 12 }}>
      <View>
        <Text style={{ color: Colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 }}>
          Recurring
        </Text>
        <Text style={{ color: Colors.muted, marginTop: 6, fontSize: 13 }}>
          Repeating motifs: subscriptions, bills, and predictable charges.
        </Text>
      </View>

      <GlassCard>
        <SectionHeader title="Upcoming" right={<Pill label="Timeline" onPress={() => {}} />} />
        <View style={{ marginTop: 10, gap: 10 }}>
          {items.map((r) => {
            const conf = confidenceLabel(r.confidence);
            return (
              <View
                key={r.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '750' }}>
                    {r.merchant}
                  </Text>
                  <Text
                    style={{
                      color: Colors.text,
                      fontSize: 15,
                      fontVariant: ['tabular-nums'] as any,
                    }}
                  >
                    ${r.expectedAmount.toFixed(2)}
                  </Text>
                </View>
                <Text style={{ color: Colors.muted, fontSize: 12 }}>
                  {cadenceLabel(r.cadence)} · next {r.nextDate} ·{' '}
                  <Text style={{ color: conf.c, fontWeight: '700' }}>{conf.t}</Text>
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                  <Pill label="Mark: Subscription" onPress={() => {}} />
                  <Pill label="Mark: Bill" onPress={() => {}} />
                  <Pill label="Ignore" onPress={() => {}} />
                </View>
              </View>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Why it matters" />
        <Text style={{ color: Colors.text, marginTop: 10, fontSize: 14, lineHeight: 20 }}>
          Recurring spend is the part of your mural that keeps repainting itself. Cutting one tile
          here usually beats a dozen tiny optimizations.
        </Text>
      </GlassCard>
    </View>
  );
}
