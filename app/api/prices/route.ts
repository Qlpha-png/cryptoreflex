import { NextResponse } from "next/server";
import { fetchPrices, DEFAULT_COINS, type CoinId } from "@/lib/coingecko";

export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");
  const ids = (idsParam ? (idsParam.split(",") as CoinId[]) : DEFAULT_COINS);

  const prices = await fetchPrices(ids);

  return NextResponse.json(
    { prices, updatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
