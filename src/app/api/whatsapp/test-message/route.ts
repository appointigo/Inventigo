import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { testMessageSchema } from "@/modules/whatsapp/messageSchemas";
import { createMetaBackend } from "@/modules/whatsapp/server";
import { isWhatsAppError } from "@/modules/whatsapp/errors";

export async function GET() {
  const user=await requireOrgAuth().catch(()=>null); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{return NextResponse.json(await createMetaBackend().testMessages.options(user.orgId));}catch{return NextResponse.json({error:"Unable to load test message options"},{status:500});}
}
export async function POST(request:Request){
  const user=await requireOrgAuth().catch(()=>null); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!(["OWNER","ADMIN"] as string[]).includes(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const parsed=testMessageSchema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Invalid request"},{status:400});
  try{const response=await createMetaBackend().testMessages.send(user.orgId,parsed.data);return response.sent?NextResponse.json(response,{status:202}):NextResponse.json(response,{status:409});}catch(error){return NextResponse.json({error:isWhatsAppError(error)?error.message:"Unable to send test message"},{status:502});}
}
