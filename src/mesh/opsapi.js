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

var MeshOpFlags = {USE_PARTIAL_UNDO : 1}

function MeshOpProperty(type, name, flag) {
  this.type = type;
  this.name = name;
  this.data = null;
  this.flag = flag;
  this.range = undefined : Array<float>;
  this.save_in_toolops = false; //only applies to element buffer properties
}

//
/************** don't forget to sync mprop_to_tprop and tprop_to_mprop functions ***********/
//

/*to avoid passing massive arrays around, ElementBuffers will use iterators*/
function ElementBufferProperty(name, allowed_elements) {
  this.prototype = Object.create(MeshOpProperty.prototype);
  MeshOpProperty.call(this, MPropTypes.ELEMENT_BUF, name);
  
  this.iter = null : Iterator;
  this.emask = allowed_elements;
  
  this.load_iterator = function(Iterator iter) {
    this.iter = iter;
  }
  
  this.__iterator__ = function() : Iterator {
    //console.trace();
    if (this.mesh != undefined)
      this.iter.mesh = this.mesh;
    
    return this.iter.__iterator__();
  }
}

function MeshBoolProperty(String name, Boolean value, int flag) {
  this.prototype = Object.create(MeshOpProperty.prototype);
  MeshOpProperty.call(this, MPropTypes.BOOL, name, flag);
  
  this.data = value ? true : false;
}

//flag and range are optional
function MeshIntProperty(String name, int value, int flag, Array<float> range) {
  this.prototype = Object.create(MeshOpProperty.prototype);
  MeshOpProperty.call(this, MPropTypes.INT, name, flag);
  
  this.range = range
  this.data = value;
}

function MeshFloatProperty(String name, float value, int flag) {
  this.prototype = Object.create(MeshOpProperty.prototype);
  MeshOpProperty.call(this, MPropTypes.FLOAT, name, flag);
  
  this.data = value;
}

function MeshVec3Property(String name, Vector3 value, int flag) {
  this.prototype = Object.create(MeshOpProperty.prototype);
  MeshOpProperty.call(this, MPropTypes.VEC3, name, flag);
  
  this.data = value;
}

/*note: unlike ToolOps, MeshOps can call each other and recurse.*/
function MeshOp() {
  this.name = undefined;
  this.uiname = undefined;
  
  this.inputs = {};
  this.outputs = {};
  
  this.flag = 0;
  this.undo_expand_lvl = 0; //for partial undo, how much to expand the partial mesh area
}
create_prototype(MeshOp);
MeshOp.prototype.exec = function(op, mesh) { };

function element_filter_iter(iter, typemask) {
  this.iter = iter;
  this.typemask = typemask;
  
  this.next = function() {
    if (this.mesh != undefined) //necassary for redo
      this.iter.mesh = this.mesh;
    
    var e = this.iter.next();

    while (!e.done && !(e.value.type & this.typemask)) {
      e = this.iter.next();
    }
    
    return e;
  }
  
  this.reset = function() {
    if (this.iter.reset != undefined)
      this.iter.reset();
  }
}

function element_filter(iter, typemask) {
  this.iter = iter;
  this.typemask = typemask;
  
  this.__iterator__ = function() {
    if (this.mesh != undefined) //necassary for redo
      this.iter.mesh = this.mesh;
    
    return new element_filter_iter(this.iter.__iterator__(), this.typemask);
  }
}

function element_iter_convert(iter, type) {
  this.vset = new set();
  this.iter = iter.__iterator__();
  this.subiter = undefined;
  
  if (type == MeshTypes.VERT)
    this.type = Vertex;
  else if (type == MeshTypes.EDGE)
    this.type = Edge;
  else if (type == MeshTypes.LOOP)
    this.type = Loop;
  else if (type == MeshTypes.FACE)
    this.type = Face;
  
  this.reset = function() {
    if (this.iter.reset != undefined)
      this.iter.reset();
      
    this.vset = new set();
	
    if (this.mesh != undefined)
      this.iter.mesh = this.mesh;
  }
  
  this.__iterator__  = function() {
    return this;
  }
  
  this.next = function() {
    if (this.mesh != undefined)
      this.iter.mesh = this.mesh;
      
    var v = this._next();
	
    if (v.done) return v;
	
    var vset = this.vset;
    while ((!v.done) && (v.value == undefined || vset.has(v.value))) {
      v = this._next();
    }
    
    if (!v.done)
      vset.add(v.value);
    
    return v;
  }
  
  this._next = function() {
    if (this.subiter == undefined) {
      var next = this.iter.next();
      
      if (next.done) {
        this.reset();
        return next;
      }
  
      if (next.value.constructor.name == this.type.name)
        return next;
      
      this.subiter = next.value.verts.__iterator__();
    }
    
    var vset = this.vset;
	  var v = this.subiter.next();
	  if (v.done) {
        this.subiter = undefined;
        return this._next();
	  }
	  
	  return v;
  }
}

