import React, { useState, useEffect } from 'react';
import { AudioSettings } from '../types';
import { audioManager } from '../lib/audioManager';
import {
  Mic,
  MicOff,
  Volume2,
  Sliders,
  Radio,
  Check,
  X,
  RefreshCw,
  Headphones,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  onUpdateSettings: (newSettings: AudioSettings) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<AudioSettings>(settings);
  const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [isLoopbackActive, setIsLoopbackActive] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!isOpen) {
      if (isLoopbackActive) {
        audioManager.toggleMicLoopback(false);
        setIsLoopbackActive(false);
      }
      return;
    }

    // Refresh devices
    refreshDevices();

    // Start VU meter
    const stopMeter = audioManager.startMicTest((level) => {
      setMicLevel(level);
    });

    const handleDeviceChange = () => {
      refreshDevices();
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      stopMeter();
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
      audioManager.toggleMicLoopback(false);
    };
  }, [isOpen]);

  const refreshDevices = async () => {
    const devs = await audioManager.getAvailableDevices();
    setInputs(devs.inputs);
    setOutputs(devs.outputs);
  };

  const handleLoopbackToggle = () => {
    const next = !isLoopbackActive;
    setIsLoopbackActive(next);
    audioManager.toggleMicLoopback(next);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#18191C] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E53935]/10 text-[#E53935] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-white">Voice & Audio Settings</h2>
              <p className="text-xs text-neutral-500">Fine-tune hardware, noise suppression, and speaker routing.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Mic Test Meter */}
        <div className="bg-neutral-50 dark:bg-neutral-900/70 rounded-xl p-4 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#E53935]" />
              Mic Input Level (VU Meter)
            </span>
            <button
              onClick={handleLoopbackToggle}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                isLoopbackActive
                  ? 'bg-[#E53935] text-white'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300'
              }`}
            >
              {isLoopbackActive ? 'Mute Loopback' : 'Hear Yourself'}
            </button>
          </div>

          {/* Level Bar */}
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                micLevel > 60 ? 'bg-amber-500' : micLevel > 15 ? 'bg-[#E53935]' : 'bg-neutral-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, micLevel))}%` }}
            />
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Speak into your headset microphone. The red indicator shows detected voice activity.
          </p>
        </div>

        {/* Device Selectors */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-800 dark:text-neutral-200 mb-1.5 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-neutral-500" />
              Input Device (Microphone)
            </label>
            <select
              value={localSettings.inputDeviceId}
              onChange={(e) => setLocalSettings({ ...localSettings, inputDeviceId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#E53935]"
            >
              <option value="default">Default System Microphone</option>
              {inputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-neutral-800 dark:text-neutral-200 mb-1.5 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-neutral-500" />
              Output Device (Headphones / Speakers)
            </label>
            <select
              value={localSettings.outputDeviceId}
              onChange={(e) => setLocalSettings({ ...localSettings, outputDeviceId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#E53935]"
            >
              <option value="default">Default Headset / Speakers</option>
              {outputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Speaker ${d.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real WebRTC DSP Processing Toggles */}
        <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Voice Processing & Quality
          </h3>

          {/* Echo Cancellation */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 cursor-pointer">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Echo Cancellation</p>
              <p className="text-[11px] text-neutral-500">Prevents teammate voices from leaking through your speakers.</p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.echoCancellation}
              onChange={(e) => setLocalSettings({ ...localSettings, echoCancellation: e.target.checked })}
              className="w-4 h-4 accent-[#E53935]"
            />
          </label>

          {/* Noise Suppression */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 cursor-pointer">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Noise Suppression</p>
              <p className="text-[11px] text-neutral-500">Filters mechanical keyboards, PC fans, and ambient noise.</p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.noiseSuppression}
              onChange={(e) => setLocalSettings({ ...localSettings, noiseSuppression: e.target.checked })}
              className="w-4 h-4 accent-[#E53935]"
            />
          </label>

          {/* Auto Gain */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 cursor-pointer">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Automatic Gain Control (AGC)</p>
              <p className="text-[11px] text-neutral-500">Normalizes whispers and shouting to equal squad loudness.</p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.autoGainControl}
              onChange={(e) => setLocalSettings({ ...localSettings, autoGainControl: e.target.checked })}
              className="w-4 h-4 accent-[#E53935]"
            />
          </label>
        </div>

        {/* Master Output Volume */}
        <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-neutral-500" />
              Master Voice Volume
            </span>
            <span className="font-mono text-neutral-500">{localSettings.outputVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={localSettings.outputVolume}
            onChange={(e) => setLocalSettings({ ...localSettings, outputVolume: Number(e.target.value) })}
            className="w-full accent-[#E53935]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-bold shadow-md shadow-[#E53935]/25 transition-all"
          >
            <Check className="w-4 h-4" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
