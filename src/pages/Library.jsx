import { useEffect, useState, useMemo, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import sql from "../lib/db";
import GoodreadsImport from "../components/GoodreadsImport";
import Maintenance from "../components/Maintenance";
import GenreHydrator from "@/components/GenreHydrator";
import Spine from "../components/library/Spine";
import BookModal from "../components/library/BookModal";

export default function Library() {
  const { user, isLoaded } = useUser();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Controls State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedShelf, setSelectedShelf] = useState("read");
  const [isShuffling, setIsShuffling] = useState(false);

  // --- Modal & UI State ---
  const [activeBook, setActiveBook] = useState(null);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [shelfCapacity, setShelfCapacity] = useState(800);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function loadLibrary() {
      if (!isLoaded) return;
      if (!user) return setLoading(false);

      try {
        const data = await sql`
          SELECT 
            gb.id AS global_id, gb.title, gb.author, gb.cover_url, gb.page_count, gb.genre,
            ub.book_id, ub.status, ub.spine_color, ub.date_finished, ub.date_started, ub.rating, ub.created_at, ub.review
          FROM user_books ub
          JOIN global_books gb ON ub.book_id = gb.id
          WHERE ub.user_id = ${user.id}
          ORDER BY ub.created_at DESC;
        `;
        setBooks(data);
      } catch (err) {
        console.error("Database connection failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLibrary();
  }, [user, isLoaded]);

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

  const saveBookColor = async (bookId, hex) => {
    if (!user) return;
    try {
      await sql`UPDATE user_books SET spine_color = ${hex} WHERE user_id = ${user.id} AND book_id = ${bookId}`;
      setBooks(prev => prev.map(b => b.book_id === bookId ? { ...b, spine_color: hex } : b));
    } catch (err) { console.error("Error saving color:", err); }
  };

  const updateBookStatus = async (newStatus) => {
    if (!user || !activeBook) return;

    try {
      let dateFinishedStr = activeBook.date_finished;

      if (newStatus === 'read' && !activeBook.date_finished) {
        dateFinishedStr = new Date().toISOString();
        await sql`UPDATE user_books SET status = ${newStatus}, date_finished = ${dateFinishedStr} WHERE user_id = ${user.id} AND book_id = ${activeBook.book_id}`;
      } else {
        await sql`UPDATE user_books SET status = ${newStatus} WHERE user_id = ${user.id} AND book_id = ${activeBook.book_id}`;
      }

      setBooks(prev => prev.map(b => b.book_id === activeBook.book_id ? { ...b, status: newStatus, date_finished: dateFinishedStr } : b));
      setActiveBook(prev => ({ ...prev, status: newStatus, date_finished: dateFinishedStr }));
    } catch (err) { alert("Failed to update shelf."); }
  };

  const handleControlChange = (setter) => (e) => {
    const newValue = e.target.value;
    setIsShuffling(true);
    setTimeout(() => { setter(newValue); setIsShuffling(false); }, 300);
  };

  const sortedBooks = useMemo(() => {
    let filtered = books.filter(b => b.status === selectedShelf);
    filtered.sort((a, b) => {
      if (sortBy === "author") return (a.author || "").localeCompare(b.author || "") || (a.title || "").localeCompare(b.title || "");
      if (sortBy === "recent") return new Date(b.date_finished || b.created_at || 0) - new Date(a.date_finished || a.created_at || 0);
      return 0;
    });
    return filtered;
  }, [books, sortBy, selectedShelf]);

  const handleShelfClick = (book) => { setActiveBook(book); setIsBookOpen(false); };
  const closeBook = () => setActiveBook(null);

  const scrollShelves = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

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
        if (currentCase.length === 2) { cases.push(currentCase); currentCase = []; }
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
          <h2 className="text-3xl font-bold text-zinc-100 uppercase tracking-tighter italic">
            {user?.firstName ? `${user.firstName}'s Vault` : 'Virtual Library'}
          </h2>
          <p className="text-zinc-500 font-medium">{sortedBooks.length} volumes on this shelf</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          {!loading && books.length > 0 && ( <><Maintenance /><GenreHydrator /></> )}
          
          <select value={selectedShelf} onChange={handleControlChange(setSelectedShelf)} className="bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-2 rounded-xl focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all cursor-pointer shadow-sm text-sm font-bold tracking-wide">
            <option value="read">📚 Read</option>
            <option value="want_to_read">📌 Want to Read</option>
            <option value="did_not_finish">☠️ Did Not Finish</option>
          </select>

          <select value={sortBy} onChange={handleControlChange(setSortBy)} className="bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-2 rounded-xl focus:outline-none transition-all cursor-pointer shadow-sm text-sm">
            <option value="recent">Recently Added/Read</option>
            <option value="author">Sort by Author</option>
          </select>

          <div className="relative w-full sm:w-64">
            <input type="text" placeholder="Search active shelf..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 pl-4 pr-4 py-2 rounded-xl focus:outline-none transition-all placeholder:text-zinc-500 shadow-sm" />
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {sortedBooks.length > 0 && (
        <div className="flex justify-center items-center gap-6 mt-2">
          <button onClick={() => scrollShelves('left')} className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all shadow-md group outline-none">
            <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => scrollShelves('right')} className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all shadow-md group outline-none">
            <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {/* RENDER LOGIC */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 animate-pulse">Connecting to vault...</div>
      ) : books.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pt-10 pb-20 overflow-y-auto">
          <GoodreadsImport onImportComplete={() => window.location.reload()} />
        </div>
      ) : sortedBooks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-12">
          <div className="w-24 h-24 mb-6 text-zinc-800">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h3 className="text-2xl font-bold text-zinc-300 mb-2 capitalize">Your "{selectedShelf.replace(/_/g, ' ')}" shelf is empty</h3>
          <p className="text-zinc-500 max-w-sm mb-8">Head over to the Discover tab to find books to add here.</p>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex gap-12 pb-4 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {bookcases.map((shelves, caseIndex) => (
            <div key={caseIndex} className="shrink-0 w-[85vw] md:w-[calc(50%-1.5rem)] h-full snap-start flex flex-col border-x-[24px] border-[#3e2723] bg-[#221a15] shadow-2xl relative">
              <div className="h-6 w-full bg-[#4e342e] absolute top-0 z-10" />
              {shelves.map((shelfBooks, shelfIndex) => (
                <div key={shelfIndex} className="flex-1 relative border-b-[24px] border-[#4e342e] flex items-end px-12 pb-1" style={{ boxShadow: "inset 0 40px 60px -20px rgba(0,0,0,0.9)" }}>
                  {shelfBooks.map((book) => (
                    <Spine 
                      key={book.book_id} book={book} searchQuery={searchQuery} isShuffling={isShuffling} 
                      onClick={() => handleShelfClick(book)} onColorFound={saveBookColor}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Extracted Book Modal */}
      <BookModal 
        activeBook={activeBook} 
        isBookOpen={isBookOpen} 
        setIsBookOpen={setIsBookOpen} 
        closeBook={closeBook} 
        updateBookStatus={updateBookStatus} 
      />

    </div>
  );
}