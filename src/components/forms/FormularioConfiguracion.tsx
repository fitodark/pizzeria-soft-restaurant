"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  esquemaConfiguracion,
  type DatosConfiguracion,
} from "@/lib/esquemas/configuracion";
import { guardarConfiguracion } from "@/lib/acciones/configuracion";
import { CampoImpresora } from "@/components/forms/CampoImpresora";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Props = {
  valoresIniciales: DatosConfiguracion | null;
};

const VACIO: DatosConfiguracion = {
  impresoraPrincipalModo: "tcp",
  impresoraPrincipalRuta: "",
  impresoraCocinaModo: "tcp",
  impresoraCocinaRuta: "",
  impresoraBebidasModo: "tcp",
  impresoraBebidasRuta: "",
  logoUrl: "",
  leyendaPie: "",
};

export function FormularioConfiguracion({ valoresIniciales }: Props) {
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosConfiguracion>({
    resolver: zodResolver(esquemaConfiguracion),
    defaultValues: valoresIniciales ?? VACIO,
  });

  const enviar = (datos: DatosConfiguracion) => {
    startTransition(async () => {
      const resultado = await guardarConfiguracion(datos);
      if (resultado.ok) {
        toast.success("Configuración guardada.");
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
        <CampoImpresora
          prefijo="impresoraPrincipal"
          etiqueta="Impresora principal"
          descripcion="Tickets de cuenta y cobro (caja)."
        />
        <CampoImpresora
          prefijo="impresoraCocina"
          etiqueta="Impresora de cocina"
          descripcion="Comandas de comida con notas y mitades."
        />
        <CampoImpresora
          prefijo="impresoraBebidas"
          etiqueta="Impresora de barra"
          descripcion="Comandas de bebidas."
        />
        <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo del ticket (URL, opcional)</FormLabel>
                <FormControl>
                  <Input
                    className="h-11"
                    placeholder="https://…/logo.png"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="leyendaPie"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leyenda al pie del ticket</FormLabel>
                <FormControl>
                  <Input
                    className="h-11"
                    placeholder="¡Gracias por su compra!"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="h-11" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar configuración"}
        </Button>
      </form>
    </Form>
  );
}
