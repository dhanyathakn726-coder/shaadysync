
import React from "react";
import { createRoot } from "react-dom/client";
import GuestRSVP from "./GuestRSVP";
import "./GuestRSVP.css";

createRoot(document.getElementById("guest-root")).render(
  <React.StrictMode>
    <GuestRSVP />
  </React.StrictMode>
);
