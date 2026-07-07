"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/lib/acciones/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(
    iniciarSesion,
    null
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={accion} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              className="h-11"
              placeholder="usuario@pizzeriabarbosa.mx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11"
            />
          </div>
          {estado?.error ? (
            <p role="alert" className="text-sm text-destructive">
              {estado.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full h-11" disabled={pendiente}>
            {pendiente ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
