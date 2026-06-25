// =========================================================================
// CONFIGURAÇÃO DO FIREBASE
// =========================================================================
// Aqui você cola as informações do SEU projeto Firebase.
// Veja no arquivo COMO-PUBLICAR.md, passo a passo, onde encontrar esses dados.
//
// Depois de criar o projeto no Firebase, vá em:
//   Configurações do projeto (ícone de engrenagem) > Geral > Seus apps > Web
// e copie os valores para dentro das aspas abaixo.
// =========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBuiwVC54P37MZgi7bi8VoH70H138z0WyE",
  authDomain: "agenda-salao-436b1.firebaseapp.com",
  projectId: "agenda-salao-436b1",
  storageBucket: "agenda-salao-436b1.firebasestorage.app",
  messagingSenderId: "1092286918194",
  appId: "1:1092286918194:web:7209630a920aa63a55562b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
