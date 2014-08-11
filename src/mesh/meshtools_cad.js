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

function bridge_two_loops(mesh, vloop1, vloop2, killfset, cuts) {
  var len1 = vloop1.length;
  var len2 = vloop2.length;
  var eset = new set();
  var fset = new set();
  
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
  
  //deal with interior faces first
  var loops = [vloop1, vloop2];
  var kill_faces = false;
  for (var i = 0; i<loops.length; i++) {
    var loop = loops[i];
    
    //figure out if we should delete interior faces or not.
    for (var j=0; j<loop.length; j++) {
      var j2 = (j+1)%loop.length;
      var e = mesh.find_edge(loop[j], loop[j2]);
      
      //kill interior faces if edge is surrounded by 2 or more faces
      if (e.loop != null && e.loop.radial_next != e.loop) {
        kill_faces = true;
        break;
      }
    }
  }
  
  if (kill_faces) {
    for (var f in killfset) {
      mesh.kill_face(f);
    }
  }
  
  //find start offset
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
        fset.add(f);
        continue;
      }
      
      quadlst[0] = v1; quadlst[1] = v2; quadlst[2] = v3; quadlst[3] = v4;
      var f = mesh.make_face(quadlst, false, false);
      fset.add(f);
    }
    
    SWAP(vloop1_2, vloop2_2, t);
  }
}

class BridgeOp extends MeshOp {
  constructor(Iterator<Edge> edgeiter=undefined, Iterator<Face> faceiter=undefined) {
    MeshOp.call(this, "bridge_edges", "Bridge Edges", "Bridge edge loops with faces", Icons.BRIDGE);
    
    this.flag |= ToolFlags.USE_PARTIAL_UNDO;
    this.undo_expand_lvl = 3;
    
    this.inputs = {
      edges : new CollectionProperty(undefined, undefined, "edges", "Edges", ""),
      faces : new CollectionProperty(undefined, undefined, "faces", "Faces", ""),
      cuts : new IntProperty(0, "cuts", "Cuts", "Number of subdivisions")
    }
    
    this.inputs.cuts.range = [0, 50];
    this.inputs.cuts.uirange = [0, 50];
    
    this.outputs = {
    }
    
    if (edgeiter != undefined) {
      this.inputs.edges.set_data(edgeiter);
    }
    
    if (faceiter != undefined) {
      this.inputs.faces.set_data(faceiter);
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
    
    var fset = new set(this.inputs.faces);
    if (loops.length == 2) {
      bridge_two_loops(mesh, loops[0], loops[1], fset, cuts);
    }
    
    mesh.api.recalc_normals();
  }
}

class ExtrudePullOp extends WidgetToolOp, ToolMacro {
  constructor(Iter elements=undefined) {
    var name = "ExtrudePullOp";
    var uiname = "Extrude"

    WidgetToolOp.call(name, uiname, "extrude out geometry");
    ToolMacro.call(this, name, uiname, new GArray());
    this.icon = Icons.EXTRUDE;
    
    this.align_normal = true;
    
    var meshop = new ExtrudeAllOp();
    var op = new MeshToolOp(meshop);
    
    if (elements)
      op.inputs.elements.set_data(elements);
    
    this.extop = op;
    
    this.add_tool(op);
    this.description = op.description;
    this.icon = op.icon;
    
    var transop = new TranslateOp(EditModes.GEOMETRY)
    this.add_tool(transop);

    this.connect_tools(op.outputs.group_no, transop.inputs.axis);
  }
  
