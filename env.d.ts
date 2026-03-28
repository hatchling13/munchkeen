declare global {
  interface ImportMeta {
    env: {
      MODE?: string;
      NODE_ENV: "production" | "development";
      PROD: boolean;
      DEV: boolean;
      SSR?: boolean;
    };
  }
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "production" | "development";
      PROD: boolean;
      DEV: boolean;
    }
  }
}

declare module "*?raw" {
  const content: string;
  export default content;
}

export {};
