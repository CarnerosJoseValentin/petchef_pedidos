// Google Places API usando el SDK de JavaScript
const GOOGLE_API_KEY = 'AIzaSyBl8oRZzgeOCGGivJncD0UkGczFfk0CqiM';

// Cargar el script de Google Maps si no está cargado
let googleMapsLoaded = false;
let loadingPromise = null;

const loadGoogleMapsScript = () => {
  if (googleMapsLoaded) {
    return Promise.resolve();
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }

    if (window.google && window.google.maps) {
      googleMapsLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&language=es`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    
    script.onerror = (error) => {
      reject(error);
    };

    document.head.appendChild(script);
  });

  return loadingPromise;
};

// Inicializar autocomplete en un input
export const initializeAutocomplete = async (inputElement, onPlaceSelected) => {
  try {
    await loadGoogleMapsScript();

    const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
      componentRestrictions: { country: 'AR' },
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['address']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.geometry || !place.geometry.location) {
        console.error('No se pudo obtener la ubicación');
        return;
      }

      const result = {
        direccion: place.formatted_address,
        coordenadas: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
      };

      onPlaceSelected(result);
    });

    return autocomplete;
  } catch (error) {
    console.error('Error inicializando Google Places:', error);
    return null;
  }
};

// Calcular distancia entre dos puntos (fórmula Haversine)
export const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en km
};

// Calcular zona según distancia
export const calcularZona = (distanciaKm, radioCircunvalacion = 6) => {
  if (distanciaKm <= radioCircunvalacion) {
    return {
      zona: 1,
      nombre: "Zona 1 - Dentro de circunvalación",
      distanciaKm: distanciaKm,
    };
  } else if (distanciaKm <= radioCircunvalacion + 3) {
    return {
      zona: 2,
      nombre: "Zona 2 - Fuera hasta 3 km",
      distanciaKm: distanciaKm,
    };
  } else {
    return {
      zona: 3,
      nombre: "Zona 3 - Más de 3 km fuera",
      distanciaKm: distanciaKm,
      kmAdicionales: distanciaKm - (radioCircunvalacion + 3),
    };
  }
};

// Calcular costo de envío según zona
export const calcularCostoEnvio = (zonaInfo, configuracion) => {
  if (!configuracion?.envios) return 0;

  const { zona, kmAdicionales } = zonaInfo;

  switch (zona) {
    case 1:
      return configuracion.envios.precioZona1 || 4800;
    case 2:
      return configuracion.envios.precioZona2 || 7500;
    case 3:
      const base = configuracion.envios.precioZona3Base || 7500;
      const porKm = configuracion.envios.precioZona3PorKm || 700;
      return base + Math.ceil(kmAdicionales) * porKm;
    default:
      return 0;
  }
};