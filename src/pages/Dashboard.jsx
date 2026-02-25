import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";

export default function Dashboard() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(new Date().getFullYear().toString());
  
  // Data States
  const [stats, setStats] = useState({ read: 0, pages: 0, projected: 0, longest: null });
  const [monthlyData, setMonthlyData] = useState([]);
  const [lengthData, setLengthData] = useState([]);

  useEffect(() => {
    fetch("/api/books")
      .then((res) => res.json())
      .then((data) => {
        setBooks(data);
        
        // 1. Smart Year Detection: Find the most recent year you actually finished a book
        const years = data
          .filter(b => b.status === 'read' && b.date_finished)
          .map(b => parseInt(b.date_finished.substring(0, 4)));
        const targetYear = years.length > 0 ? Math.max(...years).toString() : new Date().getFullYear().toString();
        setActiveYear(targetYear);

        // 2. Filter data for the Target Year
        const finishedThisYear = data.filter(
          (book) => book.status === 'read' && book.date_finished && book.date_finished.startsWith(targetYear)
        );

        // 3. KPI Calculations
        const totalPages = finishedThisYear.reduce((sum, book) => sum + (book.page_count || 0), 0);
        
        // Find longest book
        const longestBook = finishedThisYear.reduce(
          (max, book) => ((book.page_count || 0) > (max.page_count || 0) ? book : max), 
          { page_count: 0, title: "None" }
        );

        // Calculate Pace/Projection
        const currentYearStr = new Date().getFullYear().toString();
        let projected = finishedThisYear.length;
        if (targetYear === currentYearStr) {
          // If we are looking at the current year, calculate pace based on days passed
          const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
          const pace = dayOfYear > 0 ? (finishedThisYear.length / dayOfYear) : 0;
          projected = Math.round(pace * 365);
        }

        setStats({ read: finishedThisYear.length, pages: totalPages, projected, longest: longestBook });

        // 4. Monthly Chart Data Formatting
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mData = months.map(m => ({ name: m, books: 0, pages: 0 }));
        
        finishedThisYear.forEach(book => {
          if(book.date_finished) {
            const monthIndex = parseInt(book.date_finished.substring(5, 7)) - 1;
            mData[monthIndex].books += 1;
            mData[monthIndex].pages += (book.page_count || 0);
          }
        });
        setMonthlyData(mData);

        // 5. Book Length Donut Chart Data (All Time)
        const lengths = { short: 0, medium: 0, long: 0, epic: 0 };
        data.filter(b => b.status === 'read').forEach(book => {
          const p = book.page_count || 0;
          if (p > 0 && p < 250) lengths.short++;
          else if (p >= 250 && p < 400) lengths.medium++;
          else if (p >= 400 && p < 600) lengths.long++;
          else if (p >= 600) lengths.epic++;
        });
        
        setLengthData([
          { name: '< 250 pgs', value: lengths.short, color: '#3b82f6' }, // Blue
          { name: '250-400 pgs', value: lengths.medium, color: '#10b981' }, // Green
          { name: '400-600 pgs', value: lengths.long, color: '#f59e0b' }, // Yellow
          { name: '600+ pgs', value: lengths.epic, color: '#ef4444' }  // Red
        ].filter(d => d.value > 0)); // Only show slices that have data

        setLoading(false);
      })
      .catch((err) => console.error("Failed to fetch books:", err));
  }, []);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reading Analytics</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Your reading dashboard, currently showing data for <strong className="text-zinc-900 dark:text-zinc-100">{activeYear}</strong>.
        </p>
      </div>
      
      {loading ? (
        <div className="text-zinc-500 animate-pulse">Crunching your library data...</div>
      ) : (
        <>
          {/* Top KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Books Finished</CardTitle>
                <span className="text-xl">📚</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.read}</div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">In {activeYear}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pages Devoured</CardTitle>
                <span className="text-xl">📄</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pages.toLocaleString()}</div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">In {activeYear}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projected End of Year</CardTitle>
                <span className="text-xl">📈</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.projected} <span className="text-lg font-normal text-zinc-500">books</span></div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Based on current pace</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Longest Book</CardTitle>
                <span className="text-xl">🏋️‍♂️</span>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold leading-tight truncate" title={stats.longest.title}>
                  {stats.longest.title}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {stats.longest.page_count} pages
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Velocity Chart */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Monthly Velocity</CardTitle>
                <p className="text-sm text-zinc-500">Books finished per month in {activeYear}</p>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="books" fill="#18181b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Volume Chart */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Page Volume</CardTitle>
                <p className="text-sm text-zinc-500">Total pages read per month in {activeYear}</p>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="pages" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPages)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="col-span-1 lg:col-span-1">
              <CardHeader>
                <CardTitle>Book Lengths (All Time)</CardTitle>
                <p className="text-sm text-zinc-500">Distribution of your lifetime reads</p>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lengthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {lengthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Tome Tracker</CardTitle>
                <p className="text-sm text-zinc-500">Your most impressive long reads</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sort all books by page count, take the top 4 */}
                  {books.filter(b => b.status === 'read').sort((a, b) => (b.page_count || 0) - (a.page_count || 0)).slice(0, 4).map((book, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-sm line-clamp-1">{book.title}</p>
                        <p className="text-xs text-zinc-500">{book.author}</p>
                      </div>
                      <div className="font-bold text-sm bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full whitespace-nowrap">
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