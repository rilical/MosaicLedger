import * as React from 'react';
import { Pressable, Text, type ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';

export function Pill({
  label,
  onPress,
  active,
  style,
}: {
  label: string;
  onPress?: () => void;
  active?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? 'rgba(56,189,248,0.65)' : Colors.border,
        backgroundColor: active
          ? 'rgba(56,189,248,0.18)'
          : pressed
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.08)',
        transform: [{ scale: pressed ? 0.98 : 1 }],
        ...style,
      })}
    >
      <Text style={{ color: Colors.text, fontSize: 13, letterSpacing: 0.2 }}>{label}</Text>
    </Pressable>
  );
}
