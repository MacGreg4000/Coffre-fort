import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { adminRoute } from "@/lib/api-middleware"
import { EXPORT_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError } from "@/lib/api-utils"
import archiver from "archiver"
import { Readable } from "stream"
import { computeCoffreBalanceInfo } from "@/lib/balance"

function safeFilename(name: string) {
  // Nettoyage simple cross-platform
  return name
    .replace(/[\/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)
}

function buildIndexHtml(payload: any) {
  // Viewer OFFLINE lecture seule:
  // - charge le JSON inline (pas de fetch => compatible file://)
  // - propose des liens vers les fichiers présents dans le zip (password-files/*)
  // - affiche un tableau CSV interactif avec recherche et filtres
  const json = JSON.stringify(payload).replace(/</g, "\\u003c")

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SafeVault — Export offline (lecture seule)</title>
  <style>
    :root {
      --bg: #f8fafc;
      --bg2: #ffffff;
      --card: #ffffff;
      --text: #1e293b;
      --muted: #64748b;
      --primary: #2563eb;
      --primary-light: #eff6ff;
      --primary-border: #bfdbfe;
      --border: #e2e8f0;
      --success: #16a34a;
      --danger: #dc2626;
      --shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
      --shadow-md: 0 4px 6px rgba(0,0,0,.04), 0 2px 4px rgba(0,0,0,.03);
      --radius: 12px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* Layout */
    .wrap { max-width: 1200px; margin: 0 auto; padding: 24px 20px 48px; }
    @media (min-width: 640px) { .wrap { padding: 32px 32px 64px; } }

    /* Header */
    .header { margin-bottom: 28px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: 999px;
      background: var(--primary-light); border: 1px solid var(--primary-border);
      color: var(--primary); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .03em;
    }
    .badge svg { width: 14px; height: 14px; }
    h1 { font-size: 24px; font-weight: 700; margin: 8px 0 4px; color: var(--text); }
    @media (min-width: 640px) { h1 { font-size: 28px; } }
    .meta { color: var(--muted); font-size: 13px; }
    .btn-dl {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
      background: var(--primary); color: #fff; text-decoration: none;
      transition: background .15s;
    }
    .btn-dl:hover { background: #1d4ed8; }
    .btn-dl svg { width: 16px; height: 16px; }

    /* Grid */
    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 900px) { .grid { grid-template-columns: repeat(3, 1fr); } }
    .grid-full { grid-column: 1 / -1; }
    @media (min-width: 640px) { .grid-half { grid-column: span 1; } }
    @media (min-width: 900px) { .grid-half { grid-column: span 1; } }

    /* Cards */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow);
    }
    .card-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 12px;
    }
    .card-icon {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: var(--primary-light); color: var(--primary);
    }
    .card-icon svg { width: 18px; height: 18px; }
    .card-label { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
    .kpi { font-size: 28px; font-weight: 800; color: var(--text); }
    .kpi-sub { font-size: 13px; color: var(--muted); margin-top: 2px; }

    /* Section titles */
    .section-title {
      font-size: 16px; font-weight: 700; color: var(--text); margin: 0 0 4px;
    }
    .section-sub { font-size: 13px; color: var(--muted); margin: 0 0 12px; }
    .divider { height: 1px; background: var(--border); margin: 12px 0; }

    /* Tables */
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      padding: 10px 12px; text-align: left; font-weight: 700; font-size: 12px;
      color: var(--muted); text-transform: uppercase; letter-spacing: .04em;
      background: #f8fafc; border-bottom: 2px solid var(--border);
      white-space: nowrap;
    }
    td {
      padding: 10px 12px; border-bottom: 1px solid var(--border);
      vertical-align: top; color: var(--text);
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
    .td-bold { font-weight: 600; }
    .td-muted { color: var(--muted); font-size: 12px; }
    .pill {
      display: inline-block; padding: 2px 10px; border-radius: 999px;
      background: #f1f5f9; border: 1px solid var(--border);
      color: var(--muted); font-size: 12px; font-weight: 500;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .text-danger { color: var(--danger); }
    .text-success { color: var(--success); }

    /* Tabs */
    .tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border); margin-bottom: 16px; }
    .tab {
      padding: 10px 20px; font-size: 14px; font-weight: 600; color: var(--muted);
      background: none; border: none; cursor: pointer;
      border-bottom: 2px solid transparent; margin-bottom: -2px;
      transition: all .15s;
    }
    .tab:hover { color: var(--text); }
    .tab.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Inputs */
    .input-group { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
    .input {
      padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px;
      font-size: 13px; background: var(--bg); color: var(--text);
      outline: none; transition: border-color .15s;
      flex: 1; min-width: 160px;
    }
    .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
    .input::placeholder { color: #94a3b8; }
    .input-full { width: 100%; flex: unset; min-width: unset; margin-bottom: 10px; }

    /* Password field */
    .pw-cell { display: flex; align-items: center; gap: 6px; }
    .pw-text { font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace; font-size: 13px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pw-btn {
      width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--border);
      background: var(--bg); color: var(--muted); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: all .15s; flex-shrink: 0;
    }
    .pw-btn:hover { background: var(--primary-light); color: var(--primary); border-color: var(--primary-border); }
    .pw-btn svg { width: 14px; height: 14px; }

    /* File list */
    .file-row {
      display: flex; align-items: center; gap: 12px; padding: 10px 0;
      border-bottom: 1px solid var(--border); flex-wrap: wrap;
    }
    .file-row:last-child { border-bottom: none; }
    .file-icon {
      width: 36px; height: 36px; border-radius: 8px;
      background: var(--primary-light); color: var(--primary);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .file-icon svg { width: 18px; height: 18px; }
    .file-info { flex: 1; min-width: 0; }
    .file-name { font-weight: 600; font-size: 14px; color: var(--primary); word-break: break-all; }
    .file-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .file-hash { font-size: 11px; color: #94a3b8; font-family: monospace; word-break: break-all; margin-top: 1px; }

    /* Counter badge */
    .count-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; padding: 0 6px; height: 20px; border-radius: 999px;
      background: var(--primary); color: #fff; font-size: 11px; font-weight: 700;
    }

    /* Footer */
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border); }
    .footer p { font-size: 12px; color: #94a3b8; margin: 2px 0; }

    /* CSV section */
    .csv-section { margin-top: 4px; }
    .csv-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .csv-title { font-size: 14px; font-weight: 700; color: var(--text); }
    .csv-count { font-size: 13px; color: var(--muted); }

    /* Print */
    @media print {
      body { background: #fff; }
      .card { box-shadow: none; border: 1px solid #ddd; break-inside: avoid; }
      .btn-dl, .pw-btn, .input-group, .input, .tabs { display: none !important; }
      .tab-content { display: block !important; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <div>
          <div class="badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Export offline · Lecture seule
          </div>
          <h1>SafeVault — Héritage</h1>
          <div class="meta" id="meta"></div>
        </div>
        <a class="btn-dl" href="./data.json" download>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Télécharger data.json
        </a>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <span class="card-label">Coffres</span>
        </div>
        <div class="kpi" id="kpiCoffres">—</div>
        <div class="kpi-sub">Nombre de coffres exportés</div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <span class="card-label">Actifs</span>
        </div>
        <div class="kpi" id="kpiAssets">—</div>
        <div class="kpi-sub">Nombre d'actifs exportés</div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <span class="card-label">Fichiers MDP</span>
        </div>
        <div class="kpi" id="kpiPwFiles">—</div>
        <div class="kpi-sub">Fichiers bruts inclus</div>
      </div>
    </div>

    <!-- Navigation onglets -->
    <div class="card grid-full" style="padding: 0; overflow: hidden;">
      <div class="tabs" style="padding: 0 20px;">
        <button class="tab active" onclick="switchTab('coffres')">Coffres</button>
        <button class="tab" onclick="switchTab('actifs')">Actifs</button>
        <button class="tab" onclick="switchTab('mdp')">Mots de passe</button>
        <button class="tab" onclick="switchTab('fichiers')">Fichiers</button>
      </div>

      <!-- Onglet Coffres -->
      <div id="tab-coffres" class="tab-content active" style="padding: 20px;">
        <div class="section-title">Coffres (balance)</div>
        <p class="section-sub">La suppression d'un coffre dans l'app supprime aussi l'historique. Ici, tout est figé.</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>Solde</th><th>Dernier inventaire</th></tr></thead>
            <tbody id="tblCoffres"></tbody>
          </table>
        </div>
      </div>

      <!-- Onglet Actifs -->
      <div id="tab-actifs" class="tab-content" style="padding: 20px;">
        <div class="section-title">Actifs</div>
        <p class="section-sub">Liste des actifs et leur dernier évènement enregistré.</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>Catégorie</th><th>Localisation</th><th>Dernier évènement</th></tr></thead>
            <tbody id="tblAssets"></tbody>
          </table>
        </div>
      </div>

      <!-- Onglet Mots de passe (CSV viewer) -->
      <div id="tab-mdp" class="tab-content" style="padding: 20px;">
        <div class="csv-section" id="csvSection">
          <div id="csvEmpty" style="color:var(--muted);font-size:14px;">
            Aucun fichier CSV trouvé dans les fichiers exportés.
          </div>
          <div id="csvViewer" style="display:none;">
            <div class="csv-header">
              <div>
                <span class="csv-title" id="csvFilename"></span>
                <span class="csv-count" id="csvCount"></span>
              </div>
            </div>
            <input class="input input-full" type="text" id="csvSearch" placeholder="Rechercher dans toutes les colonnes..." oninput="filterCsv()" />
            <div class="input-group">
              <input class="input" type="text" id="filterTitle" placeholder="Filtrer par Titre..." oninput="filterCsv()" />
              <input class="input" type="text" id="filterURL" placeholder="Filtrer par URL..." oninput="filterCsv()" />
              <input class="input" type="text" id="filterUsername" placeholder="Filtrer par Username..." oninput="filterCsv()" />
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Titre</th><th>URL</th><th>Username</th>
                    <th>Mot de passe</th><th>Notes</th><th>OTPAuth</th>
                  </tr>
                </thead>
                <tbody id="csvBody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Onglet Fichiers -->
      <div id="tab-fichiers" class="tab-content" style="padding: 20px;">
        <div class="section-title">Fichiers (exports MDP)</div>
        <p class="section-sub">Les fichiers sont fournis tels quels dans le ZIP. Cliquez pour ouvrir/télécharger.</p>
        <div id="pwFiles"></div>
        <div style="margin-top:16px;">
          <p class="td-muted text-danger" style="font-weight:600;">Conseil : conservez cette clé USB / archive dans un endroit sûr.</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>SafeVault — Export offline généré automatiquement</p>
      <p>Ce fichier est en lecture seule. Ouvrez-le dans un navigateur.</p>
    </div>
  </div>

  <script id="sv-payload" type="application/json">${json}</script>
  <script>
    // --- Données ---
    const payload = JSON.parse(document.getElementById('sv-payload').textContent);
    const fmtEUR = (n) => new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR' }).format(Number(n||0));
    const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR') : '—';
    const esc = (s) => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

    // --- Meta ---
    document.getElementById('meta').textContent =
      'Généré le ' + fmtDate(payload.exportedAt) + ' · Utilisateur : ' + (payload.user?.email || '—');

    // --- KPIs ---
    document.getElementById('kpiCoffres').textContent = String(payload.coffres?.length || 0);
    document.getElementById('kpiAssets').textContent = String(payload.assets?.length || 0);
    document.getElementById('kpiPwFiles').textContent = String(payload.passwordFiles?.length || 0);

    // --- Tabs ---
    function switchTab(name) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('tab-' + name).classList.add('active');
      event.target.classList.add('active');
    }

    // --- Coffres ---
    const tblCoffres = document.getElementById('tblCoffres');
    (payload.coffres || []).forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="td-bold">' + esc(c.name || '—') + '</td>' +
        '<td>' + fmtEUR(c.balance || 0) + '</td>' +
        '<td class="td-muted">' +
          (c.lastInventoryDate ? (fmtDate(c.lastInventoryDate) + ' · ' + fmtEUR(c.lastInventoryAmount||0)) : '—') +
        '</td>';
      tblCoffres.appendChild(tr);
    });

    // --- Actifs ---
    const coffresById = new Map((payload.coffres||[]).map(c => [c.id, c]));
    const tblAssets = document.getElementById('tblAssets');
    (payload.assets || []).forEach(a => {
      const last = (a.events && a.events[0]) ? a.events[0] : null;
      const coffreName = a.coffreId ? (coffresById.get(a.coffreId)?.name || '—') : 'Non localisé';
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="td-bold">' + esc(a.name || '—') + '</td>' +
        '<td><span class="pill">' + esc(a.category || '—') + '</span></td>' +
        '<td>' + esc(coffreName) + '</td>' +
        '<td class="td-muted">' +
          (last ? (esc(last.type) + (last.amount != null ? (' · ' + fmtEUR(last.amount)) : '') + ' · ' + fmtDate(last.date)) : '—') +
        '</td>';
      tblAssets.appendChild(tr);
    });

    // --- Fichiers ---
    const pwDiv = document.getElementById('pwFiles');
    (payload.passwordFiles || []).forEach(f => {
      const href = './password-files/' + encodeURIComponent(f.storedName);
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML =
        '<div class="file-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
        '<div class="file-info">' +
          '<a class="file-name" href="' + href + '" download>' + esc(f.filename) + '</a>' +
          '<div class="file-meta">' + esc(f.mimeType || '—') + ' · ' + (f.sizeBytes || 0) + ' bytes</div>' +
          '<div class="file-hash">SHA-256 : ' + esc(f.sha256 || '—') + '</div>' +
        '</div>';
      pwDiv.appendChild(row);
    });

    // --- CSV Viewer ---
    let csvEntries = [];
    const visiblePws = new Set();

    function parseCsvLine(line, sep) {
      const result = []; let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i], n = line[i+1];
        if (c === '"') { if (inQ && n === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
        else if (c === sep && !inQ) { result.push(cur); cur = ''; }
        else { cur += c; }
      }
      result.push(cur); return result;
    }

    function parseCsv(text) {
      const lines = text.split('\\n').filter(l => l.trim());
      if (!lines.length) return [];
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = parseCsvLine(lines[0], sep).map(h => h.trim().toLowerCase());
      const idx = { title: headers.indexOf('title'), url: headers.indexOf('url'), username: headers.indexOf('username'), password: headers.indexOf('password'), notes: headers.indexOf('notes'), otpauth: headers.indexOf('otpauth') };
      const entries = [];
      for (let i = 1; i < lines.length; i++) {
        const v = parseCsvLine(lines[i], sep);
        if (!v.length) continue;
        entries.push({
          Title: (v[idx.title] || '').trim(),
          URL: (v[idx.url] || '').trim(),
          Username: (v[idx.username] || '').trim(),
          Password: (v[idx.password] || '').trim(),
          Notes: (v[idx.notes] || '').trim(),
          OTPAuth: (v[idx.otpauth] || '').trim(),
        });
      }
      return entries;
    }

    // Trouver le premier fichier CSV et le parser via son contenu texte encodé dans le JSON
    // Note: on essaie de lire les fichiers bruts inclus dans le ZIP
    (function initCsv() {
      const csvFile = (payload.passwordFiles || []).find(f =>
        f.filename.toLowerCase().endsWith('.csv') ||
        (f.mimeType && (f.mimeType.includes('csv') || f.mimeType.includes('comma')))
      );
      if (!csvFile) return;

      document.getElementById('csvEmpty').style.display = 'none';
      document.getElementById('csvViewer').style.display = 'block';
      document.getElementById('csvFilename').textContent = csvFile.filename;

      // Lire le fichier via XMLHttpRequest (fonctionne en file://)
      const href = './password-files/' + encodeURIComponent(csvFile.storedName);
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', href, false); // synchrone pour file://
        xhr.send();
        if (xhr.status === 0 || xhr.status === 200) {
          csvEntries = parseCsv(xhr.responseText);
          renderCsv(csvEntries);
        }
      } catch(e) {
        // Fallback: indication que le fichier n'est pas lisible inline
        document.getElementById('csvEmpty').style.display = 'block';
        document.getElementById('csvEmpty').textContent = 'Impossible de lire le CSV inline. Téléchargez-le depuis l\\'onglet Fichiers.';
        document.getElementById('csvViewer').style.display = 'none';
      }
    })();

    function renderCsv(entries) {
      const body = document.getElementById('csvBody');
      body.innerHTML = '';
      document.getElementById('csvCount').textContent = ' — ' + entries.length + ' entrée' + (entries.length > 1 ? 's' : '');
      entries.forEach((e, i) => {
        const tr = document.createElement('tr');
        const pwVisible = visiblePws.has(i);
        tr.innerHTML =
          '<td><div style="max-width:180px" title="' + esc(e.Title) + '">' + esc(e.Title || '—') + '</div></td>' +
          '<td><div style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(e.URL) + '">' +
            (e.URL ? '<a href="' + esc(e.URL) + '" target="_blank" rel="noopener">' + esc(e.URL) + '</a>' : '—') +
          '</div></td>' +
          '<td><div style="max-width:150px" title="' + esc(e.Username) + '">' + esc(e.Username || '—') + '</div></td>' +
          '<td><div class="pw-cell">' +
            '<span class="pw-text">' + (pwVisible ? esc(e.Password || '—') : '••••••••') + '</span>' +
            '<button class="pw-btn" onclick="togglePw(' + i + ')" title="' + (pwVisible ? 'Masquer' : 'Afficher') + '">' +
              (pwVisible
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>') +
            '</button>' +
            '<button class="pw-btn" onclick="copyPw(' + i + ')" title="Copier">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
            '</button>' +
          '</div></td>' +
          '<td><div style="max-width:180px" title="' + esc(e.Notes) + '">' + esc(e.Notes || '—') + '</div></td>' +
          '<td><div style="max-width:160px;font-family:monospace;font-size:11px" title="' + esc(e.OTPAuth) + '">' + esc(e.OTPAuth || '—') + '</div></td>';
        body.appendChild(tr);
      });
    }

    function filterCsv() {
      const s = (document.getElementById('csvSearch').value || '').toLowerCase();
      const fTitle = (document.getElementById('filterTitle').value || '').toLowerCase();
      const fURL = (document.getElementById('filterURL').value || '').toLowerCase();
      const fUser = (document.getElementById('filterUsername').value || '').toLowerCase();
      const filtered = csvEntries.filter(e => {
        if (s && !(e.Title+e.URL+e.Username+e.Password+e.Notes+e.OTPAuth).toLowerCase().includes(s)) return false;
        if (fTitle && !e.Title.toLowerCase().includes(fTitle)) return false;
        if (fURL && !e.URL.toLowerCase().includes(fURL)) return false;
        if (fUser && !e.Username.toLowerCase().includes(fUser)) return false;
        return true;
      });
      visiblePws.clear();
      renderCsv(filtered);
    }

    function togglePw(idx) {
      if (visiblePws.has(idx)) visiblePws.delete(idx); else visiblePws.add(idx);
      filterCsv();
    }

    function copyPw(idx) {
      const filtered = getFilteredEntries();
      const pw = filtered[idx]?.Password || '';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(pw).catch(() => {});
      } else {
        // Fallback pour file://
        const ta = document.createElement('textarea');
        ta.value = pw; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch(e) {}
        document.body.removeChild(ta);
      }
      // Feedback visuel
      visiblePws.add(idx);
      filterCsv();
      setTimeout(() => { visiblePws.delete(idx); filterCsv(); }, 5000);
    }

    function getFilteredEntries() {
      const s = (document.getElementById('csvSearch').value || '').toLowerCase();
      const fTitle = (document.getElementById('filterTitle').value || '').toLowerCase();
      const fURL = (document.getElementById('filterURL').value || '').toLowerCase();
      const fUser = (document.getElementById('filterUsername').value || '').toLowerCase();
      return csvEntries.filter(e => {
        if (s && !(e.Title+e.URL+e.Username+e.Password+e.Notes+e.OTPAuth).toLowerCase().includes(s)) return false;
        if (fTitle && !e.Title.toLowerCase().includes(fTitle)) return false;
        if (fURL && !e.URL.toLowerCase().includes(fURL)) return false;
        if (fUser && !e.Username.toLowerCase().includes(fUser)) return false;
        return true;
      });
    }
  </script>
</body>
</html>`
}

async function getHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")
    if (session.user.role !== "ADMIN") throw new ApiError(403, "Admin requis")

    // Récupérer coffres + balances
    const coffres = await prisma.coffre.findMany({
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "asc" },
    })

    const coffresWithBalance = await Promise.all(
      coffres.map(async (c) => {
        const info = await computeCoffreBalanceInfo(prisma, c.id)
        return {
          ...c,
          balance: info.balance,
          lastInventoryDate: info.lastInventoryDate,
          lastInventoryAmount: info.lastInventoryAmount,
        }
      })
    )

    // Actifs (tous users) + events
    const assets = await (prisma as any).asset.findMany({
      include: {
        events: { orderBy: { date: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    })

    // Réserves
    const reserves = await prisma.reserve.findMany({
      orderBy: [{ userId: "asc" }, { year: "asc" }],
    })

    // Fichiers MDP
    const passwordFiles = await (prisma as any).passwordFile.findMany({
      select: {
        id: true,
        userId: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        createdAt: true,
        data: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Protection basique contre exports énormes (évite crash mémoire)
    const totalBytes = passwordFiles.reduce((sum: number, f: any) => sum + (f.sizeBytes || 0), 0)
    const MAX_BYTES = 250 * 1024 * 1024 // 250MB
    if (totalBytes > MAX_BYTES) {
      throw new ApiError(413, `Export trop volumineux (${Math.round(totalBytes / (1024 * 1024))}MB). Supprimez/limitez les fichiers MDP puis réessayez.`)
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      user: { id: session.user.id, email: session.user.email, name: session.user.name, role: session.user.role },
      coffres: coffresWithBalance,
      assets,
      reserves,
      // Les fichiers sont listés ici, les bytes seront stockés en fichiers séparés dans le ZIP.
      passwordFiles: passwordFiles.map((f: any, idx: number) => ({
        id: f.id,
        userId: f.userId,
        filename: f.filename,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        sha256: f.sha256,
        createdAt: f.createdAt,
        storedName: `${String(idx + 1).padStart(3, "0")}-${safeFilename(f.filename)}`,
      })),
    }

    const zipName = `safevault-offline-${new Date().toISOString().slice(0, 10)}.zip`

    // Créer une réponse stream ZIP
    const archive = archiver("zip", { zlib: { level: 9 } })
    const stream = new Readable({
      read() {
        // archiver poussera les chunks
      },
    })

    archive.on("data", (chunk) => stream.push(chunk))
    archive.on("end", () => stream.push(null))
    archive.on("error", (err) => {
      // Terminer le stream en cas d'erreur
      stream.destroy(err)
    })

    // Fichiers
    archive.append(buildIndexHtml(payload), { name: "index.html" })
    archive.append(JSON.stringify(payload, null, 2), { name: "data.json" })
    archive.append(
      [
        "SafeVault - Export offline (lecture seule)",
        "",
        "Ouvrez index.html dans un navigateur.",
        "Cet export contient:",
        "- data.json (données exportées)",
        "- password-files/* (fichiers bruts importés)",
        "",
        "Note: tout est en lecture seule.",
      ].join("\n"),
      { name: "README.txt" }
    )

    // Écrire les fichiers bruts
    passwordFiles.forEach((f: any, idx: number) => {
      const storedName = `${String(idx + 1).padStart(3, "0")}-${safeFilename(f.filename)}`
      archive.append(Buffer.from(f.data), { name: `password-files/${storedName}` })
    })

    await archive.finalize()

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = adminRoute(getHandler, EXPORT_RATE_LIMIT)

