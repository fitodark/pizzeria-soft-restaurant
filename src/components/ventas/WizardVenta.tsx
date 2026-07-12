"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { agregarLineas, crearVenta } from "@/lib/acciones/ventas";
import type { ClienteVenta } from "@/lib/acciones/clientes";
import type { LineaPrevia } from "@/components/ventas/RondasPrevias";
import { avisarFalloImpresion } from "@/components/ventas/reimpresion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PasoBebidas } from "@/components/ventas/PasoBebidas";
import { PasoCliente } from "@/components/ventas/PasoCliente";
import { PasoComida } from "@/components/ventas/PasoComida";
import { PasoResumen } from "@/components/ventas/PasoResumen";
import {
  aCents,
  aLineasEntrada,
  formatoCents,
  totalCarritoCents,
  type ExtraCarrito,
  type LineaCarrito,
} from "@/components/ventas/carrito";
import type {
  CatalogoWizard,
  ProductoWizard,
  PromoWizard,
  VarianteWizard,
} from "@/lib/consultas/ventas";
import { CanalVenta, MetodoPago } from "@/generated/prisma/enums";

const PASOS = ["Cliente", "Bebidas", "Comida", "Confirmación"];

/** Agregar productos a una venta PENDIENTE: el wizard arranca en Bebidas
 *  (la mesa/cliente ya se conocen) y confirma con agregarLineas. */
export type ModoAgregar = {
  ventaId: string;
  folio: number;
  canal: CanalVenta;
  mesa: string | null;
  cliente: string | null;
  /** Ronda que se captura (ESTABLECIMIENTO); en DOMICILIO no aplica. */
  ronda: number;
  lineasPrevias: LineaPrevia[];
  totalPrevioCents: number;
};

type Props = { catalogo: CatalogoWizard; modoAgregar?: ModoAgregar };

