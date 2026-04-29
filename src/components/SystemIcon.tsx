import React from 'react';
import {
  LeafThree24Regular,
  Molecule24Regular,
  WeatherThunderstorm24Regular,
  Diamond24Regular,
  Sparkle24Regular,
  Star24Regular,
  Fire24Regular,
  WeatherSnowflake24Regular,
  Cube24Regular,
  DrawImage24Regular,
} from '@fluentui/react-icons';

const ICON_MAP: Record<string, React.ComponentType> = {
  LeafThree: LeafThree24Regular,
  Molecule: Molecule24Regular,
  WeatherThunderstorm: WeatherThunderstorm24Regular,
  Diamond: Diamond24Regular,
  Sparkle: Sparkle24Regular,
  Star: Star24Regular,
  Fire: Fire24Regular,
  WeatherSnowflake: WeatherSnowflake24Regular,
  Cube: Cube24Regular,
};

export function SystemIcon({ name }: { name?: string }) {
  const Icon = name ? ICON_MAP[name] : undefined;
  return Icon ? <Icon /> : <DrawImage24Regular />;
}
