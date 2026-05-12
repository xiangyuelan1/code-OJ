import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Upload, Image, Bold, Italic, Code, List, Link } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function MarkdownEditor({ value, onChange, placeholder = '请输入内容，支持 Markdown 语法...', minHeight = 300 }: MarkdownEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        return data.data.url;
      }
      alert(data.error?.message || '图片上传失败');
      return null;
    } catch {
      alert('图片上传失败');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const insertAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    onChange(before + text + after);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const url = await uploadImage(file);
        if (url) {
          insertAtCursor(`![${file.name}](${url})`);
        }
        return;
      }
    }
  }, [uploadImage, insertAtCursor]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const url = await uploadImage(file);
        if (url) {
          insertAtCursor(`![${file.name}](${url})\n`);
        }
      }
    }
  }, [uploadImage, insertAtCursor]);

  const handleFileSelect = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files) return;
      for (const file of Array.from(input.files)) {
        const url = await uploadImage(file);
        if (url) {
          insertAtCursor(`![${file.name}](${url})\n`);
        }
      }
    };
    input.click();
  }, [uploadImage, insertAtCursor]);

  const toolbarActions = [
    { icon: Bold, label: '粗体', action: () => insertAtCursor('**粗体文本**') },
    { icon: Italic, label: '斜体', action: () => insertAtCursor('*斜体文本*') },
    { icon: Code, label: '代码', action: () => insertAtCursor('`\n代码\n`') },
    { icon: List, label: '列表', action: () => insertAtCursor('- 列表项\n') },
    { icon: Link, label: '链接', action: () => insertAtCursor('[链接文本](url)') },
    { icon: Image, label: '图片', action: handleFileSelect },
  ];

  return (
    <div className="border border-slate-600 rounded-lg overflow-hidden bg-slate-800">
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-700 border-b border-slate-600">
        {toolbarActions.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className="p-1.5 rounded hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
            title={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <button
          type="button"
          onClick={handleFileSelect}
          disabled={uploading}
          className="ml-2 flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
        >
          <Upload className="h-3 w-3" />
          {uploading ? '上传中...' : '上传图片'}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={`px-3 py-1 rounded text-xs transition-colors ${preview ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300 hover:text-white'}`}
        >
          {preview ? '编辑' : '预览'}
        </button>
      </div>

      {preview ? (
        <div className="p-4 prose prose-invert max-w-none" style={{ minHeight }}>
          <MarkdownRenderer content={value} />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          placeholder={placeholder}
          className="w-full p-4 bg-slate-800 text-slate-200 placeholder-slate-500 resize-y focus:outline-none font-mono text-sm"
          style={{ minHeight }}
        />
      )}

      <div className="px-3 py-1.5 bg-slate-700 border-t border-slate-600 text-xs text-slate-400">
        支持粘贴/拖拽图片自动上传 · Markdown 语法
      </div>
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content) {
    return <span className="text-slate-500">暂无内容</span>;
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
      {content}
    </ReactMarkdown>
  );
}
