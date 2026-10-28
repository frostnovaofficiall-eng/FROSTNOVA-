import { AudioSettings } from '../types';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  inputVolume: 100,
  outputVolume: 100,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  pushToTalk: false,
  pushToTalkKey: 'Space',
};

class AudioManager {
  private audioCtx: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private loopbackGain: GainNode | null = null;
  private isTestingMic = false;
  private isUnlocked = false;

  public getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    return this.audioCtx;
  }

  // iOS Safari audio unlock
  public async unlockAudioSession(): Promise<boolean> {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Play short silent buffer to prime iOS AVAudioSession
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      this.isUnlocked = true;
      return true;
    } catch (e) {
      console.warn('Audio unlock warning:', e);
      return false;
    }
  }

  public async getAvailableDevices(): Promise<{ inputs: MediaDeviceInfo[]; outputs: MediaDeviceInfo[] }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return { inputs: [], outputs: [] };
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      return { inputs, outputs };
    } catch (err) {
      console.warn('enumerateDevices error:', err);
      return { inputs: [], outputs: [] };
    }
  }

  public async acquireMicrophoneStream(settings: AudioSettings): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: settings.inputDeviceId !== 'default' ? { exact: settings.inputDeviceId } : undefined,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
        channelCount: 1,
        sampleRate: 48000,
      },
      video: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.localStream = stream;
    this.setupSpeakingAnalyser(stream);
    return stream;
  }

  private setupSpeakingAnalyser(stream: MediaStream) {
    try {
      const ctx = this.getAudioContext();
      if (this.microphoneSource) {
        this.microphoneSource.disconnect();
      }
      this.microphoneSource = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.microphoneSource.connect(this.analyser);
    } catch (err) {
      console.warn('Failed to setup speaking analyser:', err);
    }
  }

  public getSpeakingLevel(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    // Normalized 0 to 100
    return Math.min(100, Math.round((average / 255) * 200));
  }

  public startMicTest(onLevelUpdate: (level: number) => void): () => void {
    let animId: number;
    let running = true;

    const loop = () => {
      if (!running) return;
      const level = this.getSpeakingLevel();
      onLevelUpdate(level);
      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }

  public toggleMicLoopback(enable: boolean) {
    const ctx = this.getAudioContext();
    if (enable) {
      if (this.microphoneSource && !this.loopbackGain) {
        this.loopbackGain = ctx.createGain();
        this.loopbackGain.gain.value = 0.8;
        this.microphoneSource.connect(this.loopbackGain);
        this.loopbackGain.connect(ctx.destination);
      }
    } else {
      if (this.loopbackGain) {
        this.loopbackGain.disconnect();
        this.loopbackGain = null;
      }
    }
  }

  public async setAudioOutputDevice(element: HTMLMediaElement, deviceId: string): Promise<boolean> {
    try {
      if (typeof (element as any).setSinkId === 'function') {
        await (element as any).setSinkId(deviceId === 'default' ? '' : deviceId);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('setSinkId failed or not supported:', e);
      return false;
    }
  }

  public stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.loopbackGain) {
      this.loopbackGain.disconnect();
      this.loopbackGain = null;
    }
  }
}

export const audioManager = new AudioManager();
