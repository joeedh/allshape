"use strict";

//todo: merge this file with toolops_api.js
//      we do need a separate operator api for mesh ops,
//      but we don't need separate data structures.

var MPropTypes = {
  INT: 0,
  FLOAT: 1,
  FLOAT_ARRAY: 2,
  INT_ARRAY: 3,
  STRING: 4,
  ELEMENT_BUF: 5,
  VEC3: 6,
  VEC4: 7,
  BOOL: 8
};

/*note: unlike ToolOps, MeshOps can call each other and recurse.*/
class MeshOp extends ToolOpAbstract {
  constructor(apiname, uiname) {
    ToolOpAbstract.call(this, apiname, uiname);

    this.flag = 0;
    this.undo_expand_lvl = 0; //for partial undo, how much to expand the partial mesh area
  }
  
  exec(op, mesh) { }
}

class element_filter_iter {
  constructor(iter, typemask) {
    this.iter = iter;
    this.typemask = typemask;
  }
  
  next() {
    if (this.mesh != undefined) //necessary for redo
      this.iter.mesh = this.mesh;
    
    var e = this.iter.next();

    while (!e.done && !(e.value.type & this.typemask)) {
      e = this.iter.next();
    }
    
    return e;
  }
  
  reset() {
    if (this.iter.reset != undefined)
      this.iter.reset();
  }
}

class element_filter {
  constructor(iter, typemask) {
    this.iter = iter;
    this.typemask = typemask;
  }
  
  __iterator__() {
    if (this.mesh != undefined) //necassary for redo
      this.iter.mesh = this.mesh;
    
    return new element_filter_iter(this.iter.__iterator__(), this.typemask);
  }
}

class selectiter {
  constructor(mesh, typemask) {
    this.mask = typemask;
    this.iter = undefined;
    this.curtype = 0;
    this.mesh = mesh
    
    this.reset();
  }

  reset() {
    this.iter = undefined;
    
    if (this.mask & MeshTypes.VERT)
      this.curtype = MeshTypes.VERT
    else if (this.mask & MeshTypes.EDGE)
      this.curtype = MeshTypes.EDGE;
    else if (this.mask & MeshTypes.FACE)
      this.curtype = MeshTypes.FACE
    else
      throw new Error("Invalid element type mask in selectiter.reset() " + this.mask);
  }

  __iterator__() {
    return this;
  }

  next() {
    var mesh = this.mesh;
    
    function get_iter(type) {
      if (type == MeshTypes.VERT)
        return mesh.verts.selected;
      else if (type == MeshTypes.EDGE)
        return mesh.edges.selected;
      else
        return mesh.faces.selected;
    }
    
    if (this.iter == undefined) {
      this.iter = get_iter(this.curtype);
    }
    
    var next;
    next = this.iter.next();
    if (next.done) {
      var mask = this.mask;
      
      if (this.curtype == MeshTypes.VERT) {
        if (mask & MeshTypes.EDGE) {
          this.curtype = MeshTypes.EDGE;
          this.iter = get_iter(MeshTypes.EDGE);
          return this.next();
        } else if (mask & MeshTypes.FACE) {
          this.curtype = MeshTypes.FACE;
          this.iter = get_iter(MeshTypes.FACE);
          return this.next();
        } else {
          this.reset();
          return next;
        }
      } else if (this.curtype == MeshTypes.EDGE) {
        if (mask & MeshTypes.FACE) {
          this.curtype = MeshTypes.FACE;
          this.iter = get_iter(MeshTypes.FACE);
          return this.next();
        } else {
          this.reset();
          return next;
        }
      } else if (this.curtype == MeshTypes.FACE) {
        this.reset();
        return next;
      }
    }
    
    return next;
  }
}

