"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { esquemaProducto, type DatosProducto } from "@/lib/esquemas/productos";
import { actualizarProducto, crearProducto } from "@/lib/acciones/productos";
import { TipoArticulo, TipoProducto } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
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

type Props = {
  /** Si viene, es edición. */
  producto?: DatosProducto & { id: string };
  /** Categorías existentes para sugerir (datalist). */
  categorias: string[];
};

const BANDERAS: Array<{
  name:
    | "ventaEstablecimiento"
    | "ventaDomicilio"
    | "inventariable"
    | "esEspecialidad"
    | "permiteExtrasNotas";
  etiqueta: string;
  ayuda: string;
}> = [
  {
    name: "ventaEstablecimiento",
    etiqueta: "Venta en establecimiento",
    ayuda: "Disponible en ventas de mesa/mostrador",
  },
  {
    name: "ventaDomicilio",
    etiqueta: "Venta a domicilio",
    ayuda: "Disponible en pedidos telefónicos",
  },
  {
    name: "inventariable",
    etiqueta: "Inventariable",
    ayuda: "Descuenta existencias al vender (ej. refrescos)",
  },
  {
    name: "esEspecialidad",
    etiqueta: "Especialidad",
    ayuda: "Elegible como mitad de pizza personalizada",
  },
  {
    name: "permiteExtrasNotas",
    etiqueta: "Permite extras y notas",
    ayuda: "Se le pueden agregar extras cobrables y notas",
  },
];

export function FormularioProducto({ producto, categorias }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const esEdicion = Boolean(producto);

  const form = useForm<DatosProducto>({
    resolver: zodResolver(esquemaProducto),
    defaultValues: producto ?? {
      nombre: "",
      descripcion: "",
      tipo: TipoProducto.COMIDA,
      tipoArticulo: TipoArticulo.VENTA,
      categoria: "",
      ventaDomicilio: true,
      ventaEstablecimiento: true,
      inventariable: false,
      esEspecialidad: false,
      permiteExtrasNotas: true,
      activo: true,
      variantes: [{ tamano: "unico", precio: "", maxSabores: 1, activa: true }],
    },
  });

  const variantes = useFieldArray({ control: form.control, name: "variantes" });
  // max_sabores solo aplica a alitas (misma convención de categoría que el servidor)
  const esAlitas = form.watch("categoria").trim().toLowerCase() === "alitas";

  const enviar = (datos: DatosProducto) => {
    startTransition(async () => {
      const resultado = producto
        ? await actualizarProducto(producto.id, datos)
        : await crearProducto(datos);
      if (resultado.ok) {
        toast.success(esEdicion ? "Producto actualizado." : "Producto creado.");
        router.push("/productos");
      } else {
        toast.error(resultado.error);
      }
    });
  };

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
                  <Input className="h-11" placeholder="Pizza Hawaiana" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <Input
                    className="h-11"
                    placeholder="pizza, hamburguesa, refresco…"
                    list="categorias-existentes"
                    {...field}
                  />
                </FormControl>
                <datalist id="categorias-existentes">
                  {categorias.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={TipoProducto.COMIDA}>
                      Comida (comanda a cocina)
                    </SelectItem>
                    <SelectItem value={TipoProducto.BEBIDA}>
                      Bebida (comanda a barra)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tipoArticulo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de artículo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={TipoArticulo.VENTA}>
                      Venta (se vende solo)
                    </SelectItem>
                    <SelectItem value={TipoArticulo.EXTRA}>
                      Extra (acompaña a otro producto)
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
                <Textarea placeholder="Jamón y piña…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <FormLabel>Variantes (tamaño y precio)</FormLabel>
          {variantes.fields.map((campo, indice) => (
            <div key={campo.id} className="flex items-end gap-3">
              <FormField
                control={form.control}
                name={`variantes.${indice}.tamano`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    {indice === 0 ? (
                      <FormLabel className="text-xs text-muted-foreground">
                        Tamaño
                      </FormLabel>
                    ) : null}
                    <FormControl>
                      <Input
                        className="h-11"
                        placeholder="unico / chica / mediana / grande"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`variantes.${indice}.precio`}
                render={({ field }) => (
                  <FormItem className="w-32">
                    {indice === 0 ? (
                      <FormLabel className="text-xs text-muted-foreground">
                        Precio
                      </FormLabel>
                    ) : null}
                    <FormControl>
                      <Input
                        className="h-11 text-right tabular-nums"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {esAlitas ? (
                <FormField
                  control={form.control}
                  name={`variantes.${indice}.maxSabores`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      {indice === 0 ? (
                        <FormLabel className="text-xs text-muted-foreground">
                          Sabores máx.
                        </FormLabel>
                      ) : null}
                      <FormControl>
                        <Input
                          className="h-11 text-right tabular-nums"
                          type="number"
                          min={1}
                          max={3}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={form.control}
                name={`variantes.${indice}.activa`}
                render={({ field }) => (
                  <FormItem className="flex h-11 items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal text-muted-foreground">
                      Activa
                    </FormLabel>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11"
                aria-label="Quitar variante"
                disabled={Boolean(form.getValues(`variantes.${indice}.id`))}
                onClick={() => variantes.remove(indice)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <FormField
            control={form.control}
            name="variantes"
            render={() => <FormMessage />}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              variantes.append({
                tamano: "",
                precio: "",
                maxSabores: 1,
                activa: true,
              })
            }
          >
            <Plus className="size-4" />
            Agregar variante
          </Button>
          {esEdicion ? (
            <FormDescription>
              Las variantes existentes no se eliminan (protegen ventas pasadas);
              desactívalas con el interruptor.
            </FormDescription>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {BANDERAS.map((bandera) => (
            <FormField
              key={bandera.name}
              control={form.control}
              name={bandera.name}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>{bandera.etiqueta}</FormLabel>
                    <FormDescription className="text-xs">
                      {bandera.ayuda}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={form.control}
            name="esEspecialidad"
            render={() => <FormMessage />}
          />
        </div>

        <FormField
          control={form.control}
          name="activo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel>Producto activo</FormLabel>
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
              : "Crear producto"}
        </Button>
      </form>
    </Form>
  );
}
