import { BrowserRouter as Router, Routes, Route } from "react-router";
import HomePage from "@/react-app/pages/Home";
import Dashboard from "@/react-app/pages/Dashboard";

export default function App() {
  const isDashboard = new URLSearchParams(window.location.search).get('dashboard') === 'orders';

  return (
    <Router>
      <Routes>
        <Route path="/" element={isDashboard ? <Dashboard /> : <HomePage />} />
      </Routes>
    </Router>
  );
}