class flagiter {
  constructor(mesh, typemask, flag) {
    this.emask = typemask;
    this.flag = flag;
    this.cur = 0;
    this.curtype = 0;
    this.mesh = mesh
  
    if (typemask & MeshTypes.VERT) {
      this.curtype = MeshTypes.VERT;
      this.iter = new GeoArrayIter(mesh.verts);
    } else if (typemask & MeshTypes.EDGE) {
      this.curtype = MeshTypes.EDGE;
      this.iter = new GeoArrayIter(mesh.edges);
    } else if (typemask & MeshTypes.FACE) {
      this.curtype = MeshTypes.FACE;
      this.iter = new GeoArrayIter(mesh.faces);
    }
  }
  
  reset() {
    this.cur = 0;
    
    if (this.emask & MeshTypes.VERT) {
      this.curtype = MeshTypes.VERT;
      this.iter = new GeoArrayIter(this.mesh.verts);
    } else if (this.emask & MeshTypes.EDGE) {
      this.curtype = MeshTypes.EDGE;
      this.iter = new GeoArrayIter(this.mesh.edges);
    } else if (this.emask & MeshTypes.FACE) {
      this.curtype = MeshTypes.FACE;
      this.iter = new GeoArrayIter(this.mesh.faces);
    }
  }
  
  next() {
    if (this.cur == -1) {
      this.reset();
    }
    
    if (this.curtype == MeshTypes.VERT) {
      var len = this.mesh.verts.length;
      var v = null;
      
      while (this.cur < len) {
        var v2 = this.iter.next();
        if (v2.done) break;
        
        if ((v2.value.flag & this.flag) != 0) {
          v = v2;
          this.cur++;
          break;
        }
        
        this.cur++;
      }
      
      if (v != null) {
        return v;
      } else {
        if (this.emask & MeshTypes.EDGE) {
          this.curtype = MeshTypes.EDGE;
          this.cur = 0;
          this.iter = new GeoArrayIter(this.mesh.edges); 
          
          return this.next();
        } else if (this.emask & MeshTypes.FACE) {
          this.curtype = MeshTypes.FACE;
          this.cur = 0;
          this.iter = new GeoArrayIter(this.mesh.faces);
          
          return this.next();
        } else {
          this.cur = -1;
          return {done: true, value: undefined};
        }          
      }
    } else if (this.curtype == MeshTypes.EDGE) {
      var len = this.mesh.edges.length;
      var e = null;
      
      while (this.cur < len) {
        var e2 = this.iter.next();
        if (e2.done) break;
        
        if ((e2.value.flag & this.flag) != 0) {
          e = e2;
          this.cur++;
          break;
        }
        
        this.cur++;
      }
      
      if (e != null) {
        return e;
      } else {
        if (this.emask & MeshTypes.FACE) {
          this.curtype = MeshTypes.FACE;
          this.cur = 0;
          this.iter = new GeoArrayIter(this.mesh.faces);
          
          return this.next();
        } else {
          this.cur = -1;
          return {done : true, value : undefined};
        }          
      }    
    } else if (this.curtype == MeshTypes.FACE) {
      var len = this.mesh.faces.length;
      var f = null;
      
      while (this.cur < len) {
        var f = this.iter.next();
        if (f.done) break;
        
        if ((f.value.flag & this.flag) != 0) {
          this.cur++;
          break;
        }
        
        f = null;
        this.cur++;
      }
      
      if (f != null) {
        return f;
      } else {
        this.cur = -1;
        return {done : true, value : undefined};
      }    
    }
  }
}

class flagiterobj {
  constructor(mesh, typemask, flag) {
    this.mesh = mesh;
    this.typemask = typemask;
    this.flag = flag;
  }
  
  __iterator__() {
    return new flagiter(this.mesh, this.typemask, this.flag);
  }
}

class MeshOpAPI {
  constructor(mesh) {
    this.mesh = mesh;
  }
  
  call_op(op) {
    for (var i in op.inputs) {
      var input = op.inputs[i];
      
      if (input.type == PropTypes.COLLECTION) {
        input.ctx = new ToolContext();
        
        for (var e in input)  {
          e.flag |= Flags.DIRTY;
        }
      }
    }
    
    op.exec(op, this.mesh);
  }
}

