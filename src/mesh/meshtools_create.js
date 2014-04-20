"use strict";

function do_hull_points(set<Vertex> vset, Mesh mesh) {
  /*this function creates faces from various
    *simple* geometric cases*/
  
  function SortVs() {
    this.verts = new GArray();
    this.ang_a = this.ang_b = 0;
  };
  
  var sverts = new GArray();
  
  /*validate selection for this tool*/
  for (var v in vset) {
    var totsel = 0;
    for (var e in v.edges) {
      totsel += e.flag & Flags.SELECT;
    }
    
    if (totsel > 2) {
      return false;
    }
  }
  
  var vset2 = new set();
  
  for (var v in vset) {
    if (vset2.has(v))
      continue;
    
    //if (v.edges.length == 0) {
      vset2.add(v);
      
      var sv = new SortVs()
      sv.verts.push(v);
      
      sverts.push(sv);
      
    //  continue;
    //}
    
    /*DISABLED: handle connected edge case*/
    
    /*to handle case of a segment that isn't a loop:
      find start of segment*/
    
    /*disabled, for now
    var v2 = v;
    var e = v.edges[0];
    
    do {
      var nv = null;
      
      for (var e2 in v2.edges) {
        if (e2 != e) {
          e = e2;
          nv = e.other_vert(v2);
          break;
        }
      }
      
      if (nv == null)
        break;
      
      if (!vset.has(nv))
        break;
      
      v2 = nv;
    } while (v2 != v);
    
    var sv = new SortVs();
    
    sverts.push(sv);
    v = v2;
    
    if (v2.edges.length == 1) {
      sv.verts.push(v2);
      
      vset2.add(v2);
      
      v2 = e.other_vert(v2);
    }
    
    do {
      vset2.add(v2);
      sv.verts.push(v2);
      
      var nv = null;      
      for (var e2 in v2.edges) {
        if (e2 != e) {
          e = e2;
          nv = e.other_vert(v2);
          break;
        }
      }
      
      if (nv == null)
        break;
      
      if (!vset.has(nv))
        break;
      
      v2 = nv;
    } while (v2 != v);
    
    console.log("c", sv.verts.length);
    console.log(sv.verts);
    */
  }
  
  var nv = new Vector3();
  var mm = new MinMax(3);
  
  for (var v in vset) {
    mm.minmax(v.co);
  }
  
  var cent = new Vector3(mm.min).add(mm.max).mulScalar(0.5);
  
  /*find group normal*/
  var n = new Vector3();
  var n2 = new Vector3();
  var n3 = new Vector3();
  
  var verts = list(vset);
  
  for (var i=0; i<verts.length; i++) {
    var v = verts[i];
    var v2 = verts[(i+1)%verts.length];
    
    n2.load(v.co).sub(cent).normalize();
    n3.load(v2.co).sub(cent).normalize();
    
    if (n2.dot(n2) == 0.0)
      continue;
    
    var j = 1;
    while (Math.abs(n2.dot(n3)) > 0.99) {
      j++;
      v2 = verts[(i+j)%verts.length];
      n3.load(v2.co).sub(cent).normalize();
    } 

    if (Math.abs(n2.dot(n3)) > 0.99)
      continue;
    
    n2.cross(n3);
    n2.normalize();
    
    n3.load(n);
    n3.normalize();
    
    /*ensure winding is correct*/
    if (n3.dot(n2) < 0)
      n.sub(n2);
    else
      n.add(n2);
  }
  
  n.mulScalar(1.0/vset.length);
  n.normalize();
  
  console.log(n);
  
  var mat = get_nor_zmatrix(n);
  var ax1 = new Vector3([0.0, 1.0, 0.0]);
  var ax2 = new Vector3([0.0, -1.0, 0.0]);
  
  /*now, calculate angles*/
  var co = new Vector3();
  
  cent.multVecMatrix(mat);
  mm.reset();
  
  for (var v in vset) {
    co.load(v.co).multVecMatrix(mat);
    co[2] = 0.0;
    mm.minmax(co);
  }
  
  cent.load(mm.min).add(mm.max).mulScalar(0.5);
  
  for (var i=0; i<sverts.length; i++) {
    var sv = sverts[i];
    co.load(sv.verts[0].co).multVecMatrix(mat);
    co[2] = 0.0;
    
    n2.load(co).sub(cent).normalize();
    
    var ang = Math.acos(n2.dot(ax1));    
    if (winding(ax1, n2, ax2))
      ang = Math.PI*2.0-ang;
    
    sv.ang_a = ang;
    
    if (sv.verts.length > 1) {
      co.load(sv.verts[sv.verts.length-1].co).multVecMatrix(mat);
      co[2] = 0.0;
      
      n2.load(co).sub(cent).normalize();
      
      ang = Math.acos(n2.dot(ax1));    
      if (winding(ax1, n2, ax2))
        ang = Math.PI*2.0-ang;
      
      sv.ang_b = ang;
      
      if (isNaN(ang)) {
        console.log("yeek");
        console.log(sv.verts[sv.verts.length-1].eid);
      }
    } else {
      sv.ang_b = ang;
    }
    
    if (sv.ang_a > Math.PI && sv.ang_b < Math.PI) {
      //sv.ang_b += Math.PI;
    }
    
    if (sv.ang_b > Math.PI && sv.ang_a < Math.PI) {
      //sv.ang_a += Math.PI;
    }
    
    if (sv.ang_a > sv.ang_b) {
      var t = sv.ang_a;
      
      //sv.verts.reverse();
      sv.ang_a = sv.ang_b;
      sv.ang_b = t;
    } else {
      sv.verts.reverse();
    }
    
    console.log(sv.ang_a, sv.ang_b);
  }
  
  function ESortCmp(a, b) {
    if (a.ang_a < b.ang_a && a.ang_b < b.ang_a)
      return -1;
    else if (a.ang_a > b.ang_b && a.ang_b > b.ang_b)
      return 1;
    else return 0;
  }

  sverts.sort(ESortCmp);
  
  var vs = new GArray();
  for (var sv in sverts) {
    for (var v in sv.verts) {
      vs.push(v);
    }
  }
  
  var f = mesh.make_face(vs);
  
  mesh.faces.select(f, true);
  for (var e in f.edges) {
    mesh.edges.select(e, true);
  }
  
  mesh.api.recalc_normals();
  return true;
}

function do_frame_dill(vset, mesh) {
}

class ContextCreateOp extends MeshOp {
  constructor(vertiter) {
    MeshOp.call(this, "context_create", "Create Face", "Create face from selection");
    
    //this.flag |= ToolFlags.USE_PARTIAL_UNDO;
      
    this.inputs = {
      verts: new CollectionProperty(undefined, [Vertex], "verts", "Vertices", "")
    }
   
    this.inputs.verts.set_data(vertiter);
  }

  exec(op, mesh) {
    var vset = new set(op.inputs.verts);
    
    console.log("face creation tool");
    
    if (vset.length < 2)
      return;
    
    if (vset.length == 2) {
      var verts = list(vset);
      
      var e = mesh.make_edge(verts[0], verts[1]);
      return;
    }
    
    if (do_hull_points(vset, mesh))
      return;
    
    if (do_frame_fill(vset, mesh))
      return;
  }
}
