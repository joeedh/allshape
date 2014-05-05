"use strict";

/*
  basic design of tool ops:
  
  a carbon copy (sort of) of Blender's tool system.  each tool has
  a list of parameters, and are also passed a Context struct (a sort of
  bundle of common tool paramters).
  
  The main difference is that undo is implemented on top of this system.
  Tools that do not implement undo callbacks will trigger a complete copy
  of the data state.  This is to get new tools up and running quickly; 
  all tools should eventually get their own, faster callbacks (or at least
  inherit from super-classes with faster defaults, like SelectOpAbstract).
  
  Note that for some tools, serialization the app state prior to undo is
  unavoidable.
  
  RULES:
  1. Tools must store all (non-undo) state data in slots.
  
  2. Tools cannot access ANYTHING RELATED TO THE UI within exec.  
     This is to ensure tool repeatability, and maintain the integrity
     of the undostack (which doesn't store things like viewport pans).
     
  3. ToolProperty subclassess MUST NOT STORE REFERENCES (except to basic types like
     strings, ints, etc).  Rather, they must store a value to lookup an object:
        * DataRef structures for DataBlocks (ASObject/Mesh/Scene/etc)
        * integers for Mesh element subtypes (Vertex/Edge/Loops/Face).
*/
/*
  toolop refactor:
  
  1. DROPPED, Constructor should take a single, SavedContext parameter.
  2. XXX, decided against this for now -> Combine inputs and outputs into slots.
  3. Normalize input/output names (e.g. TRANSLATION -> translation).
  4. DONE: Exec only gets ToolContext; access view3d in modal mode,
     with .modal_ctx.
  5. DONE: A RuntimeSavedContext class?  ToolExecContext?
  6. Think about Context's class hierarchy.
  7. Default undo implementation should copy whole program state (other than the toolstack),
     not just the current mesh data.
  8. DONE (for now): Implement an iterator property type.  Perhaps something based on
     a SavedContext-restricted subset of the datapath api?  Note to self:
     do not implement a datapath-based means of linking properties to other
     parts of the data model.  That's better done as an explicit part of the DAG
     solver.
 
  class ToolOp {
    constructor(ctx) {
      //bleh
    }
  }
  
  
*/

var UndoFlags = {
  IGNORE_UNDO      :  2, 
  IS_ROOT_OPERATOR :  4, 
  UNDO_BARRIER     :  8,
  HAS_UNDO_DATA    : 16
};

var ToolFlags = {
  HIDE_TITLE_IN_LAST_BUTTONS : 1, 
  USE_PARTIAL_UNDO           : 2,
  USE_DEFAULT_INPUT          : 4
};

//XXX need to do this properly at some point; toolops should
//an idgen that is saved in each file
var _tool_op_idgen = 1; 

class ToolOpAbstract {
  constructor(apiname, uiname, description=undefined, icon=-1) {
    this.uiname = uiname;
    this.name = apiname;
    this.description = description == undefined ? "" : description;
    this.icon = icon;
    
    this.apistruct = undefined : DataStruct; //may or may not be set
    this.op_id = _tool_op_idgen++;
    this.stack_index = -1;
    
    this.inputs = {};
    this.outputs = {};
  }
  
  get_saved_context() {
    if (this.saved_context == undefined) {
      console.log("warning : invalid saved_context in "+this.constructor.name + ".get_saved_context()");
      this.saved_context = new SavedContext(new Context());
    }
    
    return this.saved_context;
  }
  
  __hash__() : String {
    return "TO" + this.op_id;
  }
  
  exec(tctx) { }
  
  /*set default inputs. note that this is call is not 
    necessary for many modal tools, which generate their
    inputs in modal mode prior to executing.
  
    get_default is a passed in function, of prototype:
      function get_default(keyword, default_value, input_property);
      
    note that this function should never be called in the contextual
    of re-executing (redoing) a tool on the undo stack.
    
    input_property is required, so that we can validate types in the future.
    otherwise we might end up destroying the tool default cache every time
    we modify a tool input.
  */
  default_inputs(Context ctx, ToolGetDefaultFunc get_default) {  }
  
  /*
  static unit_test_req(Context ctx) : ToolOpTestReq {}
  static unit_test(Context ctx) : ToolOpAbstract {}
  
  unit_test_pre(Context ctx) {}
  unit_test_post(Context ctx) {}
  */
}

