import pg from 'pg';

const { Client } = pg;

export default async (req, context) => {
  // The function securely reads the DATABASE_URL from Netlify's environment
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    // Ask Neon for the books
    const result = await client.query('SELECT * FROM books ORDER BY date_finished DESC NULLS LAST');
    await client.end();

    // Hand the data back to the React frontend
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// This assigns a clean URL to your function
export const config = {
  path: "/api/books"
};