// src/lib/db.js
import { neon } from '@neondatabase/serverless';

// In Vite, environment variables MUST start with VITE_ 
// and are accessed via import.meta.env
const connectionString = import.meta.env.VITE_DATABASE_URL;

if (!connectionString) {
  console.error("❌ Database connection string is missing! Make sure VITE_DATABASE_URL is in your .env file.");
}

const sql = neon(connectionString);

export default sql;