function selectiter(mesh, typemask) {
  this.mask = typemask;
  this.iter = undefined;
  this.curtype = 0;
  this.mesh = mesh
  
  this.reset();
}
create_prototype(selectiter);

selectiter.prototype.reset = function() {
  this.iter = undefined;
  
  if (this.mask & MeshTypes.VERT)
    this.curtype = MeshTypes.VERT
  else if (this.mask & MeshTypes.EDGE)
    this.curtype = MeshTypes.EDGE;
  else if (this.mask & MeshTypes.FACE)
    this.curtype = MeshTypes.FACE
  else
    throw "Invalid element type mask in selectiter.reset()";
}

selectiter.prototype.__iterator__ = function() {
  return this;
}

selectiter.prototype.next = function() {
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

function flagiter(mesh, typemask, flag) {
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
  
  this.reset = function() {
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
  
  this.next = function() {
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

function flagiterobj(mesh, typemask, flag) {
  this.mesh = mesh;
  this.typemask = typemask;
  this.flag = flag;
  
  this.__iterator__ = function() {
    return new flagiter(this.mesh, this.typemask, this.flag);
  }
}

function MeshOpAPI(mesh) {
  this.mesh = mesh;
  
  this.gen_flag_iter = function(typemask, flag) {
    return new flagiterobj(this.mesh, typemask, flag);
  }
  
  this.gen_select_iter = function(typemask) {
    return new selectiter(this.mesh, typemask);
  }
  
  this.call_op = function(op) {
    for (var i in op.inputs) {
      var input = op.inputs[i];
      if (input.type == MPropTypes.ELEMENT_BUF) {
        input.iter.mesh = this.mesh;
        
        for (var e in input)  {
          e.flag |= Flags.DIRTY;
        }
      }
    }
    
    op.exec(op, this.mesh);
  }
}

function RemoveDoublesOp(vertiter) {
  MeshOp.call(this);
  
  this.uiname = "Remove Duplicate Verts"
  this.name = "RemoveDoubles";
  this.inputs = {
    radius: new MeshFloatProperty("radius", 0.0005), 
    input_verts: new ElementBufferProperty("input_verts", MeshTypes.VERT)
  }
  
  this.inputs.input_verts.load_iterator(vertiter);
  
  this.shash = new spatialhash();  
}
inherit(RemoveDoublesOp, MeshOp);

/*this function works by finding clusters of vertices, then creating a new mesh with
    them welded together*/
RemoveDoublesOp.prototype.exec = function(op, mesh) {
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

function SplitEdgeOp(edgeiter) {
  MeshOp.call(this);
  
  this.name = "Split Edge";
  this.inputs = {
    radius: new MeshFloatProperty("radius", 0.0005), 
    input_edges: new ElementBufferProperty("input_edges", MeshTypes.EDGE)
  }
  
  this.inputs.input_edges.load_iterator(edgeiter);
  
  mesh.api.recalc_normals();
}
inherit(SplitEdgeOp, MeshOp);

SplitEdgeOp.prototype.exec = function(op, mesh) {
  var elist = list(this.inputs.input_edges);
  for (var e in elist) {
    console.log(e.type)
    mesh.api.split_edge(e, 0.5);
  }
}

function VertexConnectOp(vertiter) {
  MeshOp.call(this);
  
  this.uiname = "Vertex Connect"
  this.name = "VertConnect";
  this.inputs = {
    input_verts: new ElementBufferProperty("input_verts", MeshTypes.VERT)
  }
  
  this.inputs.input_verts.load_iterator(vertiter);
}
inherit(VertexConnectOp, MeshOp);

VertexConnectOp.prototype.exec = function(op, mesh) {
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

function DissolveFacesOp(faceiter) {
  MeshOp.call(this);
  
  this.name = "dissolve_faces"
  this.uiname = "Dissolve";
  this.inputs = {
    faces: new ElementBufferProperty("faces", MeshTypes.FACE)
  }
  
  this.inputs.faces.load_iterator(faceiter);
  
}
inherit(DissolveFacesOp, MeshOp);

DissolveFacesOp.prototype.exec = function(op, mesh) {
  var fset = new set(this.inputs.faces);
  var shells = new GArray();
  var visit = new set();
  var cur = -1;
  
  console.log(fset.length, this.inputs.faces);
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
  
  console.log("sl", shells.length);
  
  for (var s in shells) {
    mesh.api.join_faces(s);
  }
  
  mesh.api.recalc_normals();
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

function VertSmoothOp(vertiter) {
  MeshOp.call(this);
  
  this.uiname = "Vertex Smooth"
  this.name = "VertSmooth";
  this.inputs = {
    verts: new ElementBufferProperty("verts", MeshTypes.VERT)
  }
  
  this.inputs.verts.load_iterator(vertiter);
}
inherit(VertSmoothOp, MeshOp);

VertSmoothOp.prototype.exec = function(op, mesh) {
  vert_smooth(mesh, this.inputs.verts);
  
  mesh.api.recalc_normals();
}

function ExtrudeFacesOp(faceiter) {
  MeshOp.call(this);
  
  this.flag |= MeshOpFlags.USE_PARTIAL_UNDO;

  this.uiname = "Extrude Faces"
  this.name = "ExtrudeFaces";
  this.inputs = {
    input_faces: new ElementBufferProperty("input_faces", MeshTypes.FACE)
  }
  
  this.outputs = {
    group_no: new MeshVec3Property("group_no", new Vector3())
  }
  
  this.inputs.input_faces.load_iterator(faceiter);
}
inherit(ExtrudeFacesOp, MeshOp);

ExtrudeFacesOp.prototype.exec = function(op, mesh) {
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

function ExtrudeEdgesOp(edgeiter) {
  MeshOp.call(this);
  
  this.flag |= MeshOpFlags.USE_PARTIAL_UNDO;

  this.name = "Extrude Edges"
  this.name = "ExtrudeEdges";
  this.inputs = {
    input_edges: new ElementBufferProperty("input_edges", MeshTypes.EDGE)
  }
  
  this.outputs = {
    group_no: new MeshVec3Property("group_no", new Vector3())
  }
  
  this.inputs.input_edges.load_iterator(edgeiter);
}
inherit(ExtrudeEdgesOp, MeshOp);

ExtrudeEdgesOp.prototype.exec = function(op, mesh) {
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

function ExtrudeVertsOp(vertiter) {
  MeshOp.call(this);
  
  this.uiname = "Extrude Verts"
  this.name = "ExtrudeVerts";
  this.inputs = {
    input_verts: new ElementBufferProperty("input_verts", MeshTypes.VERT)
  }
  
  this.outputs = {
    group_no: new MeshVec3Property("group_no", new Vector3())
  }
  
  this.inputs.input_verts.load_iterator(vertiter);
}
inherit(ExtrudeVertsOp, MeshOp);

ExtrudeVertsOp.prototype.exec = function(op, mesh) {
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

//extrudes vertices and edges as well as faces
function ExtrudeAllOp(elementiter) {
  MeshOp.call(this);
  
  this.flag |= MeshOpFlags.USE_PARTIAL_UNDO;
  
  this.name = "Extrude"
  this.name = "ExtrudeAll";
  this.inputs = {
    elements: new ElementBufferProperty("elements", MeshTypes.VERT|MeshTypes.EDGE|MeshTypes.FACE)
  }
  
  this.outputs = {
    group_no: new MeshVec3Property("group_no", new Vector3())
  }
  
  this.inputs.elements.load_iterator(elementiter);
}
inherit(ExtrudeAllOp, MeshOp);

ExtrudeAllOp.prototype.exec = function(op, mesh) {
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
      console.log("fset?");
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

function FlipNormalsOp(faceiter) {
  MeshOp.call(this);
  
  this.uiname = "Flip Normals"
  this.name = "FlipNormals";
  this.inputs = {
    faces: new ElementBufferProperty("faces", MeshTypes.FACE)
  }
  
  this.inputs.faces.load_iterator(faceiter);
}
inherit(FlipNormalsOp, MeshOp);

FlipNormalsOp.prototype.exec = function(op, mesh) {
  for (var f in this.inputs.faces) {
    mesh.api.reverse_winding(f);
  }
  
  mesh.api.recalc_normals();
}

function DeleteVertsOp(vertiter) {
  MeshOp.call(this);
  
  this.uiname = "Delete Vertices"
  this.name = "DeleteVertices";
  this.inputs = {
    verts: new ElementBufferProperty("verts", MeshTypes.VERT)
  }
  
  this.inputs.verts.load_iterator(vertiter);
}
inherit(DeleteVertsOp, MeshOp);

DeleteVertsOp.prototype.exec = function(op, mesh) {
  var iter = this.inputs.verts.__iterator__();
  //this.inputs.verts.reset();
  var verts = list(this.inputs.verts);
  for (var v in verts) {
    mesh.kill_vert(v);
  }
  
  mesh.api.recalc_normals();
}

function DeleteEdgesOp(vertiter) {
  MeshOp.call(this);
  
  this.uiname = "Delete Edges"
  this.name = "DeleteEdges";
  this.inputs = {
    edges: new ElementBufferProperty("edges", MeshTypes.VERT)
  }
  
  this.inputs.edges.load_iterator(vertiter);
}
inherit(DeleteEdgesOp, MeshOp);

DeleteEdgesOp.prototype.exec = function(op, mesh) {
  var iter = this.inputs.edges.__iterator__();
  //this.inputs.edges.reset();
  var edges = list(this.inputs.edges);
  for (var v in edges) {
    mesh.kill_edge(v);
  }
  
  mesh.api.recalc_normals();
}

function DeleteFacesOp(vertiter) {
  MeshOp.call(this);
  
  this.uiname = "Only Faces"
  this.name = "DeleteFaces";
  this.inputs = {
    faces: new ElementBufferProperty("faces", MeshTypes.VERT)
  }
  
  this.inputs.faces.load_iterator(vertiter);
}
inherit(DeleteFacesOp, MeshOp);

DeleteFacesOp.prototype.exec = function(op, mesh) {
  var iter = this.inputs.faces.__iterator__();
  //this.inputs.faces.reset();
  var faces = list(this.inputs.faces);
  for (var v in faces) {
    mesh.kill_face(v);
  }
  
  mesh.api.recalc_normals();
}

function DeleteFaceRegionOp(vertiter) {
  MeshOp.call(this);
  
  this.uiname = "Delete Faces"
  this.name = "DeleteFaces";
  this.inputs = {
    faces: new ElementBufferProperty("faces", MeshTypes.VERT)
  }
  
  this.inputs.faces.load_iterator(vertiter);
}
inherit(DeleteFaceRegionOp, MeshOp);

DeleteFaceRegionOp.prototype.exec = function(op, mesh) {
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

function TriangulateOp(faceiter) {
  MeshOp.call(this);
  
  this.uiname = "Triangulate"
  this.name = "Triangulate";
  this.inputs = {
    faces: new ElementBufferProperty("faces", MeshTypes.VERT)
  }
  
  this.inputs.faces.load_iterator(faceiter);
}
inherit(TriangulateOp, MeshOp);

TriangulateOp.prototype.exec = function(op, mesh) {
  var faces = list(this.inputs.faces);
  
  for (var f in faces) {
    console.log(f)
    var fset = triangulate(mesh, f);
    //tris_to_quads(mesh, fset);
  }
  
  mesh.api.recalc_normals();
}

function Tri2QuadOp(faceiter) {
  MeshOp.call(this);
  
  this.uiname = "Tris2Quads"
  this.name = "tri2quad";
  this.inputs = {
    faces: new ElementBufferProperty("faces", MeshTypes.VERT)
  }
  
  this.inputs.faces.load_iterator(faceiter);
}
inherit(Tri2QuadOp, MeshOp);

Tri2QuadOp.prototype.exec = function(op, mesh) {
  var fset = new set();
  
  for (var f in this.inputs.faces) {
    if (f.totvert == 3)
      fset.add(f);
  }
  tris_to_quads(mesh, fset);
  
  mesh.api.recalc_normals();
}

function AddCubeOp() {
  MeshOp.call(this);
  
  this.uiname = "Add Cube"
  this.name = "add_cube";
  this.inputs = {
  }
}
inherit(AddCubeOp, MeshOp);

AddCubeOp.prototype.exec = function(op, mesh) {
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

function AddCircleOp() {
  MeshOp.call(this);
  
  this.uiname = "Add Circle"
  this.name = "add_circle";
  this.inputs = {
    count: new MeshIntProperty("count", 8, undefined, [3, 500]),
    radius : new MeshFloatProperty("radius", 1.0, undefined, [0.001, 200.0])
  };
}
inherit(AddCircleOp, MeshOp);

AddCircleOp.prototype.exec = function(op, mesh) {
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

function MeshDuplicateOp(geometry) {
  MeshOp.call(this);
  
  this.uiname = "Duplicate"
  this.name = "duplicate";
  
  this.inputs = {
    "geometry" : new ElementBufferProperty("geometry", MeshTypes.VERT|MeshTypes.EDGE|MeshTypes.FACE),
    "deselect_old" : new MeshBoolProperty("deselect_old", false)
  };
  
  this.inputs.geometry.load_iterator(geometry);
}
inherit(MeshDuplicateOp, MeshOp);

MeshDuplicateOp.prototype.exec = function(op, mesh) {
  mesh.api.duplicate_geometry(this.inputs.geometry, this.inputs.deselect_old.data);
  
  mesh.regen_render();
}
