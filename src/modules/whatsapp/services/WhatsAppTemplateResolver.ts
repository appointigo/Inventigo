import { WhatsAppError } from "../errors.ts";
import type { WhatsAppRepository } from "../repositories/WhatsAppRepository";
import type { ResolvedWhatsAppTemplate, WhatsAppTemplateReference } from "../types";

export class WhatsAppTemplateResolver {
  private readonly repository: WhatsAppRepository;

  constructor(repository: WhatsAppRepository) {
    this.repository = repository;
  }

  async resolve(input: {
    organizationId: string;
    wabaId: string;
    template: WhatsAppTemplateReference;
  }): Promise<ResolvedWhatsAppTemplate> {
    const template = await this.repository.resolveTemplate({
      organizationId: input.organizationId,
      wabaId: input.wabaId,
      key: input.template.key,
      language: input.template.language,
      version: input.template.version,
    });
    if (!template) {
      throw new WhatsAppError("TEMPLATE_NOT_FOUND", "No matching WhatsApp template was found");
    }
    if (template.status !== "APPROVED") {
      throw new WhatsAppError("TEMPLATE_NOT_APPROVED", "The WhatsApp template is not approved");
    }
    return template;
  }
}