class RemoveDoublesOp extends MeshOp {
  constructor(vertiter) {
    MeshOp.call(this);
  
    this.uiname = "Remove Duplicate Verts"
    this.name = "RemoveDoubles";
    this.inputs = {
      radius: new FloatProperty(0.0005, "radius", "Radius", ""), 
      input_verts: new CollectionProperty(undefined, [Vertex], "input_verts", "Verts", "")
    }
    
    this.inputs.input_verts.set_data(vertiter);
    
    this.shash = new spatialhash();  
  }

  /*this function works by finding clusters of vertices, then creating a new mesh with
      them welded together*/
  exec(op, mesh) {
    var mesh2 = mesh.shallow_copy();
    
    mesh2.verts = new GeoArray();
    mesh2.edges = new GeoArray();
    mesh2.faces = new GeoArray();
    
    var shash = this.shash;
    var r = this.inputs.radius.data
    
    for (var v in this.inputs.input_verts) {
      shash.add(v);
      v.flag &= ~Flags.TEMP;
    }
    
    for (var v in this.inputs.input_verts) {
      if ((v.flag & Flags.TEMP) != 0) continue;
      v.flag |= Flags.TEMP;
      
      var nv = mesh2.make_vert(v.co, v.no);
      mesh2.copy_vert_data(nv, v, true); //third term is to copy eid too
      
      /*we're going to add a member to the vertex structure, but only
        because all of this data is going to be deleted in a minute anyway*/
      v.target = nv;
      
      //var vlist = shash.query_radius(v.co, r);
      //console.log(vlist.length)
      
      for (var v2 in this.inputs.input_verts) {
        if (v2.co.vectorDistance(v.co) > r) continue;
        
        if (v2 == v) continue;
        
        v2.flag |= Flags.TEMP;
        v2.target = nv;
        nv.no.add(v2.no);
      }
      
      nv.no.normalize();
    }
    
    for (var v in mesh.verts) {
      if ((v.flag & Flags.TEMP) != 0) continue;
      
      var nv = mesh2.make_vert(v.co, v.no);
      v.target = nv;
      mesh2.copy_vert_data(nv, v);
      v
    }
    
    /*only copy wire edges here*/
    for (var e in mesh.edges) {
      if (e.v1.target == e.v2.target) continue;
      if (e.totface > 0) continue;
      
      var ne = mesh2.make_edge(e.v1.target, e.v2.target);
      mesh2.copy_vert_data(ne, e);
    }
    
    for (var f in mesh.faces) {
      var vlists = new Array();
      
      for (var i=0; i<f.looplists.length; i++) {
        var verts = new Array();
        var list = f.looplists[i];
        
        for (var l in list) {
          if (verts.indexOf(l.v.target) == -1) {
            verts.push(l.v.target);
          }
        }
        if (verts.length > 2)
          vlists.push(verts);
      }
      
      if (vlists.length > 0) {
        var nf = mesh2.make_face_complex(vlists);
        mesh2.copy_face_data(nf, f);
      }
    }
    
    mesh.verts = mesh2.verts;
    mesh.edges = mesh2.edges;
    mesh.faces = mesh2.faces;
    
    mesh.api.recalc_normals();
  }
}

class SplitEdgeOp extends MeshOp {
  constructor(edgeiter) {
    MeshOp.call(this);
  
    this.name = "Split Edge";
    this.inputs = {
      radius: new FloatProperty(0.0005, "radius", "Radius", ""), 
      input_edges: new CollectionProperty(undefined, [Edge], "input_edges", "Edges", ""),
    }
    
    this.inputs.input_edges.set_data(edgeiter);
    
    mesh.api.recalc_normals();
  }

  exec(op, mesh) {
    var elist = list(this.inputs.input_edges);
    for (var e in elist) {
      mesh.api.split_edge(e, 0.5);
    }
  }
}

class VertexConnectOp extends MeshOp {
  constructor (vertiter) {
    MeshOp.call(this);
    
    this.uiname = "Vertex Connect"
    this.name = "VertConnect";
    this.inputs = {
      input_verts: new CollectionProperty(undefined, [Vertex], "input_verts", "Vertices", "")
    }
    
    this.inputs.input_verts.set_data(vertiter);
  }

