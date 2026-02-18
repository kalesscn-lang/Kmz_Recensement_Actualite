(() => {
  "use strict";

  // ---------------------------
  // Helpers
  // ---------------------------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  const base = (document.querySelector('meta[name="kmz-base"]')?.getAttribute('content') || "./").trim();
  const resolve = (p) => {
    if (!p) return p;
    if (/^(https?:)?\/\//.test(p) || p.startsWith("/") || p.startsWith("data:")) return p;
    return base + p;
  };

  const STORAGE_KEY = "kmz_members_v1";

  // ---------------------------
  // State
  // ---------------------------
  let allMembers = [];
  let viewMembers = [];
  let page = 1;
  const pageSize = 8;

  // ---------------------------
  // Load data (JSON + localStorage overlay)
  // ---------------------------
  async function loadMembers() {
    // 1) load base JSON
    const url = resolve("data/members.json");
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("members.json not found: " + res.status);
    const data = await res.json();

    const jsonMembers = Array.isArray(data.members) ? data.members : [];

    // 2) localStorage override (if exists)
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          allMembers = parsed;
          return;
        }
      } catch { /* ignore */ }
    }

    allMembers = jsonMembers;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allMembers));
  }

  function saveMembers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allMembers));
  }

  // ---------------------------
  // Filters + search
  // ---------------------------
  function applyFilters() {
    const q = ($("#searchInput")?.value || "").trim().toLowerCase();
    const role = ($("#filterRole")?.value || "").trim();
    const paroasy = ($("#filterParoisse")?.value || "").trim();

    viewMembers = allMembers.filter(m => {
      if (role && String(m.andraikitra || "").trim() !== role) return false;
      if (paroasy && String(m.paroasy || "").trim() !== paroasy) return false;

      if (!q) return true;

      const hay = [
        m.id, m.nom, m.prenom, m.paroasy, m.distrika, m.vikaria,
        m.andraikitra, m.zavamaneno, m.asa, m.fahaizamanao,
        m.whatsapp, m.facebook, m.adresse, m.sata, m.fanamarihana
      ].join(" ").toLowerCase();

      return hay.includes(q);
    });

    page = 1;
    render();
  }

  function buildParoisseOptions() {
    const sel = $("#filterParoisse");
    if (!sel) return;

    const set = new Set(allMembers.map(m => String(m.paroasy || "").trim()).filter(Boolean));
    const paroisses = Array.from(set).sort((a,b)=>a.localeCompare(b));
    const cur = sel.value;

    // keep first option
    sel.innerHTML = `<option value="">Paroasy rehetra</option>` + paroisses.map(p =>
      `<option value="${esc(p)}">${esc(p)}</option>`
    ).join("");

    // restore selection if possible
    if (paroisses.includes(cur)) sel.value = cur;
  }

  // ---------------------------
  // Rendering table + pagination
  // ---------------------------
  function render() {
    const tbody = $("#membersTbody");
    const status = $("#membersStatus");
    const pageInfo = $("#pageInfo");
    const btnPrev = $("#btnPrev");
    const btnNext = $("#btnNext");

    if (!tbody) return;

    const total = viewMembers.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * pageSize;
    const rows = viewMembers.slice(start, start + pageSize);

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary py-4">Tsy misy valiny.</td></tr>`;
    } else {
      tbody.innerHTML = rows.map(m => rowHtml(m)).join("");
    }

    if (status) status.textContent = `Mpikambana ${total} • Pejy ${page} / ${totalPages}`;
    if (pageInfo) pageInfo.textContent = `${page} / ${totalPages}`;
    if (btnPrev) btnPrev.disabled = (page <= 1);
    if (btnNext) btnNext.disabled = (page >= totalPages);

    // bind row actions
    tbody.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");
        if (!action || !id) return;

        if (action === "view") openView(id);
        if (action === "edit") openEdit(id);
        if (action === "delete") onDelete(id);
      });
    });
  }

  function badgeRole(role) {
    const r = String(role || "").toLowerCase();
    if (r.includes("mpitendry")) return "text-bg-warning";
    if (r.includes("teknis")) return "text-bg-info";
    if (r.includes("mpihira")) return "text-bg-success";
    if (r.includes("tompon")) return "text-bg-dark";
    return "text-bg-secondary";
  }

  function rowHtml(m) {
    const fullName = `${esc(m.nom || "")} ${esc(m.prenom || "")}`.trim();
    const meta = `ID: ${esc(m.id || "—")} • FB: ${esc(shortUrl(m.facebook))}`;
    const role = esc(m.andraikitra || "—");
    const asa = esc(m.asa || "—");
    const skill = esc(m.fahaizamanao || "—");
    const paroasy = esc(m.paroasy || "—");
    const wa = esc(m.whatsapp || "—");

    return `
      <tr>
        <td>
          <div class="fw-semibold">${fullName || "—"}</div>
          <div class="text-secondary small">${meta}</div>
        </td>
        <td><span class="badge ${badgeRole(role)}">${role}</span></td>
        <td class="text-secondary">${asa} • ${skill}</td>
        <td class="text-secondary">${paroasy}</td>
        <td class="text-secondary">${wa}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" data-action="view" data-id="${esc(m.id)}" title="Hijery">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-dark me-1" data-action="edit" data-id="${esc(m.id)}" title="Hanova">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${esc(m.id)}" title="Hafafa">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }

  function shortUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "—";
    try {
      const u = new URL(s);
      return u.hostname + u.pathname.replace(/\/$/, "");
    } catch {
      return s.length > 28 ? s.slice(0, 28) + "…" : s;
    }
  }

  // ---------------------------
  // Modal helpers (Bootstrap)
  // ---------------------------
  let modal;
  function ensureModal() {
    const el = $("#kmzModal");
    if (!el) throw new Error("Modal not found");
    modal = modal || new bootstrap.Modal(el);
    return modal;
  }
  function setModal(title, bodyHtml) {
    $("#kmzModalTitle").innerHTML = esc(title);
    $("#kmzModalBody").innerHTML = bodyHtml;
  }

  // ---------------------------
  // View / Add / Edit
  // ---------------------------
  function findById(id) {
    return allMembers.find(m => String(m.id) === String(id));
  }

  function openView(id) {
    const m = findById(id);
    if (!m) return;

    setModal("Fampahafantarana mpikambana", viewHtml(m));
    ensureModal().show();
  }

  function openAdd() {
    const draft = makeEmptyMember();
    setModal("Hampiditra mpikambana", formHtml(draft, "add"));
    ensureModal().show();
    bindForm("add");
  }

  function openEdit(id) {
    const m = findById(id);
    if (!m) return;

    setModal("Hanova mpikambana", formHtml(m, "edit"));
    ensureModal().show();
    bindForm("edit", id);
  }

  function viewHtml(m) {
    const line = (k, v) => `
      <div class="col-md-6">
        <div class="text-secondary small">${esc(k)}</div>
        <div class="fw-semibold">${esc(v || "—")}</div>
      </div>
    `;

    return `
      <div class="kmz-card p-3 p-md-4">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-3">
          <div>
            <div class="h5 mb-1">${esc(m.nom || "")} ${esc(m.prenom || "")}</div>
            <div class="text-secondary small">ID: <b>${esc(m.id || "—")}</b> • Sata: <b>${esc(m.sata || "—")}</b></div>
          </div>
          <span class="badge ${badgeRole(m.andraikitra)}">${esc(m.andraikitra || "—")}</span>
        </div>

        <div class="row g-3">
          ${line("Lahy/Vavy", m.sexe)}
          ${line("Taona", m.age)}
          ${line("Paroasy", m.paroasy)}
          ${line("Distrika", m.distrika)}
          ${line("Vikaria", m.vikaria)}
          ${line("Zavamaneno", m.zavamaneno)}
          ${line("Asa", m.asa)}
          ${line("Fahaiza-manao", m.fahaizamanao)}
          ${line("WhatsApp", m.whatsapp)}
          ${line("Facebook", m.facebook)}
          ${line("Adiresy", m.adresse)}
          <div class="col-12">
            <div class="text-secondary small">Fanamarihana</div>
            <div class="fw-semibold">${esc(m.fanamarihana || "—")}</div>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 mt-4">
          <button class="btn btn-outline-dark" id="btnEditFromView" type="button">
            <i class="bi bi-pencil me-2"></i>Hanova
          </button>
          <button class="btn btn-outline-danger" id="btnDeleteFromView" type="button">
            <i class="bi bi-trash me-2"></i>Hafafa
          </button>
        </div>
      </div>
    `;
  }

  function formHtml(m, mode) {
    const isEdit = mode === "edit";
    const idInput = isEdit
      ? `<input class="form-control" value="${esc(m.id)}" disabled />`
      : `<input class="form-control" id="f_id" value="${esc(m.id)}" placeholder="KMZ-0009" required />`;

    return `
      <form id="memberForm">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label fw-semibold">ID</label>
            ${idInput}
          </div>

          <div class="col-md-4">
            <label class="form-label fw-semibold">Anarana (Nom)</label>
            <input class="form-control" id="f_nom" value="${esc(m.nom)}" required />
          </div>

          <div class="col-md-4">
            <label class="form-label fw-semibold">Fanampiny (Prénom)</label>
            <input class="form-control" id="f_prenom" value="${esc(m.prenom)}" />
          </div>

          <div class="col-md-3">
            <label class="form-label fw-semibold">Lahy/Vavy</label>
            <select class="form-select" id="f_sexe">
              ${opt(m.sexe, ["Lahy","Vavy"])}
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label fw-semibold">Taona</label>
            <input type="number" min="10" max="90" class="form-control" id="f_age" value="${esc(m.age)}" />
          </div>

          <div class="col-md-3">
            <label class="form-label fw-semibold">Sata</label>
            <select class="form-select" id="f_sata">
              ${opt(m.sata, ["Aktif","Miato"])}
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label fw-semibold">Andraikitra</label>
            <select class="form-select" id="f_andraikitra">
              ${opt(m.andraikitra, ["Mpitendry","Teknisianina","Mpihira","Tomponandraikitra"])}
            </select>
          </div>

          <div class="col-md-4">
            <label class="form-label fw-semibold">Paroasy</label>
            <input class="form-control" id="f_paroasy" value="${esc(m.paroasy)}" />
          </div>

          <div class="col-md-4">
            <label class="form-label fw-semibold">Distrika</label>
            <input class="form-control" id="f_distrika" value="${esc(m.distrika)}" />
          </div>

          <div class="col-md-4">
            <label class="form-label fw-semibold">Vikaria</label>
            <input class="form-control" id="f_vikaria" value="${esc(m.vikaria)}" />
          </div>

          <div class="col-md-4">
            <label class="form-label fw-semibold">Zavamaneno</label>
            <input class="form-control" id="f_zavamaneno" value="${esc(m.zavamaneno)}" placeholder="Orgue / Guitare / …" />
          </div>

          <div class="col-md-4">
            <label class="form-label fw-semibold">Asa</label>
            <input class="form-control" id="f_asa" value="${esc(m.asa)}" placeholder="Mpampianatra / Employé / …" />
          </div>

          <div class="col-md-4">
            <label class="form-label fw-semibold">Fahaiza-manao</label>
            <input class="form-control" id="f_fahaiza" value="${esc(m.fahaizamanao)}" placeholder="Mixage / Soprano / …" />
          </div>

          <div class="col-md-4">
            <label class="form-label fw-semibold">WhatsApp</label>
            <input class="form-control" id="f_whatsapp" value="${esc(m.whatsapp)}" placeholder="034xxxxxxx" />
          </div>

          <div class="col-md-8">
            <label class="form-label fw-semibold">Facebook</label>
            <input class="form-control" id="f_facebook" value="${esc(m.facebook)}" placeholder="https://facebook.com/..." />
          </div>

          <div class="col-12">
            <label class="form-label fw-semibold">Adiresy</label>
            <input class="form-control" id="f_adresse" value="${esc(m.adresse)}" />
          </div>

          <div class="col-12">
            <label class="form-label fw-semibold">Fanamarihana</label>
            <textarea class="form-control" id="f_fanamarihana" rows="3">${esc(m.fanamarihana)}</textarea>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 mt-4">
          <button class="btn btn-kmz-primary" type="submit">
            <i class="bi bi-check2-circle me-2"></i>${isEdit ? "Hitahiry fanovana" : "Hampiditra"}
          </button>
          <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">
            <i class="bi bi-x-circle me-2"></i>Akatona
          </button>
        </div>
      </form>
    `;
  }

  function opt(current, options) {
    const cur = String(current || "").trim();
    return options.map(o => {
      const sel = (cur === o) ? "selected" : "";
      return `<option ${sel}>${esc(o)}</option>`;
    }).join("");
  }

  function bindForm(mode, editId) {
    const form = $("#memberForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const m = collectForm(mode, editId);
      if (!m) return;

      if (mode === "add") {
        // id unique check
        if (allMembers.some(x => String(x.id) === String(m.id))) {
          alert("Efa misy io ID io. Ovay azafady.");
          return;
        }
        allMembers.unshift(m);
      } else {
        const idx = allMembers.findIndex(x => String(x.id) === String(editId));
        if (idx >= 0) allMembers[idx] = { ...allMembers[idx], ...m, id: allMembers[idx].id };
      }

      saveMembers();
      buildParoisseOptions();
      applyFilters();
      ensureModal().hide();
    });

    // if view page buttons exist
    const btnEditFromView = $("#btnEditFromView");
    const btnDeleteFromView = $("#btnDeleteFromView");
    if (btnEditFromView && editId) btnEditFromView.onclick = () => openEdit(editId);
    if (btnDeleteFromView && editId) btnDeleteFromView.onclick = () => onDelete(editId);
  }

  function collectForm(mode, editId) {
    const get = (id) => (document.getElementById(id)?.value || "").trim();

    const id = mode === "add" ? get("f_id") : String(editId);
    const nom = get("f_nom");
    if (!nom) { alert("Fenoy azafady ny Anarana."); return null; }

    const ageVal = Number(get("f_age") || 0);

    return {
      id,
      nom,
      prenom: get("f_prenom"),
      sexe: get("f_sexe") || "Lahy",
      age: ageVal ? ageVal : "",
      paroasy: get("f_paroasy"),
      distrika: get("f_distrika"),
      vikaria: get("f_vikaria"),
      andraikitra: get("f_andraikitra"),
      zavamaneno: get("f_zavamaneno"),
      asa: get("f_asa"),
      fahaizamanao: get("f_fahaiza"),
      whatsapp: get("f_whatsapp"),
      facebook: get("f_facebook"),
      adresse: get("f_adresse"),
      sata: get("f_sata"),
      fanamarihana: (document.getElementById("f_fanamarihana")?.value || "").trim()
    };
  }

  // ---------------------------
  // Delete
  // ---------------------------
  function onDelete(id) {
    const m = findById(id);
    if (!m) return;

    const ok = confirm(`Hofafana ve ity mpikambana ity?\n\n${m.nom || ""} ${m.prenom || ""} (${m.id})`);
    if (!ok) return;

    allMembers = allMembers.filter(x => String(x.id) !== String(id));
    saveMembers();
    buildParoisseOptions();
    applyFilters();

    // if modal open, close
    try { ensureModal().hide(); } catch {}
  }

  // ---------------------------
  // Export CSV
  // ---------------------------
  function exportCsv() {
    const rows = viewMembers.length ? viewMembers : allMembers;

    const headers = [
      "id","nom","prenom","sexe","age","paroasy","distrika","vikaria","andraikitra","zavamaneno",
      "asa","fahaizamanao","whatsapp","facebook","adresse","sata","fanamarihana"
    ];

    const csv = [
      headers.join(","),
      ...rows.map(m => headers.map(h => csvCell(m[h])).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "kmz_rejistra.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(v) {
    const s = String(v ?? "");
    const needs = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needs ? `"${escaped}"` : escaped;
  }

// --- Bootstrap modal helper ---
let kmzModal;
function ensureModal() {
  const el = document.getElementById("kmzModal");
  if (!el) throw new Error("kmzModal introuvable ao amin'ny HTML.");
  kmzModal = kmzModal || new bootstrap.Modal(el);
  return kmzModal;
}

function setModal(title, bodyHtml) {
  document.getElementById("kmzModalTitle").textContent = title;
  document.getElementById("kmzModalBody").innerHTML = bodyHtml;
}

// --- Open Add popup ---
function openAdd() {
  // Form minimal (azo ovaina raha efa manana form feno ianao)
  setModal("Hampiditra mpikambana", `
    <form id="memberForm" class="p-2">
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label fw-semibold">ID</label>
          <input class="form-control" id="f_id" placeholder="KMZ-0009" required>
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">Anarana</label>
          <input class="form-control" id="f_nom" required>
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">Fanampiny</label>
          <input class="form-control" id="f_prenom">
        </div>

        <div class="col-md-4">
          <label class="form-label fw-semibold">Andraikitra</label>
          <select class="form-select" id="f_andraikitra">
            <option>Mpitendry</option>
            <option>Teknisianina</option>
            <option>Mpihira</option>
            <option>Tomponandraikitra</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">Paroasy</label>
          <input class="form-control" id="f_paroasy">
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">WhatsApp</label>
          <input class="form-control" id="f_whatsapp" placeholder="034xxxxxxx">
        </div>

        <div class="col-12">
          <label class="form-label fw-semibold">Asa / Fahaiza-manao</label>
          <input class="form-control" id="f_asa" placeholder="Asa">
        </div>
      </div>

      <div class="d-flex gap-2 mt-4">
        <button class="btn btn-kmz-primary" type="submit">
          <i class="bi bi-check2-circle me-2"></i>Hampiditra
        </button>
        <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">
          Akatona
        </button>
      </div>
    </form>
  `);

  ensureModal().show();

  // Submit handler (ajoute au tableau + sauvegarde localStorage)
  const form = document.getElementById("memberForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = document.getElementById("f_id").value.trim();
    const nom = document.getElementById("f_nom").value.trim();
    const prenom = document.getElementById("f_prenom").value.trim();
    const andraikitra = document.getElementById("f_andraikitra").value.trim();
    const paroasy = document.getElementById("f_paroasy").value.trim();
    const whatsapp = document.getElementById("f_whatsapp").value.trim();
    const asa = document.getElementById("f_asa").value.trim();

    if (!id || !nom) {
      alert("Fenoy azafady ny ID sy Anarana.");
      return;
    }
    if (allMembers.some(m => String(m.id) === String(id))) {
      alert("Efa misy io ID io. Ovay azafady.");
      return;
    }

    allMembers.unshift({
      id, nom, prenom,
      andraikitra, paroasy, whatsapp,
      asa, fahaizamanao: "",
      facebook: "", distrika: "", vikaria: "",
      sexe: "", age: "", zavamaneno: "",
      adresse: "", sata: "Aktif", fanamarihana: ""
    });

    saveMembers();
    buildParoisseOptions();
    applyFilters();

    ensureModal().hide();
  });
}


  // ---------------------------
  // Init + events
  // ---------------------------
  async function init() {
    // Elements
    const btnAdd = $("#btnAddMember");
    const btnExport = $("#btnExportCsv");
    const btnRefresh = $("#btnRefreshMembers");
    const btnPrev = $("#btnPrev");
    const btnNext = $("#btnNext");
    const searchInput = $("#searchInput");
    const filterRole = $("#filterRole");
    const filterParoisse = $("#filterParoisse");

    // Load
    await loadMembers();

    // Build options
    buildParoisseOptions();

    // Init view
    viewMembers = [...allMembers];
    render();

    // Events
    btnAdd?.addEventListener("click", openAdd);
    btnExport?.addEventListener("click", exportCsv);

    btnRefresh?.addEventListener("click", async () => {
      // reload from JSON only if you want reset:
      // For now, refresh uses localStorage dataset and re-renders
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        try { allMembers = JSON.parse(local) || []; } catch {}
      }
      buildParoisseOptions();
      applyFilters();
    });

    btnPrev?.addEventListener("click", () => { if (page > 1) { page--; render(); } });
    btnNext?.addEventListener("click", () => { page++; render(); });

    searchInput?.addEventListener("input", applyFilters);
    filterRole?.addEventListener("change", applyFilters);
    filterParoisse?.addEventListener("change", applyFilters);

    // View modal quick buttons (bind after modal shows)
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.id === "btnEditFromView") {
        const id = $("#btnEditFromView")?.getAttribute("data-id");
        if (id) openEdit(id);
      }
    });
  }

  // Extra: hook view buttons when modal opens
  document.addEventListener("shown.bs.modal", () => {
    const title = ($("#kmzModalTitle")?.textContent || "").toLowerCase();
    if (!title.includes("fampahafantarana")) return;
    // infer current id from title body if needed (not required)
  });

  // Start
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await init();
    } catch (err) {
      console.error(err);
      const tbody = $("#membersTbody");
      const status = $("#membersStatus");
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Tsy afaka mitondra ny lisitra (members.json).</td></tr>`;
      if (status) status.textContent = "Hadisoana: tsy afaka mitondra ny angona.";
      alert("Tsy afaka mitondra ny lisitra. Jereo raha misy: data/members.json");
    }
  });
})();
