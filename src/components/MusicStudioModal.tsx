import React, { useState } from 'react';
import { generateMusicTrack } from '../services/geminiService';
import {
  X,
  Music,
  Play,
  Pause,
  Download,
  Loader2,
  Sparkles,
  Volume2,
} from 'lucide-react';

interface MusicStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPrompt?: string;
}

export const MusicStudioModal: React.FC<MusicStudioModalProps> = ({
  isOpen,
  onClose,
  defaultPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(
    defaultPrompt || 'Cinematic lighthearted acoustic comedy track with quirky marimba and bassline, 30s'
  );
  const [model, setModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>(
    'lyria-3-clip-preview'
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    setLyrics(null);

    try {
      const res = await generateMusicTrack({
        prompt: prompt.trim(),
        model,
      });

      setAudioUrl(res.audioUrl);
      if (res.lyrics) setLyrics(res.lyrics);
    } catch (err: any) {
      console.error('Lyria error:', err);
      setError(err.message || 'Music generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `scene-score-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Music studio" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C99C62] flex items-center justify-center text-black">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Lyria Scene Score &amp; Music</h2>
              <p className="text-xs text-neutral-400">
                Powered by Google Lyria (<code className="font-mono text-neutral-300">lyria-3-clip-preview</code>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose} aria-label="Close music studio"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Music Style &amp; Mood Prompt:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Upbeat lo-fi jazz soundtrack with acoustic piano, 30s background score..."
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50"
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-neutral-700">Generation Model:</span>
            <div className="flex items-center gap-1 p-0.5 bg-neutral-100 rounded-lg">
              <button
                type="button"
                onClick={() => setModel('lyria-3-clip-preview')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  model === 'lyria-3-clip-preview'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Lyria Clip (Short clip up to 30s)
              </button>
              <button
                type="button"
                onClick={() => setModel('lyria-3-pro-preview')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  model === 'lyria-3-pro-preview'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Lyria Pro (Full Track)
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {audioUrl && (
            <div className="p-4 rounded-xl border border-neutral-300 bg-neutral-50/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-900">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#8A5036]" />
                  <span>Generated Soundtrack Ready:</span>
                </div>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-black underline"
                >
                  <Download className="w-3.5 h-3.5" /> Download .WAV
                </button>
              </div>

              <audio src={audioUrl} controls className="w-full" autoPlay />

              {lyrics && (
                <div className="pt-2 border-t border-neutral-200 text-xs text-neutral-600">
                  <span className="font-semibold block text-neutral-800 mb-1">Lyrics:</span>
                  <p className="whitespace-pre-wrap font-mono text-[11px] bg-white p-2 rounded border border-neutral-200">
                    {lyrics}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Close
          </button>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#C99C62] hover:bg-[#B98A4D] disabled:opacity-50 text-xs sm:text-sm font-extrabold text-neutral-950 transition-colors shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Composing with Lyria...</span>
              </>
            ) : (
              <>
                <Music className="w-4 h-4 text-black" />
                <span>Generate Music Track</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
