# PLACE - User Testing Guide

Test guide for the PLACE continuous-improvement platform (PDCA initiatives).
Each block below is a short **user story** followed by the **key points** a tester
must verify. Focus areas: emails, calculations, validation flows, tooltips.

UI language is Portuguese; labels are quoted in PT. The app runs at
`SitePages/app.aspx`. Navigation tabs: Início, Pessoal, Geral, Mentoria, Gestor,
Catálogo, Configuração, plus "Ajuda"/Instruções.

## Roles and access

The four roles are `colaborador`, `gestor`, `mentor`, `mentor-manager`. Roles come
from the OrgHierarchy import (or a manual override in Admin). Test each scenario
signed in as the relevant role. If OrgHierarchy is empty, membership of the SharePoint
group "PACE Owners" grants bootstrap access (mentor + gestor + colaborador) and shows a
"Modo bootstrap" warning toast.

| Area | Tab | Roles that can open it |
|------|-----|------------------------|
| Início | Página Inicial | all |
| Instruções | Ajuda | all |
| Pessoal | Pessoal | colaborador, mentor, mentor-manager (NOT gestor) |
| Geral | Geral | colaborador, gestor, mentor, mentor-manager |
| Mentoria | Mentoria | mentor, mentor-manager |
| Gestor | Gestor | gestor |
| Catálogo | Catálogo | all |
| Configuração | Configuração | mentor, mentor-manager |

---

# 1. Lifecycle and validation flows

As a colaborador I create an initiative through the 5-step wizard ("+ Partilhar uma ideia"), fill Contexto -> Problema -> Tema -> Plano -> Impacto, and either save a draft ("Gravar Rascunho") or submit ("Submeter").
Key points
- Steps: 01 Contexto (Título + Equipa + Confidencial), 02 Problema (descrição), 03 Tema (Tags), 04 Plano (objectivo), 05 Impacto (métricas financeiras).
- "Continuar" and both save actions block until Título is filled and Equipa is selected; invalid field is focused and a red toast appears ("Preencha o título e seleccione a equipa.").
- Draft label is "Gravar Rascunho" for new, "Guardar" when editing a submitted record (edit must NOT demote status back to Rascunho).
- On submit, a "Nova iniciativa" becomes status Rascunho -> Submetido; a Creation event is logged and the record appears in Pessoal.
- Equipa defaults to the user's own OUID for new initiatives.

As a colaborador my new initiative moves through the states Rascunho -> Submetido ("Em Validação") -> Validado Mentor -> Em Execução -> Por Validar ("Em Validação Savings") -> Validado Gestor -> Validado Final -> Implementado.
Key points
- Status chip label differs from the internal value: Submetido shows "Em Validação", Por Validar shows "Em Validação Savings".
- Each transition writes a timeline event visible in the side-panel "Progresso" section, with actor name and date.
- Terminal states (Implementado, Rejeitado, Cancelado) show no further workflow buttons.
- The "Progresso" timeline shows the NEXT expected step as a hollow dot.

As a mentor I open the Mentoria page, review a submitted initiative, and click "Aprovar", "Solicitar Revisão", or "Rejeitar".
Key points
- Approve: Submetido -> Validado Mentor; the current mentor is stamped as Mentor/MentorEmail (self-assignment).
- Reject and Solicitar Revisão require a mandatory comment; empty comment shows "O comentário é obrigatório." and the action aborts.
- Solicitar Revisão sets PreviousStatus so re-submission returns to the correct checkpoint; status becomes Em Revisão.
- Unassigned Submetido items appear to all mentors; once approved they belong to that mentor.

As a colaborador whose initiative was sent back, I see it in the Pessoal "revisão" alert cards, read the reviewer comment, click "Rever" to edit, and "Re-submeter".
Key points
- Revision cards show the reviewer's reason comment inline and days-since (cards older than 7 days get an "urgente" style).
- Re-submit from Em Revisão returns to Submetido when the revision happened before mentor approval, or to Por Validar when it happened after gestor validation (financials must be re-validated).
- Re-submitting into Por Validar re-runs the To-Be completeness gate and re-assigns the gestor via routing rules.
- Base fields (Título, Descrição, Equipa, Tags, Confidencial, Objectivo) are locked once past Submetido, EXCEPT in Em Revisão when PreviousStatus is Submetido (full edit re-enabled).

