import React from "react";
import ReactDOM from "react-dom/client";
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
          <App />
        </SteamProvider>
      </FavoritesProvider>
    </ThemeProvider>
  </React.StrictMode>
);
