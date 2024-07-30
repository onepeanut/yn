/* eslint-disable no-template-curly-in-string */
import type * as Monaco from 'monaco-editor'
import type { Ctx, Plugin } from '@fe/context'
import type { SimpleCompletionItem } from '@fe/services/editor'

const surroundingPairs = [
  { open: '{', close: '}' },
  { open: '[', close: ']' },
  { open: '(', close: ')' },
  { open: '<', close: '>' },
  { open: '`', close: '`' },
  { open: "'", close: "'" },
  { open: '"', close: '"' },
  { open: '*', close: '*' },
  { open: '_', close: '_' },
  { open: '=', close: '=' },
  { open: '~', close: '~' },
  { open: '^', close: '^' },
  { open: '#', close: '#' },
  { open: '$', close: '$' },
  { open: '《', close: '》' },
  { open: '〈', close: '〉' },
  { open: '【', close: '】' },
  { open: '「', close: '」' },
  { open: '（', close: '）' },
  { open: '“', close: '”' },
]

const autoClosingPairs = [
  { open: '{', close: '}' },
  { open: '[', close: ']' },
  { open: '(', close: ')' },
  { open: '《', close: '》' },
  { open: '〈', close: '〉' },
  { open: '【', close: '】' },
  { open: '「', close: '」' },
  { open: '（', close: '）' },
]

class MdSyntaxCompletionProvider implements Monaco.languages.CompletionItemProvider {
  triggerCharacters = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'.split('')

  private readonly monaco: typeof Monaco
  private readonly ctx: Ctx

  private readonly pairsMap = new Map(surroundingPairs.map(x => [x.open, x.close]))

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
  }

  private getRangeColumnOffset (type: 'suffix' | 'prefix', line: string, insertText: string) {
    if (!line || !insertText) {
      return 0
    }

    insertText = insertText.replace(/\$\{[0-9]+:([^}]+)?\}/g, '$1')
      .replace(/\$\[0-9]/g, '')

    const len = Math.min(line.length, insertText.length)

    if (type === 'suffix') {
      for (let i = len; i >= 0; i--) {
        if (line.startsWith(insertText.slice(insertText.length - i))) {
          return i
        }
      }
    } else {
      for (let i = len; i >= 0; i--) {
        if (line.endsWith(insertText.slice(0, i))) {
          return i
        }
      }
    }

    return 0
  }

  private async provideSelectionCompletionItems (selection: Monaco.Selection): Promise<Monaco.languages.CompletionList | undefined> {
    const items = this.ctx.editor.getSimpleCompletionItems().filter(item => item.insertText.includes('${TM_SELECTED_TEXT}'))

    const result: Monaco.languages.CompletionItem[] = items.map((item, i) => {
      const range = new this.monaco.Range(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn,
      )

      return {
        label: { label: item.label },
        kind: item.kind || this.monaco.languages.CompletionItemKind.Keyword,
        insertText: item.insertText,
        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: i.toString().padStart(7),
        detail: item.detail,
      }
    })

    return { suggestions: result }
  }

  public async provideCompletionItems (model: Monaco.editor.IModel, position: Monaco.Position): Promise<Monaco.languages.CompletionList | undefined> {
    const selection = this.ctx.editor.getEditor().getSelection()!
    if (!selection.isEmpty()) {
      return this.provideSelectionCompletionItems(selection)
    }

    const line = model.getLineContent(position.lineNumber)
    const cursor = position.column - 1
    const linePrefixText = line.slice(0, cursor)
    const lineSuffixText = line.slice(cursor)

    let startColumn = linePrefixText.lastIndexOf(' ') + 2
    if (startColumn === position.column) {
      startColumn = 0
    }

    const items = this.ctx.editor.getSimpleCompletionItems().filter((item) => {
      return !item.block || startColumn === 1
    })

    const result: Monaco.languages.CompletionItem[] = items.map((item, i) => {
      let columnOffset = this.getRangeColumnOffset('suffix', lineSuffixText, item.insertText)
      if (columnOffset === 0) {
        // remove auto surrounding pairs
        columnOffset = this.pairsMap.get(line.charAt(cursor - 1)) === line.charAt(cursor) ? 1 : 0
      }

      const range = new this.monaco.Range(
        position.lineNumber,
        startColumn,
        position.lineNumber,
        position.column + columnOffset,
      )

      return {
        label: { label: item.label },
        kind: item.kind || this.monaco.languages.CompletionItemKind.Keyword,
        insertText: item.insertText,
        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: i.toString().padStart(7),
        detail: item.detail,
        command: item.command,
      }
    })

    return { suggestions: result }
  }
}

