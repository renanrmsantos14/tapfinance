# TapFinance 1.2.0-beta.6

Pré-release Android, versionCode 20. SQLite passa do esquema 5 para o 6.

## Alterações

- Verificar atualizações agora abre um seletor de versões estáveis e beta mais novas. Mostra versão, canal, tamanho, data e notas; o usuário escolhe o APK antes de baixar. Consulta paginada ao GitHub, comparação SemVer, validação do endereço e SHA-256 e prevenção de download duplicado. Não oferece downgrade.
- Lançamentos comuns permitem escolher Pago/A pagar ou Recebido/A receber e editar data e hora. Preserva timestamp bancário e metadados; desembolso inicial de empréstimo permanece pago. Histórico permite filtro exato por tag, inclusive Sem tags.
- Criação de contas e troca de conta principal são serializadas e transacionais. Valida centavos inteiros seguros, preserva posições arquivadas e evita transação aninhada na importação CSV.
- Início, relatórios, calendário e cadastros carregam conjuntos completos com estados de carregamento, erro e nova tentativa. Evitam apresentar totais falsamente zerados e respostas tardias de telas anteriores nessas superfícies.
- Relatórios separam totais por moeda e mantêm todas as categorias. Calendário tem grade completa, seleção por dia e indicadores de presença que não confundem pendências com saldo pago.
- Valores individuais respeitam a moeda já cadastrada na conta. Totais financeiros não misturam moedas e rejeitam somas fora da faixa segura. BRL continua o padrão; não há conversão cambial nem expansão de suporte a USD.
- Orçamentos têm moeda fixa. A migração atribui BRL aos antigos, preserva movimentações e filtra o gasto pela moeda do orçamento. Backup reconhece o esquema 6 e mantém migração dos esquemas 3 a 5.
- Recorrências deixam de parar silenciosamente após 12 ocorrências. Materializam atrasos e o horizonte futuro de 45 dias, mantendo pendências, pagamentos e exclusões existentes. Cada recorrência tem rollback em falha e validação de avanço da data.

## Cuidados e limites

- Faça backup completo antes de atualizar. Backups do esquema 6 não devem ser restaurados em versões anteriores; não faça downgrade do aplicativo após a migração.
- Instale esta beta uma vez para receber o novo seletor. A beta.5 ainda não contém essa interface.
- APK de avaliação mantém a chave debug das versões anteriores; não é assinatura de produção para Play Store.
- Sem aparelho ou emulador conectado: instalação, teclado, acessibilidade, restauração real, notificações e interação nativa aguardam QA. Testes locais e inspeção do APK não comprovam uso no dispositivo.
- Históricos muito grandes de recorrência ainda precisam de medição no dispositivo. Revisão integral e paridade completa com o Cashew permanecem abertas; esta versão não é declarada estável.
- Pendências conhecidas da revisão: filtros de conta/categoria no histórico ainda oferecem somente cadastros ativos; o carregamento dessa tela ainda precisa da proteção contra respostas tardias; o seletor mensal de relatórios exibe mês sem ano. Não foram declaradas corrigidas neste release.

## Verificação

- 166 testes passaram, sem falhas; TypeScript aprovado. Exportação Android aprovada com 3.337 módulos e bundle Hermes.
- Compilação local utiliza SDK Android existente e o caminho curto `T:\tapfinance\android`, com `T:` mapeado à pasta `C:\Users\mendo\Desktop\Projetos`. Mapear diretamente a raiz do app impede o autolinking de localizar seu `package.json`.
