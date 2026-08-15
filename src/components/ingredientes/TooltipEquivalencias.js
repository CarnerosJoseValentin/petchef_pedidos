export default function TooltipEquivalencias() {
  return (
    <div className="relative group">
      <button
        type="button"
        className="text-secondary hover:text-primary transition-colors"
        title="Ver equivalencias"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className="absolute right-0 top-8 z-10 w-64 p-3 bg-white border-2 border-secondary rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <div className="text-xs font-bold text-primary mb-2">
          📏 Equivalencias en gramos:
        </div>
        <div className="space-y-1 text-xs text-gray-700">
          <div className="flex justify-between">
            <span>🥄 1 cucharada sopera</span>
            <span className="font-bold">= 15g</span>
          </div>
          <div className="flex justify-between">
            <span>🥄 1 cucharadita</span>
            <span className="font-bold">= 5g</span>
          </div>
          <div className="flex justify-between">
            <span>🔪 Puntita de cuchillo</span>
            <span className="font-bold">= 0.3g</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 italic">
          💡 Valores aproximados
        </div>
      </div>
    </div>
  );
}