  static gen_toolop(id, widget, ctx) {
    var macro = new ExtrudePullOp();
    macro.extop.inputs.elements.set_data(ctx.mesh.selected);
    
    return macro;
  }
}

ExtrudePullOp.widget_axes = [0, 0, 1];
ExtrudePullOp.widget_center = false;
ExtrudePullOp.widget_align_normal = true;

function bicubic_u(u, v, ps) {
  return (-(((pow(v-1, 2)*ps[1][0]-2*(v-1)*ps[1][1]*v+ps[1][2]*pow(v, 2))*(2*u-3)-
   (pow(v-1, 2)*ps[2][0]-2*(v-1)*ps[2][1]*v+ps[2][2]*pow(v, 2))*u)*u-(pow(v-1, 2)*
   ps[0][0]-2*(v-1)*ps[0][1]*v+ps[0][2]*pow(v, 2))*(pow(u, 2)-3*u+3))*u)/3
}

function bicubic_v(u, v, ps) {
  return (((2*(((2*v-3)*ps[1][1]-ps[1][2]*v)*v-(pow(v, 2)-3*v+3)*ps[1][0])*(u-1
    )-(((2*v-3)*ps[2][1]-ps[2][2]*v)*v-(pow(v, 2)-3*v+3)*ps[2][0])*u)*u-(((2*
    v-3)*ps[0][1]-ps[0][2]*v)*v-(pow(v, 2)-3*v+3)*ps[0][0])*pow(u-1, 2))*v)/3;
}

function approxu1(u, v, psu) {
  return sin(bicubic_u(u, v, psu));
}

function approxv1(u, v, psv) {
  return cos(bicubic_v(u, v, psv));
}

function approxu2(u, v, psu) {
  return cos(bicubic_u(u, v, psu));
}

function approxv2(u, v, psv) {
  return sin(bicubic_v(u, v, psv));
}

function approx(u, v, vi, dfunc, param) {
  var steps = 11;
  var ret = 0;
  
  var uv = [u, v];
  var mul = (uv[vi])/steps;
  var ds = (uv[vi])/steps;
  var start = uv[vi];
  
  uv[vi] = 0;
  
  for (var i=0; i<steps; i++) {
    var df = dfunc(uv[0], uv[1], param);
    ret += df*mul;
    
    uv[vi] += ds;
  }
  
 // if (start < 0) return -ret;
  return ret;
}

var KSTART, KEULER, KSCALE, KQUAD, KPQUAD;

function default_pquad(ks) {
  var quad = [1, 0,   0, 0,   0, 1,   1, 1];
  for (var i=0; i<quad.length; i++) {
    ks[KPQUAD+i] = quad[i];
  }
}

function make_ks(psu, psv, start, scale, quad, pquad, euler) {
  if (scale == undefined)
    scale = 1;
    
  var ks = []
  for (var i=0; i<psu.length; i++) {
    for (var j=0; j<psu.length; j++) {
      ks.push(psu[i][j]);
    }
  }
  for (var i=0; i<psu.length; i++) {
    for (var j=0; j<psu.length; j++) {
      ks.push(psv[i][j]);
    }
  }
  
  KPQUAD = ks.length;
  if (pquad == undefined) {
    for (var i=0; i<8; i++) {
      ks.push(0);
    }
    default_pquad(ks);
  } else {
    for (var i=0; i<8; i++) {
      ks.push(pquad[i]);
    }
  }
  
  KQUAD = ks.length;
  if (pquad == undefined) {
    for (var i=0; i<8; i++) {
      ks.push(0);
    }
  } else {
    for (var i=0; i<8; i++) {
      ks.push(quad[i]);
    }
  }
  
  KSTART = ks.length;
  start.concat_array(ks);
  
  KEULER = ks.length;
  euler.concat_array(ks);
  
  KSCALE = ks.length;
  ks.push(scale); //scale
  
  return ks;
}

function unbind_ks(ks) {
  var psu = [];
  var psv = [];
  var c = 0;
  for (var i=0; i<4; i++) {
    psu.push([]);
    for (var j=0; j<4; j++) {
      psu[i].push(ks[c++]);
    }
  }
  
  for (var i=0; i<4; i++) {
    psv.push([]);
    for (var j=0; j<4; j++) {
      psv[i].push(ks[c++]);
    } }
  
  var start = new Vector3();
  start[0] = ks[c++];
  start[1] = ks[c++];
  start[2] = ks[c++];
  var scale = ks[c++];
  
  return [psu, psv, start, scale];
}

function eval_surf(u, v, psu, psv, ks) {
  static rotmatrix = new Matrix4();
  static rets = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  static reti = 0;
  
  u = Math.max(Math.min(u, 1), 0);
  v = Math.max(Math.min(v, 1), 0);
  
  //parameterization transform
  var u2 = ks[KPQUAD+2] + (ks[KPQUAD+0]-ks[KPQUAD+2])*u;
  var u3 = ks[KPQUAD+4] + (ks[KPQUAD+6]-ks[KPQUAD+4])*u;
  
  var v2 = ks[KPQUAD+3] + (ks[KPQUAD+1]-ks[KPQUAD+3])*u;
  var v3 = ks[KPQUAD+5] + (ks[KPQUAD+7]-ks[KPQUAD+5])*u;
   
  u = u2 + (u3-u2)*v;
  v = v2 + (v3-v2)*v;
  
  var x =  approx(u, v, 1, approxv1, psv);
  var y =  approx(u, v, 0, approxu2, psu);

  var z1 =  approx(u, v, 1, approxv2, psv);
  var z2 =  approx(u, v, 0, approxu1, psu);
  
  x += 0.5;
  y += 0.5;
  
  var x2 = ks[KQUAD+2] + (ks[KQUAD+0]-ks[KQUAD+2])*x;
  var x3 = ks[KQUAD+4] + (ks[KQUAD+6]-ks[KQUAD+4])*x;
  var y2 = ks[KQUAD+3] + (ks[KQUAD+1]-ks[KQUAD+3])*x;
  var y3 = ks[KQUAD+5] + (ks[KQUAD+7]-ks[KQUAD+5])*x;
   
  var xn = x2 + (x3-x2)*y;
  var yn = y2 + (y3-y2)*y;
  
  x = xn;
  y = yn;
  
  var z = z2+z1;

  var ret = rets[reti];
  reti = (reti+1)%rets.length;

  ret[0] = x; ret[1] = y; ret[2] = z;
  ret.mulScalar(ks[KSCALE]);

  rotmatrix.makeIdentity();
  rotmatrix.rotate(ks[KEULER], ks[KEULER+1], ks[KEULER+2]);
  ret.multVecMatrix(rotmatrix);

  ret[0] += ks[KSTART];
  ret[1] += ks[KSTART+1];
  ret[2] += ks[KSTART+2];
}

/*
0,1      1,1
 v2------v3
 |        |
 |        |
 |        |
 v1------v4
0,0      1,0
*/

function edge_uv(i, t) {
  static ret = [0, 0];
  switch (i) {
    case 0:
      ret[0] = 0;
      ret[1] = t;
      break;
    case 1:
      ret[0] = t;
      ret[1] = 1;
      break;
    case 2:
      ret[0] = 1;
      ret[1] = 1-t;
      break;
    case 3:
      ret[0] = 1-t;
      ret[1] = 0;
      break;
  }
  
  return ret;
}

class SpiralPatch {
  constructor(Face f) { //f should be a quad
    var psu = [];
    
    for (var i=0; i<4; i++) {
      psu.push([]);
      for (var j=0; j<4; j++) {
        psu[i].push(0);
      }
    }
    
    this.ks = make_ks(psu, psv, new Vector3(), 1, undefined, undefined, new Vector3());
    this.f = f;
  }
  
