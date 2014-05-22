
class _Rd {

}

var t_REGEXPR = gen_re();
var strlit_val = new StringLit("");
var start_q = 0;
var t_mlstr_ignore = "";

var _rd = new _Rd();
_rd.i = 0;
_rd.st = "";

function gen_re() {
  function expect(s) {
    if ([".", "+", "(", "[", "]", ")", "*", "^", "\\"].has(s)) {
      s = "\\" + s;
    }
    s = "(((?<!\\)|(?<=\\\\))" + s + ")";
    return s;
  }

  function consume_ifnot(s) {
    var s2 = "[^";
    if (s instanceof Array) {
      for (var s3 in pythonic_iter(s)) {
        if (["+", "\\", "(", "[", "]", ")", "*", "^"].has(s3)) {
          var s3 = "\\" + s3;
        }
        s2 += s3;
      }
    } else {
      if (["+", "\\", "(", "[", "]", ")", "*", "^"].has(s)) {
        s = "\\" + s;
      }
      s2 += s;
    }

    s2 += "]";
    return "%s" % s2;
  }

  function NonTerm(extra=[]) {
    return consume_ifnot(["\n", "\r"] + extra);
  }

  function Char() {
    return "(%s|%s|%s)" % [NonTerm(["\\", "/", "["]), BackSeq(), Class()];
  }

  function FirstChar() {
    return "(%s|%s|%s)" % [NonTerm(["*", "\\", "/", "["]), BackSeq(), Class()];
  }

  function empty() {
    return "(\b|\B)";
  }

  function Chars() {
    return "(%s)*" % Char();
  }

  function BackSeq() {
    return expect("\\") + NonTerm();
  }

  function ClassChar() {
    return "(%s|%s)" % [NonTerm(["]", "\\"]), BackSeq()];
  }

  function ClassChars() {
    return ClassChar() + "+";
  }

  function Class() {
    return "(" + expect("[") + ClassChars() + expect("]") + ")";
  }

  function Flags() {
    return "[a-zA-Z]*";
  }

  function Body() {
    return "(" + FirstChar() + Chars() + ")";
  }

  function Lit() {
    function g(c, n) {
      s = "(?<=[([\=,]";
      if (n!=0) {
        s += "[%s]{%d}" % [c, n];
      }
      s += ")";
      return s;
    }

    var pats = [g(" ", 0), g(" ", 1), g(" ", 2), g(" ", 3), g(" ", 4), g(" ", 5), g(" ", 6), g("\t", 1), g("\t", 2), g("\t", 3), g("\t", 4), g("\t", 5)];
    var pat = "";
    for (var item in enumerate(pats)) {
      var i = item[0];
      var p = item[1];
      
      if (i!=0) {
        pat += "|";
      }
      pat += p;
    }
    pat = "((" + pat + ")" + expect("/") + ")";
    pat += Body() + expect("/");
    pat = pat + "(?!/)" + Flags();
    return pat;
  }

  return Lit();
}
var re1 = gen_re();

class StringLit extends String {
}

var res = new set(["if", "then", "else", "while", "do", "function", "var", "in", "for", "new", "return", "continue", "break", "throw", "try", "catch", "delete", "typeof", "instanceof", "with", "switch", "case", "default", "yield", "struct", "float", "int", "const", "short", "double", "char", "unsigned", "signed", "variable", "template", "byte", "global", "inferred", "native", "class", "extends", "static", "typed", "finally", "get", "set"]);
var reserved = {};

for (var k in res) {
  reserved[k] = k.toUpperCase();
}
var reserved_lst = [];
for (var k in res) {
  reserved_lst.push(k.toUpperCase());
}

