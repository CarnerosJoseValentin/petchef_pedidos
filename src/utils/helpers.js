// Función para formatear precios
export const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  };
  
  // Función para formatear fechas
  export const formatDate = (date) => {
    if (!date) return '';
    
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  };
  
  // Función para formatear fecha y hora
  export const formatDateTime = (date) => {
    if (!date) return '';
    
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };
  
  // Función para capitalizar primera letra
  export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };
  
  // Función para validar email
  export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Función para validar teléfono argentino
  export const isValidPhone = (phone) => {
    const phoneRegex = /^(\+54)?[\s\-]?(\d{2,4})[\s\-]?(\d{6,8})$/;
    return phoneRegex.test(phone);
  };
  
  // Función para limpiar número de teléfono
  export const cleanPhoneNumber = (phone) => {
    return phone.replace(/[\s\-()]/g, '');
  };
  
  // Función para generar número de pedido
  export const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PED${timestamp}${random}`;
  };
  
  // Función para calcular edad
  export const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Función para convertir gramos a kilos
  export const gramsToKilos = (grams) => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)}kg`;
    }
    return `${grams}g`;
  };
  
  // Función para validar stock
  export const validateStock = (requested, available) => {
    return requested <= available;
  };
  
  // Función para generar slug
  export const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s]+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };
  
  // Función para debounce (útil para búsquedas)
  export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  // Función para copiar al portapapeles
  export const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Error al copiar:', err);
      return false;
    }
  };

  // Validar teléfono argentino (sin código país, cualquier código de área)
export const isValidArgentinePhone = (phone) => {
  // Formato: código de área (2-4 dígitos) + número (6-8 dígitos)
  // Ejemplos válidos: 351 5123456, 11 12345678, 3572 123456
  const phoneRegex = /^(\d{2,4})[\s\-]?(\d{6,8})$/;
  return phoneRegex.test(phone.trim());
};

// Limpiar y formatear teléfono
export const formatArgentinePhone = (phone) => {
  // Eliminar espacios y guiones
  const cleaned = phone.replace(/[\s\-]/g, '');
  
  // Detectar código de área
  if (cleaned.length === 10) {
    // 2 dígitos área + 8 número (ej: 11 12345678)
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  } else if (cleaned.length === 11) {
    // 3 dígitos área + 8 número (ej: 351 12345678)
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  } else if (cleaned.length === 12) {
    // 4 dígitos área + 8 número (ej: 3572 12345678)
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  
  return cleaned;
};

// Validar fecha de nacimiento de mascota
export const isValidPetBirthDate = (dateString) => {
  if (!dateString) return true; // Es opcional
  
  const birthDate = new Date(dateString);
  const today = new Date();
  const maxAge = new Date();
  maxAge.setFullYear(maxAge.getFullYear() - 30); // Máximo 30 años
  
  // No puede ser fecha futura
  if (birthDate > today) {
    return { valid: false, error: 'La fecha no puede ser futura' };
  }
  
  // No puede ser más de 30 años atrás
  if (birthDate < maxAge) {
    return { valid: false, error: 'La fecha parece incorrecta (más de 30 años)' };
  }
  
  return { valid: true };
};

// Calcular edad de la mascota en años y meses
export const getPetAge = (birthDateString) => {
  if (!birthDateString) return null;
  
  const birthDate = new Date(birthDateString);
  const today = new Date();
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return { years, months };
};