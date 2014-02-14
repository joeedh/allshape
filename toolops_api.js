"use strict";

/*ops are all passed a Context structure*/

//synced with MPropTypes
var PropTypes = {
  INT: 0,
  FLOAT: 1,
  FLOAT_ARRAY: 2,
  INT_ARRAY: 3,
  STRING: 4,
  ELEMENTS: 5,
  VEC3: 6,
  VEC4: 7,
  BOOL:  8,
  //end of MPropTypes types
  COLOR3: 9,
  COLOR4: 10,
  NORMAL: 11,
  MATRIX3: 12,
  MATRIX4: 13,
  ENUM: 14,
  STRUCT: 15, //internal type to data api
  FLAG: 16,
};

var TPropFlags = {PRIVATE : 1, LABEL : 2};

/*all property constructors make copies of passed in parameters, e.g. strings, vectors*/
function ToolProperty(type, apiname, uiname, description, flag) {
  this.type = type;
  this.data = null;
  this.apiname = apiname;
  if (uiname == undefined)
    uiname = apiname;
    
  this.uiname = uiname;
  this.flag = flag;
  this.description = description;
  
  this.userdata = undefined
  
  this.ctx = undefined;
  this.path = undefined;
  
  this.hotkey_ref = undefined;
  this.unit = undefined;
  
}
create_prototype(ToolProperty);

/*
ToolProperty.STRUCT = """
  ToolProperty {
    type : int;
    apiname : static_string[32] | obj.apiname ? obj.apiname : "";
    uiname : static_string[32] | obj.uiname ? obj.uiname : "";
    flag : int;
    unit : static_string[16];
  }
""";
*/

ToolProperty.prototype.user_set_data = function(this_input) { }
ToolProperty.prototype.update = function(prop_this) { }
ToolProperty.prototype.api_update = function(ctx, path) { }

ToolProperty.prototype.pack = function(data) {
  pack_int(data, this.type);
  var unit = this.unit != undefined ? "" : this.unit;
  
  pack_static_string(data, unit, 16);
}

ToolProperty.prototype.unpack = function(data, unpack_uctx uctx) {
  this.unit = unpack_static_string(data, 16);
  if (this.unit == "")
    this.unit = undefined;
}

ToolProperty.prototype.set_data = function(data) {
  this.data = data;
  this.api_update(this.ctx, this.path);
  this.update(this);
}

ToolProperty.prototype.toJSON = function() {
  return {type : this.type, data : this.data};
}

ToolProperty.prototype.loadJSON = function(prop, json) {
  switch (json.type) {
  case PropTypes.INT:
  case PropTypes.FLOAT:
  case PropTypes.STRING:
  case PropTypes.BOOL:
  case PropTypes.FLOAT_ARRAY:
  case PropTypes.INT_ARRAY:
  case PropTypes.ENUM:
  case PropTypes.FLAG:
    prop.set_data(json.data);
    break;
  case PropTypes.ELEMENTS:
    prop.set_data(new GArray(json.data));
    break;
  case PropTypes.VEC3:
    prop.set_data(new Vector3(json.data));
    break;
  case PropTypes.VEC4:
    prop.set_data(new Vector4(json.data));
    break;
  }
}

//flag (bitmask) property.  maskmap maps API names
//to bitmasks (e.g. 1, 2, 4, 8, along with combinatoins, like 1|4, 2|8, etc).
//
//uinames is an {} map from ui names to valid_value's keys (not values)
function FlagProperty(value, maskmap, uinames, apiname, uiname, description, range, uirange, flag) //ui, range, flag are optional
{
  ToolProperty.call(this, PropTypes.FLAG, apiname, uiname, description, flag);
  
  this.data = 0 : int;
  
  if (uinames == undefined) {
    this.ui_value_names = {}
    
    for (var k in maskmap) {
      var key = k[0].toUpperCase() + k.slice(1, k.length).toLowerCase();
      key = key.replace("_", " ").replace("-", " ");
      
      this.ui_value_names[key] = k;
    }
  } else {
    this.ui_value_names = uinames;
  }
  
  this.keys = {}
  this.values = {}
  
  for (var k in maskmap) {
    this.values[maskmap[k]] = maskmap[k];
    this.keys[k] = maskmap[k];
  }
  
  this.set_flag(value);  
}
inherit(FlagProperty, ToolProperty);

