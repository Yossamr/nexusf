
import { generateDeviceId, isRelayDevice, isFreeKeyDevice } from './utils/deviceHelpers';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import NexusSimulator from './components/NexusSimulator';
import DeviceMappingModal from './components/DeviceMappingModal';
import { Device, Scene, SceneTarget, TimerConfig, Habit, DeviceType, IRConfig, FreeKeyMapping } from './types';
import { parseDeviceType } from './utils/deviceParser';
import mqtt from 'mqtt';
import { createClient } from '@libsql/client/web';
import { MQTT_CONFIG, DB_CONFIG } from './constants';
import { Zap } from 'lucide-react'; // Added import for loading icon

// --- HELPER: Apply State Change ---
const applyStateChange = (device: Device, newState: boolean, now: number): Device => {
    let newExtra = device.extraData;
    let newLastStartTime = device.lastStartTime;
    
    if (newState && !device.isOn) {
        newLastStartTime = now;
        if (device.type === 'ac') newExtra = `${device.params?.temperature || 24}°C`;
    } else if (!newState && device.isOn) {
        newLastStartTime = null;
        if (device.type === 'ac') newExtra = 'OFF';
    }

    return {
        ...device,
        isOn: newState,
        extraData: newExtra,
        lastStartTime: newLastStartTime
    };
};

// --- TYPE FOR CHANNEL CONFIG (MATCHING MODAL) ---
interface ChannelConfig {
  name: string;
  type: DeviceType;
  room: string;
  watts: number;
}

// --- BILLING HELPER ---
const calculateEgyptianBill = (kwh: number): string => {
  let cost = 0;
  let serviceFee = 0;

  if (kwh <= 100) {
    if (kwh <= 50) {
      cost = kwh * 0.68; // الشريحة الأولى
      serviceFee = 1;
    } else {
      cost = (50 * 0.68) + ((kwh - 50) * 0.78); // الشريحة الثانية
      serviceFee = 2;
    }
  } else if (kwh <= 650) {
    if (kwh <= 200) {
      cost = kwh * 0.95; // الشريحة الثالثة (تحاسب من الصفر)
      serviceFee = 6;
    } else if (kwh <= 350) {
      cost = (200 * 0.95) + ((kwh - 200) * 1.55); // الشريحة الرابعة
      serviceFee = 11;
    } else {
      cost = (200 * 0.95) + (150 * 1.55) + ((kwh - 350) * 1.95); // الشريحة الخامسة
      serviceFee = 15;
    }
  } else if (kwh <= 1000) {
    // من يعبر 650 كيلو، يسقط عنه الدعم تماماً ويُحاسب من الصفر على سعر 2.10 جنيه
    cost = kwh * 2.10;
    serviceFee = 25;
  } else {
    // الشريحة السابعة، من يعبر 1000 كيلو يُحاسب من الصفر على سعر 2.23 جنيه
    cost = kwh * 2.23;
    serviceFee = 40;
  }

  return (cost + serviceFee).toFixed(2);
};

