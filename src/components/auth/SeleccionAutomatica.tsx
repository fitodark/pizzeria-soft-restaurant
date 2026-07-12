"use client";

import { useEffect, useRef } from "react";
import { seleccionarSucursal } from "@/lib/acciones/auth";

type Props = {
  sucursalId: string;
  nombre: string;
};

/** Única sucursal disponible: se selecciona sola (la acción fija la cookie
 *  del turno y redirige al dashboard), sin preguntar al usuario. */
export function SeleccionAutomatica({ sucursalId, nombre }: Props) {
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formulario.current?.requestSubmit();
  }, []);

  return (
    <form ref={formulario} action={seleccionarSucursal}>
      <input type="hidden" name="sucursalId" value={sucursalId} />
      <p className="py-2 text-center text-muted-foreground">
        Entrando a {nombre}…
      </p>
    </form>
  );
}
