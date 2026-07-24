Antes de qualquer alteração, verifique se a branch já existe:

git branch --list feature/2026-07-22-agendamento-servicos

Se não existir, crie e mude para ela a partir da atual:

git checkout -b feature/2026-07-22-agendamento-servicos

Se já existir, apenas faça checkout nela.

Depois, leia plan.md, requirements.md e validation.md (feature de agendamento de
serviços).

Implemente apenas a Fase 0 (Workshop model extension), conforme descrita em
plan.md e requirements.md. Não avance para as fases seguintes — vou revisar e
pedir a próxima manualmente.

Antes de escrever a migração, leia migrations/versions/0003_add_tenant_foundation.py
para seguir o mesmo padrão.

Ao terminar, rode:
cd apps/backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head

Me mostre o diff antes de eu confirmar. Não faça commit nem push ainda —
vou confirmar explicitamente quando estiver tudo certo.

============================================================================

Ok, pode commitar e dar push:

git add -A
git commit -m "feat: <brief implementations description> (Phase <num>)"
git push

Após isso, seguir para a próxima Fase.