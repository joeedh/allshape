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
  
  recover_dag_graph(clear_existing=false) {
    console.log("Recovering lost scenegraph relationships...");

    if (clear_existing) {
      if (this.graph != undefined)
        this.graph.unlink();
      
      this.graph = new Dag();
    }
    
    for (var ob in this.objects) {
      var dag_node = new ASObject().dag_node;
      ob.dag_node = dag_node;
      dag_node.owner = ob;
      
      this.graph.add(ob);
    }
    
    for (var ob in this.objects) {
      if (ob.parent != undefined) {
        ob.parent = undefined;
        ob.set_parent(this, ob.parent, false);
      }
    }
  }
  
  data_link(block, getblock, getblock_us) {
    this.objects.data_link(this, getblock, getblock_us);
    if (this.graph != undefined)
      this.graph.data_link(this, getblock, getblock_us);
    
    if (this.graph == undefined) {
      this.recover_dag_graph(true);
    } else if (this.graph.nodes.length == 0 && this.objects.length > 0) {
      this.recover_dag_graph(false);
    }
    
    for (var i=0; i<this.objects.length; i++) {
      this.objects[i].lib_adduser(this.sceneobj, this, "sceneobj", SceneObjRem(this, this.objects[i]));
    }
  }
}

Scene.STRUCT = STRUCT.inherit(Scene, DataBlock) + """
  objects : DBList;
  graph : SceneGraph;
}
""";
