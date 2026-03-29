import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import sql from "../lib/db";

export default function Home() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [currentBook, setCurrentBook] = useState(null);
  const [yearBooks, setYearBooks] = useState([]);
  
  // Challenge State
  const currentYear = new Date().getFullYear();
  const [challengeGoal, setChallengeGoal] = useState(50);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [tempGoal, setTempGoal] = useState(50);

  // Progress State
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [pagesReadInput, setPagesReadInput] = useState(0);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      // Load their personal goal from LocalStorage (keeps the DB clean!)
      const savedGoal = localStorage.getItem(`reading_goal_${user.id}_${currentYear}`);
      if (savedGoal) {
        setChallengeGoal(parseInt(savedGoal));
        setTempGoal(parseInt(savedGoal));
      }
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Currently Reading Book
      const current = await sql`
        SELECT 
          gb.id, gb.title, gb.author, gb.cover_url, gb.page_count, gb.genre,
          ub.date_started, ub.pages_read
        FROM user_books ub
        JOIN global_books gb ON ub.book_id = gb.id
        WHERE ub.user_id = ${user.id} AND ub.status = 'currently_reading'
        ORDER BY ub.created_at DESC LIMIT 1;
      `;
      
      if (current.length > 0) {
        setCurrentBook(current[0]);
        setPagesReadInput(current[0].pages_read || 0);
      } else {
        setCurrentBook(null);
      }

      // 2. Fetch Books Read This Year
      const readThisYear = await sql`
        SELECT 
          gb.id, gb.title, gb.author, gb.cover_url, ub.date_finished, ub.rating
        FROM user_books ub
        JOIN global_books gb ON ub.book_id = gb.id
        WHERE ub.user_id = ${user.id} 
          AND ub.status = 'read' 
          AND EXTRACT(YEAR FROM ub.date_finished) = ${currentYear}
        ORDER BY ub.date_finished DESC;
      `;
      setYearBooks(readThisYear);

    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!currentBook) return;
    setIsUpdatingProgress(true);
    try {
      // Cap the pages at the book's max page count
      const safePages = Math.min(Math.max(0, parseInt(pagesReadInput) || 0), currentBook.page_count || 9999);
      
      await sql`
        UPDATE user_books 
        SET pages_read = ${safePages} 
        WHERE user_id = ${user.id} AND book_id = ${currentBook.id}
      `;
      
      setCurrentBook(prev => ({ ...prev, pages_read: safePages }));
      setPagesReadInput(safePages);
    } catch (e) {
      console.error("Failed to update progress", e);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const saveChallengeGoal = () => {
    setChallengeGoal(tempGoal);
    localStorage.setItem(`reading_goal_${user.id}_${currentYear}`, tempGoal.toString());
    setIsChallengeModalOpen(false);
  };

  // --- CHALLENGE MATH ---
  const readCount = yearBooks.length;
  const progressPercent = Math.min(Math.round((readCount / challengeGoal) * 100), 100);
  
  // Calculate if ahead/behind schedule
  const startOfYear = new Date(currentYear, 0, 1);
  const today = new Date();
  const daysPassed = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
  const daysInYear = currentYear % 4 === 0 ? 366 : 365;
  const expectedPace = (challengeGoal / daysInYear) * daysPassed;
  const booksAhead = readCount - expectedPace;
  
  let scheduleText = "On track";
  let scheduleColor = "text-zinc-400";
  if (booksAhead >= 1) {
    scheduleText = `${Math.floor(booksAhead)} book${Math.floor(booksAhead) === 1 ? '' : 's'} ahead of schedule`;
    scheduleColor = "text-emerald-500";
  } else if (booksAhead <= -1) {
    scheduleText = `${Math.abs(Math.ceil(booksAhead))} book${Math.abs(Math.ceil(booksAhead)) === 1 ? '' : 's'} behind schedule`;
    scheduleColor = "text-rose-500";
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div>
        <h1 className="text-4xl font-black text-white font-serif italic mb-2 tracking-tight">
          Welcome back, {user?.firstName || 'Reader'}.
        </h1>
        <p className="text-zinc-400 text-sm tracking-wide">Here is your reading dashboard.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ========================================== */}
        {/* LEFT COLUMN: CURRENTLY READING WIDGET      */}
        {/* ========================================== */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Currently Reading</h3>
          
          {currentBook ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-8 shadow-2xl relative overflow-hidden group">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

              {/* Cover Image */}
              <div className="w-32 sm:w-40 shrink-0 shadow-2xl rounded-md overflow-hidden z-10">
                {currentBook.cover_url ? (
                  <img src={currentBook.cover_url} alt="Cover" className="w-full h-auto object-cover aspect-[2/3]" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center p-4 text-center border border-zinc-700">
                    <span className="text-xs text-zinc-500 font-serif">{currentBook.title}</span>
                  </div>
                )}
              </div>

              {/* Book Details & Progress */}
              <div className="flex-1 flex flex-col justify-center z-10">
                {currentBook.genre && currentBook.genre !== 'Uncategorized' && (
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 block">
                    {currentBook.genre}
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif leading-tight mb-1">
                  {currentBook.title}
                </h2>
                <p className="text-zinc-400 text-sm mb-8">{currentBook.author}</p>

                {/* Progress Bar Area */}
                <div className="space-y-3 mt-auto">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        value={pagesReadInput}
                        onChange={(e) => setPagesReadInput(e.target.value)}
                        className="w-20 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                      />
                      <span className="text-zinc-500 text-sm">/ {currentBook.page_count || '?'} pages</span>
                    </div>
                    
                    {pagesReadInput !== currentBook.pages_read && (
                      <button 
                        onClick={handleUpdateProgress}
                        disabled={isUpdatingProgress}
                        className="text-xs font-bold text-amber-500 uppercase tracking-widest hover:text-amber-400 transition-colors"
                      >
                        {isUpdatingProgress ? 'Saving...' : 'Update'}
                      </button>
                    )}
                  </div>

                  {/* The Visual Bar */}
                  {currentBook.page_count && (
                    <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((currentBook.pages_read || 0) / currentBook.page_count) * 100, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-amber-500 rounded-full relative"
                      >
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                      </motion.div>
                    </div>
                  )}
                  {currentBook.page_count && (
                    <p className="text-right text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      {Math.round(((currentBook.pages_read || 0) / currentBook.page_count) * 100)}% Complete
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
             <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl p-8 text-center">
               <p className="text-zinc-500 text-sm mb-4">You aren't reading anything right now.</p>
               <a href="/library" className="text-amber-500 text-xs font-bold uppercase tracking-widest hover:text-amber-400">Go to Library &rarr;</a>
             </div>
          )}
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN: READING CHALLENGE CARD       */}
        {/* ========================================== */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{currentYear} Challenge</h3>
          
          <div 
            onClick={() => setIsChallengeModalOpen(true)}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl hover:border-zinc-700 transition-all cursor-pointer group relative overflow-hidden flex flex-col items-center justify-center aspect-square sm:aspect-auto sm:h-[300px]"
          >
             {/* Circular Progress Ring */}
             <div className="relative w-40 h-40 mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
                  {/* Foreground Progress */}
                  <motion.circle 
                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                    className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 283" }}
                    animate={{ strokeDasharray: `${(progressPercent / 100) * 283} 283` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-4xl font-black text-white font-serif">{readCount}</span>
                   <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">of {challengeGoal}</span>
                </div>
             </div>

             <h4 className="text-zinc-100 font-bold tracking-wide group-hover:text-amber-500 transition-colors">
               Reading Challenge
             </h4>
             <p className={`text-xs mt-2 font-medium ${scheduleColor}`}>
               {scheduleText}
             </p>

             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
             </div>
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* MODAL: READING CHALLENGE DETAILS           */}
      {/* ========================================== */}
      <AnimatePresence>
        {isChallengeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsChallengeModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm cursor-pointer"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-950/50">
                <div>
                  <h2 className="text-2xl font-bold text-white font-serif mb-1">{currentYear} Challenge</h2>
                  <p className={`text-sm ${scheduleColor}`}>{scheduleText}</p>
                </div>
                
                {/* Edit Goal Input */}
                <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2">Goal</span>
                    <input 
                      type="number" 
                      value={tempGoal}
                      onChange={(e) => setTempGoal(e.target.value)}
                      className="w-16 bg-transparent text-white text-center font-bold outline-none"
                    />
                  </div>
                  {tempGoal !== challengeGoal && (
                    <button onClick={saveChallengeGoal} className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors">
                      Save
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Body: Book Grid */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-zinc-900">
                {yearBooks.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {yearBooks.map((book, idx) => (
                      <div key={book.id} className="group relative aspect-[2/3] rounded-md overflow-hidden shadow-lg border border-zinc-800 bg-zinc-800">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2 text-center">
                            <span className="text-[10px] text-zinc-400">{book.title}</span>
                          </div>
                        )}
                        {/* Number Badge */}
                        <div className="absolute top-2 left-2 w-6 h-6 bg-black/80 backdrop-blur-md text-white text-xs font-bold flex items-center justify-center rounded-full border border-white/10">
                          {yearBooks.length - idx}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-zinc-500">You haven't finished any books in {currentYear} yet.</p>
                  </div>
                )}
              </div>
              
              {/* Close Button */}
              <button 
                onClick={() => setIsChallengeModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}