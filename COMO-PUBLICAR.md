# 💇‍♀️ Agenda do Salão — Felipe & Roseli

Aplicativo simples de agenda compartilhada, feito para abrir no Safari do
iPhone e funcionar como um aplicativo instalado na tela inicial. Os dados
ficam salvos na nuvem (Firebase), então quando um sócio agenda, edita ou
exclui um horário, o outro vê a mudança automaticamente, em segundos.

---

## 📁 Estrutura do projeto

```
salao-agenda/
├── index.html            → as telas do app (início + agenda + formulários)
├── styles.css            → todo o visual (cores, fontes, layout)
├── app.js                → toda a lógica (navegação, busca, salvar/editar/excluir)
├── firebase-config.js    → onde você cola as chaves do SEU Firebase
├── manifest.json         → configurações do "Adicionar à Tela de Início"
├── service-worker.js     → permite o app abrir rápido e parecer nativo
└── icons/
    ├── icon-192.png       → ícone do app
    └── icon-512.png       → ícone do app (versão grande)
```

Você não precisa entender o código para usar o app. Basta seguir os passos
abaixo uma única vez.

---

## 1️⃣ Passo 1 — Criar o banco de dados na nuvem (Firebase, gratuito)

1. Acesse **https://console.firebase.google.com** e entre com uma conta Google
   (pode ser a do salão, do Felipe ou da Roseli).
2. Clique em **"Adicionar projeto"**, dê um nome (ex: `agenda-salao`) e
   finalize a criação (pode desativar o Google Analytics, não é necessário).
3. No menu da esquerda, clique em **"Compilação" → "Firestore Database"**.
4. Clique em **"Criar banco de dados"**.
   - Escolha a localização mais próxima (ex: `southamerica-east1`).
   - Selecione **"Iniciar no modo de produção"**.
5. Depois de criado, vá na aba **"Regras"** dentro do Firestore e troque o
   conteúdo por isto:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /agendamentos/{id} {
         allow read, write: if true;
       }
     }
   }
   ```

   Clique em **"Publicar"**.

   > ℹ️ Como o app não usa login (para ser mais simples para vocês dois),
   > essa regra deixa a agenda acessível para quem tiver o link do app.
   > Isso é tranquilo para o uso interno do salão. Se um dia vocês quiserem
   > mais segurança, é possível adicionar login depois.

6. Agora volte para a tela inicial do projeto (ícone de casa) e clique no
   ícone **"</>"** (Web) para criar um "app da Web".
   - Dê um nome (ex: `agenda-web`) e clique em **"Registrar app"**.
   - Você vai ver um bloco de código parecido com isto:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "agenda-salao.firebaseapp.com",
     projectId: "agenda-salao",
     storageBucket: "agenda-salao.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

7. Abra o arquivo **`firebase-config.js`** do projeto e troque os valores de
   exemplo pelos valores que o Firebase te deu. Depois disso, salve o arquivo.

Pronto! O banco de dados está criado e conectado.

---

## 2️⃣ Passo 2 — Publicar o app na internet (pelo iPad, sem terminal)

Vamos usar o **GitHub Pages**, que funciona inteiramente pelo Safari, só
tocando em botões — sem precisar arrastar pastas nem usar terminal.

### A) Extrair o arquivo zip no iPad

1. Baixe o arquivo `salao-agenda.zip` (ele fica salvo no app **Arquivos**,
   geralmente na pasta "Downloads")
2. Abra o app **Arquivos** do iPad, encontre o `salao-agenda.zip`
3. Toque nele uma vez — o iPad extrai automaticamente e cria uma pasta
   chamada `salao-agenda` no mesmo lugar

### B) Criar uma conta no GitHub

1. Abra o Safari e acesse **github.com**
2. Toque em **"Sign up"** e crie uma conta (usuário, e-mail e senha)

### C) Criar o repositório (o "espaço" onde os arquivos vão morar)

1. Já logado, toque no **"+"** no canto superior direito → **"New repository"**
2. Em "Repository name", digite: `agenda-salao`
3. Marque a opção **"Public"**
4. Marque a caixinha **"Add a README file"**
5. Toque em **"Create repository"**

### D) Enviar os arquivos do app

1. Na página do repositório, toque no botão **"Add file"** → **"Upload files"**
2. Toque na área de upload — isso abre o seletor de arquivos do iPad
3. Navegue até a pasta `salao-agenda` (a que foi extraída no passo A)
4. Selecione **todos os arquivos de dentro dela** (toque em "Selecionar",
   depois toque em cada arquivo, ou em "Selecionar tudo") e toque em **"Abrir"**
   - São 8 arquivos: `index.html`, `styles.css`, `app.js`, `firebase-config.js`,
     `manifest.json`, `service-worker.js`, `icon-192.png`, `icon-512.png`
     (o `COMO-PUBLICAR.md` pode subir também, não tem problema)
5. Role até o final da página e toque em **"Commit changes"**

### E) Ativar o GitHub Pages

1. Na página do repositório, toque em **"Settings"**
2. No menu da esquerda, toque em **"Pages"**
3. Em "Source", escolha o branch **"main"** e a pasta **"/ (root)"**
4. Toque em **"Save"**
5. Espere 1 a 2 minutos e atualize a página — vai aparecer uma frase do tipo
   **"Your site is live at https://seu-usuario.github.io/agenda-salao/"**

Esse link é o endereço do app! Me envie esse link aqui para eu confirmar que
está tudo certo antes de instalar no iPhone do Felipe e da Roseli.

> 💡 Se você tiver um Mac ou PC disponível no futuro, também é possível
> publicar pelo **Firebase Hosting** ou **Netlify**, que têm um passo a
> passo mais rápido — veja no final deste guia, na seção "Alternativas para
> computador".

---

---

## 3️⃣ Passo 3 — Abrir no iPhone e adicionar à Tela de Início

Tanto o Felipe quanto a Roseli devem fazer isso uma vez, no próprio iPhone:

1. Abra o **Safari** (precisa ser o Safari, não o Chrome) e digite o link
   do app (ex: `https://agenda-salao.web.app`).
