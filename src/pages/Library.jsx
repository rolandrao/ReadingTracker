import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Curated Spine Colors ---
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
  const [activeBook, setActiveBook] = useState(null);
  const [bookState, setBookState] = useState("shelf"); // shelf | pulled | open

  useEffect(() => {
    fetch("/api/books")
      .then((res) => res.json())
      .then((data) => {
        setBooks(data);
        setLoading(false);
      });
  }, []);

  const handleBookClick = (book) => {
    if (!activeBook || activeBook.id !== book.id) {
      setActiveBook(book);
      setBookState("pulled");
      return;
    }

    if (bookState === "pulled") {
      setBookState("open");
    } else {
      setBookState("shelf");
      setActiveBook(null);
    }
  };

  const BOOKS_PER_SHELF = 14;
  const SHELVES_PER_CASE = 3;
  const BOOKS_PER_CASE = BOOKS_PER_SHELF * SHELVES_PER_CASE;

  const bookcases = [];
  for (let i = 0; i < books.length; i += BOOKS_PER_CASE) {
    const caseBooks = books.slice(i, i + BOOKS_PER_CASE);
    const shelves = [];
    for (let j = 0; j < caseBooks.length; j += BOOKS_PER_SHELF) {
      shelves.push(caseBooks.slice(j, j + BOOKS_PER_SHELF));
    }
    while (shelves.length < 3) shelves.push([]);
    bookcases.push(shelves);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] p-4 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Virtual Library</h2>
        <p className="text-zinc-500">{books.length} volumes</p>
      </div>

      <div className="flex-1 overflow-x-auto snap-x snap-mandatory flex gap-12 pb-4 scroll-smooth">

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Assembling your library...
          </div>
        ) : (
          bookcases.map((shelves, caseIndex) => (
            <div
              key={caseIndex}
              className="shrink-0 w-full lg:w-[85vw] max-w-[1200px] h-full snap-center flex flex-col border-x-[20px] border-[#3e2723] bg-[#2a1e17] shadow-2xl relative"
            >
              <div className="h-4 w-full bg-[#4e342e] absolute top-0 z-10" />

              {shelves.map((shelfBooks, shelfIndex) => (
                <div
                  key={shelfIndex}
                  className="flex-1 relative border-b-[20px] border-[#4e342e] flex items-end px-12"
                  style={{ boxShadow: "inset 0 20px 30px -10px rgba(0,0,0,0.8)" }}
                >
                  {shelfBooks.map((book) => {
                    const pages = book.page_count || 300;
                    const thickness = Math.max(32, Math.min(100, pages / 6));
                    const colorClass = getColorForTitle(book.title);

                    const isActive = activeBook?.id === book.id;

                    return (
                      <motion.div
                        key={book.id}
                        onClick={() => handleBookClick(book)}
                        className="relative shrink-0 h-[85%] max-h-[190px] cursor-pointer"
                        style={{
                          width: thickness,
                          perspective: 1200
                        }}
                        animate={
                          isActive
                            ? bookState === "pulled"
                              ? { x: 50, rotateY: -80, zIndex: 50 }
                              : { x: 50, rotateY: -180, scale: 1.4, zIndex: 50 }
                            : { x: 0, rotateY: 0, scale: 1, zIndex: 1 }
                        }
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 25
                        }}
                      >
                        <div
                          className={`absolute inset-0 rounded-sm ${colorClass} flex items-center justify-center`}
                          style={{
                            transformStyle: "preserve-3d",
                            backfaceVisibility: "hidden",
                            backgroundImage:
                              "linear-gradient(to right, rgba(255,255,255,0.12), rgba(0,0,0,0.3))",
                            boxShadow:
                              "-3px 0 8px rgba(0,0,0,0.4), inset 1px 0 1px rgba(255,255,255,0.1)"
                          }}
                        >
                          <div
                            className="text-white font-serif text-[10px] text-center px-1"
                            style={{
                              writingMode: "vertical-rl",
                              textOrientation: "mixed"
                            }}
                          >
                            {book.title}
                          </div>
                        </div>

                        {/* FRONT COVER */}
                        <div
                          className="absolute inset-0 rounded-sm overflow-hidden bg-black"
                          style={{
                            transform: "rotateY(180deg)",
                            backfaceVisibility: "hidden"
                          }}
                        >
                          {book.cover_url && (
                            <img
                              src={book.cover_url}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* METADATA PANEL */}
                        <AnimatePresence>
                          {isActive && bookState === "open" && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: -220 }}
                              exit={{ opacity: 0, y: 20 }}
                              transition={{ duration: 0.3 }}
                              className="absolute left-1/2 -translate-x-1/2 w-64 bg-zinc-950 text-white p-4 rounded-xl shadow-2xl"
                            >
                              <p className="font-bold">{book.title}</p>
                              <p className="text-sm text-zinc-400 mb-2">
                                {book.author}
                              </p>
                              <p className="text-xs">
                                {pages} pages
                              </p>
                              {book.date_finished && (
                                <p className="text-xs mt-1">
                                  Finished: {book.date_finished}
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </motion.div>
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
