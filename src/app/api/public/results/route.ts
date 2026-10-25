import {NextResponse} from "next/server";
import {publicClasses} from "@/lib/public-results";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json(await publicClasses(),{headers:{"Cache-Control":"no-store"}});}
