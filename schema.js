"use strict";

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

function BJSON() {
  this.schemas = {};
};

BJSON.prototype.pack_array = function(obj, type) {
  
}

BJSON.prototype.get_schema_name = function(name) {
  return this.schemas[name];
}

BJSON.prototype.get_schema = function(obj) {
  if (is_obj_lit(obj)) {
    return gen_schema(obj);
  }
  
  if (!(obj.__class__ in this.schemas)) {
    this.schemas[obj.__class__] = gen_schema(obj.toJSON());
  }
  
  return this.schemas[obj.__class__];
}

BJSON.prototype.schema_pack = function(data, obj, schema, depth) {
  if (depth == undefined)
    depth = 1;
  
  var dstr = ""
  for (var i=0; i<depth; i++) {
    dstr += "->"
  }
  
  if (schema["type"] == "array") {
    var subtype = schema["subtype"];
      
    pack_int(data, obj.length);
    for (var i=0; i<obj.length; i++) {
      if (subtype["type"] == "schema_object")
        this.schema_pack(data, obj[i].toJSON(), this.get_schema(obj[i]), depth+1);
      else
        this.schema_pack(data, obj[i], subtype, depth+1);
    }
  } else if (schema["type"] == "object") {
    var fields = schema["fields"];
    
    for (var i=0; i<fields.length; i++) {
      var k = fields[i][0], t = fields[i][1];
      
      var m = obj[k];
      if (t["type"] == "schema_object") {
        this.schema_pack(data, m.toJSON(), this.get_schema(m), depth+1);
      } else {
        this.schema_pack(data, m, t, depth+1);
      }
    }
  } else if (schema["type"] == "number" || schema["type"] == "float32") {
    pack_float(data, Number(obj));
  } else if (schema["type"] == "string") {
    pack_string(data, obj);
  } else if (schema["type"] == "int32") {
    pack_int(data, Number(obj));
  } else if (schema["type"] == "static_string") {
    pack_static_string(data, obj, schema["maxlength"]);
  }
}

BJSON.prototype.binify = function(obj) {
  var schema = this.get_schema(obj);
  
  if (is_obj_lit(obj))
    var json = obj;
  else
    var json = obj.toJSON();
  
  var data = [];
  this.schema_pack(data, json, schema);
  
  return data;
}

BJSON.prototype.parse = function(data, schema, ui) {
  if (schema == undefined) {
    //print_stack();
    console.log("null schema");
    return;
  }
  
  if (ui == undefined)
     ui = new unpack_ctx();
  
  if (schema["type"] == "int32") {
    return unpack_int(data, ui);
  } else if (schema["type"] == "number" || schema["type"] == "float32") {
    return unpack_float(data, ui);
  } else if (schema["type"] == "string") {
    return unpack_string(data, ui);
  } else if (schema["type"] == "static_string") {
    return unpack_static_string(data, ui, schema["maxlength"]);
  } else if (schema["type"] == "object") {
    var obj = {};
    var fields = schema["fields"];
    
    for (var i=0; i<fields.length; i++) {
      obj[fields[i][0]] = this.parse(data, fields[i][1], ui);
    }
    
    return obj;
  } else if (schema["type"] == "schema_object") {
    schema = this.get_schema_name(schema["name"]);
    
    return this.parse(data, schema, ui);
  } else if (schema["type"] == "array") {
    var len = unpack_int(data, ui);
    
    var s = schema["subtype"]
    
    var arr = [];
    for (var i=0; i<len; i++) {
      arr.push(this.parse(data, s, ui));
    }
    
    return arr;
  }
  
  return -1;
}

function test_schema() {
  try {
    var objtest = {"v1" : new Vertex(), "v2" : new Vertex(), "a" : 1};
    
    var bjson = new BJSON();
    
    var schema = bjson.get_schema(objtest);
    var data = bjson.binify(objtest);
    
    console.log(data);
    console.log(JSON.stringify(objtest));
    
    data = new DataView(new Uint8Array(data).buffer);
    
    var json = bjson.parse(data, schema);
    
    console.log(JSON.stringify(json));
  } catch (err) {
    print_stack(err);
  }
  
  bjson = new BJSON();
  var mesh = makeBoxMesh(null);
  
  console.log("generating mesh...");
  for (var i=0; i<4; i++) {
    _quad_subd(mesh, mesh.faces, 1);
  }
  console.log("totvert: ", mesh.verts.length);
  console.log("saving mesh...");
  
  var obj = mesh.toJSON();
  
  schema = bjson.get_schema(mesh);
  var data = bjson.binify(mesh);
  //console.log(data);
  //console.log(schema);
  data = new DataView(new Uint8Array(data).buffer);
  
  console.log("parsing data. . .")
  var obj = bjson.parse(data, schema);
  //var s1 = JSON.stringify(obj);
  //var s2 = JSON.stringify(mesh);
  //console.log(s1);
  console.log("-----====-----");
  //console.log(s2)
  //console.log(s1==s2);
  console.log("finished; testing load");
  
  var m = Mesh.fromJSON(obj);
  
  return true;
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
