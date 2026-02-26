import { useEffect, useState } from "react";
import sql from "../lib/db"; // Direct connection to Neon
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function Dashboard() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeYear, setActiveYear] = useState(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState([]);

  const [stats, setStats] = useState({ read: 0, pages: 0, projected: 0, longest: { title: "None", page_count: 0 } });
  const [monthlyData, setMonthlyData] = useState([]);
  const [lengthData, setLengthData] = useState([]);

  // 1. Direct DB Fetch
  useEffect(() => {
    async function getDashboardData() {
      try {
        const data = await sql`SELECT * FROM books`;
        setBooks(data);

        const currentYearStr = new Date().getFullYear().toString();

        const yearsSet = new Set(
          data.filter(b => (b.status?.toLowerCase() === 'read') && b.date_finished)
            .map(b => {
              const d = new Date(b.date_finished);
              return isNaN(d) ? null : d.getFullYear().toString();
            }).filter(Boolean)
        );

        yearsSet.add(currentYearStr);
        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        setAvailableYears(sortedYears);

        // SAFE YEAR CHECK
        const targetYear = data.some(b => {
          if (!b.date_finished) return false;
          const d = new Date(b.date_finished);
          return d.getFullYear().toString() === currentYearStr;
        })
          ? currentYearStr
          : (sortedYears[0] || currentYearStr);

        setActiveYear(targetYear);
      } catch (err) {
        console.error("Dashboard DB Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    getDashboardData();
  }, []);

  // 2. Statistics & Chart Calculations
  useEffect(() => {
    if (books.length === 0) return;

    // SAFE FILTER: Using getFullYear()
    const finishedThisYear = books.filter((book) => {
      if (!book.date_finished) return false;
      const isRead = book.status?.toLowerCase() === 'read';
      const d = new Date(book.date_finished);
      return isRead && !isNaN(d) && d.getFullYear().toString() === activeYear;
    });

    const totalPages = finishedThisYear.reduce((sum, book) => sum + (book.page_count || 0), 0);
    const longestBook = finishedThisYear.reduce(
      (max, book) => ((book.page_count || 0) > (max.page_count || 0) ? book : max),
      { page_count: 0, title: "None" }
    );

    const currentYearStr = new Date().getFullYear().toString();
    let projected = finishedThisYear.length;
    if (activeYear === currentYearStr) {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const dayOfYear = Math.floor((new Date() - startOfYear) / (1000 * 60 * 60 * 24));
      const pace = dayOfYear > 0 ? (finishedThisYear.length / dayOfYear) : 0;
      projected = Math.round(pace * 365);
    }

    setStats({ read: finishedThisYear.length, pages: totalPages, projected, longest: longestBook });

    // Monthly Chart Formatting (FIXED: Using getMonth instead of substring)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mData = months.map(m => ({ name: m, books: 0, pages: 0 }));

    finishedThisYear.forEach(book => {
      const d = new Date(book.date_finished);
      if (!isNaN(d)) {
        const monthIndex = d.getMonth(); 
        mData[monthIndex].books += 1;
        mData[monthIndex].pages += (book.page_count || 0);
      }
    });
    setMonthlyData(mData);

    // Book Length Donut
    const lengths = { short: 0, medium: 0, long: 0, epic: 0 };
    books.filter(b => b.status?.toLowerCase() === 'read').forEach(book => {
      const p = book.page_count || 0;
      if (p > 0 && p < 250) lengths.short++;
      else if (p >= 250 && p < 400) lengths.medium++;
      else if (p >= 400 && p < 600) lengths.long++;
      else if (p >= 600) lengths.epic++;
    });

    setLengthData([
      { name: '< 250 pgs', value: lengths.short, color: '#3b82f6' },
      { name: '250-400 pgs', value: lengths.medium, color: '#10b981' },
      { name: '400-600 pgs', value: lengths.long, color: '#f59e0b' },
      { name: '600+ pgs', value: lengths.epic, color: '#ef4444' }
    ].filter(d => d.value > 0));

  }, [books, activeYear]);

  return (
    <div className="space-y-8 pb-10 px-4 md:px-8 bg-zinc-950 min-h-screen text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight italic">Reading Analytics</h2>
          <p className="text-zinc-500">
            Insights for the <strong className="text-zinc-300">{activeYear}</strong> cycle.
          </p>
        </div>

        {!loading && availableYears.length > 0 && (
          <select
            value={activeYear}
            onChange={(e) => setActiveYear(e.target.value)}
            className="h-10 px-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-zinc-700 transition-all cursor-pointer"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year} Reading Year</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-zinc-500 animate-pulse py-20 text-center">Querying your lifetime library...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Books Finished" value={stats.read} subtitle={`In ${activeYear}`} icon="📚" />
            <StatCard title="Pages Devoured" value={stats.pages.toLocaleString()} subtitle={`In ${activeYear}`} icon="📄" />
            <StatCard title="Projected" value={stats.projected} subtitle={activeYear === new Date().getFullYear().toString() ? "EOY Pace" : "Final Count"} icon="📈" />
            <StatCard title="Longest Book" value={stats.longest?.title || "None"} subtitle={`${stats.longest?.page_count || 0} pages`} icon="🏋️‍♂️" isTruncated />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Monthly Velocity</CardTitle>
                <p className="text-sm text-zinc-500">Books finished per month</p>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <Tooltip cursor={{ fill: '#27272a' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                    <Bar dataKey="books" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Page Volume</CardTitle>
                <p className="text-sm text-zinc-500">Total pages read per month</p>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="pages" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPages)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Distribution</CardTitle>
                <p className="text-sm text-zinc-500">Lifetime book lengths</p>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lengthData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={5} dataKey="value" stroke="none"
                    >
                      {lengthData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Top Heavyweights</CardTitle>
                <p className="text-sm text-zinc-500">Your most impressive long reads</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {books.filter(b => b.status?.toLowerCase() === 'read').sort((a, b) => (b.page_count || 0) - (a.page_count || 0)).slice(0, 4).map((book, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                      <div className="max-w-[70%]">
                        <p className="font-semibold text-sm text-zinc-100 truncate">{book.title}</p>
                        <p className="text-xs text-zinc-500">{book.author}</p>
                      </div>
                      <div className="font-bold text-sm bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full whitespace-nowrap">
                        {book.page_count} pgs
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, isTruncated }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
        <span className="text-xl">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold text-zinc-100 ${isTruncated ? 'truncate' : ''}`} title={value}>
          {value}
        </div>
        <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}