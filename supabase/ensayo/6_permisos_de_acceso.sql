-- ENSAYO · ARREGLO · Permisos de acceso a las tablas
-- Los proyectos nuevos de Supabase no dan acceso automático a las tablas. Sin esto la app
-- muestra "permission denied for table …". La protección por empresa (RLS) no cambia.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke insert, update, delete on public.bitacora from authenticated;
grant insert on public.prospectos to anon;

-- Columnas sensibles de colaboradores: el PIN cifrado y los sueldos no se leen directo
revoke select on public.colaboradores from anon, authenticated;
grant select (id, empresa_id, user_id, nombre, puesto, area, rol_id, correo, telefono, tiene_pin, fecha_ingreso, estado,
              comision_pct, meta_mensual, notas, legacy_id, creado_en) on public.colaboradores to authenticated;
grant select on public.colaboradores_directorio to authenticated;
