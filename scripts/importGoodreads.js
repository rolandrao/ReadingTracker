import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Setup env variables and database connection
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvFilePath = path.join(__dirname, 'goodreads_library_export.csv');

async function importData() {
  await client.connect();
  console.log('Connected to Neon database!');

  const books = [];

  // 1. Read and parse the CSV
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      // Goodreads uses "Exclusive Shelf" to denote read status
      let status = 'read';
      if (row['Exclusive Shelf'] === 'to-read') status = 'want_to_read';
      if (row['Exclusive Shelf'] === 'currently-reading') status = 'currently_reading';

      // Clean up ISBNs (Goodreads exports them like '="123456789"')
      let cleanIsbn = row['ISBN13'] || row['ISBN'];
      if (cleanIsbn) cleanIsbn = cleanIsbn.replace(/[^0-9]/g, '');

      books.push({
        title: row['Title'],
        author: row['Author'],
        isbn: cleanIsbn,
        page_count: parseInt(row['Number of Pages']) || 0,
        status: status,
        date_finished: row['Date Read'] ? new Date(row['Date Read']).toISOString().split('T')[0] : null,
        date_started: row['Date Added'] ? new Date(row['Date Added']).toISOString().split('T')[0] : null,
        rating: parseInt(row['My Rating']) || null
      });
    })
    .on('end', async () => {
      console.log(`Parsed ${books.length} books. Starting database insertion...`);
      
      // 2. Insert into PostgreSQL
      let insertedCount = 0;
      for (const book of books) {
        try {
          const query = `
            INSERT INTO books (title, author, isbn, page_count, status, date_finished, date_started, rating)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;
          const values = [
            book.title, book.author, book.isbn, book.page_count, 
            book.status, book.date_finished, book.date_started, book.rating
          ];
          
          await client.query(query, values);
          insertedCount++;
        } catch (err) {
          console.error(`Failed to insert: ${book.title}`, err.message);
        }
      }

      console.log(`✅ Successfully imported ${insertedCount} books into Neon!`);
      await client.end();
    });
}

importData();