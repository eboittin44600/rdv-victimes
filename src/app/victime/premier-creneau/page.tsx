'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Option = {
  creneauId: string; avocatId: string; debut: string; fin: string; modes: string[]
  avocat: {
    id: string; prenom: string; nom: string; visioOk: boolean
    numeroRue?: string; nomRue?: string; codePostal?: string; commune?: string
    anneeSerment?: number; certificatSpecialisation?: string
    description?: string; photoUrl?: string; siteInternet?: string
  }
}
type Groupe = { debut: string; options: Option[] }

const MODES_LABELS: Record<string, string> = {
  PRESENTIEL: 'Présentiel', VISIO: 'Visioconférence', TELEPHONE: 'Téléphone',
}

export default function PremierCreneau() {
  const router = useRouter()
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [loading, setLoading] = useState(true)
  const [choix, setChoix] = useState<{ creneauId: string; avocatId: string; modeChoisi: string } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const formData = typeof window !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('rdv_form') || '{}')
    : {}

  useEffect(() => {
    const params = new URLSearchParams()
    if (formData.mode) params.set('mode', formData.mode)
    fetch(`/api/slots/rapid?${params}`)
      .then(r => r.json())
      .then(d => { setGroupes(d.creneaux || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function confirmer() {
    if (!choix) return
    if (!choix.modeChoisi) { setErreur('Veuillez choisir un mode.'); return }
    setEnvoi(true); setErreur('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcours: 'B',
          creneauId: choix.creneauId,
          avocatId: choix.avocatId,
          victimePrenom: formData.prenom,
          victimeNom: formData.nom,
          victimeTelephone: formData.telephone?.replace(/\s/g, ''),
          victimeEmail: choix.modeChoisi === 'VISIO' ? formData.email : undefined,
          mode: choix.modeChoisi,
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
            <h1 className="text-xl font-medium text-gray-900">Premiers créneaux disponibles</h1>
            <p className="text-sm text-gray-500">Créneaux disponibles dans les 72 heures · Consultation gratuite</p>
          </div>
        </div>

        {/* Chargement */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-48 mb-3" />
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-gray-100 rounded w-40 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-56" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aucun résultat */}
        {!loading && groupes.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-600 font-medium mb-2">Aucun créneau disponible dans les 72 heures</p>
            <p className="text-sm text-gray-400 mb-4">Essayez de choisir votre avocat pour voir plus de créneaux.</p>
            <button onClick={() => router.back()}
              className="text-teal-600 text-sm font-medium">
              ← Retour
            </button>
          </div>
        )}

        {/* Liste des créneaux */}
        {!loading && groupes.map((groupe, gi) => (
          <div key={groupe.debut} className="mb-4">
            {/* Bandeau horaire */}
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-xl">
                {format(new Date(groupe.debut), 'EEEE d MMMM · HH:mm', { locale: fr })}
              </div>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Avocats disponibles à cet horaire */}
            {groupe.options.map((option, oi) => {
              const isChoisi = choix?.creneauId === option.creneauId
              const modesDispos = option.modes?.length > 0 ? option.modes : ['PRESENTIEL']

              return (
                <div key={`${option.creneauId}-${oi}`}
                  className={`bg-white border rounded-xl p-4 mb-2 transition-all ${
                    isChoisi ? 'border-teal-400 ring-1 ring-teal-400' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="flex gap-3">
                    {/* Photo ou initiales */}
                    <div className="flex-shrink-0">
                      {option.avocat.photoUrl ? (
                        <img src={option.avocat.photoUrl} alt=""
                          className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-base font-medium border-2 border-gray-100">
                          {option.avocat.prenom[0]}{option.avocat.nom[0]}
                        </div>
                      )}
                    </div>

                    {/* Infos avocat */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">
                            Me {option.avocat.prenom} {option.avocat.nom}
                          </h3>
                          {(option.avocat.numeroRue || option.avocat.commune) && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {[option.avocat.numeroRue, option.avocat.nomRue, option.avocat.codePostal, option.avocat.commune].filter(Boolean).join(' ')}
                            </p>
                          )}
                          {option.avocat.siteInternet && (
                            <a href={option.avocat.siteInternet} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-teal-600 hover:underline mt-0.5 block">
                              {option.avocat.siteInternet.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                          {option.avocat.anneeSerment && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Serment {option.avocat.anneeSerment}
                            </p>
                          )}
                        </div>
                        {/* Badge spécialiste */}
                        {option.avocat.certificatSpecialisation && (
                          <div className="flex-shrink-0 flex flex-col items-center text-center max-w-[80px]">
                            <img src="/specialiste.png" alt="Spécialiste"
                              className="w-8 h-8 object-contain"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            <span className="text-[9px] text-gray-500 mt-0.5 leading-tight">
                              {option.avocat.certificatSpecialisation}
                            </span>
                          </div>
                        )}
                      </div>

                      {option.avocat.description && (
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
                          {option.avocat.description}
                        </p>
                      )}

                      {/* Modes disponibles */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {modesDispos.map(m => (
                          <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {MODES_LABELS[m]}
                          </span>
                        ))}
                      </div>

                      {/* Bouton choisir */}
                      <button
                        onClick={() => {
                          if (isChoisi) {
                            setChoix(null)
                          } else {
                            const modePrefere = modesDispos.includes(formData.mode) ? formData.mode : modesDispos[0]
                            setChoix({ creneauId: option.creneauId, avocatId: option.avocatId, modeChoisi: modePrefere })
                          }
                        }}
                        className={`mt-2 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          isChoisi
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700'
                        }`}>
                        {isChoisi ? '✓ Sélectionné' : 'Choisir ce créneau'}
                      </button>
                    </div>
                  </div>

                  {/* Sélection du mode si plusieurs + confirmation */}
                  {isChoisi && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {modesDispos.length > 1 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2">Mode de consultation :</p>
                          <div className="flex gap-2">
                            {modesDispos.map(m => (
                              <button key={m}
                                onClick={() => setChoix(c => c ? { ...c, modeChoisi: m } : c)}
                                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                                  choix?.modeChoisi === m
                                    ? 'bg-teal-50 border-teal-400 text-teal-800 font-medium'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}>
                                {MODES_LABELS[m]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {erreur && <p className="text-xs text-red-500 mb-2">{erreur}</p>}
                      <button onClick={confirmer} disabled={envoi}
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                        {envoi
                          ? 'Confirmation en cours...'
                          : `Confirmer — ${format(new Date(groupe.debut), 'EEEE d MMMM à HH:mm', { locale: fr })} · ${MODES_LABELS[choix?.modeChoisi || '']}`
                        }
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

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
