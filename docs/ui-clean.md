# CLEAN — primeiro lote local

Direção confirmada pelo usuário: minimalismo com liberdade visual além do Cashew, preservando funções e dados. Contexto registrado em `PRODUCT.md`.

| Antes | Depois | Motivo |
| --- | --- | --- |
| Banner azul redundante e dez tiles em Mais | Dez ações em lista com separadores discretos | Reduzir decoração sem esconder funções |
| Claro terroso e escuro azul saturado | Superfícies neutras e seleção discreta | Dar prioridade a valores e estados |
| Conteúdo aparece em cascata após consulta de acessibilidade | Conteúdo visível imediatamente | Evitar espera visual e conteúdo invisível se a consulta falhar |
| Quatro itens de navegação com largura mínima total de 352 dp | Colunas flexíveis, labels de 12 sp e alvos de 52 dp | Adaptar a barra a telas estreitas |
| Detalhes sem seção ativa | Seleção da seção pai nos detalhes | Manter orientação |
| Histórico sem opções arquivadas | Catálogo completo apenas no filtro histórico | Preservar consulta sem habilitar arquivados em novos lançamentos |
| Relatório mostra somente o nome do mês | Mês e ano | Diferenciar períodos de anos distintos |

Feedback de toque permanece. A consulta de reduzir movimentos trata falha, desmontagem e atualização durante a consulta. O seletor de versões não anima quando a preferência está ativada ou ainda é desconhecida. Não houve migração, alteração de versão, dependência nova ou publicação.

Verificação: TypeScript, 170 testes e exportação Android passaram (3.339 módulos; bundle Hermes `entry-c14bcdf1b5d4a621025b25bcd89db705.hbc`). Dois testes exercitam SQLite real para catálogo arquivado e recuperação de erro; outros cobrem mês/ano e seção de navegação. Testes de lógica e exportação não comprovam aparência, foco, TalkBack, teclado, escala de fonte ou toque nativo.

Limites: ADB sem dispositivo conectado; `react-native-web` não está instalado. Não instalar dependências apenas para simular aprovação visual. Validação visual e interativa no Android permanece pendente. Exportação Android é uma camada separada, não validação no dispositivo.

O redesign integral ainda não está concluído. Próximos pontos: hierarquia e densidade de Início/Orçamentos/Ajustes/formulários, pequenos controles restantes, valores longos, texto ampliado, organização de Mais por grupos, estados de erro e teste nativo de navegação/entrada/atualização. A beta.6 publicada não inclui este lote.