FlagProperty.prototype.pack = function(data) {
  pack_int(this.data);
}

FlagProperty.prototype.set_flag = function(value) {
  var flag;
  if (this.values.hasOwnProperty(value)) {
     flag = value;
  } else if (this.keys.hasOwnProperty(value)) {
    flag = this.keys[value];
  } else {
    console.log(value, this.values);
    console.trace();
    throw new Error("Bad flag value");
  }
  
  this.data |= flag;
}

FlagProperty.prototype.unset_flag = function(value) {
  var flag;
  if (this.values.hasOwnProperty(value)) {
     flag = value;
  } else if (this.keys.hasOwnProperty(value)) {
    flag = this.keys[value];
  } else {
    console.log(value, this.values);
    console.trace();
    throw new Error("Bad flag value");
  }
  
  this.data &= ~flag;
}

function FloatProperty(i, apiname, uiname, description, range, uirange, flag) {//range, uirange, flag are optional
  ToolProperty.call(this, PropTypes.FLOAT, apiname, uiname, description, flag);
  
  if (uirange == undefined) {
    uirange = range;
  }
  
  this.ui_range = uirange
  this.range = range
  this.data = i;
}
inherit(FloatProperty, ToolProperty);

function IntProperty(i, apiname, uiname, description, range, uirange, flag) {
  ToolProperty.call(this, PropTypes.INT, apiname, uiname, description, flag);
  
  if (uirange == undefined) {
    uirange = range;
  }
  
  this.ui_range = uirange
  this.range = range
  
  this.data = i;
}
inherit(IntProperty, ToolProperty);

IntProperty.prototype.pack = function(data) {
  pack_int(this.data);
}

function BoolProperty(bool, apiname, uiname, description, flag) {
  ToolProperty.call(this, PropTypes.BOOL, apiname, uiname, description, flag);
  
  this.data = bool ? true : false;
}
inherit(BoolProperty, ToolProperty);

BoolProperty.prototype.pack = function(data) {
  pack_int(this.data);
}

function StringProperty(string, apiname, uiname, description, flag) {
  ToolProperty.call(this, PropTypes.STRING, apiname, uiname, description, flag);
  
  this.data = new String(string)
}
inherit(StringProperty, ToolProperty);

StringProperty.prototype.pack = function(data) {
  pack_string(this.data);
}

function EnumProperty(string, valid_values, apiname, uiname, description, flag) {
  ToolProperty.call(this, PropTypes.ENUM, apiname, uiname, description, flag);
  
  this.values = {}
  this.keys = {};
  this.ui_value_names = {}
  
  if (valid_values instanceof Array || valid_values instanceof String) {
    for (var i=0; i<valid_values.length; i++) {
      this.values[valid_values[i]] = valid_values[i];
      this.keys[valid_values[i]] = valid_values[i];
    }
  } else {
    for (var k in valid_values) {
      this.values[k] = valid_values[k];
      this.keys[valid_values[k]] = k;
    }
  }
  
  if (string == undefined) {
    this.data = Iterator(valid_values).next();
  } else {
    this.set_value(string);
  }
  
  for (var k in this.values) {
    this.ui_value_names[k] = k[0].toUpperCase() + k.slice(1, k.length);
  }
}
inherit(EnumProperty, ToolProperty);

EnumProperty.prototype.pack = function(data) {
  pack_string(this.data);
}

EnumProperty.prototype.set_value = function(val) {
  if (!this.values.hasOwnProperty(val)) {
    console.log(val, this.values);
    console.trace();
    throw new Error("Bad enumeration value");
  }
  
  this.data = new String(val);
}

