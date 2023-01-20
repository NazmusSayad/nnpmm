export const getUpdatedData = (fileData, found, cb) => {
  const newEntries = [
    { start: 0, end: 0, value: '', rawValue: '', filename: '' },
    ...found.sort((a, b) => a.start - b.start),
  ]

  const chunks = newEntries.map((node, i, arr) => {
    const nextNode = arr[i + 1]
    const nodeEnd = node.end
    const nextNodeEnd = nextNode ? nextNode.start : Infinity
    const str = fileData.slice(nodeEnd, nextNodeEnd)

    if (!nextNode) return str
    return [str, `"${cb(nextNode) ?? nextNode.value}"`]
  })

  return chunks.flat().join('')
}

export const isOkString = (node) => {
  return node && node.type === 'StringLiteral' && node.value.startsWith('.')
}

export const parseString = (str) => ({
  start: str.start,
  end: str.end,
  value: str.value,
  rawValue: str.extra.raw,
  filename: str.loc.filename,
})
