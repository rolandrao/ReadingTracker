import { useRef } from "react";
import { motion } from "framer-motion";
import ColorThief from "colorthief";
import { getHash } from "../../lib/utils";

export default function Spine({ book, searchQuery, isShuffling, onClick, onColorFound }) {
  const imgRef = useRef();
  const isMatch = !searchQuery || book.title.toLowerCase().includes(searchQuery.toLowerCase()) || book.author.toLowerCase().includes(searchQuery.toLowerCase());
  const height = `${85 + (getHash(book.title) % 12)}%`; 

  const handleImageLoad = () => {
    if (!book.spine_color) {
      const colorThief = new ColorThief();
      try {
        const [r, g, b] = colorThief.getColor(imgRef.current);
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        onColorFound(book.book_id, hex);
      } catch (e) {
        console.warn("CORS issue extracting color for", book.title);
      }
    }
  };

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
          alt="hidden cover for color extraction"
        />
        <div className="text-white font-bold text-[13px] md:text-[15px] text-center px-2 leading-none uppercase tracking-tighter drop-shadow-md" style={{ writingMode: "vertical-rl" }}>
          {book.title}
        </div>
      </div>
    </motion.div>
  );
}