import React, { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';

interface AiDirectorChatProps {
  currentStoryIdea?: string;
  currentMasterPrompt?: string;
}

// Local keyword-selected checklists. No model, web search, or network requests.
function directorChecklist(question: string, storyIdea: string): string {
  const lower = question.toLowerCase();
  let advice: string;
  if (/hook|scene 1|open/.test(lower)) {
    advice = 'Scene 1 — Hook checklist:\n• Open on a visible action or contradiction tied to the story goal.\n• Establish the lead, setting, wardrobe, and recurring prop.\n• Keep one readable beat before the complication.';
  } else if (/continuity|prop|scene 2|escalat/.test(lower)) {
    advice = 'Scene 2 — Escalation & continuity checklist:\n• Use the supplied obstacle to complicate the opening goal.\n• Match wardrobe, prop state, lighting, and screen direction to Scene 1.\n• Increase tension through motivated framing, not an unrelated new event.';
  } else if (/punchline|twist|scene 3|payoff|cta/.test(lower)) {
    advice = 'Scene 3 — Payoff checklist:\n• Answer the question raised by the hook using the requested ending.\n• Show a readable change in the character or situation.\n• Include a sales pitch or CTA only when explicitly requested in the brief.';
  } else {
    advice = 'Story structure checklist:\n• Scene 1: Establish the goal and hook.\n• Scene 2: Escalate the supplied obstacle.\n• Scene 3: Deliver the requested ending or change.\n• Keep cast, setting, era, and props consistent across all six canvases.';
  }
  return [storyIdea.trim() ? `Active idea: ${storyIdea}` : 'Add a story idea to give this checklist context.', advice, 'This is a local rule-based checklist, not an AI critique or rewritten scene.'].join('\n\n');
}

export const AiDirectorChat: React.FC<AiDirectorChatProps> = ({ currentStoryIdea = '' }) => {
  const welcome = { role: 'director', content: 'Local Director selects planning checklists from your question’s keywords. Ask about the hook, escalation, continuity, or payoff. No AI model or web research is used.' };
  const [messages, setMessages] = useState([welcome]);
  const [input, setInput] = useState('');
  const handleSend = (question = input) => {
    if (!question.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: question.trim() }, { role: 'director', content: directorChecklist(question, currentStoryIdea) }]);
    setInput('');
  };

  return (
    <div className="gca-director bg-white rounded-xl border border-neutral-300 shadow-sm flex flex-col h-[520px] overflow-hidden">
      <div className="px-4 py-3 bg-neutral-900 text-white flex items-center justify-between">
        <div><h3 className="text-sm font-bold">Local Story Director</h3><p className="text-xs text-neutral-400">Template checklists · No remote AI</p></div>
        <button onClick={() => setMessages([welcome])} title="Clear Chat History" aria-label="Clear director conversation" className="p-2"><Trash2 size={16}/></button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-50/60" aria-live="polite">
        {messages.map((message, index) => <div key={index} className={`rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${message.role === 'user' ? 'bg-neutral-900 text-white ml-8' : 'bg-white border border-neutral-200 text-neutral-900 mr-8'}`}>{message.content}</div>)}
      </div>
      <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-neutral-200 text-xs">
        <button onClick={() => handleSend('Check the Scene 1 hook')} className="p-2 bg-neutral-100 rounded">Scene 1 hook</button>
        <button onClick={() => handleSend('Check prop continuity')} className="p-2 bg-neutral-100 rounded">Prop continuity</button>
        <button onClick={() => handleSend('Check Scene 3 payoff')} className="p-2 bg-neutral-100 rounded">Scene 3 payoff</button>
      </div>
      <form onSubmit={event => { event.preventDefault(); handleSend(); }} className="p-3 flex gap-2 border-t border-neutral-200">
        <input value={input} onChange={event => setInput(event.target.value)} aria-label="Director question" placeholder="Ask about scene beats or continuity..." className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 text-sm"/>
        <button type="submit" aria-label="Send to Local Director" disabled={!input.trim()} className="px-3 py-2 rounded-lg bg-neutral-900 text-white"><Send size={16}/></button>
      </form>
    </div>
  );
};
