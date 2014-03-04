var spawn = require('child_process').spawn;
var cproc = require('child_process');
var spawn = cproc.spawn;
var exec = cproc.exec;
var fs = require('fs');
var crypto = require("crypto");

function tok_defhdlr(t) {
  return t;
}

function esc(str) {
  var s = "'";
  
  li = "[".charCodeAt(0);
  ri = "]".charCodeAt(0);
  di = "$".charCodeAt(0);
  
  for (var i=0; i<str.length; i++) {
    var c = str[i];
    if (c == "[") {
      s += "'+String.fromCharCode("+li+")+'";
    } else if (c == "]") {
      s += "'+String.fromCharCode("+ri+")+'";
    } else if (c == "$") {
      s += "'+String.fromCharCode("+di+")+'";
    } else if (c == "\\") { // && i < str.length-1 && str[i+1] == "\\") {
      s += c + "\\";
    } else {
      s += c;
    }
  }
  
  s += "'";
  
  return s;
}

function NlyCC(ldef, pdef, outprefix="build/out") {
  tokens = ldef.tokens;
  
  var assoc = [];
  if (ldef.assoc)
    assoc = ldef.assoc;
  
  var res = {};
  var tokfuncs = {};
  
  var keys = Object.keys(ldef);
  
  //console.log(String.prototype.startsWith)
  //console.log(keys);
  for (var i=0; i<keys.length; i++) {
    var k = keys[i];
    var v = ldef[k];
    
    if (k[0] == "t" && k[1] == "_") {
      var pat = undefined;
      var t = k.slice(2, k.length);
      
      if (!tokens.has(t)) {
        throw new NError("Undefined token " + k);
      }
      
      if (typeof v == "string" || (v instanceof String)) {
        pat = v;
      } if (typeof(v) == "function") {
        pat = v.__doc__;
        tokfuncs[t] = v;
      }
      
      if (pat == undefined) {
        throw new NError("Undefined pattern " + k);
      }
      
      pat = String(pat);
      pat = pat.replace(/\n/g, "\\n");
      pat = pat.replace(/\r/g, "\\r");
      pat = pat.replace(/\t/g, "\\t");

      res[t] = pat;
    }
  }
  
  var out = "/~\n generated parse grammar\n~/\n\n";
  var tabs = "    ";
  
  var tokens2 = [];
  var map = {};
  
  for (var i=0; i<assoc.length; i++) {
    var item = assoc[i];
    
    var prec = item[0];
    for (var j=1; j<item.length; j++) {
      map[item[j]] = [prec, i];
      tokens2.push(item[j]);
    }
  }
  
  for (var t in tokens) {
    if (!(t in map))
      tokens2.push(t);
  }
  
  tokens = new set(tokens2);
  
  out += "\n/~\n tokens (which aren't processed with jscc)\n~/\n";
  for (var t in tokens) {
    var l = ""
    
    if (t in res)
      pat = res[t];
    else
      pat = "";
    
    if (t in map) {
      var prec = map[t][0];
      l += prec;
    }
    
    l += tabs + "'"  + "'" + tabs + t;
    l += "\n;";
    
    out += l + "\n";
  }
  
  out += "##\n\n/~\n the grammar\n~/\n";

  var keys = Object.keys(pdef);
  var prods = [];
  var max_order = 0;
  var min_order = 0;
  
  for (var i=0; i<keys.length; i++) {
    var k = keys[i];
    var v = pdef[k];
    if (!(k[0] == "p" && k[1] == "_")) continue;
    var p = k.slice(2, k.length);
    
    var g = v.__doc__;
    if (g == undefined) {
      throw new NError("No docstring in production " + k + ".");
    }
    
    var j = g.search(/ /);
    var msg = "Grammar productions must be of form: int_priority grammar: \n" + g;
    if (j < 0)
      throw new NError("a: "+msg);
    
    var order = g.slice(0, j).trim();
    if (parseInt(order) == undefined) {
      throw new NError("b: "+msg);
    }
    
    order = parseInt(order);
    
    if (order in prods)
      throw new NError("Duplicated production priority for production " + k)
    
    max_order = Math.max(max_order, order);
    min_order = Math.min(min_order, order);
    
    prods[order] = new NlyProdFunc(order, g.slice(j, g.length).trim(), v, k);
  }
  
  max_order++;
  
  //un-sparsify, if necessary
  var prods2 = [];
  var j = 0;
  for (var i=min_order; i<max_order; i++) {
    if (prods[i]) {
      prods2[j++] = prods[i];
    }
  }
  prods2.length = j;
  prods = prods2;
  
  function col(n) {
    var c = "";
    for (var i=0; i<n; i++) c += " ";
  
    return c;
  }
  for (var i=0; i<prods.length; i++) {
    var p = prods[i]
    var l = ""
    
    var gs = p.grammar.split("\n");
    for (var j=0; j<gs.length; j++) {
      var g = gs[j].trim();
      var ts = j==0 ? tabs : col(gs[0].trim().length);
      var k = p.name;
      l += ts + g + " [* %%=do_prod('" + k + "', vstack, pop_tab[act][1]) *]\n";
    }
    l += col(gs[0].trim().length) + ";"
    
    out += l + "\n";
  }
  header = "[*\n";
  
  /*generate parseutils lexer*/
  header = "[*\n";
  header += """;
  var symbolmap = {};
  for (var i=0; i<labels.length; i++) {
    symbolmap[labels[i]] = i;
  }
  
  """
  
  header += "var tokdef = ["
  i = 0;
  for (var t in tokens) {
    if (i > 0)
      header += ",\n  ";
    else
      header += "\n  ";
    
    header += "new PUTL.tokdef(" + '"' + t + '"';
    if (t in res)
      header += ", new RegExp(" + esc(res[t]) + ")";
    if (t in tokfuncs)
      header += ", " + tokfuncs[t];
    header += ")";
    
    i++;
  }
  header += "];\n"
  
  header += "var TheLexer = new PUTL.lexer(tokdef);\n";
  
  header += "\n*]\n";
  out = header + out;
  
  footer = """
    nla_main(__##PREFIX##parse);
  """
  //out += "\n[*\n" + footer + "\n*]\n";
  
  //XXX console.log(out);
  
  var hash = crypto.createHash("sha1");
  hash.update(out, "ascii");
  hash = hash.digest("base64").trim();
  var do_rebuild = true;
  
  if (fs.existsSync("_out.par.hash")) {
    var buf1 = new Buffer(500);
    
    var file2 = fs.openSync("_out.par.hash", "r");
    var ret = fs.readSync(file2, buf1, 0, hash.length*4);
    
    fs.closeSync(file2);
    var hash2 = buf1.slice(0, ret).toString();
    if (hash2 == hash) {
      do_rebuild = false;
    }
  }
  
  do_rebuild = do_rebuild || !fs.existsSync("build/_cc.js");
  console.log(do_rebuild);
  
  var buf = new Buffer(out.length);
  buf.write(out, 0, out.length, "ascii");
  var file = fs.openSync("_out.par", "w");
  fs.writeSync(file, out, 0);
  fs.closeSync(file);
  
  function file_read(path) {
    var buf = new Buffer(256);
    var file = fs.openSync(path, "r");
    var s = ""
    var read = 0;
    
    do {
      read = fs.readSync(file, buf, 0, 256);
      s += buf.slice(0, read).toString();
    } while (read != 0);
    fs.close(file);
    
    return s;
  }
  
  function finish() {
    var s1 = file_read("build/driver_header.js");
    var s2 = file_read("build/_cc.js");
    var s3 = file_read("build/parsemain.js");
    
    var file = fs.openSync("build/cc.js", "w");
    
    fs.writeSync(file, s1+s2+s3, 0);
    fs.closeSync(file);
  }
  
  if (do_rebuild) {
    console.log("Regenerating LALR tables...");
    exec("jscc _out.par -t build/driver_parseutils.js_ -o build/_cc.js", undefined, function(error, stdout, stderr) {
      if (!error) {
        file = fs.openSync("_out.par.hash", "w");
        fs.writeSync(file, hash, 0);
        fs.closeSync(file);
        
        finish();
      } else {
        console.log(stdout.toString());
        console.log(stderr.toString());
        console.log("Parse generation failed.");
      }
    });
  } else {
    finish();
  }
}
