var DataPathTypes = {PROP: 0, STRUCT: 1, STRUCT_ARRAY : 2};
var DataFlags = {NO_CACHE : 1, RECALC_CACHE : 2};

var TinyParserError = {"TinyParserError":0};

class DataPath {
  constructor(prop, name, path, dest_is_prop=false, use_path=true, flag=0) { 
    this.flag = flag;
    
    this.dest_is_prop = dest_is_prop
    
    //need to get rid of dest_is_prop paramter;
    //for now, use as sanity variable.
    if (prop == undefined)
      this.type = dest_is_prop ? DataPathTypes.PROP : DataPathTypes.STRUCT;
    
    if (prop != undefined && prop instanceof ToolProperty) {
      this.type = DataPathTypes.PROP;
    } else if (prop != undefined && prop instanceof DataStruct) {
      this.type = DataPathTypes.STRUCT;
      prop.parent = this;
      
      //XXX need to fold DataPath/Struct/StructArray
      //instead of linking member variables in struct/structarray
      //with containing datapath
      this.pathmap = prop.pathmap;
    } else if (prop != undefined && prop instanceof DataStructArray) {
      this.type = DataPathTypes.STRUCT_ARRAY;
      prop.parent = this;
      
      //XXX need to fold DataPath/Struct/StructArray
      //instead of linking member variables in struct/structarray
      //with containing datapath
      this.getter = prop.getter;
    }
    
    this.name = name
    this.data = prop;
    this.path = path;
    this.update = undefined : Function;
    
    this.use_path = use_path;
    this.parent = undefined;
  }
  
  cache_good() {
    var p = this;
    
    while (p != undefined) {
      if (p.flag & DataFlags.RECALC_CACHE)
        return false;
      p = p.parent;
    }
    
    return true;
  }
}

class DataStructIter {
  constructor(s) {
    this.ret = {done : false, value : undefined}; //cached_iret();
    this.cur = 0;
    
    this.strct = s;
    this.value = undefined;
  }
  
  __iterator__() { return this; }
  
  reset() {
    this.cur = 0;
    this.ret.done = false;
    this.ret.value = undefined;
  }
  
  next() {
    if (this.cur >= this.strct.paths.length) {
      var ret = this.ret;
      
      this.cur = 0;
      
      ret.done = true;
      this.ret = {done : false, value : undefined}; //cached_iret();
      
      return ret;
    }
    
    var p = this.strct.paths[this.cur++];
    p.data.path = p.path;
    
    this.ret.value = p;
    return this.ret;
  }
}

/*array_item_struct_getter is a function that takes
  one of the array items in path, and returns 
  a struct definition
 */
class DataStructArray {
  constructor(array_item_struct_getter) {
    this.getter = array_item_struct_getter;
    
    this.type = DataPathTypes.STRUCT_ARRAY;
  }
}

class DataStruct {
  constructor(paths) {
    this.paths = new GArray(paths);
    this.pathmap = {}
    this.parent = undefined;
    
    this._flag = 0;
    
    for (var p in this.paths) {
      p.parent = this;
      this.pathmap[p.name] = p
      if (p.type == DataPathTypes.PROP) {
        p.data.path = p.path;
      }
    }
    
    this.type = DataPathTypes.STRUCT;
  }

  __iterator__() {
    return new DataStructIter(this);
  }
  
  get flag() {
    return this._flag;
  }
  
  cache_good() {
    var p = this;
    
    while (p != undefined) {
      if (p.flag & DataFlags.RECALC_CACHE)
        return false;
      p = p.parent;
    }
    
    return true;
  }
  
  set flag(val) {
    this._flag = val;
    
    function recurse(p, flag) {
      p.flag |= flag;
      
      if (p instanceof DataStruct) {
        for (var p2 in p.paths) {
          if (p2 instanceof DataStruct) {
            //hand off to substruct;
            //we don't want to double recurse
            p2.flag |= flag;
          } else {
            recurse(p2, flag);
          }
        }
      }
    }
    
    if (val &  DataFlags.NO_CACHE) {
      for (var p in this.paths) {
        recurse(p, DataFlags.NO_CACHE);
      }
    }
    if (val &  DataFlags.RECALC_CACHE) {
      for (var p in this.paths) {
        recurse(p, DataFlags.RECALC_CACHE);
      }
    }
  }
  
