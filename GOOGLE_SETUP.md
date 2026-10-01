# Conexão Google

Esta integração está preparada, mas ainda precisa de um cliente OAuth e de um teste com a conta proprietária antes de ser publicada.

1. No Google Cloud, crie ou escolha um projeto e ative **Google Sheets API**.
2. No Google Auth Platform, configure o aplicativo como externo, em teste, e adicione apenas a sua conta como usuário de teste.
3. Crie um cliente OAuth do tipo **Aplicativo da Web**, com a origem JavaScript autorizada `https://ianzik.github.io`. Não inclua `/receitas-web/` na origem. O fluxo usa uma janela de autorização e não precisa de um servidor de redirecionamento.
4. Copie apenas o **ID do cliente**, terminado em `.apps.googleusercontent.com`, para `clientId` em `config.js`. Não coloque segredo de cliente, senha ou token no repositório.
5. Autorize o aplicativo, teste leitura, miniaturas, edição e atualização da planilha e então publique esta versão no GitHub Pages.

O código pede somente `spreadsheets`. Tokens ficam na memória, nunca no armazenamento persistente. A cópia das receitas permite consultar sem repetir login; atualizar ou salvar solicita autorização quando necessário. Sair remove o catálogo deste aparelho.

As receitas e a planilha continuam privadas. O repositório contém código e WebP de capas obtidas dos links de origem. O manifesto contém hashes e caminhos, sem textos privados ou URLs de origem. Não publique a planilha, o JSON privado ou credenciais.

## Atualizar receitas

Use o aplicativo ou peça a atualização pelo chat. A aba `Receitas` tem uma receita por linha. As colunas A:I são campos de edição usuais. J (`Thumb local`) guarda o caminho WebP, K identifica a receita, L preserva o original, M guarda avisos, N preserva campos estruturados e O permite recuperar exclusões.

Preserve os títulos do cabeçalho. Use uma linha por ingrediente e uma linha por etapa. Não altere IDs existentes. Para adicionar pelo chat, gere um ID novo e preencha uma linha com a mesma estrutura. Antes de editar, releia a linha atual e modifique apenas os campos pedidos. As colunas legíveis prevalecem sobre os metadados na leitura do aplicativo.

O botão **Atualizar caderno** busca mudanças feitas pelo chat ou na planilha. Excluir no aplicativo marca `Excluída` como verdadeiro. Desmarque a célula correspondente para recuperar a receita.

Antes de salvar, o aplicativo relê a linha e recusa uma versão que já tenha sido alterada. Isso detecta edições ocorridas desde a abertura, mas a API do Sheets não oferece comparação e gravação atômicas neste fluxo. Evite editar a mesma receita em duas sessões ao mesmo tempo.

## Validação

`node tests/google-store.cjs` testa as operações com uma API simulada. Os testes não validam consentimento OAuth nem as permissões reais da conta. O teste de navegador também usa dados fictícios, sem receitas ou tokens reais.

Referências oficiais:

- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/sheets/api/quickstart/js

## Miniaturas

Dependência: `python -m pip install -r scripts/requirements.txt`.

```sh
python scripts/gerar_thumbs.py --input /privado/receitas.json --output /privado/receitas-atualizadas.json --review /privado/revisar.json
python scripts/gerar_thumbs.py --url 'https://www.instagram.com/reel/EXEMPLO/' --input /privado/receitas.json --output /privado/receitas-atualizadas.json --review /privado/revisar.json
```

O input pode ser uma lista de registros ou linhas da planilha. O script salva `thumbnail` e remove o campo antigo. Aplique somente J/N da saída após reler as linhas na planilha. Publique WebP e manifesto, nunca arquivos privados. Existing WebP válidos são preservados; somente faltantes são processados. Até três workers e pausa padrão de dois segundos entre requisições.

Também aceita `--url LINK` sem input, para gerar uma capa nova e atualizar o manifesto. Uma receita com o mesmo link passa a encontrá-la ao abrir o catálogo; grave o caminho em J/N ao atualizar o registro. Se o acesso direto exigir sessão, obtenha a capa no navegador autorizado e use `--url LINK --cover-file /privado/capa.jpg` ou `--covers /privado/capas.json` (mapa link -> arquivo local/URL temporária). Nunca publique URLs assinadas, credenciais ou esse mapa. Não contorne verificações de acesso.

Você pode pedir tudo pelo chat: “gere a thumb deste link e atualize a planilha”; não precisa rodar no seu computador. O site estático não consegue baixar capas automaticamente ao cadastrar, por isso o script acompanha o projeto. Links sem capa usam o fallback do estilo atual.

A recuperação também aceita `--sources /privado/origens-conferidas.json`, um mapa de ID da receita para a página original confirmada por título e ingredientes. O campo `thumbnail_source_url` preserva essa referência nos metadados, sem substituir G nem os textos. O script consegue reutilizá-la nas próximas execuções sem repetir o mapa. Links válidos do YouTube usam a capa oficial do vídeo, baixada e convertida para WebP local. Busca pública serve para localizar a mesma receita; uma imagem apenas semelhante não é usada.
