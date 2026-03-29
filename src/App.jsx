import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import SyncUser from "./components/auth/SyncUser"; 
import Navbar from "./components/Navbar";

// Page Imports
import Home from "./pages/Home";
import Library from "./pages/Library";
import Search from "./pages/Search";
import Social from "./pages/Social";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        
        {/* LOGGED OUT VIEW */}
        <SignedOut>
          <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-zinc-950">
            <div className="mb-8 text-center">
              <h1 className="text-5xl font-black italic tracking-tighter text-white mb-2">The Vault</h1>
              <p className="text-zinc-400 font-medium">Log in to sync your reading journey.</p>
            </div>
            
            <SignIn routing="hash" appearance={{
              elements: {
                formButtonPrimary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
                card: 'bg-zinc-900 border border-zinc-800 shadow-2xl',
                headerTitle: 'text-zinc-100',
                headerSubtitle: 'text-zinc-400',
                socialButtonsBlockButton: 'text-zinc-100 border-zinc-700 hover:bg-zinc-800',
                socialButtonsBlockButtonText: 'text-zinc-100 font-medium',
                dividerLine: 'bg-zinc-800',
                dividerText: 'text-zinc-500',
                formFieldLabel: 'text-zinc-300',
                formFieldInput: 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-zinc-700',
                footerActionLink: 'text-zinc-300 hover:text-white',
                identityPreviewText: 'text-zinc-300',
                identityPreviewEditButton: 'text-zinc-400 hover:text-zinc-200'
              }
            }} />
          </div>
        </SignedOut>

        {/* LOGGED IN VIEW */}
        <SignedIn>
          <SyncUser /> 
          
          {/* Navbar sits at the top of the layout */}
          <Navbar />

          {/* The Routes determine which page loads below the Navbar */}
          <main className="flex-1 flex flex-col relative overflow-hidden">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/library" element={<Library />} />
              <Route path="/search" element={<Search />} />
              <Route path="/social" element={<Social />} />
              <Route path="/analytics" element={<Dashboard />} />
              
              {/* Catch-all redirect to Home if they type a bad URL */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </SignedIn>
        
      </div>
    </BrowserRouter>
  );
}