import React, { useState, useCallback, useMemo } from 'react';
import { NexusSimulatorProps, Scene } from '../types';
import Dashboard from './Dashboard';
import StatsPage from './StatsPage';
import ScenesPage from './ScenesPage';
import AutomationsPage from './AutomationsPage'; // NEW
import BootSequence from './BootSequence';
import DeviceModal from './DeviceModal';
import SettingsModal from './SettingsModal';
import TimerModal from './TimerModal';
import SceneEditorModal from './SceneEditorModal';
import VoiceAssistant from './VoiceAssistant';
import { Home, BarChart2, Grid, Wifi, WifiOff, Settings, Workflow } from 'lucide-react'; // Added Workflow
import { isRelayDevice } from '../utils/deviceHelpers'; // Import helper

const NexusSimulator: React.FC<NexusSimulatorProps> = ({
  devices,
  scenes,
  isConnected,
  onToggleDevice,
  onUpdateDeviceParams,
  onApplyScene,
  onSaveScene,
  onDeleteScene,
  onSetDeviceTimer, 
  onUpdateDeviceHabits,
  onEnablePairing,
  isOnlineMode,
  onToggleOnlineMode,
  freeKeyMappings,
  onUpdateFreeKeyMapping,
  onDeleteFreeKeyMapping,
  onFreeKeyPress,
  billingStats, // NEW
  localHubIp,
  onUpdateLocalHubIp
}) => {
  const [booting, setBooting] = useState(true);
  const [activePage, setActivePage] = useState<0 | 1 | 2 | 3>(1); // Added 3
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [timerDeviceId, setTimerDeviceId] = useState<string | null>(null); 
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'scenes'>('general');
  
  // Scene Editing State
  const [editingScene, setEditingScene] = useState<Scene | null | 'NEW'>(null);

  // Filter Relays for Dashboard and Stats
  const relayDevices = useMemo(() => devices.filter(d => isRelayDevice(d.type)), [devices]);

  // --- DYNAMIC AMBIANCE LOGIC ---
  const ambientColor = useMemo(() => {
    // Priority: Fire/Heat > AC/Cool > TV/Media > Lights > Default
    const heaterOn = devices.some(d => d.type === 'heater' && d.isOn) || devices.some(d => d.type === 'ac' && d.isOn && d.params?.mode === 'heat');
    if (heaterOn) return 'from-orange-900/40 via-black to-black';

    const acOn = devices.some(d => d.type === 'ac' && d.isOn && d.params?.mode === 'cool');
    const fanOn = devices.some(d => d.type === 'fan' && d.isOn);
    if (acOn || fanOn) return 'from-cyan-900/40 via-black to-black';

    const tvOn = devices.some(d => d.type === 'tv' && d.isOn);
    if (tvOn) return 'from-purple-900/40 via-black to-black';

    const anyLight = devices.some(d => d.type === 'light' && d.isOn);
    if (anyLight) return 'from-yellow-900/20 via-black to-black';

    return 'from-blue-900/20 via-black to-black'; // Default Idle
  }, [devices]);

  const handleBootComplete = useCallback(() => {
    setBooting(false);
  }, []);

  const handleDeviceClick = useCallback((id: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setSelectedDeviceId(id);
  }, []);

  const handleDeviceLongPress = useCallback((id: string) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setTimerDeviceId(id);
  }, []);

  const handleApplySceneWrapper = useCallback((sceneId: string) => {
    if (navigator.vibrate) navigator.vibrate(20);
    onApplyScene(sceneId);
  }, [onApplyScene]);

  // Opens Editor for New Scene
  const handleAddSceneClick = useCallback(() => {
    setEditingScene('NEW');
  }, []);

  // Opens Editor for Existing Scene
  const handleEditSceneClick = useCallback((scene: Scene) => {
    setEditingScene(scene);
  }, []);

  const openSettingsGeneral = useCallback(() => {
    setSettingsTab('general');
    setShowSettings(true);
  }, []);

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);
  const timerDevice = devices.find(d => d.id === timerDeviceId);

  if (booting) {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  return (
    <div className="w-full h-full relative flex flex-col font-sans overflow-hidden select-none" dir="rtl">
      
      {/* DYNAMIC BACKGROUND LAYER */}
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_var(--tw-gradient-stops))] ${ambientColor} transition-colors duration-[2000ms] z-0`}></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] z-0 pointer-events-none"></div>

      <VoiceAssistant 
        devices={relayDevices} // Pass only relays? Or all? Voice might want to control scenes too.
        scenes={scenes}
        onToggleDevice={onToggleDevice}
        onApplyScene={handleApplySceneWrapper}
        onUpdateDeviceParams={onUpdateDeviceParams}
      />

      {/* HEADER */}
      <header className="z-20 pt-10 pb-4 px-6 flex items-start justify-between shrink-0">
         <div>
             {/* The Greeting is now handled inside Dashboard or just simplified here */}
             <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-mono text-green-500 tracking-widest uppercase">Nexus Online</span>
             </div>
             <h1 className="text-2xl font-black text-white tracking-tight">لوحة التحكم</h1>
         </div>

         <div className="flex items-center gap-3">
             <div className={`
                flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-md border transition-all duration-500
                ${isConnected ? 'bg-black/20 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}
             `}>
                {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
             </div>

             <button 
               onClick={openSettingsGeneral}
               className="w-11 h-11 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-white/20 hover:border-white/20 transition-all active:scale-95 shadow-lg"
             >
                <Settings size={20} />
             </button>
         </div>
      </header>

      <main className="flex-1 relative z-10 overflow-hidden flex flex-col px-4 pb-32">
         {activePage === 0 && (
            <ScenesPage 
              scenes={scenes} 
              onApply={handleApplySceneWrapper} 
              onAdd={handleAddSceneClick}
              onEdit={handleEditSceneClick}
            />
         )}
         {activePage === 1 && (
            <Dashboard 
                devices={relayDevices} // ONLY RELAYS
                billingStats={billingStats}
                onToggle={onToggleDevice} 
                onLongPress={handleDeviceLongPress}
                onDeviceClick={handleDeviceClick}
                onFreeKeyPress={onFreeKeyPress}
            />
         )}
         {activePage === 2 && (
            <StatsPage 
              devices={relayDevices} // ONLY RELAYS (Consumers)
            />
         )}
         {activePage === 3 && (
            <AutomationsPage 
              freeKeyMappings={freeKeyMappings}
              devices={relayDevices} // Targets for automation
              scenes={scenes}
              onUpdateMapping={onUpdateFreeKeyMapping}
              onDeleteMapping={onDeleteFreeKeyMapping}
            />
         )}
      </main>

      <div className="fixed bottom-8 left-0 w-full z-40 flex justify-center pointer-events-none">
         <div className="glass-panel px-6 py-4 rounded-[2.5rem] flex items-center gap-6 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform transition-transform hover:scale-105 border border-white/10 bg-black/60 backdrop-blur-xl">
            <NavButton active={activePage === 0} onClick={() => setActivePage(0)} icon={Grid} label="أوضاع" />
            <div className="w-[1px] h-8 bg-white/10"></div>
            <NavButton active={activePage === 1} onClick={() => setActivePage(1)} icon={Home} label="الرئيسية" />
            <div className="w-[1px] h-8 bg-white/10"></div>
            <NavButton active={activePage === 2} onClick={() => setActivePage(2)} icon={BarChart2} label="استهلاك" />
            <div className="w-[1px] h-8 bg-white/10"></div>
            <NavButton active={activePage === 3} onClick={() => setActivePage(3)} icon={Workflow} label="أتمتة" />
         </div>
      </div>

      {/* --- MODALS --- */}
      {selectedDeviceId && selectedDevice && (
        <DeviceModal 
          device={selectedDevice} 
          onClose={() => setSelectedDeviceId(null)} 
          onToggle={onToggleDevice}
          onUpdateParams={onUpdateDeviceParams}
        />
      )}

      {timerDeviceId && timerDevice && (
        <TimerModal
          device={timerDevice}
          onClose={() => setTimerDeviceId(null)}
          onSetTimer={onSetDeviceTimer}
        />
      )}

      {showSettings && (
        <SettingsModal 
          scenes={scenes}
          devices={devices}
          onClose={() => setShowSettings(false)}
          onAddSceneClick={() => {
              setShowSettings(false);
              handleAddSceneClick();
          }}
          onSaveScene={onSaveScene}
          onDeleteScene={onDeleteScene}
          onUpdateDeviceHabits={onUpdateDeviceHabits}
          onEnablePairing={onEnablePairing}
          isOnlineMode={isOnlineMode}
          onToggleOnlineMode={onToggleOnlineMode}
          isConnected={isConnected}
          initialTab={settingsTab}
          freeKeyMappings={freeKeyMappings}
          onUpdateFreeKeyMapping={onUpdateFreeKeyMapping}
          onDeleteFreeKeyMapping={onDeleteFreeKeyMapping}
          localHubIp={localHubIp}
          onUpdateLocalHubIp={onUpdateLocalHubIp}
        />
      )}

      {editingScene && (
        <SceneEditorModal
            scene={editingScene === 'NEW' ? undefined : editingScene}
            devices={relayDevices} // Only show relays in scene editor? Or all? Usually relays.
            onClose={() => setEditingScene(null)}
            onSave={onSaveScene}
        />
      )}

    </div>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-cyan-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
    >
       <div className={`p-2 rounded-full transition-all ${active ? 'bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent'}`}>
         <Icon size={24} strokeWidth={active ? 2.5 : 2} />
       </div>
       <span className={`text-[10px] font-bold ${active ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{label}</span>
    </button>
);

export default NexusSimulator;
