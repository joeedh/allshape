"use strict";

var Flags = {SELECT: 1, SHADE_SMOOTH: 2, DIRTY: 4, TEMP: 8}
var MeshTypes = {VERT: 1, EDGE: 2, LOOP: 4, FACE: 8}
var MeshFlags = {USE_MAP_CO: 1, TESS_JOB_FINISHED: 2}
var MeshEvents = {RECALC : 1, DESTROY : 2}

function TopoError(String msg) {
  Error.call(this, msg);
}
inherit(TopoError, Error);

//#$().class
function Element() {
  this.type = 0;
  this.eid = 0;
  this.gdata = new ElementData();
  this.flag = 0;
  this.index = 0;
}

Element.prototype.toJSON = function() : Object {
  var obj = {
    type : this.type,
    eid : this.eid,
    flag : this.flag,
    index : this.index
  };
  
  return obj;
}

//this is inherited, so don't follow normal format
Element.prototype.fromJSON = function(obj)
{
  this.type = obj.type;
  this.eid = obj.eid;
  this.flag = obj.flag;
  this.index = obj.index;
}

//#$().String
Element.prototype.toString = function() : String {
  return "[eid: " + this.eid + ", type: " + this.type + "]";
}

Element.prototype.pack = function(Array<byte> data, StructPackFunc dopack) {
  pack_int(data, this.type);
  pack_int(data, this.eid);
  pack_int(data, this.flag);
  pack_int(data, this.index);
  this.gdata.pack(data);
}

Element.prototype.unpack = function(Array<byte> data, unpack_ctx uctx) {
  this.type = unpack_int(data, uctx);
  this.eid = unpack_int(data, uctx);
  this.gdata.unpack(data, uctx);
  this.flag = unpack_int(data, uctx);
  this.index = unpack_int(data, uctx);
}

//#$().String
Element.prototype.__hash__ = function() : String {
  return String(this.type + "|" + this.eid);
}

//#$().class
function Vertex(Vector3 co, Vector3 no) {
  Element.call(this);
  
  this.type = MeshTypes.VERT;
  
  if (co == undefined)
    co = [0, 0, 0];
  if (no == undefined)
    no = [0, 0, 0];
  
  this.co = new Vector3(co);
  this.no = new Vector3(no);
  this.td_sco = new Vector3(co); //transform start coordinates
  this.loop = null : Loop;
  this.edges = new GArray<Edge>();
  
  /*position of vertex on a subsurf or other
    parametric surface.*/
  this.mapco = new Vector3(); 
  
  //#$().MeshIterate
  Object.defineProperty(this, "faces", {get: function() {
    return new MeshIterate(MeshIter.VERT_FACES, this);
  }});
  
  Object.defineProperty(this, "loops", {get: function() {
    return new MeshIterate(MeshIter.VERT_LOOPS, this);
  }});
}

inherit(Vertex, Element);

Vertex.prototype.genSchema = function() {
  var v = new Vertex().toJSON();
  
  v.edges.s_array_type = "int32";
}

Vertex.prototype.toJSON = function() {
  var obj = Element.prototype.toJSON.call(this);
  
  obj.co = this.co;
  obj.no = this.no;
  
  if (this.loop != null)
    obj.loop = this.loop.eid;
  else
    obj.loop = -1;
  
  obj.edges = [];
  obj.edges.s_array_type = "int32";
  
  for (var i=0; i<this.edges.length; i++) {
    obj.edges.push(this.edges[i].eid);
  }
  
  obj.mapco = this.mapco;
  
  return obj;
}

Vertex.fromJSON = function(obj)
{
  var v = new Vertex();
  
  Element.prototype.fromJSON.call(v, obj);
  
  v.loop = obj.loop;
  v.edges = new GArray(obj.edges);
  v.co = new Vector3(obj.co);
  v.no = new Vector3(obj.no);
  v.mapco = new Vector3(v.mapco);
  
  return v;
}

Vertex.prototype.pack = function(Array<byte> data, StructPackFunc dopack) {
  Element.prototype.pack.call(this, data);
  
  pack_vec3(data, this.co);
  pack_vec3(data, this.no);
  if (this.loop != null)
    pack_int(data, this.loop.eid);
  else
    pack_int(data, -1);
  
  pack_int(data, this.edges.length);
  
  for (var e in this.edges) {
    pack_int(data, e.eid);
  }
  
  pack_vec3(data, this.mapco);
}

Vertex.prototype.unpack = function(ArrayBuffer data, unpack_ctx uctx) {
  Element.prototype.unpack.call(this, data, uctx);
  
  this.co = unpack_vec3(data, uctx);
  this.no = unpack_vec3(data, uctx);
  this.loop = unpack_int(data, uctx);
  
  var elen = unpack_int(data, uctx);
  this.edges = new GArray();
  
  for (var ei=0; ei<elen; ei++) {
    this.edges.push(unpack_int(data, uctx));
  }
  
  this.mapco = unpack_vec3(data, uctx);
}
  
Vertex.prototype.recalc_normal = function(Boolean redo_face_normals) {
  if (redo_face_normals == undefined)
    redo_face_normals = true;
    
  this.no.zero();
  
  for (var f in this.faces) {
    if (redo_face_normals)
      f.recalc_normal();
      
    this.no.add(f.no);
  }
  
  this.no.normalize();
}
  
//#$(Vertex, Vertex).class
function Edge(Vert v1, Vert v2) {
  Element.call(this);
  
  this.type = MeshTypes.EDGE;
  this.v1 = v1;
  this.v2 = v2;
  
  this.loop = null : Loop;
  
  //#$().number
  Object.defineProperty(this, "totface", {get: function() {
    var l = this.loop;
    
    if (l == null) return 0;
    
    var i = 0;
    do {
      i++;
      l = l.radial_next;
      
      if (i > 10000) {
        console.trace();
        console.log([this._gindex, this.loop.f._gindex, l.f._gindex]);
        console.log([this.loop.index, this.loop.radial_next.index, this.loop.radial_next.radial_prev.index, this.loop.radial_next.radial_next.index]);
        console.log([this.loop.index, this.loop.radial_prev.index, this.loop.radial_prev.radial_prev.index]);
        throw new Error("Mesh integrity error; infinite loop in edge.totface. " + this._gindex);
      }
    } while (l != this.loop);
    
    return i;
  }});
  
  Object.defineProperty(this, "verts", {get: function() {
    return new MeshIterate(MeshIter.EDGE_VERTS, this);
  }});
  
  Object.defineProperty(this, "loops", {get: function() {
    return new MeshIterate(MeshIter.EDGE_LOOPS, this);
  }});
  
  Object.defineProperty(this, "faces", {get: function() {
    return new MeshIterate(MeshIter.EDGE_FACES, this);
  }});
}

inherit(Edge, Element);

Edge.prototype.toJSON = function() {
  var obj = Element.prototype.toJSON.call(this);
  
  obj.v1 = this.v1.eid;
  obj.v2 = this.v2.eid;
  obj.loop = this.loop != null ? this.loop.eid : -1;
  
  return obj;
}

Edge.fromJSON = function(obj)
{
  var e = new Edge();
  Element.prototype.fromJSON.call(e, obj);
  
  e.v1 = obj.v1;
  e.v2 = obj.v2;
  e.loop = obj.loop;
  
  return e;
}

Edge.prototype.pack = function(Array<byte> data, StructPackFunc dopack) {
  Element.prototype.pack.call(this, data);
  
  pack_int(data, this.v1.eid);
  pack_int(data, this.v2.eid);
  if (this.loop != null)
    pack_int(data, this.loop.eid);
  else
    pack_int(data, -1);
  
}

Edge.prototype.unpack = function(ArrayBuffer data, unpack_ctx uctx) {
  Element.prototype.unpack.call(this, data, uctx);
  
  this.v1 = unpack_int(data, uctx);
  this.v2 = unpack_int(data, uctx);
  this.loop = unpack_int(data, uctx);
}

Edge.prototype.shared_vert = function(Edge e2) : Vertex {
  if (e2.v1 == this.v1 || e2.v1 == this.v2) return e2.v1;
  else if (e2.v2 == this.v1 || e2.v2 == this.v2) return e2.v2;
  return null;
}

Edge.prototype.vert_in_edge = function(Vertex v) : Boolean {
  return v == this.v1 || v == this.v2;
}

//#$(Vertex).Vertex
Edge.prototype.other_vert = function(Vertex v) : Vertex {
  if (v == this.v1) return this.v2;
  else if (v == this.v2) return this.v1;
  else return null;
}

//#$(Vertex, Edge, Face=null).class
function Loop(Vertex v, Edge e, Face f) {
  Element.call(this);
  
  this.type = MeshTypes.LOOP;
  this.v = v;
  this.e = e;
  this.f = f;
  this.list = null;
  this.eid = 0;
  
  this.next = null;
  this.prev = null;
  this.radial_next = null;
  this.radial_prev = null;
}

inherit(Loop, Element);

Loop.prototype.toJSON = function() {
  var obj = {};
  obj.eid = this.eid;
  obj.v = this.v.eid;
  obj.e = this.e.eid;
  obj.radial_next = this.radial_next.eid;
  obj.radial_prev = this.radial_prev.eid;
  
  return obj;
}

Loop.fromJSON = function(obj) {
  var l = new Loop();
  
  l.eid = obj.eid;
  l.v = obj.v;
  l.e = obj.e;
  l.radial_next = obj.radial_next;
  l.radial_prev = obj.radial_prev;
  
  return l;
}

Loop.prototype.pack = function(array<byte> data, StructPackFunc dopack) {
  pack_int(data, this.eid);
  pack_int(data, this.v.eid);
  pack_int(data, this.e.eid);
  pack_int(data, this.radial_next.eid);
  pack_int(data, this.radial_prev.eid);
}

Loop.prototype.unpack = function(ArrayBuffer data, unpack_ctx uctx) {
  this.eid = unpack_int(data, uctx);
  this.v = unpack_int(data, uctx);
  this.e = unpack_int(data, uctx);
  this.radial_next = unpack_int(data, uctx);
  this.radial_prev = unpack_int(data, uctx);
}

//#$().string
Loop.prototype.toSource = function() : String {
  return "<Loop>";
}

//#$().string
Loop.prototype.__hash__ = function() : String {
  return String(this.f.eid + "|" + this.type + "|" + this.eid);
}

