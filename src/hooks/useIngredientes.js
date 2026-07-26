import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useIngredientes = (tipoMascota = null, soloActivos = true) => {
  const [ingredientes, setIngredientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    
    // Si es para admin (soloActivos = false), traer TODOS sin filtros complejos
    if (!soloActivos) {
      q = collection(db, 'ingredientes');
    } 
    // Si tiene filtro de mascota (cliente)
    else if (tipoMascota) {
      q = query(
        collection(db, 'ingredientes'),
        where('activo', '==', true)
      );
    } 
    // Sin filtro de mascota pero solo activos
    else {
      q = query(
        collection(db, 'ingredientes'),
        where('activo', '==', true)
      );
    }

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        let ingredientesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filtrar por tipo de mascota en el cliente (si aplica)
        if (tipoMascota && soloActivos) {
          ingredientesData = ingredientesData.filter(
            ing => ing.tipoMascota === tipoMascota || ing.tipoMascota === 'ambos'
          );
        }

        // Ordenar por nombre en el cliente
        ingredientesData.sort((a, b) => a.nombre.localeCompare(b.nombre));

        setIngredientes(ingredientesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error cargando ingredientes:', error);
        setIngredientes([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tipoMascota, soloActivos]);

  return { ingredientes, loading };
};