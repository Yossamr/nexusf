
import React, { useState } from 'react';
import { FreeKeyMapping, Device, Scene, FreeKeyActionType } from '../types';
import { Plus, Trash2, Play, Settings2, Fingerprint, ChevronRight, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SmartKeysPageProps {
  mappings: FreeKeyMapping[];
  devices: Device[];
  scenes: Scene[];
  onSave: (mapping: FreeKeyMapping) => void;
  onDelete: (id: string) => void;
  onSimulate: (mac: string, keyNumber: number) => void;
}

const SmartKeysPage: React.FC<SmartKeysPageProps> = ({
  mappings,
  devices,
  scenes,
  onSave,
  onDelete,
  onSimulate
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<FreeKeyMapping>>({
    mac: '',
    keyNumber: 1,
    label: '',
    action: { type: 'TOGGLE_DEVICE' }
  });

  const handleStartAdd = () => {
    setFormData({
      mac: '',
      keyNumber: 1,
      label: '',
      action: { type: 'TOGGLE_DEVICE' }
    });
    setIsAdding(true);
  };

  const handleStartEdit = (mapping: FreeKeyMapping) => {
    setFormData(mapping);
    setEditingId(mapping.id);
  };

  const handleSave = () => {
    if (!formData.mac || !formData.keyNumber) return;
    
    const mapping: FreeKeyMapping = {
      id: formData.id || `${formData.mac}_${formData.keyNumber}`,
      mac: formData.mac,
      keyNumber: formData.keyNumber,
      label: formData.label || `مفتاح ${formData.keyNumber}`,
      action: formData.action as any
    };

    onSave(mapping);
    setIsAdding(false);
    setEditingId(null);
  };

  const renderActionConfig = () => {
    if (!formData.action) return null;

    return (
      <div className="space-y-4 mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
        <div>
          <label className="block text-xs text-gray-400 mb-1">نوع الأكشن</label>
          <select
            value={formData.action.type}
            onChange={(e) => setFormData({
              ...formData,
              action: { ...formData.action!, type: e.target.value as FreeKeyActionType }
            })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none"
          >
            <option value="TOGGLE_DEVICE">تبديل حالة جهاز (Toggle)</option>
            <option value="ACTIVATE_SCENE">تفعيل مشهد (Scene)</option>
          </select>
        </div>

        {formData.action.type === 'TOGGLE_DEVICE' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">الجهاز المستهدف</label>
            <select
              value={formData.action.targetDeviceId || ''}
              onChange={(e) => setFormData({
                ...formData,
                action: { ...formData.action!, targetDeviceId: e.target.value }
              })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none"
            >
              <option value="">اختر جهاز...</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.room})</option>
              ))}
            </select>
          </div>
        )}

        {formData.action.type === 'ACTIVATE_SCENE' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">المشهد المستهدف</label>
            <select
              value={formData.action.targetSceneId || ''}
              onChange={(e) => setFormData({
                ...formData,
                action: { ...formData.action!, targetSceneId: e.target.value }
              })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none"
            >
              <option value="">اختر مشهد...</option>
              {scenes.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-black/20" dir="rtl">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Fingerprint className="text-cyan-400" size={24} />
            المفاتيح الذكية (Free Keys)
          </h2>
          <p className="text-xs text-gray-500 mt-1">ربط مفاتيح الحائط الحرة بأوامر ذكية</p>
        </div>
        <button
          onClick={handleStartAdd}
          className="p-2 bg-cyan-500/20 text-cyan-400 rounded-full hover:bg-cyan-500/30 transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {mappings.length === 0 && !isAdding && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Settings2 className="text-gray-600" size={32} />
              </div>
              <p className="text-gray-400 text-sm">لا توجد مفاتيح مبرمجة حالياً</p>
              <button
                onClick={handleStartAdd}
                className="mt-4 text-cyan-400 text-sm font-bold"
              >
                إضافة مفتاح جديد
              </button>
            </motion.div>
          )}

          {mappings.map((mapping) => (
            <motion.div
              key={mapping.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel rounded-2xl p-4 relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <Fingerprint size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{mapping.label}</h3>
                    <p className="text-[10px] font-mono text-gray-500 uppercase">
                      MAC: {mapping.mac} | KEY: {mapping.keyNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSimulate(mapping.mac, mapping.keyNumber)}
                    className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                    title="تجربة"
                  >
                    <Play size={18} />
                  </button>
                  <button
                    onClick={() => handleStartEdit(mapping)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Settings2 size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(mapping.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs">
                <span className="text-gray-500">الأكشن:</span>
                <span className="text-cyan-400 font-medium">
                  {mapping.action.type === 'TOGGLE_DEVICE' ? 'تبديل حالة جهاز' : 'تفعيل مشهد'}
                </span>
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-white">
                  {mapping.action.type === 'TOGGLE_DEVICE' 
                    ? (devices.find(d => d.id === mapping.action.targetDeviceId)?.name || 'جهاز غير معروف')
                    : (scenes.find(s => s.id === mapping.action.targetSceneId)?.name || 'مشهد غير معروف')
                  }
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add/Edit Modal Overlay */}
      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-md bg-[#151515] rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">
                    {editingId ? 'تعديل مفتاح' : 'إضافة مفتاح جديد'}
                  </h3>
                  <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-500">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">اسم المفتاح (مثلاً: مفتاح السرير)</label>
                    <input
                      type="text"
                      value={formData.label || ''}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="أدخل اسماً للمفتاح"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">MAC Address</label>
                      <input
                        type="text"
                        value={formData.mac || ''}
                        onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
                        placeholder="AA:BB:CC..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">رقم المفتاح</label>
                      <input
                        type="number"
                        value={formData.keyNumber || 1}
                        onChange={(e) => setFormData({ ...formData, keyNumber: parseInt(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>

                  {renderActionConfig()}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-cyan-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors"
                  >
                    <Save size={20} />
                    حفظ الإعدادات
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartKeysPage;
