</div>

          {/* Créneaux libres */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Créneaux libres</h3>
            {!loading && creneauxLibres.length === 0 && (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl p-5 text-center text-sm text-gray-400">
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
                    {format(parseISO(c.debut), 'HH:mm')}
                    {' → '}
                    {format(parseISO(c.fin), 'HH:mm')}
                    {' · '}{MODES[c.mode]}
                  </div>
                </div>
                <button
                  onClick={() => supprimerCreneau(c.id)}
                  className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer ce créneau"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}