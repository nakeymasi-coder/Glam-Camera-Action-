import React, { useState, useEffect } from 'react';
import {
  startVeoVideo,
  pollVeoVideoStatus,
  downloadVeoVideoBlob,
} from '../services/geminiService';
import {
  X,
  Video,
  Upload,
  Download,
  Loader2,
  Sparkles,
  Play,
  Film,
  AlertCircle,
} from 'lucide-react';

interface VeoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string | null;
  initialPrompt?: string;
}

const PROGRESS_STAGES = [
  'Initializing Veo 3 video generation engine...',
  'Analyzing visual composition and depth map...',
  'Synthesizing temporal frame coherence...',
  'Rendering realistic camera motion and lighting...',
  'Finalizing 720p cinematic MP4 stream...',
];

export const VeoVideoModal: React.FC<VeoVideoModalProps> = ({
  isOpen,
  onClose,
  initialImage,
  initialPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [mimeType, setMimeType] = useState('image/png');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (initialImage) setImage(initialImage);
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialImage, initialPrompt]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setStageIndex((prev) => (prev + 1) % PROGRESS_STAGES.length);
      }, 7000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type || 'image/png');
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartGeneration = async () => {
    if (!prompt.trim() && !image) return;
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setStageIndex(0);
    setStatusMessage('Submitting request to Veo 3...');

    try {
      const { operationName } = await startVeoVideo({
        prompt: prompt.trim() || 'A cinematic high quality video of this scene',
        image: image || undefined,
        mimeType: image ? mimeType : undefined,
        aspectRatio,
      });

      // Poll until done
      let done = false;
      let attempts = 0;
      const maxAttempts = 60; // Up to 5 minutes

      while (!done && attempts < maxAttempts) {
        attempts++;
        await new Promise((r) => setTimeout(r, 5000));
        const status = await pollVeoVideoStatus(operationName);

        if (status.error) {
          throw new Error(status.error.message || 'Veo generation returned an error');
        }

        if (status.done) {
          done = true;
          setStatusMessage('Downloading generated video...');
          const videoBlob = await downloadVeoVideoBlob(operationName);
          const localUrl = URL.createObjectURL(videoBlob);
          setVideoUrl(localUrl);
        }
      }

      if (!done) {
        throw new Error('Video generation timed out. Please try again.');
      }
    } catch (err: any) {
      console.error('Veo video error:', err);
      setError(err.message || 'Video generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `veo-scene-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Video studio" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8A5036] flex items-center justify-center text-white">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Veo 3 Video Animator</h2>
              <p className="text-xs text-neutral-400">
                Text-to-Video &amp; Image-to-Video using <code className="font-mono text-neutral-300">veo-3.1-fast-generate-preview</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose} aria-label="Close video studio"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mode Switch / Prompt input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Scene Motion Prompt:
            </label>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Slow cinematic zoom in as the stylist gasps, camera pans smoothly..."
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50"
            />
          </div>

          {/* Controls: Aspect Ratio & Image Upload */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-700">Aspect Ratio:</span>
              <div className="flex items-center gap-1 p-0.5 bg-neutral-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    aspectRatio === '16:9'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  16:9 (Landscape)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    aspectRatio === '9:16'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  9:16 (Portrait / Reels)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 cursor-pointer text-neutral-700 font-medium transition-colors">
                <Upload className="w-3.5 h-3.5 text-neutral-500" />
                <span>{image ? 'Replace Starting Photo' : 'Upload Photo to Animate'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          {/* Attached image preview */}
          {image && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center gap-3">
              <img
                src={image}
                alt="Starting Frame"
                className="w-20 h-14 object-cover rounded-md border border-neutral-300"
              />
              <div className="text-xs">
                <span className="font-semibold text-neutral-900 block">
                  Image-to-Video Animation Active
                </span>
                <span className="text-neutral-500">
                  Veo will use this image as the starting visual frame and animate motion based on your prompt.
                </span>
              </div>
            </div>
          )}

          {/* Loading status box */}
          {isGenerating && (
            <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#8A5036] mx-auto" />
              <h4 className="text-sm font-bold text-neutral-900">
                {PROGRESS_STAGES[stageIndex]}
              </h4>
              <p className="text-xs text-neutral-600 max-w-md mx-auto">
                Veo video generation typically takes 1 to 2 minutes. Please keep this window open while the video renders.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span className="font-semibold">{error}</span>
              </div>
              {(error.includes('credits') || error.includes('billing')) && (
                <a
                  href="https://ai.studio/projects"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-amber-950 font-bold underline pl-6"
                >
                  Manage API Prepayment Credits &amp; Billing
                </a>
              )}
            </div>
          )}

          {/* Completed Video Player */}
          {videoUrl && (
            <div className="space-y-3 pt-2">
              <div className="font-semibold text-xs text-neutral-700 flex items-center justify-between">
                <span>Rendered Scene Video (Veo 3.1):</span>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 text-xs bg-neutral-900 text-white px-3 py-1 rounded font-semibold hover:bg-neutral-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download MP4
                </button>
              </div>

              <div className="rounded-xl overflow-hidden border border-neutral-800 bg-black flex items-center justify-center">
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  className={`max-h-[380px] w-auto ${
                    aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
                  }`}
                />
              </div>
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
            onClick={handleStartGeneration}
            disabled={isGenerating || (!prompt.trim() && !image)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#8A5036] hover:bg-amber-700 disabled:opacity-50 text-xs sm:text-sm font-extrabold text-white transition-colors shadow-xs"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Rendering Video...</span>
              </>
            ) : (
              <>
                <Film className="w-4 h-4 text-white" />
                <span>{image ? 'Animate Image with Veo' : 'Generate Video from Text'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
