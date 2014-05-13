"use strict";

var Flags = {SELECT: 1, SHADE_SMOOTH: 2, DIRTY: 4, TEMP: 8}
var MeshTypes = {VERT: 1, EDGE: 2, LOOP: 4, FACE: 8}
var MeshFlags = {USE_MAP_CO: 2, TESS_JOB_FINISHED: 4}

/*keep this and MeshRecalcFlags in draw.js in sync!*/
var MeshEvents = {
  RECALC : MeshRecalcFlags.REGEN_ALL, //first four bits
  DESTROY : 16
}

class TopoError extends Error {
  constructor(String msg) {
    Error.call(this, msg);
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

var _mesh_id_gen = 0; //internal use only
class Mesh extends DataBlock {
  constructor() {
    DataBlock.call(this, DataTypes.MESH, "Mesh");
    
    this.ops = new MeshOpAPI(this);
    
    this._id = _mesh_id_gen++;
    
    this.idgen = new EIDGen();
    this.eidmap = {};
    this.sidmap = {}; //for selection index buffer IDs
    
    this.verts = new GeoArray<Vert>(MeshTypes.VERT, this.idgen, this.eidmap, this.sidmap);
    this.edges = new GeoArray<Edge>(MeshTypes.EDGE, this.idgen, this.eidmap, this.sidmap);
    this.faces = new GeoArray<Face>(MeshTypes.FACE, this.idgen, this.eidmap, this.sidmap);
   
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
    
    this.bb = new MinMax(3);
    this.sel_bb = new MinMax(3);
  }
  
  get sel_aabb() {
    return this.sel_bb;
  }
  
  get aabb() {
    return this.aabb;
  }
  
  get selected() {
    return new AllTypesSelectIter(this);
  }

  static fromSTRUCT(unpacker) {
    global gl;
    var m = new Mesh()
    
    unpacker(m);
    
    m.gen_render_struct();
    m.regen_render();
    
    var verts = m.verts;
    var edges = m.edges;
    var faces = m.faces;
    
    m.verts = new GeoArray<Vert>(MeshTypes.VERT, m.idgen, m.eidmap, m.sidmap);
    m.edges = new GeoArray<Edge>(MeshTypes.EDGE, m.idgen, m.eidmap, m.sidmap);
    m.faces = new GeoArray<Face>(MeshTypes.FACE, m.idgen, m.eidmap, m.sidmap);
    
    var loops = {}
    
    var vlen = verts.length;
    var elen = edges.length;
    var flen = faces.length;
    
    for (var i=0; i<vlen; i++) {
      verts[i].sid = ibuf_idgen.gen_id();
      m.verts.push(verts[i], false);
    }
    
    for (var i=0; i<elen; i++) {
      edges[i].sid = ibuf_idgen.gen_id();
      m.edges.push(edges[i], false);
    }
    
    for (var i=0; i<flen; i++) {
      var f = faces[i];
      
      for (var list in f.looplists) {
        for (var l in list) {
          loops[l.eid] = l;
        }
      }
      
      f.sid = ibuf_idgen.gen_id();
      m.faces.push(f, false);
    }
    
    var eidmap = m.eidmap;
    for (var i=0; i<vlen; i++) {
      var v = verts[i];
      v.loop = v.loop != -1 ? loops[v.loop] : null;
      v.edges = new GArray(v.edges);
      
      for (var j=0; j<v.edges.length; j++) {
        v.edges[j] = eidmap[v.edges[j]];
      }
    }
    
    for (var i=0; i<elen; i++) {
      var e = edges[i];
      e.loop = e.loop != -1 ? loops[e.loop] : null;
      e.v1 = eidmap[e.v1];
      e.v2 = eidmap[e.v2];
    }
    
    for (var i=0; i<flen; i++) {
      var f = faces[i];
      
      for (var list in f.looplists) {
        for (var l in list) {
          l.v = eidmap[l.v];
          l.e = eidmap[l.e];
          l.f = f;
          l.list = list;
          l.radial_next = loops[l.radial_next];
          l.radial_prev = loops[l.radial_prev];
        }
      }
    }
    
    return m;
  }

  on_gl_lost(WebGLRenderingContext new_gl) {
    this.gen_render_struct();
  }
  
  load(m2) {
    this.name = m2.name;
    this.verts = m2.verts;
    this.edges = m2.edges;
    this.faces = m2.faces;
    this.eidmap = m2.eidmap;
    this.sidmap = m2.sidmap;
    this.idgen = m2.idgen;
    
    if (m2.render != undefined)
      this.render = m2.render;
    
    this.vdata = m2.vdata;
    this.edata = m2.edata;
    this.ldata = m2.ldata;
    this.fdata = m2.fdata;
    
    this.regen_render();
  }

  __hash__() : String {
    return "Mesh" + this._id;
  }

  remove_callback(owner)
  {
    this.event_users.remove(owner);
  }

  gen_render_struct() {
    var gl = g_app_state.gl;
    this.render = new render();
    
    this.render.drawprogram = gl.program;
    this.render.vertprogram = gl.program2;
    
    this.regen_render();
  }

  //callback is a function with args (owner, mesh, event),
  //where event is one of MeshEvents
  update_callback(owner, callback)
  {
    this.event_users.set(owner, callback);
  }

  //expandlvl is how many times we should topologically "grow" the input vert set
  gen_partial(geom, expandlvl) { 
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

  load_partial(part) {
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
          idgen.eid_max_cur(l.eid);
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
          if (l.e == undefined) {
            console.log("Warning: corrupted loop", l, "in load_partial.  Attempting to correct.");
            l.e = this.make_edge(l.v, l.next.v);
          }
          this._radial_loop_insert(l.e, l);
        }
      }
    }
  }