As a colaborador I start execution on an approved initiative ("Declarar Início Execução") and later declare savings ("Solicitar Validação").
Key points
- Iniciar Execução requires a "data prevista de conclusão"; empty date aborts with a toast. Validado Mentor -> Em Execução.
- Solicitar Validação (Em Execução -> Por Validar) enforces the To-Be gate: every enabled metric must have all To-Be values > 0, and Qualidade must have text; otherwise a specific "Preencha todos os valores To-Be..." toast fires and the transition is blocked.
- On success the gestor is auto-assigned by routing rules (no manual selection).

As a gestor I open the Gestor page, review the "Savings Por Validar" cards, and click "Aprovar Savings", "Rejeitar", "Solicitar Revisão", or "Transferir".
Key points
- Approve: Por Validar -> Validado Gestor.
- Transferir reassigns to another gestor (status stays Por Validar); only users whose role derives to gestor appear in the picker, current gestor excluded.
- Reject / Solicitar Revisão require a mandatory comment.
- FTE annual cost value and inputs are visible to gestor/mentor but never to colaborador.

As a mentor I confirm savings ("Confirmar Savings") and as a mentor-manager I validate implementation ("Validar Implementação").
Key points
- Confirmar Savings: Validado Gestor -> Validado Final (only mentor / mentor-manager).
- Validar Implementação: Validado Final -> Implementado, ONLY for mentor-manager; requires an implementation date (defaults to today).
- On implementation the FinalValidationLabel is computed and shown as a second chip (see calculations section).
- A mentor-manager sees an extra "Confirmação de Implementação" column/KPI on the Mentoria page.

As an owner I cancel ("Cancelar"), delete ("Eliminar"), or transfer ("Transferir") my own initiative.
Key points
- Cancelar is available at any non-terminal status and is irreversible; a confirmation dialog is required.
- Eliminar is offered only for Rascunho (in Pessoal) or by the owner/assigned mentor (in Catálogo); it cascade-deletes financials, events, comments, notifications and shares, then the initiative.
- Transferir (ownership) hands the record to another colaborador; it then leaves the current user's Pessoal list.
- Partial cascade failures surface "Eliminação parcial: N registo(s)..." and the parent is NOT deleted so re-runs converge.

As any participant I grant or revoke access ("Gerir Acesso") and add read or collaborate permissions.
Key points
- The dialog lists only delegated shares (owner/mentor/gestor have implicit access and are not shown).
- Access type is "Leitura" (read) or "Colaboração" (collaborate); collaborators gain write access, readers do not.
- Adding/removing a person triggers ACCESS_GRANTED / ACCESS_REVOKED emails.

As a user editing a record that someone else changed, I hit an ETag conflict.
Key points
- A concurrent-edit conflict (HTTP 412) shows "A iniciativa foi modificada por outro utilizador. Recarregue a página e tente novamente." and does NOT overwrite.
- Text inputs sync on a 300ms debounce; the wizard flushes pending edits (blur) before every save so the last keystroke is not lost.

---

# 2. Emails and notifications

Every workflow action sends an HTML email (subject prefixed "PLACE —") AND, only when
the send succeeds, writes a bell notification record shown on the Início page under
"Notificações (últimas 2 semanas)". Verify BOTH the inbox and the Início list for the
recipient after each action. Emails never throw: a failed recipient is logged and
skipped, and the actor is always excluded from self-notification where noted.

As a mentor I receive an email when an initiative is submitted or re-submitted to me.
Key points
- Submeter -> "Nova iniciativa submetida para validação" to MentorEmail. NOTE: on a brand-new initiative MentorEmail is empty, so no email goes out until a mentor is assigned; the submitted item still surfaces in Mentoria for all mentors.
- Re-submeter -> "Iniciativa re-submetida" to MentorEmail; if it re-enters Por Validar a "Validação de savings pendente" also goes to the gestor.

As a colaborador I receive an email on every decision about my initiative.
Key points
- Aprovar (mentor) -> "Iniciativa aprovada pelo mentor" to owner.
- Rejeitar -> "Iniciativa rejeitada" to owner, including the rejection reason.
- Solicitar Revisão -> "Pedido de revisão" to owner, including the reason.
- Confirmar Savings (mentor) -> "Savings confirmados" to owner + gestor (actor excluded).
- Validar Implementação -> "Iniciativa implementada" to owner + mentor + gestor (actor excluded).

As a gestor I receive an email when savings need my validation.
Key points
- Declarar Início Execução -> "Execução iniciada" to MentorEmail.
- Solicitar Validação (declare savings) -> "Validação de savings pendente" to the auto-assigned gestor.
- Aprovar Savings -> "Savings aprovados" to MentorEmail.

