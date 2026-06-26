'use client'
// src/app/victime/choisir-avocat/page.tsx
// Parcours A — liste des avocats avec leurs créneaux disponibles

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Creneau = { id: string; debut: string; fin: string; mode: string }
type Avocat = {
  id: string; prenom: string; nom: string
  specialites: string[]; visioOk: boolean
  creneaux: Creneau[]
}

const MODES_LABELS: Record<string, string> = {
  PRESENTIEL: 'Présentiel', VISIO: 'Visioconférence', TELEPHONE: 'Téléphone',
}

const SPECIALITES = [
  'Violences conjugales', 'Violences sexuelles',
  'Violences intrafamiliales', 'Harcèlement',
]

export default function ChoisirAvocat() {
  const router = useRouter()
  const [avocats, setAvocats] = useState<Avocat[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreMode, setFiltreMode] = useState('')
  const [filtreSpecialite, setFiltreSpecialite] = useState('')
  const [slotChoisi, setSlotChoisi] = useState<{ creneauId: string; avocatId: string } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  // Récupérer les données du formulaire stockées à l'étape précédente
  const formData = typeof window !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('rdv_form') || '{}')
    : {}

  useEffect(() => {
    const params = new URLSearchParams()
    if (filtreMode) params.set('mode', filtreMode)
    if (filtreSpecialite) params.set('specialite', filtreSpecialite)
    if (formData.mode) params.set('mode', formData.mode)

    setLoading(true)
    fetch(`/api/slots?${params}`)
      .then(r => r.json())
      .then(d => { setAvocats(d.avocats || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filtreMode, filtreSpecialite])

  async function confirmer() {
    if (!slotChoisi) return
    setEnvoi(true)
    setErreur('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcours: 'A',
          creneauId: slotChoisi.creneauId,
          avocatId: slotChoisi.avocatId,
          victimePrenom: formData.prenom,
          victimeNom: formData.nom,
          victimeTelephone: formData.telephone?.replace(/\s/g, ''),
          victimeEmail: formData.mode === 'VISIO' ? formData.email : undefined,
          mode: formData.mode,
          typeViolence: formData.typeViolence || 'NON_PRECISE',
          consentementRgpd: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.error); setEnvoi(false); return }
      sessionStorage.setItem('rdv_confirmation', JSON.stringify(data))
      router.push('/victime/confirmation')
    } catch {
      setErreur('Erreur réseau. Veuillez réessayer.')
      setEnvoi(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-medium text-gray-900">Choisir un avocat</h1>
            <p className="text-sm text-gray-500">Barreau de Saint-Nazaire · Consultation gratuite</p>
          </div>
          {!loading && (
            <span className="ml-auto text-xs bg-teal-50 text-teal-800 px-3 py-1 rounded-full">
              {avocats.length} avocat{avocats.length > 1 ? 's' : ''} disponible{avocats.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => { setFiltreMode(''); setFiltreSpecialite('') }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              !filtreMode && !filtreSpecialite
                ? 'bg-teal-50 border-teal-400 text-teal-800'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Tous
          </button>
          {['PRESENTIEL', 'VISIO', 'TELEPHONE'].map(m => (
            <button
              key={m}
              onClick={() => setFiltreMode(filtreMode === m ? '' : m)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filtreMode === m
                  ? 'bg-teal-50 border-teal-400 text-teal-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {MODES_LABELS[m]}
            </button>
          ))}
          <select
            value={filtreSpecialite}
            onChange={e => setFiltreSpecialite(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            <option value="">Toutes spécialités</option>
            {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Chargement */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-gray-100 rounded w-40 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-56" />
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map(j => <div key={j} className="h-8 bg-gray-100 rounded-lg w-24" />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aucun résultat */}
        {!loading && avocats.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-600 font-medium mb-2">Aucun créneau disponible</p>
            <p className="text-sm text-gray-400 mb-4">
              Aucun avocat ne propose de créneaux libres avec ces critères.
            </p>
            <p className="text-sm text-gray-500">
              Contactez directement le Barreau :{' '}
              <a href="tel:0240221340" className="text-teal-600 font-medium">02 40 22 13 40</a>
            </p>
          </div>
        )}

        {/* Liste des avocats */}
        {!loading && avocats.map(avocat => {
          const isSelected = slotChoisi?.avocatId === avocat.id
          return (
            <div
              key={avocat.id}
              className={`bg-white border rounded-xl p-5 mb-3 transition-all ${
                isSelected ? 'border-teal-400 ring-1 ring-teal-400' : 'border-gray-200'
              }`}
            >
              {/* Profil avocat */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {avocat.prenom[0]}{avocat.nom[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">
                    Me {avocat.prenom} {avocat.nom}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Avocat au Barreau de Saint-Nazaire</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {avocat.visioOk && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        Visio disponible
                      </span>
                    )}
                    {avocat.specialites.slice(0, 3).map(s => (
                      <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Créneaux */}
              <div>
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Prochains créneaux disponibles
                </p>
                <div className="flex flex-wrap gap-2">
                  {avocat.creneaux.map(c => {
                    const isSlotPicked = slotChoisi?.creneauId === c.id
                    const dateLabel = format(new Date(c.debut), 'EEE d · HH:mm', { locale: fr })
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSlotChoisi(
                          isSlotPicked ? null : { creneauId: c.id, avocatId: avocat.id }
                        )}
                        className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                          isSlotPicked
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700'
                        }`}
                      >
                        {dateLabel}
                        {c.mode !== formData.mode && (
                          <span className="ml-1 opacity-60">· {MODES_LABELS[c.mode]}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bouton confirmer (visible si créneau sélectionné pour cet avocat) */}
              {isSelected && slotChoisi && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {erreur && (
                    <p className="text-xs text-red-500 mb-3">{erreur}</p>
                  )}
                  <button
                    onClick={confirmer}
                    disabled={envoi}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {envoi
                      ? 'Confirmation en cours…'
                      : `Confirmer avec Me ${avocat.nom} — ${format(new Date(avocat.creneaux.find(c => c.id === slotChoisi.creneauId)!.debut), 'EEEE d MMMM à HH:mm', { locale: fr })}`
                    }
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Numéros urgence */}
        <div className="mt-6 text-center text-xs text-gray-400">
          En danger immédiat ?{' '}
          <a href="tel:17" className="text-red-500 font-medium">17</a>
          {' · '}
          <a href="tel:3919" className="text-red-500 font-medium">3919</a>
        </div>
      </div>
    </div>
  )
}
