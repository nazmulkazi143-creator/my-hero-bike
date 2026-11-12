const esc = (v: string | number | undefined | null) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/** UTF-8 with BOM so Excel opens Bangla text and ৳ correctly. */
export function toCsv(headers: string[], rows: (string | number | undefined | null)[][]) {
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n'
}

export function download(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const h = (v: string | number | undefined | null) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** HTML-table workbook with .xls extension: opens directly in Excel / LibreOffice / Google Sheets. */
export function toXls(headers: string[], rows: (string | number | undefined | null)[][]) {
  const cell = (v: string | number | undefined | null, tag: 'th' | 'td') =>
    typeof v === 'number' ? `<${tag} x:num>${v}</${tag}>` : `<${tag}>${h(v)}</${tag}>`
  return (
    '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">' +
    `<tr>${headers.map((x) => cell(x, 'th')).join('')}</tr>` +
    rows.map((r) => `<tr>${r.map((x) => cell(x, 'td')).join('')}</tr>`).join('') +
    '</table></body></html>'
  )
}
