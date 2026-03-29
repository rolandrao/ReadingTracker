// --- TEST CONFIGURATION ---
const testTitle = "Light Bringer"; 
const testAuthor = "Pierce Brown";

// Paste your massive token here!
const HARDCOVER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJIYXJkY292ZXIiLCJ2ZXJzaW9uIjoiOCIsImp0aSI6IjAzOTM2NmIyLTczNTktNGNiOS04NDk2LWY1NDUwODE4NWZhMCIsImFwcGxpY2F0aW9uSWQiOjIsInN1YiI6Ijc4ODYyIiwiYXVkIjoiMSIsImlkIjoiNzg4NjIiLCJsb2dnZWRJbiI6dHJ1ZSwiaWF0IjoxNzc0ODE0MTMwLCJleHAiOjE4MDYzNTAxMzAsImh0dHBzOi8vaGFzdXJhLmlvL2p3dC9jbGFpbXMiOnsieC1oYXN1cmEtYWxsb3dlZC1yb2xlcyI6WyJ1c2VyIl0sIngtaGFzdXJhLWRlZmF1bHQtcm9sZSI6InVzZXIiLCJ4LWhhc3VyYS1yb2xlIjoidXNlciIsIlgtaGFzdXJhLXVzZXItaWQiOiI3ODg2MiJ9LCJ1c2VyIjp7ImlkIjo3ODg2Mn19.PHGjVU5FLEdZzkMCqIUNhHAjJ-UvQERxFAmgYb1eZOE";

async function runHardcoverTest() {
  console.log(`\n=== 📘 TESTING HARDCOVER API (CACHED_TAGS) ===`);
  
  const cleanToken = HARDCOVER_TOKEN.replace(/^Bearer\s+/i, '').trim();

  try {
    const cleanTitle = testTitle.replace(/\s*\(.*?\)/g, '').trim();
    
    // Asking specifically for 'cached_tags'
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
      variables: {
        search: cleanTitle 
      }
    };

    console.log(`\n[Fetching from Hardcover...]`);

    const res = await fetch("https://api.hardcover.app/v1/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authorization": `Bearer ${cleanToken}`,
        "User-Agent": "BookVault-App/1.0 (Node API Client)" 
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (!res.ok) {
        console.error(`❌ HTTP Error: ${res.status} ${res.statusText}`);
        const errorHtml = await res.text();
        console.log(errorHtml.substring(0, 1000)); 
        return;
    }

    const data = await res.json();

    if (data.errors) {
      console.error(`\n❌ GraphQL Errors:`, JSON.stringify(data.errors, null, 2));
      return;
    }

    const books = data.data.books;
    console.log(`\n[Results]`);
    console.log(`-> Volumes found: ${books ? books.length : 0}`);

    if (books && books.length > 0) {
      const sortedBooks = books.sort((a, b) => (b.users_count || 0) - (a.users_count || 0));
      const mainBook = sortedBooks[0];
      
      console.log(`-> Matched Book: "${mainBook.title}"`);
      
      // Dump the raw cached_tags so we can see what categories Hardcover provides
      console.log(`\n📦 RAW CACHED_TAGS:`);
      console.log(JSON.stringify(mainBook.cached_tags, null, 2));

      if (mainBook.cached_tags && mainBook.cached_tags['Genre']) {
        const genres = mainBook.cached_tags['Genre'];
        console.log(`\n📚 EXTRACTED GENRES ARRAY:`, genres);

        if (genres.length > 0) {
          // The blog says they are sorted most-tagged to least-tagged!
          // We can optionally filter out 'fiction' so we get the juicy sub-genres (like Sci-Fi)
          const specificGenres = genres.filter(g => g.toLowerCase() !== 'fiction');
          
          // Fall back to the very first one if it's ONLY tagged as fiction
          const finalGenreRaw = specificGenres.length > 0 ? specificGenres[0] : genres[0];
          
          const bestGenre = finalGenreRaw.charAt(0).toUpperCase() + finalGenreRaw.slice(1);
          console.log(`\n🎯 SMART EXTRACTED GENRE: "${bestGenre}"`);
        } else {
          console.log(`\n⚠️ The 'Genre' array was empty for this book.`);
        }
      } else {
        console.log(`\n❌ No 'Genre' key found inside cached_tags.`);
      }
    } else {
      console.log(`\n❌ No match found.`);
    }

    console.log(`\n==================================\n`);

  } catch (err) {
    console.error("\n❌ SCRIPT CRASHED:", err);
  }
}

runHardcoverTest();