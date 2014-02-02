"use strict";

function Scene(name) {
  //name is optional
  prior(Scene, this).call(DataTypes.SCENE, name);
  
  this.objects = new GArray();
  this.graph = new SceneGraph();
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
}

Scene.prototype.remove = function(ASObject ob)
{
  this.objects.remove(ob);
  this.graph.remove(ob);
}