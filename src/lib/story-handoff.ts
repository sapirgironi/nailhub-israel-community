// Hands a story photo picked in the global "create" sheet to the feed's stories bar.
let pending: File | null = null;
const listeners = new Set<() => void>();
export function queueStory(f: File) { pending = f; listeners.forEach(l => l()); }
export function takeStory(): File | null { const f = pending; pending = null; return f; }
export function onStoryQueued(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
