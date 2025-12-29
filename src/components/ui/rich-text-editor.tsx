'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[200px] p-4 text-white',
      },
    },
  })

  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
      <div className="bg-white/5 border-b border-white/10 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors ${
            editor.isActive('bold') ? 'bg-white/10 text-white' : ''
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors ${
            editor.isActive('italic') ? 'bg-white/10 text-white' : ''
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px bg-white/10 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-white/10 text-white' : ''
          }`}
          title="Heading"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors ${
            editor.isActive('bulletList') ? 'bg-white/10 text-white' : ''
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors ${
            editor.isActive('orderedList') ? 'bg-white/10 text-white' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors ${
            editor.isActive('blockquote') ? 'bg-white/10 text-white' : ''
          }`}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <div className="w-px bg-white/10 mx-1" />
        <button
          type="button"
          onClick={addLink}
          className={`p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors ${
            editor.isActive('link') ? 'bg-white/10 text-white' : ''
          }`}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <div className="w-px bg-white/10 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
