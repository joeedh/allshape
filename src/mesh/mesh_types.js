//#$().class
function Element(set_sid) {
  if (set_sid == undefined)
    set_sid = true;
  
  this.type = 0;
  this.eid = 0;
  this.gdata = new ElementData();
  this.flag = 0;
  this.index = 0;
  
  if (set_sid)
    this.sid = ibuf_idgen.gen_id();
  else
    this.sid = 0;
}

Element.STRUCT = """
  Element {
    type : int;
    eid : int;
    flag : int;
    index : int;
  }
"""

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

Vertex.fromSTRUCT = function(doload) {
  var v = new Vertex();
  doload(v);
  
  return v;
}

Vertex.STRUCT = STRUCT.inherit(Vertex, Element) + """
    co : vec3;
    no : vec3;
    loop : int | obj.loop == undefined ? -1 : obj.loop.eid;
    edges : array(e, int) | e.eid;
  }
""";

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

Edge.STRUCT = STRUCT.inherit(Edge, Element) + """
  v1 : int | obj.v1.eid;
  v2 : int | obj.v2.eid;
  loop : int | obj.loop == undefined ? -1 : obj.loop.eid;
}
""";

Edge.fromSTRUCT = function(unpacker) {
  var e = new Edge();
  
  unpacker(e);
  
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
  Element.call(this, false);  
  this.type = MeshTypes.LOOP;
  this.eid = 0;
  
  this.v = v;
  this.e = e;
  this.f = f;
  this.list = null;
  
  this.next = null;
  this.prev = null;
  this.radial_next = null;
  this.radial_prev = null;
}
inherit(Loop, Element);

Loop.STRUCT = """
  Loop {
    eid : int;
    type : int;
    v : int | obj.v.eid;
    e : int | obj.e.eid;
    f : int | obj.f.eid;
    radial_next : int | obj.radial_next.eid;
    radial_prev : int | obj.radial_prev.eid;
  }
"""
 
Loop.fromSTRUCT = function(unpack) {
  var l = new Loop()
  unpack(l);
  
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
  this.ret = {done : false, value : undefined};
  this.list = looplist;
  this.startl = looplist.loop;
  this.cur = this.startl;
  
  this.next = function() : Loop {
    var ret2 = this.ret;
    var ret = this.cur;
    
    if (this.cur == null) {
      ret2.done = true;
      return ret2;
    }
    
    this.cur = this.cur.next;
    if (this.cur == this.startl)
      this.cur = null;
    
    ret2.value = ret;
    return ret2;
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
  
  if (looplists != undefined) {
    for (var i=0; i<looplists.length; i++) {
      for (var l in looplists[i]) {
        l.f = this;
        l.list = looplists[i];
        this.totvert++;
      }
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

Face.STRUCT = STRUCT.inherit(Face, Element) + """
    looplists : array(iter(Loop));
    no : vec3;
    center : vec3;
    mapcenter : vec3;
    totvert : int;
  }
""";

Face.fromSTRUCT = function(unpacker) {
  var f = new Face();
  unpacker(f);
  
  var looplists = f.looplists;  
  for (var i=0; i<looplists.length; i++) {
    var list = new LoopList()
    var arr = looplists[i];
   
    list.loop = arr.length > 0 ? arr[0] : undefined;
    var lastl = undefined;
    
    for (var j=0; j<arr.length; j++) {
      var l = arr[j];
      if (lastl != undefined) {
        lastl.next = l;
        l.prev = lastl;
      }
      lastl = l;
    }
    
    if (lastl != undefined) {
      list.loop.prev = lastl;
      lastl.next = list.loop;
    }
    
    looplists[i] = list;
  }
  
  f.looplists = new GArray(looplists);
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
  
function GeoArrayIter<T>(GeoArray<T> arr) {
  this.ret = {done : false, value : undefined};
  this.cur = 0;
  this.arr = arr;
  
  this.reset = function() {
    this.cur = 0;
    this.ret = {done : false, value : undefined};
  }
  
  this.next = function() : T {
    var reti = this.ret;
    var cur = this.cur;
    
    var len = this.arr.arr.length;
    var arr = this.arr.arr
    
    while (cur != len && (arr[cur] == undefined)) {
      cur++;
    }
    
    if (cur >= len) {
      this.reset();
      
      reti.done = true;
      return reti;
    } else {
      this.cur = cur+1;
      reti.value = arr[cur];
      
      return reti;
    }
  }
}

function AllTypesSelectIter(mesh) {
  this.ret = {done : false, value : undefined};
  this.type = MeshTypes.VERT;
  this.mesh = mesh;
  this.iter = undefined : Iter;
  
  this.__iterator__ = function() {
    return this;
  }
  
  this.reset = function() {
    this.ret = {done : false, value : undefined};
    this.type = MeshTypes.VERT;
    this.iter = undefined;
  }
  
  this.next = function() {
    //don't initialize iter in reset function, not only can
    //it mess up opsapi state, it will also mess with the GC
    if (this.iter == undefined) {
      this.iter = this.mesh.verts.selected.__iterator__();
    }
    
    var iret;
    if (!(iret = this.iter.next()).done) {
      return iret;
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
        var ret = this.ret;
        
        this.reset();
        
        ret.done = true;
        return ret;
      }
    }
  }
}

//#$().class
function GeoArray<T>(type, idgen, eidmap, sidmap) {
  this.arr = new Array();
  this.length = 0;  
  this.idgen = idgen
  this.type = type
  this.global_eidmap = eidmap;
  this.sidmap = sidmap;
  
  this.highlight = null;
  this.freelist = new GArray()
  this.iter = new GeoArrayIter<T>(this);
  this.eidmap = {};
  this._totsel = 0
  
  this._selected = {} : ObjectMap<int,T>;
  
  Object.defineProperty(this, "selected", {get: function() : Iterator<T> {
    return new obj_value_iter(this._selected);
  }});
  
  Object.defineProperty(this, "totsel", {get: function() : Iterator<T> {
    return this._totsel;
  }});
  
  this.__iterator__ = function() : GeoArrayIter<T> {
    if (this.iter.cur != 0)
      return new GeoArrayIter<T>(this);
    else
      return this.iter;
  }
  
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
    
    this.sidmap[item.sid] = item;
    
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
    delete this.sidmap[item.sid];
    
    this.arr[item._gindex] = undefined;
    
    this.freelist.push(item._gindex);
    item._gindex = -1;
    this.length -= 1;
  }
}
