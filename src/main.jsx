import React from "react";
import { createRoot } from "react-dom/client";
import Steer from "./Steer.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Steer />
  </React.StrictMode>
);
