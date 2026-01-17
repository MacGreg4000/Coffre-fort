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
  const json = JSON.stringify(payload).replace(/</g, "\\u003c")

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SafeVault - Export offline (lecture seule)</title>
  <style>
    :root { color-scheme: dark; --bg:#0b1220; --card:#101a2e; --text:#e8eefc; --muted:#a9b4d0; --primary:#3b82f6; --border:rgba(255,255,255,.10); }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background: radial-gradient(circle at 20% 20%, rgba(59,130,246,.12), transparent 30%), var(--bg); color:var(--text); }
    .wrap{max-width:1100px;margin:0 auto;padding:24px;}
    .header{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:18px;}
    .badge{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid rgba(59,130,246,.35);background:rgba(59,130,246,.12);border-radius:999px;color:var(--primary);font-weight:700;font-size:12px;}
    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px;}
    .card{grid-column:span 12;background:rgba(16,26,46,.78);border:1px solid var(--border);border-radius:16px;padding:14px 14px;}
    @media (min-width: 900px){ .card.half{grid-column:span 6;} .card.third{grid-column:span 4;} }
    h1{font-size:20px;margin:0}
    h2{font-size:14px;margin:0 0 10px 0;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
    .muted{color:var(--muted);font-size:13px}
    .kpi{font-size:22px;font-weight:800;margin-top:6px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}
    th{color:var(--muted);font-weight:700;text-align:left}
    a{color:var(--primary);text-decoration:none}
    a:hover{text-decoration:underline}
    .pill{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.12);color:var(--muted);font-size:12px}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .small{font-size:12px}
    .divider{height:1px;background:rgba(255,255,255,.08);margin:10px 0}
    .danger{color:#ef4444}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <div class="badge">Export offline (lecture seule)</div>
        <h1>SafeVault — Héritage</h1>
        <div class="muted small" id="meta"></div>
      </div>
      <div class="row">
        <a class="pill" href="./data.json" download>Télécharger data.json</a>
      </div>
    </div>

    <div class="grid">
      <div class="card third">
        <h2>Coffres</h2>
        <div class="kpi" id="kpiCoffres">-</div>
        <div class="muted">Nombre de coffres exportés</div>
      </div>
      <div class="card third">
        <h2>Actifs</h2>
        <div class="kpi" id="kpiAssets">-</div>
        <div class="muted">Nombre d'actifs exportés</div>
      </div>
      <div class="card third">
        <h2>Fichiers MDP</h2>
        <div class="kpi" id="kpiPwFiles">-</div>
        <div class="muted">Fichiers bruts inclus</div>
      </div>

      <div class="card">
        <h2>Coffres (balance)</h2>
        <div class="muted small">La suppression d'un coffre dans l'app supprime aussi l'historique. Ici, tout est figé.</div>
        <div class="divider"></div>
        <table>
          <thead><tr><th>Nom</th><th>Solde</th><th>Dernier inventaire</th></tr></thead>
          <tbody id="tblCoffres"></tbody>
        </table>
      </div>

      <div class="card half">
        <h2>Actifs</h2>
        <table>
          <thead><tr><th>Nom</th><th>Catégorie</th><th>Localisation</th><th>Dernier évènement</th></tr></thead>
          <tbody id="tblAssets"></tbody>
        </table>
      </div>

      <div class="card half">
        <h2>Fichiers (exports MDP)</h2>
        <div class="muted small">Les fichiers sont fournis tels quels. Cliquez pour télécharger.</div>
        <div class="divider"></div>
        <div id="pwFiles"></div>
        <div class="divider"></div>
        <div class="muted small danger">Conseil: conservez cette clé USB dans un endroit sûr.</div>
      </div>
    </div>
  </div>

  <script id="sv-payload" type="application/json">${json}</script>
  <script>
    const payload = JSON.parse(document.getElementById('sv-payload').textContent);
    const fmtEUR = (n) => new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR' }).format(Number(n||0));
    const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR') : '-';

    document.getElementById('meta').textContent =
      'Généré le ' + fmtDate(payload.exportedAt) + ' · Utilisateur: ' + (payload.user?.email || '-');

    document.getElementById('kpiCoffres').textContent = String(payload.coffres?.length || 0);
    document.getElementById('kpiAssets').textContent = String(payload.assets?.length || 0);
    document.getElementById('kpiPwFiles').textContent = String(payload.passwordFiles?.length || 0);

    const tblCoffres = document.getElementById('tblCoffres');
    (payload.coffres || []).forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><b>' + (c.name || '-') + '</b></td>' +
        '<td>' + fmtEUR(c.balance || 0) + '</td>' +
        '<td class="muted small">' + (c.lastInventoryDate ? (fmtDate(c.lastInventoryDate) + ' · ' + fmtEUR(c.lastInventoryAmount||0)) : '-') + '</td>';
      tblCoffres.appendChild(tr);
    });

    const coffresById = new Map((payload.coffres||[]).map(c => [c.id, c]));
    const tblAssets = document.getElementById('tblAssets');
    (payload.assets || []).forEach(a => {
      const last = (a.events && a.events[0]) ? a.events[0] : null;
      const coffreName = a.coffreId ? (coffresById.get(a.coffreId)?.name || '-') : 'Non localisé';
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td><b>' + (a.name || '-') + '</b></td>' +
        '<td><span class="pill">' + (a.category || '—') + '</span></td>' +
        '<td>' + coffreName + '</td>' +
        '<td class="muted small">' +
          (last ? (last.type + (last.amount != null ? (' · ' + fmtEUR(last.amount)) : '') + ' · ' + fmtDate(last.date)) : '—') +
        '</td>';
      tblAssets.appendChild(tr);
    });

    const pwDiv = document.getElementById('pwFiles');
    (payload.passwordFiles || []).forEach(f => {
      const line = document.createElement('div');
      line.className = 'row';
      const href = './password-files/' + encodeURIComponent(f.storedName);
      line.innerHTML =
        '<a href="' + href + '" download>' + f.filename + '</a>' +
        '<span class="pill">' + (f.mimeType || '-') + '</span>' +
        '<span class="muted small">' + (f.sizeBytes || 0) + ' bytes</span>' +
        '<span class="muted small">sha256: ' + (f.sha256 || '-') + '</span>';
      pwDiv.appendChild(line);
    });
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