  add(p) {
    if (this._flag & DataFlags.NO_CACHE)
      p._flag |= DataFlags.NO_CACHE;
    
    this.pathmap[p.name] = p;
    this.paths.push(p);
    p.parent = this;
  }

  replace(p, p2) {
    for (var p2 in this.paths) {
      if (p2.name == p.name) {
        this.flag |= DataFlags.RECALC_CACHE;
        this.paths.remove(p2);
        delete this.pathmap[p2.name];
        break;
      }
    }
    
    this.add(p);
  }
}

/*TinyParser is optimization to only be used with the data api.
  DO NOT USE IT ELSEWHERE.  It can only process a limited number
  of tokens (due to its reliance on the obj cache system), 
  and once the limit is reached it won't warn you.

  always use parseutils.js for general-purpose parsing tasks.*/
  
_TOKEN = 0
_WORD = 1
_LP = "("
_RP = ")"
_LS = "["
_RS = "]"
_CM = ","
_EQ = "="
_DT = "."

class TinyParser {
  constructor(data) {
    var tpl = TinyParser.ctemplates;
    
    this.toks = objcache.fetch(tpl.toks);
    this.toks.length = 0;
    
    this.split_chars = TinyParser.split_chars; 
    this.ws = TinyParser.ws; 
    this.data = data
    
    this.cur = 0;
  }
  
  reset(data) {
    this.cur = 0;
    this.toks.length = 0;
    this.data = data;
    
    if (data != undefined && data != "")
      this.lex();
  }
  
  gen_tok(a, b) {
    var ret = objcache.fetch(TinyParser.ctemplates.token);
    
    ret[0] = a;
    ret[1] = b;
    ret.length = 2;
    
    return ret;
  }
  
  lex(data) {
    var gt = this.gen_tok;
    
    if (data == undefined)
      data = this.data;
    
    var toks = this.toks
    tok = undefined
    
    var i = 0;
    while (i < data.length) {
      c = data[i];
      if (this.ws.has(c)) {
        if (tok != undefined && tok[1] == _WORD) {
          tok = undefined;
        }
      } else if (this.split_chars.has(c)) {
        toks.push(gt(c, _TOKEN));
        tok = undefined
      } else {
        if (tok == undefined) {
          tok = gt("", _WORD)
          toks.push(tok)
        }
        tok[0] += c
      }
      
      i += 1;
    }
  }
  
  next() {
    this.cur++;
    if (this.cur-1 < this.toks.length) {
      return this.toks[this.cur-1]
    }
    
    return undefined;
  }
  
  peek() {
    if (this.cur < this.toks.length) {
      return this.toks[this.cur]
    }
    
    return undefined;
  }
  
  expect(type, val) {
    if (this.peek()[1] != type) {
      console.log("Unexpected token " + this.peek[0] + ", expected " + (type==_WORD?"WORD":val));
      console.trace();
      throw new TinyParserError();
    }
    
    if (type == _TOKEN && this.peek()[0] != val) {
      console.log("Unexpected token " + this.peek[0]);
      console.trace();
      throw new TinyParserError();
    }
    
    return this.next()[0];
  }  
};

TinyParser.ctemplates = {
  toks : {obj : Array(64), init : function(val) { val.length = 0; }},
  token : {obj : ["", ""], cachesize : 512}
};

TinyParser.split_chars = new set([",", "=", "(", ")", ".", "$", "[", "]"]);
TinyParser.ws = new set([" ", "\n", "\t", "\r"]);

class DataAPI { 
  constructor(appstate) {
    this.appstate = appstate;
    
    this.ops = data_ops_list;
    this.parser = new TinyParser();
    
    this.root_struct = ContextStruct;
    this.cache = {};
    this.evalcache = {};
  }
  
