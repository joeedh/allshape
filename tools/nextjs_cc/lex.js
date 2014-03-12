var reserved_tokens = new set([
  "if", "else", "function", "for", "var", "class",
  "throw", "raise", "try", "catch", "while", "do",
  "return", "yield", "continue", "break", "case",
  "switch", "default"]);

function thelexer() {
  var tokens = new set([
    "WS",
    "ID",
    "PLUS",
    "MINUS",
    "MULTIPLY",
    "DIVIDE",
    "ASSIGN",
    "SEMI",
    "COMMA",
    "COLON",
    "LSBRACKET",
    "RSBRACKET",
    "LPARAM",
    "RPARAM",
    "LBRACKET",
    "RBRACKET",
    "STRLIT",
    "REGEXPR",
    "NUMBER",
    "DOT"
  ]);

  class Tokens extends NlyTokenDef {
    static t_ID(t) {
      "[a-zA-Z$_]+[a-zA-Z_0-9]*"
      
      if (reserved_tokens.has(t.value))
        t.type = t.value.toUpperCase();
      
      return t;
    }
    static t_WS(t) {
      "[ \n\r\t]+"
      
      for (var i=0; i<t.value.length; i++) {
        if (t.value[i] == "\n") {
          t.lexer.lineno++;
        }
      }
      return undefined;
    }
  }
  
  var reserved_tokens_upper = list(reserved_tokens);
  for (var i=0; i<reserved_tokens_upper.length; i++) {
    reserved_tokens_upper[i] = reserved_tokens_upper[i].toUpperCase();
  }
  
  Tokens.t_PLUS = "\\+";
  Tokens.t_MINUS = "\\-";
  Tokens.t_DIVIDE = "\\/";
  Tokens.t_MULTIPLY = "\\*";
  Tokens.t_ASSIGN = "=";
  Tokens.t_SEMI = ";";
  Tokens.t_COMMA = ",";
  Tokens.t_COLON = ":";
  Tokens.t_LSBRACKET = "\\[";
  Tokens.t_RSBRACKET = "\\]";
  Tokens.t_LPARAM = "\\(";
  Tokens.t_RPARAM = "\\)";
  Tokens.t_LBRACKET = "{";
  Tokens.t_RBRACKET = "}";
  Tokens.t_STRLIT = "nothing";
  Tokens.t_REGEXPR = "/bleh/bleh";
  Tokens.t_NUMBER = "[0-9]+";
  Tokens.t_DOT = "\\.";
  
  Tokens.tokens = tokens.union(reserved_tokens_upper);
  Tokens.assoc = [
    ["<", "PLUS", "MINUS"],
    ["<", "MULTIPLY", "DIVIDE"],
    ["<", "DOT"],
    ["<", "ASSIGN"]
  ];
 
  return Tokens;
}