//#$(LoopList).iter
function LoopIter(LoopList looplist) {
  this.list = looplist;
  this.startl = looplist.loop;
  this.cur = this.startl;
  
  this.next = function() : Loop {
    var ret = this.cur;
    
    if (this.cur == null)
      throw StopIteration;
      
    this.cur = this.cur.next;
    if (this.cur == this.startl)
      this.cur = null;
    
    return ret;
  }
}

function LoopList(Loop loop) {
  this.loop = loop;
  this.length = 0;
  
}

create_prototype(LoopList);

LoopList.prototype.__iterator__ = function() : LoopIter {
  return new LoopIter(this);
}

LoopList.prototype.toJSON = function() {
  var obj = {};
  obj.length = this.length;
  
  var loops = []
  var loop = this.loop;
  do {
    loops.push(loop);
    loop = loop.next;
  } while (loop != this.loop);
  
  obj.loops = loops;
  
  return obj;
}

LoopList.fromJSON = function(obj) {
  var list = new LoopList(null);
  list.length = obj.length;
  
  var loops = obj.loops;
  var last = undefined;
  for (var i=0; i<loops.length; i++) {
    var l = Loop.fromJSON(loops[i]);
    
    if (last == undefined) {
      list.loop = l;
    } else {
      last.next = l;
      l.prev = last;
    }
    last = l;
  }
  
  if (last != undefined) {
    last.next = list.loop;
    list.loop.prev = last;
  }
  
  return list;
}

var _static_cent = new Vector3()

//#$(GArray).class
function Face(GArray< GArray<Loop> > looplists) {
  /*
  Note: copies looplists
  */
  
  Element.call(this);
  
  this.type = MeshTypes.FACE;
  this.looplists = looplists;
  this.totvert = 0;
  this.no = new Vector3();
  this.center = new Vector3();
  
  /*position of vertex on a subsurf or other
    parametric surface.*/
  this.mapcenter = new Vector3(); 
  
  for (var i=0; i<looplists.length; i++) {
    for (var l in looplists[i]) {
      l.f = this;
      l.list = looplists[i];
      this.totvert++;
    }
  }

  //#$().MeshIterate
  Object.defineProperty(this, "loops", {get: function() {
    return new MeshIterate(MeshIter.FACE_ALL_LOOPS, this);
  }});
  
  //#$().MeshIterate
  Object.defineProperty(this, "bounds", {get: function() {
    return new MeshIterate(MeshIter.FACE_LISTS, this);
  }});
  
  //#$().MeshIterate
  Object.defineProperty(this, "verts", {get: function() {
    return new MeshIterate(MeshIter.FACE_VERTS, this);
  }});

  //#$().MeshIterate
  Object.defineProperty(this, "edges", {get: function() {
    return new MeshIterate(MeshIter.FACE_EDGES, this);
  }});
  
}
inherit(Face, Element);

//#$().string
Face.prototype.toSource = function() : String {
  return "<Face>";
}

Face.prototype.toJSON = function() {
  var obj = Element.prototype.toJSON.call(this);
  
  obj.totvert = this.totvert;
  obj.no = this.no;
  obj.center = this.center;
  obj.mapcenter = this.mapcenter;
  
  var lists = []
  for (var list in this.looplists) {
    lists.push(list)
  }
  
  obj.lists = lists;
  
  return obj;
}

Face.fromJSON = function(obj) {
  var lists = obj.lists;
  var f = new Face(new GArray());
  
  Element.prototype.fromJSON.call(f, obj);
  
  f.totvert = obj.totvert;
  f.no = new Vector3(obj.no);
  f.center = new Vector3(obj.center);
  f.mapcenter = new Vector3(obj.mapcenter);
  
  for (var i=0; i<lists.length; i++) {
    f.looplists.push(LoopList.fromJSON(lists[i]));
  }
  
  return f;
}

Face.prototype.pack = function(Array<byte> data, StructPackFunc dopack) {
  Element.prototype.pack.call(this, data);
  pack_int(data, this.totvert);
  pack_vec3(data, this.no);
  pack_vec3(data, this.center);
  pack_vec3(data, this.mapcenter);

  pack_int(data, this.looplists.length);
  for (var lst in this.looplists) {
    var i = 0;
    for (var l in lst) {
      i++;
    }
    
    pack_int(data, i);
    for (var l in lst) {
      l.pack(data);
    }
  }
}

Face.prototype.unpack = function(ArrayBuffer data, unpack_ctx uctx) {
  Element.prototype.unpack.call(this, data, uctx);
  this.totvert = unpack_int(data, uctx);
  this.no = unpack_vec3(data, uctx);
  this.center = unpack_vec3(data, uctx);
  this.mapcenter = unpack_vec3(data, uctx);
  
  var lstlen = unpack_int(data, uctx);
  this.looplists = new GArray();
  
  for (var i=0; i<lstlen; i++) {
    var loop = new LoopList();
    this.looplists.push(loop);
    
    var looplen = unpack_int(data, uctx);
    var firstloop, prevloop;
    for (var j=0; j<looplen; j++) {
      var l = new Loop();
      l.f = this;
      l.list = loop;
      
      l.unpack(data, uctx);
      if (j > 0) {
        l.prev = prevloop;
        prevloop.next = l;
      }
      
      prevloop = l;
      if (j == 0)
        firstloop = l;
    }
    firstloop.prev = prevloop;
    prevloop.next = firstloop;
    
    loop.loop = firstloop;
    loop.length = looplen;
  }
}

var _frn_n1 = new Vector3();
Face.prototype.recalc_normal = function() {
  var Vector3 n = null;
  
  /*recalculate centroids*/
  _static_cent[0] = _static_cent[1] = _static_cent[2] = 0.0;
  
  for (var v in this.verts) {
    _static_cent.add(v.co);
  }
  
  _static_cent.divideScalar(this.totvert);
  this.center.load(_static_cent)
  
  if (this.totvert == 3) {
    var l = this.looplists[0].loop;
    
    var n = normal_tri(l.v.co, l.next.v.co, l.next.next.v.co);
  } else if (this.totvert == 4) {
    var l = this.looplists[0].loop;
    
    var n = normal_quad(l.v.co, l.next.v.co, l.next.next.v.co, l.next.next.next.v.co);
  } else {
    var l = this.looplists[0].loop;
    var firstl = l;
    
    var n = _frn_n1;
    n.zero();
    do {
      n.add(normal_tri(l.v.co, l.next.v.co, _static_cent));
      l = l.next;
    } while (l != firstl);

    n.normalize();
  }
  
  n.normalize();
  this.no.load(n);
}
  
//#$().number
function EIDGen() {
  this.cur_eid = 1;
}
create_prototype(EIDGen);

EIDGen.prototype.set_cur = function(cur) {
  this.cur_eid = Math.ceil(cur);
}

EIDGen.prototype.toJSON = function() {
  return { cur_eid : this.cur_eid };
}
//if cur is >= to this.cur_eid, 
//set this.cur to cur+1
EIDGen.prototype.max_cur = function(cur) {
  this.cur_eid = Math.max(Math.ceil(cur)+1, this.cur_eid);
}

EIDGen.prototype.get_cur = function(cur) : int {
  return this.cur_eid;
}

EIDGen.prototype.gen_eid = function() : int {
  return this.cur_eid++;
}

EIDGen.fromJSON = function(obj) {
  var idgen = new EIDGen()
  idgen.cur_eid = obj.cur_eid;
  
  return idgen;
}
//#$(GeoArray).class
function GeoArrayIter<T>(GeoArray<T> arr) {
  this.cur = 0;
  this.arr = arr;
  
  this.reset = function() {
    this.cur = 0;
  }
  
  this.next = function() : T {
    var cur = this.cur;
    var len = this.arr.arr.length;
    var arr = this.arr.arr
    
    while (cur != len && (arr[cur] == undefined)) {
      cur++;
    }
    
    if (cur == len) {
      this.reset();
      throw StopIteration;
    } else {
      this.cur = cur+1;
      return arr[cur];
    }
  }
}

function AllTypesSelectIter(mesh) {
  this.type = MeshTypes.VERT;
  this.mesh = mesh;
  this.iter = undefined : Iter;
  
  this.__iterator__ = function() {
    return this;
  }
  
  this.reset = function() {
    this.type = MeshTypes.VERT;
    this.iter = undefined;
  }
  
  this.next = function() {
    //don't initialize iter in reset function, not only can
    //it mess up opsapi state, it will also mess with the GC
    if (this.iter == undefined) {
      this.iter = this.mesh.verts.selected.__iterator__();
    }
    
    try {
      var next = this.iter.next();
      
      return next;
    } catch (_error) {
      if (_error != StopIteration) {
        throw _error;
      } else {
        if (this.type == MeshTypes.VERT) {
          this.type = MeshTypes.EDGE;
          this.iter = this.mesh.edges.selected.__iterator__();
          
          return this.next();
        } else if (this.type == MeshTypes.EDGE) {
          this.type = MeshTypes.FACE;
          this.iter = this.mesh.faces.selected.__iterator__();
          
          return this.next();
        } else {
          this.reset();
          throw StopIteration;
        }
      }
    }
  }
}

