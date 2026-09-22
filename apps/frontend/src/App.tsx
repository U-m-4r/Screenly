import "../styles/globals.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Form } from "./components/Form";
import { Interview } from "./components/Interview";
import { Result } from "./components/Result";
import { useState } from "react";
import { Toaster } from "sonner";
import { BrowserRouter, Route, Routes } from "react-router";

export function App() {
  const [page,setPage] = useState<"form" | "interview" | "results">("form");

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Form />} />
        <Route path="/interview/:id" element={<Interview />} />
        <Route path="/results/:id" element={<Result />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>   
  );  
}

export default App;
