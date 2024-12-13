import React from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Recipes from "./pages/Recipes";
import Reference from "./pages/Reference";
import Checklists from "./pages/Checklists";
import SafetyLog from "./pages/SafetyLog";
import Inventory from "./pages/Inventory";
import Specials from "./pages/Specials";
import Calculator from "./pages/Calculator";
import Maintenance from "./pages/Maintenance";



function App() {

  return (
    <Router>
      <Sidebar />
      <Routes>
      <Route path="/" element={<Recipes />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/reference" element={<Reference />} />
        <Route path="/checklists" element={<Checklists />} />
        <Route path="/safetyLog" element={<SafetyLog />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/specials" element={<Specials />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="*" element={<Recipes />} />
              </Routes>
    </Router>
  );
}

export default App;