//#$().class
function GeoArray<T>(type, idgen, eidmap) {
  this.arr = new Array();
  this.length = 0;  
  this.idgen = idgen
  this.type = type
  this.global_eidmap = eidmap;
  
  this.highlight = null;
  this.freelist = new GArray()
  this.iter = new GeoArrayIter<T>(this);
  this.eidmap = {};
  this._totsel = 0
  
  //#$().GeoArrayIter
  this.__iterator__ = function() : GeoArrayIter<T> {
    if (this.iter.cur != 0)
      return new GeoArrayIter<T>(this);
    else
      return this.iter;
  }
  
  this._selected = {} : ObjectMap<int,T>;
  
  Object.defineProperty(this, "selected", {get: function() : Iterator<T> {
    return new obj_value_iter(this._selected);
  }});
  
  Object.defineProperty(this, "totsel", {get: function() : Iterator<T> {
    return this._totsel;
  }});
  
  this.select = function(T e, Boolean state) { //state is optional, defaults to true
    if (e == undefined) {
      console.trace();
      console.log("Selection error");
      return;
    }
    
    if (state == undefined)
      state = true;
      
    if (e.type != this.type) {
      console.trace();
      throw new Error("Passed in wrong type to GeoArray.select! src: " + e.type + " this.type " + this.type)
    }
    if (state) {
      if (!(e.flag & Flags.SELECT)) {
        e.flag |= Flags.SELECT;
        this._selected[e.__hash__()] = e;
        this._totsel++;
      }
    } else {
      if ((e.flag & Flags.SELECT)) {
        e.flag &= ~Flags.SELECT;
        delete this._selected[e.__hash__()];
        this._totsel--;
      }
    }
  }
  
  this.get = function(int eid) : int {
    var e = this.eidmap[eid];
    
    if (e != undefined && e.type != this.type) {
      console.log("Tried to fetch eid of type " + e.type + "from GeoArray of type " + this.type + ".");
      console.trace();
      
      return undefined;
    }
    
    return e;
  }
  
  //#$(var).undefined
  this.push = function(T item, Boolean set_eid) { //set eid is optional, defaults to true
    /*add item to selection list, if necassary*/
    if (item.flag & Flags.SELECT) {
      item.flag &= ~Flags.SELECT;
      this.select(item, true);
    }
    
    if (set_eid == undefined)
      set_eid = true;
    
    if (set_eid) {
      item.eid = this.idgen.gen_eid();
    } else {
      this.idgen.max_cur(item.eid);
    }
    
    this.eidmap[item.eid] = item;
    this.global_eidmap[item.eid] = item;
    
    if (this.freelist.length > 0) {
      var idx = this.freelist.pop();
      
      if (this.arr[idx] != undefined) {
        console.log("Corrupted freelist in GeoArray.push()!");
        console.trace()
      }
      
      item._gindex = idx;
      this.arr[idx] = item;
      
      this.length += 1;
      return;
    }
    
    item._gindex = this.arr.length;
    this.arr.push(item);
    
    this.length += 1;
  }
  
  //#$().MeshIterate.undefined
  this.index_update = function() {
    var i = 0;
    
    for (var item in this) {
      item.index = i++;
    }
  }
  
  //#$(var).undefined
  this.remove = function(T item) {
    /*if (this.arr.indexOf(item) < 0) {
      throw new Error("Mesh integrity error; tried to remove invalid mesh element");
    }// */
    
    /*ensure item is not in selection list*/
    this.select(item, false);
    
    if (this.highlight == item)
      this.highlight = null;
    
    delete this.eidmap[item.eid];
    delete this.global_eidmap[item.eid];
    this.arr[item._gindex] = undefined;
    
    this.freelist.push(item._gindex);
    item._gindex = -1;
    this.length -= 1;
  }
}

//#$(var).number
function CountIter(Iterator iter) {
  var i = 0;
  for (var item in iter) {
    i++;
  }
  
  return i;
}

//#$(Face).class
function FaceVertIter(Face data) {
  this.data = data
  this.curlist = 0;
  this.curloop = data.looplists[0].loop;
  this.startloop = data.looplists[0].loop;
  
  //#$().Vertex
  this.next = function() : Vertex {
    if (this.curloop == null) throw StopIteration;
    
    var ret = this.curloop.v;
    
    this.curloop = this.curloop.next;
    if (this.curloop == this.startloop) {
      this.curloop = null;
      this.curlist++;
      
      if (this.curlist < this.data.looplists.length) {
         this.curloop = this.startloop = this.data.looplists[this.curlist].loop;
      }
    }
    
    return ret;
  }
}

//#$(Face).class
function FaceLoopIter(Face data) {
  this.data = data
  this.curlist = 0;
  this.curloop = data.looplists[0].loop;
  this.startloop = data.looplists[0].loop;
  
  //#$().Vertex
  this.next = function() : Loop {
    if (this.curloop == null) throw StopIteration;
    
    var ret = this.curloop;
    
    this.curloop = this.curloop.next;
    if (this.curloop == this.startloop) {
      this.curloop = null;
      this.curlist++;
      
      if (this.curlist < this.data.looplists.length) {
         this.curloop = this.startloop = this.data.looplists[this.curlist].loop;
      }
    }
    
    return ret;
  }
}

//#$(Face).class
function FaceEdgeIter(Face data) {
  this.data = data
  this.curlist = 0;
  this.curloop = data.looplists[0].loop;
  this.startloop = data.looplists[0].loop;
  
  //#$().Vertex
  this.next = function() : Edge {
    if (this.curloop == null) throw StopIteration;
    
    var ret = this.curloop.e;
    
    this.curloop = this.curloop.next;
    if (this.curloop == this.startloop) {
      this.curloop = null;
      this.curlist++;
      
      if (this.curlist < this.data.looplists.length) {
         this.curloop = this.startloop = this.data.looplists[this.curlist].loop;
      }
    }
    
    return ret;
  }
}

//#$(Vert).class
function VertEdgeIter(Vert data) {
  this.data = data
  this.first = data;
  this.cur = 0;

  //#$().Edge
  this.next = function() : Edge {
    if (this.cur < this.data.edges.length()) {
      return this.data.edges[this.cur++];
    } else {
      throw StopIteration;
    }
  }
}

function VertLoopIter(Vert data) {
  this.data = data;
  this.first = data;
  this.cur = 0;
  
  this.startloop = data.loop;
  this.curedge = 0;
  if (data.edges.length != 0) 
    this.curloop = data.edges[0].loop;
  else
    this.curloop = null;
  
  this.next = function() : Loop {
    var ret = null;

    if (this.curloop == null) {
      throw StopIteration;
    }
    
    ret = this.curloop;
    if (ret.v != this.data)
      ret = ret.next;
      
    this.curloop = this.curloop.radial_next;
    if (this.curloop == this.data.edges[this.curedge].loop) {
      this.curedge += 1;
      
      if (this.curedge != this.data.edges.length)
        this.curloop = this.data.edges[this.curedge].loop;
      else
        this.curloop = null;
    }
    
    return ret;
  }
}

function VertFaceIter(Vert data) {
  this.data = data
  this.first = data;
  this.cur = 0;
  
  this.startloop = data.loop;
  this.curedge = 0;
  if (data.edges.length != 0) 
    this.curloop = data.edges[0].loop;
  else
    this.curloop = null;
  
  this.next = function() : Face {
    if (this.curedge == this.data.edges.length || this.curloop == null) {
      throw StopIteration;
    }

    var ret = this.curloop.f;
    
    this.curloop = this.curloop.radial_next;
    if (this.curloop == this.data.edges[this.curedge].loop) {
      this.curedge += 1;
      
      if (this.curedge != this.data.edges.length)
        this.curloop = this.data.edges[this.curedge].loop;
    }
    
    return ret;
  }
}

function EdgeVertIter(Edge data) {
  this.data = data;
  this.i = 0;
  
  this.next = function() : Vertex {
    if (this.i == 0) {
      this.i++;
      return this.data.v1;
    } else if (this.i == 1) {
      this.i++;
      return this.data.v2;
    } else {
      this.i = 0;
      throw StopIteration;
    }
  }
  
  this.reset = function() {
    this.i = 0;
  }
}

function EdgeFaceIter(Edge data) {
  this.data = data
  this.first = data;
  this.cur = 0;
  this.curloop = data.loop;
  
  this.next = function() : Face {
    if (this.curloop == null) {
      throw StopIteration;
    }
    
    var ret = this.curloop.f;
 
    this.curloop = this.curloop.radial_next; 
    if (this.curloop == this.data.loop) {
      this.curloop = null; //set stop condition
    }
    
    return ret;
  }
}

function EdgeLoopIter(Edge data) {
  this.data = data
  this.first = data;
  this.cur = 0;
  this.curloop = data.loop;
  
  this.next = function() : Loop {
    if (this.curloop == null) {
      throw StopIteration;
    }
    
    var ret = this.curloop;
 
    this.curloop = this.curloop.radial_next; 
    if (this.curloop == this.data.loop) {
      this.curloop = null; //set stop condition
    }
    
    return ret;
  }
}

var MeshIter = {}

MeshIter.VERT_EDGES = 5;
MeshIter.VERT_FACES = 6;
MeshIter.EDGE_FACES = 7;
MeshIter.EDGE_LOOPS = 8;
MeshIter.FACE_VERTS = 9;
MeshIter.FACE_EDGES = 10;
MeshIter.FACE_ALL_LOOPS = 11
MeshIter.EDGE_VERTS = 12

function MeshIterate(type, data) {
  this.type = type;
  this.data = data;
  this.flag = 0;
  
  this.__iterator__ = function() : Iterator {
    if (this.type == MeshIter.FACE_VERTS)
      return new FaceVertIter(this.data);
    else if (this.type == MeshIter.VERT_EDGES)
      return new VertEdgeIter(this.data);
    else if (this.type == MeshIter.VERT_FACES)
      return new VertFaceIter(this.data);
    else if (this.type == MeshIter.VERT_LOOPS)
      return new VertLoopIter(this.data);
    else if (this.type == MeshIter.EDGE_FACES)
      return new EdgeFaceIter(this.data);
    else if (this.type == MeshIter.EDGE_LOOPS)
      return new EdgeLoopIter(this.data);    
    else if (this.type == MeshIter.FACE_EDGES)
      return new FaceEdgeIter(this.data);    
    else if (this.type == MeshIter.FACE_ALL_LOOPS)
      return new FaceLoopIter(this.data);
    else if (this.type == MeshIter.EDGE_VERTS)
      return new EdgeVertIter(this.data);
  }
}