As a stakeholder I receive an email on transfers, cancellation, deletion, access changes, and comments.
Key points
- Cancelar -> "Iniciativa cancelada" to MentorEmail.
- Eliminar -> "Iniciativa eliminada" to all stakeholders (owner, mentor, gestor, active collaborators), deleter excluded; sent AFTER the cascade so it survives.
- Transferir (gestor) -> "transferida para validação" to new gestor + "Gestor alterado" to owner.
- Transferir (ownership) -> "Iniciativa transferida" to new owner + "Proprietário alterado" to mentor.
- Gerir Acesso -> "Acesso concedido" / "Acesso removido" to the affected person.
- Comentar -> "Novo comentário" to mentor + owner (comment author excluded).
- Each successful send appends a bell record; confirm the recipient's Início notifications refresh within the 2-week window.

---

# 3. Financial calculations

Metrics are added on wizard step 05 (Impacto) as tabs. Each metric has an As-Is and a
To-Be phase (except Qualidade, which is text-only). Verify the per-period totals, the
annualised totals, the realised saving, and the projected impact pills. Use the sample
values below to check the arithmetic by hand.

As a user I add metrics and the platform auto-derives the saving category and Hard/Soft classification.
Key points
- Inference: Produção -> "Aumento de Produção (PNB)" (Hard); Gastos -> "Gastos Gerais" (Hard); Redução de Custo de Risco -> "Redução do Custo do Risco" (Hard); Eficiência -> "Eficiência Operacional" (Soft); Custo/Risco Evitado -> "Custo ou Risco Evitado" (Soft); Qualidade -> "Melhoria de Qualidade" (Soft).
- Overall type priority: Hard > Soft > Outros Benefícios Qualitativos. Adding any Hard metric makes the whole initiative Hard.
- The read-only "Classificação do Saving" section updates live as metrics are added/removed.

As a user I enter As-Is / To-Be values and the per-period total is computed per metric.
Key points
- Eficiência total = Volume x Tempo unitário (minutes). Example: 1000 x 3 = 3000 min.
- Produção total = Volume x Valor unitário x (Taxa% / 100). Example: 200 x 50 x 0.10 = 1000 €.
- Gastos total = Volume x Custo unitário. Example: 100 x 5 = 500 €.
- Redução de Risco total = Exposição x (Taxa% / 100). Example: 100000 x 0.02 = 2000 €.
- Custo/Risco Evitado total = Custos operacionais. Example: 3000 -> 3000 €.
- Qualidade has no numbers; it requires a non-empty description only.

As a user I set the measurement period and see values annualised.
Key points
- Annualisation factor: Diário x252, Mensal x12. Example: Gastos 500 €/mês -> 6000 €/ano.
- The "Período de Medição" callout must explain "Diário x252, Mensal x12".
- The totals panel renders two blocks side by side: per-period and "Totais Anuais".

As a mentor/gestor I set the FTE annual cost and Eficiência minutes convert to euros.
Key points
- FTE-year = 120960 minutes (252 days x 8h x 60min). FTE equivalent = annual minutes / 120960.
- Eficiência € = (annual minutes / 120960) x FTEAnnualCost. Example: 3000 min/mês -> 36000 min/ano -> 0.2976 FTE -> at 40000 €/FTE -> 11904.76 €.
- The FTE cost input and the "Eficiência (Custo FTE)" total row are hidden entirely for colaborador.

As a user I see the realised saving and the projected impact per metric and in total.
Key points
- Realised saving direction: "decrease" metrics (Eficiência, Gastos) = As-Is - To-Be; "increase" metrics (Produção, Redução de Risco, Custo Evitado) = To-Be - As-Is.
- "Impacto Financeiro Projectado" pills show the To-Be minus As-Is difference for period and annual; a beneficial change is green even when the raw diff is negative (e.g. a cost reduction).
- Reducao de Custo carries a mode toggle "Custo evitado" / "Risco evitado".

As a mentor-manager I implement an initiative and the final-validation label is assigned automatically.
Key points
- Label rule: if EVERY saving category is Soft AND the annualised To-Be total is below 10000 €, the label is "Validado pela equipa PLACE"; otherwise "Validado pela área financeira".
- The label persists on the initiative and shows as a second status chip in tables and the detail panel.

As a colaborador declaring savings, the gestor is auto-routed by value and type.
Key points
- Routing tier: Hard Cost OR annualised value >= 10000 € escalates one level up the org hierarchy; below that it stays at the team head / direct manager.
- No manual gestor selection at declaration; the resolved gestor receives the validation email.
- 10000 € is the same threshold used for the PLACE-vs-financeira label but they are independent checks (label needs ALL-soft too).

