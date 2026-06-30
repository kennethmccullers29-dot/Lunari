const WORKSPACE_GRADIENTS = [
  "from-rose-400 to-rose-600",
  "from-orange-400 to-orange-600",
  "from-amber-400 to-amber-600",
  "from-emerald-400 to-emerald-600",
  "from-teal-400 to-teal-600",
  "from-cyan-400 to-cyan-600",
  "from-blue-400 to-blue-600",
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-violet-600",
  "from-pink-400 to-pink-600",
];

export function getWorkspaceGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return WORKSPACE_GRADIENTS[hash % WORKSPACE_GRADIENTS.length];
}
