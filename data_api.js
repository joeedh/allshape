DataPathTypes = {PROP: 0, STRUCT: 1};

TinyParserError = {"TinyParserError":0};

function DataPath(prop, name, path, dest_is_prop, use_path) { //dest_is_prop is optional, defaults to false
  if (dest_is_prop == undefined)
    dest_is_prop = false;
  if (use_path == undefined) 
    use_path = true;
  
  this.dest_is_prop = dest_is_prop
  this.type = dest_is_prop ? DataPathTypes.PROP : DataPathTypes.STRUCT;
  
  this.name = name
  this.data = prop;
  this.path = path;
  this.update = undefined : Function;
  
  this.use_path = use_path;
}

create_prototype(DataPath);

function DataStructIter(s) {
  this.strct = s;
  this.cur = 0;
  
  this.__iterator__ = function() { return this; }
  
  this.reset = function() {
    this.cur = 0;
  }
  
  this.next = function() {
    if (this.cur >= this.strct.paths.length) {
      this.cur = 0;
      throw StopIteration;
    }
    
    var p = this.strct.paths[this.cur++];
    p.data.path = p.path;
    
    return p;
  }
}

function DataStruct(paths) {
  this.paths = new GArray(paths);
  this.pathmap = {}
  
  for (var p in this.paths) {
    this.pathmap[p.name] = p
    if (p.type == DataPathTypes.PROP) {
      p.data.path = p.path;
    }
  }
  
  this.type = PropTypes.STRUCT;
}

create_prototype(DataStruct);
DataStruct.prototype.__iterator__ = function() {
  return new DataStructIter(this);
}

DataStruct.prototype.add = function(p) {
  this.pathmap[p.name] = p;
  this.paths.push(p);
}

DataStruct.prototype.replace = function(p) {
  for (var p2 in this.paths) {
    if (p2.name == p.name) {
      this.paths.remove(p2);
      delete this.pathmap[p2.name];
      break;
    }
  }
  
  this.add(p);
}


function TinyParser(data) {
  this.toks = []
  this.split_chars = new set([",", "=", "(", ")", ".", "$", "[", "]"])
  this.ws = new set([" ", "\n", "\t", "\r"])
  this.data = data
  
  this.cur = 0;
  
  this.reset = function(data) {
    this.cur = 0;
    this.toks = []
    this.data = data;
    this.lex();
  }
  
  this.lex = function(data) {
    if (data == undefined)
      data = this.data;
    
    var toks = this.toks
    tok = undefined
    
    var i = 0;
    while (i < data.length) {
      c = data[i];
      if (this.ws.has(c)) {
        if (tok != undefined && tok[1] == "WORD") {
          tok = undefined;
        }
      } else if (this.split_chars.has(c)) {
        toks.push([c, "TOKEN"]);
        tok = undefined
      } else {
        if (tok == undefined) {
          tok = ["", "WORD"]
          toks.push(tok)
        }
        tok[0] += c
      }
      
      i += 1;
    }
  }
  
  this.next = function() {
    this.cur++;
    if (this.cur-1 < this.toks.length) {
      return this.toks[this.cur-1]
    }
    
    return undefined;
  }
  
  this.peek = function() {
    if (this.cur < this.toks.length) {
      return this.toks[this.cur]
    }
    
    return undefined;
  }
  
  this.expect = function(type, val) {
    if (this.peek()[1] != type) {
      console.log("Unexpected token " + this.peek[0] + ", expected " + (type=="WORD"?"WORD":val));
      console.trace();
      throw TinyParserError;
    }
    
    if (type == "TOKEN" && this.peek()[0] != val) {
      console.log("Unexpected token " + this.peek[0]);
      console.trace();
      throw TinyParserError;
    }
    
    return this.next()[0];
  }  
} TinyParser;

