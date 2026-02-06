import * as React from 'react';
import { Text, View } from 'react-native';

import { GlassCard } from '../components/GlassCard';
import { Pill } from '../components/Pill';
import { SectionHeader } from '../components/SectionHeader';
import { Colors } from '../theme/colors';

import type { Action } from '../mock/sample';

function effortColor(e: Action['effort']) {
  if (e === 'Low') return Colors.good;
  if (e === 'Medium') return Colors.warn;
  return Colors.bad;
}

export function ActionsScreen({ items }: { items: Action[] }) {
  const [goal] = React.useState({ amount: 200, by: '2026-04-01' });

  return (
    <View style={{ flex: 1, padding: 18, gap: 12 }}>
      <View>
        <Text style={{ color: Colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 }}>
          Next actions
        </Text>
        <Text style={{ color: Colors.muted, marginTop: 6, fontSize: 13 }}>
          The plan is the grout: ranked steps with numbers, not vibes.
        </Text>
      </View>

      <GlassCard>
        <SectionHeader title="Goal" right={<Pill label="Edit" onPress={() => {}} />} />
        <Text style={{ color: Colors.text, marginTop: 10, fontSize: 14, lineHeight: 20 }}>
          Save <Text style={{ fontWeight: '800' }}>${goal.amount}</Text> by{' '}
          <Text style={{ fontWeight: '800' }}>{goal.by}</Text>
        </Text>
        <Text style={{ color: Colors.muted, marginTop: 6, fontSize: 12, lineHeight: 17 }}>
          UI-only: goal editing, projections, and what-if stacking are stubbed in this build.
        </Text>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Top 5" right={<Pill label="Preview impact" onPress={() => {}} />} />
        <View style={{ marginTop: 10, gap: 10 }}>
          {items.map((a, idx) => (
            <View
              key={a.id}
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
                <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '750', flex: 1 }}>
                  {idx + 1}. {a.title}
                </Text>
                <Text
                  style={{ color: Colors.text, fontSize: 15, fontVariant: ['tabular-nums'] as any }}
                >
                  +${a.expectedMonthlySavings.toFixed(2)}/mo
                </Text>
              </View>
              <Text style={{ color: Colors.muted, fontSize: 12, lineHeight: 17 }}>
                {a.explanation}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                <Pill
                  label={`Effort: ${a.effort}`}
                  style={{ borderColor: effortColor(a.effort) }}
                />
                <Pill label={`Confidence: ${(a.confidence * 100).toFixed(0)}%`} />
                <Pill label="Apply (sim)" onPress={() => {}} />
              </View>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Round-ups" right={<Pill label="Send" onPress={() => {}} />} />
        <Text style={{ color: Colors.text, marginTop: 10, fontSize: 14, lineHeight: 20 }}>
          Optional: route micro-roundups to a goal pot or impact pool. This screen is UI-only for
          now.
        </Text>
        <Text style={{ color: Colors.muted, marginTop: 6, fontSize: 12, lineHeight: 17 }}>
          In production: XRPL testnet (or simulation fallback) with a visible transaction hash.
        </Text>
      </GlassCard>
    </View>
  );
}
