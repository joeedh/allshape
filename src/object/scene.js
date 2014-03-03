"use strict";

class Scene extends DataBlock {
  constructor(name) {
    if (name == undefined)
      name = "Scene";
    
    //name is optional
    DataBlock.call(this, DataTypes.SCENE, name);
    
    this.objects = new DBList();
    this.graph = new SceneGraph();
  }
  
  copy() {
    var sce = new Scene(this.name)
    sce.objects = new DBList();
    
    for (var o in this.objects) {
      sce.objects.push(o);
    }
    
    for (var o in this.objects.selected) {
      sce.objects.select(o);
    }
    
    sce.active = this.active;
    return sce;
  }
  
  static fromSTRUCT(unpacker) {
    var sce = new Scene();
    unpacker(sce);
    
    sce.init_from_pack();
    return sce;
  }

  update() {
    if (RELEASE) {
      try {
        this.graph.exec();
      } catch (err) {
        print_stack(err);
        console.log("Error updating DAG graph!");
      }
    } else {
      this.graph.exec();
    }
  }

  add(ASObject ob) {
    this.objects.push(ob);
    this.graph.add(ob);
    
    ob.scene = this;
    ob.lib_adduser(this, "sceneobj", SceneObjRem(this, ob));
    
    if (this.objects.active == undefined) {
      this.set_active(ob);
    }
  }

  set_active(ASObject ob) {
    this.objects.active = ob;
    this.objects.select(ob);
  }

  remove(ASObject ob) {
    //this.objects.remove(ob);
    //this.graph.remove(ob);
    
    //this should do the necessary unlinking for us
    ob.lib_remuser(this, "sceneobj");
  }

  pack(data) {
    DataBlock.prototype.pack.call(this, data);
    
    this.objects.pack(data);
    this.graph.pack();
  }

  static unpack(data, uctx) {
    var sce = new Scene();
    
    DataBlock.prototype.unpack.call(this, data, uctx);
    
    this.objects = unpack_garray(data, uctx, unpack_dataref);
    this.graph = SceneGraph.unpack(data, uctx);
  }

  data_link(block, getblock, getblock_us) {
    this.objects.data_link(this, getblock, getblock_us);
    this.graph.data_link(this, getblock, getblock_us);
    
    for (var i=0; i<this.objects.length; i++) {
      this.objects[i].lib_adduser(this.sceneobj, this, "sceneobj", SceneObjRem(this, this.objects[i]));
    }
  }
}

Scene.STRUCT = STRUCT.inherit(Scene, DataBlock) + """
  objects : DBList;
}
""";
