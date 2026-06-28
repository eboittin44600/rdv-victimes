'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Parcours = 'A' | 'B'
type Mode = 'PRESENTIEL' | 'VISIO' | 'TELEPHONE'

export default function PortailVictime() {
  const router = useRouter()
  const [parcours, setParcours] = useState<Parcours>('A')
  const [mode, setMode] = useState<Mode>('PRESENTIEL')
  const [form, setForm] = useState({
    prenom: '', nom: '', telephone: '', email: '',
    typeViolence: '', resumeSituation: '', consentement: false,
  })
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function valider() {
    const e: Record<string, string> = {}
    if (!form.prenom.trim()) e.prenom = 'Le prénom est obligatoire'
    if (!form.nom.trim()) e.nom = 'Le nom est obligatoire'
    if (!/^(\+33|0)[0-9]{9}$/.test(form.telephone.replace(/\s/g, '')))
      e.telephone = 'Numéro de téléphone invalide'
    if (mode === 'VISIO' && !form.email.includes('@'))
      e.email = 'Adresse e-mail requise pour la visioconférence'
    if (!form.consentement) e.consentement = 'Vous devez accepter les conditions'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  async function continuer() {
    if (!valider()) return
    setLoading(true)

    sessionStorage.setItem('rdv_form', JSON.stringify({ ...form, mode, parcours }))

    if (parcours === 'A') {
      router.push('/victime/choisir-avocat')
    } else {
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parcours: 'B',
            victimePrenom: form.prenom,
            victimeNom: form.nom,
            victimeTelephone: form.telephone.replace(/\s/g, ''),
            victimeEmail: mode === 'VISIO' ? form.email : undefined,
            mode,
            typeViolence: form.typeViolence || 'NON_PRECISE',
            resumeSituation: form.resumeSituation || undefined,
            consentementRgpd: true,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setErreurs({ global: data.error })
          setLoading(false)
          return
        }
        sessionStorage.setItem('rdv_confirmation', JSON.stringify(data))
        router.push('/victime/confirmation')
      } catch {
        setErreurs({ global: 'Erreur réseau. Veuillez réessayer.' })
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">

        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-800 text-sm px-3 py-1 rounded-full mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Barreau de Saint-Nazaire · Consultation gratuite
          </span>
          <h1 className="text-2xl font-medium text-gray-900 mb-2">
            Prendre un premier rendez-vous
          </h1>
          <p className="text-gray-500 text-sm">
            Consultation initiale gratuite et confidentielle pour les victimes de violences
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {([
            { id: 'A', titre: 'Je choisis mon avocat', desc: 'Consultez les créneaux et sélectionnez l\'avocat de votre choix', icon: '👤' },
            { id: 'B', titre: 'Premier créneau disponible', desc: 'Affectation automatique au premier avocat libre, sans délai', icon: '⚡' },
          ] as const).map(opt => (
            <button
              key={opt.id}
              onClick={() => setParcours(opt.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                parcours === opt.id
                  ? 'border-2 border-teal-500 bg-teal-50'
                  : 'border border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{opt.icon}</div>
              <div className="font-medium text-sm text-gray-900 mb-1">{opt.titre}</div>
              <div className="text-xs text-gray-500">{opt.desc}</div>
              {parcours === opt.id && (
                <div className="mt-2 inline-block text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                  Sélectionné
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Vos coordonnées</h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Prénom *</label>
              <input
                type="text" placeholder="Marie" value={form.prenom}
                onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.prenom ? 'border-red-300' : 'border-gray-200'}`}
              />
              {erreurs.prenom && <p className="text-xs text-red-500 mt-1">{erreurs.prenom}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nom *</label>
              <input
                type="text" placeholder="Dupont" value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.nom ? 'border-red-300' : 'border-gray-200'}`}
              />
              {erreurs.nom && <p className="text-xs text-red-500 mt-1">{erreurs.nom}</p>}
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-500 block mb-1">Téléphone *</label>
            <input
              type="tel" placeholder="06 12 34 56 78" value={form.telephone}
              onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.telephone ? 'border-red-300' : 'border-gray-200'}`}
            />
            {erreurs.telephone && <p className="text-xs text-red-500 mt-1">{erreurs.telephone}</p>}
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2">Mode de consultation</label>
            <div className="flex gap-2">
              {(['PRESENTIEL', 'VISIO', 'TELEPHONE'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                    mode === m ? 'bg-teal-50 border-teal-400 text-teal-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {m === 'PRESENTIEL' ? 'Présentiel' : m === 'VISIO' ? 'Visioconférence' : 'Téléphone'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'VISIO' && (
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">
                Adresse e-mail <span className="text-teal-600">(requis pour la visio)</span>
              </label>
              <input
                type="email" placeholder="marie.dupont@exemple.fr" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.email ? 'border-red-300' : 'border-gray-200'}`}
              />
              {erreurs.email && <p className="text-xs text-red-500 mt-1">{erreurs.email}</p>}
              <p className="text-xs text-gray-400 mt-1">Un lien de connexion vous sera envoyé par e-mail</p>
            </div>
          )}

          <div className="mb-3">
            <label className="text-xs text-gray-500 block mb-1">Objet de la consultation (facultatif)</label>
            <select
              value={form.typeViolence}
              onChange={e => setForm(f => ({ ...f, typeViolence: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- Je préfère ne pas préciser --</option>
              <option value="CONJUGALES">Violences conjugales et familiales</option>
              <option value="SEXUELLES">Violences sexuelles</option>
              <option value="HARCELEMENT">Harcèlement</option>
              <option value="AGRESSION">Agression</option>
              <option value="ESCROQUERIE">Escroquerie</option>
              <option value="VOL">Vol</option>
              <option value="DEGRADATIONS">Dégradations</option>
              <option value="ACCIDENT">Accident de la route</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>

          <div className="mb-1">
            <label className="text-xs text-gray-500 block mb-1">Décrivez brièvement votre situation (facultatif)</label>
            <textarea
              value={form.resumeSituation}
              onChange={e => setForm(f => ({ ...f, resumeSituation: e.target.value.slice(0, 500) }))}
              placeholder="En quelques mots, décrivez votre situation..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.resumeSituation.length}/500 caractères · Ces informations seront transmises à l'avocat
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" checked={form.consentement}
              onChange={e => setForm(f => ({ ...f, consentement: e.target.checked }))}
              className="mt-0.5 accent-teal-600"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              J'accepte que mes coordonnées soient transmises à l'avocat désigné dans le seul but d'organiser ce rendez-vous, conformément au RGPD.
              Ces données sont supprimées automatiquement 30 jours après le rendez-vous.{' '}
              <a href="/mentions-legales" className="text-teal-600 underline">En savoir plus</a>
            </span>
          </label>
          {erreurs.consentement && <p className="text-xs text-red-500 mt-2">{erreurs.consentement}</p>}
        </div>

        {erreurs.global && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {erreurs.global}
          </div>
        )}

        <button
          onClick={continuer}
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? 'Recherche en cours...' : parcours === 'A' ? 'Choisir mon avocat →' : 'Trouver le premier créneau →'}
        </button>

        <div className="mt-6 text-center text-xs text-gray-400">
          En danger immédiat ?{' '}
          <a href="tel:17" className="text-red-500 font-medium">17 (Police)</a>
          {' · '}
          <a href="tel:3919" className="text-red-500 font-medium">3919 (Violences femmes)</a>
        </div>
      </div>
    </div>
  )
}