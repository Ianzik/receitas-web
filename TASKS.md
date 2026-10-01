# Miniaturas das receitas

## Método atual mapeado antes da mudança

Aplicativo estático em HTML/CSS/JavaScript puro no GitHub Pages. `app.js` renderiza cards, busca, favoritos e detalhe. `google-store.js` lê a aba Receitas da planilha privada: G é `source_url`, J guardava IDs de fotos do Drive, N repetia o campo `images` nos metadados. Cards e detalhe carregavam blobs por `GoogleStore.photo`, fila/IntersectionObserver e cache IndexedDB. As imagens antigas ficavam no Drive, sem fotos de receitas no repositório. `icon.svg` é o ícone do app e permanece.

## Backup anterior às mudanças

Código preservado na branch `backup/pre-thumbnails-20260930`, commit `d522c9efc491a99e5dfcd3d5b9625327fc7e5986`. Planilha duplicada e cópia privada de código, dados e fotos preservada. O inventário individual dos arquivos fica somente no relatório privado, sem exposição no repositório público.

## Checklist

- [x] Mapear método atual e fazer backup.
- [x] Definir solução e testar três links antes do lote.
- [x] Implementar script idempotente para lote e link individual.
- [x] Migrar dados e gerar todas as miniaturas possíveis.
- [x] Remover método antigo e verificar todas as telas.
- [x] Testar execução e conferir desktop/celular com fallback; entregar capturas e revisar.

## Solução

WebP local em 16:9, até 640×360 e abaixo de 60 KB. Caminho `thumbnail` em J/N e manifesto com hashes dos links para atualizar cópias do aparelho sem repetir login. Sem hotlinks, URLs assinadas, credenciais ou dados privados no repositório. Até três workers e pausa global entre solicitações. Layout reserva espaço, imagens usam lazy loading/alt do título, falhas mostram o símbolo neutro do estilo atual. Detalhe usa a mesma miniatura. Nenhuma mudança de fontes, cores ou espaçamento fora da área de imagem.

## Remoções previstas antes da exclusão

- `browser-store.js`, legado não carregado pelo HTML atual; preservado no backup.
- Campo images nos registros ativos, leitura de arquivos do Drive, fila/observer de fotos, blobs e escopo Drive no login.
- As 22 imagens antigas serão apenas arquivadas no backup privado (14.324.166 bytes), sem exclusão definitiva. Não há imagem antiga a apagar do repositório.

## Resultado da primeira passagem

Publicado no GitHub Pages pela PR #4. 160 receitas ativas processadas, 109 links únicos: 29 miniaturas locais e 131 fallbacks. Instagram: 15 capas obtidas de 16 links; o restante estava indisponível. WebP: 883.784 bytes no total, cada arquivo abaixo de 60 KB. Fotos anteriores: 14.324.166 bytes, preservadas em backup; 1 arquivo de código removido (`browser-store.js`) e 22 fotos arquivadas, nenhuma foto excluída definitivamente.

Planilha: J virou Thumb local; caminhos e metadados foram gravados e relidos. Todas as demais células foram comparadas com o estado anterior e permaneceram iguais. O campo images foi retirado dos metadados. Busca, favoritos, detalhe, cache e importação usam somente thumbnail; meta tags não dependiam das fotos antigas.

Testes de Python (lote, link individual e idempotência), JavaScript e Chromium passaram no GitHub Actions. Publicação do Pages confirmada. Conferência visual do código publicado em 1280 px e 390 px, com o catálogo privado carregado somente na memória do navegador: 160 cards, 29 imagens locais e 131 placeholders, sem overflow horizontal no celular. Capturas e arquivo revisar com motivos entregues privadamente. O catálogo e o relatório de links não foram publicados no repositório.

## Limitações explicitamente não confirmadas

O login Google real não foi reconfirmado nesta sessão: a tela pública e o código foram inspecionados no navegador; o fluxo de autenticação e operações foi coberto pelos testes automatizados. As capturas usam o catálogo em memória, não uma sessão Google autenticada. A planilha foi verificada por releitura da API, sem conferência visual da grade nativa.

