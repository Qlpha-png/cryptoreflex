/**
 * /mon-compte/acces-admin — DIAGNOSTIC de l'accès administrateur, pour le compte connecté (09/10/2026).
 *
 * Kev : « je me suis connecté deux fois… ça fonctionne pas quand j'essaie d'aller dans l'Usine ». Les pages /admin et
 * /admin/usine répondent 404 à tout compte non administrateur, sans dire pourquoi (c'est voulu : aucune fuite). Cette page,
 * réservée au compte connecté et ne montrant que SES propres informations, explique le verdict de lib/auth.ts :
 * admin = adresse listée dans la variable Vercel ADMIN_EMAILS ET e-mail confirmé (email_confirmed_at).
 * Aucune valeur de la variable n'est affichée (seulement « ton adresse y est » ou non ; même pas si la variable existe).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { getUser, isAdminEmail } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Accès administrateur — diagnostic",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccesAdminPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");

  const supabase = createSupabaseServerClient();
  const auth = supabase ? (await supabase.auth.getUser()).data.user : null;
  const confirmeLe = auth?.email_confirmed_at ?? null;
  const listee = isAdminEmail(user.email);
  const admin = user.isAdmin;

  const Ligne = ({ ok, titre, detail }: { ok: boolean; titre: string; detail: string }) => (
    <li className={`flex gap-3 rounded-xl border p-3 ${ok ? "border-success-border bg-success-soft" : "border-danger-border bg-danger-soft"}`}>
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-fg" aria-hidden /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg" aria-hidden />}
      <div>
        <div className={`text-sm font-bold ${ok ? "text-success-fg" : "text-danger-fg"}`}>{titre}</div>
        <p className="mt-0.5 text-xs text-fg/80">{detail}</p>
      </div>
    </li>
  );

  return (
    <section className="min-h-[70vh] py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* 10/10/2026 : fil d'Ariane du site (un seul émetteur de BreadcrumbList, rubrique « compte » dans lib/nav-data.ts) */}
        <Breadcrumbs chemin="/mon-compte/acces-admin" />
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-extrabold text-fg sm:text-3xl">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          Accès administrateur : {admin ? "oui" : "non"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Compte connecté : <strong className="text-fg/85">{user.email}</strong>. Les pages d&apos;administration répondent « 404 » à tout compte qui ne remplit pas les trois conditions ci-dessous.
        </p>

        <ul className="mt-6 space-y-2">
          <Ligne ok titre="1. Connecté sur www.cryptoreflex.fr" detail="La session est reconnue sur cette adresse. Utilise toujours l'adresse complète avec « www » : la connexion y est liée." />
          <Ligne
            ok={Boolean(confirmeLe)}
            titre={confirmeLe ? `2. E-mail confirmé (le ${new Date(confirmeLe).toLocaleDateString("fr-FR")})` : "2. E-mail non confirmé"}
            detail={confirmeLe ? "Ton adresse a été prouvée : condition remplie." : "Ton adresse n'a jamais été prouvée. Déconnecte-toi, puis sur /connexion choisis la connexion par lien reçu par e-mail et clique le lien : cela confirme l'adresse."}
          />
          <Ligne
            ok={listee}
            titre={listee ? "3. Ton adresse est dans la liste des administrateurs" : "3. Ton adresse n'est pas dans la liste des administrateurs"}
            detail={
              listee
                ? "Condition remplie."
                : `La liste des administrateurs est la variable d'environnement ADMIN_EMAILS du projet sur Vercel ; elle ne contient pas ${user.email} (ou n'existe pas encore). À faire : Vercel → projet cryptoreflex → Settings → Environment Variables → ADMIN_EMAILS (la créer si elle manque) → valeur : ${user.email} (plusieurs adresses séparées par des virgules) → Save, puis Deployments → ⋯ sur le dernier déploiement → Redeploy. La variable n'est lue qu'au déploiement. Reviens ensuite sur cette page.`
            }
          />
        </ul>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-4 text-sm">
          {admin ? (
            <>
              <p className="text-fg">Tout est en ordre. Tes pages :</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li><Link href="/admin/usine" className="font-semibold text-primary hover:underline">L&apos;Usine, salle de contrôle</Link> (installable comme application depuis Chrome ou Edge)</li>
                <li><Link href="/admin" className="font-semibold text-primary hover:underline">Tableau de bord admin</Link></li>
              </ul>
            </>
          ) : (
            <p className="text-fg/85">
              Une fois les trois conditions au vert, <Link href="/admin/usine" className="font-semibold text-primary hover:underline">/admin/usine</Link> s&apos;ouvre directement. Cette page ne montre que tes propres informations ; elle n&apos;affiche jamais le contenu de la liste des administrateurs.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
