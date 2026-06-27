// src/app/avocat/auth/[token]/page.tsx
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

export default async function ValiderToken({ params }: { params: { token: string } }) {
  const avocat = await prisma.avocat.findFirst({
    where: {
      authToken: params.token,
      authTokenExpiry: { gt: new Date() },
    },
  })

  if (!avocat) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">⏱</div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Lien expiré</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ce lien de connexion a expiré (valable 30 minutes).
          </p>
          <a href="/avocat/auth" className="text-teal-600 text-sm font-medium">
            Demander un nouveau lien →
          </a>
        </div>
      </div>
    )
  }

  // Invalider le token
  await prisma.avocat.update({
    where: { id: avocat.id },
    data: { authToken: null, authTokenExpiry: null },
  })

  // Rediriger vers une API route qui crée le cookie
  redirect(`/api/lawyers/auth/validate?token=${params.token}&id=${avocat.id}`)
}
