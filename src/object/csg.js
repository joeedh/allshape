//assumes an already-sorted DAG
function sort_csg(Scene scene) {
  //find csg roots.  these are objects
  //tagged as csg either a) without parents,
  //or b) whose parents are not themselves
  //tagged as csg.
  
  var roots = new GArray()
  for (var ob in scene.objects) {
    if (!ob.csg) continue;
    if (ob.parent == undefined || !ob.parent.csg)
      roots.push(ob);
  }
  
  
}
