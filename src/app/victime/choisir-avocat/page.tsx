'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Creneau = { id: string; debut: string; fin: string; mode: string }
type Avocat = {
  id: string; prenom: string; nom: string
  visioOk: boolean; specialites: string[]
  commune?: string; anneeSerment?: number
  certificatSpecialisation?: string; description?: string; photoUrl?: string
  creneaux: Creneau[]
}

const MODES_LABELS: Record<string, string> = {
  PRESENTIEL: 'Présentiel', VISIO: 'Visioconférence', TELEPHONE: 'Téléphone',
}

export default function ChoisirAvocat() {
  const router = useRouter()
  const [avocats, setAvocats] = useState<Avocat[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreMode, setFiltreMode] = useState('')
  const [slotChoisi, setSlotChoisi] = useState<{ creneauId: string; avocatId: string } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const formData = typeof window !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('rdv_form') || '{}')
    : {}

  useEffect(() => {
    const params = new URLSearchParams()
    if (filtreMode) params.set('mode', filtreMode)
    else if (formData.mode) params.set('mode', formData.mode)

    setLoading(true)
    fetch(`/api/slots?${params}`)
      .then(r => r.json())
      .then(d => { setAvocats(d.avocats || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filtreMode])

  async function confirmer() {
    if (!slotChoisi) return
    setEnvoi(true); setErreur('')

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
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
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

        {/* Filtres mode */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <button onClick={() => setFiltreMode('')}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${!filtreMode ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Tous modes
          </button>
          {['PRESENTIEL', 'VISIO', 'TELEPHONE'].map(m => (
            <button key={m} onClick={() => setFiltreMode(filtreMode === m ? '' : m)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filtreMode === m ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {MODES_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Chargement */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-gray-100 rounded w-40 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-56 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-32" />
                  </div>
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
            <p className="text-sm text-gray-400 mb-4">Contactez directement le Barreau :</p>
            <a href="tel:0240221340" className="text-teal-600 font-medium">02 40 22 13 40</a>
          </div>
        )}

        {/* Liste des avocats */}
        {!loading && avocats.map(avocat => {
          const isSelected = slotChoisi?.avocatId === avocat.id
          return (
            <div key={avocat.id}
              className={`bg-white border rounded-xl p-5 mb-4 transition-all ${isSelected ? 'border-teal-400 ring-1 ring-teal-400' : 'border-gray-200'}`}>

              {/* Profil */}
              <div className="flex gap-4 mb-4">
                {/* Photo ou initiales */}
                <div className="flex-shrink-0">
                  {avocat.photoUrl ? (
                    <img src={avocat.photoUrl} alt={`Me ${avocat.prenom} ${avocat.nom}`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-lg font-medium border-2 border-gray-100">
                      {avocat.prenom[0]}{avocat.nom[0]}
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-gray-900">Me {avocat.prenom} {avocat.nom}</h3>
                      {avocat.commune && (
                        <p className="text-sm text-gray-500 mt-0.5">Cabinet situé à {avocat.commune}</p>
                      )}
                      {avocat.anneeSerment && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Prestation de serment : {avocat.anneeSerment}
                        </p>
                      )}
                    </div>
                    {/* Badge spécialiste */}
                    {avocat.certificatSpecialisation && (
                      <div className="flex-shrink-0 flex flex-col items-center text-center">
                        <img
                          src="/specialiste.png"
                          alt="Spécialiste"
                          className="w-10 h-10 object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        <span className="text-[10px] text-gray-500 mt-0.5 max-w-[80px] leading-tight">
                          {avocat.certificatSpecialisation}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {avocat.description && (
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3">
                      {avocat.description}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {avocat.visioOk && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        Visio disponible
                      </span>
                    )}
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
                      <button key={c.id}
                        onClick={() => setSlotChoisi(isSlotPicked ? null : { creneauId: c.id, avocatId: avocat.id })}
                        className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                          isSlotPicked
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700'
                        }`}>
                        {dateLabel}
                        {c.mode !== formData.mode && (
                          <span className="ml-1 opacity-60">· {MODES_LABELS[c.mode]}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bouton confirmer */}
              {isSelected && slotChoisi && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {erreur && <p className="text-xs text-red-500 mb-3">{erreur}</p>}
                  <button onClick={confirmer} disabled={envoi}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                    {envoi
                      ? 'Confirmation en cours...'
                      : `Confirmer avec Me ${avocat.nom} — ${format(new Date(avocat.creneaux.find(c => c.id === slotChoisi.creneauId)!.debut), 'EEEE d MMMM à HH:mm', { locale: fr })}`
                    }
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Urgences */}
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