import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// docs/ のMarkdownを画面に出すための最小限の見た目
const components: Components = {
  h1: (props) => <h1 className="mb-4 text-2xl font-bold" {...props} />,
  h2: (props) => <h2 className="mt-8 mb-3 text-xl font-bold" {...props} />,
  p: (props) => <p className="my-3 leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-3 list-disc space-y-1 pl-6" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal space-y-1 pl-6" {...props} />,
  blockquote: (props) => (
    <blockquote className="my-4 rounded-lg bg-muted px-4 py-1 text-sm" {...props} />
  ),
  hr: () => <hr className="my-6" />,
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border bg-muted px-2 py-1 text-left font-semibold" {...props} />,
  td: (props) => <td className="border px-2 py-1 align-top" {...props} />,
  a: (props) => <a className="text-primary underline" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
