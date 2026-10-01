# Miniaturas das receitas

## Método atual mapeado antes da mudança

Aplicativo estático em HTML/CSS/JavaScript puro no GitHub Pages. `app.js` renderiza cards, busca, favoritos e detalhe. `google-store.js` lê a aba Receitas da planilha privada: G é `source_url`, J guardava IDs de fotos do Drive, N repetia o campo `images` nos metadados. Cards e detalhe carregavam blobs por `GoogleStore.photo`, fila/IntersectionObserver e cache IndexedDB. As imagens antigas ficavam no Drive, sem fotos de receitas no repositório. `icon.svg` é o ícone do app e permanece.

## Backup anterior às mudanças

Código preservado na branch `backup/pre-thumbnails-20260930`, commit `d522c9efc491a99e5dfcd3d5b9625327fc7e5986`. Planilha duplicada e cópia privada de código, dados e fotos preservada. O inventário individual dos arquivos fica somente no relatório privado, sem exposição no repositório público.

## Checklist

- [x] Mapear método atual e fazer backup.
- [x] Definir solução e testar três links antes do lote.
- [x] Implementar script idempotente para lote e link individual.
- [ ] Migrar dados e gerar todas as miniaturas possíveis.
- [ ] Remover método antigo e verificar todas as telas.
- [ ] Testar execução e conferir desktop/celular com fallback; entregar capturas e revisar.

## Solução

WebP local em 16:9, até 640×360 e abaixo de 60 KB. Caminho `thumbnail` em J/N e manifesto com hashes dos links para atualizar cópias do aparelho sem repetir login. Sem hotlinks, URLs assinadas, credenciais ou dados privados no repositório. Até três workers e pausa global entre solicitações. Layout reserva espaço, imagens usam lazy loading/alt do título, falhas mostram o símbolo neutro do estilo atual. Detalhe usa a mesma miniatura. Nenhuma mudança de fontes, cores ou espaçamento fora da área de imagem.

## Remoções previstas antes da exclusão

- `browser-store.js`, legado não carregado pelo HTML atual; preservado no backup.
- Campo images nos registros ativos, leitura de arquivos do Drive, fila/observer de fotos, blobs e escopo Drive no login.
- As 22 imagens antigas serão apenas arquivadas no backup privado (14.324.166 bytes), sem exclusão definitiva. Não há imagem antiga a apagar do repositório.

## Estado da execução

A primeira execução foi interrompida antes da publicação. Backups foram recuperados; o site e a planilha de receitas permaneciam intactos. Implementação e artefatos estão sendo reconstruídos e salvos em commits por etapa.
