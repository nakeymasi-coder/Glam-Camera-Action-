import React from 'react';
import { Feather, Layers, ShieldCheck } from 'lucide-react';

export function LocalPlanningDesk({ onOpenCanvases, onOpenBible }: {
  onOpenCanvases: () => void;
  onOpenBible: () => void;
}) {
  return <aside className="gca-planning-desk" aria-label="Local planning desk">
    <div className="gca-desk-heading"><span>THE PRODUCTION DESK</span><span className="gca-local-badge">LOCAL ONLY</span></div>
    <a href="#studio-workspace"><Feather size={22} strokeWidth={1.5}/><span><b>Shape your brief</b><small>Your idea, your creative direction</small></span><span aria-hidden="true">↘</span></a>
    <button onClick={onOpenCanvases}><Layers size={22} strokeWidth={1.5}/><span><b>Plan six linked canvases</b><small>Three scenes, one connected story</small></span><span aria-hidden="true">→</span></button>
    <button onClick={onOpenBible}><ShieldCheck size={22} strokeWidth={1.5}/><span><b>Keep every detail consistent</b><small>Your Story Bible & continuity locks</small></span><span aria-hidden="true">→</span></button>
    <p>Made for planning, not paid generation.<br/>No AI API, credits or key required.</p>
  </aside>;
}
