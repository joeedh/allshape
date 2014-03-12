"use strict";

var ES_FillFlags = {
  EDGE_PATH : 1, //split faces where two edges are split
  QUAD_FILL : 2, //subdivide quads
  TRI_FILL : 4, //sudivide tris
  QUAD_CORNER : 8, //make nice quad corner geometry
  EDGE_TRI : 16 //split tris where one edge is subdivided
};

//this op is actually an edge-directed pattern-based subdivision
// algorithm; calling it "edge subdivide" may be a bit misleading.
class ESubdivideOp extends MeshOp {
  constructor(Iterator edgeiter, int count) {
    MeshOp.call(this);
    
    this.name = "EdgeSubdivide";
    this.uiname = "Split Edges"
    
    this.flag &= ~ToolFlags.USE_PARTIAL_UNDO;
    
    this.inputs = {
      count : new IntProperty(1, "count", "Count", "", [1, 25]), 
      edges : new CollectionProperty(undefined, [Edge], "edges", "Edges", ""),
      fillmode : new FlagProperty(ES_FillFlags.EDGE_PATH, ES_FillFlags, undefined, "fillmode", "Fill Mode", "Method of connecting split edges")
    }
    
    this.inputs.fillmode.data |= ES_FillFlags.QUAD_CORNER;
    
    this.inputs.edges.set_data(edgeiter);
    this.inputs.count.data = count;
  }
  
  exec(MeshOp op, Mesh mesh) {
    _edge_subdivide(mesh, this.inputs.edges, this.inputs.count.data, this.inputs.fillmode.data);
    mesh.api.recalc_normals();
  }
}

function esubd_edata(Edge e) {
  this.e = e;
  this.orig_eid = e.eid;
  this.interior_complex_edge = false;
  this.nverts = new GArray([e.v1]);
  this.nedges = new GArray([e]); //include e?
  this.v1 = e.v1;
  this.v2 = e.v2;
  this.i = 0;
}

function esubd_context(Mesh mesh, int count) {
  this.edata = new GArray<esubd_edata>();
  this.m = mesh;
  this.count = count;
  this.eset = new set<Edge>();
  this.neset = new set<Edge>();
}

function subd_exec_type(mesh, f, verts, ectx);

function SubdPattern(Array<int> pat, Array<int> connect, subd_exec_type exec, int flag) { //exec is optional
  this.pat = new GArray<int>(pat);
  this.connect = new GArray<int>(connect);
  this.exec = exec;
  this.flag = flag;
}

//flags to control connection
var PatFlags = {
  STARTONLY : 8, //connect to the start vert in a face of a split edge
  ENDONLY : 16, //connect to the end vert in a face of a split edge
  MASK : 8|16,
}

var _esubd_patterns = new GArray([
  new SubdPattern( //one edge of tri
    [1, 0, 0],
    [2, -1, -1],
    undefined,
    ES_FillFlags.EDGE_TRI),  
  new SubdPattern( //corner, two edges of quad
    [1, 1, 0, 0],
    [1|PatFlags.ENDONLY, 0, -1, -1],
    undefined,
    ES_FillFlags.QUAD_CORNER)  
]);

function _split_edge(esubd_context ctx, esubd_edata edata)
{
  var e = edata.e;
  var e2 = e;
  var count = ctx.count;
  
  ctx.neset.add(e);
  
  for (var i=0; i<count; i++) {
    var t = (1.0 / (count-i+1));
    var ret = ctx.m.api.split_edge(e2, t);
    
    e2 = ret[1];
    e2.index = edata.i;
    e.index = edata.i;
    
    ctx.neset.add(e2);
    
    edata.nverts.push(ret[0]);
    edata.nedges.push(ret[1]);
    
    ret[0].flag |= Flags.DIRTY;
    ret[1].flag |= Flags.DIRTY;
  }
  
  edata.nverts.push(e.v2);
}

function esubd_connect_verts(Mesh mesh, Vertex v1, Vertex v2)
{
  var f = null;
  
  if (v1 == undefined || v2 == undefined) {
    console.log("Error in esubd_connect_verts()", v1 == undefined, v2 == undefined);
    return;
  }
  
  for (var l1 in v1.loops) {
    for (var l2 in v2.loops) {
      if (l1.f == l2.f) {
        f = l1.f;
        break;
      }
    }
  }
  
  if (f == null) {
    console.log("Error in esubd_connect_verts!");
    console.trace();
    return;
  }
  
  var ret = mesh.api.split_face(f, v1, v2);
  
  if (ret != null) {
    ret[0].flag |= Flags.DIRTY;
    ret[1].flag |= Flags.DIRTY;
  }
}

