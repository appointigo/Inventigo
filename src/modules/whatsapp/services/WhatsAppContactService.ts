import type { Prisma, PrismaClient, WhatsAppConsentPurpose, WhatsAppConsentStatus } from "@prisma/client";
import { prisma } from "../../../lib/db.ts";

export function normalizeWhatsAppPhone(value: string, defaultCountryCode = "91") {
  const trimmed = value.trim(); const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0")) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+${defaultCountryCode}${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith("0")) return `+${digits}`;
  throw new Error("Invalid WhatsApp phone number");
}

export async function syncWhatsAppContactForCustomer(input: { organizationId:string; customerId:string; phone:string; storeId?:string }, db:PrismaClient=prisma) {
  const normalizedPhone=normalizeWhatsAppPhone(input.phone);
  if(input.storeId){const store=await db.store.findFirst({where:{id:input.storeId,orgId:input.organizationId},select:{id:true}});if(!store)throw new Error("Store not found");}
  const existingByCustomer=await db.whatsAppContact.findUnique({where:{customerId:input.customerId},select:{id:true,organizationId:true,normalizedPhone:true}});
  if(existingByCustomer&&existingByCustomer.organizationId!==input.organizationId)throw new Error("Customer contact organization mismatch");
  let contact;
  if(existingByCustomer){contact=await db.whatsAppContact.update({where:{id:existingByCustomer.id},data:{normalizedPhone,displayPhone:input.phone}});}
  else{contact=await db.whatsAppContact.upsert({where:{organizationId_normalizedPhone:{organizationId:input.organizationId,normalizedPhone}},update:{customerId:input.customerId,displayPhone:input.phone},create:{organizationId:input.organizationId,customerId:input.customerId,normalizedPhone,displayPhone:input.phone,consents:{create:[{purpose:"TRANSACTIONAL",status:"PENDING",source:"CUSTOMER_RECORD"},{purpose:"MARKETING",status:"PENDING",source:"CUSTOMER_RECORD"}]}}});}
  if(input.storeId)await db.whatsAppContactStore.upsert({where:{contactId_storeId:{contactId:contact.id,storeId:input.storeId}},update:{},create:{contactId:contact.id,storeId:input.storeId}});
  return contact;
}

export class WhatsAppContactService {
  constructor(private readonly db:PrismaClient){}
  list(organizationId:string){return this.db.whatsAppContact.findMany({where:{organizationId},select:{id:true,normalizedPhone:true,displayPhone:true,createdAt:true,customer:{select:{id:true,name:true,mobile:true}},stores:{select:{store:{select:{id:true,name:true,code:true}}}},consents:{select:{id:true,purpose:true,status:true,source:true,evidence:true,grantedAt:true,revokedAt:true,recordedAt:true,updatedAt:true}}},orderBy:{createdAt:"desc"}});}
  async setConsent(input:{organizationId:string;contactId:string;purpose:WhatsAppConsentPurpose;status:WhatsAppConsentStatus;source:string;evidence?:Record<string,unknown>}){
    const contact=await this.db.whatsAppContact.findFirst({where:{id:input.contactId,organizationId:input.organizationId},select:{id:true}});if(!contact)throw new Error("Contact not found");
    const now=new Date();return this.db.whatsAppConsent.upsert({where:{contactId_purpose:{contactId:contact.id,purpose:input.purpose}},create:{contactId:contact.id,purpose:input.purpose,status:input.status,source:input.source,evidence:input.evidence as Prisma.InputJsonValue|undefined,recordedAt:now,grantedAt:input.status==="GRANTED"?now:null,revokedAt:input.status==="REVOKED"?now:null},update:{status:input.status,source:input.source,evidence:input.evidence as Prisma.InputJsonValue|undefined,recordedAt:now,grantedAt:input.status==="GRANTED"?now:null,revokedAt:input.status==="REVOKED"?now:null}});}
}