var states = [["incomment", "exclusive"], ["instr", "exclusive"], ["mlstr", "exclusive"]];
var tokens = new set([
  "MLSTRLIT", "COMMENT", "INC", "DEC", "GTHAN", 
  "LTHAN", "EQUAL", "MOD", "GTHANEQ", "LTHANEQ", 
  "NUMBER", "PLUS", "MINUS", "TIMES", "DIVIDE", 
  "LPAREN", "RPAREN", "SEMI", "LBRACKET", "RBRACKET", 
  "BNEGATE", "BAND", "BOR", "BXOR", "LAND", 
  "COND_DOT", "LOR", "NOT", "ID", "NOTEQUAL", 
  "STRINGLIT", "REGEXPR", "ASSIGN", "DOT", 
  "BACKSLASH", "EMPTYLINE", "COMMA", "LSBRACKET", 
  "RSBRACKET", "COLON", "QEST", "SLASHR", "OPENCOM",
   "CLOSECOM", "ALL", "newline", "LSHIFT", "RSHIFT",
   "LLSHIFT", "RRSHIFT", "ASSIGNPLUS", "ASSIGNMINUS",
   "ASSIGNDIVIDE", "ASSIGNTIMES", "ASSIGNBOR", "ASSIGNBAND",
   "ASSIGNBXOR", "VAR_TYPE_PREC", "ASSIGNLSHIFT", 
   "ASSIGNRSHIFT", "ASSIGNRRSHIFT", "ASSIGNLLSHIFT", 
   "BITINV", "NOTEQUAL_STRICT", "EQUAL_STRICT", "TLTHAN", 
   "TGTHAN"]).union(new set(reserved_lst));


