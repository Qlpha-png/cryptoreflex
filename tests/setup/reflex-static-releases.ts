/**
 * Tests : le moteur Reflex Cards démarre avec seulement la partie 1 sortie (sécurité production). Les tests écrits avant le
 * passage aux « sorties par paliers de joueurs » (03/10/2026) raisonnent sur le calendrier d'origine (jour 8, 15, …, 90) :
 * on le rebranche ici pour toute la suite. Un test qui veut autre chose rappelle setPartDays() lui-même.
 */
import rules from "@/data/reflex-cards-rules.json";
import { setPartDays } from "@/lib/reflex-cards/engine";

const R = rules as unknown as { parts: { jour: number }[]; totyFromDay: number };
setPartDays(R.parts.map((p) => p.jour), R.totyFromDay, 90);
