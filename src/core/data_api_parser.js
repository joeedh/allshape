"use strict";

function apiparser() {
  function tk(name, re, func) {
    return new PUTL.tokdef(name, re, func);
  }
  
  var tokens = [
    tk("ID", /[a-zA-Z_]+[a-zA-Z$0-9_]*/),
    tk("LBRACKET", /\{/),
    tk("EQUALS", /=/),
    tk("RBRACKET", /}/),
    tk("COLON", /:/),
    tk("LSBRACKET", /\[/),
    tk("RSBRACKET", /\]/),
    tk("LPARAM", /\(/),
    tk("RPARAM", /\)/),
    tk("COMMA", /,/),
    tk("DOT", /\./),
    tk("NUM", /[0-9]+/),
    tk("SEMI", /;/),
    tk("NEWLINE", /\n/, function(t) {
      t.lexer.lineno += 1;
    }),
    tk("SPACE", / |\t/, function(t) {
      //throw out non-newline whitespace tokens
    })
  ];

  function errfunc(lexer) {
    return true; //throw error
  }
  
  var lex = new PUTL.lexer(tokens, errfunc)
  var parser = new PUTL.parser(lex);
  
  function numnode(n) {
    return {type : "NUM", val : n, children : []};
  }
  function valnode(id) {
    return {type : "ID", val : id, children : []};
  }
  function varnode(id, val=undefined) {
    var cs = val != undefined ? [val] : [];
    return {type : "VAR", val : id, children : cs};
  }
  function bnode(l, r, op) {
    return {type : op, children : [l, r]};
  }
  
  function funcnode(name_expr, args) {
    var cs = [name_expr];
    for (var i=0; i<args.length; i++) {
      cs.push(args[i]);
    }
    
    return {type : "FUNC", children : cs};
  }
  
  function arrnode(name_expr, ref) {
    return {type : "ARRAY", children : [name_expr, ref]};
  }
  
  function p_FuncCall(p, name_expr) {
    var args = [];
    
    //node format : children : [name_expr, args]
    //func_call : LPARAM arg_list RPARAM
    //arg_list  : ID 
    //          | ID EQUALS EXPR
    //          | arg_list COMMA ID
    //          | arg_list COMMA ID EQUALS EXPR
    
    p.expect("LPARAM");
    
    while (!p.at_end()) {
      var t = p.peeknext();
      if (t == undefined) {
        p.error(t, "func");
      }
      
      if (t.type == "RPARAM") {
        p.next();
        break;
      }
      
      var arg = p.expect("ID");
      
      var val = undefined;
      if (p.peeknext().type == "EQUALS") {
        p.next();
        var val = p_Expr(p, ",)");
      }
      
      args.push(varnode(arg, val));
      
      var t = p.next();
      console.log("=>", t.type, t.value);
      
      if (t.type == "RPARAM") {
        break;
      } else if (t.type != "COMMA") {
        p.error(t, "invalid token in function call");
      }
    }
    
    var ret = funcnode(name_expr, args);
    return ret;
  }  
  
  function p_Expr(p, end_chars="") {
    console.log(p);
    
    var t = p.peeknext();
    var ast;
    
    if (t.type == "ID")
      ast = valnode(p.expect("ID"));
    else if (t.type == "NUM")
      ast = numnode(p.expect("NUM"));
    else
      p.error("Invalid token " + t.type + "'" + t.value + "'");
    
    while (!p.at_end()) {
      var t = p.peeknext();
      
      if (t.type == "DOT") {
        p.next();
        var id = p.expect("ID", "expected id after '.'");
        
        ast = bnode(ast, valnode(id), ".");
      } else if (t.type == "LPARAM") {
        ast = p_FuncCall(p, ast);
      } else if (t.type == "LSBRACKET") {
        p.expect("LSBRACKET");
        var val = p_Expr(p, "]");
        p.expect("RSBRACKET");
        
        ast = arrnode(ast, val);
      } else if (end_chars.contains(t.value)) {
        return ast;
      } else {
        p.error(t, "Invalid token " + t.type + "'" + t.value + "'"); 
      }
    }
    
    return ast;
  }
   
  parser.start = p_Expr;
  return parser;
}

function fmt_ast(ast, tlevel=0) {
  var s = "";
  var t = ""
  
  for (var i=0; i<tlevel; i++) t += " ";
  
  s += t + ast["type"]
  if (ast["type"] == "ID" || ast["type"] == "VAR" || ast["type"] == "NUM")
    s += " " + ast["val"];
  s += " {\n"
  
  var cs = ast["children"];
  if (cs == undefined) cs = [];
  for (var i=0; i<cs.length; i++) {
    s += fmt_ast(cs[i], tlevel+1);
  }
  
  s += t + "}\n";
  
  return s;
}

function test_dapi_parser() {
  var p = apiparser();
  
  var tst = "view3d.test[0]";
  var tree = p.parse(tst);
  console.log(fmt_ast(tree));
  
  console.log(g_app_state.api.get_prop_new(new Context(), tst));
}