  parse_call_line_intern(ctx, line) {
    p = this.parser;
    
    function parse_argval(p) {
      var val = p.expect(_WORD)
      var args;
      
      if (p.peek()[0] == _LP) {
        args = parse_call(p);
      }
      
      return [val, args];
    }
    
    function parse_arg(p) {
      var arg = p.expect(_WORD);
      var val = undefined;
      
      if (p.peek()[0] == _EQ) {
        p.next(); 
        val = parse_argval(p);  
      }
      
      return [arg, val];
    }
    
    function parse_call(p) {
      p.expect(_TOKEN, _LP);
      var args=[];
      var t = undefined
      
      while (p.peek() != undefined) {
        if (p.peek()[1] == _WORD) {
          args.push(parse_arg(p));
        } else if (p.peek()[0] == _CM) {
          p.next();
        } else {
          p.expect(_TOKEN, _RP);
          break;
        }
      }
      
      return args;
    }
    
    if (line.contains(_LP)==0)
      throw TinyParserError;
    
    var li = line.find(_LP);
    
    path = line.slice(0, li);
    line = line.slice(li, line.length);
    
    p.reset(line);
    call = parse_call(p)
    
    path = path.trimRight().trimLeft();
    
    var ret = objcache.array(2);
    ret[0] = path; ret[1] = call;
    
    return ret;
  }
  
