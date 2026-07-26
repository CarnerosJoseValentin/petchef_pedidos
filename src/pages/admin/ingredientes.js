import { useState } from "react";
import IngredientsList from "../../components/admin/IngredientsList";
import IngredientForm from "../../components/admin/IngredientForm";
import { useAuth } from "../../hooks/useAuth";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import Layout from "../../components/layout/Layout";

export default function AdminIngredientes() {
  const { userData } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);

  const handleNewIngredient = () => {
    setEditingIngredient(null);
    setShowForm(true);
  };

  const handleEditIngredient = (ingrediente) => {
    setEditingIngredient(ingrediente);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingIngredient(null);
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Layout>
        <IngredientsList
          onNewIngredient={handleNewIngredient}
          onEditIngredient={handleEditIngredient}
        />

        {showForm && (
          <IngredientForm
            ingrediente={editingIngredient}
            onClose={handleCloseForm}
            onSave={handleCloseForm}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
