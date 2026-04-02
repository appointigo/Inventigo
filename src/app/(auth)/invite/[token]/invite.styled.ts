import styled from "@emotion/styled";

// ─── "Accepting as {email}" info banner shown to signed-in users ─────────────

export const AcceptingAsBanner = styled.div`
  background: rgba(94, 207, 234, 0.08);
  border: 1px solid rgba(94, 207, 234, 0.2);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
`;

// ─── Large centered icon wrapper for invite hero ─────────────────────────────

export const InviteIconWrap = styled.div`
  text-align: center;
  margin-bottom: 12px;
  font-size: 48px;
  color: #5ecfea;
`;

// ─── Footer divider row (sign-in prompt) ─────────────────────────────────────

export const SignInPromptRow = styled.div`
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
`;
