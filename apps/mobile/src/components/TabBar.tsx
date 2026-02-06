import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Colors } from '../theme/colors';

export type TabKey = 'mosaic' | 'recurring' | 'actions' | 'settings';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'mosaic', label: 'Mural' },
  { key: 'recurring', label: 'Recurring' },
  { key: 'actions', label: 'Actions' },
  { key: 'settings', label: 'Settings' },
];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        padding: 10,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: 'rgba(20,28,44,0.55)',
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: 14,
              alignItems: 'center',
              backgroundColor: isActive
                ? 'rgba(56,189,248,0.20)'
                : pressed
                  ? 'rgba(255,255,255,0.10)'
                  : 'transparent',
              borderWidth: 1,
              borderColor: isActive ? 'rgba(56,189,248,0.50)' : 'transparent',
            })}
          >
            <Text
              style={{
                color: isActive ? Colors.text : Colors.muted,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
