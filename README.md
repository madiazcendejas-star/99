# 99 ERP

ERP para ferreterías y tiendas de materiales de plomería y construcción (Aquaplus).
Prototipo navegable hecho con React 19, TypeScript, Vite y Tailwind CSS v4.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre la dirección que muestra la terminal (normalmente http://localhost:5173).

Para generar la versión de producción: `npm run build` (queda en `dist/`).

## Vista rápida sin instalar nada

`prototipo/index.html` es el prototipo completo en un solo archivo. Ábrelo con doble clic en el navegador.

## Módulos

- **Inicio**: tablero del día.
- **Cotizaciones**: armado de cotizaciones con descuentos globales o por partida (% o monto).
- **Ventas y Punto de venta**: cobro mixto, descuentos, monedero (saldo a favor), anticipos, apartados (mínimo 20 %, 30 días), pedidos especiales (anticipo 50 %, 7 días para recoger) y devoluciones (30 días, con autorización).
- **Caja**: turno, entradas y salidas de efectivo, corte parcial (X) y corte del día (Z), y la pestaña **Bancos** (cuentas, terminales con su comisión, "Registrar lo recibido" y conciliación).
- **Inventario**: productos con precio por lista (público, mayoreo, plomero, distribuidor), claves SAT, IVA por producto y empaque; kardex y kits (virtuales y fijos con precio sugerido).
- **Compras**: proveedores, órdenes de compra y pedidos sugeridos por stock mínimo y pronóstico.
- **Órdenes**: surtido de almacén (entrega en mostrador o liberación a ruta) y recepción de compras.
- **Rutas**: hojas de ruta, entrega y cobro con motivo cuando se cobra de menos.
- **Clientes**: listas de precios por cliente, datos fiscales (régimen, uso de CFDI, C.P. fiscal) y programa de plomeros.
- **Colaboradores**: sueldos (semanal, quincenal o mensual), carga social opcional, comisiones por vendedor y préstamos.
- **Reportes**: ventas totales contra ventas cobradas, utilidad bruta y neta sobre lo cobrado, estado de resultados, saldo en bancos y caja, pedidos por entregar y OC por recibir. Filtro por periodo o rango de fechas.
- **Configuración**: datos de la empresa (logotipo, razón social, RFC, régimen, domicilio) que salen en todos los documentos; **políticas** del negocio (apartados, pedidos especiales, devoluciones, kits, vigencia de cotizaciones); roles y permisos (el Administrador siempre tiene acceso total) y usuarios.

## Notas

- Los datos son de ejemplo y viven en memoria: se reinician al recargar la página.
- La fecha de trabajo del prototipo es el 18 de noviembre de 2026.
- **Inicio de sesión (modo demostración):** entra con el correo de un colaborador (por ejemplo `carlos@aquaplus.mx`) y la contraseña `demo`. Después del primer acceso, el equipo permite el cambio rápido de usuario con PIN (Carlos 1234, Laura 5678, Ana 2468). El sistema se bloquea tras unos minutos sin uso (Configuración → Políticas).
- **Base de datos:** el esquema de Supabase con protección por empresa está en `supabase/` (ver `supabase/README.md`). La migración de datos del cliente piloto está en `supabase/migraciones-datos/`.
