import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import sql from "../lib/db"; 
import ColorThief from "colorthief";

// --- Curated Spine Colors ---
// --- Curated Spine Colors ---
const BOOK_COLORS = [
  "bg-red-900", "bg-blue-900", "bg-green-900", "bg-yellow-700",
  "bg-red-900", "bg-blue-900", "bg-green-900", "bg-yellow-700",
  "bg-purple-900", "bg-indigo-900", "bg-teal-900", "bg-rose-900",
  "bg-slate-800", "bg-orange-800", "bg-emerald-900", "bg-amber-900",
  "bg-stone-800", "bg-zinc-800", "bg-cyan-900"
];

const getHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const getColorForTitle = (title) => BOOK_COLORS[getHash(title || "") % BOOK_COLORS.length];

// --- Helpers ---
const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; 
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const getReadingTime = (start, end) => {
  if (!start || !end) return null;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1) || isNaN(d2)) return null;
  const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 1 : diffDays; 
};

export default function Library() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("author");
  const [isShuffling, setIsShuffling] = useState(false);
  const [activeBook, setActiveBook] = useState(null);
  const [isBookOpen, setIsBookOpen] = useState(false);
  
  // Hydration state
  const [isHydrating, setIsHydrating] = useState(false);
  const [hydrateStatus, setHydrateStatus] = useState("");

  // Dynamic Shelf Capacity State
  const [shelfCapacity, setShelfCapacity] = useState(800); 

  // Ref for the scrollable shelf container
  const scrollRef = useRef(null);

  // 1. DIRECT FETCH FROM NEON
  useEffect(() => {
    async function loadLibrary() {
      try {
        const data = await sql`SELECT * FROM books`;
        setBooks(data);
      } catch (err) {
        console.error("Database connection failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLibrary();
  }, []);

  // 2. Window Resize Listener for Dynamic Packing
  useEffect(() => {
    const calculateCapacity = () => {
      const isDesktop = window.innerWidth >= 768;
      const caseWidth = isDesktop ? (window.innerWidth / 2) - 24 : window.innerWidth * 0.85;
      setShelfCapacity(caseWidth - 154);
    };

    calculateCapacity();
    window.addEventListener('resize', calculateCapacity);
    return () => window.removeEventListener('resize', calculateCapacity);
  }, []);

  const runHydration = async () => {
    const missing = books.filter(b => !b.cover_url || b.cover_url.length < 5);
    if (missing.length === 0) return alert("All books have covers!");
    
    if (!confirm(`Found ${missing.length} books without covers. Sync with Open Library?`)) return;

    setIsHydrating(true);
    for (const book of missing) {
      try {
        setHydrateStatus(`Searching: ${book.title}`);
        const cleanTitle = (book.title || "").replace(/ *\([^)]*\) */g, "").trim();
        
        const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&author=${encodeURIComponent(book.author)}&limit=1`);
        const data = await res.json();

        if (data.docs?.[0]?.cover_i) {
          const coverUrl = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`;
          await sql`UPDATE books SET cover_url = ${coverUrl} WHERE id = ${book.id}`;
          setBooks(prev => prev.map(b => b.id === book.id ? { ...b, cover_url: coverUrl } : b));
        }
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error("Hydration Error:", err);
      }
    }
    setIsHydrating(false);
    setHydrateStatus("");
  };

  const saveBookColor = async (id, hex) => {
    try {
      await sql`UPDATE books SET spine_color = ${hex} WHERE id = ${id}`;
      setBooks(prev => prev.map(b => b.id === id ? { ...b, spine_color: hex } : b));
    } catch (err) {
      console.error("Error saving color:", err);
    }
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    if (newSort === sortBy) return;
    setIsShuffling(true);
    setTimeout(() => {
      setSortBy(newSort);
      setIsShuffling(false);
    }, 300);
  };

  const sortedBooks = useMemo(() => {
    let sorted = [...books];
    sorted.sort((a, b) => {
      if (sortBy === "author") {
        return (a.author || "").localeCompare(b.author || "") || (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "recent") {
        return new Date(b.date_finished || 0) - new Date(a.date_finished || 0);
      }
      return 0;
    });
    return sorted;
  }, [books, sortBy]);

  const handleShelfClick = (book) => {
    setActiveBook(book);
    setIsBookOpen(false); // Reset to closed state whenever a new book is selected
  };

  const closeBook = () => {
    // Instantly returns to shelf (clears the modal entirely)
    setActiveBook(null); 
  };

  const scrollShelves = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  // --- DYNAMIC GREEDY PACKING ALGORITHM ---
  const bookcases = useMemo(() => {
    if (shelfCapacity <= 0) return [];

    const cases = [];
    let currentCase = [];
    let currentShelf = [];
    let currentShelfWidth = 0;

    for (const book of sortedBooks) {
      const bookWidth = Math.max(45, (book.page_count || 300) / 5);

      if (currentShelfWidth + bookWidth > shelfCapacity && currentShelf.length > 0) {
        currentCase.push(currentShelf);
        currentShelf = [];
        currentShelfWidth = 0;

        if (currentCase.length === 2) {
          cases.push(currentCase);
          currentCase = [];
        }
      }

      currentShelf.push(book);
      currentShelfWidth += bookWidth;
    }

    if (currentShelf.length > 0) currentCase.push(currentShelf);
    
    if (currentCase.length > 0) {
      while (currentCase.length < 2) currentCase.push([]);
      cases.push(currentCase);
    }

    return cases;
  }, [sortedBooks, shelfCapacity]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] p-4 space-y-4 relative overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100 uppercase tracking-tighter italic">Virtual Library</h2>
          <p className="text-zinc-500 font-medium">
            {isHydrating ? `⚡ ${hydrateStatus}` : `${sortedBooks.length} volumes`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          <button 
            onClick={runHydration}
            disabled={isHydrating}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all border ${
              isHydrating 
              ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed" 
              : "bg-amber-600/10 border-amber-600/30 text-amber-500 hover:bg-amber-600/20"
            }`}
          >
            {isHydrating ? "Syncing..." : "Sync Covers"}
          </button>

          <select
            value={sortBy}
            onChange={handleSortChange}
            className="bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-2 rounded-xl focus:outline-none transition-all cursor-pointer shadow-sm text-sm"
          >
            <option value="author">Sort by Author</option>
            <option value="recent">Recently Read</option>
          </select>

          <div className="relative w-full sm:w-64">
            <input 
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 pl-10 pr-4 py-2 rounded-xl focus:outline-none transition-all placeholder:text-zinc-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="flex justify-center items-center gap-6 mt-2">
        <button 
          onClick={() => scrollShelves('left')} 
          className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-md group outline-none"
          title="Scroll Left"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button 
          onClick={() => scrollShelves('right')} 
          className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-md group outline-none"
          title="Scroll Right"
        >
          <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Shelves Container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex gap-12 pb-4 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Connecting to database...
          </div>
        ) : (
          bookcases.map((shelves, caseIndex) => (
            <div 
              key={caseIndex} 
              className="shrink-0 w-[85vw] md:w-[calc(50%-1.5rem)] h-full snap-start flex flex-col border-x-[24px] border-[#3e2723] bg-[#221a15] shadow-2xl relative"
            >
              <div className="h-6 w-full bg-[#4e342e] absolute top-0 z-10" />
              {shelves.map((shelfBooks, shelfIndex) => (
                <div key={shelfIndex} className="flex-1 relative border-b-[24px] border-[#4e342e] flex items-end px-12 pb-1" style={{ boxShadow: "inset 0 40px 60px -20px rgba(0,0,0,0.9)" }}>
                  {shelfBooks.map((book) => {
                    return (
                      <Spine 
                        key={book.id} 
                        book={book} 
                        searchQuery={searchQuery} 
                        isShuffling={isShuffling} 
                        onClick={() => handleShelfClick(book)} 
                        onColorFound={saveBookColor}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Book Modal */}
      <AnimatePresence>
        {activeBook && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 perspective-[2500px]" 
            onClick={closeBook} // Clicking outside returns it to the shelf instantly
          >
            <motion.div
              initial={{ x: 0, rotateY: -5, opacity: 0 }}
              animate={{ 
                x: isBookOpen ? "50%" : "0%", 
                rotateY: isBookOpen ? 0 : -5, 
                opacity: 1 
              }}
              exit={{ x: 0, rotateY: -5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative w-[280px] sm:w-[340px] md:w-[450px] h-[450px] sm:h-[500px] md:h-[650px] shadow-2xl rounded-r-lg cursor-pointer"
              style={{ transformStyle: "preserve-3d" }}
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsBookOpen(prev => !prev); // Toggles Cover Open/Closed
              }}
            >
              
              {/* RIGHT PAGE - Pushed back 2px to completely prevent Z-fighting */}
              <div 
                className="absolute inset-0 bg-[#fcfcfc] rounded-r-lg border-l border-zinc-300"
                style={{ transform: "translateZ(-2px)" }}
              >
                <motion.div 
                  animate={{ opacity: isBookOpen ? 1 : 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full p-6 md:p-12 flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-8">Metadata</h4>
                    <div className="space-y-4 text-zinc-800">
                      <p className="flex justify-between border-b pb-2"><span>Pages</span> <strong>{activeBook.page_count}</strong></p>
                      <p className="flex justify-between border-b pb-2"><span>Finished</span> <strong>{formatDate(activeBook.date_finished)}</strong></p>
                      <p className="flex justify-between border-b pb-2"><span>Read Time</span> <strong>{getReadingTime(activeBook.date_started, activeBook.date_finished) || "--"} days</strong></p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); closeBook(); }} 
                    className="mt-auto py-3 bg-zinc-900 text-white rounded-lg font-bold text-sm uppercase tracking-tighter hover:bg-zinc-800 transition-colors"
                  >
                    Return to Shelf
                  </button>
                </motion.div>
              </div>

              {/* FRONT COVER & LEFT PAGE */}
              <motion.div 
                className="absolute inset-0 origin-left z-20 rounded-r-lg"
                animate={{ rotateY: isBookOpen ? -180 : 0 }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* FRONT COVER - Pushed forward 1px */}
                <div 
                  className="absolute inset-0 bg-zinc-800 rounded-r-lg shadow-2xl overflow-hidden"
                  style={{ 
                    backfaceVisibility: "hidden", 
                    WebkitBackfaceVisibility: "hidden",
                    transform: "translateZ(1px)" 
                  }}
                >
                  {activeBook.cover_url ? (
                    <img src={activeBook.cover_url} className="w-full h-full object-cover" alt="cover" />
                  ) : (
                    <div className={`w-full h-full ${getColorForTitle(activeBook.title)} flex items-center justify-center p-8 text-center`}>
                      <h2 className="text-white font-serif text-3xl font-bold">{activeBook.title}</h2>
                    </div>
                  )}
                  <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
                </div>

                {/* BACK OF COVER / LEFT PAGE - Flipped 180deg and pushed forward 1px */}
                <div 
                  className="absolute inset-0 bg-white rounded-l-lg p-6 md:p-12 flex flex-col justify-center items-center text-center border-r border-zinc-200"
                  style={{ 
                    backfaceVisibility: "hidden", 
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg) translateZ(1px)" 
                  }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/5 to-transparent pointer-events-none" />
                  <h3 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 italic mb-4 leading-tight">{activeBook.title}</h3>
                  <div className="w-12 h-px bg-zinc-300 my-4" />
                  <p className="text-sm md:text-lg text-zinc-500 uppercase tracking-widest">{activeBook.author}</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Spine Component ---
function Spine({ book, searchQuery, isShuffling, onClick, onColorFound }) {
  const imgRef = useRef();
  const isMatch = !searchQuery || book.title.toLowerCase().includes(searchQuery.toLowerCase()) || book.author.toLowerCase().includes(searchQuery.toLowerCase());
  
  const height = `${85 + (getHash(book.title) % 12)}%`; 

  const handleImageLoad = () => {
    if (!book.spine_color) {
      const colorThief = new ColorThief();
      try {
        const [r, g, b] = colorThief.getColor(imgRef.current);
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        onColorFound(book.id, hex);
      } catch (e) {
        console.warn("CORS issue extracting color");
      }
    }
  };

  function getHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash);
  }

  return (
    <motion.div
      onClick={onClick}
      className="relative shrink-0 cursor-pointer origin-bottom"
      style={{
        width: Math.max(45, (book.page_count || 300) / 5), 
        height: height,
        filter: isMatch ? 'none' : 'grayscale(100%) brightness(0.2)',
        opacity: isShuffling ? 0 : 1
      }}
      whileHover={isMatch && !isShuffling ? { y: -20, scale: 1.02, z: 50 } : {}}
    >
      <div 
        className="absolute inset-0 rounded-sm flex items-center justify-center shadow-[5px_0_15px_rgba(0,0,0,0.4)] border-l border-white/20"
        style={{ backgroundColor: book.spine_color || '#3f3f46' }}
      >
        <img 
          ref={imgRef} 
          src={book.cover_url} 
          crossOrigin="anonymous" 
          onLoad={handleImageLoad} 
          className="hidden" 
        />
        
        <div className="text-white font-bold text-[13px] md:text-[15px] text-center px-2 leading-none uppercase tracking-tighter drop-shadow-md" style={{ writingMode: "vertical-rl" }}>
          {book.title}
        </div>
      </div>
    </motion.div>
  );
}