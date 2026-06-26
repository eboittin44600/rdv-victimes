// src/app/page.tsx — Page d'accueil publique

import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center">
        <div className="inline-flex items-center gap-2 text-sm text-gray-500 mb-6">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          Barreau de Saint-Nazaire
        </div>
        <h1 className="text-3xl font-medium text-gray-900 mb-3">
          Premier rendez-vous gratuit
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Vous êtes victime de violences et souhaitez consulter un avocat ?<br />
          Prenez rendez-vous gratuitement avec un avocat du barreau de Saint-Nazaire.
        </p>

        <Link href="/victime"
          className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-8 py-3.5 rounded-xl text-base transition-colors mb-4">
          Prendre rendez-vous
        </Link>

        <div className="flex justify-center gap-6 text-sm text-gray-400 mt-2">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Gratuit
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confidentiel
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Sans inscription
          </span>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-xs text-gray-400 space-y-1">
          <p>En danger immédiat : <a href="tel:17" className="text-red-500 font-medium">17 (Police)</a> · <a href="tel:3919" className="text-red-500 font-medium">3919 (Violences femmes)</a></p>
          <p className="mt-4">
            <Link href="/avocat/auth" className="text-gray-400 hover:text-gray-600">Espace avocat</Link>
            {' · '}
            <Link href="/admin/auth" className="text-gray-400 hover:text-gray-600">Administration</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
