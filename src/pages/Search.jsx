import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import sql from "../lib/db";
import { motion, AnimatePresence } from "framer-motion";

export default function Search() {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  // 1. Fetch from Open Library API (No Keys Required)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);

    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();

      if (data.docs) {
        // Map Open Library's messy data into our clean format
        const cleanBooks = data.docs.map(item => {
          // Open Library uses 'cover_i' to fetch images from a separate image server
          const coverUrl = item.cover_i 
            ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` 
            : null;

          return {
            api_id: item.key.replace("/works/", ""), // Use their unique key
            title: item.title || "Unknown Title",
            author: item.author_name ? item.author_name[0] : "Unknown Author",
            cover_url: coverUrl,
            page_count: item.number_of_pages_median || 0,
            description: "Description not provided by Open Library."
          };
        });
        
        // Filter out junk results that are missing both an author and a cover
        const filteredBooks = cleanBooks.filter(b => b.author !== "Unknown Author" || b.cover_url);
        setResults(filteredBooks);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // 2. The Database Upsert Magic
  const addToShelf = async (status) => {
    if (!user || !selectedBook) return;
    setIsAdding(true);

    try {
      let globalId;
      const existingBook = await sql`
        SELECT id FROM global_books WHERE api_id = ${selectedBook.api_id} LIMIT 1
      `;

      if (existingBook.length > 0) {
        globalId = existingBook[0].id;
      } else {
        const newBook = await sql`
          INSERT INTO global_books (title, author, cover_url, page_count, api_id)
          VALUES (${selectedBook.title}, ${selectedBook.author}, ${selectedBook.cover_url}, ${selectedBook.page_count}, ${selectedBook.api_id})
          RETURNING id
        `;
        globalId = newBook[0].id;
      }

      await sql`
        INSERT INTO user_books (user_id, book_id, status)
        VALUES (${user.id}, ${globalId}, ${status})
        ON CONFLICT (user_id, book_id) 
        DO UPDATE SET status = ${status}; 
      `;

      setSelectedBook(null);
      
    } catch (err) {
      console.error("Failed to add book to shelf:", err);
      alert("Failed to add book. Check console.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto [scrollbar-width:none]">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER & SEARCH BAR */}
        <header className="mb-8 md:mb-12 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 uppercase tracking-tighter italic mb-4">Discover</h1>
          
          <form onSubmit={handleSearch} className="w-full max-w-2xl relative">
            <input 
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-900 border-2 border-zinc-800 text-zinc-100 pl-6 pr-16 py-4 rounded-2xl focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all text-lg shadow-xl placeholder:text-zinc-600"
            />
            <button 
              type="submit"
              disabled={isSearching}
              className="absolute right-3 top-3 bottom-3 bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-xl transition-colors disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </header>

        {/* LOADING STATE */}
        {isSearching && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-pulse flex gap-2 items-center text-amber-500 font-bold tracking-widest uppercase">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" />
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        )}

        {/* RESULTS GRID */}
        {!isSearching && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {results.map((book) => (
              <motion.div 
                key={book.api_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => setSelectedBook(book)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-amber-500/10 hover:border-zinc-600 transition-all flex flex-col"
              >
                <div className="aspect-[2/3] bg-zinc-800 relative">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4 text-center text-zinc-600 bg-zinc-900">
                      <span className="font-serif italic text-sm">{book.title}</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-zinc-950 to-transparent opacity-60" />
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between bg-zinc-900 z-10">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 line-clamp-2 leading-tight">{book.title}</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1 line-clamp-1">{book.author}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!isSearching && results.length === 0 && query && (
          <div className="text-center py-20 text-zinc-500">
            <p>No volumes found in the archives for "{query}".</p>
          </div>
        )}
      </div>

      {/* ADD TO SHELF MODAL */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => !isAdding && setSelectedBook(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
            >
              <div className="flex gap-4 p-6 bg-zinc-950/50 border-b border-zinc-800">
                <div className="w-20 sm:w-24 shrink-0 rounded-lg overflow-hidden shadow-lg bg-zinc-800 aspect-[2/3]">
                  {selectedBook.cover_url && <img src={selectedBook.cover_url} alt="cover" className="w-full h-full object-cover" />}
                </div>
                <div className="flex flex-col justify-center">
                  <h2 className="text-xl font-bold text-zinc-100 leading-tight mb-1">{selectedBook.title}</h2>
                  <p className="text-sm text-zinc-400 uppercase tracking-wider">{selectedBook.author}</p>
                  <p className="text-xs text-zinc-500 mt-2">{selectedBook.page_count > 0 ? `${selectedBook.page_count} pages` : 'Unknown pages'}</p>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 text-center">Add to your vault</h3>
                
                <button 
                  onClick={() => addToShelf('want_to_read')}
                  disabled={isAdding}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-all bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50"
                >
                  Want to Read
                </button>
                
                <button 
                  onClick={() => addToShelf('currently_reading')}
                  disabled={isAdding}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-all bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-50"
                >
                  Currently Reading
                </button>
                
                <button 
                  onClick={() => addToShelf('read')}
                  disabled={isAdding}
                  className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 disabled:opacity-50"
                >
                  Already Read
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}