ToolOpAbstract.STRUCT = """
  ToolOpAbstract {
      flag    : int;
      saved_context  : SavedContext | obj.get_saved_context();
      inputs  : iter(k, PropPair) | new PropPair(k, obj.inputs[k]);
      outputs : iter(k, PropPair) | new PropPair(k, obj.outputs[k]);
  }
"""

class PropPair {
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }
  
  static fromSTRUCT(reader) {
    var obj = {};
    reader(obj);
    return obj;
  }
}
PropPair.STRUCT = """
  PropPair {
    key   : static_string[16];
    value : abstract(ToolProperty);
  }
""";

class ToolOp extends EventHandler, ToolOpAbstract {
  constructor(String apiname="(undefined)", 
              String uiname="(undefined)", 
              String description=undefined,
              int icon=-1) 
  {
    ToolOpAbstract.call(this, apiname, uiname, description, icon);
    EventHandler.call(this);
    
    this.name = apiname;
    this.uiname = uiname;
    
    this.is_modal = false;
    this.undoflag = 0;
    
    this.modal_ctx = null;
    this.flag = 0;
    
    this.inputs = { }
    this.outputs = { }
    
    this.keyhandler = undefined;
    this.parent = undefined; //parent macro
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

  exec_pre(ToolContext tctx) {
    for (var k in this.inputs) {
      if (this.inputs[k].type == PropTypes.COLLECTION) {
        this.inputs[k].ctx = tctx;
      }
    }
    
    for (var k in this.outputs) {
      if (this.outputs[k].type == PropTypes.COLLECTION) {
        this.outputs[k].ctx = tctx;
      }
    }
  }
  
  /*private function*/
  _start_modal(Context ctx) {
    ctx.view3d.push_modal(this);
    this.modal_ctx = ctx;
  }

  _end_modal() {
      this.saved_context = new SavedContext(this.modal_ctx);
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
    this._undocpy = g_app_state.create_undo_file();
  }

  undo(Context ctx) {
    g_app_state.load_undo_file(this._undocpy);
    
    /*
    ctx.kill_mesh_ctx(ctx.mesh);
    
    var m2 = new Mesh()
    m2.unpack(this._undocpy, new unpack_ctx())
    m2.render = ctx.mesh.render
    m2.regen_render();
    
    ctx.set_mesh(m2);
    */
  }
    
  static fromSTRUCT(reader) : ToolOp {
    var op = new ToolOp();
    reader(op);
    
    var ins = {};
    for (var i=0; i<op.inputs.length; i++) {
      ins[op.inputs[i].key] = op.inputs[i].value;
    }
    
    var outs = {};
    for (var i=0; i<op.outputs.length; i++) {
      outs[op.outputs[i].key] = op.outputs[i].value;
    }
    
    op.inputs = ins;
    op.outputs = outs;
    
    return op;
  }
  
  static get_constructor(name) {
    static toolops = undefined;
    
    if (toolops == undefined) {
      toolops = {};
      
      for (var c in defined_classes) {
        if (c instanceof ToolOp) toolops[c.name] = c;
      }
    }
    
    return toolops[c];
  }
}

ToolOp.STRUCT = """
  ToolOp {
      flag    : int;
      saved_context  : SavedContext | obj.get_saved_context();
      inputs  : iter(k, PropPair) | new PropPair(k, obj.inputs[k]);
      outputs : iter(k, PropPair) | new PropPair(k, obj.outputs[k]);
  }
"""

class ToolMacro extends ToolOp {
  constructor (String name, String uiname, Array<ToolOp> tools=undefined) 
    {
    ToolOp.call(this, name, uiname);
    
    this.cur_modal = 0;
    
    if (tools == undefined)
      this.tools = new GArray<ToolOp>();
    else
      this.tools = new GArray<ToolOp>(tools);
  }

  add_tool(ToolOp tool) {
    tool.parent = this;
    
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
      op.undo(ctx);
    }
  }

  exec(ToolContext ctx) {
    for (var i=0; i<this.tools.length; i++) {
      this.tools[i].saved_context = this.saved_context;
    }
    
    for (var op in this.tools) {
      if (op.is_modal)
        op.is_modal = this.is_modal;
      
      for (var k in op.inputs) {
        var p = op.inputs[k];
        if (p.user_set_data != undefined)
          p.user_set_data.call(p);
      }
      
      op.saved_context = this.saved_context;
      
      op.exec_pre(ctx);
      op.undo_pre(ctx);    
      op.undoflag |= UndoFlags.HAS_UNDO_DATA;
      
      op.exec(ctx);
    }
  }