Links privados/apagados, URLs ausentes ou incompletas, TikTok com verificação de acesso, páginas sem capa e fontes ainda não confirmadas receberam fallback. Os motivos por receita estão em revisar. Não houve tentativa de contornar verificações de acesso.

## Descobertas além do pedido

Há origens apontando para produtos, acompanhamentos ou páginas diferentes da receita, além de links incompletos e caracteres invisíveis. Os links originais e os textos das receitas foram preservados. O script permite fornecer uma capa obtida manualmente para completar esses casos e não baixa novamente miniaturas válidas.

## Segunda busca de capas

- [x] Preservar código na branch `backup/pre-search-recovery-20261001` e duplicar a aba como Antes da segunda busca.
- [x] Testar três capas oficiais do YouTube antes do lote.
- [x] Pesquisar links e títulos pendentes, conferindo autores, ingredientes e preparo.
- [x] Recuperar capas das páginas originais, catálogo público do autor e publicações equivalentes do mesmo autor.
- [x] Gerar WebP local e preservar links e conteúdo das receitas.
- [x] Testar lote, link individual, idempotência e persistência da origem confirmada na planilha.
- [x] Publicar, aplicar J/N, reler e conferir visualmente desktop/celular.
- [x] Preparar relatórios privados de recuperadas e pendências e capturas para entrega.

Resultado desta busca: 65 novas capas; 94 de 160 receitas com thumb, 66 fallbacks. Imagens locais: 3.267.052 bytes. Nenhum arquivo antigo adicional removido. O método anterior já tinha sido retirado na primeira migração. As imagens assinadas do Instagram foram baixadas; nenhuma URL temporária é usada no card.

Buscas nos índices públicos localizaram fontes que a leitura direta não alcançava. O servidor oficial img.youtube.com funcionou para os vídeos originais. Catálogo Roti, páginas Panelinha e Lena Mattar e publicações correspondentes dos próprios autores permitiram recuperar outras capas. Receitas com origem ausente ou incorreta ganharam referência de proveniência somente nos metadados. As demais mantêm fallback; imagens de receitas diferentes foram rejeitadas.

Não confirmado nesta passagem: obtenção das imagens de três receitas de Brian Lagerstrom cujas páginas foram identificadas. O download direto retornou 403 neste ambiente; uma imagem abriu no navegador, mas o download de mídia não produziu arquivo. Também não foi possível confirmar capas das demais pendências por link ou título. O relatório privado registra esses motivos.

Segunda passagem publicada no commit `f27c1590267bb8e54c9687622c6f63821227f708`. Google catalog tests e Pages build/deployment concluídos com sucesso. Cinco testes de Python passaram, incluindo lote, link individual e nova execução sem o mapa de origens. JavaScript e Chromium passaram no GitHub Actions.

Planilha atualizada em 65 receitas, somente J/N. Releitura integral confirmou 160 receitas ativas, 94 caminhos locais e 66 fallbacks. Todos os valores corresponderam à atualização esperada; formatos, validações e chips foram preservados. Capturas do aplicativo publicado com catálogo em memória confirmaram desktop (iframe de 1280 px, área útil de 1265 px) e celular (iframe de 390 px, área útil de 375 px), 94 imagens, 66 fallbacks e ausência de overflow horizontal. Fallback visível em ambas as capturas. Nenhum erro do aplicativo foi observado; o navegador registrou somente mensagens de sua extensão.

Relatórios privados: recuperadas.csv com as 65 novas capas, revisar-segunda-busca.csv com as 66 pendências e os motivos; TASKS-recuperacao.md e capturas. Nada disso exige execução no computador do usuário. Após abrir a versão atualizada, Atualizar caderno traz os metadados novos para a cópia do aparelho.

A conferência também mostrou parágrafos inteiros no campo de porções de algumas receitas e registros sem ingredientes catalogados. Esses dados foram preservados; valem uma revisão separada dos textos importados.
