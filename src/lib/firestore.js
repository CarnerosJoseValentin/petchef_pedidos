import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    writeBatch,  
    increment    
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  // ========================================
  // FUNCIONES GENÉRICAS
  // ========================================
  
  // Crear documento
  export const createDocument = async (collectionName, data) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating document:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Actualizar documento
  export const updateDocument = async (collectionName, docId, data) => {
    try {
      await updateDoc(doc(db, collectionName, docId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating document:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Eliminar documento
  export const deleteDocument = async (collectionName, docId) => {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Obtener documento por ID
  export const getDocument = async (collectionName, docId) => {
    try {
      const docSnap = await getDoc(doc(db, collectionName, docId));
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Documento no encontrado' };
      }
    } catch (error) {
      console.error('Error getting document:', error);
      return { success: false, error: error.message };
    }
  };
  
  // ========================================
  // FUNCIONES ESPECÍFICAS PARA INGREDIENTES
  // ========================================
  
  export const getIngredientes = async (tipoMascota = null) => {
    try {
      let q = collection(db, 'ingredientes');
      
      if (tipoMascota) {
        q = query(
          collection(db, 'ingredientes'),
          where('tipoMascota', 'in', [tipoMascota, 'ambos']),
          where('activo', '==', true),
          orderBy('nombre')
        );
      } else {
        q = query(
          collection(db, 'ingredientes'),
          where('activo', '==', true),
          orderBy('nombre')
        );
      }
  
      const querySnapshot = await getDocs(q);
      const ingredientes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      return { success: true, data: ingredientes };
    } catch (error) {
      console.error('Error getting ingredientes:', error);
      return { success: false, error: error.message };
    }
  };
  
  export const createIngrediente = async (ingredienteData) => {
    return await createDocument('ingredientes', ingredienteData);
  };
  
  export const updateIngrediente = async (ingredienteId, ingredienteData) => {
    return await updateDocument('ingredientes', ingredienteId, ingredienteData);
  };
  
  export const deleteIngrediente = async (ingredienteId) => {
    return await deleteDocument('ingredientes', ingredienteId);
  };
  
  // ========================================
  // FUNCIONES PARA CONFIGURACIÓN
  // ========================================
  
  export const getConfiguracion = async () => {
    return await getDocument('configuracion', 'config');
  };
  
  export const updateConfiguracion = async (configData) => {
    try {
      await updateDoc(doc(db, 'configuracion', 'general'), {
        ...configData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating configuracion:', error);
      return { success: false, error: error.message };
    }
  };
  
// ========================================
// FUNCIONES PARA CUPONES
// ========================================

export const getCupones = async (soloActivos = true) => {
  try {
    let q = collection(db, 'cupones');
    
    if (soloActivos) {
      q = query(
        collection(db, 'cupones'),
        where('activo', '==', true),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const cupones = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: cupones };
  } catch (error) {
    console.error('Error getting cupones:', error);
    return { success: false, error: error.message };
  }
};

export const getCuponPorCodigo = async (codigo) => {
  try {
    const q = query(
      collection(db, 'cupones'),
      where('codigo', '==', codigo.toUpperCase()),
      where('activo', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Cupón no encontrado o inactivo' };
    }

    const cuponDoc = querySnapshot.docs[0];
    return { 
      success: true, 
      data: { id: cuponDoc.id, ...cuponDoc.data() } 
    };
  } catch (error) {
    console.error('Error getting cupon:', error);
    return { success: false, error: error.message };
  }
};

export const createCupon = async (cuponData) => {
  return await createDocument('cupones', {
    ...cuponData,
    codigo: cuponData.codigo.toUpperCase(),
    usoActual: 0
  });
};

export const updateCupon = async (cuponId, cuponData) => {
  return await updateDocument('cupones', cuponId, cuponData);
};

export const incrementarUsoCupon = async (cuponId) => {
  try {
    const cuponDoc = await getDoc(doc(db, 'cupones', cuponId));
    if (cuponDoc.exists()) {
      const usoActual = cuponDoc.data().usoActual || 0;
      await updateDoc(doc(db, 'cupones', cuponId), {
        usoActual: usoActual + 1,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    }
    return { success: false, error: 'Cupón no encontrado' };
  } catch (error) {
    console.error('Error incrementando uso de cupón:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// FUNCIONES PARA PEDIDOS
// ========================================

/**
 * Obtener pedidos con filtros
 */
export const getPedidos = async (filtros = {}) => {
  try {
    let q = collection(db, 'pedidos');
    const constraints = [];

    // Filtro por usuario
    if (filtros.usuarioId) {
      constraints.push(where('usuarioId', '==', filtros.usuarioId));
    }

    // Filtro por estado
    if (filtros.estado) {
      constraints.push(where('estado', '==', filtros.estado));
    }

    // Ordenar por fecha de creación descendente
    constraints.push(orderBy('createdAt', 'desc'));

    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    const querySnapshot = await getDocs(q);
    const pedidos = [];

    querySnapshot.forEach((doc) => {
      pedidos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Encontrados ${pedidos.length} pedidos`);

    return {
      success: true,
      pedidos
    };
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    return {
      success: false,
      error: error.message,
      pedidos: []
    };
  }
};

export const createPedido = async (pedidoData) => {
  try {
    // Generar número de pedido único
    const timestamp = Date.now();
    const numeroPedido = `PED${timestamp.toString().slice(-8)}`;
    
    const docRef = await addDoc(collection(db, 'pedidos'), {
      ...pedidoData,
      numeroPedido,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, id: docRef.id, numeroPedido };
  } catch (error) {
    console.error('Error creating pedido:', error);
    return { success: false, error: error.message };
  }
};

export const updateEstadoPedido = async (pedidoId, nuevoEstado) => {
  return await updateDocument('pedidos', pedidoId, { estado: nuevoEstado });
};

export const getPedido = async (pedidoId) => {
  return await getDocument('pedidos', pedidoId);
};

