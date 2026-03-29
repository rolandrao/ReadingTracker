import { useState, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import sql from "../lib/db";

// --- ROBUST CSV PARSER ---
// Safely handles commas and line breaks hidden inside Goodreads reviews
const parseCSV = (str) => {
  const arr = [];
  let quote = false;
  let col = 0, row = 0;
  
  for (let c = 0; c < str.length; c++) {
    let cc = str[c], nc = str[c+1];
    arr[row] = arr[row] || [];
    arr[row][col] = arr[row][col] || '';

    // Handle escaped quotes
    if (cc === '"' && quote && nc === '"') { 
      arr[row][col] += cc; ++c; continue; 
    }
    // Toggle quote state
    if (cc === '"') { quote = !quote; continue; }
    // Next column
    if (cc === ',' && !quote) { ++col; continue; }
    // Next row (handle Windows \r\n and Mac/Linux \n)
    if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
    if (cc === '\n' && !quote) { ++row; col = 0; continue; }
    if (cc === '\r' && !quote) { ++row; col = 0; continue; }

    arr[row][col] += cc;
  }

  // Map rows to headers
  const headers = arr[0];
  const data = [];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].length === headers.length) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j].trim()] = arr[i][j];
      }
      data.push(obj);
    }
  }
  return data;
};

export default function GoodreadsImport({ onImportComplete }) {
  const { user } = useUser();
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProgress("Parsing CSV file...");
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const csvData = event.target.result;
      const parsedBooks = parseCSV(csvData);
      
      // Filter out books with no title (empty rows at the end of CSVs)
      const validBooks = parsedBooks.filter(b => b["Title"]);
      
      if (validBooks.length > 0) {
        await processImport(validBooks);
      } else {
        setProgress("❌ Error: No valid books found in CSV.");
      }
    };
    
    reader.readAsText(file);
  };

  const processImport = async (csvBooks) => {
    setIsImporting(true);
    let successCount = 0;

    // Grab and clean the Hardcover Token
    const rawToken = import.meta.env.VITE_HARDCOVER_API_TOKEN || "";
    const cleanToken = rawToken.replace(/^Bearer\s+/i, '').trim();

    if (!cleanToken) {
        alert("Warning: Missing Hardcover API token. Genres will fall back to 'Uncategorized'.");
    }

    for (let i = 0; i < csvBooks.length; i++) {
      const row = csvBooks[i];
      const title = row["Title"];
      const author = row["Author"];
      
      setProgress(`Importing (${i + 1}/${csvBooks.length}): ${title}...`);

      try {
        // 1. Check if book exists in the Global Catalog
        let globalId;
        const existingBook = await sql`
          SELECT id FROM global_books WHERE title = ${title} AND author = ${author} LIMIT 1
        `;

        if (existingBook.length > 0) {
          globalId = existingBook[0].id;
        } else {
          // --- DUAL-FETCH: COVER (OpenLibrary) & GENRE (Hardcover) ---
          let coverUrl = null;
          let genre = "Uncategorized"; 
          
          try {
            // Strip series info from title for better searching
            const cleanTitle = title.replace(/\s*\(.*?\)/g, '').trim();
            
            // Setup Open Library Query
            const olQuery = encodeURIComponent(`${cleanTitle} ${author}`);
            
            // Setup Hardcover GraphQL Query
            const hcQuery = {
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
            
            // Fire both API requests simultaneously
            const [olRes, hcRes] = await Promise.all([
              fetch(`https://openlibrary.org/search.json?q=${olQuery}&limit=1`).catch(() => null),
              cleanToken ? fetch("https://api.hardcover.app/v1/graphql", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "authorization": `Bearer ${cleanToken}`,
                  "User-Agent": "BookVault-App/1.0"
                },
                body: JSON.stringify(hcQuery)
              }).catch(() => null) : Promise.resolve(null)
            ]);

            // Parse Open Library (Cover Image)
            if (olRes && olRes.ok) {
              const olData = await olRes.json();
              if (olData.docs?.[0]?.cover_i) {
                coverUrl = `https://covers.openlibrary.org/b/id/${olData.docs[0].cover_i}-L.jpg`;
              }
            }

            // Parse Hardcover (Genre)
            if (hcRes && hcRes.ok) {
              const hcData = await hcRes.json();
              const books = hcData?.data?.books;
              
              if (books && books.length > 0) {
                // Sort by users_count to grab the most popular/main edition
                const sortedBooks = books.sort((a, b) => (b.users_count || 0) - (a.users_count || 0));
                const mainBook = sortedBooks[0];
                
                if (mainBook.cached_tags && mainBook.cached_tags['Genre']) {
                  const genres = mainBook.cached_tags['Genre'];
                  if (genres.length > 0) {
                    // Filter out generic "fiction" to get the juicy sub-genres
                    const specificGenres = genres.filter(g => g.tag.toLowerCase() !== 'fiction');
                    const finalTag = specificGenres.length > 0 ? specificGenres[0].tag : genres[0].tag;
                    
                    // Capitalize the first letter
                    genre = finalTag.charAt(0).toUpperCase() + finalTag.slice(1);
                  }
                }
              }
            }
          } catch (e) { 
            console.error(`API fetch failed during import for ${title}`); 
          }

          // Insert into Global Catalog
          const newBook = await sql`
            INSERT INTO global_books (title, author, page_count, cover_url, genre) 
            VALUES (${title}, ${author}, ${parseInt(row["Number of Pages"]) || null}, ${coverUrl}, ${genre}) 
            RETURNING id
          `;
          globalId = newBook[0].id;
        }

        // 2. Link to User Shelf (Including Review, Rating, and Status)
        const userReview = row["My Review"] ? row["My Review"].trim() : null;
        
        // Map Goodreads Exclusive Shelf to our database statuses
        let status = 'read';
        if (row["Exclusive Shelf"] === "currently-reading") status = 'currently_reading';
        if (row["Exclusive Shelf"] === "to-read") status = 'want_to_read';
        
        await sql`
          INSERT INTO user_books (user_id, book_id, status, rating, date_finished, review)
          VALUES (
            ${user.id}, 
            ${globalId}, 
            ${status}, 
            ${parseInt(row["My Rating"]) || null}, 
            ${row["Date Read"] ? new Date(row["Date Read"]).toISOString() : null},
            ${userReview}
          )
          ON CONFLICT (user_id, book_id) DO UPDATE 
          SET 
            status = EXCLUDED.status,
            rating = EXCLUDED.rating,
            date_finished = EXCLUDED.date_finished,
            review = EXCLUDED.review;
        `;

        successCount++;
        
        // API Pacing: 1 second delay to keep Open Library and Hardcover happy
        await new Promise(r => setTimeout(r, 1000));

      } catch (err) { 
        console.error(`Failed to import ${title}:`, err); 
      }
    }
    
    setProgress(`✅ Done! ${successCount} books added to your vault.`);
    setTimeout(() => {
      setIsImporting(false);
      if (onImportComplete) onImportComplete();
    }, 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl">
      <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </div>
      
      <h3 className="text-2xl font-bold text-zinc-100 mb-2 font-serif italic">Import Library</h3>
      <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
        Upload your Goodreads CSV export. We will automatically fetch the high-res covers, categorize the genres, and import your reviews.
      </p>

      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      {isImporting ? (
        <div className="py-4 px-6 bg-zinc-950 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <span className="text-amber-500 font-bold uppercase tracking-widest text-xs">Processing</span>
          </div>
          <p className="text-zinc-400 text-xs font-mono">{progress}</p>
        </div>
      ) : (
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95"
        >
          Select CSV File
        </button>
      )}
    </div>
  );
}