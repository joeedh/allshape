
//#$(Face).class
function FaceVertIter(Face data) {
  this.ret = {done : false, value : undefined};
  this.data = data
  this.curlist = 0;
  this.curloop = data.looplists[0].loop;
  this.startloop = data.looplists[0].loop;
  
  //#$().Vertex
  this.next = function() : Vertex {
    var reti = this.ret;
    if (this.curloop == null) {
      reti.done = true;
      return reti;
    }

    var ret = this.curloop.v;
    
    this.curloop = this.curloop.next;
    if (this.curloop == this.startloop) {
      this.curloop = null;
      this.curlist++;
      
      if (this.curlist < this.data.looplists.length) {
         this.curloop = this.startloop = this.data.looplists[this.curlist].loop;
      }
    }
    
    reti.value = ret;
    return reti;
  }
}

//#$(Face).class
function FaceLoopIter(Face data) {
  this.ret = {done : false, value : undefined};
  this.data = data
  this.curlist = 0;
  this.curloop = data.looplists[0].loop;
  this.startloop = data.looplists[0].loop;
  
  //#$().Vertex
  this.next = function() : Loop {
    var reti = this.ret;
    
    if (this.curloop == null) {
      reti.done = true;

      return reti;
    }
    
    var ret = this.curloop;
    
    this.curloop = this.curloop.next;
    if (this.curloop == this.startloop) {
      this.curloop = null;
      this.curlist++;
      
      if (this.curlist < this.data.looplists.length) {
         this.curloop = this.startloop = this.data.looplists[this.curlist].loop;
      }
    }
    
    reti.value = ret;
    return reti;
  }
}

//#$(Face).class
function FaceEdgeIter(Face data) {
  this.ret = {done : false, value : undefined};
  this.data = data
  this.curlist = 0;
  this.curloop = data.looplists[0].loop;
  this.startloop = data.looplists[0].loop;
  
  //#$().Vertex
  this.next = function() : Edge {
    var reti = this.ret;
    
    if (this.curloop == null) {
      reti.done = true;
      return reti;
    }
    
    var ret = this.curloop.e;
    
    this.curloop = this.curloop.next;
    if (this.curloop == this.startloop) {
      this.curloop = null;
      this.curlist++;
      
      if (this.curlist < this.data.looplists.length) {
         this.curloop = this.startloop = this.data.looplists[this.curlist].loop;
      }
    }
    
    reti.value = ret;
    return reti;
  }
}

//#$(Vert).class
function VertEdgeIter(Vert data) {
  this.ret = {done : false, value : undefined};
  this.data = data
  this.first = data;
  this.cur = 0;

  //#$().Edge
  this.next = function() : Edge {
    var reti = this.ret;
    if (this.cur < this.data.edges.length()) {
      reti.value = this.data.edges[this.cur++];
    } else {
      reti.done = true;
    }
    
    return reti;
  }
}

function VertLoopIter(Vert data) {
  this.ret = {done : false, value : undefined};
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
    var reti = this.ret;
    
    if (this.curloop == null) {
      reti.done = true;
      return reti;
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
    
    reti.value = ret;
    return reti;
  }
}

function VertFaceIter(Vert data) {
  this.ret = {done : false, value : undefined};
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
    var reti = this.ret;
    
    if (this.curedge == this.data.edges.length || this.curloop == null) {
      reti.done = true;
      return reti;
    }

    var ret = this.curloop.f;
    
    this.curloop = this.curloop.radial_next;
    if (this.curloop == this.data.edges[this.curedge].loop) {
      this.curedge += 1;
      
      if (this.curedge != this.data.edges.length)
        this.curloop = this.data.edges[this.curedge].loop;
    }
    
    reti.value = ret;
    return reti;
  }
}

function EdgeVertIter(Edge data) {
  this.ret = {done : false, value : undefined};
  this.data = data;
  this.i = 0;
  
  this.next = function() : Vertex {
    var reti = this.ret;
    
    if (this.i == 0) {
      this.i++;
      
      reti.value = this.data.v1;
      return reti;
    } else if (this.i == 1) {
      this.i++;
      reti.value = this.data.v2;
      return reti;
    } else {
      this.i = 0;
      this.ret = {done : false, value : undefined};
      reti.done = true;
      
      return reti;
    }
  }
  
  this.reset = function() {
    this.i = 0;
    this.ret = {done : false, value : undefined};
  }
}

