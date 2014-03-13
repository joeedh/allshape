"use strict";

/*
  basic design of tool ops:
  
  a carbon copy (sort of) of Blender's tool system.  each tool has
  a list of parameters, and are also passed a Context struct (a kindof
  bundle of common tool paramters).
  
  The main difference is that undo is implemented on top of this system.
  Tools that do not implement undo callbacks will trigger a complete copy
  of the data state.  This is to get new tools up and running quickly; 
  all tools should eventually get their own, faster callbacks (or at least
  inherit from super-classes with faster defaults, like SelectOpAbstract).
  
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
  
  1. Constructor should take a single, SavedContext parameter.
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

class ToolOpAbstract {
  constructor(apiname, uiname) {
    this.uiname = "";
    this.name = "";
    
    this.inputs = {};
    this.outputs = {};
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
  default_inputs(Context ctx, ToolGetDefaultFunc get_default) {  
  }
}

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
    key   : static_string[12];
    value : abstract(ToolProperty);
  }
""";

var UndoFlags = {IGNORE_UNDO: 2};

var ToolFlags = {
  HIDE_TITLE_IN_LAST_BUTTONS: 1, 
  USE_PARTIAL_UNDO : 2,
  USE_DEFAULT_INPUT : 4
};

class ToolOp extends EventHandler, ToolOpAbstract {
  constructor(apiname="(undefined)", uiname="(undefined)") {
    ToolOpAbstract.call(this, apiname, uiname);
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
  
  //NOTE: this method can returned undefined!!!
  static fromSTRUCT(reader) {
    //okay. . .this is going to be complicated.
    var obj = Object.create(Object.prototype);
    reader(obj);
    
    var inputs = {};
    var outputs = {};
    
    for (var i=0; i<obj.inputs.length; i++) {
      inputs[obj.inputs[i].key] = obj.inputs[i].value;
    }
    
    for (var i=0; i<obj.outputs.length; i++) {
      outputs[obj.outputs[i].key] = obj.outputs[i].value;
    }
    
    obj.inputs = inputs;
    obj.outputs = outputs;
    
    var con = get_constructor(obj.constructor);
    
    if (con == undefined) {
      console.trace()
      if (RELEASE) {
        console.log("ERROR: invalid toolop constructor " + obj.constructor);
        console.log("ignoring!");
        
        return undefined;
      } else {
        throw new Error("Invalid toolop constructor " + obj.constructor);
      }
    }
    
    var op = new con();
    for (var k in inputs) {
      op.inputs[k].set_data(inputs[k].data);
    }
    
    for (var k in outputs) {
      op.outputs[k].set_data(outputs[k].data);
    }
    
    op.flag = obj.flag;
    
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
  constructor : static_string[32] | obj.constructor.name;
  flag : int;
  inputs  : iter(k, PropPair) | new PropPair(k, obj.inputs[k]);
  outputs : iter(k, PropPair) | new PropPair(k, obj.outputs[k]);
  ctx : SavedContext | obj.saved_context;
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
      op.exec_pre(ctx);
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
        op.modal_tctx = this.modal_tctx;
        
        op.undo_pre(ctx);      
        return op.modal_init(ctx);
      } else {
        for (var k in op.inputs) {
          var p = op.inputs[k];
          if (p.user_set_data != undefined)
            p.user_set_data.call(p);
        }
        
        op.undo_pre(ctx);
        op.exec_pre(ctx);
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