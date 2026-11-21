# Migración de Aquaplus (cliente piloto) desde el ERP anterior

| Archivo | Qué hace |
|---|---|
| `aquaplus_00_estructura_legado.sql` | Crea el esquema `legado` con la estructura de las tablas del ERP anterior que tienen datos |
| `aquaplus_01_migrar.sql` | `migracion.migrar_aquaplus()`: pasa todo a 99 ERP en una sola transacción |
| `aquaplus_02_validar.sql` | `migracion.validar_aquaplus()`: compara cifras del sistema anterior contra 99 ERP |

## Cómo funciona

- **No toca el ERP anterior.** Trabaja sobre una copia de sus datos dentro del proyecto nuevo, en el esquema `legado`, que se queda como archivo de consulta.
- **Productos, clientes, proveedores y cotizaciones conservan su id.** Las ventas, compras, rutas y pedidos guardan su id anterior en `legacy_id`.
- **Columnas repetidas:** para cada dato se usa la primera columna que tenga valor. Por ejemplo, costo = `costo_compra` → `costo_unitario` → `costo`.
- **Tarifas escritas de varias formas** ("Plomero", "MAYOREO", "distribuidor"…) se convierten a las listas de precios.
- **Ventas:**
  - las partidas salen de `ventas_detalle`; si una venta no tiene detalle, salen de su JSON;
  - las ventas pagadas quedan cobradas por su total, y las pendientes por su anticipo.
- **Kardex:** el histórico se copia sin volver a mover existencias, porque la existencia viene de `productos.stock_actual`.
- **Usuarios:** los colaboradores se crean sin cuenta. Al entrar por primera vez con su correo, `reclamar_acceso()` los vincula; los dados de baja no pueden.
- **Los PIN** del sistema anterior se guardan cifrados.
- **Folios:** los nuevos siguen después del último migrado.
- **Ensayos repetidos:** `migrar_aquaplus(true)` borra la empresa migrada y la vuelve a crear desde cero.

## Pasos para el ensayo y para el cambio definitivo

1. Proyecto nuevo de Supabase con `migrations/0001_esquema_inicial.sql` aplicado.
2. Correr `aquaplus_00_estructura_legado.sql`.
3. Copiar los datos del ERP anterior al esquema `legado`, ya sea:
   - con `postgres_fdw`, conectando el proyecto nuevo al anterior desde el SQL Editor; la contraseña la escribe el dueño y la conexión se borra al terminar; o
   - exportando cada tabla a CSV desde el proyecto anterior e importándola en la tabla `legado.*` del mismo nombre.
4. Correr `aquaplus_01_migrar.sql` y `aquaplus_02_validar.sql`, luego:
   ```sql
   select migracion.migrar_aquaplus();
   select * from migracion.validar_aquaplus();
   ```
5. Revisar las filas con `cuadra = false` y las de "Estado anterior …", que muestran cómo se interpretó cada estado de venta.

## Probado con datos de ejemplo

`tests/02_datos_legado_ejemplo.sql` imita la forma de los datos reales: columnas repetidas, JSON y tarifas mezcladas. `tests/03_pruebas_migracion.sql` comprueba:

- que no se puede migrar dos veces por error;
- que el ensayo se puede repetir desde cero;
- el primer acceso del administrador, y que un empleado dado de baja no puede entrar;
- que los triggers quedan activos y que los folios continúan.
