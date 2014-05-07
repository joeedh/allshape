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
    
    if (ctx.mesh == undefined) {
      print_stack();
      console.log(ctx);
      throw new Error("Mesh operation called with bad context");
    }
    
    return new MSelectIter(typemask, ctx.mesh);
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
  
  resolve_path_intern(ctx, str) {
    var p = this.parser
    p.reset(str)
    
    var can_cache = true;
    var path = []
    var arritem = undefined;
    while (p.peek() != undefined) {
      word = p.expect(_WORD);
      
      if (p.peek() != undefined && p.peek()[0] == _LS) {
        p.expect(_TOKEN, _LS);
        arritem = Number(p.expect(_WORD));
        p.expect(_TOKEN, _RS);
        if (p.peek() != undefined) {
          console.log("Error: expected EOF after array/obj lookup");
          throw TinyParserError;  
        }
      } else if (p.peek() != undefined) {
        p.expect(_TOKEN, _DT);
      }
      
      path.push(word);
    }
  
    var s = this.root_struct;
    var path2 = ""
    
    can_cache = can_cache && !(s.flag & DataFlags.NO_CACHE);
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
      
      can_cache = can_cache && !(s.flag & DataFlags.NO_CACHE);
      
      if (!(path[i] in s.pathmap)) {
        console.log("Invalid property/struct " + str);
        throw TinyParserError;
      }
      
      s = s.pathmap[path[i]];
      can_cache = can_cache && !(s.flag & DataFlags.NO_CACHE);
      
      path3 = path2;
      if (i > 0) path2 += "."
      path2 += s.path
    }
    
    if (arritem != undefined) {
      path3 = path2;
      path2 = arritem;
      
      return [s, path2, path3, true, can_cache];
    }
    
    return [s, path2, path3, false, can_cache];
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
  
  resolve_path_new_intern(ctx, str) {  
    try {
      return this.resolve_path_new_intern2(ctx, str);
    } catch (_err) {
      print_stack(_err);
      console.log("error: ", str);
    }
  }
  
  resolve_path_new_intern2(ctx, str) {  
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
  
  get_prop_new(ctx, str) {
    var parser = apiparser();
    
    var ret = this.resolve_path_new_intern(ctx, str);
    if (ret == undefined) return ret;
    
    var val = ret[0];
    
    if (ret[0].type == DataPathTypes.PROP) {
      if (ret[0].use_path) {
        var path = ret[1];
        //console.log("===>", path, ret[1]);
        val = eval(path);
        //console.log("val", val);
      } else {
        val = eval(ret[2]);
        
        if (val instanceof DataPath)
          val = val.data;
        if (val instanceof ToolProperty)
          val = val.data;
        //console.log("=1=>", ret[0], ret[1]);
        //val = ret[0].data;
      }
      
      var prop = ret[0].data;
      if (prop.type == PropTypes.ENUM && (val in prop.keys))
        val = prop.keys[val];
    }
    
    return val;
  }
  
  set_prop_new(ctx, str, value) {
    var parser = apiparser();
    
    var ret = this.resolve_path_new_intern(ctx, str);
    if (ret == undefined) return ret;
    
    if (ret[0].type != DataPathTypes.PROP) {
      console.trace();
      console.log("Error: non-property in set_prop_new()", ret[0], ret[1], ret[2]);
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
        
        //don't override array references
        if (prop.type == PropTypes.VEC3 || prop.type == PropTypes.VEC4) {
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
      
      if (ret[0].update != undefined)
        ret[0].update.call(ret[0]);
    }
  }
  
  get_struct_new(ctx, str) {
    var ret = this.get_prop_new(ctx, str);
    if (ret instanceof DataPath)
      ret = ret.data;
    return ret;
  }
  
  get_prop_meta_new(ctx, str) {
    var ret = this.resolve_path_new_intern(ctx, str);
    if (ret == undefined || ret[0] == undefined) return undefined;
    
    return ret[0].data;
  }
  
  resolve_path(ctx, str) {
    // /*
    if (str in this.cache) {
      if (this._c == undefined)
        this._c = 0;
      if (this._c < 10) {
        /*
        var r1 = this.resolve_path_intern(ctx, str);
        var r2 = this.copy_path(this.cache[str]);
        
        console.log("c", r2[0], r2[1], r2[2], r2[3], r2[4]);
        console.log("o", r1[0], r1[1], r1[2], r1[3], r1[4]);
        console.log(r1[0]==r2[0]);
        console.log("--");
        */
      }
      
      this._c++;
      var ret = this.cache[str];
      
      if (ret[0].cache_good())
        return this.copy_path(ret);
    }
    // */
    
    try {
      var ret = this.resolve_path_intern(ctx, str);
      
      if (ret == undefined || ret[0] == undefined) {
        throw new TinyParserError();
      }
      
      if (ret[4]) {
        this.cache[str] = ret;
        ret[0].flag &= ~DataFlags.RECALC_CACHE;
      }
      
      return this.copy_path(ret);
    } catch (error) {
      if (error != TinyParserError) {
        throw error;
      } else {
        console.log("Could not resolve path " + str);
        return undefined;
      }
    }
  }
  
  get_struct(ctx, str) {
    if (new_api_parser) return this.get_struct_new(ctx, str);
    
    var ret = this.resolve_path(ctx, str)
    if (ret == undefined) return ret;
    
    return ret[0].data;
  }
  
  get_prop_meta(ctx, str) {
    if (new_api_parser) return this.get_prop_meta_new(ctx, str);
    
    var ret = this.resolve_path(ctx, str)
    if (ret == undefined) return ret;
    
    return ret[0].data;
  }
  
  set_prop(ctx, str, value) {
    if (new_api_parser) return this.set_prop_new(ctx, str, value);
    
    var ret = this.resolve_path(ctx, str);

    if (ret == undefined) 
      return;
    
    var p = ret[0];
    p.ctx = p.data.ctx = ctx;
    p.data.path = ret[1];
    
    if (p.data.type == PropTypes.INT)
      value = Math.floor(value);
    
    if (p.use_path) {
      var func;
      var code = "func = function(ctx, value) {\n"
      
      var value2 = value;
      if (p.data.type == PropTypes.ENUM) {
        value2 = p.data.values[value2];
      } 
      
      code += "  obj = " + ret[2] + ";\n";
      
      if ((p.data.type == PropTypes.VEC3 || p.data.type == PropTypes.VEC4) && ret[3]) {
        code += "obj[" + ret[1] + "] = value";
      } else if (p.data.type == PropTypes.FLAG && ret[3]) {
        if (value2) {
          code += "  value = value | " + ret[1] + ";\n";
        } else {
          code += "  value = value & ~(" + ret[1] + ");\n";
        }
        code += "  " + ret[2] + " = value;\n";
      } else {
        code += "  obj." + p.path + " = value;\n";
      }
      
      code += "}"
      
      if (!(code in this.evalcache)) {
        eval(code);
        this.evalcache[code] = func;
      } else {
        func = this.evalcache[code];
      }
      
      func(ctx, value);
    }
    
    if ((p.data.type == PropTypes.VEC3 || p.data.type == PropTypes.VEC4) && ret[3]) {
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
      p.update.call(p);
    }
  }
  
  get_prop(Context ctx, String str) : Object {
    if (new_api_parser) return this.get_prop_new(ctx, str);
    
    var ret = this.resolve_path(ctx, str);
    
    if (ret == undefined) {
      console.log("error getting property")
      return undefined;
    }
    
    var p = ret[0];
    
    if (p.use_path) {
      var func;
      var code = "func = function(ctx) {\n  var obj=" + ret[2] + ";\n";
      
      if (p.data.type == PropTypes.FLAG && ret[3]) {
        code += "  return (obj & " + ret[1] + ")";
        code += " == " + ret[1] + ";\n"
      } else {
        code += "  return obj." + p.path + ";\n";
      }
      
      code += "}\n"
      
      if (!(code in this.evalcache)) {
        try {
          eval(code);
        } catch (error) {
          console.log("===syntax error compiling internal datapath getter===");
          var s = "1  ";
          var l = 2;
          for (var i=0; i<code.length; i++) {
            var c = code[i];
            
            s += c;
            
            if (c == "\n") {
              var lstr = l.toString();
              s += lstr;
              
              for (var j=0; j<2-lstr.length; j++) {
                s += " ";
              }
              
              s += " ";
              l++;
            }
          }
          
          console.log(s);
          throw error;
        }
        this.evalcache[code] = func;
      } else {
        func = this.evalcache[code];
      }
      
      ret = func(ctx)
      
      if (p.data.type == PropTypes.ENUM) {
        ret = p.data.keys[ret];
      }
      
      return ret;
    } else {
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
