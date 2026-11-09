declare module '*.hbs' {
  const template: (data?: object) => string;
  export default template;
}

declare module '*.css';

declare const __SERVICE_WORKER_ENABLED__: boolean;
