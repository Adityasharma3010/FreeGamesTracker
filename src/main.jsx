import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { FavoritesProvider } from "./context/FavoritesContext.jsx";
import { SteamProvider } from "./context/SteamContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <FavoritesProvider>
        <SteamProvider>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <App />
          </BrowserRouter>
        </SteamProvider>
      </FavoritesProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