As a mentor/gestor I export the current view to CSV ("Exportar").
Key points
- Export reflects the current filters and active tab; empty view warns "Sem iniciativas para exportar."
- CSV includes per-metric annualised savings, status, owner/mentor/gestor, comments and event history; FTEAnnualCost column appears only for mentor/gestor.
- Numbers in the CSV must reconcile with the per-metric annualised totals shown in the UI.

---

# 4. Tooltips, chips, and copy

As a user I hover the metric add-buttons and read a description of each metric.
Key points
- Each "+ <metric>" button carries a native hover tooltip (title attribute) from METRIC_DESCRIPTIONS, e.g. Gastos = "Redução de FTEs, ... material de escritório ou correio".
- Confirm all six metrics show a tooltip; Qualidade = "Aumento da taxa de satisfação do cliente...".

As a user I read the inline callouts and status descriptions.
Key points
- "Período de Medição" callout explains the annualisation factors.
- Step 05 intro explains As-Is is the baseline for measuring impact across the PDCA cycle.
- Status chips use distinct colours: done (Implementado), pending (Submetido/Por Validar/Validado Final), revision (Em Revisão/Rejeitado), inactive (Cancelado/Rascunho), active (others).
- Confidential initiatives show a lock icon and a "Confidencial" chip; the checkbox toggles by clicking anywhere on its row.

As a user I open the Instruções (Ajuda) page.
Key points
- Profile cards (Colaborador/Mentor/Gestor) list responsibilities.
- "Guia de Acções" accordion covers submit, edit draft, validate, approve savings, cancel, comment, transfer, request revision, re-submit.
- "Fluxo do Processo" shows Submissão -> Validação -> Execução -> Savings -> Implementado.
- FAQ mentions the 10000 € / Hard Cost routing rule.

---

# 5. Page-level checks

As a colaborador I open Início and see a personalised hero and my recent notifications.
Key points
- Hero greets by first name; "+ Partilhar uma ideia" and "Ver as minhas iniciativas" appear for non-gestor users (the CTA is hidden for gestor).
- "Notificações (últimas 2 semanas)" lists bell records newest-first with relative time ("hoje", "há N dias", "há N semanas"); empty shows "Sem notificações recentes."

As a colaborador I open Pessoal and manage my initiatives.
Key points
- KPIs: Submetidas, Em Curso, Implementadas (unfiltered totals).
- Tabs: Em Curso, Colaborações Recebidas, Rascunhos, Finalizadas.
- Filters: título (text), Equipa (combo), Tags (multi); "Limpar" resets all.
- Revision alert cards appear above the tabs when any item is Em Revisão.
- Clicking a row opens the detail side panel; the export button sits beside the tab toggle.

As a user I open Geral and browse initiatives by team scope.
Key points
- "Para a minha equipa" is scoped by the user's DeptAncestorPath; "Outras equipas" loads lazily and EXCLUDES confidential initiatives.
- KPIs: Iniciativas, Equipas impactadas, Colaboradores Responsáveis (recomputed on filter).

As a mentor I open Mentoria and act on pending items.
Key points
- Validation grid columns: "Validação de Projecto", "Confirmação Final", plus "Confirmação de Implementação" for mentor-manager only.
- KPIs mirror the columns; pending cards older than 5 days get the "urgente" style.
- Tabs: Minhas Iniciativas, Colaborações Recebidas (collaborations open read-only, canAct=false).

As a gestor I open Gestor and validate savings.
Key points
- "Savings Por Validar" cards with per-card action "Aprovar"; KPIs: Por Validar, Implementadas, Em Acompanhamento.
- Collaboration items assigned to me as gestor are de-duplicated out of the "Colaborações" tab.

As any user I open Catálogo and browse finished work.
Key points
- "Implementados" tab shows implementation date and KPIs (Iniciativas Implementadas, Equipas Impactadas, Utilizadores Envolvidos).
- "Arquivo" tab shows Cancelado + Rejeitado with a status column.
- Detail panel from Catálogo hides the progress timeline and comment box (archived view); "Replicar" copies content into a new draft.

As a mentor/mentor-manager I open Configuração and administer the platform.
Key points
- Tabs: Importar (CSV org hierarchy, replaces all data), Dados (employee list + manual role override), Hierarquia (tree view), Configurações (annual savings targets per category, in €), Exportação (export all initiatives).
- CSV import accepts .csv (windows-1252) and .xlsx; verify the confirmation before it overwrites existing hierarchy.
- Role override options: Automático, Colaborador, Gestor, Mentor, Mentor Manager.
