# Minha Profissão de Fé

Mural coletivo de profissões de fé integrado em tempo real com o **Firebase Cloud Firestore**.

## Publicação

O workflow em `.github/workflows/deploy-pages.yml` publica os arquivos estáticos (`index.html`, `app.js`, `style.css` e mídias) para o GitHub Pages.

## Arquitetura de Dados

- **Banco de Dados**: Cloud Firestore (Google Firebase).
- **Tempo Real**: Atualizações dinâmicas através de `onSnapshot` da coleção `declarations`.
- **Interações**: Adição de profissões de fé, contagem de "Amém" e exclusão protegida por autor.

