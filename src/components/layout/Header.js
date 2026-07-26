import { useState } from "react";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import Image from "next/image";

const Header = () => {
  const router = useRouter();
  const { userData } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const isAdmin = userData?.rol === "admin";
  const isProduccion = userData?.rol === "produccion";
  const isLogistica = userData?.rol === "logistica";

  const handleNavigation = (path) => {
    router.push(path);
    setMobileMenuOpen(false); 
  };

  return (
    <header className="bg-primary shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-24">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => {
              if (isAdmin) handleNavigation("/admin/pedidos");
              else if (isProduccion) handleNavigation("/produccion/pedidos");
              else if (isLogistica) handleNavigation("/logistica/pedidos");
              else handleNavigation("/seleccionar-animal");
            }}
          >
            <div className="h-12 w-20 lg:h-16 lg:w-24 relative flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Pet Chef"
                fill
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
            {isAdmin ? (
              <>
                <button
                  onClick={() => handleNavigation("/admin/pedidos")}
                  className={`text-white hover:text-gray-200 transition-colors text-sm xl:text-base ${
                    router.pathname === "/admin/pedidos" ? "font-bold" : ""
                  }`}
                >
                  Pedidos
                </button>
                <button
                  onClick={() => handleNavigation("/admin/ingredientes")}
                  className={`text-white hover:text-gray-200 transition-colors text-sm xl:text-base ${
                    router.pathname === "/admin/ingredientes" ? "font-bold" : ""
                  }`}
                >
                  Ingredientes
                </button>
                <button
                  onClick={() => handleNavigation("/admin")}
                  className={`text-white hover:text-gray-200 transition-colors text-sm xl:text-base ${
                    router.pathname === "/admin" ? "font-bold" : ""
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => handleNavigation("/admin/configuracion")}
                  className={`text-white hover:text-gray-200 transition-colors text-sm xl:text-base ${
                    router.pathname === "/admin/configuracion" ? "font-bold" : ""
                  }`}
                >
                  Configuración
                </button>
              </>
            ) : isProduccion ? (
              <button
                onClick={() => handleNavigation("/produccion/pedidos")}
                className={`text-white hover:text-gray-200 transition-colors ${
                  router.pathname === "/produccion/pedidos" ? "font-bold" : ""
                }`}
              >
                Pedidos
              </button>
            ) : isLogistica ? (
              <button
                onClick={() => handleNavigation("/logistica/pedidos")}
                className={`text-white hover:text-gray-200 transition-colors ${
                  router.pathname === "/logistica/pedidos" ? "font-bold" : ""
                }`}
              >
                Pedidos
              </button>
            ) : (
              <button
                onClick={() => handleNavigation("/mis-pedidos")}
                className="text-white hover:text-gray-200 transition-colors"
              >
                Mis Pedidos
              </button>
            )}

            <button
              onClick={handleLogout}
              className="bg-secondary hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm xl:text-base"
            >
              Salir
            </button>
          </nav>

          {/* Botón Hamburguesa Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-white p-2"
            aria-label="Menú"
          >
            {mobileMenuOpen ? (
              // Icono X (cerrar)
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Icono Hamburguesa
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Menú Mobile Desplegable */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 border-t border-white/20 mt-2">
            <nav className="flex flex-col gap-2 pt-4">
              {isAdmin ? (
                <>
                  <button
                    onClick={() => handleNavigation("/admin/pedidos")}
                    className={`text-left text-white hover:bg-white/10 px-4 py-3 rounded transition-colors ${
                      router.pathname === "/admin/pedidos" ? "bg-white/20 font-bold" : ""
                    }`}
                  >
                    📋 Pedidos
                  </button>
                  <button
                    onClick={() => handleNavigation("/admin/ingredientes")}
                    className={`text-left text-white hover:bg-white/10 px-4 py-3 rounded transition-colors ${
                      router.pathname === "/admin/ingredientes" ? "bg-white/20 font-bold" : ""
                    }`}
                  >
                    🥩 Ingredientes
                  </button>
                  <button
                    onClick={() => handleNavigation("/admin")}
                    className={`text-left text-white hover:bg-white/10 px-4 py-3 rounded transition-colors ${
                      router.pathname === "/admin" ? "bg-white/20 font-bold" : ""
                    }`}
                  >
                    🎟️ Cupones
                  </button>
                  <button
                    onClick={() => handleNavigation("/admin/configuracion")}
                    className={`text-left text-white hover:bg-white/10 px-4 py-3 rounded transition-colors ${
                      router.pathname === "/admin/configuracion" ? "bg-white/20 font-bold" : ""
                    }`}
                  >
                    ⚙️ Configuración
                  </button>
                </>
              ) : isProduccion ? (
                <button
                  onClick={() => handleNavigation("/produccion/pedidos")}
                  className={`text-left text-white hover:bg-white/10 px-4 py-3 rounded transition-colors ${
                    router.pathname === "/produccion/pedidos" ? "bg-white/20 font-bold" : ""
                  }`}
                >
                  📋 Pedidos
                </button>
              ) : isLogistica ? (
                <button
                  onClick={() => handleNavigation("/logistica/pedidos")}
                  className={`text-left text-white hover:bg-white/10 px-4 py-3 rounded transition-colors ${
                    router.pathname === "/logistica/pedidos" ? "bg-white/20 font-bold" : ""
                  }`}
                >
                  📋 Pedidos
                </button>
              ) : (
                <button
                  onClick={() => handleNavigation("/mis-pedidos")}
                  className="text-left text-white hover:bg-white/10 px-4 py-3 rounded transition-colors"
                >
                  📋 Mis Pedidos
                </button>
              )}

              <button
                onClick={handleLogout}
                className="bg-secondary hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors mt-2"
              >
                🚪 Salir
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;