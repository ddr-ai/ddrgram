create table if not exists watchlist_items (
  user_id     text not null,
  peer_id     text not null,
  access_hash text not null,
  username    text,
  title       text not null,
  kind        text not null check (kind in ('channel', 'group')),
  muted       boolean not null default false,
  added_at    timestamptz not null default now(),
  primary key (user_id, peer_id)
);
create index if not exists watchlist_items_user_added_idx
  on watchlist_items (user_id, added_at desc);
