/* Document versions are data, not executable HTML. All rendering passes through
   the same allow-list sanitizer used by the document and print views. */
const CarijoVersions = {
  append(versions, html, text, label = "Edição") {
    const previous = Array.isArray(versions) ? versions : [];
    if (previous.at(-1)?.html === html) return previous;
    const next = { id: crypto.randomUUID(), html, text, label, at: new Date().toISOString() };
    // Keep the original and the 29 most recent checkpoints.
    const all = [...previous, next];
    return all.length > 30 ? [all[0], ...all.slice(-29)] : all;
  },
  compare(before, after) {
    const left = String(before || "").split("\n");
    const right = String(after || "").split("\n");
    const leftSet = new Set(left), rightSet = new Set(right);
    return {
      before: left.map(text => ({ text, changed: !rightSet.has(text) })),
      after: right.map(text => ({ text, changed: !leftSet.has(text) }))
    };
  }
};
globalThis.CarijoVersions = CarijoVersions;

if (typeof document !== "undefined") (() => {
  const sessions = {};
  let timer, queue = Promise.resolve();
  const targetFor = kind => document.querySelector(kind === "plan" ? "#planDocument" : "#activityAIText");
  const uiFor = kind => document.querySelector(`#${kind}RevisionTools`);
  const status = (kind, text) => { const el = uiFor(kind)?.querySelector("[role=status]"); if (el) el.textContent = text; };
  function metadata(kind) {
    const item = kind === "plan" ? getSelectedClass() : state.classes.find(x => x.id === Number($("#activityClassSelect").value));
    const snapshot = kind === "plan" ? currentPlanSnapshot() : { planType: "activity", aiText: currentActivityText };
    return {
      class_id: item?.id || null, class_name: item?.name || "Turma", subject: item?.subject || "Componente curricular",
      plan_type: snapshot.planType, title: kind === "plan" ? targetFor(kind).querySelector(".doc-cover h2")?.textContent || "Planejamento" : $("#activityOutputTitle").textContent,
      period_label: kind === "plan" ? snapshot.period : `${$("#activityQuarter").value}º trimestre`, plan_data: snapshot
    };
  }
  function makeSession(kind, record = null) {
    const meta = record || metadata(kind);
    const local = String(record?.id || "").startsWith("local-");
    const owner = record?.user_id || record?.plan_data?.cloudOwner || null;
    return {
      kind, meta, localId: local ? record.id : (record?.id ? readDeviceDocuments().find(x => x.plan_data?.cloudId === record.id)?.id : null) || `local-${crypto.randomUUID()}`,
      cloudId: local ? (owner === currentUser?.id ? record.plan_data?.cloudId : null) : record?.id,
      owner, versions: Array.isArray(record?.plan_data?.versions) ? record.plan_data.versions : [], revision: 0
    };
  }
  function capture(session, label, checkpoint = true) {
    const target = targetFor(session.kind);
    const html = sanitizeDocumentHtml(target.innerHTML);
    const text = target.innerText.trim();
    if (checkpoint) session.versions = CarijoVersions.append(session.versions, html, text, label);
    return { ...session.meta, id: undefined, user_id: null, document_html: html,
      plan_data: { ...session.meta.plan_data, ...(session.kind === "activity" ? {assessment: window.CarijoAssessments?.current() || null} : {}), versions: session.versions, editorVersion: 2, documentText: text,
        savedAt: new Date().toISOString(), cloudId: session.cloudId || null, cloudOwner: session.owner || null } };
  }
  function localWrite(session, payload) {
    const now = new Date().toISOString();
    const records = readDeviceDocuments();
    const prior = records.find(x => x.id === session.localId);
    const record = { ...payload, id: session.localId, created_at: prior?.created_at || now, updated_at: now };
    localStorage.setItem(DEVICE_DOCUMENTS_KEY, JSON.stringify([record, ...records.filter(x => x.id !== session.localId)]));
    return record;
  }
  function persist(kind, manual = false, label = "Edição automática") {
    const session = sessions[kind];
    if (!session) { if (manual) toast("Gere ou abra um documento antes de salvar."); return Promise.resolve(); }
    const payload = capture(session, manual ? "Salvamento manual" : label);
    const revision = ++session.revision;
    try { localWrite(session, payload); status(kind, "Salvo neste dispositivo"); }
    catch { status(kind, "Não foi possível salvar localmente. Baixe uma cópia."); return Promise.resolve(); }
    const owner = hasHistoryAccount() ? currentUser.id : null;
    if (!owner || (session.owner && session.owner !== owner)) {
      if (manual) toast("Documento e versões salvos neste dispositivo.");
      return Promise.resolve();
    }
    status(kind, "Salvo localmente · sincronizando…");
    const operation = async () => {
      // Never save a pending document into a different account after logout.
      if (currentUser?.id !== owner) return;
      const { id, created_at, updated_at, ...clean } = payload;
      clean.user_id = owner;
      clean.plan_data = { ...clean.plan_data, cloudOwner: owner, cloudId: session.cloudId || null };
      const query = session.cloudId
        ? supabaseClient.from("teacher_plans").update({ ...clean, updated_at: new Date().toISOString() }).eq("id", session.cloudId).eq("user_id", owner).select("id").single()
        : supabaseClient.from("teacher_plans").insert(clean).select("id").single();
      const { data, error } = await query;
      if (error || !data?.id) throw new Error("sync_failed");
      session.cloudId = data.id; session.owner = owner;
      // A slow response must not replace a newer local edit.
      const records = readDeviceDocuments();
      const record = records.find(x => x.id === session.localId);
      if (record) { record.plan_data.cloudId = data.id; record.plan_data.cloudOwner = owner; localStorage.setItem(DEVICE_DOCUMENTS_KEY, JSON.stringify(records)); }
      if (sessions[kind] === session && revision === session.revision) {
        currentPlanId = data.id; status(kind, "Salvo e sincronizado com sua conta");
      }
      if (manual) toast("Documento e versões salvos no histórico.");
    };
    queue = queue.catch(() => {}).then(operation).catch(() => {
      if (sessions[kind] === session) status(kind, "Salvo localmente · sincronização pendente. Clique em Salvar para tentar novamente.");
      if (manual) toast("Cópia local preservada. Não foi possível sincronizar com a conta.");
    });
    return queue;
  }
  function sections(kind) {
    const target = targetFor(kind), nav = uiFor(kind)?.querySelector(".document-section-nav");
    if (!nav) return;
    nav.replaceChildren();
    const headings = [...target.querySelectorAll("h2,h3,h4")];
    headings.forEach((heading, index) => {
      const button = document.createElement("button"); button.type = "button";
      button.textContent = heading.textContent.trim() || `Seção ${index + 1}`;
      button.addEventListener("click", () => {
        const edit = document.querySelector(kind === "plan" ? "#editPlan" : "#editActivity");
        if (target.contentEditable !== "true") edit.click();
        heading.scrollIntoView({ behavior: "smooth", block: "center" });
        const range = document.createRange(); range.selectNodeContents(heading); range.collapse(false);
        const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); target.focus();
      });
      nav.append(button);
    });
  }
  function revisions(kind) {
    const session = sessions[kind]; if (!session) return;
    persist(kind);
    const dialog = document.createElement("dialog"); dialog.className = "document-versions-dialog";
    dialog.innerHTML = `<header><div><small>MEMÓRIA DO DOCUMENTO</small><h2>Versões e recuperação</h2></div><button type="button" aria-label="Fechar">✕</button></header><p>Compare antes de recuperar. A versão original e as 29 mais recentes são preservadas. A máquina pode esquecer a turma; suas alterações, não.</p><div class="version-picker"><label>Versão anterior<select></select></label><button type="button" class="secondary-button restore-version">Restaurar esta versão</button></div><div class="version-comparison"><section><h3>Versão selecionada</h3><div class="version-before"></div></section><section><h3>Documento atual</h3><div class="version-after"></div></section></div>`;
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector("header button").onclick = close;
    dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
    const select = dialog.querySelector("select");
    [...session.versions].reverse().forEach(version => {
      const option = document.createElement("option"); option.value = version.id;
      option.textContent = `${new Date(version.at).toLocaleString("pt-BR")} · ${version.label}`;
      select.append(option);
    });
    const selected = () => session.versions.find(x => x.id === select.value);
    const compare = () => {
      const diff = CarijoVersions.compare(selected()?.text, targetFor(kind).innerText.trim());
      ["before", "after"].forEach(side => {
        const container = dialog.querySelector(`.version-${side}`); container.replaceChildren();
        diff[side].forEach(line => { const p = document.createElement("p"); p.textContent = line.text || " "; p.classList.toggle("changed", line.changed); container.append(p); });
      });
    };
    select.onchange = compare; compare();
    dialog.querySelector(".restore-version").onclick = () => {
      const version = selected();
      if (!version || !window.confirm("Restaurar esta versão? O texto atual continuará no histórico de versões.")) return;
      targetFor(kind).innerHTML = sanitizeDocumentHtml(version.html);
      if (kind === "activity") currentActivityText = version.text;
      persist(kind, false, "Versão restaurada"); sections(kind); close();
      toast("Versão recuperada. As demais versões foram preservadas.");
    };
    document.body.append(dialog); dialog.showModal();
  }
  window.CarijoEditor = {
    metadata(kind) { return sessions[kind]?.meta || metadata(kind); },
    save: persist,
    open(record, kind) {
      sessions[kind] = makeSession(kind, record);
      const target = targetFor(kind); target.contentEditable = "false"; target.classList.remove("editing");
      document.querySelector(kind === "plan" ? "#planEditorToolbar" : "#activityEditorToolbar").classList.add("hidden");
      document.querySelector(kind === "plan" ? "#editPlan" : "#editActivity").textContent = "Editar documento";
      sessions[kind].versions = CarijoVersions.append(sessions[kind].versions, sanitizeDocumentHtml(target.innerHTML), target.innerText.trim(), "Documento original");
      status(kind, "Documento carregado · alterações salvas automaticamente"); sections(kind);
    },
    generated(kind) {
      const meta = metadata(kind), previous = sessions[kind];
      const same = previous && ["class_name", "subject", "plan_type", "period_label"].every(key => previous.meta[key] === meta[key]);
      sessions[kind] = same ? previous : makeSession(kind);
      sessions[kind].meta = meta;
      currentPlanId = sessions[kind].cloudId || sessions[kind].localId;
      persist(kind, false, same ? "Nova geração" : "Documento original"); sections(kind);
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    ["plan", "activity"].forEach(kind => {
      const target = targetFor(kind);
      const bar = document.createElement("aside"); bar.id = `${kind}RevisionTools`; bar.className = "document-revision-tools";
      bar.innerHTML = `<div class="document-save-state"><span role="status" aria-live="polite">Alterações salvas automaticamente após a geração</span><button type="button" class="secondary-button">Versões e comparação</button></div><nav class="document-section-nav" aria-label="Editar seção do documento"></nav>`;
      target.before(bar); bar.querySelector("button").onclick = () => revisions(kind);
      target.addEventListener("input", () => {
        if (!sessions[kind]) return;
        if (kind === "activity") currentActivityText = target.innerText.trim();
        // Local recovery is synchronous, including the last character before closing.
        try { localWrite(sessions[kind], capture(sessions[kind], "Edição", false)); status(kind, "Salvo localmente · aguardando sincronização"); }
        catch { status(kind, "Armazenamento cheio. Baixe uma cópia antes de fechar."); }
        clearTimeout(timer); timer = setTimeout(() => { persist(kind); sections(kind); }, 1200);
      });
      const toolbar = document.querySelector(kind === "plan" ? "#planEditorToolbar" : "#activityEditorToolbar");
      // Preserve the text selection when toolbar buttons receive a pointer click.
      toolbar.addEventListener("mousedown", event => { if (event.target.closest("button")) event.preventDefault(); });
      toolbar.addEventListener("click", () => target.dispatchEvent(new Event("input")));
      const table = document.createElement("button"); table.type = "button"; table.textContent = "Tabela 3 × 3";
      table.onclick = () => { target.focus(); document.execCommand("insertHTML", false, `<table class="editor-table"><tbody>${Array.from({length:3}, () => `<tr><td>Texto</td><td>Texto</td><td>Texto</td></tr>`).join("")}</tbody></table>`); };
      toolbar.append(table);
    });
  });
})();
