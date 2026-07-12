import { redirect } from "next/navigation";

/**
 * 404 (URL desconocida o notFound() de un recurso inexistente): al POS no
 * le sirve una página muerta — de vuelta al dashboard (pedido de QA).
 * Sin sesión, el proxy convierte este destino en /login.
 */
export default function NoEncontrada() {
  redirect("/");
}
