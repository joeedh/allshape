function inset_extrude(op, mesh, make_skirt) { //make_skirt=true
  if (make_skirt == undefined)
    make_skirt = true;
  
  var fiter = op.inputs.faces;
  var fset = new set(g_list(fiter));
  var eset = new set([]);
  var vmap = new hashtable(); //verts along the regional boundary

  var newfs = new set(), newes = new set(), newvs = new GArray();

  function vmap_add(v) {
      if (!vmap.has(v)) {
          var v2 = mesh.make_vert(v.co, v.no);
          mesh.copy_vert_data(v2, v);
          
          newvs.push(v2);
          vmap.add(v, v2);
          vmap.add(v2, v);
      }
  }
  
  for (var f in fiter) {
      for (var l in f.loops) {
          var count = 0;
          for (var l2 in l.e.loops) {
              if (fset.has(l2.f)) 
                 count++;
          }
          
          if (count < 2) {
              eset.add(l.e);
              
              vmap_add(l.v);
              vmap_add(l.next.v);
          }
      }
  }
  
  var vdel = new set()
  var edel = new set()
  var no = new Vector3()
  for (var f in fset) {
      var vlists = new GArray()
      
      f.recalc_normal();
      no.add(f.no);
      
      for (var list in f.looplists) {
          var verts = new GArray()
          vlists.push(verts)
          for (var l in list) {
              if (vmap.has(l.v)) {
                  verts.push(vmap.get(l.v));
              } else {
                  var v2 = mesh.make_vert(l.v.co, l.v.no);
                  mesh.copy_vert_data(v2, l.v);
                  
                  newvs.push(v2);
                  verts.push(v2);
                  vdel.add(l.v);
                  vmap.add(l.v, v2);
              }
          }
      }
      
      var f2 = mesh.make_face_complex(vlists)
      
      newfs.add(f2);
      mesh.copy_face_data(f2, f);
      f2.index = 0;
      
      var ls = g_list(f.loops)
      var ei = 0;
      
      for (var l2 in f2.loops) {
          mesh.copy_loop_data(l2, ls[ei]);
          mesh.copy_edge_data(l2.e, ls[ei].e);
          
          newes.add(l2.e);
          
          mesh.edges.select(ls[ei].e, false);
          mesh.verts.select(ls[ei].v, false);
          
          if (eset.has(ls[ei].e)) {
            if (make_skirt) {
              var verts = new GArray([ls[ei].next.v, l2.next.v, l2.v, ls[ei].v]);
              
              var skirtf = mesh.make_face(verts);
              mesh.copy_face_data(skirtf, f);
              mesh.faces.select(skirtf, false);
            }
          } else {
              edel.add(ls[ei].e);
          }
          ei++;
      }
      
      mesh.faces.select(f, false);
      mesh.kill_face(f);
  }    
  
  for (var e in edel) {
      mesh.kill_edge(e);
  }
  
  for (var v in vdel) {
      mesh.kill_vert(v);
  }
  
  no.normalize();
  
  for (var v in mesh.verts.selected) {
    v.recalc_normal(true);
  }
  
  mesh.regen_render();
  
  console.log(newvs.length, newes.length, newfs.length)
  return [newvs, newes, newfs, vmap]
}