export default {
  name: 'editor-md-syntax',
  register: (ctx) => {
    ctx.editor.whenEditorReady().then(({ monaco }) => {
      monaco.languages.registerCompletionItemProvider(
        'markdown',
        new MdSyntaxCompletionProvider(monaco, ctx)
      )

      monaco.languages.setLanguageConfiguration('markdown', {
        surroundingPairs,
        autoClosingPairs,
        onEnterRules: [
          { beforeText: /^\s*> .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '> ' } },
          { beforeText: /^\s*\+ \[ \] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '+ [ ] ' } },
          { beforeText: /^\s*- \[ \] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '- [ ] ' } },
          { beforeText: /^\s*\* \[ \] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '* [ ] ' } },
          { beforeText: /^\s*\+ \[x\] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '+ [ ] ' } },
          { beforeText: /^\s*- \[x\] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '- [ ] ' } },
          { beforeText: /^\s*\* \[x\] .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '* [ ] ' } },
          { beforeText: /^\s*\+ .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '+ ' } },
          { beforeText: /^\s*- .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '- ' } },
          { beforeText: /^\s*\* .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '* ' } },
          { beforeText: /^\s*\d+\. .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '1. ' } },
          { beforeText: /^\s*\d+\) .*$/, action: { indentAction: monaco.languages.IndentAction.None, appendText: '1) ' } },
        ]
      })
    })

    function buildTableCompletionItems (): SimpleCompletionItem[] {
      const editor = ctx.editor.getEditor()
      const position = editor.getPosition()
      const prev2Lines = ((position && position.lineNumber > 2) ? ctx.editor.getLinesContent(position.lineNumber - 2, position.lineNumber - 1) : '').split('\n')
      const tableCols = prev2Lines.reduce((acc, line) => {
        const cols = line.split('|').length
        return acc > 0 ? (acc === cols ? cols : -1) : cols
      }, 0)

      const currentLine = position ? ctx.editor.getLineContent(position.lineNumber) : ''

      let i = 1
      return /\|[^|]+/.test(currentLine) ? [] : tableCols > 1
        ? [
            { label: '/ ||| Table Row', insertText: prev2Lines[0].replace(/[^|]+/g, () => ` \${${i++}:--} `).trim() + '\n', block: true }
          ]
        : [
            { label: '/ ||| Table', insertText: '| ${1:TH} | ${2:TH} | ${3:TH} |\n| -- | -- | -- |\n| TD | TD | TD |', block: true },
            { label: '/ ||| Small Table', insertText: '| ${1:TH} | ${2:TH} | ${3:TH} |\n| -- | -- | -- |\n| TD | TD | TD |\n{.small}', block: true },
          ]
    }

    ctx.editor.tapSimpleCompletionItems(items => {
      items.unshift(
        { label: '/ ![]() Image', insertText: '![${2:Img}]($1)' },
        { label: '/ []() Link', insertText: '[${2:Link}]($1)' },
        { label: '/ # Head 1', insertText: '# $1', block: true },
        { label: '/ ## Head 2', insertText: '## $1', block: true },
        { label: '/ ### Head 3', insertText: '### $1', block: true },
        { label: '/ #### Head 4', insertText: '#### $1', block: true },
        { label: '/ ##### Head 5', insertText: '##### $1', block: true },
        { label: '/ ###### Head 6', insertText: '###### $1', block: true },
        { label: '/ + List', insertText: '+ ' },
        { label: '/ - List', insertText: '- ' },
        { label: '/ > Blockquote', insertText: '> ' },
        { label: '/ ` Code', insertText: '`$1`' },
        { label: '/ * Italic', insertText: '*$1*' },
        { label: '/ _ Italic', insertText: '_$1_' },
        { label: '/ ~ Sub', insertText: '~$1~' },
        { label: '/ ^ Sup', insertText: '^$1^' },
        { label: '/ ** Bold', insertText: '**$1**' },
        { label: '/ __ Bold', insertText: '__$1__' },
        { label: '/ ~~ Delete', insertText: '~~$1~~' },
        { label: '/ == Mark', insertText: '==$1==' },
        { label: '/ ``` Fence', insertText: '```$1\n$2\n```\n', block: true },
        ...buildTableCompletionItems(),
        { label: '/ --- Horizontal Line', insertText: '---\n', block: true },
        { label: '/ + [ ] TODO List', insertText: '+ [ ] ' },
        { label: '/ - [ ] TODO List', insertText: '- [ ] ' },
      )
    })

    ctx.editor.tapMarkdownMonarchLanguage(mdLanguage => {
      mdLanguage.tokenizer.root.unshift(
        [/^\s*[+\-*] \[[ xX]\]\s/, 'keyword'],
        [/==\S.*\S?==/, 'keyword'],
        [/(\[\[)([^[\]]+)(\]\])/, ['keyword.predefined', 'string', 'keyword.predefined']],
        [/~\S[^~]*\S?~/, 'string'],
        [/\^\S[^^]*\S?\^/, 'string'],
      )
    })
  }
} as Plugin
