// CSS module ambient declaration so `import './foo.css'` type-checks.
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
