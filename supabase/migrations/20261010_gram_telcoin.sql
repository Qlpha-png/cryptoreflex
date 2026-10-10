-- 10/10/2026 — décisions de Kev : renommage Toncoin → « Gram (prev. Toncoin) » et rattachement de la fiche Telcoin au
-- nouveau jeton CoinGecko « telcoin-2 » (URL publique /cryptos/telcoin gardée : slug inchangé).
-- Relevés du 10/10/2026 :
--   CoinGecko the-open-network = « Gram (prev. Toncoin) », symbole GRAM ; CoinMarketCap 11419 idem.
--   CoinGecko telcoin = « Telcoin [OLD] » (ancien contrat 0x467b… sur Ethereum) ; telcoin-2 = Telcoin (TEL),
--   contrat 0x7e13b43065380acdec1c2d138c579cbbbafa0731 sur Ethereum, Base et Polygon ; CoinMarketCap 2394 annonce la
--   migration vers ce même contrat (le cours en base vient déjà de CMC 2394 : même échelle, archive conservée).
-- À lancer APRÈS le déploiement du code qui lit les fiches par slug (sinon /cryptos/telcoin répond 404).
-- Chaque mise à jour est gardée par l'état attendu : relancer ce script ne change rien.

begin;

update public.cryptos
set symbol = 'GRAM', name = 'Gram (prev. Toncoin)'
where coingecko_id = 'the-open-network' and symbol = 'TON' and name = 'Toncoin';

update public.cryptos
set coingecko_id = 'telcoin-2',
    chains = '{"ethereum": "0x7e13b43065380acdec1c2d138c579cbbbafa0731", "base": "0x7e13b43065380acdec1c2d138c579cbbbafa0731", "polygon-pos": "0x7e13b43065380acdec1c2d138c579cbbbafa0731"}'::jsonb,
    raw_data_snapshot = jsonb_set(
      jsonb_set(raw_data_snapshot, '{coingeckoId}', '"telcoin-2"'::jsonb),
      '{contracts}',
      '{"ethereum": "0x7e13b43065380acdec1c2d138c579cbbbafa0731", "base": "0x7e13b43065380acdec1c2d138c579cbbbafa0731", "polygon-pos": "0x7e13b43065380acdec1c2d138c579cbbbafa0731"}'::jsonb
    )
where coingecko_id = 'telcoin' and slug = 'telcoin'
  and not exists (select 1 from public.cryptos where coingecko_id = 'telcoin-2');

update public.cours_archive set fiche = 'telcoin-2' where fiche = 'telcoin';

commit;

-- Contrôle (résultat attendu : 2 lignes, GRAM et telcoin-2 / slug telcoin avec le nouveau contrat ; 0 point d'archive
-- encore sous « telcoin »).
select coingecko_id, slug, symbol, name, chains->>'ethereum' as contrat_ethereum,
       (select count(*) from public.cours_archive a where a.fiche = 'telcoin') as archive_ancien_id
from public.cryptos
where coingecko_id in ('the-open-network', 'telcoin', 'telcoin-2')
order by coingecko_id;
