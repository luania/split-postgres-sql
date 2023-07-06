function isControlCharacter(code: number) {
  return code <= 0x001f;
}

function isAsciiPunctuation(code: number) {
  return (
    (code >= 0x0020 && code <= 0x002f) ||
    (code >= 0x003a && code <= 0x0040) ||
    (code >= 0x005b && code <= 0x0060) ||
    (code >= 0x007b && code <= 0x007e)
  );
}

function isNumber(code: number) {
  return code >= 0x0030 && code <= 0x0039;
}

function isValidIdentifierBegin(code: number) {
  return (
    !isControlCharacter(code) &&
    !isNumber(code) &&
    // unquoted identifier can start with _
    (!isAsciiPunctuation(code) || code === 0x005f)
  );
}

function isValidIdentifierSubsequentChar(code: number) {
  // $ can be used as the subsequent character of unquoted identifier
  return (
    !isControlCharacter(code) &&
    // _ and $ can be used as subsequent characters of unquoted identifier
    (!isAsciiPunctuation(code) || code === 0x005f || code === 0x0024)
  );
}

export default function splitPgSql(sqlText: string) {
  const sqlTextLength = sqlText.length;
  const pureSqls = [];

  let currentPureSql = "";
  let pureSqlStart = 0;

  let cNestLevel;
  let inBackslash;

  let lineCommentEndFound = false;

  /*
    \n -> 10
    " -> 34
    $ -> 36
    ' -> 39
    * -> 42
    - -> 45
    / -> 47
    ; -> 59
    \ -> 92
  */
  for (let i = 0; i < sqlTextLength; ) {
    switch (sqlText.charCodeAt(i)) {
      case 47:
        if (sqlText.charCodeAt(i + 1) === 42) {
          /* slash-star comment nest level */
          currentPureSql += sqlText.substring(pureSqlStart, i);
          cNestLevel = 1;
          i += 2;
          while (i < sqlTextLength) {
            if (
              sqlText.charCodeAt(i) === 47 &&
              sqlText.charCodeAt(i + 1) === 42
            ) {
              cNestLevel++;
              i += 2;
            } else if (
              sqlText.charCodeAt(i) === 42 &&
              sqlText.charCodeAt(i + 1) === 47
            ) {
              i += 2;
              if (cNestLevel === 1) {
                break;
              } else {
                cNestLevel--;
              }
            } else {
              i++;
            }
          }
          pureSqlStart = i;
        } else {
          i++;
        }
        break;
      case 45:
        if (sqlText.charCodeAt(i + 1) === 45) {
          // line comment start
          currentPureSql += sqlText.substring(pureSqlStart, i);
          i += 2;
          lineCommentEndFound = false;
          while (i < sqlTextLength) {
            if (sqlText.charCodeAt(i) === 10) {
              lineCommentEndFound = true;
              break;
            }
            i++;
          }
          pureSqlStart = i;
          if (lineCommentEndFound) {
            i++;
          }
        } else {
          i++;
        }
        break;
      case 34:
        // in Double Quoted
        inBackslash = false;
        i++;
        while (i < sqlTextLength) {
          if (!inBackslash && sqlText.charCodeAt(i) === 34) {
            i++;
            break;
          } else {
            inBackslash = sqlText.charCodeAt(i) === 92 && !inBackslash;
            i++;
          }
        }
        break;
      case 36:
        // in Dollar Quoted
        i++;
        let tagHeadName = "";
        while (i < sqlTextLength) {
          const code = sqlText.charCodeAt(i);
          if (code === 36) {
            // 已读到完整的 tag 头
            i++;
            while (i < sqlTextLength) {
              const code2 = sqlText.charCodeAt(i);
              if (code2 === 36) {
                let tagTailFound = false;
                // 读到 $, 开始寻找 tag 尾
                i++;
                let matchPosition = 0;
                while (i < sqlTextLength) {
                  const code3 = sqlText.charCodeAt(i);
                  if (code3 === 36) {
                    // 再次读到 $
                    if (matchPosition === tagHeadName.length) {
                      // tag 尾匹配成功
                      tagTailFound = true;
                      i++;
                      break;
                    } else {
                      matchPosition = 0;
                      break;
                    }
                  } else {
                    if (code3 === tagHeadName.charCodeAt(matchPosition)) {
                      i++;
                      matchPosition++;
                    } else {
                      matchPosition = 0;
                      break;
                    }
                  }
                }
                if (tagTailFound) {
                  // $$ 表达式已结束
                  break;
                }
              } else {
                i++;
              }
            }
            break;
          } else if (isValidIdentifierBegin(code)) {
            tagHeadName += sqlText[i];
            i++;
            while (i < sqlTextLength) {
              const code2 = sqlText.charCodeAt(i);
              if (isValidIdentifierSubsequentChar(code2) && code2 !== 36) {
                tagHeadName += sqlText[i];
                i++;
              } else {
                break;
              }
            }
          } else {
            break;
          }
        }
        break;
      case 39:
        // in Single Quoted
        inBackslash = false;
        i++;
        while (i < sqlTextLength) {
          if (!inBackslash && sqlText.charCodeAt(i) === 39) {
            i++;
            break;
          } else {
            inBackslash = sqlText.charCodeAt(i) === 92 && !inBackslash;
          }
          i++;
        }
        break;
      case 59:
        i++;
        currentPureSql += sqlText.substring(pureSqlStart, i);
        pureSqls.push(currentPureSql.trimStart());
        currentPureSql = "";
        pureSqlStart = i;
        break;
      default:
        if (isValidIdentifierBegin(sqlText.charCodeAt(i))) {
          // unquoted identifier start
          i++;
          while (i < sqlTextLength) {
            if (isValidIdentifierSubsequentChar(sqlText.charCodeAt(i))) {
              i++;
            } else {
              break;
            }
          }
        } else {
          i++;
        }
        break;
    }
  }

  if (pureSqlStart < sqlTextLength) {
    currentPureSql += sqlText.substring(pureSqlStart, sqlTextLength);
  }
  const left = currentPureSql.trim();
  if (left.length > 0) {
    pureSqls.push(left);
  }
  return {
    pureSqls,
  };
}
