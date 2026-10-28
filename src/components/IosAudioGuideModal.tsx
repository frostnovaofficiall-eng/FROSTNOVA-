import React, { useState } from 'react';
import { audioManager } from '../lib/audioManager';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Headphones,
  Gamepad2,
  Volume2,
  Zap,
  Code2,
  X,
  Copy,
  Check,
  Layers,
  Radio,
  FileText
} from 'lucide-react';

interface IosAudioGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IosAudioGuideModal: React.FC<IosAudioGuideModalProps> = ({ isOpen, onClose }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'architecture' | 'roadmap'>('setup');

  const isIos = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

  const handleUnlockSession = async () => {
    const success = await audioManager.unlockAudioSession();
    if (success) {
      setUnlocked(true);
    }
  };

  const copyReplayKitSnippet = () => {
    const snippet = `// iOS ReplayKit Broadcast Upload Extension for KEMOR Game Audio
import ReplayKit
import AVFoundation

class SampleHandler: RPBroadcastSampleHandler {
    private var isStreaming = false

    override func broadcastStarted(withSetupInfo setupInfo: [String : NSObject]?) {
        isStreaming = true
        NSLog("[KEMOR] ReplayKit broadcast started.")
    }

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        guard isStreaming else { return }

        switch sampleBufferType {
        case .audioApp:
            // Intercepts internal Free Fire game sound (footsteps, gunfire)
            guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else { return }
            // Feed PCM audio buffer directly into KEMOR WebRTC Audio Track
        case .audioMic:
            // Microphone audio captured by iOS broadcast
            break
        case .video:
            // 60 FPS gameplay screen frames
            break
        @unknown default:
            break
        }
    }

    override func broadcastFinished() {
        isStreaming = false
    }
}`;
    navigator.clipboard.writeText(snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-[#18191C] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E53935]/10 text-[#E53935] flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-white">
                iPhone & Free Fire Audio System
              </h2>
              <p className="text-xs text-neutral-500">
                Simultaneous game sound & ReplayKit Broadcast Extension guide.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Status Bar */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            isIos
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <Smartphone className="w-4 h-4 text-[#E53935]" />
            <span>{isIos ? 'iPhone / iOS Environment Active' : 'Desktop / Android Platform Active'}</span>
          </div>
          <button
            onClick={handleUnlockSession}
            disabled={unlocked}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              unlocked
                ? 'bg-emerald-600 text-white'
                : 'bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-sm'
            }`}
          >
            {unlocked ? 'Audio Primed ✓' : 'Unlock Audio Session'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-neutral-100 dark:border-neutral-800 pb-2">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'setup'
                ? 'bg-[#E53935] text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Free Fire Setup
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'architecture'
                ? 'bg-[#E53935] text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            ReplayKit Extension
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'roadmap'
                ? 'bg-[#E53935] text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Beginner Roadmap
          </button>
        </div>

        {/* TAB 1: Free Fire In-Game Audio Setup */}
        {activeTab === 'setup' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Why Free Fire Cuts Voice on iPhone:
              </p>
              <p className="leading-relaxed">
                On iOS, when Free Fire requests microphone access, it seizes exclusive control of Apple's audio hardware (`AVAudioSessionCategoryPlayAndRecord`), which silences web and background voice apps.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#E53935] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-bold text-neutral-900 dark:text-neutral-100">
                    Turn OFF In-Game Mic inside Free Fire
                  </p>
                  <p className="text-neutral-500 mt-0.5 leading-relaxed">
                    Open Free Fire &rarr; <strong>Settings &rarr; Sound &rarr; Voice &rarr; Turn Mic OFF</strong> (keep Game Sound & SFX ON).
                    This releases the iOS microphone lock to KEMOR while preserving in-game footsteps and gunfire.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#E53935] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-bold text-neutral-900 dark:text-neutral-100">
                    Connect Headset (Wired or Bluetooth)
                  </p>
                  <p className="text-neutral-500 mt-0.5 leading-relaxed">
                    Use wired Lightning / USB-C earphones for lowest latency, or AirPods with AAC. iOS will naturally mix the Free Fire sound effects with KEMOR squad voice into both earcups.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#E53935] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-bold text-neutral-900 dark:text-neutral-100">
                    Add KEMOR to Home Screen (PWA Mode)
                  </p>
                  <p className="text-neutral-500 mt-0.5 leading-relaxed">
                    In Safari, tap <strong>Share &rarr; Add to Home Screen</strong>. This enables persistent audio session backgrounding and full safe-area notch integration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ReplayKit Broadcast Extension Specification */}
        {activeTab === 'architecture' && (
          <div className="space-y-3 animate-in fade-in text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 space-y-1.5">
              <p className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#E53935]" />
                How ReplayKit Intercepts Game Audio
              </p>
              <p className="text-neutral-500 leading-relaxed">
                When a user starts broadcasting from the iOS Control Center, iOS runs an isolated <strong>Broadcast Upload Extension</strong> (`RPBroadcastSampleHandler`) that delivers linear PCM audio buffers:
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-600 dark:text-neutral-300">
                <li><code className="text-[#E53935]">.audioApp</code>: Captures the raw Free Fire game audio.</li>
                <li><code className="text-[#E53935]">.video</code>: Captures 60 FPS gameplay video frames.</li>
                <li><code className="text-[#E53935]">.audioMic</code>: Captures player microphone voice.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-[#E53935]" />
                  SampleHandler.swift Template
                </span>
                <button
                  onClick={copyReplayKitSnippet}
                  className="text-[11px] font-bold text-[#E53935] hover:underline flex items-center gap-1"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copied' : 'Copy Swift Code'}
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-200 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-48">
{`import ReplayKit

class SampleHandler: RPBroadcastSampleHandler {
    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        switch sampleBufferType {
        case .audioApp:
            // Extract raw PCM game sound and pipe to WebRTC audio track
            KemorAudioBridge.shared.sendGameAudio(sampleBuffer)
        case .video:
            // 60 FPS video stream
            break
        @unknown default:
            break
        }
    }
}`}
              </pre>
            </div>

            <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400">
              <strong>Xcode Requirements:</strong> App Group capability (<code className="text-[#E53935]">group.com.kemor.app</code>) shared between main app and extension target. Full documentation saved to <code className="text-[#E53935]">docs/ios-replaykit-architecture.md</code>.
            </div>
          </div>
        )}

        {/* TAB 3: Beginner Roadmap (iPhone & AI Studio) */}
        {activeTab === 'roadmap' && (
          <div className="space-y-3 animate-in fade-in text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
              <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#E53935]" />
                Practical Steps for a Beginner
              </h3>
              <p className="text-neutral-500 leading-relaxed">
                Because Google AI Studio operates in a Linux cloud environment and you are testing on an iPhone:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-neutral-600 dark:text-neutral-300">
                <li>
                  <strong>Step 1 (Web / Immediate):</strong> Use KEMOR directly from Safari / PWA. Apply the in-game mic toggle in Free Fire. You and your squad can talk with low-latency WebRTC and hear in-game footsteps simultaneously.
                </li>
                <li>
                  <strong>Step 2 (Wrap with Capacitor):</strong> Run <code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">npx cap add ios</code> to create the Xcode workspace around this exact KEMOR web frontend.
                </li>
                <li>
                  <strong>Step 3 (Build Extension in Xcode):</strong> On any Mac (or via free GitHub Actions macOS runner), open the project in Xcode, add the <em>Broadcast Upload Extension</em> target, and paste the provided <code className="text-[#E53935]">SampleHandler.swift</code>.
                </li>
                <li>
                  <strong>Step 4 (Deploy to iPhone):</strong> Deploy via Apple TestFlight or connect your iPhone with a free personal Apple ID in Xcode.
                </li>
              </ol>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:opacity-90 transition-opacity"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