function Vec3Property(vec3, apiname, uiname, description, flag) {
  ToolProperty.call(this, PropTypes.VEC3, apiname, uiname, description, flag);
  
  this.unit = "default";
  this.range = [undefined, undefined]
  this.real_range = [undefined, undefined]
  this.data = new Vector3(vec3);  
}
inherit(Vec3Property, ToolProperty);

function ElementBufProperty(elements, apiname, uiname, description, flag) {
  ToolProperty.call(this, PropTypes.ELEMENTS, apiname, uiname, description, flag);
  
  this.data = new GArray(elements);
}
inherit(ElementBufProperty, ToolProperty);

ElementBufProperty.prototype.pack = function(data) {
  pack_int(this.data.length);
  for (var i=0; i<this.data.length; i++) {
    pack_int(this.data[i]);
  }
}

function Vec4Property(vec4, apiname, uiname, description, flag) {
  ToolProperty.call(this, PropTypes.VEC4, apiname, uiname, description, flag);
  
  this.range = [undefined, undefined]
  this.real_range = [undefined, undefined]
  this.data = new Vector4(vec4);  
}
inherit(Vec4Property, ToolProperty);

Vec4Property.prototype.pack = function(data) {
  pack_vec4(this.data);
}

var UndoFlags = {IGNORE_UNDO: 2}
var ToolFlags = {HIDE_TITLE_IN_LAST_BUTTONS: 1}

function ToolOp() {
  EventHandler.call(this);
  
  this.name = "(undefined)"
  this.uiname = "(undefined)"
  
  this.is_modal = false;
  this.undoflag = 0;
  
  this.modal_ctx = null;
  this.flag = 0;
  
  this.inputs = { }
  this.outputs = { }
  
  this.keyhandler = undefined;
}

inherit(ToolOp, EventHandler);

ToolOp.prototype.pack = function(data) {
  pack_static_string(data, this.constructor.name, 32);
  pack_static_string(data, this.name, 32);
  pack_static_string(data, this.uiname, 32);
  
  var ilen=0, olen=0;
  for (var k in this.inputs) ilen++;
  for (var k in this.outputs) olen++;
  
  pack_int(data, ilen);
  pack_int(data, olen);
  
  for (var k in this.inputs) {
    this.inputs[k].pack(data);
  }
  
  for (var k in this.outputs) {
    this.outputs[k].pack(data);
  }
}

ToolOp.prototype.undo_ignore = function() {
  this.undoflag |= UndoFlags.IGNORE_UNDO;
}

/*private function*/
ToolOp.prototype._start_modal = function(Context ctx) {
  ctx.view3d.push_modal(this);
  this.modal_ctx = ctx;
}

ToolOp.prototype._end_modal = function() {
    this.modal_ctx.view3d.pop_modal();
}

ToolOp.prototype.end_modal = function() 
{/*call by inheriting tools*/
    this._end_modal();
}

ToolOp.prototype.can_call = function(Context ctx) { return true; };
ToolOp.prototype.exec = function(Context ctx) { };
ToolOp.prototype.modal_init = function(Context ctx) { };

/*default undo implementation simply copies the mesh before running the tool.
  remember when overriding to override undo_pre, too, otherwise the tool will
  be copying the mesh unnecessarily*/
  
ToolOp.prototype.undo_pre = function(Context ctx) {
  var data1 = new Array<byte>()
  ctx.mesh.pack(data1);
  this._undocpy = new DataView(new Uint8Array(data1).buffer);
};

ToolOp.prototype.undo = function(Context ctx) {
  ctx.kill_mesh_ctx(ctx.mesh);
  
  var m2 = new Mesh()
  m2.unpack(this._undocpy, new unpack_ctx())
  m2.render = ctx.mesh.render
  m2.regen_render();
  
  ctx.set_mesh(m2);
};

