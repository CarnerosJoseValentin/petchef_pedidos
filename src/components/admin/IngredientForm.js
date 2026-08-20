import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CATEGORIAS_INGREDIENTES, TIPO_MASCOTA } from '../../utils/constants';
import { gramosAKgTexto, gramosAKgInput, kgInputAGramos } from '../../utils/stock';

// Tope de sanidad: nadie va a tener más de 1 tonelada de un mismo
// ingrediente. Evita que un error de tipeo (ceros de más) rompa la UI del
// dashboard y las vistas de stock.
const MAX_STOCK_KG = 1000;
const MAX_STOCK_GRAMOS = MAX_STOCK_KG * 1000;

// El stock se guarda y se calcula en gramos en toda la app (Cloud Functions,
// validación de pedidos, etc. dependen de esa unidad). Este formulario
// muestra y recibe los valores en kilogramos solo para que sea más fácil de
// leer/tipear, y convierte a gramos recién al guardar.

const IngredientForm = ({ ingrediente, onClose, onSave }) => {
  const isEditing = !!ingrediente; // Detectar si es editar o crear

  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    tipoMascota: '',
    precioGramo: '',
    stockGramos: '', // se mantiene en gramos internamente (viene de Firestore)
    activo: true
  });

  const [stockInicialKg, setStockInicialKg] = useState(''); // solo al crear
  const [stockMinimoKg, setStockMinimoKg] = useState('');
  const [ajusteStockKg, setAjusteStockKg] = useState(''); // solo al editar
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (ingrediente) {
      setFormData(ingrediente);
      setStockMinimoKg(gramosAKgInput(ingrediente.stockMinimo));
    }
  }, [ingrediente]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre requerido';
    if (!formData.categoria) newErrors.categoria = 'Categoría requerida';
    if (!formData.tipoMascota) newErrors.tipoMascota = 'Tipo de mascota requerido';
    if (!formData.precioGramo || parseFloat(formData.precioGramo) <= 0) {
      newErrors.precioGramo = 'Precio debe ser mayor a 0';
    }

    // Validación diferente según crear/editar
    if (!isEditing) {
      // CREAR: validar stock inicial
      const stockInicialGramos = kgInputAGramos(stockInicialKg);
      if (!stockInicialKg || stockInicialGramos < 0) {
        newErrors.stockInicialKg = 'Stock inicial no puede ser negativo';
      } else if (stockInicialGramos > MAX_STOCK_GRAMOS) {
        newErrors.stockInicialKg = `Stock inicial no puede superar ${MAX_STOCK_KG.toLocaleString()}kg (revisá que no haya ceros de más)`;
      }
    } else {
      // EDITAR: validar ajuste si hay valor
      if (ajusteStockKg !== '' && isNaN(parseFloat(ajusteStockKg.replace(',', '.')))) {
        newErrors.ajusteStockKg = 'El ajuste debe ser un número';
      }
    }

    const stockMinimoGramos = kgInputAGramos(stockMinimoKg);
    if (!stockMinimoKg || stockMinimoGramos < 0) {
      newErrors.stockMinimoKg = 'Stock mínimo no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isEditing) {
        // MODO EDICIÓN
        const dataToUpdate = {
          nombre: formData.nombre,
          categoria: formData.categoria,
          tipoMascota: formData.tipoMascota,
          precioGramo: parseFloat(formData.precioGramo),
          stockMinimo: kgInputAGramos(stockMinimoKg),
          activo: formData.activo,
          updatedAt: new Date()
        };

        // Si hay ajuste de stock, calcular nuevo stock
        if (ajusteStockKg !== '') {
          const ajusteGramos = kgInputAGramos(ajusteStockKg);
          const nuevoStock = parseInt(formData.stockGramos) + ajusteGramos;

          if (nuevoStock < 0) {
            setErrors({ ajusteStockKg: 'El ajuste resultaría en stock negativo' });
            setLoading(false);
            return;
          }

          if (nuevoStock > MAX_STOCK_GRAMOS) {
            setErrors({
              ajusteStockKg: `El ajuste resultaría en ${gramosAKgTexto(nuevoStock)}kg, más del tope de ${MAX_STOCK_KG.toLocaleString()}kg (revisá que no haya ceros de más)`,
            });
            setLoading(false);
            return;
          }

          dataToUpdate.stockGramos = nuevoStock;
        }

        await updateDoc(doc(db, 'ingredientes', ingrediente.id), dataToUpdate);
      } else {
        // MODO CREAR
        const dataToCreate = {
          nombre: formData.nombre,
          categoria: formData.categoria,
          tipoMascota: formData.tipoMascota,
          precioGramo: parseFloat(formData.precioGramo),
          stockGramos: kgInputAGramos(stockInicialKg),
          stockMinimo: kgInputAGramos(stockMinimoKg),
          activo: formData.activo,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await addDoc(collection(db, 'ingredientes'), dataToCreate);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error al guardar ingrediente:', error);
      alert('Error al guardar el ingrediente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-primary mb-6">
          {isEditing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
        </h3>

        <form onSubmit={handleSubmit}>
          <Input
            label="Nombre del ingrediente"
            value={formData.nombre}
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            error={errors.nombre}
            placeholder="Ej: Vísceras de pollo"
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-primary mb-2">
              Categoría
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
            >
              <option value="">Seleccionar categoría</option>
              {CATEGORIAS_INGREDIENTES.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
            {errors.categoria && (
              <p className="mt-1 text-sm text-red-600">{errors.categoria}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-primary mb-2">
              Tipo de mascota
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              value={formData.tipoMascota}
              onChange={(e) => setFormData({...formData, tipoMascota: e.target.value})}
            >
              <option value="">Seleccionar tipo</option>
              <option value={TIPO_MASCOTA.PERRO}>Perro</option>
              <option value={TIPO_MASCOTA.GATO}>Gato</option>
              <option value={TIPO_MASCOTA.AMBOS}>Ambos</option>
            </select>
            {errors.tipoMascota && (
              <p className="mt-1 text-sm text-red-600">{errors.tipoMascota}</p>
            )}
          </div>

          <Input
            label="Precio por gramo ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.precioGramo}
            onChange={(e) => setFormData({...formData, precioGramo: e.target.value})}
            error={errors.precioGramo}
          />

          {/* STOCK - Diferente según crear/editar. El peso por vianda (arriba,
              precio por GRAMO) sigue en gramos; el STOCK de inventario se
              muestra en kilogramos para que sea más fácil de leer. */}
          {isEditing ? (
            <>
              {/* Mostrar stock actual (solo lectura) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary mb-2">
                  Stock actual
                </label>
                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                  {gramosAKgTexto(formData.stockGramos)}kg
                </div>
              </div>

              {/* Campo para ajustar stock */}
              <Input
                label="Ajustar stock (kg)"
                type="number"
                step="0.01"
                value={ajusteStockKg}
                onChange={(e) => setAjusteStockKg(e.target.value)}
                error={errors.ajusteStockKg}
                placeholder="Ej: +5 o -2.5"
              />
              <p className="text-xs text-gray-500 mb-4 -mt-2">
                Usa números positivos para agregar stock o negativos para reducir.
                {ajusteStockKg && !isNaN(parseFloat(ajusteStockKg.replace(',', '.'))) && (
                  <span className="font-bold text-primary ml-1">
                    Nuevo stock: {gramosAKgTexto(parseInt(formData.stockGramos) + kgInputAGramos(ajusteStockKg))}kg
                  </span>
                )}
              </p>
            </>
          ) : (
            /* Campo de stock inicial solo al crear */
            <Input
              label="Stock inicial (kg)"
              type="number"
              step="0.01"
              min="0"
              value={stockInicialKg}
              onChange={(e) => setStockInicialKg(e.target.value)}
              error={errors.stockInicialKg}
            />
          )}

          <Input
            label="Stock mínimo (kg)"
            type="number"
            step="0.01"
            min="0"
            value={stockMinimoKg}
            onChange={(e) => setStockMinimoKg(e.target.value)}
            error={errors.stockMinimoKg}
          />

          <div className="flex gap-4 mt-6">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IngredientForm;