  regen_positions() {
    this.render.recalc |= MeshRecalcFlags.REGEN_COS;
    
    this.do_callbacks(this.render.recalc);
  }

  regen_normals() {
    this.render.recalc |= MeshRecalcFlags.REGEN_NORS;
    
    this.do_callbacks(this.render.recalc);
  }

  do_callbacks(event) {
    for (var k in this.event_users) {
      var func = this.event_users.get(k);
      
      if (func == undefined) {
        console.trace();
        console.log("warning, undefined callback in do_callbacks()", k);
        continue;
      }
      
      func(k, this, event);
    }
  }

  regen_render() {
    this.render.recalc |= MeshRecalcFlags.REGEN_NORS | MeshRecalcFlags.REGEN_TESS | MeshRecalcFlags.REGEN_COS | MeshRecalcFlags.REGEN_COLORS;
    for (var f in this.faces) {
      f.flag |= Flags.DIRTY;
    }
    
    this.do_callbacks(this.render.recalc);
  }

  regen_colors() {
    this.render.recalc |= MeshRecalcFlags.REGEN_COLORS;
    
    this.do_callbacks(this.render.recalc);
  }

  copy() : Mesh {
    var m2 = new Mesh();
    m2.render = new render();
    m2.name = this.name;
    
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

  pack(Array<byte> data, StructPackFunc dopack) {
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

  unpack(ArrayBuffer data, unpack_ctx uctx) {
    var vlen = unpack_int(data, uctx);
    
    var loops = {}
    var eidmap = this.eidmap;
    
    for (var i=0; i<vlen; i++) {
      var v = new Vertex();
      v.unpack(data, uctx);
      
      this.verts.push(v, false);
    }
    
    var elen = unpack_int(data, uctx);
    for (var i=0; i<elen; i++) {
      var e = new Edge();
      e.unpack(data, uctx);
      //console.log("e.v1", e.v1);
      
      this.edges.push(e, false);
      
      e.v1 = eidmap[e.v1];
      e.v2 = eidmap[e.v2];
    }
    
    var flen = unpack_int(data, uctx);
    
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

  shallow_copy() : Mesh {
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

  find_edge(Vert v1, Vert v2) : Edge {
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

  make_vert(Vector3 co, Vector3 no) : Vert {
    var v = new Vertex(co, no);
    this.vdata.element_init(v.gdata);
    
    this.verts.push(v);
    
    return v;
  }

  make_edge(Vert v1, Vert v2, Boolean check) : Edge { //check is optional
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

  _radial_loop_insert(Edge e, Loop l) {
    l.e = e;
    
    if (e.loop == null) {
        l.radial_next = l.radial_prev = l;
        e.loop = l;
    } else {
      l.radial_next = e.loop.radial_next;
      l.radial_prev = e.loop;
      
      e.loop.radial_next.radial_prev = l;
      e.loop.radial_next = l;
    }
      
    //possible XXX, should e.v1.loop only be assigned if l.v == e.v1?
    if (e.v1.loop == null)
      e.v1.loop = l;
    
    //possible XXX, should e.v2.loop only be assigned if l.v == e.v2?
    if (e.v2.loop == null)
      e.v2.loop = l;
  }

  _radial_loop_remove(Edge e, Loop l) {
    if (l.v.loop == undefined) {
      console.log("mesh integrity error; l.v.loop is null", l.v);
    }
    
    if (l.v.loop != null && l.f == l.v.loop.f) {
      var l2 = l;
      
      var i = 0;
      do {
        l2 = l2.radial_next;
        
        if (l2.v == l.v && l2.f != l.f)
          break;
        
        if (i++ > 10000) {
          console.log("inifinite loop 1 in _radial_loop_remove");
          throw new Error("inifinite loop 1 in _radial_loop_remove");
          return;
        }
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
    
    if (e.loop != null && e.loop.f == l.f) {
      /*multiple loops from the same face may share an edge, so make sure we
        find a loop with a different face*/
      var i = 0;
      var first = e.loop;
      do {
        e.loop = e.loop.radial_next;
        if (e.loop.f != l.f) 
          break;
        
        i++;
        if (i > 2000) {
          throw new Error("Mesh integrity error in Mesh._radial_loop_remove()");
          return;
        }
      } while (e.loop != first);
      
      if (e.loop.f == l.f)
        e.loop = null;
    }
   
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

  find_face(Array<Vert> verts) : Face {
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

  make_face(Array<Vert> verts, Boolean check_exist=false, 
                               Boolean check_dupli=true) : Face 
  {
    var loops = new LoopList(null);
    var list = new GArray();
    
    if (check_dupli) {
      var vset = new set();
      for (var i=0; i<verts.length; i++) {
        if (vset.has(verts[i])) {
          console.trace();
          throw "Tried to pass in duplicate verts to non-complex make_face"
        }
        vset.add(verts[i]);
      }
    }
    
    if (check_exist) {
      var f = this.find_face(verts);
      
      if (f != null) return f;
    }
    
    var lprev = null, lstart=null;
    for (var i=0; i<verts.length; i++) {
      var v1 = verts[i];
      var v2 = verts[(i+1)%verts.length];
      
      /*will find existing edge if one exists*/
      var e = this.make_edge(v1, v2, true);

      var l = new Loop(v1, e);
      l.list = loops;
      this.ldata.element_init(l.gdata);
      
      if (lprev != null) {
        l.prev = lprev;
        lprev.next = l;
      }
      if (lstart == null) lstart = l;
      
      l.e = e;
      l.eid = this.idgen.gen_eid(MeshTypes.LOOP);
      
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

  make_face_complex(Array<Array<Vert>> vertlists, Boolean check_exist) : Face { //check_exist is optional
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
        
        l.eid = this.idgen.gen_eid(MeshTypes.LOOP);
        
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

  kill(Element e) {
    if (e.type == MeshTypes.VERT) 
      this.kill_vert(e)
    else if (e.type == MeshTypes.EDGE)
      this.kill_edge(e)
    else if (e.type == MeshTypes.FACE)
      this.kill_face(e)
    else
      throw "Invalid element type " + e.type + " in Mesh.kill()"
  }

  kill_vert(Vert v) {
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

  kill_edge(Edge e) {
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

  kill_face(Face f) {
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

  copy_vert_data(Vert dest, Vert src, Boolean copy_eid) { //copy_eid is optional
    this.verts.select(dest, src.flag & Flags.SELECT);
    
    if (copy_eid == undefined)
      copy_eid = false;
        
    dest.flag = src.flag;
    dest.index = src.index;

    if (copy_eid)
      this._set_eid<Vertex>(dest, this.verts, src.eid);
    
    this.vdata.copy(dest.gdata, src.gdata);
  }

  copy_edge_data(Edge dest, Edge src, Boolean copy_eid) {//copy_eid is optional
    this.edges.select(dest, src.flag & Flags.SELECT);
    
    if (copy_eid == undefined)
      copy_eid = false;

    dest.flag = src.flag;
    dest.index = src.index;

    if (copy_eid)
      this._set_eid<Edge>(dest, this.edges, src.eid);

    this.edata.copy(dest.gdata, src.gdata);
  }

  copy_loop_data(Edge dest, Edge src, Boolean copy_eid) {//copy_eid is optional
    if (copy_eid == undefined)
      copy_eid = false;
      
    dest.flag = src.flag;
    dest.index = src.index;

    if (copy_eid)
      dest.eid = src.eid;

    this.ldata.copy(dest.gdata, src.gdata);
  }

  _set_eid(Element e, GeoArray<T> elements, eid) {
    delete elements.eidmap[e.eid]
    if (e.type != MeshTypes.LOOP) {
      delete this.eidmap[e.eid];
      this.eidmap[eid] = e;
    }
    
    e.eid = eid;
    elements.eidmap[eid] = e;
    this.eidmap[eid] = e;
    
    if (elements.idgen.cur_eid <= eid)
      elements.idgen.cur_eid = eid+1;
  }

  copy_face_data(dest, src, Boolean copy_eid) {//copy_eid is optional
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

  select(element, mode) {
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

  error(msg) {
    console.log(msg);
  }
}

Mesh.STRUCT = STRUCT.inherit(Mesh, DataBlock) + """
    idgen : EIDGen;
    _id : int;
    verts : iter(Vertex);
    edges : iter(Edge);
    faces : iter(Face);
  }
""";
