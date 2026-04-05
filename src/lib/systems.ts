// Import all map definitions so they self-register
import './foldedTowel';
import './maps/chenLee';
import './maps/rossler';
import './maps/arneodo';
import './maps/sprottB';
import './maps/sprottLinzF';
import './maps/dadras';
import './maps/halvorsen';
import './maps/quadraticStrange';

import { getAllMaps, type MapDefinition } from './mapDefinition';

export type { MapDefinition };

export interface SystemInfo {
  id: string;
  label: string;
  description: string;
  icon?: string;
}

export function getSystems(): SystemInfo[] {
  return getAllMaps().map((m) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    icon: m.icon,
  }));
}

/** Kept for backward compat with SideNav/HomePage that import SYSTEMS */
export const SYSTEMS: SystemInfo[] = getSystems();
