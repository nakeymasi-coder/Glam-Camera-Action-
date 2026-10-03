import React, { useState } from 'react';
import { CanvasItem } from '../types';
import { Camera, FileText, Copy, Check } from 'lucide-react';

interface SixCanvasInspectorProps {
  canvases: CanvasItem[];
}

export const SixCanvasInspector: React.FC<SixCanvasInspectorProps> = ({
  canvases,
}) => {
  const [copiedCanvasId, setCopiedCanvasId] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | '1' | '2' | '3'>('all');

  const handleCopyCanvas = (item: CanvasItem) => {
    navigator.clipboard.writeText(item.content);
    setCopiedCanvasId(item.id);
    setTimeout(() => setCopiedCanvasId(null), 2000);
  };

  const filteredCanvases =
    selectedFilter === 'all'
      ? canvases
      : canvases.filter((c) => c.sceneIndex.toString() === selectedFilter);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-neutral-200/90 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-black bg-[#C99C62] px-2 py-0.5 rounded">
                6-Canvas Production Architecture
              </span>
              <span className="text-xs text-[#8A5036] font-bold">ChatGPT Canvas Spec</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
              Sequential Production Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl">
              Six linked planning canvases from the same production snapshot. These are detailed prompts and script instructions, not finished images or newly AI-written dialogue. Copy these prompts whenever you are ready; planning needs no AI service.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 rounded-lg self-start md:self-center">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All 6 Canvases
            </button>
            <button
              onClick={() => setSelectedFilter('1')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedFilter === '1'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Scene 1 (Hook)
            </button>
            <button
              onClick={() => setSelectedFilter('2')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedFilter === '2'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Scene 2 (Escalation)
            </button>
            <button
              onClick={() => setSelectedFilter('3')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedFilter === '3'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Scene 3 (Payoff)
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Canvases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCanvases.map((canvas) => {
          const isImage = canvas.canvasType === 'image';
          const isCopied = copiedCanvasId === canvas.id;

          return (
            <div
              key={canvas.id}
              className={`rounded-xl border transition-all shadow-sm overflow-hidden flex flex-col justify-between ${
                isImage
                  ? 'bg-white border-neutral-300 hover:border-neutral-400'
                  : 'bg-[#FAF8F3] border-neutral-300 hover:border-neutral-400'
              }`}
            >
              <div>
                {/* Header */}
                <div
                  className={`px-4 py-3 flex items-center justify-between border-b ${
                    isImage ? 'bg-amber-100 text-neutral-900 border-amber-200' : 'bg-neutral-100 text-neutral-900 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center ${
                        isImage ? 'bg-[#C99C62] text-black' : 'bg-[#8A5036] text-white'
                      }`}
                    >
                      {isImage ? <Camera className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold tracking-tight">
                        {canvas.title}
                      </h3>
                      <span className="text-[10px] text-neutral-600 font-mono block">
                        Scene {canvas.sceneIndex} · {isImage ? 'Visual Asset' : 'Voice & Action Script'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCanvas(canvas)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 px-2 py-1 rounded transition-colors"
                    title="Copy this individual canvas content"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-amber-400 stroke-[3]" />
                        <span className="text-amber-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Purpose Strip */}
                <div className="px-4 py-2 bg-neutral-100/80 border-b border-neutral-200/80 text-[11px] text-neutral-700">
                  <span className="font-semibold text-neutral-900">Purpose: </span>
                  {canvas.purpose}
                </div>

                {/* Content Box */}
                <div className="p-4 text-xs font-mono text-neutral-800 whitespace-pre-wrap leading-relaxed">
                  {canvas.content}
                </div>
              </div>

              {/* Bottom rule tag & AI Action Buttons */}
              <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 text-[10px] text-neutral-500 flex flex-wrap items-center justify-between gap-2">
                <span className="truncate max-w-[220px]">
                  {isImage
                    ? '1 finished image only · No split collage'
                    : canvas.sceneIndex === 3
                    ? 'Payoff follows your format; CTA only when requested'
                    : 'Transitions seamlessly into next scene'}
                </span>

                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="font-mono text-neutral-400 pl-1">#{canvas.canvasNumber}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
