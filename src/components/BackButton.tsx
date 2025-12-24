import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Ne pas afficher le bouton retour sur la page d'accueil
  const isHomePage = location.pathname === "/";

  if (isHomePage) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate(-1)}
      aria-label="Retour à la page précédente"
      className="h-9 w-9"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
