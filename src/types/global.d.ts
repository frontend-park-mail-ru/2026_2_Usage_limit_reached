declare module '*.hbs' {
  const template: (data?: object) => string;
  export default template;
}

declare module '*.css';
