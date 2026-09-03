import styled from "@emotion/styled";

export const PageContainer = styled.main`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px;

  @media (max-width: 767px) {
    padding: 18px 14px;
  }
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;

  h2 { margin: 0 0 4px !important; }
  p { margin: 0 !important; }
`;

export const PageIntro = styled.div`
  min-width: 0;
`;

export const Surface = styled.section<{ $compact?: boolean }>`
  background: ${({ theme }) => theme.bg.surface};
  border: 1px solid ${({ theme }) => theme.border.subtle};
  border-radius: 14px;
  padding: ${({ $compact }) => ($compact ? "0 20px" : "24px")};
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.05);

  & + & { margin-top: 18px; }

  @media (max-width: 767px) {
    padding: ${({ $compact }) => ($compact ? "0 14px" : "20px 16px")};
  }
`;

export const Hero = styled(Surface)`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  gap: 32px;
  align-items: center;
  background: linear-gradient(135deg, ${({ theme }) => theme.bg.surface} 20%, rgba(37, 211, 102, 0.1));

  @media (max-width: 800px) { grid-template-columns: 1fr; }
`;

export const HeroIcon = styled.div`
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: #128c4a;
  background: rgba(37, 211, 102, 0.14);
  font-size: 32px;
  margin-bottom: 18px;
`;

export const ProgressPanel = styled.div`
  padding: 22px;
  border-radius: 12px;
  background: ${({ theme }) => theme.bg.layout};
  border: 1px solid ${({ theme }) => theme.border.subtle};
`;

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;

  @media (max-width: 800px) { grid-template-columns: 1fr; }
`;

export const CapabilityCard = styled.div`
  padding: 18px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.border.subtle};
  background: ${({ theme }) => theme.bg.layout};

  .anticon { color: #128c4a; font-size: 22px; margin-bottom: 12px; }
  h5 { margin: 0 0 6px !important; }
  p { margin: 0 !important; }
`;

export const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 18px;

  @media (max-width: 800px) { grid-template-columns: 1fr; }
`;

export const RequirementList = styled.ul`
  padding-left: 20px;
  margin: 14px 0 0;
  color: ${({ theme }) => theme.text.secondary};
  li + li { margin-top: 10px; }
`;