export function WizardVenta({ catalogo, modoAgregar }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [paso, setPaso] = useState(1);
  const [canal, setCanal] = useState<CanalVenta>(
    modoAgregar?.canal ?? CanalVenta.ESTABLECIMIENTO
  );
  const [mesa, setMesa] = useState("");
  const [cliente, setCliente] = useState<ClienteVenta | null>(null);
  const [direccionId, setDireccionId] = useState("");
  const [pagaCon, setPagaCon] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.EFECTIVO);
  const [lineas, setLineas] = useState<LineaCarrito[]>([]);

  const esDomicilio = canal === CanalVenta.DOMICILIO;

  // El catálogo y las promos dependen del canal (banderas de canal)
  const disponibles = useMemo(
    () =>
      catalogo.productos.filter((p) =>
        esDomicilio ? p.ventaDomicilio : p.ventaEstablecimiento
      ),
    [catalogo.productos, esDomicilio]
  );
  const bebidas = disponibles.filter((p) => p.tipo === "BEBIDA");
  const comidas = disponibles.filter((p) => p.tipo === "COMIDA");
  const especialidades = comidas.filter((p) => p.esEspecialidad);
  // Sabores combinables de alitas: misma convención de categoría que el servidor
  const saboresAlitas = comidas.filter(
    (p) =>
      p.categoria === "alitas" && p.variantes.some((v) => v.maxSabores >= 2)
  );
  const promociones = catalogo.promociones.filter((p) =>
    esDomicilio ? p.vigenteDomicilio : p.vigenteEstablecimiento
  );

  const cambiarCanal = (nuevo: CanalVenta) => {
    if (nuevo === canal) return;
    setCanal(nuevo);
    if (lineas.length > 0) {
      setLineas([]);
      toast.info("El pedido se vació al cambiar de canal.");
    }
  };

  const agregarLinea = (linea: Omit<LineaCarrito, "uid">) => {
    setLineas((actual) => [
      ...actual,
      { ...linea, uid: crypto.randomUUID() },
    ]);
  };

  const agregarProducto = (producto: ProductoWizard, variante: VarianteWizard) => {
    agregarLinea({
      tipoLinea: "PRODUCTO",
      titulo:
        variante.tamano === "unico"
          ? producto.nombre
          : `${producto.nombre} (${variante.tamano})`,
      cantidad: 1,
      precioCents: aCents(variante.precio),
      permiteExtrasNotas: producto.permiteExtrasNotas,
      gruposExtras: producto.grupoExtras,
      notas: "",
      extras: [],
      productoId: producto.id,
      varianteId: variante.id,
    });
    toast.success(`${producto.nombre} agregado.`);
  };

  const agregarPersonalizada = (datos: {
    tamano: string;
    mitad1: ProductoWizard;
    mitad2: ProductoWizard;
    precioCents: number;
  }) => {
    agregarLinea({
      tipoLinea: "PIZZA_PERSONALIZADA",
      titulo: `Pizza personalizada (${datos.tamano})`,
      subtitulo: `Mitades: ${datos.mitad1.nombre} / ${datos.mitad2.nombre}`,
      cantidad: 1,
      precioCents: datos.precioCents,
      permiteExtrasNotas: true,
      gruposExtras: [
        ...new Set([...datos.mitad1.grupoExtras, ...datos.mitad2.grupoExtras]),
      ],
      notas: "",
      extras: [],
      tamano: datos.tamano,
      mitad1ProductoId: datos.mitad1.id,
      mitad2ProductoId: datos.mitad2.id,
    });
    toast.success("Pizza personalizada agregada.");
  };

  const agregarAlitas = (datos: {
    tamano: string;
    sabores: ProductoWizard[];
    precioCents: number;
  }) => {
    agregarLinea({
      tipoLinea: "ALITAS_PERSONALIZADAS",
      titulo: `Alitas combinadas (${datos.tamano})`,
      subtitulo: `Sabores: ${datos.sabores.map((s) => s.nombre).join(" / ")}`,
      cantidad: 1,
      precioCents: datos.precioCents,
      permiteExtrasNotas: true,
      gruposExtras: [
        ...new Set(datos.sabores.flatMap((s) => s.grupoExtras)),
      ],
      notas: "",
      extras: [],
      tamano: datos.tamano,
      saboresProductoIds: datos.sabores.map((s) => s.id),
    });
    toast.success("Alitas combinadas agregadas.");
  };

  const agregarPromo = (promo: PromoWizard) => {
    agregarLinea({
      tipoLinea: "PROMOCION",
      titulo: promo.nombre,
      subtitulo: promo.tipo === "PAQUETE" ? "Paquete" : "Promoción",
      cantidad: 1,
      precioCents: promo.precioEspecial ? aCents(promo.precioEspecial) : 0,
      permiteExtrasNotas: false,
      gruposExtras: [],
      notas: "",
      extras: [],
      promocionId: promo.id,
    });
    toast.success(`${promo.nombre} agregada.`);
  };

  const agregarPaquete = (datos: {
    promo: PromoWizard;
    componentes: { componenteId: string; productoId: string }[];
    notas: string;
    resumen: string;
  }) => {
    agregarLinea({
      tipoLinea: "PROMOCION",
      titulo: datos.promo.nombre,
      subtitulo: datos.resumen,
      cantidad: 1,
      precioCents: datos.promo.precioEspecial
        ? aCents(datos.promo.precioEspecial)
        : 0,
      permiteExtrasNotas: false,
      gruposExtras: [],
      notas: datos.notas,
      extras: [],
      promocionId: datos.promo.id,
      componentes: datos.componentes,
    });
    toast.success(`${datos.promo.nombre} agregado.`);
  };

  const agregar2x1 = (datos: {
    promo: PromoWizard;
    compra: { productoId: string; varianteId: string };
    regalo: { productoId: string; varianteId: string };
    tituloCompra: string;
    tituloRegalo: string;
    precioCents: number;
  }) => {
    agregarLinea({
      tipoLinea: "PROMOCION",
      titulo: datos.promo.nombre,
      subtitulo: `Compra ${datos.tituloCompra} · Regalo ${datos.tituloRegalo}`,
      cantidad: 1,
      precioCents: datos.precioCents,
      permiteExtrasNotas: false,
      gruposExtras: [],
      notas: "",
      extras: [],
      promocionId: datos.promo.id,
      compraProductoId: datos.compra.productoId,
      compraVarianteId: datos.compra.varianteId,
      regaloProductoId: datos.regalo.productoId,
      regaloVarianteId: datos.regalo.varianteId,
    });
    toast.success(`${datos.promo.nombre} agregado.`);
  };

  const cambiarCantidad = (uid: string, delta: number) => {
    setLineas((actual) =>
      actual.map((l) =>
        l.uid === uid ? { ...l, cantidad: Math.max(1, l.cantidad + delta) } : l
      )
    );
  };

  const quitar = (uid: string) => {
    setLineas((actual) => actual.filter((l) => l.uid !== uid));
  };

  const setExtrasNotas = (uid: string, extras: ExtraCarrito[], notas: string) => {
    setLineas((actual) =>
      actual.map((l) => (l.uid === uid ? { ...l, extras, notas } : l))
    );
  };

  const faltaCliente = !modoAgregar && esDomicilio && (!cliente || !direccionId);

  // En modo agregar el paso Cliente no existe: la venta ya lo conoce
  const pasos = modoAgregar ? PASOS.slice(1) : PASOS;
  const pasoActual = pasos[paso - 1];

  const confirmarAgregado = (agregado: ModoAgregar) => {
    startTransition(async () => {
      const resultado = await agregarLineas({
        ventaId: agregado.ventaId,
        lineas: aLineasEntrada(lineas),
      });
      if (resultado.ok) {
        toast.success(
          esDomicilio
            ? `Productos agregados a la venta #${agregado.folio}; la comanda se reimprime completa.`
            : `Ronda ${agregado.ronda} agregada a la venta #${agregado.folio}.`
        );
        if (resultado.avisoImpresion) {
          avisarFalloImpresion(
            resultado.avisoImpresion,
            agregado.ventaId,
            "comandas"
          );
        }
        // De regreso al listado (como el cobro): ahí siguen las pendientes
        router.push("/ventas");
      } else {
        toast.error(resultado.error);
      }
    });
  };

  const confirmar = () => {
    if (modoAgregar) {
      confirmarAgregado(modoAgregar);
      return;
    }
    if (faltaCliente) {
      toast.error("La venta a domicilio necesita cliente y dirección (paso 1).");
      return;
    }
    startTransition(async () => {
      const resultado = await crearVenta({
        canal,
        mesa: !esDomicilio ? mesa || undefined : undefined,
        clienteId: esDomicilio ? cliente?.id : undefined,
        direccionId: esDomicilio ? direccionId : undefined,
        pagaCon: esDomicilio && pagaCon ? pagaCon : undefined,
        metodoPago,
        lineas: aLineasEntrada(lineas),
      });
      if (resultado.ok) {
        toast.success(`Venta #${resultado.folio} registrada.`);
        if (resultado.avisoImpresion) {
          avisarFalloImpresion(
            resultado.avisoImpresion,
            resultado.ventaId,
            "comandas"
          );
        }
        router.push("/ventas");
      } else {
        toast.error(resultado.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {modoAgregar ? (
        <div className="rounded-xl border bg-card p-4">
          <p className="font-medium">
            Agregando a la venta #{modoAgregar.folio} ·{" "}
            {esDomicilio
              ? modoAgregar.cliente ?? "Domicilio"
              : modoAgregar.mesa
                ? `Mesa ${modoAgregar.mesa}`
                : "Mostrador"}
          </p>
          <p className="text-sm text-muted-foreground">
            {esDomicilio
              ? "El pedido se reimprime completo en cocina: retira la comanda anterior antes de confirmar."
              : `Ronda ${modoAgregar.ronda} de la mesa; la comanda saldrá solo con lo nuevo.`}
          </p>
        </div>
      ) : null}

      {/* Indicador de pasos */}
      <ol className="flex flex-wrap items-center gap-2">
        {pasos.map((nombre, indice) => {
          const numero = indice + 1;
          return (
            <li key={nombre} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaso(numero)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors duration-150",
                  paso === numero
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent"
                )}
              >
                <span className="tabular-nums">{numero}</span>
                {nombre}
              </button>
              {numero < pasos.length ? (
                <span className="text-muted-foreground">·</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {pasoActual === "Cliente" ? (
        <PasoCliente
          canal={canal}
          onCanal={cambiarCanal}
          mesa={mesa}
          onMesa={setMesa}
          cliente={cliente}
          onCliente={setCliente}
          direccionId={direccionId}
          onDireccion={setDireccionId}
        />
      ) : null}
      {pasoActual === "Bebidas" ? (
        <PasoBebidas bebidas={bebidas} onAgregar={agregarProducto} />
      ) : null}
      {pasoActual === "Comida" ? (
        <PasoComida
          comidas={comidas}
          especialidades={especialidades}
          saboresAlitas={saboresAlitas}
          promociones={promociones}
          todosLosProductos={catalogo.productos}
          esDomicilio={esDomicilio}
          onAgregarProducto={agregarProducto}
          onAgregarPersonalizada={agregarPersonalizada}
          onAgregarAlitas={agregarAlitas}
          onAgregarPromo={agregarPromo}
          onAgregarPaquete={agregarPaquete}
          onAgregar2x1={agregar2x1}
        />
      ) : null}
      {pasoActual === "Confirmación" ? (
        <PasoResumen
          lineas={lineas}
          mesa={modoAgregar ? modoAgregar.mesa ?? "" : mesa}
          domicilio={
            !modoAgregar && esDomicilio && cliente
              ? {
                  cliente: cliente.nombre,
                  direccion:
                    cliente.direcciones.find((d) => d.id === direccionId)
                      ?.direccion ?? "",
                  pagaCon,
                }
              : null
          }
          agregar={
            modoAgregar
              ? {
                  esDomicilio,
                  ronda: modoAgregar.ronda,
                  lineasPrevias: modoAgregar.lineasPrevias,
                  totalPrevioCents: modoAgregar.totalPrevioCents,
                }
              : undefined
          }
          metodoPago={metodoPago}
          extrasDisponibles={catalogo.extras}
          onMetodoPago={setMetodoPago}
          onPagaCon={setPagaCon}
          onCantidad={cambiarCantidad}
          onQuitar={quitar}
          onExtrasNotas={setExtrasNotas}
        />
      ) : null}

      {/* Barra de navegación fija del wizard */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 p-4 backdrop-blur md:-mx-6">
        <Button
          variant="outline"
          className="h-11"
          onClick={() => setPaso((p) => Math.max(1, p - 1))}
          disabled={paso === 1}
        >
          <ArrowLeft className="size-4" />
          Atrás
        </Button>
        <p className="text-lg font-semibold tabular-nums">
          {lineas.length > 0
            ? modoAgregar
              ? `${lineas.length} línea(s) nueva(s) · ${formatoCents(totalCarritoCents(lineas))} · Total: ${formatoCents(modoAgregar.totalPrevioCents + totalCarritoCents(lineas))}`
              : `${lineas.length} línea(s) · ${formatoCents(totalCarritoCents(lineas))}`
            : "Pedido vacío"}
        </p>
        {paso < pasos.length ? (
          <Button className="h-11" onClick={() => setPaso((p) => p + 1)}>
            Siguiente
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            className="h-11"
            onClick={confirmar}
            disabled={pendiente || lineas.length === 0}
          >
            <Check className="size-4" />
            {pendiente
              ? "Registrando…"
              : modoAgregar
                ? "Agregar a la venta"
                : "Confirmar venta"}
          </Button>
        )}
      </div>
    </div>
  );
}