2. Toque no ícone de **compartilhar** (o quadrado com uma seta para cima,
   na parte de baixo da tela).
3. Role a lista de opções e toque em **"Adicionar à Tela de Início"**.
4. Confirme o nome (ex: "Agenda Salão") e toque em **"Adicionar"**.

Agora vai aparecer um ícone na tela inicial do iPhone, igual a um aplicativo
normal. Ao abrir por esse ícone, o app abre em tela cheia, sem a barra do
Safari — exatamente como um app de loja.

---

## 4️⃣ Como usar no dia a dia

- Ao abrir o app, toque em **Felipe** ou **Roseli** para entrar na agenda
  da pessoa desejada.
- Use as setinhas **‹ ›** para trocar de semana, e toque em um dia para ver
  os horários daquele dia.
- Toque no botão **"+"** (canto inferior direito) para criar um novo
  agendamento.
- Toque no lápis ✏️ em um agendamento para editar, ou na lixeira 🗑️ para
  excluir (o app sempre pede confirmação antes de excluir).
- Use o campo de busca no topo para encontrar rapidamente uma cliente pelo
  nome, em qualquer dia.
- Lembre-se: tanto Felipe quanto Roseli podem editar a agenda um do outro —
  é assim mesmo, de propósito, já que são sócios.

Tudo o que for salvo aparece automaticamente no celular do outro sócio em
poucos segundos, sem precisar atualizar a página.

---

## ❓ Dúvidas comuns

**"O app abriu, mas a agenda não carrega / dá erro ao salvar."**
Confira se os valores em `firebase-config.js` foram colados corretamente e
se as regras do Firestore foram publicadas (Passo 1, itens 5 a 7).

**"Posso usar no Android também?"**
Sim. No Chrome do Android, abra o link e toque no menu (⋮) → "Adicionar à
tela inicial". O app funciona igual.

**"Os dados ficam salvos para sempre?"**
Sim, ficam guardados no Firestore (nuvem do Google) até que alguém os
exclua dentro do próprio app.

---

## 🖥️ Alternativas para quem tiver um Mac ou PC

Se em algum momento vocês tiverem acesso a um computador, publicar fica
ainda mais rápido com o **Firebase Hosting**:

1. Instale: `npm install -g firebase-tools`
2. Na pasta do projeto, rode: `firebase login`
3. Depois: `firebase init hosting` (escolha o projeto já criado, pasta
   pública `.`, responda **No** para "single-page app" e para sobrescrever
   o `index.html`)
4. Publique com: `firebase deploy`

Ou, mais simples ainda: acesse **netlify.com**, crie conta, e arraste a
pasta `salao-agenda` inteira para a área de "Deploy manually". Em segundos
você recebe um link `https://...netlify.app`.
