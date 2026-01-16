import { redirect } from "next/navigation"

// Redirection vers /caisse avec l'onglet historique sélectionné
export default function HistoriquePage() {
  redirect("/caisse?tab=historique")
}
