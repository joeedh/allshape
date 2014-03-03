"use strict";

class ObjectDuplicateOp extends ToolOp {
  constructor(obs) {
    ToolOp.call(this);
    
    this.name = "object_duplicate";
    this.uiname = "Object Duplicate"
    
    this.is_modal = false;
    
    this.inputs = {
      OBJECTS : new RefListProperty(obs, DataTypes.OBJECT, "objects", "Objects", "Objects to duplicate"),
      TRANSFORM : new TransformProperty(undefined, "transform", "Transform", "Transformation to apply to duplicates")
    }
    
    this.outputs = {
      OBJECTS :  new RefListProperty(obs, DataTypes.OBJECT, "objects", "Objects", "Duplicated objects")
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
      scene.objects.push(ob2);
      
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

