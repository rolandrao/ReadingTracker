import { Link, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  
  // Bring in the theme state and the setter function
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 transition-colors duration-300">
      <div className="flex h-16 w-full items-center justify-between px-6 md:px-8">
        
        {/* Left Side */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              📚 ReadTracker
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-50 ${isActive("/") ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}`}>
              Dashboard
            </Link>
            <Link to="/library" className={`text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-50 ${isActive("/library") ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}`}>
              Virtual Bookshelf
            </Link>
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Sync Active
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {/* Avatar Placeholder */}
          <div className="h-8 w-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-sm font-bold text-white dark:text-zinc-900 cursor-pointer">
            ME
          </div>
        </div>
        
      </div>
    </header>
  );
}