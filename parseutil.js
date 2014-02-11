function PUTL() {
}

PUTL.token = function(type, val, lexpos, lineno, lexer, parser) {
  this.type = type;
  this.val = val;
  this.lexpos = lexpos;
  this.lineno = lineno;
  this.lexer = lexer;
  this.parser = parser;
}
create_prototype(PUTL.token);

//func is optional
PUTL.tokdef = function(name, regexpr, func) {
  this.name = name;
  this.re = regexpr
  this.func = func
}
create_prototype(PUTL.tokdef);

function PUTLParseError(msg) {
  Error.call(this);
}
inherit(PUTLParseError, Error);

PUTL.lexer = function(tokens) {
  this.tokdef = tokens;
  this.tokens = new GArray();
  this.lexpos = 0;
  this.lexdata = "";
  this.lineno = 0;
}

create_prototype(PUTL.lexer);
PUTL.lexer.input = function(str) {
  this.lexdata = str;
  this.lexpos = 0;
  this.lineno = 0;
  this.tokens = new GArray();
}

PUTIL.lexer.prototype.error = function() {
  console.log("Syntax error near line " + this.lineno);
  var next = Math.min(this.lexpos+8, this.lexdata.length);
  
  console.log("  " + this.lexdata.slice(this.lexpos, next));
  
  throw new PUTLParseError("Parse error");
}

PUTL.lexer.prototype.next = function() {
  var ts = this.tokdef;
  var tlen = ts.length;
  
  var lexdata = this.lexdata.slice(this.lexpos, this.lexdata.length);
  
  var results = []
  
  for (var i=0; i<tlen; i++) {
    var t = ts[i];
    
    var res = t.re.match(lexdata);
    if (res.index == 0) {
      results.push([t, res]);
    }
  }
  
  var max_res = 0;
  var theres = undefined;
  for (var i=0; i<results.length; i++) {
    if (res[1][0].length > max_res) {
      theres = res;
      max_res = res[1][0].length;
    }
  }
  
  if (theres == undefined) {
    this.error();
    return;
  }
}

var t = PUTL.tokdef;

var tokens = [
  t("PLUS", /\+/),
  t("MINUS", /\-/),
  t("TIMES", /[\*]/),
  t("DIVIDE", /[\/]/)
];

