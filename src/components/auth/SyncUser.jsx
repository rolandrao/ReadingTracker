import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import sql from "../../lib/db"; // <-- Updated path to step back twice!

export default function SyncUser() {
  const { user, isLoaded } = useUser();
  const hasSynced = useRef(false);

  useEffect(() => {
    async function syncWithNeon() {
      // Wait until Clerk has fully loaded the user data
      if (!isLoaded || !user || hasSynced.current) return;

      try {
        // Upsert: Insert the user if they don't exist, ignore if they do
        await sql`
          INSERT INTO users (id, username, avatar_url)
          VALUES (
            ${user.id}, 
            ${user.fullName || user.firstName || "Anonymous Reader"}, 
            ${user.imageUrl}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
        
        hasSynced.current = true;
        console.log("✅ User synced to Neon Vault!");
      } catch (error) {
        console.error("❌ Failed to sync user to Neon:", error);
      }
    }

    syncWithNeon();
  }, [user, isLoaded]);

  // This component is completely invisible to the user
  return null; 
}