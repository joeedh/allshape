"use strict";

/*

Okay.  The serialization system needs to do three things:

1. Handle data model changes.
2. Be lightning fast (which means no excessive creation of objects).
3. Be light-weight.

Thus, all the existing serialization schemes (that I know of) for JS
are ineligible.  Here is my final solution: a serialization language
that can compile itself to JS.
*/

function SchemaParser() {
  var basic_types = new set([
    "int", 
    "float", 
    "double",
    "vec2",
    "vec3",
    "vec4",
    "mat4",
    "string"]);
  
  var reserved_tokens = new set([
    "int", 
    "float", 
    "double", 
    "vec2", 
    "vec3", 
    "vec4", 
    "mat4", 
    "string", 
    "static_string",
    "array"]);

  function tk(name, re, func) {
    return new PUTL.tokdef(name, re, func);
  }
  
  var tokens = [
    tk("ID", /[a-zA-Z]+[a-zA-Z0-9_]*/, function(t) {
      if (reserved_tokens.has(t.value)) {
        t.type = t.value.toUpperCase();
      }
      
      return t;
    }),
    tk("OPEN", /\{/),
    tk("CLOSE", /}/),
    tk("COLON", /:/),
    tk("JSCRIPT", /\|/, function(t) {
      var js = ""
      var lexer = t.lexer;
      while (lexer.lexpos < lexer.lexdata.length) {
        var c = lexer.lexdata[lexer.lexpos];
        if (c == "\n") 
          break;
        
        js += c;
        lexer.lexpos++;
      }
      
      if (js.endsWith(";")) {
        js = js.slice(0, js.length-1);
        lexer.lexpos--;
      }
      
      t.value = js;
      return t;
    }),
    tk("LPARAM", /\(/),
    tk("RPARAM", /\)/),
    tk("COMMA", /,/),
    tk("NUM", /[0-9]/),
    tk("SEMI", /;/),
    tk("NEWLINE", /\n/, function(t) {
      t.lexer.lineno += 1;
    }),
    tk("SPACE", / |\t/, function(t) {
      //throw out non-newline whitespace tokens
    })
  ];

  for (var rt in reserved_tokens) {
    tokens.push(tk(rt.toUpperCase()));
  }
  
  function errfunc(lexer) {
    return true; //throw error
  }
  
  var lex = new PUTL.lexer(tokens, errfunc)
  var parser = new PUTL.parser(lex);
  
  function p_Array(p) {
    p.expect("ARRAY");
    p.expect("LPARAM");
    
    var arraytype = p_Type(p);
    var itername = "";
    
    if (p.optional("COMMA")) {
      itername = arraytype.data.replace(/"/g, "");
      arraytype = p_Type(p);
    }    
    
    p.expect("RPARAM");
    
    return {type : "array", data : {type : arraytype, iname : itername}};
  }
  
  function p_Type(p) {
    var tok = p.peek()
    
    if (tok.type == "ID") {
      p.next();
      return {type : "struct", data : "\"" + tok.value + "\""};
    } else if (basic_types.has(tok.type.toLowerCase())) {
      p.next();
      return {type : tok.type.toLowerCase()};
    } else if (tok.type == "ARRAY") {
      return p_Array(p);
    } else {
      p.error(tok, "invalid type " + tok.type); //(tok.value == "" ? tok.type : tok.value));
    }
  }
  
  function p_Field(p) {
    var field = {}
    
    field.name = p.expect("ID", "struct field name");
    p.expect("COLON");
    
    field.type = p_Type(p);    
    field.set = undefined;
    field.get = undefined;
    
    var tok = p.peek();
    if (tok.type == "JSCRIPT") {
      field.get =  tok.value;
      p.next()
    }
    
    tok = p.peek();
    if (tok.type == "JSCRIPT") {
      field.set = tok.value;
      p.next();
    }
    
    p.expect("SEMI");
    
    return field;
  }
  
  function p_Struct(p) {
    var st = {}
    st.name = p.expect("ID", "struct name")
    st.fields = [];
    
    p.expect("OPEN");
    
    while (1) {
      if (p.at_end()) {
        p.error(undefined);
      } else if (p.optional("CLOSE")) {
        break;
      } else {
        st.fields.push(p_Field(p));
      }
    } 
    
    return st;
  }
  
  parser.start = p_Struct;
  return parser;
}

/*types used to generate file schemas.
  note that the schema generator is
  recursive, so theoretically only
  top-level types are needed.*/
var SchemaTypes = [
  Element,
  Vertex,
  Edge,
  Loop,
  Face,
  Mesh
];
var schema_parse = SchemaParser();

function STRUCT()
{
  this.structs = {};
  this.struct_cls = {};
  this.compiled_code = {};
}
create_prototype(STRUCT);

STRUCT.prototype.add_struct = function(cls) {
  this.structs[cls.name] = schema_parse.parse(cls.STRUCT);
  this.struct_cls[cls.name] = cls;
}

STRUCT.prototype.get_struct = function(name) {
  return this.structs[name];
}

STRUCT.prototype.get_struct_cls = function(name) {
  return this.struct_cls[name];
}

STRUCT.prototype.inherit = function(child, parent) {
  var stt = scema_parse.parse(parent.STRUCT);
  var code = child.name + "{\n" 
  code += STRUCT.fmt_struct(stt, true);
  
  return code;
}

STRUCT.fmt_struct = function(stt, internal_only) {
  //var stt = schema_parse.parse(cls.STRUCT);
  
  if (internal_only == undefined)
    internal_only = false;
    
  var s = ""
  
  if (!internal_only)
    s += stt.name + " {\n"
  var tab = "  ";
  
  function fmt_type(type) {
    if (type.type == "array") {
      if (type.data.iname != "" && type.data.iname != undefined) {
        return "array(" + type.data.iname + ", " + fmt_type(type.data.type) + ")";
      } else {
        return "array(" + fmt_type(type.data.type) + ")";
      }
    } else if (type.type == "object") {
      return type.data;
    } else {
      return type.type;
    }
  }
  
  var fields = stt.fields;
  for (var i=0; i<fields.length; i++) {
    var f = fields[i];
    
    s += tab + f.name + ":" + fmt_type(f.type);
    if (f.get != undefined) {
      s += " | " + f.get.trim();
    }
    s += "\n";
  }
  
  if (!internal_only)
    s += "}";
  return s;
}

STRUCT.prototype._env_call = function(code, obj, env) {
  code = code.trim();
  var envcode = ""
  
  if (env != undefined) {
    for (var k in env) {
      envcode = "var " + k + " = env[k];\n" + envcode;
    }
  }
  
  var fullcode = envcode + code;
  var func;
  if (!(fullcode in this.compiled_code)) {
      var code2 = "func = function(obj, env) { " + envcode + "return " + code + "}";
      
      eval(code2);
      this.compiled_code[fullcode] = func;
  } else {
    func = this.compiled_code[fullcode];
  }
  
  return func(obj, env);
}

STRUCT.prototype.write_struct = function(data, obj, stt) {
  var fields = stt.fields;
  
  var thestruct = this;
  
  var packers = {
    "int" : function(data, field, type, val) {
      pack_int(data, val);
    },
    "float" : function(data, field, type, val) {
      pack_float(data, val);
    },
    "string" : function(data, field, type, val) {
      pack_string(data, val);
    },
    "static_string" : function(data, field, type, val) {
      pack_static_string(data, val, type["maxlength"]);
    },
    "vec2" : function(data, field, type, val) {
      pack_vec2(data, val);
    },
    "vec3" : function(data, field, type, val) {
      pack_vec3(data, val);
    },
    "vec4" : function(data, field, type, val) {
      pack_vec4(data, val);
    },
    "mat4" : function(data, field, type, val) {
      pack_mat4(data, val);
    },
    "array" : function(data, field, type, val) {
      pack_int(data, val.length);
      
      for (var i=0; i<val.length; i++) {
        var val2 = val[i];
        var itername = type.data.iname;
        var type2 = type.data.type;
        
        if (f.get) {
          var env = {}
          env[itername] = val2;
          val2 = thestruct._env_call(f.get, obj, env);
        }
        
        var f2 = {type : type2, get : undefined, set: undefined};
        
        pack_type(data, f2, f2.type, val2);
      }
    },
    "struct" : function(data, field, type, val) {
      this.write_struct(data, val, this.get_struct(type.data));
    }
  }
  
  function pack_type(data, field, type, val) {
    packers[field.type.type](data, field, type, val);
  }
  
  for (var i=0; i<fields.length; i++) {
    var f = fields[i];
    
    if (f.type.type != "array") {
      var val;
      var type = f.type.type;
      
      if (f.get != undefined) {
        val = thestruct._env_call(f.get, obj, {});
      } else {
        val = obj[f.name];
      }
      
      pack_type(data, f, f.type, val);
    } else if (f.type.type == "array") {
      var val = obj[f.name];
      pack_type(data, f, f.type, val);
    }
  }
}

STRUCT.prototype.write_object = function(data, obj) {
  var cls = obj.constructor.name;
  var stt = this.structs[cls];
  this.write_struct(data, obj, stt);  
}

STRUCT.prototype.read_object = function(data, cls) {
  var stt = this.structs[cls.name];
  var uctx = new unpack_ctx();
  var thestruct = this;
  
  var unpack_funcs = {
    "int" : function(type) {
      return unpack_int(data, uctx);
    },
    "float" : function(type) {
      return unpack_float(data, uctx);
    },
    "string" : function(type) {
      return unpack_string(data, uctx);
    },
    "static_string" : function(type) {
      return unpack_static_string(data, uctx, type.data.maxlength);
    },
    "vec2" : function(type) {
      return unpack_vec2(data, uctx);
    },
    "vec3" : function(type) {
      return unpack_vec3(data, uctx);
    },
    "vec4" : function(type) {
      return unpack_vec4(data, uctx);
    },
    "mat4" : function(type) {
      return unpack_mat4(data, uctx);
    },
    "array" : function(type) {
      var len = unpack_int(data, uctx);
      var arr = new Array(len);
      
      for (var i=0; i<len; i++) {
        arr[len] = unpack_field(type.data.type);
      }
      
      return arr;
    },
    "struct" : function(type) {
      var cls2 = this.get_struct_cls(type.data);
      
      return this.read_object(data, cls2);
    }
  };
  
  function unpack_field(type) {
    return unpack_funcs[type.type](type);
  }
  
  function load(obj) {
    var fields = stt.fields;
    var flen = fields.length;
    
    for (var i=0; i<flen; i++) {
      var f = fields[i];
      var  val = unpack_field(f.type);
      
      obj[f.name] = val;
    }
  }
  
  return cls.fromSTRUCT(load);
}

var test_vertex_struct = """
  Vertex {
    eid : int;
    flag : int;
    index : int;
    type : int;
    
    co : vec3;
    no : vec3;
    loop : int | obj.loop == undefined ? -1 : obj.loop.eid;
    edges : array(e, int) | e.eid;
  }
""";

var istruct = new STRUCT();
function init_struct_packer() {
  global defined_classes;
  
  for (var cls in defined_classes) {
    if (cls.STRUCT != undefined && cls.fromSTRUCT != undefined) {
      istruct.add_struct(cls);
    }
  }
}
function test_struct() {
  var stt = new STRUCT();
  
  Vertex.STRUCT = test_vertex_struct;
  Vertex.fromSTRUCT = function(do_read) {
    var v = new Vertex();
    do_read(v);
    
    return v;
  }
  
  stt.add_struct(Vertex);
  
  var v = new Vertex();
  
  var e1 = new Edge();
  var e2 = new Edge();
  
  e1.eid = 2;
  e2.eid = 3;
  
  v.edges.push(e1);
  v.edges.push(e2);
  
  var data = []
  stt.write_object(data, v);
  
  data = new DataView(new Uint8Array(data).buffer);
  
  var obj = stt.read_object(data, Vertex);
}

test_struct();

//typeof function, that handles object instances of basic types
var _bt_h = {
  "String" : "string",
  "Number" : "number",
  "Function" : "function"
}

function btypeof(obj) {
  if (typeof obj == "object") {
    if (obj.constructor.name in _bt_h)
      return _bt_h[obj.constructor.name];
    else
      return "object";
  } else {
    return typeof obj;
  }
}

//stub type
function JSONType() {
};
create_prototype(JSONType);

function JSOB(obj) {
  obj.__proto__ = JSONType.prototype;
  obj.constructor = JSONType;
  
  return obj;
}

function StaticString(s, maxlength) {
  if (s.length > maxlength)
    s = s.slice(0, maxlength);
    
  String.call(this, s);
}
inherit(StaticString, String);

var _basic_types = {
  "StaticString" : "static_string",
  "String" : "string",
  "Number" : "number",
  "Vec2" : "vec2",
  "Vec3" : "vec3",
  "Vec4" : "vec4",
  "Matrix4" : "mat4",
  "number" : "number",
  "string" : "string",
};

function SchemaError(msg) {
  this.msg = msg;
  Error.call(this, msg);
}
inherit(SchemaError, Error);

//calc_subschema is optional, defaults to false
function gen_schema(obj, calc_subschema) {
  if (calc_subschema == undefined)
    calc_subschema = false;
    
  var s = {};
  
  if (obj == undefined) {
    throw new Error("Undefined not allowed");
  }
  
  if (btypeof(obj) in _basic_types) {
    s["type"] = _basic_types[btypeof(obj)];
    return s;
  } else if (obj.__class__ in _basic_types) {
    s["type"] = _basic_types[obj.__class__];
    return s
  }
  
  if ((obj instanceof Array) || (obj instanceof GArray)) {
    s.type = "array";
    if (obj.length == 0) {
      if ("s_array_type" in obj)
        s.subtype = obj.s_array_type;
      else
        s.subtype = "null";
    } else {
      var type = "s_array_type" in obj ? obj.s_array_type : undefined;
      
      for (var i=0; i<obj.length; i++) {
        var t2 = gen_schema(obj[i]);
        
        /*
        var t2 = {type : t3.type}
        if ("name" in t3)
          t2.name= t3.name
        if ("subtype" in t3)
          t2.subtype = t3.subtype;
        // */
        
        if (type == undefined)
          type = t2;
        
        /*
        if (t2 != type) {
          var is_num = t2 == "number" || t2 == "int32";
          is_num = is_num && (type == "number" || type == "int32");
          
          if (!is_num) 
            throw new Error("Array objects must be of same type");
        }
        */
      }
      
      s.subtype = type;
    }
  } else if (is_obj_lit(obj)) {
    s["type"] = "object";
    
    var fields = [];
    for (var k in obj) {
      if (k == "constructor" || k == "prototype" || k == "__proto__")
        continue;
      
      fields.push([k, gen_schema(obj[k])]);
    }
    
    s["fields"] = fields;
  } else {
    s["type"] = "schema_object";
    s["name"] = obj.__class__;
  }
  
  return s;
}

var SchmTypes = {
  BYTE : 0,
  INT : 1,
  FLOAT : 2,
  STRING : 3,
  FIXEDSTRING : 4,
  ARRAY : 5,
  VEC2 : 6,
  VEC3 : 7,
  VEC4 : 8,
  MAT4 : 9,
  COLOR : 10,
  DATAREF : 11,
  OBJECT : 12,
};
