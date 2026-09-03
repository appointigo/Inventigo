import assert from "node:assert/strict";
import test from "node:test";
import { loadTestTenantBootstrapConfig } from "../bootstrap/config.ts";
import { WhatsAppError } from "../errors.ts";
import { WhatsAppService } from "../services/WhatsAppService.ts";
import type { ResolvedWhatsAppSender } from "../types.ts";
import { MockMetaWhatsAppClient } from "./MockMetaWhatsAppClient.ts";
import { MockWhatsAppRepository } from "./MockWhatsAppRepository.ts";

const testOrganizationId = "explicit-test-org";
const ownerSender: ResolvedWhatsAppSender = {
  integrationId: "owner-test-integration",
  integrationStatus: "CONNECTED",
  credentialRef: "owner-test-credential-reference",
  wabaId: "owner-test-waba",
  wabaStatus: "ACTIVE",
  phoneNumberId: "owner-test-phone",
  metaPhoneNumberId: "owner-meta-phone-id",
  phoneNumberStatus: "ACTIVE",
  resolution: "EXACT_DEFAULT",
};

const messageRequest = (organizationId: string) => ({
  organizationId,
  storeId: `${organizationId}-store`,
  to: "919999999999",
  purpose: "ORDER" as const,
  senderPurpose: "TRANSACTIONAL" as const,
  content: { type: "TEXT" as const, text: "Test message" },
});

const errorCode = (code: string) => (error: unknown) =>
  error instanceof WhatsAppError && error.code === code;

test("explicitly configured test Organization resolves the owner test sender", async () => {
  const repository = new MockWhatsAppRepository();
  repository.senderResolver = async ({ organizationId }) =>
    organizationId === testOrganizationId ? ownerSender : null;
  const transport = new MockMetaWhatsAppClient();
  const service = new WhatsAppService(repository, transport);

  await service.sendMessage(messageRequest(testOrganizationId));

  assert.equal(repository.createdMessages[0].phoneNumberId, "owner-test-phone");
  assert.equal(transport.requests[0].credentialRef, "owner-test-credential-reference");
  assert.equal(transport.requests[0].metaPhoneNumberId, "owner-meta-phone-id");
});

test("unconfigured Organization cannot use owner test assets", async () => {
  const repository = new MockWhatsAppRepository();
  repository.senderResolver = async ({ organizationId }) =>
    organizationId === testOrganizationId ? ownerSender : null;
  const transport = new MockMetaWhatsAppClient();
  const service = new WhatsAppService(repository, transport);

  await assert.rejects(
    service.sendMessage(messageRequest("unconfigured-org")),
    errorCode("NO_WHATSAPP_SENDER_CONFIGURED")
  );
  assert.equal(repository.createdMessages.length, 0);
  assert.equal(transport.requests.length, 0);
});

test("wrong-Organization sender and template lookups are rejected", async () => {
  const repository = new MockWhatsAppRepository();
  repository.senderResolver = async ({ organizationId }) =>
    organizationId === testOrganizationId ? ownerSender : null;
  const service = new WhatsAppService(repository, new MockMetaWhatsAppClient());
  await assert.rejects(
    service.sendMessage(messageRequest("wrong-org")),
    errorCode("NO_WHATSAPP_SENDER_CONFIGURED")
  );

  repository.senderResolver = async () => ({ ...ownerSender, phoneNumberId: "wrong-org-own-phone" });
  repository.templateResolver = async ({ organizationId }) => organizationId === testOrganizationId
    ? {
        templateInstanceId: "owner-template",
        metaTemplateName: "owner_template",
        language: "en",
        version: 1,
        status: "APPROVED",
      }
    : null;
  await assert.rejects(
    service.sendMessage({
      ...messageRequest("wrong-org"),
      content: { type: "TEMPLATE", template: { key: "owner_template", language: "en" } },
    }),
    errorCode("TEMPLATE_NOT_FOUND")
  );
});

test("core orchestration persists before invoking tenant-configured mock transport", async () => {
  const sequence: string[] = [];
  const repository = new MockWhatsAppRepository();
  repository.sender = ownerSender;
  const originalCreate = repository.createMessage.bind(repository);
  repository.createMessage = async (input) => {
    sequence.push("QUEUED");
    return originalCreate(input);
  };
  const transport = new MockMetaWhatsAppClient();
  const originalSend = transport.sendMessage.bind(transport);
  transport.sendMessage = async (input) => {
    sequence.push("TRANSPORT");
    return originalSend(input);
  };

  const result = await new WhatsAppService(repository, transport)
    .sendMessage(messageRequest(testOrganizationId));

  assert.deepEqual(sequence, ["QUEUED", "TRANSPORT"]);
  assert.equal(repository.submittedMessages[0].providerMessageId, "mock-message-id");
  assert.equal(result.status, "SUBMITTED");
});

test("bootstrap is explicit and cannot be enabled in production or by legacy variables", () => {
  assert.throws(() => loadTestTenantBootstrapConfig({
    NODE_ENV: "production",
    P05_WHATSAPP_BOOTSTRAP_ENABLED: "true",
  }), /disabled outside development\/test/);

  assert.throws(() => loadTestTenantBootstrapConfig({
    NODE_ENV: "test",
    WHATSAPP_ENABLED: "true",
    WHATSAPP_BUSINESS_ACCOUNT_ID: "legacy-owner-waba",
    WHATSAPP_PHONE_NUMBER_ID: "legacy-owner-phone",
  }), /P05_WHATSAPP_BOOTSTRAP_ENABLED=true/);
});
