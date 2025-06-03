/**
 * 转义括号处理
 */
export function escapeBrackets(text: string): string {
  const pattern = /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\]|\\\((.*?)\\\)/g;
  return text.replace(pattern, (match, codeBlock, squareBracket, roundBracket) => {
    if (codeBlock) {
      return codeBlock;
    } else if (squareBracket) {
      return `\n$$\n${squareBracket}\n$$\n`;
    } else if (roundBracket) {
      return `$${roundBracket}$`;
    }
    return match;
  });
}

/**
 * 移除SVG空行处理
 */
export function removeSvgEmptyLines(text: string): string {
  const svgPattern = /(<svg[\s\S]*?<\/svg>)/g;
  return text.replace(svgPattern, (svgMatch) => {
    return svgMatch
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n');
  });
}

/**
 * 转换数学公式格式
 */
export function convertMathFormula(text: string): string {
  // 将 \[ \] 转换为 $$ $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n');

  // 将 \( \) 转换为 $ $
  text = text.replace(/\\\((.*?)\\\)/g, '$$$1$$');

  return text;
}
