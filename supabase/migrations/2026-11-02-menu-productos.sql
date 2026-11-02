-- Actualiza el menú de Pollos Vidal. Puede ejecutarse más de una vez.
update public.products
set name = 'Pollo al Spiedo Económico',
    description = 'Porción de pollo al spiedo con arroz, tallarín y papas.',
    price = 17
where id = 'spiedo';

update public.products
set name = 'Pollo Broaster Económico'
where id = 'broaster';

update public.products
set name = 'Pollo Entero',
    description = 'Pollo entero, sin guarniciones.',
    price = 90
where id = 'combo';

insert into public.products(id, name, description, price)
values (
  'pollo-entero-guarniciones',
  'Pollo Entero con Guarniciones',
  'Pollo entero acompañado de arroz, tallarín y papas.',
  120
)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    price = excluded.price;