var _mesh_id_gen = 0
function Mesh() {
  this.ops = new MeshOpAPI(this);
  
  this._id = _mesh_id_gen++;
  
  this.idgen = new EIDGen();
  this.eidmap = {};
  
  Object.defineProperty(this, "selected", {get: function() : Iterator<T> {
    return new AllTypesSelectIter(this);
  }});
  
  this.verts = new GeoArray<Vert>(MeshTypes.VERT, this.idgen, this.eidmap);
  this.edges = new GeoArray<Edge>(MeshTypes.EDGE, this.idgen, this.eidmap);
  this.faces = new GeoArray<Face>(MeshTypes.FACE, this.idgen, this.eidmap);
 
  this.vdata = new GeoDataLayout();
  this.edata = new GeoDataLayout();
  this.ldata = new GeoDataLayout();
  this.fdata = new GeoDataLayout();
  
  this.event_users = new hashtable();
  
  this.name = "";
  this.materials = new GArray();
  
  this.looptris = new GArray<Loop>(); /*triangles, defined by triplets of loops*/
  
  this.render = 0;
  this.api = new MeshAPI(this);
  
  this.__hash__ = function() : String {
    return "Mesh" + this._id;
  }
  
  this.remove_callback = function(owner)
  {
    this.event_users.remove(owner);
  }
  
  //callback is a function with args (owner, mesh, event),
  //where event is one of MeshEvents
  this.update_callback = function(owner, callback)
  {
    this.event_users.set(owner, callback);
  }
  
  //expandlvl is how many times we should topologically "grow" the input vert set
  this.gen_partial = function(geom, expandlvl) { 
    var vset = new set();
    var eset = new set();
    var fset = new set();
    
    var test_vset = new set();
    for (var e in geom) {
      if (e.type == MeshTypes.VERT) {
        vset.add(e);
        
        for (var e2 in e.edges) {
          for (var l in e2.loops) {
            eset.add(l.e);
            fset.add(l.f);
          }
        }
      } else if (e.type == MeshTypes.EDGE) {
        eset.add(e);
        
        test_vset.add(e.v1);
        test_vset.add(e.v2);
        
        for (var f in e.faces) {
          if (!fset.has(f)) {
            for (var v in f.verts) {
              test_vset.add(v);
            }  
          }
          fset.add(f);
        }
      } else if (e.type == MeshTypes.FACE) {
        fset.add(e);
        
        var Face f = e;
        for (var v in f.verts) {
          test_vset.add(v);
        }
      } else {
        throw new Error("Invalid element type "+e.type+"!")
      }
    }
    
    for (var f in fset) {
      for (var e in f.edges) {
        var found = false;
        for (var f2 in e.faces) {
          if (!fset.has(f2)) {
            found = true;
            break;
          }
        }
        
        if (!found) {
          if (!eset.has(e)) {
            eset.add(e);
            test_vset.add(e.v1);
            test_vset.add(e.v2);
          }
        }
      }
    }
    
    for (var v in test_vset) {
      if (vset.has(v)) 
        continue;
      
      var i=0, c=0;
      for (var e in v.edges) {
        c += eset.has(e) ? 1 : 0;
        i++;
      }
      
      if (i == c) {
        vset.add(v);
      }
    }
        
    for (var i=0; i<expandlvl; i++) {
      var vset2 = new set();
      for (var v in vset) {
        for (var e in v.edges) {
          for (var l in e.loops) {
            vset2.add(l.v);
            eset.add(l.e);
            fset.add(l.f);
            for (var l2 in l.f.loops) {
              vset2.add(l2.v);
              eset.add(l2.e);
            }
          }
        }
      }
      
      for (var v in vset2) {
        vset.add(v);
      }
    }
    
    //v.loops is the set of loops around v
    //where loop.v == v; thus, to reliably get all
    //edges and faces around a vert we have
    //to iterate v.edges and e.loops manually.
    for (var v in vset) {
      for (var e in v.edges) {
        for (var l in v.loops) {
          eset.add(l.e);
          fset.add(l.f);
        }
      }
    }
    
    //copy data
    var data = []
    
    pack_int(data, vset.length);
    for (var v in vset) {
      v.pack(data);
    }
    
    pack_int(data, eset.length);
    for (var e in eset) {
      e.pack(data);
    }
    
    pack_int(data, fset.length);
    for (var f in fset) {
      f.pack(data);
    }
    
    data = new DataView(new Uint8Array(data).buffer);
    
    var veids = list(vset);
    var eeids = list(eset);
    var feids = list(fset);
    
    for (var i=0; i<veids.length; i++) {
      veids[i] = veids[i].eid;
    }
    for (var i=0; i<eeids.length; i++) {
      eeids[i] = eeids[i].eid;
    }
    for (var i=0; i<feids.length; i++) {
      feids[i] = feids[i].eid;
    }
    
    var max_eid = this.idgen.get_cur();
    
    var obj = {
      v_eids : veids, 
      e_eids : eeids, 
      f_eids : feids, 
      max_eid : max_eid, 
      data : data,
      eidgen : this.idgen.get_cur()};
    
    return obj;
  }  
  
  this.load_partial = function(part) {
    for (var f in part.f_eids) {
      f = this.faces.get(f);
      if (f == undefined)
        continue;
      
      if (f.type != MeshTypes.FACE) {
        console.log("YEEK!");
        throw "Invalid f eid type"+f;
      }
      
      this.kill_face(f);
    }
    for (var e in part.e_eids) {
      e = this.edges.get(e);
      if (e == undefined)
        continue;
        
      if (e.type != MeshTypes.EDGE) {
        console.log("YEEK!");
        throw "Invalid e eid type"+e;
      }
        
      this.kill_edge(e);
    }
    
    for (var v in part.v_eids) {
      v = this.verts.get(v);
      if (v == undefined)
        continue;
        
      if (v.type != MeshTypes.VERT) {
        console.log("YEEK!");
        throw "Invalid v eid type"+v;
      }
        
      this.kill_vert(v);
    }
    
    //destroy all geometry created after gen_partial was originally called
    var last_e = this.idgen.get_cur();
    
    var eidmap = this.eidmap;
    
    for (var eid=part.max_eid; eid<last_e; eid++) {
      var e = eidmap[eid];
      
      if (e == undefined)
        continue;
      
      this.kill(e);
    }
    
    //----   restore original eid generator counter   ----
    var idgen = this.idgen;
    idgen.set_cur(part.eidgen);
    
    var data = part.data;
    var uctx = new unpack_ctx();
    
    var newvs = new set();
    var verts = new GArray();
    var edges = new GArray();
    var faces = new GArray();
    
    var totv = unpack_int(data, uctx);
    for (var i=0; i<totv; i++) {
      var v = new Vertex();
      v.unpack(data, uctx);
      
      newvs.add(v.eid);
      verts.push(v);
    }
    
    var tote = unpack_int(data, uctx);    
    for (var i=0; i<tote; i++) {
      var e = new Edge();
      e.unpack(data, uctx);
      
      edges.push(e);
    }
    
    var loops = {}; //includes all loops in the mesh
    var loops2 = {}; //only includes new loops
    
    var totf = unpack_int(data, uctx);
    for (var i=0; i<totf; i++) {
      var f = new Face([]);
      f.unpack(data, uctx);
      
      faces.push(f);
      
      for (var list in f.looplists) {
        for (var l in list) {
          l.list = list;
          l.f = f;
          loops[l.eid] = l;
          loops2[l.eid] = l;
          idgen.max_cur(l.eid);
        }
      }
    }
    
    //we add verts/edges/faces eid's here, to ensure
    //this.idgen ends up in the correct state
    for (var v in verts) {
      this.verts.push(v, false);
    }
    
    for (var e in edges) {
      this.edges.push(e, false);
    }
    
    var i = 0;
    for (var f in faces) {
      this.faces.push(f, false);
    }
    
    //add existing loops to loops set
    for (var f in this.faces) {
      for (var list in f.looplists) {
        for (var l in list) {
          loops[l.eid] = l;
        }
      }
    }
    
    var c = 0;
    for (var f in faces) {
      for (var list in f.looplists) {
        for (var l in list) {
          l.e = eidmap[l.e];
          l.v = eidmap[l.v];
          
          l.radial_next = null; //loops[l.radial_next];
          l.radial_prev = null; //loops[l.radial_prev];
        }
      }
    }
    
    for (var e in edges) {
      e.v1 = eidmap[e.v1];
      e.v2 = eidmap[e.v2];
      
      if (!newvs.has(e.v1.eid))
        e.v1.edges.push(e);
      if (!newvs.has(e.v2.eid))
        e.v2.edges.push(e);
      
      //if (e.loop == -1 || (e.loop in loops2))
        e.loop = null;
      //else 
      //  e.loop = loops[e.loop];
    }
    
    for (var v in verts) {
      var elen = v.edges.length;
      
      for (var i=0; i<elen; i++) {
        v.edges[i] = eidmap[v.edges[i]];
      }
      
      //if (v.loop == -1)
        v.loop = null;
      //else 
      //  v.loop = loops[v.loop];      
    }
    
    for (var f in faces) {
      for (var list in f.looplists) {
        for (var l in list) {
          this._radial_loop_insert(l.e, l);
        }
      }
    }
  }
  
  this.regen_positions = function() {
    this.render.recalc |= RecalcFlags.REGEN_COS;
    
    this.do_callbacks(MeshEvents.RECALC);
  }
  
  this.regen_normals = function() {
    this.render.recalc |= RecalcFlags.REGEN_NORS;
    
    this.do_callbacks(MeshEvents.RECALC);
  }
  
  this.do_callbacks = function(event) {
    for (var k in this.event_users) {
      this.event_users.get(k)(k, this, event);
    }
  }
  
  this.regen_render = function() {
    this.render.recalc |= RecalcFlags.REGEN_NORS | RecalcFlags.REGEN_TESS | RecalcFlags.REGEN_COS | RecalcFlags.REGEN_COLORS;
    for (var f in this.faces) {
      f.flag |= Flags.DIRTY;
    }
    
    this.do_callbacks(MeshEvents.RECALC);
  }
  
  this.regen_colors = function() {
    this.render.recalc |= RecalcFlags.REGEN_COLORS;
    
    this.do_callbacks(MeshEvents.RECALC);
  }
  
  this.copy = function() : Mesh {
    var m2 = new Mesh();
    m2.render = new render();

    m2.render.vertprogram = this.render.vertprogram;
    m2.render.drawprogram = this.render.drawprogram;
    
    this.verts.index_update();
    this.edges.index_update();
    this.faces.index_update();
    
    var verts = new GArray()
    
    for (var v in this.verts) {
      var v2 = m2.make_vert(v.co, v.no);
      m2.copy_vert_data(v2, v, true);
      verts.push(v2);
    }
    
    for (var e in this.edges) {
      var e2 = m2.make_edge(verts[e.v1.index], verts[e.v2.index], false);
      m2.copy_edge_data(e2, e, true);
    }
    
    for (var f in this.faces) {
      var vlists = new GArray();
      
      for (var list in f.looplists) {
        var loop = new GArray();
        for (var l in list) {
          loop.push(verts[l.v.index])
        }
        vlists.push(loop);
      }
      
      var f2 = m2.make_face_complex(vlists);
      m2.copy_face_data(f2, f, true);
    }
    
    return m2;
  }

  
  this.toJSONd = function() {
    var obj = {};
    var data = [];
    
    obj.data = data;
    //obj.data.s_array_type = "byte";
    this.pack(data);
    
    return obj;
  }
  
  this.toJSON = function() {
    var obj = {};
    
    obj.idgen = this.idgen;
    obj._id = this._id;
    obj.name = new String(this.name);
    
    var vs = obj.vs = [];
    for (var v in this.verts) {
      vs.push(v);
    }
    
    var es = obj.es = [];
    for (var e in this.edges) {
      es.push(e);
    }
    
    var fs = obj.fs = [];
    for (var f in this.faces) {
      fs.push(f);
    }
    
    return obj;
  }
  
  this.pack = function(Array<byte> data, StructPackFunc dopack) {
    pack_int(data, this.verts.length);
    for (var v in this.verts) {
      v.pack(data);
    }
    
    pack_int(data, this.edges.length);
    for (var e in this.edges) {
      e.pack(data);
    }
    
    pack_int(data, this.faces.length);
    for (var f in this.faces) {
      f.pack(data);
    }
  }
  
  this.unpack = function(ArrayBuffer data, unpack_ctx uctx) {
    var vlen = unpack_int(data, uctx);
    console.log("vlen: ", vlen);
    
    var loops = {}
    var eidmap = this.eidmap;
    
    for (var i=0; i<vlen; i++) {
      var v = new Vertex();
      v.unpack(data, uctx);
      
      this.verts.push(v, false);
    }
    
    var elen = unpack_int(data, uctx);
    console.log("elen: ", elen);
    for (var i=0; i<elen; i++) {
      var e = new Edge();
      e.unpack(data, uctx);
      //console.log("e.v1", e.v1);
      
      this.edges.push(e, false);
      
      e.v1 = eidmap[e.v1];
      e.v2 = eidmap[e.v2];
    }
    
    var flen = unpack_int(data, uctx);
    
    console.log("flen: ", flen);
    for (var i=0; i<flen; i++) {
      var f = new Face([]);
      f.unpack(data, uctx);
      
      for (var lst in f.looplists) {
        for (var l in lst) {
          l.v = eidmap[l.v];
          l.e = eidmap[l.e];
          l.f = f;
          l.list = lst;
          loops[l.eid] = l;
        }
      }
      
      this.faces.push(f, false);
    }
    
    /*relink loops*/
    for (var v in this.verts) {
      for (var i=0; i<v.edges.length; i++) {
        v.edges[i] = eidmap[v.edges[i]]
      }
      
      if (v.loop != -1)
        v.loop = loops[v.loop];
      else
        v.loop = null;
    }
    
    for (var e in this.edges) {
      if (e.loop != -1)
        e.loop = loops[e.loop];
      else
        e.loop = null;
    }
    
    for (var f in this.faces) {
      for (var lst in f.looplists) {
        for (var l in lst) {
          l.radial_next = loops[l.radial_next];
          l.radial_prev = loops[l.radial_prev];
        }
      }
    }
  }
  
  this.shallow_copy = function() : Mesh {
    var m = new Mesh();
    
    m.verts = this.verts;
    m.faces = this.faces;
    m.edges = this.edges;
    m.name = this.name;
    m.materials = this.materials;
    m.looptris = this.looptris;
    
    m.render = this.render;
    m.render.recalc = true;
    m.ops = this.ops;
    
    m.vdata = this.vdata;
    m.edata = this.edata;
    m.ldata = this.ldata;
    m.fdata = this.fdata;
    
    return m;
  }
  
  this.find_edge = function(Vert v1, Vert v2) : Edge {
    for (var e in v1.edges) {
      if (e.vert_in_edge(v2)) {
        if (!e.vert_in_edge(v1)) {
          console.trace();
          throw new Error("Mesh integrity error")
          return null;
        }
        return e;
      }
    }
    
    return null;
  }
  
  this.make_vert = function(Vector3 co, Vector3 no) : Vert {
    var v = new Vertex(co, no);
    this.vdata.element_init(v.gdata);
    
    this.verts.push(v);
    
    return v;
  }
  
  this.make_edge = function(Vert v1, Vert v2, Boolean check) : Edge { //check is optional
    if (check == undefined)
      check = true;
      
    if (v1 == v2) {
      throw new Error("Cannot make edge from one vert only");
    }
    
    if (check) {
      var e = this.find_edge(v1, v2);
      
      if (e != null) {
        if (e._gindex == -1)
          throw new Error("Mesh integrity error; find_edge returned a deleted ghost edge");
        
        return e;
      }
    }
     
    var e = new Edge(v1, v2)
    
    if (e.v1.edges == undefined || e.v2.edges == undefined) {
      console.trace();
    }
    
    e.v1.edges.push(e);
    e.v2.edges.push(e);
    
    this.edata.element_init(e.gdata);
    
    this.edges.push(e)
    
    return e;
  }
  
  this._radial_loop_insert = function(Edge e, Loop l) {
    if (e.loop == null) {
        l.radial_next = l.radial_prev = l;
        e.loop = l;
    } else {
      l.radial_next = e.loop.radial_next;
      l.radial_prev = e.loop;
      
      e.loop.radial_next.radial_prev = l;
      e.loop.radial_next = l;
    }
      
    if (e.v1.loop == null)
      e.v1.loop = l;
    
    if (e.v2.loop == null)
      e.v2.loop = l;
  }
  
  this._radial_loop_remove = function(Edge e, Loop l) {
    if (l.f == l.v.loop.f) {
      var l2 = l;
      
      do {
        l2 = l2.radial_next;
        
        if (l2.v == l.v && l2.f != l.f)
          break;
      } while (l2 != l);
      
      if (l2.f == l.f) { //find loop in another edge
        l.v.loop = null;
        
        for (var e2 in l.v.edges) {
          if (e2 != l.e && e2.loop != null && e2.loop.f != l.f) {
            l.v.loop = e2.loop;
            break;
          }
        }
      } else {
        l.v.loop = l2;
      }
    }    
    
    if (e.loop == null) {
      console.log("Mesh integrity error; e.loop is null");
      console.trace();
    }
    
    if (e.loop.f == l.f) {
      /*multiple loops from the same face may share an edge, so make sure we
        find a loop with a different face*/
      var i = 0;
      do {
        e.loop = e.loop.radial_next;
        if (e.loop.f != l.f) 
          break;
        
        i++;
        if (i > 2000) {
          throw new Error("Mesh integrity error in Mesh._radial_loop_remove()");
        }
      } while (e.loop.f != l.f);
    }
    
    if (e.loop.f == l.f)
      e.loop = null;
   
    /*
    if (e.loop.radial_next == e.loop) {
      if (e.loop != l) {
        console.log("Mesh integrity error; loop not in edge radial list");
        console.log([e.loop.f.eid, l.f.eid, e.loop.index, l.index]);
        console.trace();
      } else {
        e.loop = null;
        return;
      }
    }*/
    
    l.radial_prev.radial_next = l.radial_next;
    l.radial_next.radial_prev = l.radial_prev;
  }
  
  this.find_face = function(Array<Vert> verts) : Face {
    var v1 = verts[0];
    
    for (var f in v1.faces) {
      if (f.totvert != verts.length) continue;

      var vset = new set(list(f.verts));
      var found = true;
      
      for (var i=0; i<verts.length; i++) {
        var v = verts[i];

        if (!vset.has(v)) {
          found = false;
          break;
        }
      }
      
      if (found) {
        return f;
      }
    }
    
    return null;
  }
  
  this.make_face = function(Array<Vert> verts, Boolean check_exist) : Face { //check_exist is optional
    if (check_exist == undefined)
      check_exist = false;
      
    var loops = new LoopList(null);
    var list = new GArray();
    
    var vset = new set();
    for (var i=0; i<verts.length; i++) {
      if (vset.has(verts[i])) {
        console.trace();
        throw "Tried to pass in duplicate verts to non-complex make_face"
      }
      vset.add(verts[i]);
    }
    
    if (check_exist) {
      var f = this.find_face(verts);
      
      if (f != null) return f;
    }
    
    var lprev = null, lstart=null;
    for (var i=0; i<verts.length; i++) {
      var v1 = verts[i];
      var v2 = verts[(i+1)%verts.length];
      
      var e = this.make_edge(v1, v2, true); /*will find existing edge if one exists*/

      var l = new Loop(v1, e);
      l.list = loops;
      this.ldata.element_init(l.gdata);
      
      if (lprev != null) {
        l.prev = lprev;
        lprev.next = l;
      }
      if (lstart == null) lstart = l;
      
      l.e = e;
      l.eid = this.idgen.gen_eid();
      
      this._radial_loop_insert(e, l);
      lprev = l;
    }
    lprev.next = lstart;
    lstart.prev = lprev;
    
    loops.loop = lstart;
    loops.length = verts.length;
    
    list.push(loops);
    var f = new Face(list);
    this.fdata.element_init(f.gdata);
    
    this.faces.push(f)
    
    return f;
  }
  
  this.make_face_complex = function(Array<Array<Vert>> vertlists, Boolean check_exist) : Face { //check_exist is optional
    if (check_exist == undefined) check_exist = false;
    
    if (check_exist) {
      //concatenate boundary lists into a single flat list of vertices
      var vlist = new GArray();
      for (var i=0; i<vertlists.length; i++) {
        for (var j=0; j<vertlists[i].length; j++) {
          vlist.push(vertlists[i][j])
        }
      }
      
      var f = this.find_face(vlist);
      if (f != null) return f;
    }
    
    var vset = new set();
    var list = new GArray();
    
    var totvert = 0;
    for (var j=0; j<vertlists.length; j++) {
      var verts = vertlists[j];
      var loops = new LoopList(null);
      
      if (verts.length == 0) {
        console.log("Tried to create face with empty boundary loops");
        console.log(j);
        console.trace();
        return null;
      }
      
      var lprev=null, lstart=null;
      for (var i=0; i<verts.length; i++) {
        var v1 = verts[i];
        var v2 = verts[(i+1)%verts.length];
        
        if (vset.has(v1)) {
          console.trace()
          console.log("Warning: duplicate verts in make_face_complex")
        }
        
        vset.add(v1);
        
        var e = this.make_edge(v1, v2, true); /*will find existing edge if one exists*/
        
        var l = new Loop(v1, e);
        
        l.eid = this.idgen.gen_eid();
        
        l.list = loops;
        totvert++;
        this.ldata.element_init(l.gdata);
        
        if (lprev) {
          lprev.next = l;
          l.prev = lprev;
        }
        if (lstart == null) lstart = l;
        
        if (v1.loop == null)
          v1.loop = l;
        
        this._radial_loop_insert(e, l);
        lprev = l;
      }
      lprev.next = lstart;
      lstart.prev = lprev;
      
      loops.loop = lstart;
      loops.length = verts.length;
      
      list.push(loops);
    }
    
    if (totvert==0) {
      console.log("Tried to create empty face");
      return null;
    }
    
    var f = new Face(list);
    this.fdata.element_init(f.gdata);
    
    this.faces.push(f)
    
    return f;
  }
  
  this.kill = function(Element e) {
    if (e.type == MeshTypes.VERT) 
      this.kill_vert(e)
    else if (e.type == MeshTypes.EDGE)
      this.kill_edge(e)
    else if (e.type == MeshTypes.FACE)
      this.kill_face(e)
    else
      throw "Invalid element type " + e.type + " in Mesh.kill()"
  }
  
  this.kill_vert = function(Vert v) {
    if (v._gindex == -1) {
      console.trace();
      console.log("Tried to kill an already-removed vert!")
      return;
    }

    var killedges = list(v.edges);
    
    for (var e in killedges) {
      this.kill_edge(e);
    }
    
    this.verts.remove(v);
  }
  
  this.kill_edge = function(Edge e) {
    //validate_mesh(this);
    /*if (e.v1 == undefined) {
      console.trace();
      throw "Tried to kill an invalid edge";
    }// */
    
    if (e._gindex == -1) {
      console.log("Tried to kill an already-removed edge!")
      console.trace();
      return;
    }
    
    /*var killfaces = new GArray(); //list(e.faces);
    for (var f in this.faces) {
      for (var e2 in f.edges) {
        if (e2 == e) {
          killfaces.push(f);
        }
      }
    }
    // */
    
    var killfaces = list(e.faces);
    for (var f in killfaces) {
      this.kill_face(f);
    }
    
    e.v1.edges.remove(e);
    e.v2.edges.remove(e);
    
    this.edges.remove(e);
    
    //validate_mesh(this);
  }
  
  this.kill_face = function(Face f) {
    //validate_mesh(this);

    if (f._gindex == -1) {
      console.trace();
      throw new Error("Tried to kill an already-removed face!"+f.eid)
      return;
    }
    
    for (var looplist in f.looplists) {
      for (var l in looplist) {
        this._radial_loop_remove(l.e, l);
      }
    }
    
    this.faces.remove(f);
    
    //validate_mesh(this);
  }
  
  this.copy_vert_data = function(Vert dest, Vert src, Boolean copy_eid) { //copy_eid is optional
    this.verts.select(dest, src.flag & Flags.SELECT);
    
    if (copy_eid == undefined)
      copy_eid = false;
        
    dest.flag = src.flag;
    dest.index = src.index;

    if (copy_eid)
      this._set_eid<Vertex>(dest, this.verts, src.eid);
    
    this.vdata.copy(dest.gdata, src.gdata);
  }

  this.copy_edge_data = function(Edge dest, Edge src, Boolean copy_eid) {//copy_eid is optional
    this.edges.select(dest, src.flag & Flags.SELECT);
    
    if (copy_eid == undefined)
      copy_eid = false;

    dest.flag = src.flag;
    dest.index = src.index;

    if (copy_eid)
      this._set_eid<Edge>(dest, this.edges, src.eid);

    this.edata.copy(dest.gdata, src.gdata);
  }

  this.copy_loop_data = function(Edge dest, Edge src, Boolean copy_eid) {//copy_eid is optional
    if (copy_eid == undefined)
      copy_eid = false;
      
    dest.flag = src.flag;
    dest.index = src.index;

    if (copy_eid)
      dest.eid = src.eid;

    this.ldata.copy(dest.gdata, src.gdata);
  }
  
  this._set_eid = function<T>(Element e, GeoArray<T> elements, eid) {
    delete elements.eidmap[e.eid]
    
    e.eid = eid;
    elements.eidmap[eid] = e;
    
    if (elements.idgen.cur_eid <= eid)
      elements.idgen.cur_eid = eid+1;
  }
  
  this.copy_face_data = function(dest, src, Boolean copy_eid) {//copy_eid is optional
    this.faces.select(dest, src.flag & Flags.SELECT);
    
    if (copy_eid == undefined)
      copy_eid = false;
    
    dest.flag = src.flag;
    dest.index = src.index;

    if (copy_eid)
      this._set_eid<Face>(dest, this.faces, src.eid);
    
    dest.no.load(src.no);
    dest.center.load(src.center);
    
    this.fdata.copy(dest.gdata, src.gdata);
  }
  
  this.select = function(element, mode) {
    if (element.type == MeshTypes.VERT) {
      this.verts.select(element, mode);
    } else if (element.type == MeshTypes.EDGE) {
      this.edges.select(element, mode);
    } else if (element.type == MeshTypes.FACE) {
      this.faces.select(element, mode);
    } else {
      console.log("Invalid element passed into Mesh.select()");
      console.trace();
    }
  }
  
  this.error = function(msg) {
    console.log(msg);
  }
}
create_prototype(Mesh);

