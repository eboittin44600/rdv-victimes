'use client'
// src/app/admin/page.tsx — Tableau de bord administrateur barreau

import { useEffect, useState } from 'react'

type Stats = {
  rdvCeMois: number; evolutionRdv: number; delaiMoyen: number
  avocatsActifs: number; avocatsTotal: number; tauxAnnulation: number
  creneauxLibres: number
  repartitionViolences: { type: string; count: number }[]
  repartitionParcours: { parcours: string; count: number }[]
  avocats: { id: string; nom: string; actif: boolean; rdvCeMois: number; creneauxLibres: number }[]
}

const TYPE_LABELS: Record<string, string> = {
  CONJUGALES: 'Violences conjugales', SEXUELLES: 'Violences sexuelles',
  INTRAFAMILIALES: 'Violences intrafamiliales', HARCELEMENT: 'Harcèlement',
  AUTRE: 'Autre', NON_PRECISE: 'Non précisé',
}

const TYPE_COLORS: Record<string, string> = {
  CONJUGALES: '#1D9E75', SEXUELLES: '#7F77DD', INTRAFAMILIALES: '#D4537E',
  HARCELEMENT: '#EF9F27', AUTRE: '#888780', NON_PRECISE: '#B4B2A9',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'apercu' | 'avocats'>('apercu')

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => { if (r.status === 401) { window.location.href = '/admin/auth'; return null } return r.json() })
      .then(d => { if (d) { setStats(d); setLoading(false) } })
  }, [])

  async function toggleAvocat(id: string, actif: boolean) {
    await fetch(`/api/admin/avocats/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !actif }),
    })
    const res = await fetch('/api/admin/stats')
    setStats(await res.json())
  }

  async function exporter() {
    const res = await fetch('/api/admin/export')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `stats-rdv-${new Date().toISOString().slice(0, 7)}.csv`
    a.click()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-400">Chargement…</div>
    </div>
  )

  if (!stats) return null

  const totalParcoursRdv = stats.repartitionParcours.reduce((s, r) => s + r.count, 0)
  const rdvA = stats.repartitionParcours.find(r => r.parcours === 'A')?.count ?? 0
  const rdvB = stats.repartitionParcours.find(r => r.parcours === 'B')?.count ?? 0
  const maxViolence = Math.max(...stats.repartitionViolences.map(r => r.count), 1)

  // Avocats sans créneau = alerte
  const avocatsSansCreneaux = stats.avocats.filter(a => a.actif && a.creneauxLibres === 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm font-medium text-gray-900">Tableau de bord</span>
        </div>
        <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
          Administrateur · Barreau de Saint-Nazaire
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={exporter}
            className="flex items-center gap-1.5 text-xs border border-gray-200 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter CSV
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Alerte avocats sans créneaux */}
        {avocatsSansCreneaux.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm text-amber-800 font-medium">
                {avocatsSansCreneaux.length} avocat{avocatsSansCreneaux.length > 1 ? 's' : ''} sans créneau disponible cette semaine
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {avocatsSansCreneaux.map(a => a.nom).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Métriques principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            {
              val: stats.rdvCeMois, label: 'RDV ce mois',
              delta: stats.evolutionRdv !== 0 ? `${stats.evolutionRdv > 0 ? '+' : ''}${stats.evolutionRdv}% vs mois préc.` : null,
              up: stats.evolutionRdv >= 0,
            },
            { val: `${stats.delaiMoyen} j`, label: 'Délai moyen', delta: null, up: true },
            {
              val: `${stats.avocatsActifs}/${stats.avocatsTotal}`,
              label: 'Avocats actifs', delta: `${stats.creneauxLibres} créneaux libres`, up: true,
            },
            {
              val: `${stats.tauxAnnulation}%`, label: 'Taux annulation',
              delta: null, up: stats.tauxAnnulation < 10,
            },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-2xl font-medium text-gray-900 mb-0.5">{s.val}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
              {s.delta && (
                <div className={`text-xs mt-1.5 ${s.up ? 'text-teal-600' : 'text-red-500'}`}>
                  {s.delta}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Onglets */}
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
          {([['apercu', 'Aperçu'], ['avocats', 'Avocats']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setOnglet(k)}
              className={`text-xs px-4 py-1.5 rounded-md transition-all ${
                onglet === k ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >{l}</button>
          ))}
        </div>

        {/* Onglet Aperçu */}
        {onglet === 'apercu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Répartition par type de violence */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Répartition par type de violence</h3>
              <div className="space-y-3">
                {stats.repartitionViolences
                  .sort((a, b) => b.count - a.count)
                  .map(r => (
                    <div key={r.type} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-36 flex-shrink-0">{TYPE_LABELS[r.type] ?? r.type}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((r.count / maxViolence) * 100)}%`,
                            background: TYPE_COLORS[r.type] ?? '#888',
                          }} />
                      </div>
                      <span className="text-xs text-gray-500 w-5 text-right">{r.count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Répartition parcours A / B */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Parcours choisi</h3>
              {totalParcoursRdv === 0 ? (
                <p className="text-sm text-gray-400">Aucune donnée ce mois</p>
              ) : (
                <>
                  <div className="flex gap-6 mb-4">
                    {[
                      { label: 'Parcours A', sublabel: 'Choix de l\'avocat', count: rdvA, color: '#1D9E75' },
                      { label: 'Parcours B', sublabel: 'Premier créneau dispo', count: rdvB, color: '#7F77DD' },
                    ].map(p => (
                      <div key={p.label} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                          style={{ background: p.color }}>
                          {totalParcoursRdv > 0 ? Math.round((p.count / totalParcoursRdv) * 100) : 0}%
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{p.label}</div>
                          <div className="text-xs text-gray-400">{p.sublabel}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{p.count} RDV</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Barre de proportion */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-teal-500 transition-all"
                      style={{ width: `${totalParcoursRdv > 0 ? Math.round((rdvA / totalParcoursRdv) * 100) : 50}%` }} />
                    <div className="h-full bg-purple-400 transition-all flex-1" />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>A — Délai moy. 2,4 j</span>
                    <span>B — Délai moy. 0,9 j</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Onglet Avocats */}
        {onglet === 'avocats' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 w-48">Avocat</th>
                  <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 w-28">RDV ce mois</th>
                  <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 w-28">Créneaux libres</th>
                  <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 w-24">Statut</th>
                  <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.avocats.map((a, i) => (
                  <tr key={a.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 text-xs flex items-center justify-center font-medium flex-shrink-0">
                          {a.nom.split(' ').slice(-1)[0][0]}
                        </div>
                        <span className="text-sm text-gray-900 truncate">{a.nom}</span>
                      </div>
                    </td>
                    <td className="text-center text-sm text-gray-900 px-4 py-3">{a.rdvCeMois}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`text-sm font-medium ${a.creneauxLibres === 0 && a.actif ? 'text-amber-600' : 'text-gray-900'}`}>
                        {a.creneauxLibres}
                        {a.creneauxLibres === 0 && a.actif && (
                          <span className="ml-1 text-xs">⚠</span>
                        )}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        a.actif ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${a.actif ? 'bg-teal-500' : 'bg-gray-400'}`} />
                        {a.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <button
                        onClick={() => toggleAvocat(a.id, a.actif)}
                        className="text-xs border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                      >
                        {a.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
