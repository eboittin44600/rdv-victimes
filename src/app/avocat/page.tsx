'use client'

import { useEffect, useState, useRef } from 'react'
import { format, startOfWeek, addDays, addWeeks, isSameDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

type Profil = {
  id: string; prenom: string; nom: string; email: string
  telephone?: string; actif: boolean; visioOk: boolean
  numeroRue?: string; nomRue?: string; codePostal?: string; commune?: string
  description?: string; photoUrl?: string; siteInternet?: string
}
type Creneau = {
  id: string; debut: string; fin: string; mode: string; statut: string
  rendezVous?: {
    id: string; victimePrenom: string; victimeNom: string
    victimeTelephone: string; victimeEmail?: string
    mode: string; lienVisio?: string; tokenAnnulation: string
  } | null
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MODES: Record<string, string> = { PRESENTIEL: 'Présentiel', VISIO: 'Visio', TELEPHONE: 'Tél.' }
const MODE_COLORS: Record<string, string> = {
  PRESENTIEL: 'bg-teal-50 text-teal-700 border-teal-200',
  VISIO: 'bg-purple-50 text-purple-700 border-purple-200',
  TELEPHONE: 'bg-amber-50 text-amber-700 border-amber-200',
}

const TRANCHES = Array.from({ length: 27 }, (_, i) => {
  const totalMin = 7 * 60 + i * 30
  const h = Math.floor(totalMin / 60).toString().padStart(2, '0')
  const m = (totalMin % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})

export default function EspaceAvocat() {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [loading, setLoading] = useState(true)
  const [semaine, setSemaine] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showAjout, setShowAjout] = useState(false)
  const [showFiche, setShowFiche] = useState(false)
  const [ficheForm, setFicheForm] = useState<any>({})
  const [ficheLoading, setFicheLoading] = useState(false)
  const [ficheConfirmation, setFicheConfirmation] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ajoutForm, setAjoutForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    heureDebut: '09:00', heureFin: '12:00',
    mode: 'PRESENTIEL', recurrent: false, fin_recurrence: '',
  })
  const [ajoutLoading, setAjoutLoading] = useState(false)
  const [ajoutErreur, setAjoutErreur] = useState('')
  const [rdvOuvert, setRdvOuvert] = useState<string | null>(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const [resProfil, resSlots] = await Promise.all([
      fetch('/api/lawyers/me'),
      fetch('/api/lawyers/slots'),
    ])
    if (resProfil.status === 401 || resSlots.status === 401) {
      window.location.href = '/avocat/auth'
      return
    }
    const dataProfil = await resProfil.json()
    const dataSlots = await resSlots.json()
    setProfil(dataProfil)
    setCreneaux(dataSlots.creneaux || [])
    setLoading(false)
  }

  function ouvrirFiche() {
    if (!profil) return
    setFicheForm({
email: profil.email || '',
      telephone: profil.telephone || '',
      siteInternet: profil.siteInternet || '',
      numeroRue: profil.numeroRue || '',
      nomRue: profil.nomRue || '',
      codePostal: profil.codePostal || '',
      commune: profil.commune || '',
      description: profil.description || '',
      photoUrl: profil.photoUrl || '',
    })
    setPhotoPreview(profil.photoUrl || null)
    setShowFiche(true)
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setPhotoPreview(result)
      setFicheForm((f: any) => ({ ...f, photoUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  async function sauvegarderFiche() {
    setFicheLoading(true)
    await fetch('/api/lawyers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ficheForm, fiche: true }),
    })
    setFicheLoading(false)
    setFicheConfirmation('Fiche mise à jour.')
    setTimeout(() => setFicheConfirmation(''), 3000)
    setShowFiche(false)
    charger()
  }

  async function togglePref(champ: 'actif' | 'visioOk') {
    if (!profil) return
    const res = await fetch('/api/lawyers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [champ]: !profil[champ] }),
    })
    const data = await res.json()
    setProfil(p => p ? { ...p, ...data } : p)
    charger()
  }

  async function supprimerCreneau(id: string) {
    if (!confirm('Supprimer ce créneau ?')) return
    await fetch(`/api/lawyers/slots?id=${id}`, { method: 'DELETE' })
    charger()
  }

  async function annulerRdv(token: string) {
    if (!confirm('Annuler ce rendez-vous ? Un SMS sera envoyé à la personne.')) return
    await fetch('/api/bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    charger()
  }

  async function ajouterCreneau() {
    setAjoutLoading(true)
    setAjoutErreur('')
    const debut = new Date(`${ajoutForm.date}T${ajoutForm.heureDebut}:00`)
    const fin = new Date(`${ajoutForm.date}T${ajoutForm.heureFin}:00`)
    if (fin <= debut) {
      setAjoutErreur("L'heure de fin doit être après l'heure de début.")
      setAjoutLoading(false)
      return
    }
    const res = await fetch('/api/lawyers/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        debut: debut.toISOString(), fin: fin.toISOString(),
        mode: ajoutForm.mode, recurrent: ajoutForm.recurrent,
        recurrentJusquAu: ajoutForm.recurrent ? ajoutForm.fin_recurrence : undefined,
      }),
    })
    const data = await res.json()
    setAjoutLoading(false)
    if (res.ok) { setShowAjout(false); charger() }
    else setAjoutErreur(data.error || 'Erreur serveur')
  }

  const jours = Array.from({ length: 6 }, (_, i) => addDays(semaine, i))
  const creneauxParJour = jours.map(j =>
    creneaux.filter(c => isSameDay(parseISO(c.debut), j))
      .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())
  )
  const rdvsAVenir = creneaux.filter(c => c.statut === 'RESERVE' && new Date(c.debut) > new Date())
  const creneauxLibres = creneaux.filter(c => c.statut === 'LIBRE' && new Date(c.debut) > new Date())
    .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          {loading || !profil
            ? <span className="text-sm text-gray-400">Chargement...</span>
            : <div className="flex items-center gap-3">
                {profil.photoUrl
                  ? <img src={profil.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                  : <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 text-xs flex items-center justify-center font-medium">
                      {profil.prenom[0]}{profil.nom[0]}
                    </div>
                }
                <span className="text-sm font-medium text-gray-900">
                  Bonjour Me {profil.prenom} {profil.nom}
                </span>
              </div>
          }
        </div>
        {profil && (
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => togglePref('actif')}
                className={`relative w-9 h-5 rounded-full transition-colors ${profil.actif ? 'bg-teal-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${profil.actif ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-gray-500">Accepter des RDV</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => togglePref('visioOk')}
                className={`relative w-9 h-5 rounded-full transition-colors ${profil.visioOk ? 'bg-purple-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${profil.visioOk ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-gray-500">Visio</span>
            </div>
            <button onClick={ouvrirFiche}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
              Ma fiche
            </button>
            <a href="/avocat/auth" className="text-xs text-gray-400 hover:text-gray-600">Déconnexion</a>
          </div>
        )}
      </div>

      {ficheConfirmation && (
        <div className="bg-teal-50 border-b border-teal-200 px-6 py-2 text-sm text-teal-800 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {ficheConfirmation}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne gauche : Agenda */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setSemaine(s => addWeeks(s, -1))}
              className="p-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-sm font-medium text-gray-900 flex-1">
              Semaine du {format(semaine, 'd MMMM', { locale: fr })}
            </h2>
            <button onClick={() => setSemaine(s => addWeeks(s, 1))}
              className="p-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => { setAjoutErreur(''); setShowAjout(true) }}
              className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-teal-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une plage
            </button>
          </div>

          <div className="flex gap-3 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded border bg-teal-100 border-teal-300" />Libre
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded border bg-blue-100 border-blue-300" />Réservé
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {jours.map((jour, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className={`text-center py-2 text-xs font-medium border-b border-gray-100 ${isSameDay(jour, new Date()) ? 'bg-teal-50 text-teal-700' : 'text-gray-500'}`}>
                  <div>{JOURS[i]}</div>
                  <div className="text-sm font-medium text-gray-900">{format(jour, 'd')}</div>
                </div>
                <div className="p-1.5 space-y-1 min-h-[100px]">
                  {creneauxParJour[i].length === 0 && (
                    <div className="text-center py-3 text-xs text-gray-300">Aucun</div>
                  )}
                  {creneauxParJour[i].map(c => (
                    <div key={c.id}
                      className={`rounded-md border px-1.5 py-1 text-xs ${c.statut === 'RESERVE' ? 'bg-blue-50 border-blue-300 text-blue-800' : MODE_COLORS[c.mode]}`}>
                      <div className="font-medium">{format(parseISO(c.debut), 'HH:mm')}</div>
                      <div className="text-[10px] opacity-75">{format(parseISO(c.fin), 'HH:mm')} · {MODES[c.mode]}</div>
                      {c.statut === 'RESERVE' && c.rendezVous ? (
                        <div className="mt-1">
                          <div className="text-[10px] font-medium truncate">{c.rendezVous.victimePrenom}</div>
                          <button onClick={() => setRdvOuvert(rdvOuvert === c.id ? null : c.id)}
                            className="text-[10px] underline opacity-60 hover:opacity-100">
                            {rdvOuvert === c.id ? 'Fermer' : 'Détails'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => supprimerCreneau(c.id)}
                          className="text-[10px] opacity-40 hover:opacity-100 mt-0.5 block">
                          x supprimer
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => { setAjoutForm(f => ({ ...f, date: format(jour, 'yyyy-MM-dd') })); setShowAjout(true) }}
                    className="w-full border border-dashed border-gray-200 rounded-md py-1 text-[10px] text-gray-300 hover:text-gray-500 hover:border-gray-300 transition-colors">
                    + plage
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showAjout && (
            <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-1">Nouvelle plage de disponibilité</h3>
              <p className="text-xs text-gray-400 mb-4">Les créneaux de 30 minutes seront créés automatiquement.</p>
              {ajoutErreur && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-3">{ajoutErreur}</div>
              )}
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-1">Date</label>
                <input type="date" value={ajoutForm.date}
                  onChange={e => setAjoutForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Heure de début</label>
                  <select value={ajoutForm.heureDebut}
                    onChange={e => setAjoutForm(f => ({ ...f, heureDebut: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {TRANCHES.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Heure de fin</label>
                  <select value={ajoutForm.heureFin}
                    onChange={e => setAjoutForm(f => ({ ...f, heureFin: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {TRANCHES.filter(h => h > ajoutForm.heureDebut).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              {ajoutForm.heureDebut && ajoutForm.heureFin && ajoutForm.heureFin > ajoutForm.heureDebut && (
                <div className="bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 mb-4">
                  <p className="text-xs text-teal-700 font-medium mb-1">Créneaux qui seront créés :</p>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const slots = []
                      const [hd, md] = ajoutForm.heureDebut.split(':').map(Number)
                      const [hf, mf] = ajoutForm.heureFin.split(':').map(Number)
                      let min = hd * 60 + md
                      const finMin = hf * 60 + mf
                      while (min + 30 <= finMin) {
                        const h = Math.floor(min / 60).toString().padStart(2, '00')
                        const m = (min % 60).toString().padStart(2, '00')
                        const h2 = Math.floor((min + 30) / 60).toString().padStart(2, '00')
                        const m2 = ((min + 30) % 60).toString().padStart(2, '00')
                        slots.push(`${h}:${m}-${h2}:${m2}`)
                        min += 30
                      }
                      return slots.map(s => (
                        <span key={s} className="text-xs bg-white border border-teal-200 text-teal-700 px-2 py-0.5 rounded-full">{s}</span>
                      ))
                    })()}
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-1">Mode</label>
                <div className="flex gap-2">
                  {Object.entries(MODES).map(([k, v]) => (
                    <button key={k} onClick={() => setAjoutForm(f => ({ ...f, mode: k }))}
                      className={`flex-1 py-2 text-xs rounded-lg border transition-all ${ajoutForm.mode === k ? 'bg-teal-50 border-teal-400 text-teal-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <input type="checkbox" id="recurrent" checked={ajoutForm.recurrent}
                  onChange={e => setAjoutForm(f => ({ ...f, recurrent: e.target.checked }))}
                  className="accent-teal-600" />
                <label htmlFor="recurrent" className="text-xs text-gray-600">Récurrent chaque semaine jusqu'au</label>
                {ajoutForm.recurrent && (
                  <input type="date" value={ajoutForm.fin_recurrence}
                    onChange={e => setAjoutForm(f => ({ ...f, fin_recurrence: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500" />
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={ajouterCreneau} disabled={ajoutLoading}
                  className="flex-1 bg-teal-600 text-white text-sm py-2.5 rounded-lg hover:bg-teal-700 disabled:bg-teal-300 transition-colors font-medium">
                  {ajoutLoading ? 'Création...' : 'Créer les créneaux'}
                </button>
                <button onClick={() => setShowAjout(false)}
                  className="px-4 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="text-2xl font-medium text-gray-900">{rdvsAVenir.length}</div>
              <div className="text-xs text-gray-400 mt-0.5">RDV à venir</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="text-2xl font-medium text-gray-900">{creneauxLibres.length}</div>
              <div className="text-xs text-gray-400 mt-0.5">Créneaux libres</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Prochains rendez-vous</h3>
            {loading && <div className="text-sm text-gray-400">Chargement...</div>}
            {!loading && rdvsAVenir.length === 0 && (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
                Aucun RDV planifié
              </div>
            )}
            {rdvsAVenir.map(c => {
              const rdv = c.rendezVous!
              const ouvert = rdvOuvert === c.id
              return (
                <div key={c.id}
                  className="bg-white border border-gray-200 rounded-xl p-3.5 mb-2 cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => setRdvOuvert(ouvert ? null : c.id)}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {rdv.victimePrenom[0]}{rdv.victimeNom[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{rdv.victimePrenom} {rdv.victimeNom}</div>
                      <div className="text-xs text-gray-400">
                        {format(parseISO(c.debut), 'EEE d MMM HH:mm', { locale: fr })} · {MODES[c.mode]}
                      </div>
                    </div>
                    <svg className={`w-4 h-4 text-gray-300 transition-transform flex-shrink-0 ${ouvert ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {ouvert && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <a href={`tel:${rdv.victimeTelephone}`} className="text-teal-600">{rdv.victimeTelephone}</a>
                      </div>
                      {rdv.victimeEmail && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {rdv.victimeEmail}
                        </div>
                      )}
                      {rdv.lienVisio && (
                        <a href={rdv.lienVisio} target="_blank"
                          className="flex items-center gap-2 text-xs text-purple-600">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Rejoindre la visioconférence
                        </a>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); annulerRdv(rdv.tokenAnnulation) }}
                        className="mt-1 text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors w-full text-center">
                        Annuler ce rendez-vous
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Créneaux libres</h3>
            {!loading && creneauxLibres.length === 0 && (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
                Aucun créneau libre
              </div>
            )}
            {creneauxLibres.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-3 mb-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {format(parseISO(c.debut), 'EEE d MMM', { locale: fr })}
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(parseISO(c.debut), 'HH:mm')} - {format(parseISO(c.fin), 'HH:mm')} · {MODES[c.mode]}
                  </div>
                </div>
                <button onClick={() => supprimerCreneau(c.id)}
                  className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Ma Fiche */}
      {showFiche && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-sm font-medium text-gray-900">Ma fiche</h2>
              <button onClick={() => setShowFiche(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">

              {/* Photo */}
              <div>
                <label className="text-xs text-gray-500 block mb-2">Photo (médaillon)</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-50">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="text-xs border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600">
                      {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                    </button>
                    {photoPreview && (
                      <button onClick={() => { setPhotoPreview(null); setFicheForm((f: any) => ({ ...f, photoUrl: '' })) }}
                        className="ml-2 text-xs text-red-500 hover:text-red-700">
                        Supprimer
                      </button>
                    )}
                    <p className="text-xs text-gray-400 mt-1">JPG ou PNG, max 2 Mo</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png"
                    onChange={handlePhoto} className="hidden" />
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Email</label>
                    <input type="email" value={ficheForm.email || ''}
                      onChange={e => setFicheForm((f: any) => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Téléphone</label>
                    <input type="tel" value={ficheForm.telephone || ''}
                      onChange={e => setFicheForm((f: any) => ({ ...f, telephone: e.target.value }))}
                      placeholder="02 40 xx xx xx"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
<div>
  <label className="text-xs text-gray-500 block mb-1">Site internet</label>
  <input type="url" value={ficheForm.siteInternet || ''}
    onChange={e => setFicheForm((f: any) => ({ ...f, siteInternet: e.target.value }))}
    placeholder="https://www.cabinet-exemple.fr"
    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
</div>
              {/* Adresse */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Adresse du cabinet</p>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">N°</label>
                    <input type="text" value={ficheForm.numeroRue || ''}
                      onChange={e => setFicheForm((f: any) => ({ ...f, numeroRue: e.target.value }))}
                      placeholder="12"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-gray-500 block mb-1">Nom de rue</label>
                    <input type="text" value={ficheForm.nomRue || ''}
                      onChange={e => setFicheForm((f: any) => ({ ...f, nomRue: e.target.value }))}
                      placeholder="rue de la Paix"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Code postal</label>
                    <input type="text" value={ficheForm.codePostal || ''}
                      onChange={e => setFicheForm((f: any) => ({ ...f, codePostal: e.target.value }))}
                      placeholder="44600"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Commune</label>
                    <input type="text" value={ficheForm.commune || ''}
                      onChange={e => setFicheForm((f: any) => ({ ...f, commune: e.target.value }))}
                      placeholder="Saint-Nazaire"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>

              {/* Présentation */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Présentation libre</label>
                <textarea value={ficheForm.description || ''}
                  onChange={e => setFicheForm((f: any) => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez votre parcours, vos domaines d'intervention, votre approche..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end sticky bottom-0 bg-white">
              <button onClick={() => setShowFiche(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={sauvegarderFiche} disabled={ficheLoading}
                className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-300 transition-colors">
                {ficheLoading ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}