function _edge_subdivide(Mesh mesh, Iterator edgeiter, int count, int fillmode)
{
  var ctx = new esubd_context(mesh)
  var fset = new set();
  var eset = new set(edgeiter);
  var neset = ctx.neset;
  
  ctx.eset = eset;
  ctx.count = count;
  
  var i =0;
  for (var _e in edgeiter) {
    var Edge e = _e;
    
    for (var f in e.faces) {
      //ignore complex faces for fill operations for the moment
      if (f.looplists.length > 1)
        continue;
      
      fset.add(f);
      f.flag |= Flags.DIRTY;
    }
    
    var edata = new esubd_edata(e)
    ctx.edata.push(edata);
    
    edata.i = e.index = i;      
    i++;
  }
  
  var edata = ctx.edata;  
  for (var ed in edata) {
    _split_edge(ctx, ed);
  }
  
  function count_face_edges(f1) {
    var _count = 0;
    var l = f1.looplists[0].loop;
    do {
      if (eset.has(l.e)) {
        _count++;
      }
      l = l.next;
    } while (l != f1.looplists[0].loop);
    
    return _count;
  }
  
  //match patterns
  for (var f in fset) {
    if (count_face_edges(f) > 0) {
      var vs = []; //new verts
      var vs2 = []; //original verts
      var pat = [];
      
      var l = f.looplists[0].loop;
      var last_i = l.e.index;
      
      while (neset.has(l.e)) {
        last_i = l.e.index;
        
        l = l.next;
        if (l == f.looplists[0].loop)
          break;
      }
      
      var firstl = l;        
      do {
        if (neset.has(l.e)) {
          var i = l.e.index;
          vs.push([]);
          pat.push(1);
          
          //if (!neset.has(l.prev.e))
          //  vs[vs.length-1].push(l.prev.v);
            
          var firstl2 = l;
          while (neset.has(l.e) && l.e.index == i) {
            vs[vs.length-1].push(l.v);
            l = l.next;
          }
          
          vs[vs.length-1].push(l.v);
          
          if (l == firstl)
            l = l.prev;
        }
        
        if (!neset.has(l.e)) {
          pat.push(0);
          vs2.push(l.v);
        }
        

        l = l.next;
      } while (l != firstl);      

      var pat_found = false;
      
      for (var p in _esubd_patterns) { 
        if (pat.length != p.pat.length)
          continue;
        if (pat.flag != 0 && !(p.flag & fillmode))
          continue;
        
        var i;
        var found;
        for (i=0; i<p.pat.length; i++) {
          found = true;
          
          for (var j=0; j<p.pat.length; j++) {
            if (p.pat[(j+i)%p.pat.length] != pat[j]) {
              found = false;
              break;
            }
          }
          
          if (found) {
            pat_found = p;
            break;
          }
        }
      }
      
      var p = pat_found;
      
      if (pat_found == false) {      
        if (vs.length == 2 && (fillmode & ES_FillFlags.EDGE_PATH)) {
          for (var i=0; i<count; i++) {
            var v1 = vs[0][i+1];
            var v2 = vs[1][vs[1].length-2-i];
            
            esubd_connect_verts(mesh, v1, v2);
          }
        }
        
        continue;
      }
      
      var c1 = 0, c2 = 0;        
      var verts = new Array(pat.length);
      
      for (var j=0; j<pat.length; j++) {
        if (pat[j] == 1) {
          verts[(i+j)%pat.length] = vs[c1++];
        } else {
          verts[(i+j)%pat.length] = vs2[c2++];
        }
      }
      
      /*console.log(pat);
      console.log(verts);
      
      console.log(found, i);
      console.log(_esubd_patterns);
      console.log(p.connect);*/
      
      if (p.exec != undefined) {
        p.exec(mesh, f, verts, ctx);
      } else {
        var con = p.connect;
        pat = p.pat;
        
        for (var i = 0; i<con.length; i++) {
          var c = con[i] & ~PatFlags.MASK;
          var m = con[i] & PatFlags.MASK;
          
          if (c < 0) continue;
          
          //console.log({m : m, pat : pat, i: i, pati : pat[i], c : c, patc : pat[c], vertsc: verts[c], vertsi : verts[i]});
          
          //console.log(m, i, pat[i], c, pat[c], verts[c], verts[i]);
          if (pat[i] == 1) {
            if (pat[c] == 0) {
              for (var j=1; j<verts[i].length-1; j++) {
                esubd_connect_verts(mesh, verts[i][j], verts[c]);
              }
            } else if (m & (PatFlags.ENDONLY|PatFlags.STARTONLY)) {
              var vs1 = verts[i];
              var vs2 = verts[c];
              
              esubd_connect_verts(mesh, vs1[0], vs2[vs2.length-1]);
            } else {
              var vs1 = verts[i];
              var vs2 = verts[c];
              
              if (c < i) {
                  var t = vs1;
                  vs1 = vs2;
                  vs2 = t;
              }
              
              for (var j=1; j<vs1.length-1; j++) {
                esubd_connect_verts(mesh, vs1[j], vs2[vs2.length-1-j]);
              }
            }
          } else {
            if (pat[c] == 1) {
              for (var j=1; j<verts[c].length-1; j++) {
                esubd_connect_verts(mesh, verts[i], verts[c][j]);
              }
            } else {
              esubd_connect_verts(mesh, verts[i], verts[c]);
            }
          }
        }
      }
    }
  }
}

