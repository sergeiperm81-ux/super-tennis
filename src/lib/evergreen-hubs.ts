/**
 * Localized evergreen-hub metadata + item fetch (for /es/rules/, /es/money/, /es/watch/).
 * The individual pages live in page_translations (rendered by [lang]/[...page].astro);
 * these hubs are simple localized landing lists linking to them.
 */
import { supabase } from './supabase';
import type { Locale } from './i18n';

export interface HubMeta {
  section: string;
  home: string;
  title: string;
  intro: string;
}

const META: Record<string, Record<string, { title: string; intro: string; home: string }>> = {
  rules: {
    es: { title: 'Reglas del Tenis', intro: 'Cómo funciona el tenis: puntuación, sets, tie-breaks y las reglas del juego, explicadas con claridad.', home: 'Inicio' },
    fr: { title: 'Règles du Tennis', intro: 'Comment fonctionne le tennis : le score, les sets, les tie-breaks et les règles du jeu, expliqués simplement.', home: 'Accueil' },
  },
  money: {
    es: { title: 'Dinero en el Tenis', intro: 'Premios, ganancias de los jugadores y la economía del tenis profesional.', home: 'Inicio' },
    fr: { title: 'Argent du Tennis', intro: 'Dotations, gains des joueurs et économie du tennis professionnel.', home: 'Accueil' },
  },
  watch: {
    es: { title: 'Cómo Ver Tenis', intro: 'Dónde ver los Grand Slams y el circuito: emisoras, plataformas de streaming y precios por país.', home: 'Inicio' },
    fr: { title: 'Comment Regarder le Tennis', intro: 'Où regarder les Grands Chelems et le circuit : diffuseurs, plateformes et tarifs par pays.', home: 'Accueil' },
  },
};

export function getHubMeta(section: string, locale: Locale): HubMeta | null {
  const m = META[section]?.[locale];
  if (!m) return null;
  return { section, home: m.home, title: m.title, intro: m.intro };
}

export interface HubItem {
  path: string;
  title: string;
  excerpt: string;
}

/** Published localized pages under `${section}/…`, newest-key first, for the hub grid. */
export async function getHubItems(section: string, locale: Locale): Promise<HubItem[]> {
  const { data } = await supabase
    .from('page_translations')
    .select('page_key, fields_json')
    .eq('lang', locale)
    .eq('status', 'published')
    .like('page_key', `${section}/%`);
  return (data || [])
    .map((row: any) => {
      const f = row.fields_json || {};
      return {
        path: `/${locale}/${row.page_key}/`,
        title: f.h1 || f.title || row.page_key,
        excerpt: f.quickAnswer ? String(f.quickAnswer).slice(0, 140) : (f.metaDescription ? String(f.metaDescription).slice(0, 140) : ''),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, locale));
}
