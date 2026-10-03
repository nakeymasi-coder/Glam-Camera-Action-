import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, Radio, PhoneOff } from 'lucide-react';

interface LiveVoiceDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceDirectorModal: React.FC<LiveVoiceDirectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [status, setStatus] = useState<string>('Ready to connect');
  const [transcript, setTranscript] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, []);

  if (!isOpen) return null;

  const handleConnect = async () => {
    try {
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      audioContextRef.current = audioCtx;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;

      setStatus('Connecting to Gemini 3.8 Live session...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setStatus('Connected! Speak to your AI Story Director in real-time.');
        setTranscript((prev) => [
          ...prev,
          'System: Live session connected to gemini-3.8-live. Speak into your microphone.',
        ]);

        // Start processing mic input
        const micSource = audioCtx.createMediaStreamSource(stream);
        const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);

        const pcmToBase64 = (data: Float32Array) => {
          const pcmData = new Int16Array(data.length);
          for (let i = 0; i < data.length; i++) {
            const s = Math.max(-1, Math.min(1, data[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          let binary = '';
          const bytes = new Uint8Array(pcmData.buffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return btoa(binary);
        };

        scriptProcessor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const base64Audio = pcmToBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: base64Audio }));
        };

        micSource.connect(scriptProcessor);
        scriptProcessor.connect(audioCtx.destination);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            playPcmChunk(msg.audio, audioCtx);
            setIsTalking(true);
            setTimeout(() => setIsTalking(false), 800);
          }
        } catch (e) {
          console.error('Error handling live message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setStatus('Connection error. Please try again.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatus('Live session disconnected.');
      };
    } catch (err: any) {
      console.error(err);
      setStatus(`Failed: ${err.message || 'Microphone or connection failed'}`);
    }
  };

  const playPcmChunk = (base64Audio: string, audioCtx: AudioContext) => {
    try {
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (e) {
      console.error('Error decoding audio chunk:', e);
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setStatus('Ready to connect');
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Live voice" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold">Live Voice Director</h2>
              <p className="text-xs text-neutral-400">
                Real-time voice conversation via <code className="font-mono text-neutral-300">gemini-3.8-live</code>
              </p>
            </div>
          </div>
          <button
            aria-label="Close live voice"
            onClick={() => {
              handleDisconnect();
              onClose();
            }}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center space-y-6 text-center">
          {/* Visual Indicator Ring */}
          <div className="relative">
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${
                isConnected
                  ? isTalking
                    ? 'bg-amber-500 shadow-lg shadow-amber-200 scale-105'
                    : 'bg-[#C99C62] shadow-md shadow-amber-200'
                  : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              {isConnected ? (
                isTalking ? (
                  <Volume2 className="w-12 h-12 text-white animate-bounce" />
                ) : (
                  <Mic className="w-12 h-12 text-black" />
                )
              ) : (
                <MicOff className="w-12 h-12 text-neutral-400" />
              )}
            </div>

            {isConnected && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {isConnected
                ? isTalking
                  ? 'Director is speaking...'
                  : 'Listening... talk naturally'
                : 'Interactive Voice Director'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">{status}</p>
          </div>

          {/* Transcript / Event Log */}
          {transcript.length > 0 && (
            <div className="w-full max-h-36 overflow-y-auto bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-left text-xs space-y-1 font-mono">
              {transcript.slice(-6).map((line, idx) => (
                <p key={idx} className="text-neutral-700 leading-tight">
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Connect / Disconnect Action */}
          <div>
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
              >
                <PhoneOff className="w-4 h-4" /> End Live Session
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
              >
                <Mic className="w-4 h-4 text-[#C99C62]" /> Start Voice Conversation
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 text-center text-[11px] text-neutral-500">
          Uses ultra-low latency WebSocket streaming to Gemini 3.8 Live API.
        </div>
      </div>
    </div>
  );
};
