"use strict";

class ObjectDuplicateOp extends ToolOp {
  constructor(obs) {
    ToolOp.call(this, "object_duplicate", "Object Duplicate", "Duplicate selected objects");
    
    this.is_modal = false;
    
    this.inputs = {
      objects : new RefListProperty(obs, DataTypes.OBJECT, "objects", "Objects", "Objects to duplicate"),
      transform : new TransformProperty(undefined, "transform", "Transform", "Transformation to apply to duplicates")
    }
    
    this.outputs = {
      objects :  new RefListProperty(undefined, DataTypes.OBJECT, "objects", "Objects", "Duplicated objects")
    }
  }
  
  can_call(ctx) {
    return (ctx.scene.objects.selected.length > 0);
  }
  
  exec(ctx) {
    console.log("in object duplicate op");
    
    var obs = new GArray();
    
    var datalib = ctx.datalib;
    var scene = ctx.scene;
    var active = undefined;
    
    for (var ob in this.inputs.objects.data) {
      console.log(ob);
      var ob2 = ob.copy();
      ob2.data = ob2.data.copy();
        
      datalib.add(ob2.data);
      datalib.add(ob2);
      scene.add(ob2);
      
      if (ob == scene.active)
        scene.set_active(ob2);
    }
    
    for (var ob in list(this.inputs.objects.data)) {
      scene.objects.select(ob, false);
    }
    
    for (var ob in obs) {
      scene.objects.select(ob);
    }
  }
}

class SelectObjAbstract extends ToolOp {
  constructor(String apiname, String uiname) {
    ToolOp.call(this, apiname, uiname);
    this._undo_presel = new GArray();
    this._undo_active = undefined;
  }
  
  undo_pre(ctx) {
    var sce = ctx.scene;
    
    for (var ob in sce.objects.selected) {
      this._undo_presel.push(new DataRef(ob));
    }
    
    this._undo_active = sce.objects.active != undefined ? new DataRef(sce.objects.active) : undefined;
  }
  
  undo(ctx) {
    var scene = ctx.scene;
    
    scene.objects.clear_select();
    for (var ob in this._undo_presel) {
      var ob = ctx.datalib.get(ob);
      scene.objects.select(ob, true);
    }
    
    if (this._undo_active != undefined)
      scene.objects.set_active(ctx.datalib.get(this._undo_active));
  }
}

class SelectObjectOp extends SelectObjAbstract {
  constructor(mode, set_active=true) {
    SelectObjAbstract.call(this, "select", "Select");
    
    this.is_modal = false;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    var mode_vals = ["set", "add", "subtract"];
    
    this.inputs = {
      objects : new RefListProperty([], new set([DataTypes.OBJECT]), "objects", "Objects", "Objects to select/deselect"),
      mode : new EnumProperty(mode, mode_vals, "mode", "Mode", "mode"),
      set_active : new BoolProperty(set_active, "set_active", "Set active", "sets active object, but only if len of objects is one")
    }
    
    this.outputs = {};
  }
  
  can_call(ctx) {
    return true;
  }
  
  exec(ctx) {
    console.log("in object select op");
    var mode = this.inputs.mode.data;
    var sce = ctx.scene;
    
    if (mode == "set") {
      console.log("set mode");
      sce.objects.clear_select();
      
      for (var ob in this.inputs.objects.data) {
        console.log("selecting ob " + ob.lib_id);
        sce.objects.select(ob, true);
      }
    } else {
      var mode2 = (mode == "add" ? true : false);
      for (var ob in this.inputs.objects.data) {
        sce.objects.select(ob, mode2);
      }
    }
    
    if (this.inputs.set_active.data && this.inputs.objects.data.length == 1) {
      var ob = this.inputs.objects.data.get(0);
      
      console.log("------------>", mode);
      if (mode != "subtract") {
        sce.objects.set_active(ob);
      } else if (ob == sce.objects.active) {
        console.log("setting new active");
        if (sce.objects.selected.length > 0) {
          sce.objects.set_active(sce.objects.selected[sce.objects.selected.length-1]);
        }
      }
    }
  }
}

