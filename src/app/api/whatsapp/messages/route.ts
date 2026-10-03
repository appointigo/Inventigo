import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { messageActivityQuerySchema } from "@/modules/whatsapp/messageSchemas";
import { createWhatsAppMessageActivityService } from "@/modules/whatsapp/server";
export async function GET(request:Request){const user=await requireOrgAuth().catch(()=>null);if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const params=Object.fromEntries(new URL(request.url).searchParams);const parsed=messageActivityQuerySchema.safeParse(params);if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Invalid filters"},{status:400});return NextResponse.json(await createWhatsAppMessageActivityService().list(user.orgId,parsed.data));}
