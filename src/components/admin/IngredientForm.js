import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CATEGORIAS_INGREDIENTES, TIPO_MASCOTA } from '../../utils/constants';

// Tope de sanidad: nadie va a tener más de 1 tonelada de un mismo
// ingrediente. Evita que un error de tipeo (ceros de más) rompa la UI del
// dashboard y las vistas de stock.
const MAX_STOCK_GRAMOS = 1000000; // 1000 kg

const IngredientForm = ({ ingrediente, onClose, onSave }) => {
  const isEditing = !!ingrediente; // Detectar si es editar o crear
  
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    tipoMascota: '',
    precioGramo: '',
    stockGramos: '',
    stockMinimo: '',
    activo: true
  });
  
  const [ajusteStock, setAjusteStock] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (ingrediente) {
      setFormData(ingrediente);
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
      if (!formData.stockGramos || parseInt(formData.stockGramos) < 0) {
        newErrors.stockGramos = 'Stock inicial no puede ser negativo';
      } else if (parseInt(formData.stockGramos) > MAX_STOCK_GRAMOS) {
        newErrors.stockGramos = `Stock inicial no puede superar ${MAX_STOCK_GRAMOS.toLocaleString()}g (revisá que no haya ceros de más)`;
      }
    } else {
      // EDITAR: validar ajuste si hay valor
      if (ajusteStock !== '' && isNaN(parseInt(ajusteStock))) {
        newErrors.ajusteStock = 'El ajuste debe ser un número';
      }
    }
    
    if (!formData.stockMinimo || parseInt(formData.stockMinimo) < 0) {
      newErrors.stockMinimo = 'Stock mínimo no puede ser negativo';
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
          stockMinimo: parseInt(formData.stockMinimo),
          activo: formData.activo,
          updatedAt: new Date()
        };

        // Si hay ajuste de stock, calcular nuevo stock
        if (ajusteStock !== '') {
          const ajuste = parseInt(ajusteStock);
          const nuevoStock = parseInt(formData.stockGramos) + ajuste;
          
          if (nuevoStock < 0) {
            setErrors({ ajusteStock: 'El ajuste resultaría en stock negativo' });
            setLoading(false);
            return;
          }

          if (nuevoStock > MAX_STOCK_GRAMOS) {
            setErrors({
              ajusteStock: `El ajuste resultaría en ${nuevoStock.toLocaleString()}g, más del tope de ${MAX_STOCK_GRAMOS.toLocaleString()}g (revisá que no haya ceros de más)`,
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
          stockGramos: parseInt(formData.stockGramos),
          stockMinimo: parseInt(formData.stockMinimo),
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

          {/* STOCK - Diferente según crear/editar */}
          {isEditing ? (
            <>
              {/* Mostrar stock actual (solo lectura) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary mb-2">
                  Stock actual
                </label>
                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                  {Number(formData.stockGramos).toLocaleString("es-AR")}g
                </div>
              </div>

              {/* Campo para ajustar stock */}
              <Input
                label="Ajustar stock (gramos)"
                type="number"
                value={ajusteStock}
                onChange={(e) => setAjusteStock(e.target.value)}
                error={errors.ajusteStock}
                placeholder="Ej: +500 o -200"
              />
              <p className="text-xs text-gray-500 mb-4 -mt-2">
                Usa números positivos para agregar stock o negativos para reducir. 
                {ajusteStock && !isNaN(parseInt(ajusteStock)) && (
                  <span className="font-bold text-primary ml-1">
                    Nuevo stock: {parseInt(formData.stockGramos) + parseInt(ajusteStock)}g
                  </span>
                )}
              </p>
            </>
          ) : (
            /* Campo de stock inicial solo al crear */
            <Input
              label="Stock inicial (gramos)"
              type="number"
              min="0"
              value={formData.stockGramos}
              onChange={(e) => setFormData({...formData, stockGramos: e.target.value})}
              error={errors.stockGramos}
            />
          )}

          <Input
            label="Stock mínimo (gramos)"
            type="number"
            min="0"
            value={formData.stockMinimo}
            onChange={(e) => setFormData({...formData, stockMinimo: e.target.value})}
            error={errors.stockMinimo}
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