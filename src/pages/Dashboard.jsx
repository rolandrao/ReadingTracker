import { useEffect, useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import sql from "../lib/db";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Sector
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CHART_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16'];

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null); // null means 'All Year'

  useEffect(() => {
    async function fetchAnalytics() {
      if (!isLoaded || !user) {
        setLoading(!isLoaded);
        return;
      }
      try {
        // REMOVED gb.genre from this query so Neon doesn't crash!
        const data = await sql`
          SELECT 
            gb.title, gb.author, gb.page_count, gb.genre,
            ub.rating, ub.date_finished
          FROM user_books ub
          JOIN global_books gb ON ub.book_id = gb.id
          WHERE ub.user_id = ${user.id} AND ub.status = 'read' AND ub.date_finished IS NOT NULL;
        `;
        setBooks(data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [user, isLoaded]);

  // 1. Filter books by the selected year
  const yearBooks = useMemo(() => {
    return books.filter(b => new Date(b.date_finished).getFullYear() === selectedYear);
  }, [books, selectedYear]);

  useEffect(() => {
    if (yearBooks.length > 0) {
      console.log(`\n=== 📚 BOOKS FOUND FOR ${selectedYear} ===`);
      console.log(`Total Count: ${yearBooks.length}`);
      yearBooks.forEach((book, index) => {
        // Formatting the date so you can see exactly what the DB thinks it is
        const dateStr = new Date(book.date_finished).toISOString().split('T')[0];
        console.log(`${index + 1}. [${dateStr}] - ${book.title}`);
      });
      console.log("==================================\n");
    }
  }, [yearBooks, selectedYear]);

  // 2. Crunch Top-Level Metrics & Projections
  const stats = useMemo(() => {
    const finishedCount = yearBooks.length;
    const totalPages = yearBooks.reduce((sum, b) => sum + (b.page_count || 0), 0);
    
    const ratedBooks = yearBooks.filter(b => b.rating && b.rating > 0);
    const avgRating = ratedBooks.length 
      ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1) 
      : "N/A";

    // Projections Math
    const currentYear = new Date().getFullYear();
    let projectedBooks = finishedCount;
    let projectedPages = totalPages;

    if (selectedYear === currentYear) {
      const now = new Date();
      const start = new Date(currentYear, 0, 0);
      const diff = now - start;
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      const daysInYear = (currentYear % 4 === 0) ? 366 : 365;
      
      if (dayOfYear > 0) {
        const paceMultiplier = daysInYear / dayOfYear;
        projectedBooks = Math.round(finishedCount * paceMultiplier);
        projectedPages = Math.round(totalPages * paceMultiplier);
      }
    }

    return { finishedCount, totalPages, avgRating, projectedBooks, projectedPages };
  }, [yearBooks, selectedYear]);

  // 3. Prepare Bar Chart Data (Monthly Breakdown)
  const monthlyData = useMemo(() => {
    const data = MONTHS.map((month, index) => ({ name: month, index, books: 0, pages: 0 }));
    yearBooks.forEach(book => {
      const monthIndex = new Date(book.date_finished).getMonth();
      data[monthIndex].books += 1;
      data[monthIndex].pages += (book.page_count || 0);
    });
    return data;
  }, [yearBooks]);

  // 4. Prepare Pie Chart Data
  const { authorData, genreData } = useMemo(() => {
    const filteredBooks = selectedMonthIndex !== null 
      ? yearBooks.filter(b => new Date(b.date_finished).getMonth() === selectedMonthIndex)
      : yearBooks;

    const authors = {};
    const genres = {};

    filteredBooks.forEach(book => {
      const author = book.author || "Unknown";
      authors[author] = (authors[author] || 0) + 1;
      
      // We removed genre from SQL, so this gracefully falls back to Uncategorized
      const genre = book.genre || "Uncategorized";
      genres[genre] = (genres[genre] || 0) + 1;
    });

    const formatForPie = (obj) => Object.entries(obj)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); 

    return { authorData: formatForPie(authors), genreData: formatForPie(genres) };
  }, [yearBooks, selectedMonthIndex]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-500 animate-pulse h-full">Crunching the data...</div>;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-xl shadow-xl z-50">
          <p className="text-zinc-100 font-bold mb-1">{label || payload[0].name}</p>
          {payload.map((entry, idx) => (
            <p key={idx} className="text-sm" style={{ color: entry.color || entry.fill }}>
              {entry.name}: <span className="font-bold">{entry.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto [scrollbar-width:none]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER & CONTROLS */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 uppercase tracking-tighter italic">Analytics Vault</h1>
            <p className="text-zinc-500 font-medium">Deep dive into your reading habits.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Target Year:</label>
            <select 
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setSelectedMonthIndex(null); 
              }}
              className="bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </header>

        {/* TOP LEVEL METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Books Finished" value={stats.finishedCount} />
          <StatCard title="Pages Turned" value={stats.totalPages.toLocaleString()} />
          <StatCard title="Avg Rating" value={stats.avgRating} highlight={false} />
          <StatCard title="Proj. Books EOY" value={stats.projectedBooks} highlight={selectedYear === new Date().getFullYear()} />
          <StatCard title="Proj. Pages EOY" value={stats.projectedPages.toLocaleString()} highlight={selectedYear === new Date().getFullYear()} />
        </div>

        {/* CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* BAR CHART: VOLUME OVER TIME */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md col-span-1 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Volume by Month</h3>
              <p className="text-xs text-zinc-500 italic">Click a bar to filter pie charts</p>
            </div>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} onClick={(e) => {
                  if (e && e.activeTooltipIndex !== undefined) {
                    setSelectedMonthIndex(prev => prev === e.activeTooltipIndex ? null : e.activeTooltipIndex);
                  }
                }}>
                  <XAxis dataKey="name" stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 12}} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#27272a'}} />
                  <Bar yAxisId="left" dataKey="books" name="Books" fill="#f59e0b" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                  <Bar yAxisId="right" dataKey="pages" name="Pages" fill="#3b82f6" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIE CHART 1: AUTHORS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Top Authors</h3>
              {selectedMonthIndex !== null && (
                <button onClick={() => setSelectedMonthIndex(null)} className="text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-1 rounded">Reset Month</button>
              )}
            </div>
            {selectedMonthIndex !== null && <p className="text-zinc-500 text-xs text-center absolute top-14 w-full left-0">Showing data for {MONTHS[selectedMonthIndex]}</p>}
            
            {authorData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie data={authorData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                      {authorData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-zinc-600 italic">No author data found.</div>
            )}
          </div>

          {/* PIE CHART 2: GENRES */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Genre Breakdown</h3>
              {selectedMonthIndex !== null && (
                <button onClick={() => setSelectedMonthIndex(null)} className="text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-1 rounded">Reset Month</button>
              )}
            </div>
            {selectedMonthIndex !== null && <p className="text-zinc-500 text-xs text-center absolute top-14 w-full left-0">Showing data for {MONTHS[selectedMonthIndex]}</p>}
            
            {genreData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie data={genreData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                      {genreData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 4) % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-zinc-600 italic">No genre data found.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// Reusable UI Component
function StatCard({ title, value, highlight }) {
  return (
    <div className={`border rounded-2xl p-4 shadow-md flex flex-col justify-between h-32 transition-colors ${
      highlight 
      ? 'bg-amber-500/5 border-amber-500/30 text-amber-500' 
      : 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-700'
    }`}>
      <h3 className={`text-xs font-bold uppercase tracking-widest line-clamp-2 ${highlight ? 'text-amber-600/80' : 'text-zinc-400'}`}>
        {title}
      </h3>
      <p className="text-3xl sm:text-4xl font-black mt-2">{value}</p>
    </div>
  );
}