function ToolMacro(String name, String uiname, Array<ToolOp> tools) { //tools is optional
  ToolOp.call(this);
  
  this.name = name;
  this.uiname = uiname;
  
  this.cur_modal = 0;
  
  if (tools == undefined)
    this.tools = new GArray<ToolOp>();
  else
    this.tools = new GArray<ToolOp>(tools);
}

inherit(ToolMacro, ToolOp);

ToolMacro.prototype.add_tool = function(ToolOp tool) {
  this.tools.push(tool);
  
  if (tool.is_modal)
    this.is_modal = true;
}

ToolMacro.prototype.connect_tools = function(ToolOp output, ToolOp input) 
{
  var old_set = input.user_set_data;
  
  input.user_set_data = function(ToolProperty input2) {
    input2.data = output.data;
    
    old_set(input2);
  }
}

ToolMacro.prototype.undo_pre = function(Context ctx) {
};

ToolMacro.prototype.undo = function(Context ctx) {
  var tools2 = new GArray<ToolOp>(this.tools);
  tools2.reverse();
  
  for (var op in tools2) {
    //XXX
    op.undo(ctx);
    ctx.set_mesh(g_app_state.mesh); //paranoid check
  }
};

ToolMacro.prototype.exec = function(Context ctx) {
  for (var op in this.tools) {
    if (op.is_modal)
      op.is_modal = this.is_modal;
    
    for (var k in op.inputs) {
      var p = op.inputs[k];
      if (p.user_set_data != undefined)
        p.user_set_data(p);
    }
    
    op.undo_pre(ctx);    
    op.exec(ctx);
  }
};

ToolMacro.prototype.can_call = function(Context ctx) {
  return this.tools[0].can_call(ctx); //only check with first tool
};

ToolMacro.prototype.modal_init = function(Context ctx) {
  for (var i=0; i<this.tools.length; i++) {
    var op = this.tools[i];
    
    if (op.is_modal) {
      this.cur_modal = i;
      
      for (var k in op.inputs) {
        var p = op.inputs[k];
        if (p.user_set_data != undefined)
          p.user_set_data(p);
      }
      op.modal_ctx = this.modal_ctx;
      
      op.undo_pre(ctx);      
      return op.modal_init(ctx);
    } else {
      for (var k in op.inputs) {
        var p = op.inputs[k];
        if (p.user_set_data != undefined)
          p.user_set_data(p);
      }
      
      op.undo_pre(ctx);
      op.exec(ctx);
    }
  }
};

ToolMacro.prototype._end_modal = function() {
  var ctx = this.modal_ctx;
  
  this.next_modal(ctx);
}

ToolMacro.prototype.next_modal = function(Context ctx) {
  
  this.tools[this.cur_modal].end_modal(ctx);
  
  this.cur_modal++;
  
  while (this.cur_modal < this.tools.length && !this.tools[this.cur_modal].is_modal)
    this.cur_modal++;
    
  if (this.cur_modal >= this.tools.length) {
    prior(ToolMacro, this)._end_modal();
  } else {
    this.tools[this.cur_modal].undo_pre(ctx);
    this.tools[this.cur_modal].modal_init(ctx);
  }
};

ToolMacro.prototype.on_mousemove = function(event) {
  this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
  this.tools[this.cur_modal].on_mousemove(event);
}

ToolMacro.prototype.on_mousedown = function(event) {
  this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
  this.tools[this.cur_modal].on_mousedown(event);
}

ToolMacro.prototype.on_mouseup = function(event) {
  this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
  this.tools[this.cur_modal].on_mouseup(event);
}

ToolMacro.prototype.on_keydown = function(event) {
  this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
  this.tools[this.cur_modal].on_keydown(event);
}

ToolMacro.prototype.on_keyup = function(event) {
  this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
  this.tools[this.cur_modal].on_keyup(event);
}

ToolMacro.prototype.on_draw = function(event) {
  this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
  this.tools[this.cur_modal].on_draw(event);
}
