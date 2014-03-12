function to_la(info, lex, eof) {
  try { 
    lex.lexpos = info.offset;

    var tok = lex.next();
    
    if (tok == undefined) {
      info.att = ""
      return {match : eof, tok : undefined};
    }
    
    info.att = tok.value;
    if (info.offset == lex.lexpos)
      info.offset = lex.lexpos;// + 1;
    else
      info.offset = lex.lexpos;
    
    var match = info.symbolmap[tok.type];
    
    //console.log(match, info.att, info.offset);
    
    tok.symbol = match;
    
    return {match : match, tok : tok};
  } catch (err) {
    if (err instanceof PUTLParseError) {
      info.att = "";
      return {match : -1, tok : undefined};
    } else {
      print_stack(err);
      throw err;
    }
  }
}

var _the_parser = theparser();

function do_prod(name, stack, len) {
  //console.log("----------->yay, production");
  var prod = new NlyProd(1+len);
  prod[0] = undefined;
  //console.log(stack, "<---", i);
  for (var i=0; i<len; i++) {
    prod[i+1] = stack[stack.length-len+i];
  }
  
  _the_parser[name](prod);
  
  if (1) {
    //console.log(len, prod);
    //console.log("result :", prod[0]);
  }
  return prod[0];
}

function tostr(obj) {
  var visit = [];
  var prop = "__tostr_tag";
  
  function recurse(obj, tlevel)
  {
    if (obj == undefined)
      return "undefined";
    
    var tab = ""
    for (var i=0; i<tlevel; i++) {
      tab += "  ";
    }
    
    if (typeof obj == "object") {
      if (prop in obj) return "[Circular]";
      
      visit.push(obj)
      obj[prop] = 1;
    }
    
    if (typeof obj == "string" || obj instanceof String) {
      return '"'+obj+'"';
    } else if (typeof obj == "number" || obj instanceof Number) {
      return obj.toString();
    } else if (typeof obj == "boolean" || obj instanceof Boolean) {
      return obj.toString();
    } else if (typeof obj == "array" || (obj instanceof Array)) {
      var s = "["
      
      var do_ml = false;
      var strs = []
      for (var i=0; i<obj.length; i++) {
        var s2 = recurse(obj[i], tlevel+1);
        if (s2.length > 7) {
          do_ml = true;
        }
        strs.push(s2);
      }
      
      for (var i=0; i<strs.length; i++) {
        if (i != 0) 
          s += (do_ml ? ",\n  "+tab : ", ");
        
        s += strs[i];
      }
      
      s += do_ml ? "\n"+tab+"]" : "]"
      return s;
    } else {
      s = tab + "[OBJECT"
      s += "}\n"
      
      return s;
    }
  }
  
  var ret = recurse(obj, 0);
  
  for (var i=0; i<visit.length; i++) {
    delete visit[i][prop];
  }
  
  return ret;
}

var __dbg_withparsetree = false;
var __dbg_withtrace = false;
var __dbg_withstepbystep = false;
