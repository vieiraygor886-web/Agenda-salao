// Service Worker básico - guarda o "app shell" para abrir rápido
// e funcionar como aplicativo instalado no iPhone.
// Os dados da agenda NÃO passam por aqui: eles vêm direto do Firebase,
// sempre atualizados em tempo real.

const CACHE_NAME = "agenda-salao-v1";

const ARQUIVOS_PARA_GUARDAR = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./firebase-config.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Quando o Service Worker é instalado, guarda os arquivos principais
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_PARA_GUARDAR))
  );
  self.skipWaiting();
});

// Remove caches antigos quando uma nova versão é publicada
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: para os arquivos do próprio app, tenta a rede primeiro
// e usa o cache como reserva (assim sempre haverá algo na tela, mesmo
// sem internet). Pedidos para o Firebase (google/firestore) seguem
// direto pela rede, sem passar pelo cache.
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  const ehFirebase =
    url.includes("firestore.googleapis.com") ||
    url.includes("googleapis.com") ||
    url.includes("gstatic.com/firebasejs");

  if (ehFirebase) {
    return; // deixa passar normalmente, sem interceptar
  }

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resposta;
      })
      .catch(() => caches.match(event.request))
  );
});
