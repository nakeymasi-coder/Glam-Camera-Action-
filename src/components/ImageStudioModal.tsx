import React, { useState } from 'react';
import { generateOrEditImage } from '../services/geminiService';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Download,
  Video,
  Loader2,
  RefreshCw,
  Edit,
  Wand2,
} from 'lucide-react';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPrompt?: string;
  onSendToVeo?: (imageUrl: string, prompt: string) => void;
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  defaultPrompt = '',
  onSendToVeo,
}) => {
  const [prompt, setPrompt] = useState(defaultPrompt || '');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('16:9');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (defaultPrompt) {
      setPrompt(defaultPrompt);
    }
  }, [defaultPrompt]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type || 'image/png');
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await generateOrEditImage({
        prompt: prompt.trim(),
        image: uploadedImage || undefined,
        mimeType: uploadedImage ? mimeType : undefined,
        aspectRatio,
      });

      setGeneratedImage(res.imageUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Image generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `scene-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Image studio" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C99C62] flex items-center justify-center text-black">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Image Creator &amp; Editor</h2>
              <p className="text-xs text-neutral-400">
                Powered by <code className="font-mono text-neutral-300">gemini-3.1-flash-image-preview</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose} aria-label="Close image studio"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Prompt input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Image Description or Edit Instruction:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Cinematic wide shot of a chibi hairstylist in pastel boutique salon, soft directional lighting..."
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50 resize-y"
            />
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Aspect Ratio */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-700">Aspect Ratio:</span>
              <div className="flex items-center gap-1 p-0.5 bg-neutral-100 rounded-lg">
                {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      aspectRatio === ratio
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Image Upload for Editing */}
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 cursor-pointer text-neutral-700 font-medium transition-colors">
                <Upload className="w-3.5 h-3.5 text-neutral-500" />
                <span>{uploadedImage ? 'Replace Photo to Edit' : 'Upload Photo to Edit'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadedImage && (
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Clear Photo
                </button>
              )}
            </div>
          </div>

          {/* Uploaded image preview thumbnail */}
          {uploadedImage && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center gap-3">
              <img
                src={uploadedImage}
                alt="Source for editing"
                className="w-16 h-16 object-cover rounded-md border border-neutral-300"
              />
              <div className="text-xs">
                <span className="font-semibold text-neutral-900 block">
                  Reference Photo Attached
                </span>
                <span className="text-neutral-500">
                  Your prompt above will edit or transform this photo using Gemini Flash Image.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-semibold">{error}</p>
              {(error.includes('credits') || error.includes('billing')) && (
                <a
                  href="https://ai.studio/projects"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-amber-950 font-bold underline mt-1"
                >
                  Manage API Prepayment Credits &amp; Billing
                </a>
              )}
            </div>
          )}

          {/* Result view */}
          {generatedImage && (
            <div className="space-y-3 pt-2">
              <div className="font-semibold text-xs text-neutral-700 flex items-center justify-between">
                <span>Generated Scene Visual:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-black font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  {onSendToVeo && (
                    <button
                      onClick={() => {
                        onSendToVeo(generatedImage, prompt);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-xs bg-[#8A5036] text-white px-2.5 py-1 rounded font-semibold hover:bg-amber-700 transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" /> Animate with Veo
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-neutral-300 bg-neutral-950 flex items-center justify-center max-h-[380px]">
                <img
                  src={generatedImage}
                  alt="Generated Scene"
                  className="max-h-[380px] w-auto object-contain mx-auto"
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
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#C99C62] hover:bg-[#B98A4D] disabled:opacity-50 text-xs sm:text-sm font-extrabold text-neutral-950 transition-colors shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Generating Image...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-black" />
                <span>{uploadedImage ? 'Edit with Gemini' : 'Create Scene Image'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
