import { useState } from "react";
import sql from "../lib/db";

export default function GenreHydrator() {
  const [isHydrating, setIsHydrating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  const hydrateGenres = async () => {
    setIsHydrating(true);
    
    // Grab and clean the token just in case "Bearer" was pasted into the .env
    const rawToken = import.meta.env.VITE_HARDCOVER_API_TOKEN;
    if (!rawToken) {
      alert("Missing Hardcover API Token! Check your .env file.");
      setIsHydrating(false);
      return;
    }
    const cleanToken = rawToken.replace(/^Bearer\s+/i, '').trim();

    try {
      const missing = await sql`
        SELECT id, title, author FROM global_books 
        WHERE genre IS NULL OR genre = 'Uncategorized'
      `;
      
      const totalBooks = missing.length;
      setProgress({ current: 0, total: totalBooks, status: 'Starting...' });

      if (totalBooks === 0) {
        console.log("✅ All books have been successfully tagged!");
        setIsHydrating(false);
        return;
      }

      console.log(`\n=== 📘 STARTING HARDCOVER GENRE HUNT ===`);

      for (let i = 0; i < totalBooks; i++) {
        const book = missing[i];
        setProgress({ current: i + 1, total: totalBooks, status: 'Fetching' });
        
        const cleanTitle = book.title.replace(/\s*\(.*?\)/g, '').trim();
        console.log(`[${i + 1}/${totalBooks}] Scanning Hardcover for: "${cleanTitle}"`);

        let foundGenre = "Uncategorized";

        try {
          const graphqlQuery = {
            query: `
              query SearchBooks($search: String!) {
                books(where: {title: {_eq: $search}}, limit: 5) {
                  title
                  users_count
                  cached_tags
                }
              }
            `,
            variables: { search: cleanTitle }
          };

          const res = await fetch("https://api.hardcover.app/v1/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "authorization": `Bearer ${cleanToken}`,
              "User-Agent": "BookVault-App/1.0" 
            },
            body: JSON.stringify(graphqlQuery)
          });

          const data = await res.json();
          const books = data?.data?.books;

          if (books && books.length > 0) {
            // Sort by popularity
            const sortedBooks = books.sort((a, b) => (b.users_count || 0) - (a.users_count || 0));
            const mainBook = sortedBooks[0];

            if (mainBook.cached_tags && mainBook.cached_tags['Genre']) {
              const genres = mainBook.cached_tags['Genre'];
              
              if (genres.length > 0) {
                // THE FIX: Target g.tag instead of g
                const specificGenres = genres.filter(g => g.tag.toLowerCase() !== 'fiction');
                const finalTag = specificGenres.length > 0 ? specificGenres[0].tag : genres[0].tag;
                
                // Capitalize it nicely
                foundGenre = finalTag.charAt(0).toUpperCase() + finalTag.slice(1);
              }
            }
          }

          // Save to Database
          await sql`UPDATE global_books SET genre = ${foundGenre} WHERE id = ${book.id}`;
          console.log(`   -> 🏷️ Tagged as: ${foundGenre}`);
          
          // Pacing
          setProgress({ current: i + 1, total: totalBooks, status: 'Pacing...' });
          await new Promise(r => setTimeout(r, 1000)); 

        } catch (e) { 
          console.error(`   -> ❌ Network Error for ${cleanTitle}`, e); 
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      
      console.log(`\n=== ✅ GENRE HUNT COMPLETE ===\n`);
      setTimeout(() => window.location.reload(), 1000);

    } catch (err) {
      console.error("Critical hydration failure:", err);
      setIsHydrating(false);
    }
  };

  return (
    <button
      onClick={hydrateGenres}
      disabled={isHydrating}
      className="px-4 py-2 bg-indigo-600/10 border border-indigo-600/30 text-indigo-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600/20 transition-all disabled:opacity-50 min-w-[200px]"
    >
      {isHydrating 
        ? `⏳ ${progress.status} (${progress.current}/${progress.total})` 
        : "📘 Hardcover Genres"}
    </button>
  );
}