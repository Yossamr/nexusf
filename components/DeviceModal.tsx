import React from 'react';
import { Device } from '../types';
import { X } from 'lucide-react';
import ACRemote from './ACRemote';
import SimpleRemote from './SimpleRemote';

interface DeviceModalProps {
  device: Device;
  onClose: () => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string, params: any) => void;
}

const DeviceModal: React.FC<DeviceModalProps> = ({ device, onClose, onToggle, onUpdate }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" dir="rtl">
      
      {/* Clean Card Container */}
      <div 
        className="relative w-full max-w-md bg-[#121215] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Simple Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#1a1a20]">
           <h3 className="text-xl font-bold text-white tracking-wide">{device.name}</h3>
           <button 
             onClick={onClose}
             className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
           >
             <X size={22} />
           </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-[#0e0e12]">
             {device.type === 'ac' ? (
               <ACRemote 
                 device={device} 
                 onToggle={() => onToggle(device.id)} 
                 onUpdate={(params) => onUpdate(device.id, params)} 
               />
             ) : (
               <SimpleRemote 
                 device={device} 
                 onToggle={() => onToggle(device.id)}
                 onUpdate={(params) => onUpdate(device.id, params)}
               />
             )}
        </div>

      </div>
    </div>
  );
};

export default DeviceModal;