var reserved_tokens = new set(["if", "else", "function", "for"]);

function thelexer() {
  var tokens = new set([
    "PLUS",
    "MINUS",
    "ID",
    "MULTIPLY",
    "DIVIDE",
    "EQUALS",
    "WS",
    "SEMI"
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
  
  Tokens.t_PLUS = "\\+"
  Tokens.t_MINUS = "\\-"
  Tokens.t_DIVIDE = "\\/"
  Tokens.t_MULTIPLY = "\\*"
  Tokens.t_EQUALS = "="
  Tokens.t_SEMI = ";"
  
  Tokens.tokens = tokens.union(reserved_tokens_upper);
  Tokens.assoc = [
    ["<", "PLUS", "MINUS"],
    ["<", "MULTIPLY", "DIVIDE"],
    ["<", "EQUALS"]
  ];
 
  return Tokens;
}
