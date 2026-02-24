import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/library" element={<Library />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;