  exec(op, mesh) {
    var fdone = new set();
    var vset = new set();
    
    for (var v in this.inputs.input_verts) {
        vset.add(v);
    }
    
    for (var v in this.inputs.input_verts) {
      for (var f in list(v.faces)) {
        if (fdone.has(f))
          continue;
        
        fdone.add(f);
      }
    }
    
    for (var f in fdone) {
      var verts = new GArray();
      for (var v in f.verts) {
        if (vset.has(v))
          verts.push(v);
      }
      
      if (verts.length > 1)
        mesh.api.split_face(f, verts[0], verts[1]);
    }
    
    mesh.api.recalc_normals();
  }
}

class DissolveFacesOp extends MeshOp {
  constructor(faceiter) {
    MeshOp.call(this);
    
    this.name = "dissolve_faces"
    this.uiname = "Dissolve";
    this.inputs = {
      faces: new CollectionProperty(undefined, [Face], "faces", "Faces", "")
    }
    
    this.inputs.faces.set_data(faceiter);
    
  }

  exec(op, mesh) {
    var fset = new set(this.inputs.faces);
    var shells = new GArray();
    var visit = new set();
    var cur = -1;
    
    for (var f in fset) {
      if (visit.has(f)) continue;
      
      cur++;
      shells.push(new GArray());
      
      var stack = new GArray([f]);
      while (stack.length > 0) {
        var f2 = stack.pop();
        
        visit.add(f2);
        shells[cur].push(f2);
        
        for (var e in f2.edges) {
          for (var f3 in e.faces) {
            if (fset.has(f3) && !visit.has(f3)) {
              stack.push(f3);
              visit.add(f3);
            }
          }
        }
      }
    }
    
    for (var s in shells) {
      mesh.api.join_faces(s);
    }
    
    mesh.api.recalc_normals();
  }
}

function vert_smooth(mesh, vertiter) {
  var cos = new GArray();
  
  var i = 0;
  for (var v in vertiter) {
    var co = new Vector3(v.co);
    
    var j = 1;
    for (var e in v.edges) {
      co.add(e.other_vert(v).co);
      j++;
    }
    
    if (j > 0)
      co.divideScalar(j);
    cos.push(co);
    i++;
  }
  
  i = 0
  for (var v in vertiter) {
    v.co = cos[i];
    i++;
  }
}

class VertSmoothOp extends MeshOp {
  constructor(vertiter) {
    MeshOp.call(this);
    
    this.flag |= ToolFlags.USE_PARTIAL_UNDO;
    
    this.uiname = "Vertex Smooth"
    this.name = "VertSmooth";
    this.inputs = {
      verts: new CollectionProperty(undefined, [Vertex], "verts", "Vertices", ""),
    }
    
    this.inputs.verts.set_data(vertiter);
  }

  exec(op, mesh) {
    vert_smooth(mesh, this.inputs.verts);
    
    mesh.api.recalc_normals();
  }
}

class ExtrudeFacesOp extends MeshOp {
  constructor(faceiter) {
    MeshOp.call(this);
    
    this.flag |= ToolFlags.USE_PARTIAL_UNDO;

    this.uiname = "Extrude Faces"
    this.name = "ExtrudeFaces";
    this.inputs = {
      input_faces: new CollectionProperty(undefined, [Face], "input_faces", "Faces", ""),
    }
    
    this.outputs = {
      group_no: new Vec3Property(new Vector3(), "group_no", "normal", "")
    }
    
    this.inputs.input_faces.set_data(faceiter);
  }

  exec(op, mesh) {
    var fiter = this.inputs.input_faces;
    var fset = new set(g_list(fiter));
    var eset = new set([]);
    var vmap = new hashtable(); //verts along the regional boundary
    
    function vmap_add(v) {
        if (!vmap.has(v)) {
            var v2 = mesh.make_vert(v.co, v.no);
            mesh.copy_vert_data(v2, v);
            
            vmap.add(v, v2);
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
                    
                    verts.push(v2);
                    vdel.add(l.v);
                    vmap.add(l.v, v2);
                }
            }
        }
        