  parse_call_line(ctx, line) {
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
  
  do_mesh_selected(ctx, args) {
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
    
    var mesh = ctx.mesh;
    if (mesh == undefined) {
      console.trace();
      console.log("Mesh operation called with bad context");
      console.log("Creating dummy mesh. . .");
      console.log(ctx);
      
      mesh = new Mesh();
    }
    
    return new MSelectIter(typemask, mesh);
  }
  
  prepare_args(ctx, call) { //args is private/optional
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
  
  get_op_intern(ctx, str) {
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
  
  get_op_keyhandler(ctx, str) {
    function find_hotkey_recurse(element) {
      if (element == undefined)
        return undefined;
      
      var maps = element.get_keymaps();
      for (var i=0; i<maps.length; i++) {
        var km = maps[i];
        
        var handler = km.get_tool_handler(str);
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
  
  call_op(ctx, str) {
    if (RELEASE)
      return this.call_op_release(ctx, str);
    else
      return this.call_op_debug(ctx, str);
  }
  
  call_op_debug(ctx, str) {
    console.log("calling op", str);
    
    var op = this.get_op_intern(ctx, str);
    
    if (op.flag & ToolFlags.USE_DEFAULT_INPUT) {
      this.appstate.toolstack.default_inputs(ctx, op);
    }
    
    this.appstate.toolstack.exec_tool(op);
  }
  
  call_op_release(ctx, str) {
    try {
      var op = this.get_op_intern(ctx, str);
      
      if (op.flag & ToolFlags.USE_DEFAULT_INPUT) {
        this.appstate.toolstack.default_inputs(ctx, op);
      }
      
      this.appstate.toolstack.exec_tool(op);
    } catch (error) {
      console.log("Error calling " + str);
      console.trace();
    }
  }
  
  get_op_uiname(ctx, str) {
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
  
  get_op(ctx, str) {
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
  
  copy_path(path) {
    var ret = [];
    
    ret.push(path[0]);
    for (var i=1; i<path.length; i++) {
      ret.push(copy_object_deep(path[i]));
    }
    
    return ret;
  }

  _build_path(dp) {
    var s = "";
    while (dp != undefined) {
      if (dp instanceof DataPath)
        s = dp.path + "." + s;
      
      dp = dp.parent;
    }
    
    s = s.slice(0, s.length-1); //get rid of trailing '.' 
    return s;
  }
  
  resolve_path_intern(ctx, str) {  
    static cache = {};
    
    if (str == undefined) {
      console.trace("warning, undefined path in resolve_path_intern (forgot to pass ctx?)");
      return undefined;
    }
    
    try {
      if (!(str in cache)) {
        var ret = this.resolve_path_intern2(ctx, str);
        
        //copy
        var ret2 = []
        for (var i=0; i<ret.length; i++) {
          ret2.push(ret[i]);
        }
        
        cache[str] = ret2;
      } else {
        var ret = cache[str];
        
        if (!ret[0].cache_good()) {
          delete cache[str];
          return this.resolve_path_intern(ctx, str);
        }
      }
      
      return ret;
    } catch (_err) {
      print_stack(_err);
      console.log("error: ", str);
    }
    
    return undefined;
  }
  
  resolve_path_intern2(ctx, str) {  
    var parser = apiparser();
    
    var arr_index = undefined;
    var build_path = this._build_path;
    var pathout = [""];
    var spathout = ["ContextStruct"];
    
    function do_eval(node, scope, pathout, spathout) {
      if (node.type == "ID") {
        if (scope == undefined) {
          console.log("data api error: ", str + ", " + pathout[0] + ", " + spathout[0]);
        }
        
        var ret = scope.pathmap[node.val];
        
        if (ret == undefined)
          return undefined;
         
        if (ret.use_path) {
          if (ret.path[0] != "[" && ret.path[0] != "(")
            pathout[0] = pathout[0] + "." + ret.path;
          else
            pathout[0] += ret.path
        }
        
        spathout[0] = spathout[0] + ".pathmap." + node.val;
        
        return ret;
      } else if (node.type == ".") {
        var n2 = do_eval(node.children[0], scope, pathout, spathout);
        
        if (n2 != undefined) {
          if (n2 instanceof DataPath)
            n2 = n2.data;
          
          return do_eval(node.children[1], n2, pathout, spathout);
        }
      } else if (node.type == "ARRAY") {
        var array = do_eval(node.children[0], scope, pathout, spathout);
        var index = do_eval(node.children[1], scope, pathout, spathout);
        
        arr_index = index;
        
        if (array.type == DataPathTypes.PROP && array.data.type == PropTypes.FLAG) {
          spathout[0] += ".data.data & "+index;
        } else if (array.type == DataPathTypes.PROP) {
          spathout[0] += ".data.data["+index+"]";
        }
        
        if (!array.use_path) {
          return array;
        } else {
          var path = pathout[0];
          
          path = path.slice(1, path.length);
          
          if (array.type == DataPathTypes.PROP && array.data.type == PropTypes.FLAG) {
            pathout[0] += "&"+index;
          } else {
            pathout[0] += "["+index+"]";
          }
          
          //console.log("--------ss->", pathout[0]);
          
          if (array.type == DataPathTypes.STRUCT_ARRAY) {
            var stt = array.data.getter(eval(path)[index]);
            stt.parent = array;
            
            spathout[0] += ".getter(" + path + "[" + index + "]" + ")";
            return stt;
          } else {
            return array;
          }
        }
      } else if (node.type == "NUM") {
        return node.val;
      }
    }
    
    var ast = parser.parse(str);
    static sret = [0, 0, 0];
    
    sret[0] = do_eval(ast, ContextStruct, pathout, spathout);
    pathout[0] = pathout[0].slice(1, pathout[0].length);
    sret[1] = pathout[0];
    sret[2] = spathout[0];
    
    //console.log("pathout: ", pathout[0]);
    //console.log("spathout: ", spathout[0]);
    //console.log("ret: ", sret[0]);
    
    return sret;
  }
  
  eval(ctx, str) {
    if (str in this.evalcache) {
      return this.evalcache[str](ctx);
    }
    
    var script = """
      var func = function(ctx) {
        return $s
      }
    """.replace("$s", str);
    
    eval(script);
        
    this.evalcache[str] = func;
    return func(ctx);
  }
  
  get_prop(ctx, str) {
    var parser = apiparser();
    
    var ret = this.resolve_path_intern(ctx, str);
    if (ret == undefined) return ret;
    
    var val = ret[0];
    
    if (ret[0].type == DataPathTypes.PROP) {
      if (ret[0].use_path) {
        var path = ret[1];
        val = this.eval(ctx, path);
      } else {
        val = this.eval(ctx, ret[2]);
        
        if (val instanceof DataPath)
          val = val.data;
        if (val instanceof ToolProperty)
          val = val.data;
      }
      
      var prop = ret[0].data;
      if (prop.type == PropTypes.ENUM && (val in prop.keys))
        val = prop.keys[val];
    }
    
    return val;
  }
  
  set_prop(ctx, str, value) {
    var parser = apiparser();
    
    var ret = this.resolve_path_intern(ctx, str);
    if (ret == undefined) return ret;
    
    if (ret[0].type != DataPathTypes.PROP) {
      console.trace();
      console.log("Error: non-property in set_prop()", ret[0], ret[1], ret[2]);
      return;
    }
    
    if (ret[0].type == DataPathTypes.PROP) {
      var path;
      
      if (ret[0].use_path) {
        path = ret[1];
      } else {
        path = ret[2];
      }
      
      var prop = ret[0].data;
      prop.ctx = ctx;
      if (prop.type == PropTypes.FLAG) {
        if (path.contains("&")) {
          //handle "struct.flag[bit] = boolean" form.
          var mask = Number.parseInt(path.slice(path.find("&")+1, path.length).trim());
          var path2 = path.slice(0, path.find("&"));
          
          var val = eval(path2);
          
          if (value)
            val |= mask;
          else
            val &= ~mask;
          
          prop.set_data(val);
        } else {
          //handle "struct.flag = integer bitmask" form
          path += " = " + value;
          eval(path);
          
          prop.set_data(value);
        }
      } else {
        if (prop.type == PropTypes.ENUM) {
          value = prop.values[value];
          if (value instanceof String || typeof value == "string") {
            value = '"'+value+'"';
          }
        } else if (prop.type == PropTypes.STRING) {
          value = '"' + value + '"';
        }
        
        var valpath = path;
        if (path.endsWith("]")) {
          var i = path.length-1;
          while (i >= 0 && path[i] != "[") i--;
          valpath = path.slice(0, i);
          
        } else if (!ret[0].use_path) {
          //erg, stupid hackyness
          valpath += ".data.data";
          path += ".data.data";
        }
        
        var oval = eval(path);
        
        /*don't override array references
          e.g. struct.some_array = [0, 1, 2, 3]
          shouldn't assign the array expression's reference
          to some_array, it should load the contents.*/
        
        //need a better way to detect array assignments 
        //  (some.array = [0, 0, 0] instead of some.array[0] = 0).
        if (typeof value != "number" &&
           (prop.type == PropTypes.VEC3 || prop.type == PropTypes.VEC4))
        {
          var arr = eval(path);
          
          for (var i=0; i<arr.length; i++) {
            arr[i] = value[i];
          }
        } else {
          path += " = " + value;
          eval(path);
        }
        
        prop.set_data(eval(valpath));
      }
      
      ret[0].ctx = ctx;
      if (ret[0].update != undefined)
        ret[0].update.call(ret[0]);
    }
  }
  
  get_struct(ctx, str) {
    var ret = this.get_prop(ctx, str);
    if (ret instanceof DataPath)
      ret = ret.data;
    return ret;
  }
  
  get_prop_meta(ctx, str) {
    var ret = this.resolve_path_intern(ctx, str);
    if (ret == undefined || ret[0] == undefined) return undefined;
    
    return ret[0].data;
  }
  
  /*
  get_prop_time(ctx, str) {
    var ts = []
    var c = time_ms()
    
    var ret = this.resolve_path(ctx, str);
    
    ts.push(time_ms()-c);
    
    if (ret == undefined) {
      console.log("error getting property")
      return;
    }
    
    var p = ret[0];
    
    if (p.use_path) {
      c = time_ms()
      
      var obj = eval(ret[2]);
      var ret;
      
      ts.push(time_ms()-c);
      c = time_ms();
      
      if (p.data.type == PropTypes.FLAG && ret[3]) {
        var ret2 = eval("(obj & "+ret[1]+")");
        ret = ret2 > 0 && ret2 == Number(ret[1]);
      } else {
        ret = eval("obj." + p.path);
      }
      
      if (p.data.type == PropTypes.ENUM) {
        ret = p.data.keys[ret];
      }
      
      ts.push(time_ms()-c);
      
      return ts;
    } else {
      return ts;
      
      if ((p.data.type == PropTypes.VEC3 || p.data.type == PropTypes.VEC4) && ret[3]) {
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
  }*/
}
