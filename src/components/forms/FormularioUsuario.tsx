"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  esquemaUsuarioEdicion,
  esquemaUsuarioNuevo,
  type DatosUsuarioEdicion,
  type DatosUsuarioNuevo,
} from "@/lib/esquemas/usuarios";
import { actualizarUsuario, crearUsuario } from "@/lib/acciones/usuarios";
import { ETIQUETA_ROL } from "@/components/layout/navegacion";
import { PeriodoSueldo, Rol } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const ETIQUETA_PERIODO: Record<PeriodoSueldo, string> = {
  DIARIO: "Diario",
  SEMANAL: "Semanal",
  MENSUAL: "Mensual",
};

type SucursalMin = { id: string; nombre: string };

type ValoresFormulario = DatosUsuarioNuevo;

type Props = {
  sucursales: SucursalMin[];
  /** Si viene, es edición (email no editable; password/pin opcionales). */
  usuario?: DatosUsuarioEdicion & { id: string; email: string };
  onExito?: () => void;
};

export function FormularioUsuario({ sucursales, usuario, onExito }: Props) {
  const [pendiente, startTransition] = useTransition();
  const esEdicion = Boolean(usuario);

  const form = useForm<ValoresFormulario>({
    resolver: zodResolver(
      (esEdicion ? esquemaUsuarioEdicion : esquemaUsuarioNuevo) as never
    ),
    defaultValues: usuario
      ? {
          nombre: usuario.nombre,
          rol: usuario.rol,
          sueldo: usuario.sueldo,
          periodoSueldo: usuario.periodoSueldo,
          sucursalIds: usuario.sucursalIds,
          activo: usuario.activo,
          email: usuario.email,
          password: "",
          pin: "",
        }
      : {
          nombre: "",
          rol: Rol.MESERO,
          sueldo: "0",
          periodoSueldo: PeriodoSueldo.SEMANAL,
          sucursalIds: [],
          activo: true,
          email: "",
          password: "",
          pin: "",
        },
  });

  const enviar = (datos: ValoresFormulario) => {
    startTransition(async () => {
      const resultado = usuario
        ? await actualizarUsuario(usuario.id, datos)
        : await crearUsuario(datos);
      if (resultado.ok) {
        toast.success(usuario ? "Usuario actualizado." : "Usuario creado.");
        onExito?.();
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input
                    className="h-11"
                    type="email"
                    disabled={esEdicion}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {esEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}
                </FormLabel>
                <FormControl>
                  <Input className="h-11" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {esEdicion ? "Nuevo PIN (opcional)" : "PIN de seguridad"}
                </FormLabel>
                <FormControl>
                  <Input
                    className="h-11"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="4 dígitos"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(Rol).map((rol) => (
                      <SelectItem key={rol} value={rol}>
                        {ETIQUETA_ROL[rol]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="sueldo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sueldo</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 text-right tabular-nums"
                      inputMode="decimal"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="periodoSueldo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(PeriodoSueldo).map((periodo) => (
                        <SelectItem key={periodo} value={periodo}>
                          {ETIQUETA_PERIODO[periodo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <FormField
          control={form.control}
          name="sucursalIds"
          render={() => (
            <FormItem>
              <FormLabel>Sucursales asignadas</FormLabel>
              <div className="space-y-2 rounded-lg border p-3">
                {sucursales.map((sucursal) => (
                  <FormField
                    key={sucursal.id}
                    control={form.control}
                    name="sucursalIds"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(sucursal.id)}
                            onCheckedChange={(marcada) =>
                              field.onChange(
                                marcada
                                  ? [...field.value, sucursal.id]
                                  : field.value.filter((id) => id !== sucursal.id)
                              )
                            }
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {sucursal.nombre}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="activo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel>Usuario activo</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="h-11 w-full" disabled={pendiente}>
          {pendiente ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </form>
    </Form>
  );
}