  can_call(Context ctx) {
    return this.tools[0].can_call(ctx); //only check with first tool
  }

  modal_init(Context ctx) {
    for (var i=0; i<this.tools.length; i++) {
      this.tools[i].saved_context = this.saved_context;
    }
    
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
        op.modal_tctx = this.modal_tctx;
        
        op.saved_context = this.saved_context;
        
        op.undo_pre(ctx);
        op.undoflag |= UndoFlags.HAS_UNDO_DATA;
        
        return op.modal_init(ctx);
      } else {
        for (var k in op.inputs) {
          var p = op.inputs[k];
          if (p.user_set_data != undefined)
            p.user_set_data.call(p);
        }
        
        op.saved_context = this.saved_context;
        
        op.exec_pre(ctx);
        op.undo_pre(ctx);
        op.undoflag |= UndoFlags.HAS_UNDO_DATA;
        
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
      this.tools[this.cur_modal].undoflag |= UndoFlags.HAS_UNDO_DATA;
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
  
  static fromSTRUCT(Function reader) : ToolMacro {
    var ret = STRUCT.chain_fromSTRUCT(ToolMacro, reader);
    ret.tools = new GArray(ret.tools);
    
    for (var t in ret.tools) {  
      t.parent = this;
    }
    
    return ret;
  }
}

ToolMacro.STRUCT = STRUCT.inherit(ToolMacro, ToolOp) + """
  tools   : array(abstract(ToolOp));
  apiname : static_string[32];
  uiname  : static_string[32];
}
"""

//generates default toolop STRUCTs/fromSTRUCTS, as needed
//genereated STRUCT/fromSTRUCT should be identical with 
//ToolOp.STRUCT/fromSTRUCT, except for the change in class name.
function init_toolop_structs() {
  global defined_classes;
  
  function gen_fromSTRUCT(cls1) {
    function fromSTRUCT(reader) {
      var op = new cls1();
      //property templates
      var inputs = op.inputs, outputs = op.outputs;
      
      reader(op);
      
      //we need be able to handle new properties
      //so, copy default inputs/output slots,
      //then override.
      var ins = Object.create(inputs), outs = Object.create(outputs);
      
      for (var i=0; i<op.inputs.length; i++) {
        var k = op.inputs[i].key;
        ins[k] = op.inputs[i].value;
        
        if (k in inputs) {
          ins[k].load_ui_data(inputs[k]);
        } else {
          ins[k].uiname = ins[k].apiname = k;
        }
      }
      
      for (var i=0; i<op.outputs.length; i++) {
        var k = op.outputs[i].key;
        outs[k] = op.outputs[i].value;
        
        if (k in outputs) {
          outs[k].load_ui_data(outputs[k]);
        } else {
          outs[k].uiname = outs[k].apiname = k;
        }
      }
      
      op.inputs = ins;
      op.outputs = outs;
      
      return op;
    }
    
    return fromSTRUCT;
  }
  
  for (var i=0; i<defined_classes.length; i++) {
    //only consider classes that inherit from ToolOpAbstract
    var cls = defined_classes[i];
    var ok=false;
    var is_toolop = false;
    
    for (var j=0; j<cls.__clsorder__.length; j++) {
      if (cls.__clsorder__[j] == ToolOpAbstract) {
        ok = true;
      } else if (cls.__clsorder__[j] == ToolOp) {
        ok = true;
        is_toolop = true;
        break;
      }
    }
    if (!ok) continue;
    
    //console.log("-->", cls.name);
    if (!("STRUCT" in cls)) {
      cls.STRUCT = cls.name + " {" + """
        flag    : int;
        inputs  : iter(k, PropPair) | new PropPair(k, obj.inputs[k]);
        outputs : iter(k, PropPair) | new PropPair(k, obj.outputs[k]);
      """
      if (is_toolop)
        cls.STRUCT += "    saved_context  : SavedContext | obj.get_saved_context();\n";
      
      cls.STRUCT += "  }";
    }
    
    if (!("fromSTRUCT" in cls.__statics__)) {
      cls.fromSTRUCT = gen_fromSTRUCT(cls);
      define_static(cls, "fromSTRUCT", cls.fromSTRUCT);
    }
  }
}