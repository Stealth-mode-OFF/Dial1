-- Lock down legacy kv store (used only by edge functions with service role).
-- The previous "allow all" policy is unsafe for production.

alter table if exists public.kv_store_139017f8 enable row level security;

do $$
begin
  if to_regclass('public.kv_store_139017f8') is null then
    return;
  end if;

  -- Remove permissive policies if present.
  begin
    drop policy if exists "Enable all access" on public.kv_store_139017f8;
  exception
    when others then
      raise notice 'Skipping kv_store policy drop: %', sqlerrm;
  end;
end $$;

