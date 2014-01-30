"use strict";

function Scene(name) {
  //name is optional
  prior(Scene, this).call(DataTypes.SCENE, name);
  
  this.objects = new GArray();
  this.scenegraph = new SceneGraph();
}