function EdgeFaceIter(Edge data) {
  this.ret = {done : false, value : undefined};
  this.data = data
  this.first = data;
  this.cur = 0;
  this.curloop = data.loop;
  
  this.next = function() : Face {
    var reti = this.ret;
    
    if (this.curloop == null) {
      reti.done = true;
      return reti;
    }
    
    var ret = this.curloop.f;
 
    this.curloop = this.curloop.radial_next; 
    if (this.curloop == this.data.loop) {
      this.curloop = null; //set stop condition
    }
    
    reti.value = ret;
    return reti;
  }
}

function EdgeLoopIter(Edge data) {
  this.ret = {done : false, value : undefined};
  this.data = data
  this.first = data;
  this.cur = 0;
  this.curloop = data.loop;
  
  this.next = function() : Loop {
    var reti = this.ret;
    if (this.curloop == null) {
      reti.done = true;
      return reti;
    }
    
    var ret = this.curloop;
 
    this.curloop = this.curloop.radial_next; 
    if (this.curloop == this.data.loop) {
      this.curloop = null; //set stop condition
    }
    
    reti.value = ret;
    return reti;
  }
}

var MeshIter = {};

MeshIter.VERT_EDGES = 5;
MeshIter.VERT_FACES = 6;
MeshIter.EDGE_FACES = 7;
MeshIter.EDGE_LOOPS = 8;
MeshIter.FACE_VERTS = 9;
MeshIter.FACE_EDGES = 10;
MeshIter.FACE_ALL_LOOPS = 11;
MeshIter.EDGE_VERTS = 12;

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

var _cent = new Vector3();
var _mapi_frn_n1 = new Vector3();
/*function recalc_normals_job(m2, use_sco) {
  this.__iterator__ = function() {
    return this;
  }
  this.next = function() {
    return {done : true, value : undefined};
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
    var reti = this.iter.next();
    this.i++;
    
    if (this.i > 5000) {
      console.log("Inifite loop detected in recalc normals job!");
      return {done : true, value : undefined};
    }
    
    return reti;
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

    yield;
    
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
  
  this.select_flush = function(selmode) {
    var m = this.mesh;
    
    if (selmode == MeshTypes.VERT) {
      for (var v in m.verts) {
        for (var e in v.edges) {
          m.select(e, (v.flag & Flags.SELECT) && (e.other_vert(v).flag & Flags.SELECT));
        }
      }
      
      for (var f in m.faces) {
        var totsel = 0;
        
        for (var v in f.verts) {
          totsel += (v.flag & Flags.SELECT) != 0;
        }
        
        m.select(f, totsel==f.totvert);
      }
      
    } else if (selmode == MeshTypes.EDGE) {
      for (var v in m.verts) {
        var found = false;
        for (var e in v.edges) {
          if (e.flag & Flags.SELECT) {
            found = true;
            break;
          }
        }
        
        m.verts.select(v, found);
      }
      
      for (var f in m.faces) {
        var totsel = 0;
        var tote = 0;
        
        for (var e in f.edges) {
          totsel += e.flag & Flags.SELECT;
          tote++;
        }
        
        m.faces.select(f, totsel==tote);
      }
    } else {
      for (var v in m.verts)
        m.verts.select(v, false);
      
      for (var e in m.edges)
        m.edges.select(e, false);
      
      for (var f in m.faces) {
        if (!(f.flag & Flags.SELECT))
          continue;
        
        for (var v in f.verts)
          m.verts.select(v, true);
        for (var e in f.edges)
          m.edges.select(e, true);
      }
    }
  }

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
        var l1 = iter1.next();
        var l2 = iter2.next();
        
        if (l1.done || l2.done) break;
        
        mesh.copy_loop_data(l2.value, l1.value);
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