Mesh.fromJSON = function(obj) {
  var mesh = new Mesh();
  mesh.idgen = EIDGen.fromJSON(obj.idgen);
  
  mesh.name = obj.name;
  mesh._id = obj._id;
  var eidmap = mesh.eidmap;
  var loops = {};
  
  var vs = obj.vs;
  for (var i=0; i<vs.length; i++) {
    var v = Vertex.fromJSON(vs[i]);
    mesh.verts.push(v, false);
  }
  
  var es = obj.es;
  for (var i=0; i<es.length; i++) {
    var e = Edge.fromJSON(es[i]);
    mesh.edges.push(e, false);
  }
  
  var fs = obj.fs;
  for (var i=0; i<fs.length; i++) {
    var f = Face.fromJSON(fs[i]);
    
    for (var list in f.looplists) {
      for (var l in list) {
        loops[l.eid] = l;
      }
    }
    mesh.faces.push(f, false);
  }
  
  //-1 eid for loops is null
  loops[-1] = null;
  
  //relink
  for (var v in mesh.verts) {
    for (var i=0; i<v.edges.length; i++) {
      v.edges[i] = eidmap[v.edges[i]];
    }
    
    v.loop = loops[v.loop];
  }
  
  for (var e in mesh.edges) {
    e.v1 = eidmap[e.v1];
    e.v2 = eidmap[e.v2];
    
    e.loop = loops[e.loop];
  }
  
  for (var f in mesh.faces) {
    for (var list in f.looplists) {
      for (var l in list) {
        l.radial_next = loops[l.radial_next];
        l.radial_prev = loops[l.radial_prev];
        l.v = eidmap[l.v];
        l.e = eidmap[l.e];
        l.f = eidmap[l.f];
        l.list = list;
      }
    }
  }
  
  return mesh;
}
  
