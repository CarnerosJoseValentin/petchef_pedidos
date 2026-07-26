import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider
  } from 'firebase/auth';
  import { doc, setDoc, getDoc } from 'firebase/firestore';
  import { auth, db } from './firebase';
  import { ROLES } from '../utils/constants';
  
  // Función para iniciar sesión
  export const loginUser = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: getAuthErrorMessage(error.code) };
    }
  };
  
  // Función para registrar usuario
  export const registerUser = async (userData) => {
    try {
      const { email, password, ...profileData } = userData;
      
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Crear documento de usuario en Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        ...profileData,
        rol: ROLES.CLIENTE,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: getAuthErrorMessage(error.code) };
    }
  };
  
  // Función para login con Google
  export const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Verificar si el usuario ya existe en Firestore
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        // Si es la primera vez, crear documento básico
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          nombre: result.user.displayName?.split(' ')[0] || '',
          apellido: result.user.displayName?.split(' ').slice(1).join(' ') || '',
          telefono: '',
          direccionEnvio: '',
          nombreMascota: '',
          fechaNacimiento: '',
          fechaNacimientoMascota: null,
          rol: ROLES.CLIENTE,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
  
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: getAuthErrorMessage(error.code) };
    }
  };
  
  // Función para cerrar sesión
  export const logoutUser = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al cerrar sesión' };
    }
  };
  
  // Función para obtener datos del usuario
  export const getUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      } else {
        return { success: false, error: 'Usuario no encontrado' };
      }
    } catch (error) {
      return { success: false, error: 'Error al obtener datos del usuario' };
    }
  };
  
  // Función para manejar mensajes de error de autenticación
  const getAuthErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Usuario no encontrado';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/email-already-in-use':
        return 'Este email ya está registrado';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres';
      case 'auth/invalid-email':
        return 'Email inválido';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde';
      default:
        return 'Error de autenticación';
    }
  };

  // Función para recuperar contraseña
export const resetPassword = async (email) => {
  try {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error al enviar email de recuperación:', error);
    return { 
      success: false, 
      error: error.code === 'auth/user-not-found' 
        ? 'No existe una cuenta con este email'
        : 'Error al enviar el email de recuperación'
    };
  }
};
  