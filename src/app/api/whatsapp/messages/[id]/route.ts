import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { createWhatsAppMessageActivityService } from "@/modules/whatsapp/server";
export async function GET(_:Request,context:{params:Promise<{id:string}>}){const user=await requireOrgAuth().catch(()=>null);if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});try{return NextResponse.json(await createWhatsAppMessageActivityService().get(user.orgId,(await context.params).id));}catch{return NextResponse.json({error:"Message not found"},{status:404});}}
