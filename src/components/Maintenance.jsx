import { useState } from "react";
import sql from "../lib/db";

export default function Maintenance() {
  const [isHydrating, setIsHydrating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const hydrate = async () => {
    setIsHydrating(true);
    
    try {
      const missing = await sql`
        SELECT id, title, author FROM global_books 
        WHERE cover_url IS NULL OR cover_url = ''
      `;
      
      const totalBooks = missing.length;
      setProgress({ current: 0, total: totalBooks });

      if (totalBooks === 0) {
        console.log("✅ All books are fully hydrated!");
        setIsHydrating(false);
        return;
      }

      console.log(`\n=== 🌊 STARTING HYDRATION SCRIPT ===`);
      console.log(`Found ${totalBooks} books missing covers.\n`);

      for (let i = 0; i < totalBooks; i++) {
        const book = missing[i];
        setProgress({ current: i + 1, total: totalBooks });
        
        // --- THE FIX: Strip out parentheses and anything inside them ---
        const cleanTitle = book.title.replace(/\s*\(.*?\)/g, '').trim();
        
        console.log(`[${i + 1}/${totalBooks}] Searching: "${cleanTitle}" by ${book.author}`);

        try {
          const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(cleanTitle + ' ' + book.author)}&limit=1`);
          const data = await res.json();
          
          if (data.docs?.[0]?.cover_i) {
            const url = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`;
            await sql`UPDATE global_books SET cover_url = ${url} WHERE id = ${book.id}`;
            console.log(`   -> 🖼️ Cover found!`);
          } else {
            console.log(`   -> ❌ No cover found.`);
          }
          
          await new Promise(r => setTimeout(r, 800)); 
        } catch (e) { 
          console.error(`   -> ⚠️ API Error for ${book.title}`, e); 
        }
      }
      
      console.log(`\n=== ✅ HYDRATION COMPLETE ===\n`);
      setTimeout(() => window.location.reload(), 1000);

    } catch (err) {
      console.error("Critical hydration failure:", err);
      setIsHydrating(false);
    }
  };

  return (
    <button
      onClick={hydrate}
      disabled={isHydrating}
      className="px-4 py-2 bg-amber-600/10 border border-amber-600/30 text-amber-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-600/20 transition-all disabled:opacity-50 min-w-[160px]"
    >
      {isHydrating 
        ? `⏳ Hydrating (${progress.current}/${progress.total})` 
        : "✨ Heal Library"}
    </button>
  );
}