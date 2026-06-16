-- ════════════════════════════════════════════════════════════════
--  MIGRACIÓN: Single-user → Multi-usuario con Supabase Auth real
--  Ejecutar en: Supabase > SQL Editor > New query > Run
--  ⚠ ORDEN IMPORTANTE: ejecutar TODO el bloque completo
-- ════════════════════════════════════════════════════════════════

-- ── PASO 1: Eliminar políticas anónimas actuales ──────────────
drop policy if exists "Acceso anon movimientos"    on movimientos;
drop policy if exists "Acceso anónimo inversiones" on inversiones;
drop policy if exists "Acceso anónimo deudas"      on deudas;
drop policy if exists "Acceso anónimo pagos_deuda" on pagos_deuda;
drop policy if exists "Acceso anon cargos_tarjeta" on cargos_tarjeta;

-- También eliminar las políticas originales del schema (por si existen)
drop policy if exists "Usuario ve solo sus movimientos"    on movimientos;
drop policy if exists "Usuario ve solo sus inversiones"    on inversiones;
drop policy if exists "Usuario ve solo sus deudas"         on deudas;
drop policy if exists "Usuario ve solo sus pagos de deuda" on pagos_deuda;
drop policy if exists "Usuario ve solo sus cargos de tarjeta" on cargos_tarjeta;

-- ── PASO 2: Quitar el FK a auth.users (por si se eliminó antes) ──
-- (ignorar errores si ya no existen)
alter table movimientos    drop constraint if exists movimientos_user_id_fkey;
alter table inversiones    drop constraint if exists inversiones_user_id_fkey;
alter table deudas         drop constraint if exists deudas_user_id_fkey;
alter table pagos_deuda    drop constraint if exists pagos_deuda_user_id_fkey;
alter table cargos_tarjeta drop constraint if exists cargos_tarjeta_user_id_fkey;

-- ── PASO 3: Restaurar FK a auth.users en todas las tablas ──────
alter table movimientos
  add constraint movimientos_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table inversiones
  add constraint inversiones_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table deudas
  add constraint deudas_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table pagos_deuda
  add constraint pagos_deuda_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table cargos_tarjeta
  add constraint cargos_tarjeta_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- ── PASO 4: Quitar el default de UUID fijo (si existe) ─────────
alter table movimientos    alter column user_id drop default;
alter table inversiones    alter column user_id drop default;
alter table deudas         alter column user_id drop default;
alter table pagos_deuda    alter column user_id drop default;
alter table cargos_tarjeta alter column user_id drop default;

-- ── PASO 5: Asegurarse que RLS está habilitado ─────────────────
alter table movimientos    enable row level security;
alter table inversiones    enable row level security;
alter table deudas         enable row level security;
alter table pagos_deuda    enable row level security;
alter table cargos_tarjeta enable row level security;

-- ── PASO 6: Crear políticas RLS correctas (auth.uid()) ─────────
-- movimientos
create policy "Cada usuario ve solo sus movimientos"
  on movimientos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- inversiones
create policy "Cada usuario ve solo sus inversiones"
  on inversiones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- deudas
create policy "Cada usuario ve solo sus deudas"
  on deudas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- pagos_deuda
create policy "Cada usuario ve solo sus pagos"
  on pagos_deuda for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- cargos_tarjeta
create policy "Cada usuario ve solo sus cargos"
  on cargos_tarjeta for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── PASO 7: Actualizar función get_dashboard ───────────────────
-- (ya usa auth.uid(), solo aseguramos que existe)
create or replace function get_dashboard(p_mes date default null)
returns table (
  ingresos           numeric,
  gastos_caja        numeric,
  gastos_total       numeric,
  pagos_deuda_total  numeric,
  traslados_inversion numeric,
  saldo_caja         numeric
)
language sql security invoker stable as $$
  select
    coalesce(sum(valor) filter (where tipo = 'ingreso'), 0),
    coalesce(sum(valor) filter (where tipo = 'gasto' and not es_credito), 0),
    coalesce(sum(valor) filter (where tipo = 'gasto'), 0),
    coalesce(sum(valor) filter (where tipo = 'pago_deuda_cuota'), 0),
    coalesce(sum(valor) filter (where tipo = 'traslado_inversion'), 0),
    coalesce(sum(valor) filter (where tipo = 'ingreso'), 0)
    - coalesce(sum(valor) filter (where tipo = 'gasto' and not es_credito), 0)
    - coalesce(sum(valor) filter (where tipo = 'pago_deuda_cuota'), 0)
    - coalesce(sum(valor) filter (where tipo = 'traslado_inversion'), 0)
  from movimientos
  where user_id = auth.uid()
    and (p_mes is null
         or date_trunc('month', fecha) = date_trunc('month', p_mes::timestamptz));
$$;

-- ════════════════════════════════════════════════════════════════
--  ✅ LISTO
--  Ahora cada usuario autenticado ve SOLO sus propios datos.
--  Recuerda ir a Supabase > Authentication > Providers
--  y verificar que "Email" esté habilitado.
-- ════════════════════════════════════════════════════════════════
