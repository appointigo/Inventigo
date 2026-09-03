export interface WhatsAppCredentialStore {
  save(input: { organizationId: string; accessToken: string; expiresAt?: Date }): Promise<string>;
  resolve(credentialRef: string, organizationId: string): Promise<string>;
}