function inset_make_holes(op, mesh) {
  var ret = inset_extrude(op, mesh, false);
  var verts = ret[0], edges = ret[1], faces = ret[2], vmap=ret[3];
  var loop_error = false;
  
  var vset = new set();
  var vdone = new set();
  var loops = new GArray();
  
  for (var e in edges) {
    if (e.totface == 1) {
      vset.add(e.v1);
      vset.add(e.v2);
    }
  }
  
  function find_boundary(vset, verts, loops) {
    for (var v1 in verts) {
      if (vdone.has(v1))
        continue;
      
      var nv = null;
      var v = v1;
      var vloop = new GArray([v1]); //loops may be partial loops
      
      /*find correct winding direction to start with*/
      for (var l in v1.loops) {
        if (faces.has(l.f)) {
          cure = l.e;
          vdone.add(v);
          v = l.next.v;
          vloop.push(v);
          break;
        }
      }
      
      var i =0;
      var cure = null;
      var e2;
      var is_closed = false;
      var first = true;
      do {
        if (!first) {
          nv = null;
        } else {
          first = false;
        }
        
        vdone.add(v);
        
        var totfound=0;
        for (var e in v.edges) {
          var v2 = e.other_vert(v); 
          if (e != cure && !vdone.has(v2) && vset.has(v2)) {
            nv = v2;
            cure = e;
            totfound++;
          }
        }
        
        //try and detect invalid loops
        if (totfound > 1 || totfound == 0) {
          is_closed = false;
        }
        
        e2 = null;
        for (var e in v.edges) {
          var v2 = e.other_vert(v); 
          
          if (e != cure && vset.has(v2) && v2 == v1) {
            is_closed = true;
          }
          if (e != cure && !vdone.has(v2) && vset.has(v2)) {
            nv = v2;
            cure = e;
            break;
          }
        }
        
        if (nv == null) {
          break;
        }
        
        i++;
        if (i > 1000) { //XXX should be bigger value
          console.log("infinite loop");
          break;
        }
        
        vloop.push(nv);
        v = nv;
      } while (v != v1);
      
      if (vloop.length > 2) {
        if (is_closed) {
          loops.push(vloop);
        } else {
          console.log("loop error");
          loop_error = true;
        }
      }
    }
  }
  
  find_boundary(vset, verts, loops);
  //console.log("ll", loops.length);
  
  for (var loop in loops) {
    var outer_loop = new GArray()
    var looplists = new GArray([outer_loop, loop])
    
    for (var v in loop) {
      outer_loop.push(vmap.get(v));
    }
    
    var f = mesh.make_face_complex(looplists);
  }
}

function InsetRegionsOp(faceiter) {
  this.prototype = Object.create(MeshOp.prototype);
  MeshOp.call(this);
  
  this.uiname = "Inset Regions"
  this.name = "inset_regions";
  this.inputs = {
    faces: new ElementBufferProperty("faces", MeshTypes.FACE),
    make_holes: new MeshBoolProperty("use_hole", true, 0)
  }
  
  this.outputs = {
  }
  
  this.inputs.faces.load_iterator(faceiter);
  
  this.exec = function(op, mesh) {
    if (this.inputs.make_holes == false) {
      inset_extrude(op, mesh);
    } else {
      inset_make_holes(op, mesh);
    }
  }
}

function bridge_two_loops(mesh, vloop1, vloop2) {
  
}

function BridgeOp(edgeiter) {
  this.prototype = Object.create(MeshOp.prototype);
  MeshOp.call(this);
  
  this.uiname = "Bridge Edges"
  this.name = "bridge_edges";
  this.inputs = {
    edges: new ElementBufferProperty("edges", MeshTypes.EDGE),
  }
  
  this.outputs = {
  }
  
  this.inputs.edges.load_iterator(edgeiter);
  
  this.exec = function(op, mesh) {
    var eset = new set(this.edgeiter);
    
    var visit = new set();
    var loops = new GArray();
    
    for (var e in eset) {
      if (visit.has(e))
        continue;
      
      var v1 = e.v1;
      
      visit.add(e);
      var stack = [e];
      var loop = new GArray([v1]);
      
      while (stack.length > 0) {
        var e2 = stack.pop(stack.length-1);
        v1 = e2.other_vert(v1);
        
        loop.push(v1);
        for (var e3 in v1.edges) {
          if (eset.has(e3) && !visit.has(e3)) {
            stack.push(e3);
          }
        }
      }
      
      console.log("llen :", loop.length);
    }
  }
}
