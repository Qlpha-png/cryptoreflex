module.exports = {
  plugins: {
    // Lot A1 (06/10/2026) : inline « @import "./styles/tokens.css" » de app/globals.css dans la même feuille.
    // Sans lui, Next émet les jetons dans un 2e fichier CSS (une requête bloquante de plus sur chaque page).
    // postcss-import est une dépendance de tailwindcss (même version épinglée dans package-lock.json).
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