function DataAPI(appstate) {
  this.appstate = appstate;
  
  this.ops = data_ops_list;
  this.parser = new TinyParser();
  
  this.root_struct = ContextStruct;
  
  this.parse_call_line_intern = function(ctx, line) {
    p = this.parser;
    
    function parse_argval(p) {
      var val = p.expect("WORD")
      var args;
      
      if (p.peek()[0] == "(") {
        args = parse_call(p);
      }
      
      return [val, args];
    }
    
    function parse_arg(p) {
      var arg = p.expect("WORD");
      var val = undefined;
      
      if (p.peek()[0] == "=") {
        p.next(); 
        val = parse_argval(p);  
      }
      
      return [arg, val];
    }
    
    function parse_call(p) {
      p.expect("TOKEN", "(");
      var args=[];
      var t = undefined
      
      while (p.peek() != undefined) {
        if (p.peek()[1] == "WORD") {
          args.push(parse_arg(p));
        } else if (p.peek()[0] == ",") {
          p.next();
        } else {
          p.expect("TOKEN", ")");
          break;
        }
      }
      
      return args;
    }
    
    if (line.contains("(")==0)
      throw TinyParserError;
      
    path = line.slice(0, line.find("("))
    line = line.slice(line.find("("), line.length)
    
    p.reset(line);
    call = parse_call(p)
    
    path = path.trimRight().trimLeft();
    return [path, call];
  }
  
  this.parse_call_line = function(ctx, line) {
    try {
      var ret = this.parse_call_line_intern(ctx, line);
      return ret;
    } catch (error) {
      if (error != TinyParserError) {
        throw error;
      } else {
        console.log("Could not parse tool call line " + line + "!");
      }
    }
  }
  
  this.do_mesh_selected = function(ctx, args) {
    if (args == undefined || args.length == 0 || args[0].length != 2) 
    {
      console.log("Invalid arguments to do_mesh_selected()")
      throw TinyParserError();
    }
    
    var val = args[0][0]
    var typemask = 0
    for (var i=0; i<val.length; i++) {
      c = val[i].toLowerCase()
      if (c == "v") {
        typemask |= MeshTypes.VERT;
      } else if (c == "e") {
        typemask |= MeshTypes.EDGE;
      } else if (c == "f") {
        typemask |= MeshTypes.FACE;
      } else {
        console.log("Invalid arguments to do_mesh_select(): " + c);
        throw TinyParserError();
      }
    }
    
    return ctx.mesh.ops.gen_select_iter(typemask);
  }
  
  this.prepare_args = function(ctx, call) { //args is private/optional
    var args = {};
    for (var i=0; i<call.length; i++) {
      var a = call[i];
      
      if (a[1] != undefined) {
        if ("do_" + a[1][0] in this) {
          args[a[0]] = this["do_" + a[1][0]](ctx, a[1][1]);
        } else {
          console.log("Invalid initializer" + a[1][1]);
        }
      } else {
        console.log("Error: No parameter for undefined argument " + a[0]);
        throw TinyParserError;
      }
    }

    return args;
  }
  
  this.get_op_intern = function(ctx, str) {
    var ret = this.parse_call_line(ctx, str);
    if (ret == undefined)
      return;
    
    var call = ret[1];
    var path = ret[0];
    
    if (!(path in this.ops)) {
      console.log("Invalid api call " + str + "!");
      return;
    }
    
    var args = this.prepare_args(ctx, call);
    var op = this.ops[path](ctx, args)

    return op;
  }
  
  this.get_op_keyhandler = function(ctx, str) {
    function find_hotkey_recurse(element) {
      if (element == undefined)
        return undefined;
      
      console.log("----", element);
      if (element.keymap != null) {
        console.log("----", element.keymap.op_map);
        var handler = element.keymap.get_tool_handler(str);
        if (handler != undefined)
          return handler;
      }
      
      if (element instanceof UIFrame && element.active != undefined) 
      {
        return find_hotkey_recurse(element.active);
      }
    }
    
    return find_hotkey_recurse(ctx.screen);
  }
  
  this.call_op = function(ctx, str) {
    try {
      var op = this.get_op_intern(ctx, str);
      this.appstate.toolstack.exec_tool(op);
    } catch (error) {
      if (error != TinyParserError) {
        throw error;
      } else {
        console.log("Error calling " + str);
        console.trace();
      }
    }
  }
  
  this.get_op_uiname = function(ctx, str) {
    try {
      var op = this.get_op_intern(ctx, str);
      return op.uiname;
    } catch (error) {
      if (error != TinyParserError) {
        throw error;
      } else {
        console.log("Error calling " + str);
        console.trace();
      }
    }
  }
  
  this.get_op = function(ctx, str) {
    try {
      var op = this.get_op_intern(ctx, str);
      return op;
    } catch (error) {
      if (error != TinyParserError) {
        throw error;
      } else {
        console.log("Error calling " + str);
        console.trace();
      }
    }
  }
  
  this.resolve_path_intern = function(ctx, str) {
    var p = this.parser
    p.reset(str)
    
    var path = []
    var arritem = undefined;
    while (p.peek() != undefined) {
      word = p.expect("WORD");
      
      if (p.peek() != undefined && p.peek()[0] == "[") {
        p.expect("TOKEN", "[");
        arritem = Number(p.expect("WORD"));
        p.expect("TOKEN", "]");
        if (p.peek() != undefined) {
          console.log("Error: expected EOF after array/obj lookup");
          throw TinyParserError;
        }
      } else if (p.peek() != undefined) {
        p.expect("TOKEN", ".");
      }
      
      path.push(word);
    }
  
    var s = this.root_struct;
    var path2 = ""
    
    var path3;
    for (var i=0; i<path.length; i++) {
      if (i > 0) {
        if (s.type != DataPathTypes.STRUCT) {
          console.log(path)
          console.log("Invalid . lookup operator");
          throw TinyParserError;
        }
        s = s.data;
      }
      
      if (!(path[i] in s.pathmap)) {
        console.log("Invalid property/struct " + str);
        throw TinyParserError;
      }
      
      s = s.pathmap[path[i]];
      
      path3 = path2;
      if (i > 0) path2 += "."
      path2 += s.path
    }
    
    if (arritem != undefined) {
      path3 = path2;
      path2 = arritem;
      
      return [s, path2, path3, true];
    }
    
    return [s, path2, path3, false];
  }
  
  this.resolve_path = function(ctx, str) {
    try {
      return this.resolve_path_intern(ctx, str);
    } catch (error) {
      if (error != TinyParserError) {
        throw error;
      } else {
        console.log("Could not resolve path " + str);
        return undefined;
      }
    }
  }
  
  this.get_struct = function(ctx, str) {
    var ret = this.resolve_path(ctx, str)
    if (ret == undefined) return ret;
    
    return ret[0].data;
  }
  
  this.get_prop_meta = function(ctx, str) {
    var ret = this.resolve_path(ctx, str)
    if (ret == undefined) return ret;
    
    return ret[0].data;
  }
  
  this.set_prop = function(ctx, str, value) {
    var ret = this.resolve_path(ctx, str);

    if (ret == undefined) 
      return;
    
    var p = ret[0];
    p.ctx = p.data.ctx = ctx;
    p.data.path = ret[1];
    
    if (p.data.type == PropTypes.INT)
      value = Math.floor(value);
    
    if (p.use_path) {
      var value2 = value;
      if (p.data.type == PropTypes.ENUM) {
        value2 = p.data.values[value2];
      } 
      
      obj = eval(ret[2]);
      if (p.data.type == PropTypes.VEC3 && ret[3]) {
        //eval("obj." + ret[1] + " = value2;");
        obj[ret[1]] = value2;
      } else if (p.data.type == PropTypes.FLAG && ret[3]) {
        if (value2) {
          value2 = eval(ret[2]) | Number(ret[1]);
        } else {
          value2 = eval(ret[2]) & ~Number(ret[1]);
        }
        eval(ret[2] + " = value2;");
      } else {
        eval("obj." + p.path + " = value2;");
      }
    }
    
    if (p.data.type == PropTypes.VEC3 && ret[3]) {
      var vec = p.data.data
      vec[ret[1]] = value;
      
      p.data.set_data(vec);
    } else if (p.data.type == PropTypes.FLAG && ret[3]) {
      if (value) {
        value = p.data.data | Number(ret[1]);
      } else {
        value = p.data.data & ~Number(ret[1]);
      }
      
      p.data.set_data(value);
    }
    else {
      p.data.set_data(value);
    }
    
    if (p.update != undefined) {
      p.update(p);
    }
  }
  
  this.get_prop = function(ctx, str) {
    var ret = this.resolve_path(ctx, str);
    
    if (ret == undefined) {
      console.log("error getting property")
      return;
    }
    
    var p = ret[0];
    
    if (p.use_path) {
      var obj = eval(ret[2]);
      var ret;
      
      if (p.data.type == PropTypes.FLAG && ret[3]) {
        var ret2 = eval("(obj & "+ret[1]+")");
        ret = ret2 > 0 && ret2 == Number(ret[1]);
      } else {
        ret = eval("obj." + p.path);
      }
      
      if (p.data.type == PropTypes.ENUM) {
        ret = p.data.keys[ret];
      }
      
      return ret;
    } else {
      if (p.data.type == PropTypes.VEC3 && ret[3]) {
        return p.data.data[ret[1]];
      } else if (p.data.type == PropTypes.FLAG && ret[3]) {
        return (p.data.data & Number(ret[1])) == Number(ret[1]);
      } else {
        if (p.data.type == PropTypes.ENUM)
          return p.data.keys[p.data.data];
        else 
          return p.data.data;
      }
    }
  }
}