        var f2 = mesh.make_face_complex(vlists)
        mesh.copy_face_data(f2, f);
        f2.index = 0;
        
        var ls = g_list(f.loops)
        var ei = 0;
        
        for (var l2 in f2.loops) {
            mesh.copy_loop_data(l2, ls[ei]);
            mesh.copy_edge_data(l2.e, ls[ei].e);
            
            mesh.edges.select(ls[ei].e, false);
            mesh.verts.select(ls[ei].v, false);
            
            if (eset.has(ls[ei].e)) {
                var verts = new GArray([ls[ei].next.v, l2.next.v, l2.v, ls[ei].v]);
                
                var skirtf = mesh.make_face(verts);
                mesh.copy_face_data(skirtf, f);
                mesh.faces.select(skirtf, false);
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
    
    this.outputs.group_no.data = no;
    mesh.api.recalc_normals();
    
    mesh.regen_render();
  }
}

class ExtrudeEdgesOp extends MeshOp {
  constructor(edgeiter) {
    MeshOp.call(this);
    
    this.flag |= ToolFlags.USE_PARTIAL_UNDO;

    this.name = "Extrude Edges"
    this.name = "ExtrudeEdges";
    this.inputs = {
      input_edges: new CollectionProperty(undefined, [Edge], "input_edges", "Edges", ""),
    }
    
    this.outputs = {
      group_no: new Vec3Property(new Vector3(), "group_no", "normal", "")
    }
    
    this.inputs.input_edges.set_data(edgeiter);
  }

  exec(op, mesh) {
    var eiter = this.inputs.input_edges;
    var vmap = new hashtable();
    var eset = new set()
    var no = new Vector3();
    
    function new_vert(v) {
        if (!vmap.has(v)) {
            var v2 = mesh.make_vert(v.co, v.no);
            mesh.copy_vert_data(v2, v);
            
            vmap.add(v, v2);
        }
        
        return vmap.get(v);
    }
    
    for (var e in eiter) {
      e.index = 0;
      eset.add(e);
    }
    
    for (var e in eset) {
      if (e.index == -1)
        continue;
      
      var v1, v2;
      
      v1 = new_vert(e.v1);
      v2 = new_vert(e.v2);
      
      var e2 = mesh.make_edge(v1, v2);
      mesh.copy_edge_data(e2, e);
      
      mesh.edges.select(e2, true);
      e2.index = -1;
      
      mesh.verts.select(e.v1, false);
      mesh.verts.select(e.v2, false);
      mesh.edges.select(e, false);
      
      var f, f2;
      if (e.loop != null && e.loop.v == v1) {
        f = e.loop.f;
        f2 = mesh.make_face([e.v2, e.v1, v1, v2]);
      } else {
        f = null;
        f2 = mesh.make_face([e.v2, e.v1, v1, v2]);
      }
      
      if (f != null)
        mesh.copy_face_data(f2, f);
    }
    no.normalize();
    
    //output zero normal for now
    this.outputs.group_no.data = no;
    //mesh.api.recalc_normals();
    
    mesh.regen_render();
  }
}

class ExtrudeVertsOp extends MeshOp {
  constructor(vertiter) {
    MeshOp.call(this);
    
    this.uiname = "Extrude Verts"
    this.name = "ExtrudeVerts";
    this.inputs = {
      input_verts: new CollectionProperty(undefined, [Vertex], "input_verts", "Vertices", ""),
    }
    
    this.outputs = {
      group_no: new Vec3Property(new Vector3(), "group_no", "normal", "")
    }
    
    this.inputs.input_verts.set_data(vertiter);
  }

