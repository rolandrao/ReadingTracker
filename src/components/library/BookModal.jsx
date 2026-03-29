import { motion, AnimatePresence } from "framer-motion";
import { getColorForTitle, formatDate } from "../../lib/utils";

export default function BookModal({ activeBook, isBookOpen, setIsBookOpen, closeBook, updateBookStatus }) {
  return (
    <AnimatePresence>
      {activeBook && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 perspective-[2500px]" 
          onClick={closeBook}
        >
          {/* THE 3D BOOK CONTAINER */}
          <motion.div
            initial={{ x: 0, rotateY: -5, opacity: 0 }}
            animate={{ 
              x: isBookOpen ? (window.innerWidth > 768 ? "25%" : "0%") : "0%", 
              rotateY: isBookOpen ? 0 : -5, 
              opacity: 1 
            }}
            exit={{ x: 0, rotateY: -5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="relative w-[280px] sm:w-[340px] md:w-[450px] h-[450px] sm:h-[500px] md:h-[600px] shadow-2xl rounded-r-lg cursor-pointer mb-12"
            style={{ transformStyle: "preserve-3d" }}
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsBookOpen(prev => !prev); 
            }}
          >
            {/* INSIDE PAGES */}
            <div className="absolute inset-0 bg-[#fcfcfc] rounded-r-lg border-l border-zinc-300 flex flex-col" style={{ transform: "translateZ(-2px)" }}>
              <motion.div 
                animate={{ opacity: isBookOpen ? 1 : 0 }} 
                transition={{ duration: 0.2 }}
                className="h-full p-8 md:p-12 flex flex-col overflow-hidden"
              >
                 <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 shrink-0">Book Details</h4>
                 <div className="space-y-4 text-zinc-800 shrink-0">
                    <p className="flex justify-between border-b pb-2 text-sm"><span>Total Pages</span> <strong>{activeBook.page_count}</strong></p>
                    {activeBook.genre && activeBook.genre !== 'Uncategorized' && (
                      <p className="flex justify-between border-b pb-2 text-sm"><span>Genre</span> <strong>{activeBook.genre}</strong></p>
                    )}
                    {activeBook.date_finished && <p className="flex justify-between border-b pb-2 text-sm"><span>Finished</span> <strong>{formatDate(activeBook.date_finished)}</strong></p>}
                    {activeBook.rating > 0 && <p className="flex justify-between border-b pb-2 text-sm"><span>Rating</span> <strong>{activeBook.rating} / 5</strong></p>}
                 </div>

                 {/* --- DYNAMIC REVIEW SECTION --- */}
                 {activeBook.review ? (
                   <div className="mt-6 flex-1 min-h-0 flex flex-col">
                     <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 shrink-0">My Review</h5>
                     <div className="flex-1 overflow-y-auto pr-2 text-sm text-zinc-700 italic leading-relaxed whitespace-pre-wrap [scrollbar-width:thin] scrollbar-thumb-zinc-300 scrollbar-track-transparent">
                       "{activeBook.review}"
                     </div>
                   </div>
                 ) : (
                   <p className="text-xs text-zinc-400 mt-auto pt-6 leading-relaxed italic shrink-0">
                     "The art of reading is, in great part, that of acquiring a better understanding of life from ones encounter with it in a book."
                   </p>
                 )}
              </motion.div>
            </div>

            {/* COVER FLIPPER */}
            <motion.div className="absolute inset-0 origin-left z-20 rounded-r-lg" animate={{ rotateY: isBookOpen ? -180 : 0 }} transition={{ type: "spring", stiffness: 150, damping: 20 }} style={{ transformStyle: "preserve-3d" }}>
              {/* FRONT COVER */}
              <div className="absolute inset-0 bg-zinc-800 rounded-r-lg shadow-2xl overflow-hidden" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "translateZ(1px)" }}>
                {activeBook.cover_url ? (
                  <img src={activeBook.cover_url} className="w-full h-full object-cover" alt="cover" />
                ) : (
                  <div className={`w-full h-full ${getColorForTitle(activeBook.title)} flex items-center justify-center p-8 text-center`}>
                    <h2 className="text-white font-serif text-3xl font-bold">{activeBook.title}</h2>
                  </div>
                )}
                <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
              </div>
              {/* BACK OF COVER (Left Page) */}
              <div className="absolute inset-0 bg-white rounded-l-lg p-8 md:p-12 flex flex-col justify-center items-center text-center border-r border-zinc-200" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(1px)" }}>
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 italic mb-4 leading-tight">{activeBook.title}</h3>
                <div className="w-12 h-px bg-zinc-300 my-4" />
                <p className="text-sm md:text-base text-zinc-500 uppercase tracking-widest">{activeBook.author}</p>
              </div>
            </motion.div>
          </motion.div>

          {/* EXTERNAL CONTROL BAR */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-lg bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-2xl"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 ml-1">Current Shelf</span>
              <select 
                value={activeBook.status}
                onChange={(e) => updateBookStatus(e.target.value)}
                className="bg-zinc-800 text-amber-500 font-bold uppercase tracking-wider text-xs px-4 py-2 rounded-xl outline-none border border-zinc-700 cursor-pointer hover:bg-zinc-700 transition-colors"
              >
                <option value="read">Already Read</option>
                <option value="want_to_read">Want to Read</option>
                <option value="currently_reading">Currently Reading</option>
                <option value="did_not_finish">Did Not Finish</option>
              </select>
            </div>

            <button 
              onClick={closeBook} 
              className="px-6 py-3 bg-zinc-100 text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-tighter hover:bg-white transition-all shadow-lg active:scale-95"
            >
              Return to Shelf
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}