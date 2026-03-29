import { NavLink } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

export default function Navbar() {
  const linkStyle = ({ isActive }) => 
    `text-sm font-bold uppercase tracking-widest transition-colors px-3 py-2 rounded-lg ${
      isActive 
        ? "text-amber-500 bg-amber-500/10" 
        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
    }`;

  return (
    <nav className="w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / App Name */}
          <div className="flex-shrink-0">
            <span className="text-xl font-black italic tracking-tighter text-white">Roland's Reading Room</span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex space-x-2">
            <NavLink to="/" className={linkStyle}>Home</NavLink>
            <NavLink to="/library" className={linkStyle}>Library</NavLink>
            <NavLink to="/search" className={linkStyle}>Search</NavLink>
            <NavLink to="/social" className={linkStyle}>Social</NavLink>
            <NavLink to="/analytics" className={linkStyle}>Analytics</NavLink>
          </div>

          {/* Clerk Avatar Profile (Safely embedded in the layout!) */}
          <div className="flex items-center gap-4">
            <UserButton 
              afterSignOutUrl="/" 
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-9 h-9 border-2 border-zinc-800 shadow-sm hover:border-zinc-600 transition-colors"
                }
              }}
            />
          </div>

        </div>
      </div>

      {/* Mobile Navigation (Scrollable horizontally) */}
      <div className="md:hidden flex overflow-x-auto [scrollbar-width:none] px-4 py-2 space-x-2 border-t border-zinc-800/50">
        <NavLink to="/" className={linkStyle}>Home</NavLink>
        <NavLink to="/library" className={linkStyle}>Library</NavLink>
        <NavLink to="/search" className={linkStyle}>Search</NavLink>
        <NavLink to="/social" className={linkStyle}>Social</NavLink>
        <NavLink to="/analytics" className={linkStyle}>Analytics</NavLink>
      </div>
    </nav>
  );
}