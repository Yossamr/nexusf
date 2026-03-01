import React from 'react';
import { Device, Scene, FreeKeyMapping } from '../types';
import SmartKeysManager from './SmartKeysManager';
import { Workflow } from 'lucide-react';

interface AutomationsPageProps {
  freeKeyMappings: FreeKeyMapping[];
  devices: Device[];
  scenes: Scene[];
  onUpdateMapping: (mapping: FreeKeyMapping) => void;
  onDeleteMapping: (id: string) => void;
}

const AutomationsPage: React.FC<AutomationsPageProps> = ({
  freeKeyMappings,
  devices,
  scenes,
  onUpdateMapping,
  onDeleteMapping
}) => {
  return (
    <div className="flex-1 h-full overflow-y-auto pb-32 custom-scrollbar p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <Workflow className="text-cyan-400" size={32} />
          الأتمتة والتحكم (Automations)
        </h2>
        <p className="text-gray-400 mt-2 text-sm">
          قم بتعيين وظائف للمفاتيح الحرة (Free Keys) للتحكم في الأجهزة أو تفعيل الأوضاع.
        </p>
      </div>

      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl">
        <SmartKeysManager 
          mappings={freeKeyMappings}
          devices={devices}
          scenes={scenes}
          onUpdateMapping={onUpdateMapping}
          onDeleteMapping={onDeleteMapping}
        />
      </div>
    </div>
  );
};

export default AutomationsPage;
