export const Input = ({ label, error, className = '', ...props }) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-primary mb-2">
            {label}
          </label>
        )}
        <input
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  };