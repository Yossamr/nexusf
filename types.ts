
import { LucideIcon } from "lucide-react";

export type DeviceType = 'light' | 'ac' | 'heater' | 'fan' | 'tv' | 'outlet' | 'fridge' | 'router' | 'washer' | 'remote';

// --- NEW: Automation Types ---
export interface TimerConfig {
  type: 'duration' | 'target'; // duration = "in 30 mins", target = "at 5:00 PM"
  targetTime: number;          // Timestamp when action triggers
  action: 'ON' | 'OFF';
}

export interface Habit {
  id: string;
  enabled: boolean;
  days: number[]; // 0=Sunday, 1=Monday... 6=Saturday
  time: string;   // "14:30" (24h format)
  action: 'ON' | 'OFF';
}

// --- NEW: IR Universal Remote Config ---
export interface IRKeyMap {
  [key: string]: string; // e.g., "POWER": "RAW_CODE_XZY...", "VOL_UP": "..."
}

export interface IRConfig {
  protocol: 'DB_PRESET' | 'LEARNED';
  brand?: string;
  codeSetId?: string; // If DB_PRESET
  learnedKeys?: IRKeyMap; // If LEARNED
}

export interface Device {
  id: string;      // Will now be formatted as "MAC_CHANNEL" e.g., "AA:BB:CC_1"
  name: string;
  type: DeviceType;
  room?: string;   // New: Location tagging
  isOn: boolean;
  watts: number;
  extraData?: string; 
  
  // --- MULTI-CHANNEL SUPPORT ---
  channelIndex?: number; // Stores the relay channel number (1, 2, 3...)
  
  // --- DYNAMIC CONFIGURATION ---
  relayCount?: number;   // Number of physical relays (ch)
  freeKeyCount?: number; // Number of free keys (free)
  numberOfButtons?: number; // For Remotes: Number of buttons to render
  parentId?: string;     // If this is a sub-device (channel) of a main board

  // --- REAL TIME CONSUMPTION TRACKING ---
  lastStartTime?: number | null; 
  usageSeconds: number;          
  
  // --- HEALTH CHECK ---
  lastSeen?: number;     // Timestamp of last heartbeat/activity
  isOffline?: boolean;   // Calculated offline status
  
  // --- NEW: Automation Data ---
  activeTimer?: TimerConfig | null;
  habits?: Habit[];
  
  // --- NEW: IR Data ---
  irConfig?: IRConfig;

  params?: {
    temperature?: number;
    mode?: 'cool' | 'heat' | 'dry' | 'fan';
    fanSpeed?: 'low' | 'med' | 'high';
  };
}

// --- NEW: Free Key Mapping Types ---
export type FreeKeyActionType = 'TOGGLE_DEVICE' | 'TURN_ON' | 'TURN_OFF' | 'ACTIVATE_SCENE' | 'CUSTOM_MODE';

export interface FreeKeyMapping {
  id: string; // Unique ID: "MAC_KEYINDEX"
  sourceMac: string;
  sourceKeyIndex: number;
  
  // User Configuration
  name?: string; // Custom name (e.g., "زرار النوم")
  actionType: FreeKeyActionType | null;
  targetId?: string; // Device ID or Scene ID
  
  // For CUSTOM_MODE: Map deviceId to desired state ('ON' | 'OFF')
  // Devices not in this map are IGNORED
  customModeConfig?: Record<string, 'ON' | 'OFF'>;
}

export interface SceneTarget {
  isOn: boolean;
  params?: Device['params'];
}

export interface Scene {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  targets: Record<string, SceneTarget>; 
}

export interface SystemBillingStats {
  total_kwh_this_month: number;
  last_month_kwh: number;
  last_bill_cost: number;
  current_month_index: number; // 0-11
}

export interface NexusSimulatorProps {
  devices: Device[];
  scenes: Scene[];
  wifiSsid: string;
  wifiIp: string;
  maxLoadWatts: number;
  isConnected: boolean;
  onToggleDevice: (id: string) => void;
  onUpdateDeviceParams: (id: string, params: Partial<Device['params']>) => void;
  
  // Automation Handlers
  onSetDeviceTimer: (id: string, timer: TimerConfig | null) => void;
  onUpdateDeviceHabits: (id: string, habits: Habit[]) => void;

  // Scene Management
  onApplyScene: (sceneId: string) => void;
  onSaveScene: (scene: Scene) => void; // CHANGED: Replaces generic add/update for full editing
  onDeleteScene: (sceneId: string) => void;
  
  // Provisioning
  onManualDiscoveryTrigger?: () => void; // For testing/simulation
  onEnablePairing: () => void; // Sends enable_pairing command to Hub

  // System Mode
  isOnlineMode: boolean;
  onToggleOnlineMode: (enabled: boolean) => void;

  // NEW: Billing Stats
  billingStats: SystemBillingStats;

  // NEW: Free Key Management
  freeKeyMappings: FreeKeyMapping[];
  onUpdateFreeKeyMapping: (mapping: FreeKeyMapping) => void;
  onDeleteFreeKeyMapping: (id: string) => void;
  onFreeKeyPress: (mac: string, keyIndex: number) => void;

  // NEW: Local Hub Config
  localHubIp?: string;
  onUpdateLocalHubIp?: (ip: string) => void;
}
