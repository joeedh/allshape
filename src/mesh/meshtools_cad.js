"use strict";

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
          var cure = l.e;
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
        if (i > 5000) { //XXX should be bigger value
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

class InsetRegionsOp extends MeshOp {
  constructor(Iterator faceiter=undefined) {
    MeshOp.call(this, "inset_regions", "Inset", "Make a hole in faces", Icons.INSET_REGIONS);
    
    this.uiname = "Inset Regions"
    this.name = "inset_regions";
    this.inputs = {
      faces: new CollectionProperty(undefined, [Face], "faces", "Faces", ""),
      make_holes: new BoolProperty(true, "make_holes", "Make Holes", "")
    }
    
    this.outputs = {
    }
  
    if (faceiter != undefined)
      this.inputs.faces.set_data(faceiter);
  }
  
  exec(op, mesh) {
    if (this.inputs.make_holes == false) {
      inset_extrude(op, mesh);
    } else {
      inset_make_holes(op, mesh);
    }
  }
}

function vloop_normal(loop) {
  if (loop.length == 0)
    return new Vector3(0, 0, 1);

  var c = new Vector3();
  for (var v in loop) {
    c.add(v.co);
  }
  c.mulScalar(1.0/loop.length);
  var n1 = new Vector3();
  var n2 = new Vector3();
  var n = new Vector3();
  
  for (var i=0; i<loop.length; i++) {
    var v1 = loop[i].co, v2 = loop[(i+1)%loop.length].co;
    
    n1.load(v1).sub(c); 
    n2.load(v2).sub(c);
    n1.cross(n2);
    n1.normalize();
    n.add(n1);
  }
  
  n.mulScalar(1.0 / loop.length);
  n.normalize();
  
  return n;
}


#define SWAP(a, b, t) var t = a; a = b; b = t; 

function bridge_two_loops(mesh, vloop1, vloop2, cuts) {
  var len1 = vloop1.length;
  var len2 = vloop2.length;
  
  if (len1 < len2) {
    SWAP(vloop1, vloop2, t);
    SWAP(len1, len2, t);
  }
  
  if (len1 == 0 || len2 == 0) return;
  var ratio = (len2-1) / (len1-1);
  
  function get_i2(_i) {
    return Math.floor(_i*ratio);
  }
  
  console.trace("bridge!");
  
  var n = vloop_normal(vloop1);
  var n2 = vloop_normal(vloop2);
    
  function eids(l) {
    var ret = [];
    for (var v in l) {
      ret.push(v.eid);
    }
    
    return JSON.stringify(ret);
  }
  
  if (n.dot(n2) < 0.0) {
    n2.negate();
    vloop2.reverse();
  }
  
  n.add(n2);
  n.mulScalar(0.5);
  n.normalize();

  var mindis = undefined;
  var start = 0;
  
  for (var i=0; i<len1; i++) {
    var dis = 0;
    
    for (var j=0; j<len1; j++) {
      var k = (j+i)%len1;
      
      var j1 = i, j2 = get_i2(k);
      //var j3 = (j2+1)%len2; var j4 = (j1+1)%len1;
      dis += vloop1[j].co.vectorDistance(vloop2[j2].co);
    }
    
    if (mindis == undefined || dis < mindis) {
      mindis = dis;
      start = i;
    }
  }
  
  var vloop3 = new GArray();
  for (i=0; i<len1; i++) {
    console.log("i", get_i2((i+start)%len1));
    vloop3.push(vloop2[get_i2((i+start)%len1)]);
  }
  
  var quadlst = [0, 0, 0, 0];
  var trilist = [0, 0, 0];
  vloop2 = vloop3;
  
  var vloop1_2 = list(vloop1);
  var vloop2_2 = list(vloop2);
  var co = new Vector3();
  
  for (var c=0; c<cuts+1; c++) {
    if (c == cuts) {
      vloop2_2 = vloop2;
    } else {
      var f = (c+1)/(cuts+1);
      
      for (i=0; i<len1; i++) {
        co.load(vloop1[i].co);
        co.interp(vloop2[i].co, f);
        
        var v = mesh.make_vert(co);
        vloop2_2[i] = v;
      }
    }
    
    for (var i=0; i<len1; i++) {
      var si = (i+start) % len1;
      var i1 = i, i2=i;
      var i3 = (i2+1)%len1; var i4 = (i1+1)%len1;
      
      var v1 = vloop1_2[i1], v2 = vloop2_2[i2], v3 = vloop2_2[i3], v4=vloop1_2[i4];
      
      if (v1 == v4 || v2 == v3) {
        if (v1 == v4) { 
          trilist[0] = v1; trilist[1] = v2; trilist[2] = v3;
        } else if (v1 != v4 && v2 == v3) {
          trilist[0] = v1; trilist[1] = v2; trilist[2] = v4;
        } else {
          console.log("degenerate case!", i1, i2, i3, i4);
          continue;
        }
        
        var f = mesh.make_face(trilist, false);
        continue;
      }
      
      quadlst[0] = v1; quadlst[1] = v2; quadlst[2] = v3; quadlst[3] = v4;
      var f = mesh.make_face(quadlst, false, false);
    }
    
    SWAP(vloop1_2, vloop2_2, t);
  }
}

class BridgeOp extends MeshOp {
  constructor(Iterator<Edge> edgeiter=undefined) {
    MeshOp.call(this, "bridge_edges", "Bridge Edges", "Bridge edge loops with faces", Icons.BRIDGE);
    
    this.flag |= ToolFlags.USE_PARTIAL_UNDO;
    
    this.inputs = {
      edges : new CollectionProperty(undefined, undefined, "edges", "Edges", ""),
      cuts : new IntProperty(0, "cuts", "Cuts", "Number of subdivisions")
    }
    
    this.inputs.cuts.range = [0, 50];
    this.inputs.cuts.uirange = [0, 50];
    
    this.outputs = {
    }
    
    if (edgeiter != undefined) {
      this.inputs.edges.set_data(edgeiter);
    }
  }
  
  exec(op, mesh) {
    var eset = new set(this.inputs.edges);
    var visit = new set();
    var loops = new GArray();
    var cuts = this.inputs.cuts.data;
    
    for (var e in eset) {
      if (visit.has(e))
        continue;
      
      var loop = new GArray();
      var v1 = e.v1, lastv = e.v2;
      var bad = false;
      
      visit.add(e);
      do {
        loop.push(v1);
        
        var c = 0;
        var ov1 = v1;
        var olastv = lastv;
        
        for (var e2 in v1.edges) {
          if (eset.has(e2) && e2.other_vert(ov1) != olastv) {
            visit.add(e2);
            
            lastv = v1;
            v1 = e2.other_vert(v1);
            
            if (c > 0) {
              bad = true;
              break;
            }
            c++;
          }
        }
        
      } while (v1 != e.v1);
      
      if (!bad)
        loops.push(loop);
    }
    
    if (loops.length == 2) {
      bridge_two_loops(mesh, loops[0], loops[1], cuts);
    }
    
    mesh.api.recalc_normals();
  }
}