function thelexer() {  
  var in_lthan_test = false;
  var tgthan_lexposes = set();
  var gthan_ignores = set();
  var lthan_ignores = set();
  var comment_str = "";
  var comment_startline = -1;
  var t_ignore = " \t";
  var t_instr_ignore = "";
  var t_incomment_ignore = "";
  
  function ml_escape(s) {
    i = 0;
    var lastc = 0;
    var nexts = false;
    var excl = ["\"", "'"];
    s2 = "";
    while (i<len(s)) {
      var c = s[i];
      if (nexts) {
        nexts = false;
        s2 += c;
        i += 1;
        continue;
      }
      if (c=="\\") {
        nexts = true;
        s2 += c;
        i += 1;
        continue;
      }
      if (["'", "\""].has(c)) {
        s2 += "\\";
      }
      if (c=="\n") {
        c = "\n";
      }
      if (c=="\r") {
        c = "\r";
      }
      s2 += c;
      i += 1;
    }

    return s2;
  }

  class Tokens {
    static t_GTHANEQ(t) {
      "\>=";
      return t;
    }

    static t_LTHANEQ(t) {
      "\<=";
      return t;
    }

    static t_GTHAN(t) {
      "\>";
      global in_lthan_test, gthan_ignores;
      if (in_lthan_test) {
        t.type = "TGTHAN";
        return t;
      }
      if (gthan_ignores.has(t.lexpos)) {
        return;
      }
      if (tgthan_lexposes.has(t.lexpos)) {
        t.type = "TGTHAN";
        return t;
      }
      if (t.lexpos<len(t.lexer.lexdata) - 2 && t.lexer.lexdata[t.lexpos + 1]==">" && t.lexer.lexdata[t.lexpos + 2]=="=") {
        t.type = "ASSIGNRSHIFT";
        t.value = ">>=";
        gthan_ignores.add(t.lexpos + 1);
        gthan_ignores.add(t.lexpos + 2);
        t.lexer.lexpos += 2;
      } else if (t.lexpos<len(t.lexer.lexdata) - 3 && t.lexer.lexdata[t.lexpos + 1]==">" && t.lexer.lexdata[t.lexpos + 2]==">" && t.lexer.lexdata[t.lexpos + 3]=="=") {
        t.type = "ASSIGNRRSHIFT";
        t.value = ">>>=";
        gthan_ignores.add(t.lexpos + 1);
        gthan_ignores.add(t.lexpos + 2);
        t.lexer.lexpos += 3;
      } else if (t.lexpos<len(t.lexer.lexdata) - 2 && t.lexer.lexdata[t.lexpos + 1]==">" && t.lexer.lexdata[t.lexpos + 2]==">") {
        t.type = "RRSHIFT";
        t.value = ">>>";
        gthan_ignores.add(t.lexpos + 1);
        gthan_ignores.add(t.lexpos + 2);
      } else if (t.lexpos<len(t.lexer.lexdata) - 1 && t.lexer.lexdata[t.lexpos + 1]==">") {
        t.type = "RSHIFT";
        t.value = ">>";
        gthan_ignores.add(t.lexpos + 1);
      }
      return t;
    }

    static t_LTHAN(t) {
      "\<";
      global in_lthan_test, lthan_ignores;
      if (!glob.g_lex_templates) {
        return t;
      }
      if (in_lthan_test) {
        t.type = "TLTHAN";
        return t;
      }
      if (lthan_ignores.has(t.lexpos)) {
        return;
      }
      in_lthan_test = true;
      
      
      var s = "";
      var lvl = 0;
      var i = t.lexpos;
      var lexdata = t.lexer.lexdata;
      var ret = None;
      while (i<len(lexdata)) {
        if (lexdata[i]==">") {
          lvl += 1;
        } else if (lexdata[i]=="<") {
          lvl -= 1;
        }
        if (["\n", "\r", ";"].has(lexdata[i])) {
          ret = false;
          break;
        }
        s += lexdata[i];
        if (lvl==0) {
          break;
        }
        i += 1;
      }

      if (ret!=false) {
        ret = template_validate(s);
        if (ret) {
          t.type = "TLTHAN";
          tgthan_lexposes.add(i);
        }
      }
      if (ret!=true) {
        if (t.lexpos<len(t.lexer.lexdata) - 2 && t.lexer.lexdata[t.lexpos + 1]=="<" && t.lexer.lexdata[t.lexpos + 2]=="=") {
          t.type = "ASSIGNLSHIFT";
          t.value = "<<=";
          lthan_ignores.add(t.lexpos + 1);
          lthan_ignores.add(t.lexpos + 2);
          t.lexer.lexpos += 2;
        } else if (t.lexpos<len(t.lexer.lexdata) - 3 && t.lexer.lexdata[t.lexpos + 1]=="<" && t.lexer.lexdata[t.lexpos + 2]=="<" && t.lexer.lexdata[t.lexpos + 3]=="=") {
          t.type = "ASSIGNLSHIFT";
          t.value = "<<<=";
          lthan_ignores.add(t.lexpos + 1);
          lthan_ignores.add(t.lexpos + 2);
          lthan_ignores.add(t.lexpos + 3);
          t.lexer.lexpos += 3;
        } else if (t.lexpos<len(t.lexer.lexdata) - 2 && t.lexer.lexdata[t.lexpos + 1]=="<" && t.lexer.lexdata[t.lexpos + 2]=="<") {
          t.type = "LLSHIFT";
          t.value = "<<<";
          lthan_ignores.add(t.lexpos + 1);
          lthan_ignores.add(t.lexpos + 2);
        } else if (t.lexpos<len(t.lexer.lexdata) - 1 && t.lexer.lexdata[t.lexpos + 1]=="<") {
          t.type = "LSHIFT";
          t.value = "<<";
          lthan_ignores.add(t.lexpos + 1);
        }
      }
      if (glob.g_production_debug) {
        print(ret, "|", s);
        print("\n");
      }
      in_lthan_test = false;
      return t;
    }

    static t_MLSTRLIT(t) {
      '"""'
      
      global strlit_val;
      t.lexer.push_state("mlstr");
      strlit_val = new StringLit("");
    }

    static t_STRINGLIT(t) {
      "\"|\'";
      global strlit_val, start_q;
      start_q = t.value;
      strlit_val = new StringLit("");
      t.lexer.push_state("instr");
    }

    static t_SLASHR(t) {
      "\r+";
    }

    static t_OPENCOM(t) {
      "/\*";
      global comment_str, comment_startline;
      t.lexer.push_state("incomment");
      comment_str = t.value;
      comment_startline = t.lexer.lineno!=-1 ? t.lexer.lineno : 0;
    }

    static t_COMMENT(t) {
      "//.*\n";
      global comment_startline, comment_str;
      t.lexer.comment = t.value;
      t.lexer.comments[t.lexer.comment_id] = [t.lexer.comment, t.lexer.lineno];
      t.lexer.comment_id += 1;
      t.lexer.lineno += t.value.count("\n");
    }

    static t_ID(t) {
      "[$a-zA-Z_]+[$a-zA-Z0-9_]*";
      
      t.type = reserved.get(t.value, "ID");
      return t;
    }

    static t_NUMBER(t) {
      "(0x[0-9a-fA-F]+)|((\\d|(\\d\.\\d+))+(e|e\\-|e\\+)\\d+)|(\\d*\\.\\d+)|(\\d+)";
      t.strval = t.value;
      
      if (!t.value.has(".") && !t.value.has("e") && !t.value.has("x")) {
        t.value = parseInt(t.value);
      } else if (t.value.has("x")) {
        t.value = parseInt(t.value);
      } else t.value = parseFloat(t.value);
      return t;
    }

    static t_EMPTYLINE(t) {
      "\n[ \t]\n";
      t.lexer.lineno += t.value.count("\n");
    }

    static t_newline(t) {
      "\n+";
      t.lexer.lineno += len(t.value);
    }

    /*static t_error(t) {
      print("Illegal character '%s'" % t.value[0]);
      t.lexer.skip(1);
    }*/
  }
    
  class State_mlstr {
    static t_mlstr_MLSTRLIT(t) {
      "\"\"\"";
      global strlit_val;
      if (t.value.has("\\")) {
        strlit_val = new StringLit(strlit_val + t.value);
        return;
      }
      var str = new StringLit(ml_escape(strlit_val));
      t.strval = t.value;
      t.value = new StringLit("\"" + str + "\"");
      t.type = "STRINGLIT";
      t.lexer.pop_state();
      return t;
    }

    static t_mlstr_ALL(t) {
      "(.|[\n\r\v])";
      global strlit_val;
      if (1) {
        strlit_val = new StringLit(strlit_val + t.value);
      }
      t.lexer.lineno += t.value.count("\n");
    }
    /*
    static t_mlstr_error(t) {
      print("Illegal character in multiline string '%s'" % t.value[0]);
      t.lexer.skip(1);
    }
    */
  }
  class State_incomment {
      static t_incomment_CLOSECOM(t) {
      "\*/";
      global comment_str;
      comment_str += t.value;
      t.lexer.pop_state();
      i = t.lexer.lexpos;
      var ld = t.lexer.lexdata;
      while (i<len(ld)) {
        if (![" ", "\t", "\n", "\r"].has(ld[i])) {
          break;
        }
        if (ld[i]=="\n") {
          comment_str += "\n";
          break;
        }
        i += 1;
      }

      t.lexer.comment = comment_str;
      t.lexer.comments[t.lexer.comment_id] = [comment_str, comment_startline];
      t.lexer.comment_id += 1;
    }

    static t_incomment_ALL(t) {
      "[^/\*]+";
      global comment_str;
      comment_str += t.value;
      t.lexer.lineno += t.value.count("\n");
    }

    /*static t_incomment_error(t) {
      t.lexer.skip(1);
    }*/
  }
  
  class State_instr {
      static t_instr_STRINGLIT(t) {
      '"|\'|\\\"|\\\'';
      
      global strlit_val, start_q;
      if (t.value.has("\\") || !t.value.has(start_q)) {
        strlit_val = new StringLit(strlit_val + t.value);
        return;
      }
      t.lexer.pop_state();
      t.strval = t.value;
      t.value = new StringLit(start_q + strlit_val + start_q);
      return t;
    }

    static t_instr_ALL(t) {
      "([^\"\']|(\\\'\\\"))+";
      global strlit_val;
      strlit_val = new StringLit(strlit_val + t.value);
      t.lexer.lineno += t.value.has("\n");
    }
    /*
    static t_instr_error(t) {
      print("Illegal character in string '%s'" % t.value[0]);
      t.lexer.skip(1);
    }
    */
  }
  
  Tokens.t_ASSIGNPLUS = "\\+=";
  Tokens.t_ASSIGNMINUS = "-=";
  Tokens.t_ASSIGNDIVIDE = "/=";
  Tokens.t_ASSIGNTIMES = "\\*=";
  Tokens.t_ASSIGNBOR = "\\|=";
  Tokens.t_ASSIGNBAND = "\\&=";
  Tokens.t_ASSIGNBXOR = "\\^=";
  Tokens.t_ASSIGNLSHIFT = "ENOTHINGNODTHINGNOGTHINGNOHTHING";
  Tokens.t_ASSIGNRSHIFT = "ENOTHINGNODTHINGNOGTHINGNOHTHINGs";
  Tokens.t_ASSIGNLLSHIFT = "ENOTHINGNODTHINGNOGTHINGNOHTHING";
  Tokens.t_ASSIGNRRSHIFT = "ENOTHINGNODTHINGNOGTHINGNOHTHING";
  Tokens.t_COND_DOT = "\\?\\.";
  Tokens.t_BITINV = "\\~";
  Tokens.t_LSHIFT = "\\^\\^";
  Tokens.t_RSHIFT = "\\^\\^";
  Tokens.t_LLSHIFT = "\\^\\^\\^";
  Tokens.t_RRSHIFT = "\\>\\>\\>";
  Tokens.t_BAND = "&";
  Tokens.t_BOR = "\\|";
  Tokens.t_BXOR = "\\^";
  Tokens.t_LAND = "&&";
  Tokens.t_LOR = "\\|\\|";
  Tokens.t_NOT = "\\!";
  Tokens.t_NOTEQUAL_STRICT = "\\!==";
  Tokens.t_EQUAL_STRICT = "===";
  Tokens.t_EQUAL = "==";
  Tokens.t_NOTEQUAL = "\\!=";
  Tokens.t_INC = "\\+\\+";
  Tokens.t_DEC = "--";
  Tokens.t_PLUS = "\\+";
  Tokens.t_MINUS = "-";
  Tokens.t_TIMES = "\\*";
  Tokens.t_DIVIDE = "/";
  Tokens.t_MOD = "%";
  Tokens.t_LPAREN = "\\(";
  Tokens.t_RPAREN = "\\)";
  Tokens.t_LBRACKET = "\\{";
  Tokens.t_RBRACKET = "\\}";
  Tokens.t_ASSIGN = "=";
  Tokens.t_DOT = "\\.";
  Tokens.t_BACKSLASH = "\\\\";
  Tokens.t_COMMA = ",";
  Tokens.t_LSBRACKET = "\\[";
  Tokens.t_RSBRACKET = "\\]";
  Tokens.t_COLON = "\\:";
  Tokens.t_SEMI = ";";
  Tokens.t_QEST = "\\?";
  Tokens.t_ALL = "ENOTHINGNODTHINGNOGTHINGNOHTHING";
  Tokens.t_TGTHAN = "sdfwetreENOTHINGNODTHINGNOGTHINGNOHTHINGytery";
  
  Tokens.tokens = tokens
  Tokens.instr_state = State_instr
  Tokens.incomment_state = State_incomment
  Tokens.state_mlstr = State_mlstr
  
  return Tokens;
}