class ToggleSelectObjOp extends SelectObjAbstract {
  constructor(mode="auto") {
    SelectObjAbstract.call(this, "select_all", "Select All");
    
    this.is_modal = false;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    var mode_vals = ["select", "deselect", "auto"];
    
    this.inputs = {
      mode : new EnumProperty(mode, mode_vals, "mode", "Mode", "mode"),
    }
    
    this.outputs = {};
  }
  
  can_call(ctx) {
    return true;
  }
  
  exec(ctx) {
    console.log("in object select op");
    var mode = this.inputs.mode.data;
    var sce = ctx.scene;
    
    if (mode == "auto") {
      mode = sce.objects.selected.length > 0 ? "deselect" : "select";
    }
    
    if (mode == "deselect") {
      sce.objects.clear_select();
    } else {
      for (var ob in sce.objects) {
        sce.objects.select(ob);
      }
    }
  }
}

class ObjectParentOp extends ToolOp {
  constructor() {
    ToolOp.call(this, "set_parent", "Set Parent");
    
    this.is_modal = false;
    
    this.inputs = {
      parent  : new DataRefProperty(undefined, [DataTypes.OBJECT], "parent", "Parent", "Object to use as parent"),
      objects : new CollectionProperty(undefined, [ASObject], "objects", "Children", "Child objects"),
      preserve_child_space : new BoolProperty(true, "preserve_child_space", "Keep Child Space", "Preserve child transformation space")
    };
    
    this.outputs = {
    };
  }
  
  can_call(Context ctx) {
    static empty_ret = new GArray([]);
    
    var objs = this.inputs.objects.data != undefined ? list(this.inputs.objects.data) : empty_ret;
    return this.inputs.parent.data != undefined && objs.length > 0;
  }
  
  default_inputs(Context ctx, ToolGetDefaultFunc getdefault) {
    if (ctx.object == undefined) return;
    
    this.inputs.parent.set_data(ctx.object);
    var obset = new set(ctx.scene.objects.selected);
    
    if (obset.has(ctx.object))
      obset.remove(ctx.object);
    
    this.inputs.preserve_child_space.set_data(getdefault("preserve_child_space", true, this.inputs.preserve_child_space));
    this.inputs.objects.set_data(new DataRefList(obset));
  }
  
  exec(ToolContext ctx) {
    console.log("in object parent exec", this);
    var ob = this.inputs.parent.get_block(ctx);
    var scene = ctx.scene;
    
    var i = 0;
    for (var ob2 in this.inputs.objects) {
      if (i == 10) break;
      console.log("setting parent " + ob.lib_id + " for " + ob2.lib_id)
      console.log(ob2.parent);
      
      if (ob2 == ob) {
        console.trace();
        console.log("WARNING: bad input in ObjectParentOp.exec()");
        i++;
        continue;
      }
      
      if (i == 0)
        ob2.set_parent(scene, ob, this.inputs.preserve_child_space.data);
      i++;
      
    }
  }
}

//first test of datalib user system!
//note that, by necessity this will
//serialize the entire app state
//for undo
class ObjectDeleteOp extends ToolOp {
  constructor() {
    ToolOp.call(this, "object_delete", "Delete Object");
    
    this.is_modal = false;
    
    this.inputs = {
      objects : new CollectionProperty(undefined, [ASObject], "objects", "Objects", "Objects to delete")
    }
    
    this.outputs = {};
  }
  
  can_call(ctx) {
    console.log("selmode: ", ctx.view3d.selectmode, "ret: ", ctx.view3d.selectmode == EditModes.OBJECT);
    return ctx.view3d.selectmode == EditModes.OBJECT;
  }
  
  default_inputs(Context ctx, ToolGetDefaultFunc get_default) {  
    console.log("yay, default input!");
    this.inputs.objects.ctx = ctx;
    this.inputs.objects.set_data(new DataRefList(ctx.scene.objects.selected));
  }
  
  exec(ToolContext ctx) {
    if (this.inputs.objects.data == undefined) {
      console.trace();
      console.log("warning: deleteobjectop.exec called with empty input");
      return;
    }
    
    console.log(list(this.inputs.objects.data));
    for (var ob in this.inputs.objects.data) {
      console.log("destroying ob ", ob.lib_id);
      ctx.datalib.kill_datablock(ob);
    }
  }
}