var _cent = new Vector3();
var _mapi_frn_n1 = new Vector3();

/*function recalc_normals_job(m2, use_sco) {
  this.__iterator__ = function() {
    return this;
  }
  this.next = function() {
    throw StopIteration;
  }
}*/

function recalc_normals_job(Mesh m2, Boolean use_sco) //use_sco is optional
{
  this.iter = new recalc_normals_job_intern(m2, use_sco);
  this.i = 0;
  
  this.__iterator__ = function() {
    return this;
  }
  
  this.next = function() {
    this.iter.next();
    this.i++;
    
    if (this.i > 5000) {
      console.log("Inifite loop detected in recalc normals job!");
      throw StopIteration;
    }
  }
}
// /*
function recalc_normals_job_intern(Mesh m2, Boolean use_sco) //use_sco is optional
{
  var cent = new Vector3();
  
  for (var v in m2.verts) {
    v.no[0] = v.no[1] = v.no[2] = 0.0;
  }
  
  var i = 0;
  for (var f in m2.faces) {
    var n = null;
    
    //console.log("doing face", i, f != undefined ? f.__hash__() : undefined, ";");
    
    i += 1;
    if (i % 20 == 0)
      yield 1;
    if (i > 80000) {
      console.log("Infinite loop");
      console.trace();
      break;
    }
    
    f.recalc_normal();
    
    for (var v in f.verts) {
      v.no.add(f.no);
    }
  }
  
  for (var v in m2.verts) {
    v.no.normalize();
  }
  
  m2.regen_normals();
  m2.regen_positions();
}

create_prototype(recalc_normals_job);
recalc_normals_job.jobtype = new recalc_normals_job();

//*/

