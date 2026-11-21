import { notFound, redirect } from "next/navigation";

const API = process.env.RESTAURANTOS_INTERNAL_API_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? "https://restaurantos-backend-kz2r.onrender.com";

type DomainResponse = { success: boolean; data?: { slug?: string } };

export default async function TenantHostPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) notFound();

  let slug: string | undefined;
  try {
    const response = await fetch(
      API + "/api/v1/public/restaurants/domains/" + encodeURIComponent(subdomain),
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) notFound();
    const payload: DomainResponse = await response.json();
    if (!payload.success) notFound();
    slug = payload.data?.slug;
  } catch {
    notFound();
  }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) notFound();
  redirect("/r/" + encodeURIComponent(slug) + "/menu");
}
