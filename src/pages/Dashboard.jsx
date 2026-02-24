export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Welcome back! Here is your reading analytics overview.</p>
      </div>
      
      {/* Placeholder for KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-6 flex items-center justify-center text-zinc-400">
          Yearly Goal Widget
        </div>
        <div className="h-32 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-6 flex items-center justify-center text-zinc-400">
          Pages Read Widget
        </div>
        <div className="h-32 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-6 flex items-center justify-center text-zinc-400">
          Pace Widget
        </div>
      </div>
    </div>
  );
}