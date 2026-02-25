import { useEffect, useState } from "react";

// Curated palette of rich, "bookish" colors
const BOOK_COLORS = [
  "bg-red-900", "bg-blue-900", "bg-green-900", "bg-yellow-700", 
  "bg-purple-900", "bg-indigo-900", "bg-teal-900", "bg-rose-900",
  "bg-slate-800", "bg-orange-800", "bg-emerald-900", "bg-amber-900",
  "bg-stone-800", "bg-zinc-800", "bg-cyan-900"
];

const getColorForTitle = (title) => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BOOK_COLORS[Math.abs(hash) % BOOK_COLORS.length];
};

export default function Library() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("author");

  useEffect(() => {
    fetch("/api/books")
      .then((res) => res.json())
      .then((data) => {
        setBooks(data);
        setLoading(false);
      })
      .catch((err) => console.error("Failed to fetch books:", err));
  }, []);

  // --- SORTING LOGIC ---
  const sortedBooks = [...books].sort((a, b) => {
    if (sortBy === "author") {
      const authorA = a.author?.split(' ').pop() || "";
      const authorB = b.author?.split(' ').pop() || "";
      return authorA.localeCompare(authorB) || (a.title || "").localeCompare(b.title || "");
    }
    if (sortBy === "title") {
      return (a.title || "").localeCompare(b.title || "");
    }
    if (sortBy === "pages") {
      return (b.page_count || 0) - (a.page_count || 0);
    }
    if (sortBy === "date") {
      return new Date(b.date_finished || 0) - new Date(a.date_finished || 0);
    }
    return 0;
  });

  // --- CHUNKING LOGIC ---
  const BOOKS_PER_SHELF = 14; 
  const SHELVES_PER_CASE = 3;
  const BOOKS_PER_CASE = BOOKS_PER_SHELF * SHELVES_PER_CASE;

  const bookcases = [];
  for (let i = 0; i < sortedBooks.length; i += BOOKS_PER_CASE) {
    const caseBooks = sortedBooks.slice(i, i + BOOKS_PER_CASE);
    const shelves = [];
    for (let j = 0; j < caseBooks.length; j += BOOKS_PER_SHELF) {
      shelves.push(caseBooks.slice(j, j + BOOKS_PER_SHELF));
    }
    while (shelves.length < 3) shelves.push([]);
    bookcases.push(shelves);
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)] max-h-[1000px] p-4">
      
      {/* Header, Search & Sort */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Virtual Library</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            {books.length} volumes across {bookcases.length} bookcases.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm shadow-sm outline-none cursor-pointer"
          >
            <option value="author">Sort: Author (A-Z)</option>
            <option value="title">Sort: Title (A-Z)</option>
            <option value="pages">Sort: Page Count</option>
            <option value="date">Sort: Date Read</option>
          </select>

          <input 
            type="text" 
            placeholder="Search titles or authors..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm shadow-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
          />
        </div>
      </div>

      {/* The Scrollable Room */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex gap-12 pb-4 scroll-smooth hide-scrollbar rounded-xl">
        
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 animate-pulse bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl">
            Assembling your library...
          </div>
        ) : (
          bookcases.map((shelves, caseIndex) => (
            <div 
              key={caseIndex} 
              className="shrink-0 w-full lg:w-[85vw] max-w-[1200px] h-full snap-center flex flex-col border-x-[20px] border-[#3e2723] dark:border-[#1e130c] bg-[#2a1e17] dark:bg-[#150d08] shadow-2xl relative"
            >
              {/* Top Case Cap */}
              <div className="h-4 w-full bg-[#4e342e] dark:bg-[#2d1b12] absolute top-0 left-0 right-0 shadow-md z-10"></div>

              {shelves.map((shelfBooks, shelfIndex) => (
                <div 
                  key={shelfIndex}
                  className="flex-1 relative border-b-[20px] border-[#4e342e] dark:border-[#2d1b12] flex items-end justify-start px-12 pb-0.5"
                  style={{ boxShadow: 'inset 0 20px 30px -10px rgba(0,0,0,0.8)' }} 
                >
                  
                  {shelfBooks.map((book, bookIndex) => {
                    const pages = book.page_count || 300;
                    // Slightly wider minimum thickness (32px) to help with text centering
                    const thickness = Math.max(32, Math.min(100, pages / 6));
                    const colorClass = getColorForTitle(book.title);

                    // --- SEARCH DIMMING LOGIC ---
                    const isSearchActive = search.length > 0;
                    const matchesSearch = isSearchActive && (
                      book.title.toLowerCase().includes(search.toLowerCase()) || 
                      (book.author && book.author.toLowerCase().includes(search.toLowerCase()))
                    );
                    const visibilityClass = isSearchActive && !matchesSearch 
                      ? "opacity-10 grayscale-[80%] brightness-[0.3] z-0" 
                      : "opacity-100 z-10";

                    // --- EDGE-AWARE TOOLTIPS ---
                    const isFarLeft = bookIndex < 3;
                    const isFarRight = bookIndex > shelfBooks.length - 4;
                    let tooltipPosClass = "left-1/2 -translate-x-1/2";
                    let arrowPosClass = "left-1/2 -translate-x-1/2";
                    if (isFarLeft) { tooltipPosClass = "left-0 translate-x-0"; arrowPosClass = "left-4 translate-x-0"; }
                    else if (isFarRight) { tooltipPosClass = "right-0 translate-x-0"; arrowPosClass = "right-4 translate-x-0"; }

                    return (
                      <div 
                        key={book.id}
                        className={`relative group shrink-0 h-[85%] max-h-[190px] ${colorClass} ${visibilityClass} rounded-sm transition-all duration-300 hover:-translate-y-4 cursor-pointer flex flex-col items-center py-4 px-1`}
                        style={{ 
                          width: `${thickness}px`,
                          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.15) 10%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.25) 90%, rgba(255,255,255,0.1) 100%)',
                          boxShadow: '-3px 0 8px rgba(0,0,0,0.4), inset 1px 0 1px rgba(255,255,255,0.1)'
                        }}
                      >
                        {/* THE SPINE TEXT: Now fully centered horizontally and vertically */}
                        <div 
                          className="text-white/90 font-serif tracking-tight flex flex-col items-center justify-center h-full w-full opacity-90 group-hover:opacity-100 overflow-hidden"
                          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        >
                          {/* Title - leading-tight and text-center ensures horizontal centering on the spine */}
                          <span className={`font-bold text-center leading-tight mb-auto w-full ${book.title.length > 35 ? 'text-[9px]' : 'text-[11px]'}`}>
                            {book.title}
                          </span>
                          
                          {/* Author - centered at the bottom */}
                          <span className="text-[8px] uppercase tracking-tighter opacity-60 font-sans mt-2 text-center w-full">
                            {book.author?.split(' ').pop()}
                          </span>
                        </div>

                        {/* Tooltip */}
                        <div className={`absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-3 w-56 bg-zinc-950 text-white p-4 rounded-xl shadow-2xl pointer-events-none z-50 text-left border border-zinc-800 ${tooltipPosClass}`}>
                          <p className="font-bold text-sm leading-tight mb-1">{book.title}</p>
                          <p className="text-xs text-zinc-400 mb-2">{book.author}</p>
                          <div className="pt-2 border-t border-zinc-800 text-xs font-mono text-zinc-300">
                            {pages} pages
                          </div>
                          <div className={`absolute top-full border-8 border-transparent border-t-zinc-950 ${arrowPosClass}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}