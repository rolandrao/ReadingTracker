// scripts/updateCovers.js
import 'dotenv/config'; 

async function start() {
    // We import db AFTER dotenv has loaded the variables
    const { default: sql } = await import('../src/lib/db.js');

    console.log("📚 Starting Direct DB Open Library Hydration...");

    try {
        const books = await sql`
            SELECT id, title, author 
            FROM books 
            WHERE cover_url IS NULL OR cover_url = ''
        `;

        console.log(`Found ${books.length} books needing covers.`);

        for (const book of books) {
            try {
                const cleanTitle = book.title.replace(/ *\([^)]*\) */g, "").trim();
                console.log(`🔍 Searching: "${cleanTitle}"`);

                const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&author=${encodeURIComponent(book.author)}&limit=1`);
                const data = await res.json();

                if (data.docs?.[0]?.cover_i) {
                    const url = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`;
                    
                    await sql`UPDATE books SET cover_url = ${url} WHERE id = ${book.id}`;
                    console.log(`✅ Updated: ${book.title}`);
                } else {
                    console.log(`👻 No cover for: ${book.title}`);
                }
                
                // Keep OpenLibrary happy
                await new Promise(r => setTimeout(r, 1500));
            } catch (err) {
                console.error(`❌ Error on ${book.title}:`, err.message);
            }
        }
    } catch (err) {
        console.error("FATAL:", err);
    }
    console.log("Done!");
}

start();