  exec(op, mesh) {
    var viter = this.inputs.input_verts;

    var no = new Vector3();    
    
    for (var v in viter) {
      v.index = 0;
    }    
    
    for (var v in viter) {
      if (v.index == -1)
        continue;
        
      var v2 = mesh.make_vert(v.co, v.no);
      mesh.copy_vert_data(v2, v);
      mesh.verts.select(v, false);
      
      v2.index = -1;
      var e = mesh.make_edge(v, v2);
      e.index = -1;
      
      /*only form a group normal for verts with faces*/
      var found = false;
      for (var f in v.faces) {
        found = true;
        break;
      }
      
      if (found)
        no.add(v.no);
    }
    no.normalize();
    
    this.outputs.group_no.data = no;
    //mesh.api.recalc_normals();
    
    mesh.regen_render();
  }
}

//extrudes vertices and edges as well as faces
class ExtrudeAllOp extends MeshOp {
  constructor(elementiter) {
    MeshOp.call(this);
    
    this.flag |= ToolFlags.USE_PARTIAL_UNDO;
    
    this.name = "Extrude"
    this.name = "ExtrudeAll";
    this.inputs = {
      elements: new CollectionProperty(undefined, [Element], "elements", "Elements", "")
    }
    
    this.outputs = {
      group_no: new Vec3Property(new Vector3(), "group_no", "normal", "")
    }
    
    this.inputs.elements.set_data(elementiter);
  }

  exec(op, mesh) {
    var vset = new set(), verts = new GArray();
    var eset = new set(), edges = new GArray();
    var fset = new set(), faces = new GArray();
    
    for (var e in this.inputs.elements) {
      if (e.type == MeshTypes.VERT)  {
        vset.add(e);
      } else if (e.type == MeshTypes.EDGE) {
        eset.add(e);
      } else if (e.type == MeshTypes.FACE) {
        fset.add(e);
      }
    }
    
    for (var e in this.inputs.elements) {
      if (e.type == MeshTypes.VERT) {
        var found = false;
        for (var l in e.loops) {
          if (eset.has(l.e) || fset.has(l.f)) {
            found = true;
            break;
          }
        }
        
        for (var e2 in e.edges) {
          if (eset.has(e2)) {
            found = true;
            break;
          }
        }
        
        if (!found) verts.push(e);          
      } else if (e.type == MeshTypes.EDGE) {
        for (var l in e.loops) {
          var found = false;
          
          if (fset.has(l.f)) {
            found = true;
            break;
          }
        }
        if (!found) {
          if (!found) edges.push(e);
        }
      } else if (e.type == MeshTypes.FACE) {
        faces.push(e);
      }
    }
    
    var fop = new ExtrudeFacesOp(faces);
    var eop = new ExtrudeEdgesOp(edges);
    var vop = new ExtrudeVertsOp(verts);
    
    mesh.ops.call_op(fop);
    mesh.ops.call_op(eop);
    mesh.ops.call_op(vop);
    
    var no = fop.outputs.group_no.data;
    
    no.add(eop.outputs.group_no.data);
    no.add(vop.outputs.group_no.data);
    no.normalize();
    
    this.outputs.group_no.data.load(no);
  }
}

//XXX need to add option to only consider selected faces
class OutsideNormalsOp extends MeshOp {
  constructor(faceiter) {
    MeshOp.call(this);
    
    this.uiname = "Fix Normals"
    this.name = "fix_normals";
    
    this.inputs = {
      faces: new CollectionProperty(undefined, [Face], "faces", "Faces", ""),
    }
    
    this.inputs.faces.set_data(faceiter);
  }

  exec(op, mesh) {
    mesh.api.consistent_windings();
    mesh.api.recalc_normals();
  }
}

class FlipNormalsOp extends MeshOp {
  constructor(faceiter) {
    MeshOp.call(this);
    
    this.uiname = "Flip Normals"
    this.name = "FlipNormals";
    this.inputs = {
      faces: new CollectionProperty(undefined, [Face], "faces", "Faces", ""),
    }
    
    this.inputs.faces.set_data(faceiter);
  }

  exec(op, mesh) {
    for (var f in this.inputs.faces) {
      mesh.api.reverse_winding(f);
    }
    
    mesh.api.recalc_normals();
  }
}

class DeleteVertsOp extends MeshOp {
  constructor(vertiter) {
    MeshOp.call(this);
    
    this.uiname = "Delete Vertices"
    this.name = "DeleteVertices";
    this.inputs = {
      verts: new CollectionProperty(undefined, [Vertex], "verts", "Vertices", ""),
    }
    
    this.inputs.verts.set_data(vertiter);
  }

