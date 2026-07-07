"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  esquemaPromocion,
  type DatosPromocion,
} from "@/lib/esquemas/promociones";
import {
  actualizarPromocion,
  crearPromocion,
} from "@/lib/acciones/promociones";
import { RolPromoProducto, TipoPromocion } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";

/** Sentinela para "sin selección concreta" (Radix Select no admite value=""). */
const LIBRE = "__libre__";

export type ProductoParaPromo = {
  id: string;
  nombre: string;
  esEspecialidad: boolean;
  variantes: { id: string; tamano: string }[];
};

type Props = {
  productos: ProductoParaPromo[];
  /** Si viene, es edición. */
  promocion?: DatosPromocion & { id: string };
};

const DIAS = [
  { valor: 0, etiqueta: "Dom" },
  { valor: 1, etiqueta: "Lun" },
  { valor: 2, etiqueta: "Mar" },
  { valor: 3, etiqueta: "Mié" },
  { valor: 4, etiqueta: "Jue" },
  { valor: 5, etiqueta: "Vie" },
  { valor: 6, etiqueta: "Sáb" },
];

export function FormularioPromocion({ productos, promocion }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const esEdicion = Boolean(promocion);

  const form = useForm<DatosPromocion>({
    resolver: zodResolver(esquemaPromocion),
    defaultValues: promocion ?? {
      nombre: "",
      descripcion: "",
      tipo: TipoPromocion.PROMOCION,
      precioEspecial: "",
      ventaDomicilio: false,
      ventaEstablecimiento: true,
      fechaInicio: "",
      fechaFin: "",
      diasSemana: [],
      activa: true,
      productos: [
        { rol: RolPromoProducto.REQUERIDO, productoId: null, varianteId: null, cantidad: "1" },
      ],
    },
  });

  const lineas = useFieldArray({ control: form.control, name: "productos" });
  const tipo = form.watch("tipo");
  const esDosPorUno = tipo === TipoPromocion.DOS_POR_UNO;
  const esPaquete = tipo === TipoPromocion.PAQUETE;

  const cambiarTipo = (nuevo: string) => {
    form.setValue("tipo", nuevo as TipoPromocion);
    if (nuevo === TipoPromocion.DOS_POR_UNO) {
      form.setValue("precioEspecial", "");
      form.setValue("productos", [
        { rol: RolPromoProducto.REQUERIDO, productoId: null, varianteId: null, cantidad: "1" },
        { rol: RolPromoProducto.REGALO, productoId: null, varianteId: null, cantidad: "1" },
      ]);
    } else {
      form.setValue(
        "productos",
        form
          .getValues("productos")
          .filter((p) => p.rol === RolPromoProducto.REQUERIDO)
          .map((p) => ({ ...p, productoId: p.productoId }))
      );
    }
  };

  const enviar = (datos: DatosPromocion) => {
    startTransition(async () => {
      const resultado = promocion
        ? await actualizarPromocion(promocion.id, datos)
        : await crearPromocion(datos);
      if (resultado.ok) {
        toast.success(esEdicion ? "Promoción actualizada." : "Promoción creada.");
        router.push("/promociones");
      } else {
        toast.error(resultado.error);
      }
    });
  };

  const opcionesProducto = (soloEspecialidades: boolean) =>
    (soloEspecialidades
      ? productos.filter((p) => p.esEspecialidad)
      : productos
    ).map((p) => (
      <SelectItem key={p.id} value={p.id}>
        {p.nombre}
      </SelectItem>
    ));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(enviar)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input className="h-11" placeholder="Martes de pizza" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={cambiarTipo} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={TipoPromocion.PROMOCION}>
                      Promoción (precio especial por temporada/días)
                    </SelectItem>
                    <SelectItem value={TipoPromocion.PAQUETE}>
                      Paquete (precio fijo, todos los días)
                    </SelectItem>
                    <SelectItem value={TipoPromocion.DOS_POR_UNO}>
                      2x1 (se cobra la pizza comprada)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (opcional)</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!esDosPorUno ? (
          <FormField
            control={form.control}
            name="precioEspecial"
            render={({ field }) => (
              <FormItem className="max-w-48">
                <FormLabel>Precio especial</FormLabel>
                <FormControl>
                  <Input
                    className="h-11 text-right tabular-nums"
                    inputMode="decimal"
                    placeholder="199.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        {!esPaquete ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fechaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio de temporada (opcional)</FormLabel>
                    <FormControl>
                      <Input className="h-11" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaFin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin de temporada (opcional)</FormLabel>
                    <FormControl>
                      <Input className="h-11" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="diasSemana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días de la semana (vacío = todos)</FormLabel>
                  <div className="flex flex-wrap gap-3 rounded-lg border p-3">
                    {DIAS.map((dia) => (
                      <label
                        key={dia.valor}
                        className="flex items-center gap-1.5 text-sm"
                      >
                        <Checkbox
                          checked={field.value.includes(dia.valor)}
                          onCheckedChange={(marcado) =>
                            field.onChange(
                              marcado
                                ? [...field.value, dia.valor].sort()
                                : field.value.filter((d) => d !== dia.valor)
                            )
                          }
                        />
                        {dia.etiqueta}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : null}

        <div className="space-y-3">
          <FormLabel>
            {esDosPorUno ? "Regla del 2x1" : "Productos incluidos"}
          </FormLabel>
          {lineas.fields.map((campo, indice) => {
            const productoId = form.watch(`productos.${indice}.productoId`);
            const productoElegido = productos.find((p) => p.id === productoId);
            const rol = form.getValues(`productos.${indice}.rol`);
            return (
              <div key={campo.id} className="flex flex-wrap items-end gap-3">
                {esDosPorUno ? (
                  <span className="w-28 pb-3 text-sm font-medium">
                    {rol === RolPromoProducto.REQUERIDO ? "Compra" : "Regalo"}
                  </span>
                ) : null}
                <FormField
                  control={form.control}
                  name={`productos.${indice}.productoId`}
                  render={({ field }) => (
                    <FormItem className="min-w-56 flex-1">
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v === LIBRE ? null : v);
                          form.setValue(`productos.${indice}.varianteId`, null);
                        }}
                        value={field.value ?? LIBRE}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {esDosPorUno ? (
                            <SelectItem value={LIBRE}>
                              Cualquier especialidad (se elige al vender)
                            </SelectItem>
                          ) : (
                            <SelectItem value={LIBRE}>
                              — Selecciona producto —
                            </SelectItem>
                          )}
                          {opcionesProducto(esDosPorUno)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`productos.${indice}.varianteId`}
                  render={({ field }) => (
                    <FormItem className="w-44">
                      <Select
                        onValueChange={(v) => field.onChange(v === LIBRE ? null : v)}
                        value={field.value ?? LIBRE}
                        disabled={!productoElegido}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder="Tamaño" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={LIBRE}>Cualquier tamaño</SelectItem>
                          {productoElegido?.variantes.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.tamano}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!esDosPorUno ? (
                  <>
                    <FormField
                      control={form.control}
                      name={`productos.${indice}.cantidad`}
                      render={({ field }) => (
                        <FormItem className="w-20">
                          <FormControl>
                            <Input
                              className="h-11 text-right tabular-nums"
                              inputMode="numeric"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11"
                      aria-label="Quitar producto"
                      disabled={lineas.fields.length <= 1}
                      onClick={() => lineas.remove(indice)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            );
          })}
          {!esDosPorUno ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                lineas.append({
                  rol: RolPromoProducto.REQUERIDO,
                  productoId: null,
                  varianteId: null,
                  cantidad: "1",
                })
              }
            >
              <Plus className="size-4" />
              Agregar producto
            </Button>
          ) : (
            <FormDescription>
              Se cobra la pizza comprada; el regalo entra a $0. Si el producto
              queda libre, el mesero lo elige al vender.
            </FormDescription>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="ventaEstablecimiento"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <FormLabel>Venta en establecimiento</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ventaDomicilio"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <FormLabel>Venta a domicilio</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ventaEstablecimiento"
            render={() => <FormMessage />}
          />
        </div>

        <FormField
          control={form.control}
          name="activa"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel>Promoción activa</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="h-11 w-full" disabled={pendiente}>
          {pendiente
            ? "Guardando…"
            : esEdicion
              ? "Guardar cambios"
              : "Crear promoción"}
        </Button>
      </form>
    </Form>
  );
}
