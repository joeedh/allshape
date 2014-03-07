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
  DATAREF: 17,
  DATAREFLIST: 18,
  TRANSFORM : 19 //ui-friendly matrix property
};

var TPropFlags = {PRIVATE : 1, LABEL : 2};

class ToolProperty {
  constructor(type, apiname, uiname, description, flag) {
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

  user_set_data(this_input) { }
  update(prop_this) { }
  api_update(ctx, path) { }

  pack(data) {
    pack_int(data, this.type);
    var unit = this.unit != undefined ? "" : this.unit;
    
    pack_static_string(data, unit, 16);
  }

  unpack(data, unpack_uctx uctx) {
    this.unit = unpack_static_string(data, 16);
    if (this.unit == "")
      this.unit = undefined;
  }

  set_data(data) {
    this.data = data;
    this.api_update(this.ctx, this.path);
    this.update.call(this);
  }

  toJSON() {
    return {type : this.type, data : this.data};
  }

  loadJSON(prop, json) {
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
}

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

class DataRefProperty extends ToolProperty {
  //allowed_types can be either a datablock type,
  //or a set of allowed datablock types.
  constructor(DataBlock value, set<int> allowed_types, apiname, uiname, description, flag) {
    ToolProperty.call(this, PropTypes.DATAREF, apiname, uiname, description, flag);
    
    if (!(allowed_types instanceof set)) {
      if (allowed_types instanceof Array)
        allowed_types = new set(allowed_types);
      else
        allowed_types = new set([allowed_types]);
    }
    
    this.types = allowed_types;
    this.set_data(value);
  }
  
  get_block(ctx) {
    if (this.data == undefined)
      return undefined;
    else
      return ctx.datalib.get(this.data);
  }
 
  set_data(DataBlock value) {
    if (value == undefined) {
      ToolProperty.prototype.set_data.call(this, undefined);
    } else {
      if (!this.types.has(value.lib_type)) {
        console.trace();
        console.log("Invalid datablock type " + value.lib_type + " passed to DataRefProperty.set_value()");
        return;
      }
      
      value = new DataRef(value);
      ToolProperty.prototype.set_data.call(this, value);
    }
  }
}

class RefListProperty extends ToolProperty {
  //allowed_types can be either a datablock integer type id,
  //or a set of allowed datablock integer types.
  constructor(Array<DataBlock> value, set<int> allowed_types, apiname, uiname, description, flag) {
    ToolProperty.call(this, PropTypes.DATAREFLIST, apiname, uiname, description, flag);
    
    if (!(allowed_types instanceof set)) {
      allowed_types = new set([allowed_types]);
    }
    
    this.types = allowed_types;
    this.set_data(value);
  }
  
  set_data(DataBlock value) {
    if (value == undefined) {
      ToolProperty.prototype.set_data.call(this, undefined);
    } else {
      var lst = new DataRefList();
      console.log(this.types);
      for (var i=0; i<value.length; i++) {
        var block = value[i];
        
        if (block == undefined || !this.types.has(block.lib_type)) {
          console.trace();
          if (block == undefined)
            console.log("Undefined datablock in list passed to RefListProperty.set_data");
          else
            console.log("Invalid datablock type " + block.lib_type + " passed to RefListProperty.set_value()");
          continue;
        }
        lst.push(block);
      }
      
      value = lst;
      ToolProperty.prototype.set_data.call(this, value);
    }
  }
}

//flag (bitmask) property.  maskmap maps API names
//to bitmasks (e.g. 1, 2, 4, 8, along with combinatoins, like 1|4, 2|8, etc).
//
//uinames is an {} map from ui names to valid_value's keys (not values)

//ui, range, flag are optional
class FlagProperty extends ToolProperty {
  constructor(value, maskmap, uinames, apiname, uiname, 
              description, range, uirange, flag) 
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

  pack(data) {
    pack_int(this.data);
  }

  set_flag(value) {
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

  unset_flag(value) {
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
}

class FloatProperty extends ToolProperty {
  constructor(i, apiname, uiname, description, range, uirange, flag) {//range, uirange, flag are optional
    ToolProperty.call(this, PropTypes.FLOAT, apiname, uiname, description, flag);
    
    if (uirange == undefined) {
      uirange = range;
    }
    
    this.ui_range = uirange
    this.range = range
    this.data = i;
  }
}

class IntProperty extends ToolProperty {
  constructor (i, apiname, uiname, description, 
               range, uirange, flag) 
  {
    ToolProperty.call(this, PropTypes.INT, apiname, uiname, description, flag);
    
    if (uirange == undefined) {
      uirange = range;
    }
    
    this.ui_range = uirange
    this.range = range
    
    this.data = i;
  }
  
  pack(data) {
    pack_int(this.data);
  }
}

class BoolProperty extends ToolProperty {
  constructor(bool, apiname, uiname, description, flag) {
    ToolProperty.call(this, PropTypes.BOOL, apiname, uiname, description, flag);
    this.data = bool ? true : false;
  }
  
  pack(data) {
    pack_int(this.data);
  }
}

class StringProperty extends ToolProperty {
  constructor(string, apiname, uiname, description, flag) {
    ToolProperty.call(this, PropTypes.STRING, apiname, uiname, description, flag);
    this.data = new String(string)
  }
   
  pack(data) {   
    pack_string(this.data);
  }
}

class TransformProperty extends ToolProperty {
  constructor(value, apiname, uiname, description, flag) {
    ToolProperty.call(this, PropTypes.TRANSFORM, apiname, uiname, description, flag)
    
    if (value != undefined) 
      ToolProperty.prototype.set_data.call(this, new Matrix4UI(value));
  }
}

class EnumProperty extends ToolProperty {
  constructor(string, valid_values, apiname, 
              uiname, description, flag) 
  {
  
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

  copy() {
    var p = new EnumProperty("dummy", {"dummy" : 0}, this.apiname, this.uiname, this.description, this.flag)
    p.keys = Object.create(this.keys);
    p.values = Object.create(this.values);
    p.data = this.data;
    p.ui_value_names = this.ui_value_names;
    p.update = this.update;
    p.api_update = this.api_update;
    
    return p;
  }

  pack(data) {
    pack_string(this.data);
  }

  get_value() {
    if (this.data in this.values)
      return this.values[this.data];
    else
      return this.data;
  }

  set_value(val) {
    if (!(val in this.values) && (val in this.keys))
      val = this.keys[val];
    
    if (!(val in this.values)) {
      console.log(val, this.values);
      console.trace();
      throw new Error("Bad enumeration value " + val);
    }
    
    this.data = new String(val);
  }
}

class Vec3Property extends ToolProperty {
  constructor(vec3, apiname, uiname, description, flag) {
    ToolProperty.call(this, PropTypes.VEC3, apiname, uiname, description, flag);
    
    this.unit = "default";
    this.range = [undefined, undefined]
    this.real_range = [undefined, undefined]
    this.data = new Vector3(vec3);  
  }
}

class ElementBufProperty extends ToolProperty {
  constructor(elements, apiname, uiname, description, flag) {
    ToolProperty.call(this, PropTypes.ELEMENTS, apiname, uiname, description, flag);

    this.data = new GArray(elements);
  }

  pack(data) {
    pack_int(this.data.length);
    for (var i=0; i<this.data.length; i++) {
      pack_int(this.data[i]);
    }
  }
}

class Vec4Property extends ToolProperty {
  constructor(vec4, apiname, uiname, description, flag) {
    ToolProperty.call(this, PropTypes.VEC4, apiname, uiname, description, flag);
  
    this.range = [undefined, undefined]
    this.real_range = [undefined, undefined]
    this.data = new Vector4(vec4);  
  }

  pack(data) {
    pack_vec4(this.data);
  }
}

var UndoFlags = {IGNORE_UNDO: 2}
var ToolFlags = {HIDE_TITLE_IN_LAST_BUTTONS: 1}

class ToolOp extends EventHandler {
  constructor() {
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

  pack(data) {
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

  undo_ignore() {
    this.undoflag |= UndoFlags.IGNORE_UNDO;
  }

  /*private function*/
  _start_modal(Context ctx) {
    ctx.view3d.push_modal(this);
    this.modal_ctx = ctx;
  }

  _end_modal() {
      this.modal_ctx.view3d.pop_modal();
  }

  end_modal() 
  {/*call by inheriting tools*/
      this._end_modal();
  }

  can_call(Context ctx) { return true; }
  exec(Context ctx) { }
  modal_init(Context ctx) { }

  /*default undo implementation simply copies the mesh before running the tool.
    remember when overriding to override undo_pre, too, otherwise the tool will
    be copying the mesh unnecessarily*/
    
  undo_pre(Context ctx) {
    var data1 = new Array<byte>()
    ctx.mesh.pack(data1);
    this._undocpy = new DataView(new Uint8Array(data1).buffer);
  }

  undo(Context ctx) {
    ctx.kill_mesh_ctx(ctx.mesh);
    
    var m2 = new Mesh()
    m2.unpack(this._undocpy, new unpack_ctx())
    m2.render = ctx.mesh.render
    m2.regen_render();
    
    ctx.set_mesh(m2);
  }
}

class ToolMacro extends ToolOp {
  constructor (String name, String uiname, Array<ToolOp> tools=undefined) 
    {
    ToolOp.call(this);
    
    this.name = name;
    this.uiname = uiname;
    
    this.cur_modal = 0;
    
    if (tools == undefined)
      this.tools = new GArray<ToolOp>();
    else
      this.tools = new GArray<ToolOp>(tools);
  }

  add_tool(ToolOp tool) {
    this.tools.push(tool);
    
    if (tool.is_modal)
      this.is_modal = true;
  }

  connect_tools(ToolOp output, ToolOp input) 
  {
    var old_set = input.user_set_data;
    
    input.user_set_data = function() {
      this.data = output.data;
      
      old_set.call(this);
    }
  }

  undo_pre(Context ctx) {
  }

  undo(Context ctx) {
    var tools2 = new GArray<ToolOp>(this.tools);
    tools2.reverse();
    
    for (var op in tools2) {
      //XXX
      op.undo(ctx);
      ctx.set_mesh(g_app_state.mesh); //paranoid check
    }
  }

  exec(Context ctx) {
    for (var op in this.tools) {
      if (op.is_modal)
        op.is_modal = this.is_modal;
      
      for (var k in op.inputs) {
        var p = op.inputs[k];
        if (p.user_set_data != undefined)
          p.user_set_data.call(p);
      }
      
      op.undo_pre(ctx);    
      op.exec(ctx);
    }
  }

  can_call(Context ctx) {
    return this.tools[0].can_call(ctx); //only check with first tool
  }

  modal_init(Context ctx) {
    for (var i=0; i<this.tools.length; i++) {
      var op = this.tools[i];
      
      if (op.is_modal) {
        this.cur_modal = i;
        
        for (var k in op.inputs) {
          var p = op.inputs[k];
          if (p.user_set_data != undefined)
            p.user_set_data.call(p);
        }
        op.modal_ctx = this.modal_ctx;
        
        op.undo_pre(ctx);      
        return op.modal_init(ctx);
      } else {
        for (var k in op.inputs) {
          var p = op.inputs[k];
          if (p.user_set_data != undefined)
            p.user_set_data.call(p);
        }
        
        op.undo_pre(ctx);
        op.exec(ctx);
      }
    }
  }

  _end_modal() {
    var ctx = this.modal_ctx;
    
    this.next_modal(ctx);
  }

  next_modal(Context ctx) {
    
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
  }

  on_mousemove(event) {
    this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
    this.tools[this.cur_modal].on_mousemove(event);
  }

  on_mousedown(event) {
    this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
    this.tools[this.cur_modal].on_mousedown(event);
  }

  on_mouseup(event) {
    this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
    this.tools[this.cur_modal].on_mouseup(event);
  }

  on_keydown(event) {
    this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
    this.tools[this.cur_modal].on_keydown(event);
  }

  on_keyup(event) {
    this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
    this.tools[this.cur_modal].on_keyup(event);
  }

  on_draw(event) {
    this.tools[this.cur_modal].modal_ctx = this.modal_ctx;
    this.tools[this.cur_modal].on_draw(event);
  }
}