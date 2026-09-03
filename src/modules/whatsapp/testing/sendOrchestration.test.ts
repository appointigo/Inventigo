import assert from "node:assert/strict";
import test from "node:test";
import { WhatsAppError } from "../errors.ts";
import { WhatsAppService } from "../services/WhatsAppService.ts";
import type { ResolvedWhatsAppSender } from "../types.ts";
import { selectSenderMapping } from "../repositories/selectSenderMapping.ts";
import { MockMetaWhatsAppClient } from "./MockMetaWhatsAppClient.ts";
import { MockWhatsAppRepository } from "./MockWhatsAppRepository.ts";

const activeSender = (overrides: Partial<ResolvedWhatsAppSender> = {}): ResolvedWhatsAppSender => ({
  integrationId: "integration-1",
  integrationStatus: "CONNECTED",
  credentialRef: "credential-ref-1",
  wabaId: "waba-1",
  wabaStatus: "ACTIVE",
  phoneNumberId: "phone-1",
  metaPhoneNumberId: "meta-phone-1",
  phoneNumberStatus: "ACTIVE",
  resolution: "EXACT_DEFAULT",
  ...overrides,
});

const request = (organizationId = "org-1", storeId = "store-1") => ({
  organizationId,
  storeId,
  to: "919999999999",
  purpose: "ORDER" as const,
  senderPurpose: "TRANSACTIONAL" as const,
  content: { type: "TEXT" as const, text: "Order ready" },
});

const hasCode = (code: string) => (error: unknown) =>
  error instanceof WhatsAppError && error.code === code;

test("sender precedence is exact default, exact priority, then store DEFAULT", () => {
  const candidates = [
    { id: "exact-priority", purpose: "TRANSACTIONAL" as const, isDefault: false },
    { id: "store-default", purpose: "DEFAULT" as const, isDefault: true },
    { id: "exact-default", purpose: "TRANSACTIONAL" as const, isDefault: true },
  ];
  assert.equal(selectSenderMapping(candidates, "TRANSACTIONAL")?.mapping.id, "exact-default");
  assert.equal(selectSenderMapping(candidates.slice(0, 2), "TRANSACTIONAL")?.mapping.id, "exact-priority");
  assert.equal(selectSenderMapping(candidates.slice(1, 2), "TRANSACTIONAL")?.mapping.id, "store-default");
  assert.equal(selectSenderMapping([], "TRANSACTIONAL"), null);
});

test("shared number resolves independently for multiple stores", async () => {
  const repository = new MockWhatsAppRepository();
  repository.senderResolver = async ({ organizationId }) => organizationId === "org-1" ? activeSender() : null;
  const service = new WhatsAppService(repository, new MockMetaWhatsAppClient());
  await service.sendMessage(request("org-1", "store-1"));
  await service.sendMessage(request("org-1", "store-2"));
  assert.deepEqual(repository.resolveSenderInputs.map((value) => value.storeId), ["store-1", "store-2"]);
  assert.deepEqual(repository.createdMessages.map((value) => value.phoneNumberId), ["phone-1", "phone-1"]);
});

test("multiple stores can resolve different configured numbers", async () => {
  const repository = new MockWhatsAppRepository();
  repository.senderResolver = async ({ storeId }) => activeSender({
    phoneNumberId: storeId === "store-1" ? "phone-1" : "phone-2",
    metaPhoneNumberId: storeId === "store-1" ? "meta-phone-1" : "meta-phone-2",
  });
  const service = new WhatsAppService(repository, new MockMetaWhatsAppClient());
  await service.sendMessage(request("org-1", "store-1"));
  await service.sendMessage(request("org-1", "store-2"));
  assert.deepEqual(repository.createdMessages.map((value) => value.phoneNumberId), ["phone-1", "phone-2"]);
});

test("wrong organization cannot resolve another tenant's sender", async () => {
  const repository = new MockWhatsAppRepository();
  repository.senderResolver = async ({ organizationId }) => organizationId === "org-1" ? activeSender() : null;
  const service = new WhatsAppService(repository, new MockMetaWhatsAppClient());
  await assert.rejects(service.sendMessage(request("org-2")), hasCode("NO_WHATSAPP_SENDER_CONFIGURED"));
  assert.equal(repository.createdMessages.length, 0);
});

test("no sender fails before message creation or transport", async () => {
  const repository = new MockWhatsAppRepository();
  const transport = new MockMetaWhatsAppClient();
  const service = new WhatsAppService(repository, transport);
  await assert.rejects(service.sendMessage(request()), hasCode("NO_WHATSAPP_SENDER_CONFIGURED"));
  assert.equal(repository.createdMessages.length, 0);
  assert.equal(transport.requests.length, 0);
});

test("pending and rejected templates are not sent", async () => {
  for (const status of ["PENDING", "REJECTED"] as const) {
    const repository = new MockWhatsAppRepository();
    repository.sender = activeSender();
    repository.template = {
      templateInstanceId: `template-${status}`,
      metaTemplateName: "order_update",
      language: "en",
      version: 1,
      status,
    };
    const transport = new MockMetaWhatsAppClient();
    const service = new WhatsAppService(repository, transport);
    await assert.rejects(service.sendMessage({
      ...request(),
      content: { type: "TEMPLATE", template: { key: "order_update", language: "en" } },
    }), hasCode("TEMPLATE_NOT_APPROVED"));
    assert.equal(repository.createdMessages.length, 0);
    assert.equal(transport.requests.length, 0);
  }
});

test("Meta failure saves normalized FAILED state", async () => {
  const repository = new MockWhatsAppRepository();
  repository.sender = activeSender();
  const transport = new MockMetaWhatsAppClient();
  transport.error = new Error("provider unavailable");
  const service = new WhatsAppService(repository, transport);
  await assert.rejects(service.sendMessage(request()), hasCode("META_SEND_FAILED"));
  assert.equal(repository.createdMessages.length, 1);
  assert.equal(repository.submittedMessages.length, 0);
  assert.equal(repository.failedMessages[0].errorCode, "META_SEND_FAILED");
});

test("successful send saves provider id and SUBMITTED state", async () => {
  const repository = new MockWhatsAppRepository();
  repository.sender = activeSender();
  const transport = new MockMetaWhatsAppClient();
  const service = new WhatsAppService(repository, transport);
  const result = await service.sendMessage(request());
  assert.equal(repository.createdMessages[0].phoneNumberId, "phone-1");
  assert.equal(transport.requests[0].metaPhoneNumberId, "meta-phone-1");
  assert.equal(repository.submittedMessages[0].providerMessageId, "mock-message-id");
  assert.deepEqual(result, {
    messageId: "mock-message-1",
    providerMessageId: "mock-message-id",
    status: "SUBMITTED",
  });
});
