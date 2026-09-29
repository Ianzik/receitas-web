# Conexão Google

Esta integração está preparada, mas ainda precisa de um cliente OAuth e de um teste com a conta proprietária antes de ser publicada.

1. No Google Cloud, crie ou escolha um projeto e ative **Google Sheets API** e **Google Drive API**.
2. No Google Auth Platform, configure o aplicativo como externo, em teste, e adicione apenas a sua conta como usuário de teste.
3. Crie um cliente OAuth do tipo **Aplicativo da Web**, com a origem JavaScript autorizada `https://ianzik.github.io`. Não inclua `/receitas-web/` na origem. O fluxo usa uma janela de autorização e não precisa de um servidor de redirecionamento.
4. Copie apenas o **ID do cliente**, terminado em `.apps.googleusercontent.com`, para `clientId` em `config.js`. Não coloque segredo de cliente, senha ou token no repositório.
5. Autorize o aplicativo, teste leitura, fotos, edição e atualização da planilha e então publique esta versão no GitHub Pages.

O código pede os escopos `spreadsheets` e `drive.readonly`. Essas permissões permitem editar planilhas e ler arquivos da conta, não ficam restritas apenas a este caderno. O aplicativo usa somente a planilha configurada e os IDs das fotos nela registrados. A aprovação acontece na tela do Google. Os tokens ficam apenas na memória da página e expiram. Fechar/recarregar a página exige entrar novamente.

O site público contém código e identificadores de configuração. As receitas e fotos continuam privadas no Google. Não publicar a planilha na Web nem alterar o compartilhamento para “qualquer pessoa”.

## Atualizar receitas

Use o aplicativo ou peça a atualização pelo chat. A aba `Receitas` tem uma receita por linha. As colunas A:I são campos de edição usuais. J guarda IDs das fotos, K identifica a receita, L preserva o original, M guarda avisos, N preserva campos estruturados e O permite recuperar exclusões.

Preserve os títulos do cabeçalho. Use uma linha por ingrediente e uma linha por etapa. Não altere IDs existentes. Para adicionar pelo chat, gere um ID novo e preencha uma linha com a mesma estrutura. Antes de editar, releia a linha atual e modifique apenas os campos pedidos. As colunas legíveis prevalecem sobre os metadados na leitura do aplicativo.

O botão **Atualizar caderno** busca mudanças feitas pelo chat ou na planilha. Excluir no aplicativo marca `Excluída` como verdadeiro. Desmarque a célula correspondente para recuperar a receita.

Antes de salvar, o aplicativo relê a linha e recusa uma versão que já tenha sido alterada. Isso detecta edições ocorridas desde a abertura, mas a API do Sheets não oferece comparação e gravação atômicas neste fluxo. Evite editar a mesma receita em duas sessões ao mesmo tempo.

## Validação

`node tests/google-store.cjs` testa as operações com uma API simulada. Os testes não validam consentimento OAuth nem as permissões reais da conta. O teste de navegador também usa dados fictícios, sem receitas ou tokens reais.

Referências oficiais:

- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/sheets/api/quickstart/js