function MeshAPI(Mesh mesh) {
  this.mesh = mesh;
  
  this.recalc_normals = function() {
    var k = 0;
    var m2 = this.mesh;
    
    var cent = new Vector3();
    
    for (var v in m2.verts) {
      v.no[0] = v.no[1] = v.no[2] = 0.0;
    }
    
    for (var f in m2.faces) {
      f.recalc_normal();
      
      for (var v in f.verts) {
        v.no.add(f.no);
      }
    }
    
    for (var v in m2.verts) {
      v.no.normalize();
    }
  }
  
  /*split edge is a very low level function; it modifies
    the data structure in a way most other API functions
    do not*/
  this.split_edge = function(Edge e, float t) : Array<Element> {
    var m = this.mesh;
    
    /*ne goes from nv to e.v2*/
    var co = new Vector3(e.v2.co).sub(e.v1.co);
    co.mulScalar(t);
    co.add(e.v1.co);
    
    /*create new geometry*/
    var nv = m.make_vert(co);
    var ne = m.make_edge(nv, e.v2, false);
    
    m.copy_vert_data(nv, e.v1);
    
    /*unlike all loops in this edge's 
      radial list from this ed
      ge.*/
    var loops = list(e.loops);
    for (var l in loops) {
      m._radial_loop_remove(e, l);
    }
    
    var v1 = e.v1, v2 = e.v2;
    
    /*take edge out of v2's edge list*/
    e.v2.edges.remove(e);
    
    /*the loop radial list manipulation functions
      will confused if you don't set this now*/
    e.v2 = nv;
    
    /*insert edge into the correct radial list*/
    nv.edges.push(e);
    
    /*create new loops for the new edge, and
      rebuild radial lists*/
    for (var l in loops) {
      //there are a number of different possibilities, here.  
      //Check all of them.
      var l2 = new Loop(nv, ne, l.f);
      l2.eid = m.idgen.gen_eid();
      
      l2.list = l.list;
      
      l.list.length++;
      l.f.totvert++;
      
      if (l.v == v1 && l.next.v == v2) {
        l.next.prev = l2;
        l2.next = l.next;
        l.next = l2;
        l2.prev = l;
        
        m._radial_loop_insert(e, l);
        m._radial_loop_insert(ne, l2);
      } else if (l.v == v2 && l.next.v == v1) {
        l.next.prev = l2;
        l2.next = l.next;
        l.next = l2;
        l2.prev = l;
        
        m._radial_loop_insert(e, l2);
        m._radial_loop_insert(ne, l);
      } else {
        console.log("yeek!!");
      }
    }
    
    if (e.loop)
      v1.loop = e.loop;
    if (ne.loop)
      v2.loop = ne.loop;
    
    m.copy_edge_data(ne, e);
    
    return [nv, ne];
  }
  
  this.get_face_zmatrix = function(Face f)
  {
    var axis = new Vector3();
    var cross = new Vector3();
    
    axis.zero();
    axis[2] = 1.0;
    
    cross.load(f.no);
    cross.cross(axis);
    cross.normalize();
    
    var sign = axis.dot(f.no) > 0.0 ? 1.0 : -1.0
    
    var a = Math.acos(Math.abs(f.no.dot(axis)));
    var q = new Quat()
    
    q.axisAngleToQuat(cross, sign*a);
    var mat = q.toMatrix();
    
    return mat;
  }
  
  this._split_face_array = [];  
  this._split_face_v1 = new Vector3();
  this._split_face_v2 = new Vector3();
  this._split_face_cent = new Vector3();
  this._split_face_max = new Vector3();
  this._split_face_c1 = new Vector3();
  this._split_face_c2 = new Vector3();  
  this.split_face = function (Face f, Vertex v1, Vertex v2) {
    var m = this.mesh;
    var l1=null, l2=null;
    
    if (v1 == v2) {
      console.log("Cannot split face; need more than one input verts");
    }
    
    if (m.find_edge(v1, v2) != null) {
      console.log("Cannot split face; edge already exists between v1 and v2");
      return null;
    }
    
    for (var l in v1.loops) {
      if (l.f == f && l.v == v1) {
        l1 = l;
        break;
      }
    }
    
    for (var l in v2.loops) {
      if (l.f == f && l.v == v2) {
        l2 = l;
        break;
      }
    }
    
    if (l1 == null || l2 == null) {
      console.trace();
      console.log("split_face: Verts not in face!");
      return null;
    }
    
    /*align face with z axis for 2d processing*/
    var cos = this._split_face_array;
    var c = 0;
    
    var mat = this.get_face_zmatrix(f);
    
    var co1 = this._split_face_v1.load(v1.co);
    var co2 = this._split_face_v1.load(v2.co);
    
    co1.multVecMatrix(mat); co1[2] = 0.0;
    co2.multVecMatrix(mat); co2[2] = 0.0;
    
    for (var list1 in f.looplists) {
      for (var l in list1) {
        if (c >= cos.length)
          cos.push(new Vector3());
        
        cos[c].load(l.v.co);
        cos[c].multVecMatrix(mat);
        cos[c][2] = 0.0;
        
        for (var i=0; i<3; i++) {
          cos[c][i] += (Math.random()-0.5)*0.00001;
        }
        c++;
      }
    }
    
    var c = 0;
    for (var list1 in f.looplists) {
      var l = list1.loop;
      do {
        if (l.e.vert_in_edge(v1) || l.e.vert_in_edge(v2)) {
          c++;
          l = l.next;
          continue;
        }
        
        if (line_line_cross([co1, co2], [cos[c], cos[c+1]])) {
          console.log("split_face: Invalid selection");
          return null;          
        }
        
        c++;
        l = l.next;
      } while (l != list1.loop.prev);
      c++;
    }
    
    /*if both verts are on the same boundary,
      check that they are interior to that boundary
      (or exterior to that hole)*/
    if (l1.list == l2.list) {
      var points = new GArray();
      var cent = this._split_face_cent.zero();
      var i;
      var i1=-1, i2=-1;
      var lco1, lco2;
      
      c = 0;
      for (var list1 in f.looplists) {
        i = 0;
        for (var l in list1) {
          if (list1 === l1.list) {
            points.push(cos[c]);
            cent.add(cos[c]);
          
            if (l == l1) {
              i1 = i;
              lco1 = cos[c];
            } else if (l == l2) {
              i2 = i;
              lco2 = cos[c];
            } 
          }
          
          i++;
          c++;
        }
      }
      
      cent.divideScalar(i);
      
      var wind = get_boundary_winding(points);
      var lv1, lv2;
      
      if (i1 > i2) {
        var t = l1; l1 = l2; l2 = t;
        t = lco1; lco1 = lco2; lco2 = t;
      }
      
      
      var c1 = this._split_face_c1;
      var c2 = this._split_face_c2;
      var max = this._split_face_max.zero();
      var maxd = -1;
      
      var w = 0;
      var totw = 0;
      
      var l3 = l2.prev;
      while (l3 != l1) {
        cent.load(l3.v.co);
        cent.multVecMatrix(mat);
        cent[2] = 0.0;
        
        c1.load(cent).sub(lco1);
        c2.load(lco2).sub(lco1);
        
        if (c1.dot(c1) < 0.01 || c2.dot(c2) < 0.01) {
          l3 = l3.prev;
          continue;
        }
        
        c1.normalize();
        c2.normalize();
        
        c1.cross(c2);
        var d = c1.dot(c1);
        if (d > 0.05) {
          w += c1[2] > 0.0;
          totw += 1;
        }
        
        l3 = l3.prev;
      }
      
      if (totw > 0) {
        w = Math.round(w/totw);
      } else {
        console.log("Implement me: test edge against tesselation triangles?");
        w = wind;
      }
      
      //console.log([wind, w]);
      
      /*winding should be opposite for holes? really?*/
      //if (l1.list != f.looplists[0])
      //  w = !w;
      
      if (w != wind) {
        console.log(w, wind, colinear(lco1, cent, lco2));
        console.log(lco1, cent, lco2);
        console.log("split_face: selection lies outside of polygonal bounds");
        return null;
      }
      
      /*there are multiple possible cases: boundery-boundard,
        hole-hole (same hole), hole-hole (different holes),
        and hole-boundary*/
      
      var b1 = (l1.list == f.looplists[0]);
      var b2 = (l2.list == f.looplists[0]);
      /*we're connecting verts on the outer boundary*/
      if (b1 && b2) {
        var verts1 = new GArray(), verts2 = new GArray();

        var l3 = l1;
        while (l3 != l2.next) {
          verts1.push(l3.v);
          l3 = l3.next;
        }
        
        l3 = l1;
        while (l3 != l2.prev) {
          verts2.push(l3.v);
          l3 = l3.prev;
        }
        
        verts2.reverse();
        
        var vlist1 = new GArray([verts1]);
        var vlist2 = new GArray([verts2]);
        
        c = 0;
        for (var l in f.looplists[0]) {
          c++;
        }
        
        for (var i=1; i<f.looplists.length; i++) {
          var wind2 = 0;
          
          var totw = 0;
          for (var l in f.looplists[i]) {
            var w = winding(lco1, cos[c], lco2);
            wind2 += w;
            totw++;
            c++;
          }
          
          wind2 = Math.round(wind2/totw) == 1;
          //console.log(["yay", wind2, wind]);
          
          var vl = new GArray();
          for (var l in f.looplists[i]) {
            vl.push(l.v);
          }
          
          if (wind2 == wind) {
            vlist1.push(vl);
          } else {
            vlist2.push(vl);
          }
        }
        
        var f1 = m.make_face_complex(vlist1);
        var f2 = m.make_face_complex(vlist2);
        
        f1.no.load(f.no);
        f2.no.load(f.no);
        
        m.kill_face(f);
        
        return [f1, f2];
      } else {
        /*we're connecting verts on a single hole*/
        if (l1.list == l2.list) {
          var verts1 = new GArray(), verts2 = new GArray();

          var l3 = l1;
          while (l3 != l2.next) {
            verts1.push(l3.v);
            l3 = l3.next;
          }
          
          var vlist1 = new GArray([verts1]);
          var vlist2 = new GArray([list(f.looplists[0])]);
          
          for (var i=0; i<vlist2[0].length; i++) {
            vlist2[0][i] = vlist2[0][i].v;
          }
          
          for (var i=1; i<f.looplists.length; i++) {
            var wind2 = 0;
            
            totw = 0;
            for (var l in f.looplists[i]) {
              var w = op.winding(l1.v.co, l.v.co, l2.v.co);
              wind2 += w;
              totw++;
            }
            
            wind2 = Math.round(wind2/totw) == 1;
            //console.log(["yay", wind2, wind]);
            
            var vl = new GArray();
            for (var l in f.looplists[i]) {
              vl.push(l.v);
            }
            
            if (wind2 == wind) {
              vlist1.push(vl);
            } else {
              vlist2.push(vl);
            }
          }
          
          vlist1[0].reverse();
          
          var f1 = m.make_face_complex(vlist1);
          var f2 = m.make_face_complex(vlist2);
          
          f1.no.load(f.no);
          f2.no.load(f.no);
          m.kill_face(f);
          
          return [f1, f2];

        } else if (!b1 && !b2) {
        /*we're connecting verts between two holes.
          theoretically, we should join the holes
          along a single edge*/
          
        } else {
          
        }
      }
    }
    
    return null;
  }
  
  this.reverse_winding = function(Face f) {
    var m = this.mesh;
    
    for (var list in f.looplists) {
      var l = list.loop, lnext;
      var last_e = l.prev.e;
      
      do {
        m._radial_loop_remove(l.e, l);
        lnext = l.next;
        
        var e2 = l.e;
        l.e = last_e;
        last_e = e2;
        
        var t = l.next;
        l.next = l.prev;
        l.prev = t;
        
        l = lnext;
      } while (l != list.loop);
      
      do {
        m._radial_loop_insert(l.e, l);
        l = l.next;
      } while (l != list.loop);
    }
  }
  
  this.consistent_windings = function() {
    var m = this.mesh;
    
    if (m.faces.length == 0)
      return;
    
    this.recalc_normals();

    var shells = new GArray<GArray<Face>>();
    var fset = new set<Face>();
    
    for (var f in m.faces) {
      f.index = 0;
    }
    
    for (var f in m.faces) {
      if (f.index == 1) continue;
      
      f.index = 1;
      
      var shell = new GArray<Face>();
      shells.push(shell);
      var stack = new GArray<Face>([f]);
      var f2;
      
      while (stack.length > 0) {
        f2 = stack.pop();
        
        shell.push(f2);
        
        for (var e in f2.edges) {
          for (var f3 in e.faces) {
            if (f3.index == 1) continue;
            
            f3.index = 1;
            stack.push(f3);
          }
        }
      }
    }
    
    for (var shell in shells) {
      var dis = -1;
      var startf = null;
      for (var f in shell) {
        if (dis == -1 || f.center.dot(f.center) < dis) {
          dis = f.center.dot(f.center);
          startf = f;
        }
      }
      
      var vec = new Vector3(startf.cent);
      vec.normalize();
      
      if (vec.dot(startf.no) < 0.0) {
        this.reverse_winding(startf);
      }
      
      var stack = new GArray([startf]);
      var f;
      
      while (stack.length > 0) {
        f = stack.pop();
        
        if (f.index == 2) continue;
        f.index = 2;
        
        var flip_list = new GArray<Face>();
        
        for (var list in f.looplists) {
          for (var l in list) {
            var l2 = l.radial_next;
            
            while (l2 != l) {
              if (l2.f != 2) {
                stack.push(l2.f);
              }
              
              if (l2.f.index == 2) {
                l2 = l2.radial_next;
                continue;
              }
              
              if (l2.v == l.v) 
                flip_list.push(l2.f);
                
              l2 = l2.radial_next;
            }
          }
        }
        
        for (var f2 in flip_list) {
          //an edge can theoretically have the same face multiple times in its radial list,
          //so make sure we don't flip it multiple times
          if (f2.index == 2) continue;
          f2.index = 2;
          
          this.reverse_winding(f2);
        }
      }
    }
    
    this.recalc_normals();
  }
  
  this.join_faces = function(CanIter<Face> faces) {
    var mesh = this.mesh;
    
    var fset = new set(faces);
    var loops = new GArray();
    var holes = new GArray();
    var eset = new set();
    
    for (var f in fset) {
      for (var e in f.edges) {
        if (eset.has(e))
          continue;
        
        var tot=0, tot2=0;
        for (var f2 in e.faces) {
          tot += fset.has(f2) != 0;
          tot2++;
        }
        
        if (tot == 1) {
          eset.add(e);
        }
      }
    }
    
    var visit = new set();
    for (var e in eset) {
      if (visit.has(e))
        continue;
      
      var v = e.v1;
      var e2 = e;
      var loop = new GArray();
      
      visit.add(e);
      loop.push(v);
      do {
        var tot = 0;        
        var v2 = v;
        
        tot=0;
        
        var e20 = e2;
        for (var e3 in v2.edges) {
          if (e3 == e20)
            continue;
            
          if (eset.has(e3)) {
            if (v == v2) {
              e2 = e3;
              v = e2.other_vert(v);
            }
            
            tot++;
          }
        }
        
        if (tot != 1) {
          console.log("tot ", tot);
          throw new TopoError("Invalid selection " + tot);
        }
        
        if (visit.has(e2))
          break;
        
        loop.push(v);
        visit.add(e2);
      } while (1);
      
      if (loop.length < 3) {
        throw new TopoError("Invalid Selection");
      }
      
      console.log("loop len: ", loop.length);
      var len = 0.0;
      for (var i=0; i<loop.length; i++) {
        len += loop[i].co.vectorDistance(loop[(i+1)%loop.length].co);
      }
      
      console.log(len);
      loops.push([len, loop]);
    }
    
    console.log("esl", eset.length);
    console.log("loopsl", loops.length);
    
    var bound = 0;
    var len=0;
    
    for (var i=0; i<loops.length; i++) {
      if (loops[i][0] > len) {
        len = loops[i][0];
        bound = i;
      }
    }
    
    console.log("bound: ", bound, loops[bound][0]);
    
    //ensure correct winding for boundary
    
    var v1 = loops[bound][1][0];
    var v2 = loops[bound][1][1];
    var rev = false; //reverse winding boolean
    
    for (var l in v1.loops) {
      if (fset.has(l.f)) {
        if (l.v == v1 && l.next.v != v2) {
          rev = true;
        }
        if (l.prev.v == v1 && l.v != v2) {
          rev = true;
        }
      }
    }
    for (var l in v2.loops) {
      if (fset.has(l.f)) {
        if (l.next.v == v2 && l.v != v1) {
          rev = true;
        }
        if (l.v == v2 && l.prev.v != v1) {
          rev = true;
        }
      }
    }
    
    if (rev) {
      loops[bound][1].reverse();
    }
    
    //build delete sets
    var vset = new set();
    eset = new set();
    
    for (var f in fset) {
      for (var l in f.loops) {
        var tot1=0, tot2=0;
        
        var e = l.e;
        for (var f2 in e.faces) {
          tot1 += fset.has(f2) != 0;
          tot2++;
        }
        
        if (tot1 == tot2)
          eset.add(e);
        
        var v = l.v;
        tot1 = tot2 = 0;
        for (var l2 in v.loops) {
          tot1 += fset.has(l2.f) != 0;
          tot2++;
        }
        
        if (tot1 == tot2) {
          vset.add(v);
        }
      }
    }
    
    //don't delete the old geometry yet.
    //create face and copy data first.
    
    var vlooplists = new GArray([loops[bound][1]]);
    for (var i=0; i<loops.length; i++) {
      if (i == bound)
        continue;
      
      console.log(loops[i]);
      vlooplists.push(loops[i][1]);
    }
    
    console.log(vlooplists);
    var nf = mesh.make_face_complex(vlooplists);
    
    /*build new face flag*/
    var totsmooth=0, totsolid=0;
    
    for (var f in fset) {
      if (f.flag & Flags.SELECT)
        mesh.faces.select(nf, true);
      
      if (f.flag & Flags.SHADE_SMOOTH) 
        totsmooth++;
      else
        totsolid++;
    }
    
    if (totsmooth > totsolid)
      nf.flag |= Flags.SHADE_SMOOTH;
    
    //delete old geometry
    for (var f in fset) {
      mesh.kill_face(f);
    }
    for (var e in eset) {
      mesh.kill_edge(e);
    }
    for (var v in vset) {
      mesh.kill_vert(v);
    }
  }
  
  this.duplicate_geometry = function(CanIter<Element> geometry, 
                                     Boolean deselect_old) 
  { //deselect_old is optional, defaults to false
    var mesh = this.mesh;
    
    if (deselect_old == undefined)
      deselect_old = false;
    
    var vset, eset, fset;
  
    fset = new set();
    eset = new set();
    vset = new set();
    
    for (var e in geometry) {
      if (e.type == MeshTypes.FACE) {
        fset.add(e);
      } else if (e.type == MeshTypes.EDGE) {
        eset.add(e);
      } else if (e.type == MeshTypes.VERT) {
        vset.add(e);
      }
    }
    
    var verts = new GArray();
    var edges = new GArray();
    var faces = new GArray();
    
    var vi = 0;
    var ei = 0;
    var fi = 0;

    for (var v in vset) {
      verts.push(v);
      v.index = vi++;
    }
    
    for (var e in eset) {
      edges.push(e);
      e.index = ei++;
    }
    
    for (var f in fset) {
      faces.push(f);
      f.index = fi++;
      
      //for (var v in f.verts) {
      for (var loop in f.looplists) {
        for (var l in loop) {
          var v = l.v;
          
          if (!vset.has(v)) {
            verts.push(v);
            v.index = vi++;
            
            vset.add(v);
          }
      }
      }
          
      for (var e in f.edges) {
        if (!eset.has(e)) {
          edges.push(e);
          e.index = ei++;
          
          eset.add(e);
        }
      }
    }
    
    for (var e in eset) {
      if (!vset.has(e.v1)) {
        e.v1.index = vi++;
        verts.push(e.v1);
        vset.add(e.v1);
      }
      
      if (!vset.has(e.v2)) {
        e.v2.index = vi++;
        verts.push(e.v2);
        vset.add(e.v2);
      }
    }
    
    for (var i=0; i<verts.length; i++) {
      var v = verts[i];
      var nv = mesh.make_vert(v.co, v.no);
      mesh.copy_vert_data(nv, v);
      
      verts[i] = nv;
    }
    
    for (var i=0; i<edges.length; i++) {
      var e = edges[i];
      var ne = mesh.make_edge(verts[e.v1.index], verts[e.v2.index]);
      
      edges[i] = ne;
      
      mesh.copy_edge_data(ne, e);
    }
    
    for (var i=0; i<faces.length; i++) {
      f = faces[i];
      var vlists = new GArray();
      
      for (var loop in f.looplists) {
        var vs = new GArray();
        vlists.push(vs);
        vs.length = 0;
        for (var l in loop) {
          vs.push(verts[l.v.index]);
        }
      }
      
      var nf = mesh.make_face_complex(vlists);
      
      var iter1 = f.loops.__iterator__();
      var iter2 = nf.loops.__iterator__();
      
      mesh.copy_face_data(nf, f);
      
      while (1) {
        try {
          var l1 = iter1.next();
          var l2 = iter2.next();
          
          mesh.copy_loop_data(l2, l1);
        } catch (err) {
          if (err != StopIteration) {
            throw err;
          } else {
            break;
          }
        }
      }
    }
    
    if (deselect_old) {
      for (var v in vset) {
        mesh.verts.select(v, false);
      }
      for (var e in eset) {
        mesh.edges.select(e, false);
      }
      for (var f in fset) {
        mesh.faces.select(f, false);
      }
    }
  }
}
