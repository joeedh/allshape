"use strict";

class ObjectDuplicateOp extends ToolOp {
  constructor(obs) {
    ToolOp.call(this, "object_duplicate", "Object Duplicate");
    
    this.is_modal = false;
    
    this.inputs = {
      OBJECTS : new RefListProperty(obs, DataTypes.OBJECT, "objects", "Objects", "Objects to duplicate"),
      TRANSFORM : new TransformProperty(undefined, "transform", "Transform", "Transformation to apply to duplicates")
    }
    
    this.outputs = {
      OBJECTS :  new RefListProperty(undefined, DataTypes.OBJECT, "objects", "Objects", "Duplicated objects")
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
    
    for (var ob in this.inputs.OBJECTS.data) {
      console.log(ob);
      var ob2 = ob.copy();
      ob2.data = ob2.data.copy();
        
      datalib.add(ob2.data);
      datalib.add(ob2);
      scene.add(ob2);
      
      if (ob == scene.active)
        scene.set_active(ob2);
    }
    
    for (var ob in list(this.inputs.OBJECTS.data)) {
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