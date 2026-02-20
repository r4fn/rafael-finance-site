# Escolha Certa — Simulador PIX × Cartão

> Descubra a melhor forma de pagar: PIX, cartão à vista ou parcelado.  
> Funciona offline e pode ser instalado como app no Android e iPhone.

## 🗂️ Estrutura dos arquivos

```
├── index.html      ← Aplicação principal
├── manifest.json   ← Metadados PWA
├── sw.js           ← Service worker (cache offline)
├── icon-192.png    ← Ícone 192×192
└── icon-512.png    ← Ícone 512×512
```

---

## 🚀 Como publicar no GitHub Pages

### 1. Crie o repositório

1. Acesse [github.com](https://github.com) e faça login  
2. Clique em **New repository**  
3. Dê um nome (ex.: `escolha-certa`)  
4. Deixe **Public** e clique em **Create repository**

### 2. Envie os arquivos

**Opção A — pelo próprio GitHub (mais fácil):**

1. Na página do repositório, clique em **uploading an existing file**  
2. Arraste todos os arquivos (`index.html`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`)  
3. Clique em **Commit changes**

**Opção B — pelo terminal (Git):**

```bash
git init
git add .
git commit -m "Adiciona PWA Escolha Certa"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/escolha-certa.git
git push -u origin main
```

### 3. Ative o GitHub Pages

1. No repositório, vá em **Settings → Pages**  
2. Em **Source**, selecione **Deploy from a branch**  
3. Selecione o branch **main** e a pasta **/ (root)**  
4. Clique em **Save**  
5. Aguarde ~1 minuto — a URL aparecerá como:  
   `https://SEU_USUARIO.github.io/escolha-certa/`

---

## 📱 Como instalar no celular

### Android (Chrome)
O app exibirá automaticamente um banner **"Adicionar à tela inicial"** na primeira visita.  
Se não aparecer: menu ⋮ → **Adicionar à tela inicial**

### iPhone / iPad (Safari)
O iOS não suporta o banner automático — instrua o usuário:  
1. Abra o link no **Safari**  
2. Toque em **Compartilhar** (ícone de caixa com seta ↑)  
3. Role e toque em **Adicionar à Tela de Início**  
4. Confirme em **Adicionar**

> ⚠️ No iPhone, o app só funciona pelo **Safari**. Chrome/Firefox no iOS não permitem instalação de PWA.

---

## ✅ Checklist pós-publicação

- [ ] Abrir a URL HTTPS no Chrome Android e verificar o banner de instalação  
- [ ] Instalar e abrir como app standalone (sem barra de navegador)  
- [ ] Desativar o Wi-Fi e verificar que o app carrega offline  
- [ ] Testar no iPhone via Safari → Compartilhar → Adicionar à Tela de Início

---

## 🔄 Como atualizar o app

Edite os arquivos e faça um novo commit/push. O service worker atualizará automaticamente na próxima vez que o usuário abrir o app com internet.  
Para forçar uma atualização imediata, incremente a versão do cache em `sw.js`:
```js
const CACHE = 'escolha-certa-v2'; // mude o número
```
