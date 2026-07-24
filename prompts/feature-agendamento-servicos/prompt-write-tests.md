Escopo: Fase 6 tests e validation descrita em validation.md e
requirements.md.

1. Backend — primeiro rode os testes automatizados normalmente:
   cd apps/backend && uv run pytest tests/<teste_name>.py -q
   Cubra os 10 casos listados em validation.md seção 2.1.

2. Depois disso, use a skill code-review para revisar o diff completo desta
   feature (Fases 0 a 6) no backend, com foco especial em:
   - isolamento dual-tenant (requirements.md seção 3.1) — nenhum repo_* pode
     rodar sem tenant id
   - matriz de transição de status (requirements.md seção 3.2) — transições
     de estado terminal devem levantar ValueError
   - normalização de status/enum para .value antes da persistência
   /code-review apps/backend/src (ou o path relevante do diff desta feature)

3. Rode a verificação de migração:
   cd apps/backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head

4. Frontend — rode a checagem de tipos (obrigatória):
   cd apps/web && npm run check

5. Execute o roteiro de QA manual definido em
   validation.md seção 3.3, contra o app rodando localmente:
   /browser execute o roteiro de QA manual (validation.md seção 3.3):
   - como usuário workshop, configurar horário de funcionamento + número de
     funcionários nas settings
   - como cliente, abrir /client/scheduling, filtrar por nome e por
     geolocalização, abrir um workshop
   - selecionar um dia/horário aberto na agenda; confirmar que slots aceitos
     aparecem indisponíveis; submeter o modal de agendamento
   - como usuário workshop, abrir /workshop/schedules, abrir a solicitação
     (status deve virar "Visualizado"), Aceitar
   - como cliente, confirmar que /client/my-schedules mostra "Aceito" e que
     a notificação aparece no sino em até ~30s
   - repetir com Rejeitar; confirmar "Recusado" + notificação

Reporte os resultados de cada etapa (testes automatizados, code-review,
migração, type-check, QA de browser) antes de qualquer commit. Não faça
commit nem push ainda — vou revisar tudo e confirmar explicitamente.