import { redirect } from 'next/navigation';

const PUBLIC_ID = /^[A-Za-z0-9_-]{4,64}$/;

/**
 * A request link (§5, ADR 0017).
 *
 * `/r/BC-ABCD2345` is what a poster or a forwarded message carries: short, and
 * the only identifier of a request that leaves the system. It lands on the
 * chat with the request in hand, where a registered donor sees the card and a
 * visitor is onboarded first and brought back to it. A link that is not shaped
 * like one opens the chat with nothing in hand rather than erroring.
 */
export default async function RequestLinkPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(PUBLIC_ID.test(publicId) ? `/?r=${encodeURIComponent(publicId)}` : '/');
}
