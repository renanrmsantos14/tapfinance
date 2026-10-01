# TapFinance 1.2.0-beta.5

Pré-release de recuperação de cadastros, correção de saldo e metadados. Android versionCode 19; esquema SQLite permanece 5.

## Alterações

- Transferências validam centavos, data, contas distintas/ativas e moeda no repositório; pares são gravados e excluídos atomicamente. Formulário mostra carregamento, falha e tentativa novamente, preserva campos e impede confirmação duplicada.
- Contas e categorias têm listas de ativos/arquivados e restauração. Recuperação preserva histórico e saldo; não muda a conta principal nem inventa hierarquia removida.
- Correção de saldo registra movimentação administrativa auditada, sem reescrever saldo inicial ou lançamentos antigos. Saldo esperado é conferido na confirmação; excluir a correção reverte seu efeito. Correções pagas legadas/importadas passam a ser consideradas no saldo da conta, mas continuam fora de receitas/despesas.
- Título, notas e tags independentes na criação/edição de lançamentos comuns. Busca inclui tags; omissão na edição preserva tags legadas. Novas tags têm normalização, deduplicação e limites de 20 tags/50 caracteres.
- Duplicação abre revisão com data atual e não grava até confirmar. Mantém situação e metadados, sem reutilizar identidade bancária, recorrência ou propriedade de desembolso inicial. Conta/categoria/vínculo arquivado exige escolha explícita; transferências e correções não são copiadas como lançamento comum.
- CSV preserva título vazio, notas multilinha, tags JSON e timestamp. Valores/cabeçalhos ambíguos, tags inválidas, cadastros com nomes equivalentes e colisões de grupos de transferência são rejeitados sem gravação parcial. Exportação informa o motivo real da falha.
- Verificador de atualização aceita versões beta, compara identificadores numéricos corretamente e impede downgrade para versão estável anterior. Pré-releases continuam disponíveis por download manual no GitHub; a consulta automática mantém o canal estável existente.

## Verificação e limites

- 124 testes passaram sem falhas; TypeScript e exportação Android aprovados após a correção final (3.329 módulos, bundle Hermes). APK final recompilado com sucesso em 1m33s; versão 1.2.0-beta.5/code 19, assinatura v2 válida e quatro ABIs (arm64-v8a, armeabi-v7a, x86, x86_64).
- Instalador `app-release.apk`: 112.936.701 bytes; SHA-256 `1ecd1bef6cfd6e5195b86cf5fb3d560fdd8a448e5adaae190da789e321db536b`.
- Revisão estática do delta concluída no Codex Security, scan `55e85e87-73ae-4a06-82cd-4cf296e9cf1e`: 23 fontes revisadas, índice local excluído, nenhum achado reportável. Não é auditoria integral do app/dependências nem prova de uso nativo.
- `npm audit --omit=dev --audit-level=high`: 14 ocorrências moderadas transitivas; nenhuma alta/crítica. A correção automática sugerida faz downgrade incompatível de pacotes Expo e não foi aplicada.
- Faça backup completo antes de atualizar. CSV não restaura saldo inicial, moeda, hierarquia, metas/empréstimos ou recorrência. Esquema 5 não suporta downgrade para aplicativos antigos.
- APK de avaliação mantém a chave debug existente; não é assinatura de produção para Play Store.
- Sem aparelho/emulador disponível: instalação, UI, teclado, acessibilidade, restauração real, Assistente e notificações aguardam QA nativo.
- Revisão integral e paridade completa com o Cashew continuam abertas. Esta versão não é declarada estável nem uma cópia integral concluída.
