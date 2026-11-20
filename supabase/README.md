# Base de datos de 99 ERP (Supabase)

## Contenido

- `migrations/0001_esquema_inicial.sql`: esquema multiempresa completo con protección RLS.
- `tests/`: pruebas de la protección para correr en un PostgreSQL local (no en Supabase).

## Cómo está protegida

- Cada tabla tiene `empresa_id`. Un usuario solo ve y cambia los datos de las empresas donde es **colaborador activo** (`colaboradores.user_id = auth.uid()`).
- Sin sesión no se puede leer nada. La única excepción: la página web puede **registrar** prospectos (`prospectos`), pero no leerlos.
- El kardex (`inventario_movimientos`) solo admite agregar movimientos. Cada movimiento actualiza la existencia del producto mediante un trigger.
- El PIN se guarda cifrado (`pin_hash`) y nunca se puede leer. Se valida con `validar_pin()` y se cambia con `asignar_pin()`.
- Los sueldos solo los ve quien tiene el permiso `colaboradores.nomina`, a través de la vista `colaboradores_directorio`.
- Toda alta, cambio o baja en las tablas principales queda en `bitacora`. Solo el Administrador puede consultarla y nadie la puede modificar.
- El rol Administrador está bloqueado: nadie puede cambiar sus permisos.
- Los folios consecutivos por empresa se piden con `siguiente_folio(empresa, 'V')`.
- Una empresa nueva se crea con `crear_empresa(nombre, nombre_admin)`. Eso crea sus roles base, sus listas de precios y deja al usuario que la crea como Administrador.

## Aplicar en un proyecto nuevo de Supabase

1. En Supabase abre el proyecto nuevo → **SQL Editor** → **New query**.
2. Pega el contenido de `migrations/0001_esquema_inicial.sql` y pulsa **Run**.

## Probar localmente

```bash
createdb erp99
psql -d erp99 -f supabase/tests/00_simular_supabase.sql
psql -d erp99 -f supabase/migrations/0001_esquema_inicial.sql
psql -d erp99 -f supabase/tests/01_pruebas_rls.sql
```
