# Deploy no Render com SQLite

O serviço usa SQLite no arquivo definido por `DATABASE_PATH`. O Blueprint `render.yaml` cria um Web Service Node com `npm install`, `npm start`, Node 22 e health check em `/health`.

## Publicar

1. Envie o projeto para um repositório GitHub.
2. No Render, crie um **Blueprint** e conecte esse repositório.
3. Confirme a criação do serviço `minha-profissao-de-fe` e aguarde o deploy.
4. Abra a URL `.onrender.com` informada pelo Render. A interface e a API são servidas pelo mesmo serviço.

Não é necessário cadastrar credenciais Google, configurar URL de API no frontend ou configurar CORS para esse modelo.

## Persistência no plano gratuito

O disco local de um Web Service gratuito do Render é efêmero. A aplicação funciona e grava no SQLite enquanto a instância e o disco atual existirem, mas os dados podem ser apagados quando o serviço reiniciar, for suspenso, reconstruído ou implantado novamente. Faça exportações de segurança regularmente.

Para manter o SQLite após deploys, use um plano do Render que permita disco persistente e monte o disco, por exemplo em `/var/data`. Configure `DATABASE_PATH=/var/data/profissoes_fe.db` nas variáveis do serviço. Confirme os preços e limites atuais do Render antes de escolher o plano.

## Health check

O Render consulta `/health`. A resposta `{"status":"ok"}` indica que o processo Express iniciou; ela não testa disponibilidade nem permissão do arquivo SQLite.