  exec(op, mesh) {
    var iter = this.inputs.verts.__iterator__();
    //this.inputs.verts.reset();
    var verts = list(this.inputs.verts);
    for (var v in verts) {
      mesh.kill_vert(v);
    }
    
    mesh.api.recalc_normals();
  }
}

class DeleteEdgesOp extends MeshOp {
  constructor(vertiter) {
    MeshOp.call(this);
    
    this.uiname = "Delete Edges"
    this.name = "DeleteEdges";
    this.inputs = {
      edges: new CollectionProperty(undefined, [Edge], "edges", "Edges", ""),
    }
    
    this.inputs.edges.set_data(vertiter);
  }

  exec(op, mesh) {
    var iter = this.inputs.edges.__iterator__();
    //this.inputs.edges.reset();
    var edges = list(this.inputs.edges);
    for (var v in edges) {
      mesh.kill_edge(v);
    }
    
    mesh.api.recalc_normals();
  }
}

class DeleteFacesOp extends MeshOp {
  constructor(vertiter) {
    MeshOp.call(this);
    
    this.uiname = "Only Faces"
    this.name = "DeleteFaces";
    this.inputs = {
      faces: new CollectionProperty(undefined, [Face], "faces", "Faces", ""),
    }
    
    this.inputs.faces.set_data(vertiter);
  }

  exec(op, mesh) {
    var iter = this.inputs.faces.__iterator__();
    //this.inputs.faces.reset();
    var faces = list(this.inputs.faces);
    for (var v in faces) {
      mesh.kill_face(v);
    }
    
    mesh.api.recalc_normals();
  }
}

class DeleteFaceRegionOp extends MeshOp {
  constructor(vertiter) {
    MeshOp.call(this);
    
    this.uiname = "Delete Faces"
    this.name = "DeleteFaces";
    this.inputs = {
      faces: new CollectionProperty(undefined, [Face], "faces", "Faces", ""),
    }
    
    this.inputs.faces.set_data(vertiter);
  }

  exec(op, mesh) {
    var iter = this.inputs.faces.__iterator__();
    //this.inputs.faces.reset();
    var fset = new set();
    var delfset = new set();
    var eset = new set();
    var vset = new set();
    
    for (var f in this.inputs.faces) {
      fset.add(f);
    }
    
    for (var f in this.inputs.faces) {
      var global_found = false;
      
      for (var l in f.loops) {
        var found = false;
        for (var l2 in l.v.loops) {
          if (!fset.has(l2.f)) {
            found = true;
            break;
          }
        }
        
        if (!found) {
          global_found = true;
          vset.add(l.v);
        }
      }
      
      for (var l in f.loops) {
        var found = false;
        for (var l2 in l.e.loops) {
          if (!fset.has(l2.f)) {
            found = true;
            break;
          }
        }
        
        if (!found && !vset.has(l.e.v1) && !vset.has(l.e.v2)) {
          global_found = true;
          eset.add(l.e);
        }
      }
      
      if (!global_found) 
        delfset.add(f);
    }
    
    for (var v in vset) {
      mesh.kill_vert(v);
    }
    
    for (var e in eset) {
      mesh.kill_edge(e);
    }
    
    for (var f in delfset) {
      mesh.kill_face(f);
    }
    
    
    mesh.api.recalc_normals();
  }
}

class TriangulateOp extends MeshOp {
  constructor(faceiter) {
    MeshOp.call(this);
    
    this.uiname = "Triangulate"
    this.name = "Triangulate";
    this.inputs = {
      faces: new CollectionProperty(undefined, [Face], "faces", "Faces", ""),
    }
    
    this.inputs.faces.set_data(faceiter);
  }

