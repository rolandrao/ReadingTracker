export default function Library() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Virtual Bookshelf</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Browse your read and unread collection.</p>
      </div>

      {/* Placeholder for the Bookshelf */}
      <div className="flex-1 rounded-xl border bg-zinc-100/50 dark:bg-zinc-900/50 dark:border-zinc-800 p-8 flex items-center justify-center text-zinc-400">
        [Horizontal Scrolling Bookshelf Will Go Here]
      </div>
    </div>
  );
}