import type { ProjectBackup } from '../utils/projectBackups';

export function ProjectBackups({ projects, onRestore }: {
  projects: ProjectBackup[];
  onRestore: (project: ProjectBackup) => void;
}) {
  return <section aria-label="Saved project backups" className="gca-brief space-y-4 mt-6">
    <h3 className="font-bold">Previous projects · {projects.length}</h3>
    <p className="text-sm text-neutral-600">Starting a new project from a template automatically saves your current draft, generated output and manual edits here. Restoring also saves the project you are leaving. Backups stay in this browser; they are not cloud-synced.</p>
    {!projects.length && <p className="text-sm text-neutral-600">Your current project will appear here when you start a new one.</p>}
    {projects.map(project => <article key={project.id} className="rounded-lg border border-neutral-300 p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><h4 className="font-semibold break-words">{project.title}</h4><p className="text-xs text-neutral-600">{new Date(project.createdAt).toLocaleString()}</p></div>
      <button type="button" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold" onClick={() => onRestore(project)}>Restore project</button>
    </article>)}
  </section>;
}
