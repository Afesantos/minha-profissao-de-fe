# Minha Profissão de Fé no GitHub Pages

Esta é uma aplicação estática. `declarations.json` contém o mural inicial publicado; não há servidor Node, SQLite ou Google Sheets nesta versão.

## Publicação

O workflow em `.github/workflows/deploy-pages.yml` publica `index.html`, `app.js`, `style.css`, `declarations.json` e os recursos visuais/áudio. Envie esses arquivos ao GitHub e habilite GitHub Pages usando GitHub Actions.

## Como os dados são guardados

GitHub Pages serve arquivos somente para leitura. Cada navegador carrega `declarations.json` na primeira visita e guarda as alterações em `localStorage` daquele navegador. Publicações, Améns e exclusões não são automaticamente compartilhados com outros visitantes nem gravados no arquivo do repositório.

Use **Exportar JSON** para baixar as alterações feitas naquele navegador e **Importar JSON** para carregar um backup neste navegador. Para atualizar o mural público, revise o JSON exportado e substitua `declarations.json` no repositório com uma alteração/commit. Após o workflow concluir, visitantes sem dados locais novos verão a versão publicada.

O token de exclusão fica somente no navegador que publicou e não é incluído no JSON exportado. Por isso, uma declaração importada em outro navegador não ganha autorização de exclusão do autor original.

## Dados migrados

O `declarations.json` inicial preserva as sete profissões que estavam no SQLite quando a migração foi feita. A profissão de Habacuque permanece fixada no topo.