  fit_face() {  
    var ks = this.ks;
    var f = this.f;
    
    var vs = list(f.verts);
    var start = new Vector3(vs[0].co);
    var mat = new Matrix4();
    static axis = new Vector3([1, 0, 0]);
    
    var cross = new Vector3(axis).cross(f.no);
    cross.normalize();
    
    var q = new Quat();
    q.axisAngleToQuat(cross, f.no.dot(axis));
    
    var mat = q.toMatrix();
    var cos2d = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
    
    var mm2d = new MinMax(2), mm = new MinMax(3);
    for (var i=0; i<4; i++) {
      cos2d[i].load(vs[i].co).multVecMatrix(mat);
      mm2d.minmax(cos2d[i]);
    }
    
    var scale = 1/mm2d.max.vectorDistance(mm.min);
    
    for (var i=1; i<4; i++) {
      cos2d[i].sub(cos2d[0]).mulScalar(scale);
    }
    cos2d[0].zero();
    
    ks[KQUAD]   = cos2d[0][0]; ks[KQUAD+1] = cos2d[0][1];
    ks[KQUAD+2] = cos2d[1][0]; ks[KQUAD+3] = cos2d[1][1];
    ks[KQUAD+4] = cos2d[2][0]; ks[KQUAD+5] = cos2d[2][1];
    ks[KQUAD+6] = cos2d[3][0]; ks[KQUAD+7] = cos2d[3][1];
    
    ks[KSTART] = start[0];
    ks[KSTART+1] = start[1];
    ks[KSTART+2] = start[2];
    
    for (var i=0; i<32; i++) {
      ks[i] = 0;
    }
  }
}