//this op is actually an edge-directed pattern-based subdivision
// algorithm; calling it "edge subdivide" may be a bit misleading.
class QuadSubdOp extends MeshOp {
  constructor(Iterator faceiter, int count) {
    MeshOp.call(this);
    
    this.uiname = "Subdivide"
    this.name = "QuadSubdivide";
    this.inputs = {
      //count: new MeshIntProperty(1, "count", "Count", "", undefined, TPropFlags.PRIVATE), 
      input_faces: new CollectionProperty(undefined, [Face], "faces", "Faces", "")
    }
    
    this.inputs.input_faces.set_data(faceiter);
    //this.inputs.count.data = count;
  }
   
  /*this function works by finding clusters of vertices, then creating a new mesh with
    them welded together*/
  exec(op, mesh) {
    _quad_subd(mesh, this.inputs.input_faces, 1);
    mesh.api.recalc_normals();
  }
}

//set_old_pointer is used by subsurf; it creates
//an old_v1 point in vert (which points to the eid
//of a source vert), and old_v2 (that forms a source edge with
//old_v1).  it also sets an old_face eid pointer in faces.
function _quad_subd(Mesh mesh, Iterator faceiter, 
                   int count, Boolean set_old_pointer) //set_old_pointer is optional
{
  var ctx = new esubd_context(mesh)
  
  ctx.count = count;
  var edges = new set<Edge>();
  var faces = new set(list(faceiter));
  
  var ei = 0;
  
  var edata = ctx.edata;
  
  //quadrilate faces with holes
  var faces2 = new set();
  for (var f in faces) {
    f.index = f.eid;
    
    //skip non-complex faces
    if (f.looplists.length <= 1)
      continue;
    
    faces.remove(f);
    
    var eid = f.eid;
    var ts = triangulate(mesh, f);
    for (var f2 in ts) {
      f2.index = eid;
    }
    
    var fs = new set(tris_to_quads(mesh, ts));
    
    for (var f2 in fs) {
      f2.index = eid;
      faces2.add(f2);
    }
    
    for (var f2 in fs) {
      for (var e in f2.edges) {
        var ftot=0;
        
        for (var f3 in e.faces) {
          if (f2.index == f3.index && f3 != f) {
            ftot++;
          }
        }
        
        if (0) { //ftot > 1) {
          if (!edges.has(e)) {
            e.index = ei++;       
            var ed = new esubd_edata(e);
            ed.i = e.index;
            
            ctx.edata.push(ed);
            
            edata[e.index].interior_complex_edge = true;
            edges.add(e);
          }
        }
      }
    }
  }
  
  for (var f in faces2) {
    faces.add(f);
  }
  
  for (var f in faces) {
    for (var e in f.edges) {
      if (!edges.has(e)) {
        e.index = ei++;       
        var ed = new esubd_edata(e);
        ed.i = e.index;
        
        ctx.edata.push(ed);        
        edges.add(e);
      }      
    }
    
    if (set_old_pointer) {
      for (var v in f.verts) {
        v.old_v1 = v.eid;
      }
    }
  }
  
  for (var ed in ctx.edata) {
    _split_edge(ctx, ed);
  }
  
  for (var f in faces) {
    var verts = list<Vert>(f.verts);
    var cent = new Vector3();
    
    for (var v in verts) {
      cent.add(v.co);
    }
    
    cent.divideScalar(verts.length);
    
    var cv = mesh.make_vert(cent);
    mesh.verts.select(cv, true);
    
    var nfaces = new GArray();
    
    for (var i=0; i<verts.length; i += 2) {
      var v1 = verts[(i+verts.length-1)%verts.length];
      var v2 = verts[i];
      var v3 = verts[(i+1)%verts.length];
      var v4 = cv;
      
      if (set_old_pointer) {
        v1.old_v1 = v2.eid;
        v1.old_v2 = verts[(i+verts.length-2)%verts.length].eid;
        v3.old_v1 = v2.eid;
        v3.old_v2 = verts[(i+2)%verts.length].eid;
      }
      
      var f2 = mesh.make_face(new GArray([v1, v2, v3, v4]));
      
      f2.old_face = f.index;
      
      mesh.copy_face_data(f2, f);
      nfaces.push(f2);

      //set old pointer for faces,
      //and also for drawing edges     
      if (set_old_pointer) {
        var e = mesh.find_edge(v2, v3);
        
        f2.old_edge = undefined;
        
        if (!edata[e.index].interior_complex_edge && f.eid == f.index) {
          f2.old_edge = edata[e.index].orig_eid;
        } else if (1) { //handle complex faces, which are a bit more complicated
          var vs = [v1, v2, v3, v4];
          
          for (var j=0; j<4; j++) {
            var e2 = mesh.find_edge(vs[j], vs[(j+1)%4]);
            
            var ftot=0;
            for (var f3 in e2.faces) {
              if (f3 != f && f3.index == f.index)
                ftot++;
            }
            
            console.log("ftot: ", ftot);
            
            if (e2.index < edata.length && !edata[e2.index].interior_complex_edge && !edata[e.index].interior_complex_edge && ftot <= 1) // && 
                // !edata[e.index].interior_complex_edge) 
            {
              f2.old_edge = edata[e2.index].orig_eid;
              break
            }
          }
        }
      }
    }
    
    mesh.kill_face(f);
  }
}
