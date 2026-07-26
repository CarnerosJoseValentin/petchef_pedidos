import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useConfiguracion = () => {
  const [configuracion, setConfiguracion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'configuracion', 'general'),
      (doc) => {
        if (doc.exists()) {
          setConfiguracion(doc.data());
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error cargando configuración:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { configuracion, loading };
};