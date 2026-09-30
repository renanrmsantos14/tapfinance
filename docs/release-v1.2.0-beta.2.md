# TapFinance 1.2.0-beta.2

Pré-release de correções de integridade financeira e formulários.

## Alterações

- Recorrências preservam o dia original após meses curtos e anos não bissextos. Geração serializada e transações exclusivas impedem duplicação e gravações parciais.
- Transações e Calendário atualizam as ocorrências sem exigir visita à tela inicial.
- Metas e empréstimos validam valores e prazos; empréstimos usam a conta principal atual e persistem o desembolso atomicamente. Progresso considera somente lançamentos comuns pagos.
- Orçamentos validam períodos, categorias e limites igualmente na criação e edição, com rollback em caso de falha.
- Cadastros oferecem máscara BRL, seleção de conta, datas, proteção contra duplo salvamento e mensagens de erro. Detalhes permitem tentar novamente após falha de carregamento.
- Histórico existente e versão 3 do banco preservados.

## Validação e limites

- 45 testes automatizados, TypeScript, exportação Android e compilação do APK universal aprovados.
- Sem dispositivo ou emulador disponível: UI, backup/restauração, Assistente e notificações ainda precisam de QA nativo.
- APK de avaliação assinado com a chave debug existente; não destinado à Play Store. Faça backup antes de instalar.
- Revisão integral e paridade total com o Cashew continuam abertas. Edição avançada de recorrências, personalização, seleção múltipla e efeitos de editar/excluir desembolso inicial estão entre os pontos pendentes.

## Build local no Windows

O build inicial encontrou o limite de 260 caracteres do Ninja. O build foi retomado por um caminho curto (`T:\tapfinance\android`, mapeamento temporário da pasta pai) com `--no-daemon`. No `android/app/build.gradle` gerado, foi usado `defaultConfig.externalNativeBuild.cmake.arguments "-DCMAKE_OBJECT_PATH_MAX=240"`. A tentativa de usar somente 128 não resolveu o problema. A pasta Android é gerada e não é versionada; após prebuild, caminhos longos podem exigir o mesmo ajuste local.
