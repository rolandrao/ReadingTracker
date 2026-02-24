import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function MainLayout() {
  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <Navbar />

      {/* Removed the max-width restriction so it spans the whole screen */}
      <main className="flex-1 w-full p-6 md:p-8">
        <Outlet /> 
      </main>
    </div>
  );
}