import "@emotion/react";

declare module "@emotion/react" {
  export interface Theme {
    isDark: boolean;
    bg: {
      layout:  string;
      surface: string;
      subtle:  string;
      muted:   string;
    };
    text: {
      primary:   string;
      secondary: string;
      muted:     string;
      faint:     string;
    };
    border: {
      primary: string;
      subtle:  string;
    };
  }
}
