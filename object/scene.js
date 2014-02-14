"use strict";

function Scene(name) {
  if (name == undefined)
    name = "Scene";
  
  //name is optional
  DataBlock.call(DataTypes.SCENE, name);
  
  this.objects = new DBList();
  this.graph = new SceneGraph();
}
inherit(Scene, DataBlock);

Scene.STRUCT = STRUCT.inherit(Scene, DataBlock) + """
  objects : DBList;
}
""";

Scene.fromSTRUCT = function(unpacker) {
  var sce = new Scene();
  unpacker(sce);
  
  this.init_from_pack();
  return sce;
}

Scene.prototype.update = function()
{
  this.graph.exec();
}

Scene.prototype.add = function(ASObject ob)
{
  this.objects.push(ob);
  this.graph.add(ob);
  
  ob.scene = this;
  ob.lib_adduser(this, "sceneobj", SceneObjRem(this, ob));
  
  if (this.objects.active == undefined) {
    this.set_active(ob);
  }
}

Scene.prototype.set_active = function(ASObject ob) {
  this.objects.active = ob;
}

Scene.prototype.remove = function(ASObject ob)
{
  //this.objects.remove(ob);
  //this.graph.remove(ob);
  
  //this should do the necessary unlinking for us
  ob.lib_remuser(this, "sceneobj");
}

Scene.prototype.pack = function(data) {
  DataBlock.prototype.pack.call(this, data);
  
  this.objects.pack(data);
  this.graph.pack();
}

Scene.unpack = function(data, uctx) {
  var sce = new Scene();
  
  DataBlock.prototype.unpack.call(this, data, uctx);
  
  this.objects = unpack_garray(data, uctx, unpack_dataref);
  this.graph = SceneGraph.unpack(data, uctx);
}

Scene.prototype.data_link = function(block, getblock, getblock_us) {
  this.objects.data_link(this, getblock, getblock_us);
  this.graph.data_link(this, getblock, getblock_us);
  
  for (var i=0; i<this.objects.length; i++) {
    this.objects[i].lib_adduser(this.sceneobj, this, "sceneobj", SceneObjRem(this, this.objects[i]));
  }
}