  exec(op, mesh) {
    var faces = list(this.inputs.faces);
    
    for (var f in faces) {
      var fset = triangulate(mesh, f);
      //tris_to_quads(mesh, fset);
    }
    
    mesh.api.recalc_normals();
  }
}

class Tri2QuadOp extends MeshOp {
  constructor(faceiter) {
    MeshOp.call(this);
    
    this.uiname = "Tris2Quads"
    this.name = "tri2quad";
    this.inputs = {
      faces: new CollectionProperty(undefined, [Face], "faces", "Faces", ""),
    }
    
    this.inputs.faces.set_data(faceiter);
  }

  exec(op, mesh) {
    var fset = new set();
    
    for (var f in this.inputs.faces) {
      if (f.totvert == 3)
        fset.add(f);
    }
    tris_to_quads(mesh, fset);
    
    mesh.api.recalc_normals();
  }
}

class AddCubeOp extends MeshOp {
  constructor() {
    MeshOp.call(this);
    
    this.uiname = "Add Cube"
    this.name = "add_cube";
    this.inputs = {
    }
  }

  exec(op, mesh) {
    // box
    //    v7----- v8
    //   /|      /|
    //  v4------v3|
    //  | |     | |
    //  | |v5---|-|v6
    //  |/      |/
    //  v1------v2
    //
    
    
    var d = 0.5;
    var v1 = mesh.make_vert(new Vector3([-d, -d, -d]));
    var v2 = mesh.make_vert(new Vector3([d, -d, -d]));
    var v3 = mesh.make_vert(new Vector3([d, -d, d]));
    var v4 = mesh.make_vert(new Vector3([-d, -d, d]));
    
    var v5 = mesh.make_vert(new Vector3([-d, d, -d]));
    var v6 = mesh.make_vert(new Vector3([d, d, -d]));
    var v7 = mesh.make_vert(new Vector3([-d, d, d]));
    var v8 = mesh.make_vert(new Vector3([d, d, d]));
    
    mesh.make_face(new GArray([v1, v2, v3, v4]))
    mesh.make_face(new GArray([v2, v6, v8, v3]))
    mesh.make_face(new GArray([v1, v2, v6, v5]))
    
    mesh.make_face(new GArray([v1, v4, v7, v5]))
    mesh.make_face(new GArray([v4, v3, v8, v7]))
    mesh.make_face(new GArray([v7, v5, v6, v8]))
    
    mesh.api.consistent_windings();
            
    mesh.api.recalc_normals();
    mesh.regen_render();
  }
}

class AddCircleOp extends MeshOp {
  constructor() {
    MeshOp.call(this);
    
    this.uiname = "Add Circle"
    this.name = "add_circle";
    this.inputs = {
      count: new IntProperty(8, "count", "count", "", [3, 500]),
      radius : new FloatProperty(1.0, "radius", "radius", "", [0.001, 200.0])
    };
  }

  exec(op, mesh) {
    var steps = this.inputs.count.data;
    var df = Math.PI*2.0 / (steps);
    var f = -Math.PI;
    var r = this.inputs.radius.data;
    
    var loop = new GArray();
    
    for (var i=0; i<steps; i++, f += df) {
      var x = Math.sin(f)*r;
      var y = Math.cos(f)*r;
      
      var v = mesh.make_vert(new Vector3([x, y, 0.0]));
      loop.push(v);
    }
    
    for (var i1=0; i1<loop.length; i1++) {
      var i2 = (i1+1)%loop.length;
      var e = mesh.make_edge(loop[i1], loop[i2]);
    }
    
    mesh.regen_render();
  }
}

class MeshDuplicateOp extends MeshOp {
  constructor(geometry) {
    MeshOp.call(this);
    
    this.uiname = "Duplicate"
    this.name = "duplicate";
    
    this.inputs = {
      geometry: new CollectionProperty(undefined, [Element], "geometry", "Geometry", ""),
      "deselect_old" : new BoolProperty(false, "deselect_old", "Deselect Old", "")
    };
    
    this.inputs.geometry.set_data(geometry);
  }

  exec(op, mesh) {
    mesh.api.duplicate_geometry(this.inputs.geometry, this.inputs.deselect_old.data);
    
    mesh.regen_render();
  }
}
