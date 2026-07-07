"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { esquemaCompra, type DatosCompra } from "@/lib/esquemas/compras";
import { registrarCompraProveedor } from "@/lib/acciones/compras";
import { formatoMoneda } from "@/lib/utils";
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

const LIBRE = "__libre__";

export type ProductoParaCompra = { id: string; nombre: string };

type Props = {
  /** Productos inventariables (los únicos que pueden sumar existencias). */
  productos: ProductoParaCompra[];
};

export function FormularioCompra({ productos }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const form = useForm<DatosCompra>({
    resolver: zodResolver(esquemaCompra),
    defaultValues: {
      proveedor: "",
      folioNota: "",
      detalles: [
        {
          productoId: null,
          descripcion: "",
          cantidad: "1",
          precioUnitario: "",
          sumaInventario: false,
        },
      ],
    },
  });

  const detalles = useFieldArray({ control: form.control, name: "detalles" });
  const valores = form.watch("detalles");
  const total = valores.reduce((suma, d) => {
    const importe = Number(d.cantidad) * Number(d.precioUnitario);
    return suma + (Number.isFinite(importe) ? importe : 0);
  }, 0);

  const enviar = (datos: DatosCompra) => {
    startTransition(async () => {
      const resultado = await registrarCompraProveedor(datos);
      if (resultado.ok) {
        toast.success("Compra registrada; salió como egreso del corte.");
        router.push("/cortes");
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
            name="proveedor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proveedor</FormLabel>
                <FormControl>
                  <Input className="h-11" placeholder="Abarrotes El Sol" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="folioNota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folio de nota (opcional)</FormLabel>
                <FormControl>
                  <Input className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormLabel>Partidas</FormLabel>
          {detalles.fields.map((campo, indice) => {
            const productoId = form.watch(`detalles.${indice}.productoId`);
            return (
              <div
                key={campo.id}
                className="space-y-3 rounded-lg border p-3 sm:flex sm:items-end sm:gap-3 sm:space-y-0"
              >
                <FormField
                  control={form.control}
                  name={`detalles.${indice}.productoId`}
                  render={({ field }) => (
                    <FormItem className="sm:w-52">
                      {indice === 0 ? (
                        <FormLabel className="text-xs text-muted-foreground">
                          Producto
                        </FormLabel>
                      ) : null}
                      <Select
                        onValueChange={(v) => {
                          const id = v === LIBRE ? null : v;
                          field.onChange(id);
                          if (id) {
                            const producto = productos.find((p) => p.id === id);
                            if (producto) {
                              form.setValue(
                                `detalles.${indice}.descripcion`,
                                producto.nombre
                              );
                            }
                          } else {
                            form.setValue(`detalles.${indice}.sumaInventario`, false);
                          }
                        }}
                        value={field.value ?? LIBRE}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={LIBRE}>Insumo libre</SelectItem>
                          {productos.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`detalles.${indice}.descripcion`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      {indice === 0 ? (
                        <FormLabel className="text-xs text-muted-foreground">
                          Descripción
                        </FormLabel>
                      ) : null}
                      <FormControl>
                        <Input className="h-11" placeholder="Jitomate, caja refresco…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`detalles.${indice}.cantidad`}
                  render={({ field }) => (
                    <FormItem className="sm:w-24">
                      {indice === 0 ? (
                        <FormLabel className="text-xs text-muted-foreground">
                          Cantidad
                        </FormLabel>
                      ) : null}
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
                  name={`detalles.${indice}.precioUnitario`}
                  render={({ field }) => (
                    <FormItem className="sm:w-28">
                      {indice === 0 ? (
                        <FormLabel className="text-xs text-muted-foreground">
                          Precio unit.
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
                <FormField
                  control={form.control}
                  name={`detalles.${indice}.sumaInventario`}
                  render={({ field }) => (
                    <FormItem className="flex h-11 items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!productoId}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal text-muted-foreground">
                        Suma inventario
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11"
                  aria-label="Quitar partida"
                  disabled={detalles.fields.length <= 1}
                  onClick={() => detalles.remove(indice)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                detalles.append({
                  productoId: null,
                  descripcion: "",
                  cantidad: "1",
                  precioUnitario: "",
                  sumaInventario: false,
                })
              }
            >
              <Plus className="size-4" />
              Agregar partida
            </Button>
            <p className="text-lg font-semibold tabular-nums">
              Total: {formatoMoneda(total)}
            </p>
          </div>
          <FormDescription>
            El total se recalcula en el servidor y sale como egreso del corte
            abierto. Las partidas marcadas suman existencias al inventario.
          </FormDescription>
        </div>

        <Button type="submit" className="h-11 w-full" disabled={pendiente}>
          {pendiente ? "Registrando…" : "Registrar compra"}
        </Button>
      </form>
    </Form>
  );
}
