import { DeviceType } from '../types';
import { 
  Lightbulb, Fan, ThermometerSnowflake, Tv, Router, WashingMachine, 
  Refrigerator, Plug, Zap, Flame
} from 'lucide-react';

export interface ParsedDeviceConfig {
  relayCount: number;
  freeKeyCount: number;
  baseType: DeviceType;
}

export const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case 'ac': return ThermometerSnowflake;
      case 'tv': return Tv;
      case 'fan': return Fan;
      case 'router': return Router;
      case 'washer': return WashingMachine;
      case 'fridge': return Refrigerator;
      case 'light': return Lightbulb;
      case 'outlet': return Plug;
      case 'heater': return Flame;
      default: return Plug;
    }
};

export const parseDeviceType = (typeString: string): ParsedDeviceConfig => {
  // Default fallback
  let config: ParsedDeviceConfig = {
    relayCount: 1,
    freeKeyCount: 0,
    baseType: 'light'
  };

  if (!typeString) return config;

  const lowerType = typeString.toLowerCase();

  // 1. Extract Relay Count (_Xch)
  const relayMatch = lowerType.match(/_(\d+)ch/);
  if (relayMatch) {
    config.relayCount = parseInt(relayMatch[1], 10);
  } else if (lowerType.includes('light') || lowerType.includes('switch')) {
    // If no explicit channel count but is a light/switch, assume 1
    config.relayCount = 1;
  } else {
    // For remotes or sensors, relays might be 0
    config.relayCount = 0;
  }

  // 2. Extract Free Key Count (_Xfree)
  const freeMatch = lowerType.match(/_(\d+)free/);
  if (freeMatch) {
    config.freeKeyCount = parseInt(freeMatch[1], 10);
  }

  // 3. Determine Base Type (Icon/Behavior)
  if (lowerType.includes('light')) config.baseType = 'light';
  else if (lowerType.includes('ac') || lowerType.includes('air')) config.baseType = 'ac';
  else if (lowerType.includes('fan')) config.baseType = 'fan';
  else if (lowerType.includes('tv')) config.baseType = 'tv';
  else if (lowerType.includes('heater')) config.baseType = 'heater';
  else if (lowerType.includes('remote')) config.baseType = 'outlet'; // Generic for pure remotes
  else config.baseType = 'light'; // Default

  // Special case: "smart_remote_2free" -> 0 relays, 2 free keys
  if (lowerType.includes('smart_remote')) {
      config.relayCount = 0;
      // freeKeyCount is already handled by regex
  }

  return config;
};