const App: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]); 
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [freeKeyMappings, setFreeKeyMappings] = useState<FreeKeyMapping[]>([]); // NEW: Free Keys State
  
  // --- BILLING STATE ---
  const [billingStats, setBillingStats] = useState<SystemBillingStats>(() => {
      const saved = localStorage.getItem('nexus_billing_stats');
      if (saved) {
          try { return JSON.parse(saved); } catch(e) {}
      }
      return {
          total_kwh_this_month: 0,
          last_month_kwh: 0,
          last_bill_cost: 0,
          current_month_index: new Date().getMonth()
      };
  });

  // --- REFS FOR SYNCING ---
  const devicesRef = useRef<Device[]>([]);
  const scenesRef = useRef<Scene[]>([]);
  const freeKeyMappingsRef = useRef<FreeKeyMapping[]>([]); // NEW: Ref for Free Keys
  const lastMonthIndexRef = useRef<number>(new Date().getMonth()); // NEW: Track month for billing reset

  // --- SYNC LOCK TIMER ---
  const interactionTimeout = useRef<any>(null);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  useEffect(() => {
    freeKeyMappingsRef.current = freeKeyMappings;
  }, [freeKeyMappings]);

  // --- SYSTEM STATE ---
  const [isConnected, setIsConnected] = useState(false); // WebSocket Status
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  // Helper to show toast
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  }, []);
  
  // DEFAULT MODE: LOCAL (OFFLINE). Check localStorage, default to 'false' if not set.
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(() => {
      return localStorage.getItem('nexus_online_mode') === 'true';
  });

  // DB Ready State: If we are offline, we are "ready" immediately (don't wait for DB).
  // If online, we wait (false).
  const [isDbReady, setIsDbReady] = useState<boolean>(!isOnlineMode);     

  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // --- LOCAL HUB STATE (The Network Layer) ---
  const [localHubIp, setLocalHubIp] = useState<string>(() => localStorage.getItem('nexus_hub_ip') || '192.168.4.1');

  // --- PROVISIONING STATE ---
  const [provisioningData, setProvisioningData] = useState<{ 
      mac: string, 
      channels?: number, 
      type?: string,
      initialConfigs?: ChannelConfig[] // NEW: For editing
  } | null>(null);

  const mqttClient = useRef<mqtt.MqttClient | null>(null);
  const wsClient = useRef<WebSocket | null>(null); // Local WebSocket
  const wsReconnectTimeout = useRef<any>(null);

  const dbClient = useRef<ReturnType<typeof createClient> | null>(null);
  
  // Flag to block incoming DB reads while user is clicking buttons
  const isUserInteracting = useRef<boolean>(false); 

  // --- 1. LOCAL STORAGE PERSISTENCE ---
  useEffect(() => {
    const savedDevices = localStorage.getItem('nexus_devices');
    if (savedDevices) {
        try {
            const parsed = JSON.parse(savedDevices);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log("📂 Loaded devices from LocalStorage", parsed.length);
                setDevices(parsed);
                devicesRef.current = parsed; 
            }
        } catch (e) {
            console.error("Failed to parse local devices", e);
        }
    }

    const savedScenes = localStorage.getItem('nexus_scenes');
    if (savedScenes) {
        try {
            const parsed = JSON.parse(savedScenes);
            setScenes(parsed);
            scenesRef.current = parsed; 
        } catch(e) {}
    }

    const savedFreeKeys = localStorage.getItem('nexus_free_keys');
    if (savedFreeKeys) {
        try {
            const parsed = JSON.parse(savedFreeKeys);
            setFreeKeyMappings(parsed);
            freeKeyMappingsRef.current = parsed;
        } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
        localStorage.setItem('nexus_devices', JSON.stringify(devices));
    }
  }, [devices]);

  useEffect(() => {
    if (scenes.length > 0) {
        localStorage.setItem('nexus_scenes', JSON.stringify(scenes));
    }
  }, [scenes]);

  useEffect(() => {
    if (freeKeyMappings.length > 0) {
        localStorage.setItem('nexus_free_keys', JSON.stringify(freeKeyMappings));
    }
  }, [freeKeyMappings]);

  useEffect(() => {
    localStorage.setItem('nexus_billing_stats', JSON.stringify(billingStats));
  }, [billingStats]);

  // --- MQTT PUBLISHING HELPERS ---
  const publishToMQTT = useCallback((topic: string, payload: any, retain = false) => {
    if (!isOnlineMode) return;
    if (mqttClient.current && mqttClient.current.connected) {
      console.log(`📡 [MQTT OUT] Topic: ${topic}`, payload);
      mqttClient.current.publish(topic, JSON.stringify(payload), { qos: 1, retain });
    }
  }, [isOnlineMode]);

  // --- LOCAL WEBSOCKET HELPER ---
  const sendToLocalHub = useCallback((payload: any) => {
    if (wsClient.current && wsClient.current.readyState === WebSocket.OPEN) {
        console.log(`🔌 [WS OUT] ${JSON.stringify(payload)}`);
        wsClient.current.send(JSON.stringify(payload));
    } else {
        console.warn("⚠️ System Offline: Cannot send command.");
    }
  }, []);

  const publishDeviceState = useCallback((device: Device) => {
      // 1. Publish State (Retained) - Only works if Online
      publishToMQTT(`nexus/${device.id}/state`, device, true);
      
      let targetMac = device.id;
      // Ensure channelIndex is a valid integer, defaulting to 1
      let targetChannel = device.channelIndex && !isNaN(device.channelIndex) ? Math.floor(device.channelIndex) : 1;
      
      if (device.id.includes('_')) {
          const parts = device.id.split('_');
          targetMac = parts[0]; 
          // If ID is MAC_CHANNEL, try to parse channel from ID if channelIndex is missing
          if (parts.length > 1 && !device.channelIndex) {
             const parsedCh = parseInt(parts[1]);
             if (!isNaN(parsedCh)) targetChannel = parsedCh;
          }
      }

      // ⚠️ CRITICAL: Ensure 'value' is an INTEGER (1, 2, 3...) not string or null.
      const valueInt = Math.floor(Number(targetChannel)) || 1;

      const commandPayload = {
          action: 'set',
          mac: targetMac, 
          state: device.isOn ? 'ON' : 'OFF', // Sending ON/OFF as per protocol
          value: valueInt,
          params: device.params
      };

      if (isOnlineMode) {
          // CLOUD MODE: Send to MQTT Command Topic
          publishToMQTT('nexus/cloud/commands', commandPayload, false);
      } else {
          // LOCAL MODE: Send to Local WS
          sendToLocalHub(commandPayload);
      }
  }, [publishToMQTT, sendToLocalHub, isOnlineMode]);

  const publishSceneEvent = useCallback((sceneId: string, sceneName: string) => {
      publishToMQTT(`nexus/scenes/event`, {
          event: 'SCENE_ACTIVATED',
          sceneId,
          sceneName,
          timestamp: Date.now()
      }, false);
  }, [publishToMQTT]);

  const publishSceneManagement = useCallback((type: 'CREATED' | 'UPDATED' | 'DELETED', scene: Partial<Scene>) => {
      publishToMQTT(`nexus/scenes/manage`, {
          event: type,
          scene: scene,
          timestamp: Date.now()
      }, false);
  }, [publishToMQTT]);

  // --- SYNC RULES TO LOCAL HUB (OFFLINE EXECUTION) ---
  const syncRulesToHub = useCallback((mappings: FreeKeyMapping[]) => {
      const rules: any[] = [];
      const allScenes = scenesRef.current;

      mappings.forEach(m => {
          if (!m.actionType) return;

          const triggerMac = m.sourceMac;
          const triggerVal = m.sourceKeyIndex;

          const createRule = (targetId: string, action: 'TOGGLE' | 'ON' | 'OFF') => {
              const parts = targetId.split('_');
              const targetMac = parts[0];
              const targetVal = parts.length > 1 ? parseInt(parts[1]) : 1;
              
              // ⚠️ CRITICAL: Ensure values are Integers for C++ Hardware
              const tValInt = Math.floor(Number(targetVal)) || 1;
              const trValInt = Math.floor(Number(triggerVal)) || 1;

              rules.push({
                  trigger_mac: triggerMac,
                  trigger_val: trValInt,
                  target_mac: targetMac,
                  target_val: tValInt,
                  action_type: action // MUST BE 'TOGGLE' for switching
              });
          };

          if (m.actionType === 'TOGGLE_DEVICE' && m.targetId) {
              // ✅ Correctly sending TOGGLE as requested
              createRule(m.targetId, 'TOGGLE');
          } else if (m.actionType === 'TURN_ON' && m.targetId) {
              createRule(m.targetId, 'ON');
          } else if (m.actionType === 'TURN_OFF' && m.targetId) {
              createRule(m.targetId, 'OFF');
          } else if (m.actionType === 'CUSTOM_MODE' && m.customModeConfig) {
              Object.entries(m.customModeConfig).forEach(([devId, state]) => {
                  createRule(devId, state === 'ON' ? 'ON' : 'OFF');
              });
          } else if (m.actionType === 'ACTIVATE_SCENE' && m.targetId) {
              const scene = allScenes.find(s => s.id === m.targetId);
              if (scene && scene.targets) {
                  Object.entries(scene.targets).forEach(([devId, target]) => {
                      createRule(devId, target.isOn ? 'ON' : 'OFF');
                  });
              }
          }
      });

      console.log(`🧠 [Nexus Core] Syncing ${rules.length} Rules to Hub...`, rules);
      // Requirement: {"action": "save_rules", "rules": [...]}
      const payload = { action: "save_rules", rules: rules };
      
      if (wsClient.current && wsClient.current.readyState === WebSocket.OPEN) {
           wsClient.current.send(JSON.stringify(payload));
      }
  }, []);

  // Sync whenever mappings change
  useEffect(() => {
      if (freeKeyMappings.length > 0 || freeKeyMappingsRef.current.length > 0) {
          syncRulesToHub(freeKeyMappings);
      }
  }, [freeKeyMappings, syncRulesToHub]);

  // --- LOCK MANAGER ---
  // Blocks database reads when user is clicking buttons
  // This prevents the "flicker" where old DB data overwrites the new local state
  const setInteractionLock = () => {
    isUserInteracting.current = true;
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    
    // Lock sync for 5 seconds after last action
    interactionTimeout.current = setTimeout(() => {
        isUserInteracting.current = false;
        console.log("🔓 [Sync Lock] Released. Resuming DB polling.");
    }, 5000);
  };

  const persistDevice = useCallback(async (device: Device) => {
    if (!isOnlineMode || !dbClient.current) return;
    try {
      console.log(`💾 [DB WRITE] Saving device: ${device.id}`); // Log the write
      const isOn = device.isOn ? 1 : 0;
      const temperature = device.params?.temperature ?? null; 
      const watts = device.watts;
      const usageSeconds = Math.floor(device.usageSeconds || 0);
      const room = device.room || "";

      await dbClient.current.execute({
        sql: `INSERT INTO devices (id, json, isOn, temperature, watts, usageSeconds, room) 
              VALUES (?, ?, ?, ?, ?, ?, ?) 
              ON CONFLICT(id) DO UPDATE SET 
              json=excluded.json,
              isOn=excluded.isOn,
              temperature=excluded.temperature,
              watts=excluded.watts,
              usageSeconds=excluded.usageSeconds,
              room=excluded.room`,
        args: [device.id, JSON.stringify(device), isOn, temperature, watts, usageSeconds, room]
      });
    } catch (e) {
      console.warn("DB Device Write Error:", e);
    }
  }, [isOnlineMode]);

  const handleApplyScene = useCallback((sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !scene.targets) return;

    publishSceneEvent(scene.id, scene.name);
    setInteractionLock(); // Blocks sync

    setDevices(prevDevices => {
        const updatedList = prevDevices.map(device => {
            const target = scene.targets[device.id];
            if (target) {
                const shouldBeOn = target.isOn;
                let updatedDevice = device.isOn !== shouldBeOn ? applyStateChange(device, shouldBeOn, Date.now()) : device;
                updatedDevice = { ...updatedDevice, params: target.params ? { ...updatedDevice.params, ...target.params } : updatedDevice.params };
                
                persistDevice(updatedDevice); // IMMEDIATE WRITE
                publishDeviceState(updatedDevice);
                return updatedDevice;
            }
            return device;
        });
        return updatedList;
    });
  }, [scenes, isOnlineMode, persistDevice, publishDeviceState, publishSceneEvent]);

  // --- FREE KEY LOGIC ---
  const handleFreeKeyEvent = useCallback((mac: string, keyIndex: number) => {
    console.log(`🔑 [Free Key] Event received from ${mac} Key #${keyIndex}`);
    
    const mappingId = generateDeviceId(mac, keyIndex);
    const existingMapping = freeKeyMappingsRef.current.find(m => m.id === mappingId);

    // 1. If unknown, add to discovery list (UI will show it)
    if (!existingMapping) {
      console.log("🆕 Discovered new Free Key!");
      setFreeKeyMappings(prev => [
        ...prev, 
        { id: mappingId, sourceMac: mac, sourceKeyIndex: keyIndex, actionType: null }
      ]);
      return;
    }

    // 2. Visual Feedback Only
    // We do NOT execute the action here anymore. The ESP32 Hub handles the rules.
    const event = new CustomEvent('nexus-free-key-press', { detail: { id: mappingId } });
    window.dispatchEvent(event);
    
  }, []);

  const handleUpdateFreeKeyMapping = useCallback((mapping: FreeKeyMapping) => {
    setFreeKeyMappings(prev => prev.map(m => m.id === mapping.id ? mapping : m));
  }, []);

  const handleDeleteFreeKeyMapping = useCallback((id: string) => {
    setFreeKeyMappings(prev => prev.filter(m => m.id !== id));
  }, []);



  const persistGlobalStats = useCallback(async (totalWatts: number, totalKwh: number, activeCount: number, cost: number) => {
    if (!isOnlineMode || !dbClient.current) return;
    try {
        await dbClient.current.execute({
            sql: `INSERT INTO system_stats (id, totalWatts, totalKwh, activeDevices, currentCost, lastUpdated)
                  VALUES ('master', ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET
                  totalWatts=excluded.totalWatts,
                  totalKwh=excluded.totalKwh,
                  activeDevices=excluded.activeDevices,
                  currentCost=excluded.currentCost,
                  lastUpdated=excluded.lastUpdated`,
            args: [totalWatts, totalKwh, activeCount, cost, Date.now()]
        });
    } catch (e) {
        console.warn("DB Stats Write Error:", e);
    }
  }, [isOnlineMode]);

  const persistScene = useCallback(async (scene: Scene) => {
    if (!isOnlineMode || !dbClient.current) return;
    try {
      await dbClient.current.execute({
        sql: "INSERT INTO scenes (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json=excluded.json",
        args: [scene.id, JSON.stringify(scene)]
      });
    } catch (e) {}
  }, [isOnlineMode]);

  const deleteSceneFromDb = useCallback(async (id: string) => {
    if (!isOnlineMode || !dbClient.current) return;
    try {
      await dbClient.current.execute({
        sql: "DELETE FROM scenes WHERE id = ?",
        args: [id]
      });
    } catch (e) {}
  }, [isOnlineMode]);



  const syncWithDatabase = useCallback(async () => {
    // CRITICAL: Do not read from DB if user just clicked something
    if (!isOnlineMode || !dbClient.current || isUserInteracting.current) {
        if (isUserInteracting.current) console.log("⏳ [Sync] Skipped due to active user interaction.");
        return;
    }

    try {
        const deviceRes = await dbClient.current.execute("SELECT * FROM devices");
        const remoteDevices: Device[] = [];
        
        for (const row of deviceRes.rows) {
            try { 
                const d = JSON.parse(row.json as string);
                remoteDevices.push({
                    ...d,
                    watts: Number(d.watts) || 0,
                    usageSeconds: Number(d.usageSeconds) || 0,
                    lastStartTime: (d.lastStartTime && Number(d.lastStartTime) > 0) ? Number(d.lastStartTime) : null
                }); 
            } catch (e) {}
        }
        remoteDevices.sort((a, b) => a.type.localeCompare(b.type));

        const sceneRes = await dbClient.current.execute("SELECT * FROM scenes");
        const remoteScenes: Scene[] = [];
        for (const row of sceneRes.rows) {
             try { remoteScenes.push(JSON.parse(row.json as string)); } catch(e) {}
        }

        setDevices(prev => {
            const prevStr = JSON.stringify(prev);
            const nextStr = JSON.stringify(remoteDevices);
            return prevStr !== nextStr ? remoteDevices : prev;
        });

        setScenes(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(remoteScenes)) {
                return remoteScenes;
            }
            return prev;
        });

        setLastSyncTime(Date.now());
        console.log("🔄 [DB SYNC] Updated from cloud.");

    } catch (e) {
        console.warn("[Sync] Failed to fetch updates", e);
    }
  }, [isOnlineMode]);


  // --- DEVICE UPDATE HANDLER ---
  const handleExternalUpdate = useCallback((id: string, data: any) => {
    setDevices(prev => {
      const targetIndex = prev.findIndex(d => d.id === id);
      if (targetIndex === -1) {
          console.warn(`⚠️ Cannot update unknown device: ${id}`);
          return prev; 
      }
      const oldDevice = prev[targetIndex];
      // Prevent infinite loops: only update if data actually changed
      const newIsOn = data.isOn !== undefined ? data.isOn : oldDevice.isOn;
      
      // Merge params cautiously
      const newParams = { ...oldDevice.params, ...(data.params || {}) };
      
      // Update logic (applyStateChange-like logic to ensure consistency)
      let newExtra = oldDevice.extraData;
      let newLastStartTime = oldDevice.lastStartTime;
      
      if (newIsOn && !oldDevice.isOn) {
          newLastStartTime = Date.now();
          if (oldDevice.type === 'ac') newExtra = `${newParams.temperature || 24}°C`;
      } else if (!newIsOn && oldDevice.isOn) {
          newLastStartTime = null;
          if (oldDevice.type === 'ac') newExtra = 'OFF';
      }

      const newDevice = { 
          ...oldDevice, 
          isOn: newIsOn,
          params: newParams,
          extraData: newExtra,
          lastStartTime: newLastStartTime,
          ...data 
      };
      
      persistDevice(newDevice); 
      return [...prev.slice(0, targetIndex), newDevice, ...prev.slice(targetIndex + 1)];
    });
  }, [persistDevice]);

  // --- UNIFIED MESSAGE HANDLER (STRICT CONTRACT) ---
  const handleIncomingMessage = useCallback((data: any) => {
      if (!data || !data.event) return;

      try {
          // 1. DISCOVERY EVENT
          if (data.event === 'new_device_discovered') {
              const { mac, type, value } = data;
              if (!mac || !type) return;

              const channelCount = (typeof value === 'number' && value > 0) ? value : 1;
              
              // Check for duplicates
              let hasNew = false;
              // We check both devices and free keys to be safe, though they are separate lists
              for (let i = 1; i <= channelCount; i++) {
                  const id = generateDeviceId(mac, i);
                  const existsInDevices = devicesRef.current.some(d => d.id === id);
                  const existsInKeys = freeKeyMappingsRef.current.some(k => k.id === id);
                  if (!existsInDevices && !existsInKeys) {
                      hasNew = true;
                      break;
                  }
              }

              if (!hasNew) {
                  console.log(`⚠️ Ignoring duplicate discovery for ${mac}`);
                  return;
              }

              console.log(`✨ New Device Discovered: ${mac} (${type}) [${channelCount} ch]`);

              if (isRelayDevice(type)) {
                  // Relays -> Open Provisioning Modal
                  setProvisioningData({ 
                      mac, 
                      channels: channelCount, 
                      type,
                      initialConfigs: [] 
                  });
              } else if (isFreeKeyDevice(type)) {
                  // Free Keys -> Auto Add to Automations
                  const newKeys: FreeKeyMapping[] = [];
                  for (let i = 1; i <= channelCount; i++) {
                      const id = generateDeviceId(mac, i);
                      if (!freeKeyMappingsRef.current.some(k => k.id === id)) {
                          newKeys.push({
                              id,
                              sourceMac: mac,
                              sourceKeyIndex: i,
                              actionType: null,
                              name: `Button ${i}`
                          });
                      }
                  }
                  if (newKeys.length > 0) {
                      setFreeKeyMappings(prev => [...prev, ...newKeys]);
                      showToast(`تم إضافة مفاتيح تحكم جديدة (${mac})`, 'success');
                  }
              }
              return;
          }

          // 2. STATE UPDATE EVENT
          if (data.event === 'state_update') {
              const { mac, state, value } = data;
              if (!mac) return;
              
              const channel = (typeof value === 'number') ? value : 1;
              const targetId = generateDeviceId(mac, channel);
              const isOn = state === 'ON';

              setDevices(prev => prev.map(d => {
                  if (d.id === targetId) {
                      // Apply state change logic (update timestamps, etc.)
                      let newExtra = d.extraData;
                      let newLastStartTime = d.lastStartTime;
                      
                      if (isOn && !d.isOn) {
                          newLastStartTime = Date.now();
                          if (d.type === 'ac') newExtra = `${d.params?.temperature || 24}°C`;
                      } else if (!isOn && d.isOn) {
                          newLastStartTime = null;
                          if (d.type === 'ac') newExtra = 'OFF';
                      }

                      return {
                          ...d,
                          isOn: isOn,
                          isOffline: false,
                          lastSeen: Date.now(),
                          extraData: newExtra,
                          lastStartTime: newLastStartTime,
                          params: data.params ? { ...d.params, ...data.params } : d.params
                      };
                  }
                  return d;
              }));
              return;
          }

          // 3. PING EVENT
          if (data.event === 'ping') {
              const { mac } = data;
              if (!mac) return;

              setDevices(prev => prev.map(d => {
                  if (d.id.startsWith(`${mac}_`)) {
                      return { ...d, isOffline: false, lastSeen: Date.now() };
                  }
                  return d;
              }));
              return;
          }

          // 4. FREE KEY EVENT
          if (data.event === 'free_key') {
              const { mac, value } = data;
              if (!mac) return;
              
              const channel = (typeof value === 'number') ? value : 1;
              const id = generateDeviceId(mac, channel);

              console.log(`🔑 Free Key Pressed: ${id}`);
              // STRICT RULE: Do NOT toggle devices here. Only visual feedback.
              // The ESP32 handles the actual logic based on saved rules.
              window.dispatchEvent(new CustomEvent('nexus-free-key-press', { detail: { id } }));
              return;
          }

      } catch (e) {
          console.error("Message Processing Error", e);
      }
  }, [showToast]);

  // --- LOCAL WEBSOCKET CONNECTION MANAGER ---
  const connectLocalWebSocket = useCallback(() => {
    // STRICT MODE: If Online Mode is ON, DO NOT connect to Local WS
    if (isOnlineMode) {
        if (wsClient.current) {
            console.log("🚫 [Strict Mode] Closing Local WS because Cloud Mode is ON.");
            wsClient.current.close();
            wsClient.current = null;
        }
        return;
    }

    if (wsClient.current && (wsClient.current.readyState === WebSocket.OPEN || wsClient.current.readyState === WebSocket.CONNECTING)) return;
    
    // Force 192.168.4.1 for Standalone Mode as requested
    const targetIp = localHubIp === 'nexus.local' ? '192.168.4.1' : localHubIp;
    
    // Determine protocol based on current page protocol to avoid Mixed Content errors
    // If on HTTPS, we can't connect to WS (insecure). 
    // BUT for local IPs, browsers sometimes allow it, or we might be in a dev tunnel.
    // Ideally, if we are on HTTPS, we should use WSS, but ESP32 usually only supports WS.
    // For now, we'll try to connect, but wrap in try/catch is already there.
    // We will just use 'ws://' as requested for local devices.
    const wsUrl = `ws://${targetIp}/ws`; 

    console.log(`🔌 [Nexus Core] Initiating Link to ${wsUrl}...`);

    try {
        // Check if we are in a secure context (HTTPS) and trying to connect to insecure WS
        if (window.location.protocol === 'https:' && !targetIp.includes('localhost') && !targetIp.includes('127.0.0.1')) {
             console.warn("⚠️ Security Warning: Trying to connect to insecure WebSocket from HTTPS page. This might be blocked by the browser.");
        }

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("✅ [Nexus Core] Connected to Central Hub (ESP32)");
            setIsConnected(true);
            showToast("تم الاتصال بوحدة التحكم المحلية", "success");
            if (wsReconnectTimeout.current) clearTimeout(wsReconnectTimeout.current);
            
            // Sync rules immediately on connect to ensure Hub is up to date
            if (freeKeyMappingsRef.current.length > 0) {
                syncRulesToHub(freeKeyMappingsRef.current);
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleIncomingMessage(data);
            } catch (e) {
                console.error("WS Parse Error", e);
            }
        };

        ws.onclose = (e) => {
            console.warn(`🔌 [Nexus Core] Link Lost. Reconnecting in 2.5s...`);
            setIsConnected(false);
            wsClient.current = null;
            if (wsReconnectTimeout.current) clearTimeout(wsReconnectTimeout.current);
            
            // Only reconnect if we are still in Offline Mode
            if (!isOnlineMode) {
                // Requirement: Wait 2-3 seconds before reconnecting
                wsReconnectTimeout.current = setTimeout(() => {
                    connectLocalWebSocket();
                }, 2500); 
            }
        };

        ws.onerror = (e) => {
            console.error("🔌 [Nexus Core] Socket Error", e);
            ws.close();
        };
        wsClient.current = ws;

    } catch (err) {
        console.error("Socket Init Error", err);
        if (wsReconnectTimeout.current) clearTimeout(wsReconnectTimeout.current);
        if (!isOnlineMode) {
            wsReconnectTimeout.current = setTimeout(connectLocalWebSocket, 2500);
        }
    }
  }, [localHubIp, isOnlineMode, syncRulesToHub, handleIncomingMessage, showToast]);

  useEffect(() => {
      if (wsClient.current) wsClient.current.close();
      connectLocalWebSocket();
      return () => {
          if (wsClient.current) wsClient.current.close();
          if (wsReconnectTimeout.current) clearTimeout(wsReconnectTimeout.current);
      };
  }, [localHubIp, connectLocalWebSocket]);


  // --- INITIALIZE DATABASE (ROBUST) ---
  useEffect(() => {
    let isMounted = true;
    let syncInterval: any = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const connectDB = async () => {
      // Offline Mode Check
      if (!isOnlineMode) {
          console.log("📴 System is in LOCAL ONLY Mode. DB Sync Disabled.");
          if (dbClient.current) dbClient.current = null;
          setIsDbReady(true);
          return;
      }
      
      setIsDbReady(false);

      while (isMounted && isOnlineMode && retryCount < MAX_RETRIES) {
        try {
          console.log(`🚀 Initializing System (LibSQL Production) - Attempt ${retryCount + 1}...`);
          const rawUrl = String(DB_CONFIG.url || "").trim();
          const token = String(DB_CONFIG.authToken || "").trim();
          
          if (!rawUrl || !token) throw new Error("DB Config missing");
          
          // DO NOT FORCE libsql:// protocol. Allow raw URL (https://) to pass through for web client compatibility.
          const client = createClient({ url: rawUrl, authToken: token });
          
          // Test Connection
          await client.execute("SELECT 1");
          console.log("✅ Database Connected.");

          // --- PERSISTENT SCHEMA ---
          await client.execute(`
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY, 
                json TEXT,
                isOn INTEGER DEFAULT 0,
                temperature INTEGER DEFAULT 0,
                watts INTEGER DEFAULT 0,
                usageSeconds INTEGER DEFAULT 0,
                room TEXT
            )
          `);
          
          await client.execute(`CREATE TABLE IF NOT EXISTS scenes (id TEXT PRIMARY KEY, json TEXT)`);
          
          await client.execute(`
            CREATE TABLE IF NOT EXISTS system_stats (
                id TEXT PRIMARY KEY,
                totalWatts INTEGER DEFAULT 0,
                totalKwh REAL DEFAULT 0,
                activeDevices INTEGER DEFAULT 0,
                currentCost REAL DEFAULT 0,
                lastUpdated INTEGER
            )
          `);

          dbClient.current = client; 
          
          // --- UPLOAD LOCAL DATA ---
          const currentDevices = devicesRef.current;
          const currentScenes = scenesRef.current;
          
          if (currentDevices.length > 0 || currentScenes.length > 0) {
              console.log("☁️ Syncing Local Data to Cloud...");
              const uploadLocalData = async () => {
                  if (currentDevices.length > 0) {
                      for (const d of currentDevices) {
                          await persistDevice(d);
                      }
                  }
                  if (currentScenes.length > 0) {
                      for (const s of currentScenes) {
                          await persistScene(s);
                      }
                  }
                  console.log("✅ Upload Complete.");
              };
              await uploadLocalData();
          }

          await syncWithDatabase();
          
          if (isMounted) setIsDbReady(true);
          break; // Success!

        } catch (err: any) {
          console.error("[Nexus DB] Connection Failed:", err);
          
          // CHECK FOR CORS/NETWORK ERROR
          const msg = err.message || "";
          if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
              console.warn("⚠️ CRITICAL: Database blocked by CORS or Network. DB Sync Disabled.");
              if (isMounted) {
                // STRICT MODE: Do NOT switch to offline mode automatically.
                // setIsOnlineMode(false); 
                setIsDbReady(true);     // Allow UI to render
              }
              return; // Stop trying
          }

          retryCount++;
          if (dbClient.current) dbClient.current = null;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // If we exhausted retries and still failed
      if (retryCount >= MAX_RETRIES && isMounted) {
         console.warn("⚠️ Max retries reached. DB Sync Disabled.");
         // STRICT MODE: Do NOT switch to offline mode automatically.
         // setIsOnlineMode(false);
         setIsDbReady(true);
      }
    };

    connectDB();

    if (isOnlineMode) {
        // CHANGED: Slow down sync to 10 seconds to reduce race conditions
        syncInterval = setInterval(() => {
            if (dbClient.current) syncWithDatabase();
        }, 10000); 
    }

    return () => { 
        isMounted = false; 
        if (syncInterval) clearInterval(syncInterval);
        if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    };
  }, [syncWithDatabase, isOnlineMode]);

  // MQTT Listener
  useEffect(() => {
    // STRICT MODE: If Offline Mode, Ensure MQTT is Dead
    if (!isOnlineMode) {
        if (mqttClient.current) {
            console.log("📴 [Strict Mode] Disconnecting MQTT (Local Mode Active)...");
            mqttClient.current.end();
            mqttClient.current = null;
            setIsConnected(false); // Update indicator
        }
        return;
    }

    if (mqttClient.current) return; 

    const connectMQTT = () => {
      try {
        // 1. Broker URL (Secure WebSockets)
        const brokerUrl = 'wss://e462158e43674f3faf283e5e3390e2ff.s1.eu.hivemq.cloud:8884/mqtt';

        // 2. Connection Options
        const options: mqtt.IClientOptions = {
            clean: true,
            connectTimeout: 10000,
            clientId: 'nexus_app_' + Math.random().toString(16).substring(2, 10),
            username: 'nexus_admin',
            password: 'Nexus@2026',
            protocolVersion: 4 // MQTT v3.1.1
        };

        console.log('⏳ [Nexus Cloud] Connecting to HiveMQ Cloud...');
        const client = mqtt.connect(brokerUrl, options);
        
        client.on('connect', () => { 
            console.log("☁️ ✅ [Nexus Cloud] Connected Successfully!");
            setIsConnected(true);
            showToast("تم الاتصال بالسحابة بنجاح", "success");
            
            // Subscribe to state topic
            client.subscribe('nexus/cloud/state', { qos: 1 });
        });
        
        client.on('error', (err) => {
            console.error('❌ [Nexus Cloud] Connection Error:', err);
            setIsConnected(false);
        });

        client.on('offline', () => {
            console.warn('⚠️ [Nexus Cloud] Connection Lost (Offline)');
            setIsConnected(false);
        });

        client.on('message', (topic, message) => {
          try {
             console.log(`📩 [Nexus Cloud] Message on [${topic}]: ${message.toString()}`);
             const payload = JSON.parse(message.toString());
             handleIncomingMessage(payload);
          } catch (e) {
              console.error("Message Parse Error", e);
          }
        });

        mqttClient.current = client;
      } catch (error) {
          console.error("[Nexus MQTT] Setup failed:", error);
      }
    };
    connectMQTT();
    return () => { if (mqttClient.current) { mqttClient.current.end(); mqttClient.current = null; } };
  }, [isOnlineMode, handleIncomingMessage, showToast]);

  // --- OFFLINE CHECKER (HEALTH MONITOR) ---
  useEffect(() => {
      const healthCheck = setInterval(() => {
          const now = Date.now();
          setDevices(currentDevices => {
              let hasChanges = false;
              const updated = currentDevices.map(d => {
                  // If device has never been seen, assume online or ignore? 
                  // Let's assume if lastSeen is undefined, it's just added or legacy.
                  // Only mark offline if we have a lastSeen and it's old.
                  if (d.lastSeen && (now - d.lastSeen > 65000)) {
                      if (!d.isOffline) {
                          hasChanges = true;
                          return { ...d, isOffline: true };
                      }
                  }
                  return d;
              });
              return hasChanges ? updated : currentDevices;
          });
      }, 10000); // Check every 10 seconds

      return () => clearInterval(healthCheck);
  }, []);

  // --- HEARTBEAT & BILLING CALCULATION ---
  useEffect(() => {
    const heartBeat = setInterval(() => {
      const now = Date.now();
      const dateObj = new Date();
      const currentDay = dateObj.getDay(); 
      const currentTimeStr = dateObj.getHours().toString().padStart(2, '0') + ':' + dateObj.getMinutes().toString().padStart(2, '0');
      const currentMonth = dateObj.getMonth();
      const isNewMonth = currentMonth !== lastMonthIndexRef.current;
      
      if (isNewMonth) {
          lastMonthIndexRef.current = currentMonth;
          console.log(`📅 [Billing] New Month Detected! Resetting stats...`);
      }

      // --- MONTHLY BILLING CYCLE CHECK ---
      setBillingStats(prev => {
          if (isNewMonth) {
              return {
                  total_kwh_this_month: 0,
                  last_month_kwh: prev.total_kwh_this_month,
                  last_bill_cost: Number(calculateEgyptianBill(prev.total_kwh_this_month)),
                  current_month_index: currentMonth
              };
          }
          return prev;
      });

      setDevices(currentDevices => {
        let hasChanges = false;
        let incrementalKwh = 0;

        const updatedDevices = currentDevices.map(d => {
            let modifiedDevice = { ...d };
            let deviceChanged = false;

            // RESET USAGE IF NEW MONTH
            if (isNewMonth) {
                modifiedDevice.usageSeconds = 0;
                deviceChanged = true;
            }

            if (d.isOn && d.lastStartTime) {
                const elapsedSeconds = (now - d.lastStartTime) / 1000;
                if (elapsedSeconds > 1) { 
                    modifiedDevice = { 
                        ...modifiedDevice, 
                        usageSeconds: (Number(modifiedDevice.usageSeconds)||0) + elapsedSeconds, 
                        lastStartTime: now 
                    };
                    deviceChanged = true;
                    
                    // --- REAL-TIME KWH CALCULATION ---
                    // kWh = (Watts / 1000) * (Seconds / 3600)
                    const watts = Number(d.watts) || 0;
                    const kwhDelta = (watts / 1000) * (elapsedSeconds / 3600);
                    incrementalKwh += kwhDelta;
                }
            }

            if (d.activeTimer && now >= d.activeTimer.targetTime) {
                const shouldBeOn = d.activeTimer.action === 'ON';
                if (d.isOn !== shouldBeOn) {
                    modifiedDevice = applyStateChange(modifiedDevice, shouldBeOn, now);
                    // publishDeviceState(modifiedDevice); // DISABLED: Prevent auto-spam
                }
                modifiedDevice.activeTimer = null;
                deviceChanged = true;
            }

            if (d.habits) {
                d.habits.forEach(habit => {
                    if (habit.enabled && habit.days.includes(currentDay) && habit.time === currentTimeStr) {
                         const shouldBeOn = habit.action === 'ON';
                         if (d.isOn !== shouldBeOn) {
                             modifiedDevice = applyStateChange(modifiedDevice, shouldBeOn, now);
                             // publishDeviceState(modifiedDevice); // DISABLED: Prevent auto-spam
                             deviceChanged = true;
                         }
                    }
                });
            }

            if (deviceChanged) {
                hasChanges = true;
                persistDevice(modifiedDevice);
            }

            return modifiedDevice;
        });

        if (incrementalKwh > 0) {
            setBillingStats(prev => ({
                ...prev,
                total_kwh_this_month: prev.total_kwh_this_month + incrementalKwh
            }));
        }

        return hasChanges ? updatedDevices : currentDevices;
      });
    }, 3000); 

    return () => clearInterval(heartBeat);
  }, [isDbReady, isOnlineMode, persistDevice, publishDeviceState]);

  // --- HANDLE USER INTERACTION (TOGGLE) ---
  // This is called ONLY when the user clicks a button in the UI.
  // It updates the state AND sends a command to the hardware.
  const handleUserToggleDevice = useCallback((id: string) => {
    // 1. Lock DB Reads
    setInteractionLock();
    
    setDevices(prev => {
        const updatedList = prev.map(d => {
            if (d.id === id) {
                const newState = !d.isOn;
                const updatedDevice = applyStateChange(d, newState, Date.now());
                persistDevice(updatedDevice); // IMMEDIATE WRITE
                
                // 3. Send Command to Hardware
                // This is the ONLY place where we send commands for toggles.
                publishDeviceState(updatedDevice); 
                
                return updatedDevice;
            }
            return d;
        });
        return updatedList;
    });
  }, [isOnlineMode, persistDevice, publishDeviceState]);

  const handleUpdateDeviceParams = useCallback((id: string, params: Partial<Device['params']>) => {
    setInteractionLock();

    setDevices(prev => {
        const updatedList = prev.map(d => {
            if (d.id === id) {
                const updatedParams = { ...d.params, ...params };
                let updatedExtra = d.extraData;
                if (d.type === 'ac' && d.isOn) updatedExtra = `${updatedParams.temperature}°C`;
                const updatedDevice = { ...d, params: updatedParams, extraData: updatedExtra };
                
                persistDevice(updatedDevice); // IMMEDIATE WRITE
                publishDeviceState(updatedDevice); 
                return updatedDevice;
            }
            return d;
        });
        return updatedList;
    });
  }, [isOnlineMode, persistDevice, publishDeviceState]);

  const handleSetDeviceTimer = useCallback((id: string, timer: TimerConfig | null) => {
      setInteractionLock();
      setDevices(prev => prev.map(d => {
          if (d.id === id) {
              const updated = { ...d, activeTimer: timer };
              persistDevice(updated);
              publishDeviceState(updated);
              return updated;
          }
          return d;
      }));
  }, [isOnlineMode, persistDevice, publishDeviceState]);

  const handleUpdateDeviceHabits = useCallback((id: string, habits: Habit[]) => {
      setInteractionLock();
      setDevices(prev => prev.map(d => {
          if (d.id === id) {
              const updated = { ...d, habits: habits };
              persistDevice(updated);
              publishDeviceState(updated);
              return updated;
          }
          return d;
      }));
  }, [isOnlineMode, persistDevice, publishDeviceState]);



  // NEW: Combined Save/Update Scene Logic
  const handleSaveScene = useCallback((scene: Scene) => {
    setInteractionLock();
    
    setScenes(prev => {
        const index = prev.findIndex(s => s.id === scene.id);
        let nextScenes;
        let eventType: 'CREATED' | 'UPDATED' = 'UPDATED';

        if (index >= 0) {
            // Update existing
            nextScenes = [...prev];
            nextScenes[index] = scene;
        } else {
            // Create new
            nextScenes = [...prev, scene];
            eventType = 'CREATED';
        }
        
        persistScene(scene);
        publishSceneManagement(eventType, scene);
        return nextScenes;
    });
  }, [isOnlineMode, persistScene, publishSceneManagement]);

  const handleDeleteScene = useCallback((id: string) => {
      setInteractionLock();
      setScenes(prev => prev.filter(s => s.id !== id));
      deleteSceneFromDb(id);
      publishSceneManagement('DELETED', { id });
  }, [isOnlineMode, deleteSceneFromDb, publishSceneManagement]);

  const handleProvisioningSave = (mappings: { channelIndex: number, name: string, type: DeviceType, room: string, watts: number }[]) => {
    if (!provisioningData) return;
    
    setInteractionLock();
    const baseMac = provisioningData.mac;
    const newDevices: Device[] = [];
    const newFreeKeys: FreeKeyMapping[] = [];

    const isRemote = provisioningData.type?.includes('remote');

    if (isRemote) {
        // --- REMOTE LOGIC: SINGLE DEVICE ---
        const newDevice: Device = {
            id: baseMac,
            name: mappings[0]?.name || "Remote Control",
            room: mappings[0]?.room || "",
            type: 'remote', 
            isOn: false,
            watts: 0, // Remotes usually battery powered
            usageSeconds: 0,
            lastStartTime: null,
            numberOfButtons: provisioningData.channels || 1,
            relayCount: 0,
            freeKeyCount: provisioningData.channels || 1,
            parentId: baseMac
        };
        newDevices.push(newDevice);
        persistDevice(newDevice);
        publishDeviceState(newDevice);

        // Create Free Keys mappings
        for (let i = 1; i <= (provisioningData.channels || 1); i++) {
             const keyId = `${baseMac}_${i}`;
             // Find the mapping for this specific channel/button
             const mapping = mappings.find(m => m.channelIndex === i);
             const keyName = mapping?.name || `Button ${i}`;

             if (!freeKeyMappingsRef.current.find(k => k.id === keyId)) {
                 newFreeKeys.push({
                     id: keyId,
                     sourceMac: baseMac,
                     sourceKeyIndex: i,
                     actionType: null,
                     name: keyName
                 });
             }
        }
    } else {
        // --- RELAY/LIGHT LOGIC: SPLIT DEVICES ---
        mappings.forEach((config) => {
            const channelNum = config.channelIndex;
            const virtualId = `${baseMac}_${channelNum}`; 

            const newDevice: Device = {
              id: virtualId,
              channelIndex: channelNum,
              name: config.name,
              room: config.room,
              type: config.type,
              isOn: false,
              watts: config.watts || 0, // Use user-provided watts
              usageSeconds: 0,
              lastStartTime: null,
              params: config.type === 'ac' ? { temperature: 24, mode: 'cool', fanSpeed: 'low' } : 
                      config.type === 'fan' ? { fanSpeed: 'low' } : undefined,
              
              // Store raw config for future reference
              relayCount: mappings.length,
              parentId: baseMac
            };

            newDevices.push(newDevice);
            persistDevice(newDevice);
            publishDeviceState(newDevice);
        });

        // Create Free Keys (if any) based on parsed type
        if (provisioningData.type) {
            const config = parseDeviceType(provisioningData.type);
            if (config.freeKeyCount > 0) {
                for (let i = 1; i <= config.freeKeyCount; i++) {
                    const keyId = `${baseMac}_${i}`;
                    // Check if already exists to avoid overwrite
                    if (!freeKeyMappingsRef.current.find(k => k.id === keyId)) {
                        newFreeKeys.push({
                            id: keyId,
                            sourceMac: baseMac,
                            sourceKeyIndex: i,
                            actionType: null,
                            name: `مفتاح حر ${i}`
                        });
                    }
                }
            }
        }
    }

    setDevices(prev => {
        // Filter out any devices that are being updated/replaced to avoid duplicates
        const filtered = prev.filter(d => !newDevices.some(nd => nd.id === d.id));
        return [...filtered, ...newDevices];
    });
    
    if (newFreeKeys.length > 0) {
        setFreeKeyMappings(prev => [...prev, ...newFreeKeys]);
    }
    
    setProvisioningData(null);
  };

  const triggerManualDiscovery = () => {
      const mockMac = `DEV_${Math.floor(Math.random() * 10000)}`;
      setProvisioningData({ mac: mockMac, channels: 3 }); 
  };
  
  const handleEnablePairing = useCallback(() => {
    console.log("🔓 Enabling Pairing Mode on Hub...");
    // Requirement: Send {"action": "enable_pairing"}
    sendToLocalHub({ action: "enable_pairing" });
  }, [sendToLocalHub]);

  const handleToggleOnlineMode = (enabled: boolean) => {
      setIsOnlineMode(enabled);
      localStorage.setItem('nexus_online_mode', String(enabled));
      
      if (enabled) {
          // CLOUD MODE
          showToast("المزامنة السحابية مفعلة. يمكنك التحكم من أي مكان.", "info");
          // Disconnect Local WS immediately
          if (wsClient.current) {
              wsClient.current.close();
              wsClient.current = null;
          }
      } else {
          // LOCAL MODE
          showToast("وضع التحكم المحلي مفعل. يرجى التأكد من الاتصال بشبكة Nexus.", "success");
          // Disconnect MQTT immediately
          if (mqttClient.current) {
              mqttClient.current.end();
              mqttClient.current = null;
          }
          // Trigger Local Connect (will happen via useEffect, but we can force it)
          setTimeout(connectLocalWebSocket, 100);
      }
  };

  // --- RENDERING LOADING STATE ---
  if (!isDbReady) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden relative" dir="rtl">
          {/* Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
          
          <div className="relative z-10 flex flex-col items-center">
              {/* Spinner */}
              <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 rounded-full border-t-2 border-cyan-500 animate-spin"></div>
                  <div className="absolute inset-3 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
                  {/* Central Icon inside Spinner */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={24} className="text-white fill-white animate-pulse" />
                  </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">جاري الاتصال بالسيرفر</h2>
              <p className="text-gray-500 text-sm font-mono animate-pulse">CONNECTING TO HIVE_MIND...</p>
              
              <button 
                  onClick={() => { setIsOnlineMode(false); setIsDbReady(true); }}
                  className="mt-12 px-8 py-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-cyan-500/30 transition-all backdrop-blur-md text-sm font-bold"
              >
                  تخطي (Offline Mode)
              </button>
          </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white relative">
      <div className={`fixed top-2 right-2 z-[200] flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border transition-all duration-500 ${
          !isConnected ? 'bg-red-500/10 border-red-500/30' :
          isOnlineMode ? 'bg-blue-500/10 border-blue-500/30' : 
          'bg-green-500/10 border-green-500/30'
      }`}>
          <div className={`w-2 h-2 rounded-full ${
              !isConnected ? 'bg-red-500 shadow-[0_0_8px_red]' :
              isOnlineMode ? 'bg-blue-500 shadow-[0_0_8px_blue]' : 
              'bg-green-500 shadow-[0_0_8px_lime]'
          }`}></div>
          <span className={`text-[10px] font-bold ${
              !isConnected ? 'text-red-400' :
              isOnlineMode ? 'text-blue-400' : 
              'text-green-400'
          }`}>
              {!isConnected ? 'غير متصل' : isOnlineMode ? 'سحابي' : 'محلي'}
          </span>
      </div>

      {/* TOAST NOTIFICATION */}
      {toast && (
          <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[300] px-6 py-3 rounded-full backdrop-blur-md border shadow-2xl transition-all duration-300 animate-bounce ${
              toast.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-200' :
              toast.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-200' :
              'bg-blue-500/20 border-blue-500/50 text-blue-200'
          }`}>
              <span className="text-sm font-bold">{toast.message}</span>
          </div>
      )}

      <NexusSimulator 
        devices={devices}
        scenes={scenes}
        wifiSsid="Nexus_Home"
        wifiIp="192.168.4.1"
        maxLoadWatts={6000} 
        isConnected={isConnected}
        onToggleDevice={handleUserToggleDevice}
        onUpdateDeviceParams={handleUpdateDeviceParams}
        onApplyScene={handleApplyScene}
        onSaveScene={handleSaveScene}
        onDeleteScene={handleDeleteScene}
        onSetDeviceTimer={handleSetDeviceTimer} 
        onUpdateDeviceHabits={handleUpdateDeviceHabits}
        onManualDiscoveryTrigger={triggerManualDiscovery}
        onEnablePairing={handleEnablePairing}
        isOnlineMode={isOnlineMode}
        onToggleOnlineMode={handleToggleOnlineMode}
        freeKeyMappings={freeKeyMappings}
        onUpdateFreeKeyMapping={handleUpdateFreeKeyMapping}
        onDeleteFreeKeyMapping={handleDeleteFreeKeyMapping}
        onFreeKeyPress={handleFreeKeyEvent}
        billingStats={billingStats} // NEW
        localHubIp={localHubIp}
        onUpdateLocalHubIp={(ip) => {
            setLocalHubIp(ip);
            localStorage.setItem('nexus_hub_ip', ip);
            // Force reconnect if in local mode
            if (!isOnlineMode) {
                if (wsClient.current) wsClient.current.close();
                // Reconnect will happen automatically via useEffect or we can trigger it
            }
        }}
      />
      
      {provisioningData && (
        <DeviceMappingModal 
            macAddress={provisioningData.mac}
            channels={provisioningData.channels || 1}
            initialType={provisioningData.type}
            existingDevices={devices.filter(d => d.parentId === provisioningData.mac || d.id === provisioningData.mac)}
            onSave={(mappings) => handleProvisioningSave(mappings)}
            onCancel={() => setProvisioningData(null)}
        />
      )}
    </div>
  );
};

export default App;
