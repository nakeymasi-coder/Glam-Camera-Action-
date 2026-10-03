import React, { useState, useRef, useEffect } from 'react';
import {
  ChatMessage,
  sendChatToDirector,
  searchGroundedInformation,
} from '../services/geminiService';
import {
  MessageSquare,
  Send,
  Sparkles,
  Globe,
  Bot,
  User,
  Trash2,
  ExternalLink,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface AiDirectorChatProps {
  currentStoryIdea?: string;
  currentMasterPrompt?: string;
}

export const AiDirectorChat: React.FC<AiDirectorChatProps> = ({
  currentStoryIdea,
  currentMasterPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        'Hello! I am your AI Story Director. I can critique your 3-scene story structure, refine dialogue, ensure visual continuity, or research factual details using Google Search. What are you working on?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<
    'gemini-3.8-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'
  >('gemini-3.8-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setInput('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      if (useSearchGrounding) {
        // Use Google Search Grounding with gemini-3.8-flash
        const searchResult = await searchGroundedInformation(text);
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'model',
          content: searchResult.text,
          sources: searchResult.sources,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        // Multi-turn conversation with selected model
        const chatHistory = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let systemInstruction =
          'You are the AI Story Director and Co-Writer for Glam, Camera, Action!. ' +
          'Provide concise, sharp, high-impact notes on pacing, character motivation, dialogue, and camera angles.';

        if (currentMasterPrompt) {
          systemInstruction += `\n\nActive Master Story Prompt for Context:\n${currentMasterPrompt.slice(0, 1500)}`;
        }

        const response = await sendChatToDirector({
          messages: chatHistory,
          model: selectedModel,
          systemInstruction,
        });

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'model',
          content: response.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err: any) {
      const isBilling =
        err.isBillingError ||
        err.message?.includes('402') ||
        err.message?.includes('depleted') ||
        err.message?.includes('RESOURCE_EXHAUSTED') ||
        err.message?.includes('prepayment credits');

      if (isBilling) {
        setBillingNotice(
          'Your API key prepayment credits are depleted. You can manage project billing or attach an active key at https://ai.studio/projects. In the meantime, offline director assistance is provided below.'
        );
      }

      // Generate intelligent offline director response based on the production brief
      let offlineAdvice = '';
      const lower = text.toLowerCase();
      if (lower.includes('hook') || lower.includes('scene 1') || lower.includes('open')) {
        offlineAdvice =
          '🎬 Director Guidance for Scene 1 (The Hook):\n' +
          '• Seconds 0–3: Open mid-action with an immediate visual contradiction or curiosity trigger.\n' +
          '• Establish scale and costume immediately to lock into the Story Bible.\n' +
          '• Keep dialogue concise (under 10 words) so viewers absorb the visual premise before Scene 2.';
      } else if (lower.includes('continuity') || lower.includes('prop') || lower.includes('scene 2') || lower.includes('escalat')) {
        offlineAdvice =
          '🎬 Director Guidance for Scene 2 (Escalation & Continuity):\n' +
          '• Lock the Story Bible: Room lighting temperature, character wardrobe, and physical props must match Scene 1 exactly.\n' +
          '• What changes is character tension and camera closeness (push in from Medium to Close-up).\n' +
          '• Make sure the prop interaction directly builds toward the climax of Scene 3.';
      } else if (lower.includes('punchline') || lower.includes('twist') || lower.includes('scene 3') || lower.includes('payoff') || lower.includes('cta')) {
        offlineAdvice =
          '🎬 Director Guidance for Scene 3 (Payoff):\n' +
          '• Deliver an immediate resolution or twist that answers the curiosity raised in Scene 1.\n' +
          '• Hold the final hero pose for 1–2 seconds to give viewers space to absorb the punchline or CTA.\n' +
          '• Keep clean negative space in the composition for potential social media text overlays.';
      } else {
        offlineAdvice =
          '🎬 Story Director Creative Check:\n' +
          '• Scene 1: Hook and situation setup.\n' +
          '• Scene 2: Escalation, complication, or deepened stakes.\n' +
          '• Scene 3: Clean resolution, comedic punchline, or clear CTA.\n' +
          '• Story Bible: Consistency across silhouette, lighting, and wardrobe is key.';
      }

      const displayContent = isBilling
        ? `⚠️ Notice: API Prepayment Credits Depleted on this key.\n\n${offlineAdvice}`
        : `Notice: ${err.message || 'Gemini service unreachable.'}\n\n${offlineAdvice}`;

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: displayContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: 'Conversation cleared. How can I help you direct your next scene?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="gca-director bg-white rounded-xl border border-neutral-300 shadow-sm flex flex-col h-[520px] overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#C99C62] flex items-center justify-center text-black">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold">AI Story Director Chat</h3>
            <p className="text-[10px] text-neutral-400">
              Multi-turn coaching &amp; search grounding
            </p>
          </div>
        </div>

        {/* Model Selector & Grounding Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUseSearchGrounding(!useSearchGrounding)}
            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
              useSearchGrounding
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Toggle Google Search Grounding for accurate real-world facts"
          >
            <Globe className="w-3 h-3" />
            <span className="hidden sm:inline">Search Grounding</span>
          </button>

          {!useSearchGrounding && (
            <select
              aria-label="Director model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="bg-neutral-800 text-neutral-200 text-[11px] font-medium px-2 py-1 rounded border border-neutral-700 focus:outline-none cursor-pointer"
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Standard / Free Tier)</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Complex)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Fast)</option>
            </select>
          )}

          <button
            onClick={handleClearChat}
            className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Billing Alert Notification Banner if credits depleted */}
      {billingNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-2">
          <span>{billingNotice}</span>
          <a
            href="https://ai.studio/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 font-bold shrink-0 transition-colors text-amber-950 inline-flex items-center gap-1 text-[11px]"
          >
            <span>Manage Billing</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-50/60 text-xs sm:text-sm">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-[#C99C62] flex items-center justify-center text-black shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 shadow-xs leading-relaxed ${
                  isUser
                    ? 'bg-neutral-900 text-white rounded-br-xs'
                    : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Grounded Web Sources if present */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-neutral-200 text-[11px]">
                    <span className="font-semibold text-neutral-600 block mb-1">
                      Search Sources:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {m.sources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-amber-600 hover:underline bg-amber-50 px-1.5 py-0.5 rounded text-[10px]"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[140px]">{s.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[9px] mt-1 text-right ${
                    isUser ? 'text-neutral-400' : 'text-neutral-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
              {isUser && (
                <div className="w-6 h-6 rounded-full bg-neutral-300 flex items-center justify-center text-neutral-700 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-neutral-500 py-1 pl-8">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8A5036]" />
            <span>Director is thinking...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-1.5 bg-white border-t border-neutral-200 flex items-center gap-1.5 overflow-x-auto text-[11px] text-neutral-600 no-scrollbar">
        <span className="text-neutral-400 font-medium shrink-0">Quick prompts:</span>
        <button
          type="button"
          onClick={() =>
            handleSend(
              'Critique the hook of Scene 1 and suggest 2 punchier opening visual actions.'
            )
          }
          className="whitespace-nowrap px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors"
        >
          Punch up Scene 1 hook
        </button>
        <button
          type="button"
          onClick={() =>
            handleSend(
              'How can I ensure the physical props maintain continuity from Scene 2 to Scene 3?'
            )
          }
          className="whitespace-nowrap px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors"
        >
          Check prop continuity
        </button>
        <button
          type="button"
          onClick={() =>
            handleSend('Suggest 3 unexpected twists or punchlines for Scene 3 payoff.')
          }
          className="whitespace-nowrap px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors"
        >
          Scene 3 punchlines
        </button>
      </div>

      {/* Input row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-neutral-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            useSearchGrounding
              ? 'Search Google data or ask a factual reference question...'
              : 'Ask Director about scene beats, dialogue, or visual continuity...'
          }
          className="flex-1 text-xs sm:text-sm px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#C99C62] bg-neutral-50/50"
        />
        <button
          type="submit"
          aria-label="Send to AI Director"
          disabled={!input.trim() || isLoading}
          className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
