import { useState, useEffect, useRef } from 'react';
import { initializeAutocomplete } from '../../utils/googlePlaces';

const AddressAutocomplete = ({ value, onChange, error, required = false }) => {
  const [direccionMostrada, setDireccionMostrada] = useState(value || '');
  const inputRef = useRef(null);

  // Inicializar Google Places Autocomplete
  useEffect(() => {
    if (!inputRef.current) return;

    const setupAutocomplete = async () => {
      await initializeAutocomplete(
        inputRef.current,
        (result) => {
          setDireccionMostrada(result.direccion);
          onChange(result.direccion);
        }
      );
    };

    setupAutocomplete();
  }, []);

  // Sincronizar con valor externo
  useEffect(() => {
    if (value) {
      setDireccionMostrada(value);
    }
  }, [value]);

  return (
    <div className="mb-4 relative">
      <label className="block text-sm font-medium text-primary mb-2">
        Dirección de envío {required && <span className="text-red-600">*</span>}
      </label>
      
      <input
        ref={inputRef}
        type="text"
        value={direccionMostrada}
        onChange={(e) => setDireccionMostrada(e.target.value)}
        placeholder="Buscar dirección..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
        required={required}
      />

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      <p className="mt-1 text-xs text-gray-500">
        Escribe y selecciona una dirección de las sugerencias
      </p>
    </div>
  );
};

export default AddressAutocomplete;