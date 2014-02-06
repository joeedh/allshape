"use strict";

function Scene(name) {
  //name is optional
  prior(Scene, this).call(DataTypes.SCENE, name);
  
  this.objects = new GArray();
  this.graph = new SceneGraph();
  this.active = undefined;
  this.selection = new set();
}
inherit(Scene, DataBlock);

Scene.prototype.update = function()
{
  this.graph.exec();
}

Scene.prototype.add = function(ASObject ob)
{
  this.objects.push(ob);
  this.graph.add(ob);
  
  ob.lib_adduser(this, "sceneobj", SceneObjRem(this, ob));
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
  
  pack_dataref(data, this.active);
  this.selection.pack(data);
}

Scene.unpack = function(data, uctx) {
  var sce = new Scene();
  
  DataBlock.prototype.unpack.call(this, data, uctx);
  
  this.objects = unpack_garray(data, uctx, unpack_dataref);
  this.graph = SceneGraph.unpack(data, uctx);
  this.active = unpack_dataref(data, uctx);
  this.selection = unpack_garray(data, uctx, unpack_dataref);
}

Scene.prototype.data_link = function(block, getblock) {
  this.active = getblock(this, this.active, "active");
  this.graph.data_link(this, getblock);
  
  for (var i=0; i<this.objects.length; i++) {
    this.objects[i] = getblock(this, this.objects[i], "", false);
    this.objects[i].lib_adduser(this, "sceneobj", SceneObjRem(this, this.objects[i]));
  }
  
  var newsel = new GArray();
  for (var i=0; i<this.selection.length; i++) {
    newsel.push(getblock(this, this.selection[i], "selection", false));
  }
  
  this.selection = new set();
  for (var i=0; i<newsel.length; i++) {
    if (newsel[i] != undefined) {
      this.selection.add(newsel[i]);
    } else {
      console.log("Warning: corrupted object selection list");
    }
  }
}
