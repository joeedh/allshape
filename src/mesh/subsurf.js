"use strict";

function facto(n) {
    var prod = 1;
    for (var i=1; i<n+1; i++) {
        prod *= i;
    }
    return prod;
}

function gen_xy_array(sizex, sizey) {
  var arr = new GArray([]);
  for (var i=0; i<sizex; i++) {
    arr.push(new GArray([]));
    
    for (var j=0; j<sizey; j++) {
      arr[i].push(new Vector3());
    }
  }
  
  return arr;
}

var _p_tab = [1, 3, 3, 1];
function Patch(degx, degy) {
    this.size = [degx+1, degy+1];
    this.points = gen_xy_array(degx+1, degy+1);
    
    this.degree = [degx, degy]
    
    this.eval = function(u, v) {
      var n = this.degree[0];
      var m = this.degree[1];
      var dx = this.size[0];
      var dy = this.size[1];
      
      var u2 = u; var v2 = v
      
      var k = this.points
      var p = new Vector3();
      for (var i=0; i<n+1; i++) {
        for (var j=0; j<m+1; j++) {
          var bi = _p_tab[i];
          bi *= Math.pow(u, i)*Math.pow(1-u, n-i);
         
          var bj = _p_tab[j];
          bj *= Math.pow(v, j)*Math.pow(1-v, m-j);
          
          p.add(k[i][j].static_mulScalar(bi*bj));
        }
      }
      
      return p;
    }
}

function tess_patch(m, face, patch, steps) {
    var df = 1.0 / (steps-1);
    var verts = gen_xy_array(steps, steps);
    
    for (var i=0; i<steps; i++) {
        for (var j=0; j<steps; j++) {
            var p = patch.eval(df*i, df*j);
            
            var v = m.make_vert(p);
            verts[i][j] = v;
        }
    }

    for (var i=0; i<steps-1; i++) {
        for (var j=0; j<steps-1; j++) {
            var vs = new GArray([verts[i][j], verts[i+1][j], verts[i+1][j+1], verts[i][j+1]]);
            vs.reverse();
            var f = m.make_face(vs);
            f.flag = face.flag;
        }
    }
}

function out_patch(m, patch) {
    var verts = gen_xy_array(4, 4);
    
    for (var i=0; i<4; i++) {
        for (var j=0; j<4; j++) {
            var p = patch.points[i][j];
            
            var v = m.make_vert(p);
            verts[i][j] = v;
        }
    }
    
    for (var i=0; i<3; i++) {
        for (var j=0; j<3; j++) {
            var vs = [verts[i][j], verts[i+1][j], verts[i+1][j+1], verts[i][j+1]]
            ensure_edge(m, vs[0], vs[1])
            ensure_edge(m, vs[1], vs[2])
            ensure_edge(m, vs[2], vs[3])
            ensure_edge(m, vs[3], vs[0])
        }
    }
}

function norm(m) {
    var sum = 0.0;
    
    for (var k=0; k<m.length; k++) {
        sum += m[k];
    }
    
    for (var k=0; k<m.length; k++) {
        m[k] /= sum;
    }
}

function get_v_loops(v, vlooplists) {
    var vloops;
    if (vlooplists.hasOwnProperty(v.eid.toString())) {
      vloops = vlooplists[v.eid];
    } else {
      vloops = new GArray();
      for (var l in v.loops) {
        vloops.push(l);
      }
      vlooplists[v.eid.toString()] = vloops;
    }
    
    return vloops;
}

//we're assuming consistent face windings
function get_ring(v, f, vlooplists) {
    var lst = new GArray();
    var l = null;
        
    var vls = get_v_loops(v, vlooplists);
    for (var i=0; i<vls.length; i++) {
        var l2 = vls[i];
        if (l2.v == v && l2.f == f) {
            l = l2
            break
        }
    }
    
    if (l == undefined)
      return lst;
    
    var startl = l;
    var unwind = false;
    
    if (1) {
      while (1) {
        lst.push(l.next.v);
        lst.push(l.next.next.v);

        if (l.radial_next == l) {
          unwind = true;
          break;
        }
        
        l = l.radial_next.next;
        
        if (l == startl)
          break;
      }
    }
    
    l = startl.prev.radial_next;
    if (l == l.radial_next || unwind == false) {
      if (l == l.radial_next && unwind) {
        lst.push(l.v);
        
        /*hackish! give startl.v greater weight*/
        lst.push(startl.v);
        lst.push(startl.v);
        lst.push(startl.v);
        lst.push(startl.v);
      }
      
      return lst;
    }
    
    if (unwind) {
      /*hackish! give startl.v greater weight*/
      lst.push(startl.v);
      lst.push(startl.v);
      lst.push(startl.v);
      lst.push(startl.v);
    }
    
    var i = 0;
    while (1) {
        lst.push(l.next.v);
        lst.push(l.next.next.v);
        
        if (l.prev.radial_next != l.prev) {
          l = l.prev.radial_next;
        } else {
          lst.push(l.prev.v);          
          break;
        } 
        
        if (l == startl)
            break;
        
        if (i > 1000) {
            console.log("lset test was necessary");
            i = -1;
            break;
        }
        
        i++;
    }

    if (i == -1) {
      var lset = new set();
      while (1) {
          lst.push(l.next.v);
          lst.push(l.next.next.v);
          
          if (l.prev.radial_next != l.prev) {
            l = l.prev.radial_next;
          } else {
            lst.push(l.prev.v);
            
            lst.push(startl.v);
            lst.push(startl.v);
            lst.push(startl.v);
            break;
          }
          
          if (l == startl)
              break;
          
          if (lset.has(l)) {
              break;
          }
          
          lset.add(l);
      }
    }
    
    return lst;
}

function lerp(a, b, t) {
    return a + (b-a)*t;
}

function match_quad(f, vlooplists) {
    var ptch = new Patch(3, 3)
    
    var ls = list(f.loops);
    var v1 = ls[0].v, v2 = ls[1].v, v3 = ls[2].v, v4 = ls[3].v;
    
    var ps = ptch.points;
    function corner(x, y, i) {
        var ring = get_ring(ls[i].v, f, vlooplists);
        ring.push(ls[i].v);
        
        ps[x][y] = new Vector3();
        
        var mc = new GArray([])
        for (var j=0; j<ring.length-1; j++) {
          mc.push((j%2)==0 ? 4 : 1);
        }
        
        var len = ls[i].v.edges.length;
        mc.push(len*len);
        
        norm(mc);
        
        for (var j=0; j<ring.length; j++) {
          if (j >= mc.length) break;
          var v = ring[j];
          
          ps[x][y].add(v.co.static_mulScalar(mc[j]));
        }
    }
    
    corner(0, 0, 0);
    corner(0, 3, 1);
    corner(3, 3, 2);
    corner(3, 0, 3);
    
    function get_e_ring(v1, v2, f) {
        var l1 = null, l2 = null;
        var r = [];

        var vls = get_v_loops(v1, vlooplists);
        for (var i=0; i<vls.length; i++) {
            var l = vls[i];
            
            if (l.f == f) {
                l1 = l;
                break;
            }
        }
        
        var vls = get_v_loops(v2, vlooplists);
        for (var i=0; i<vls.length; i++) {
            var l = vls[i];
            if (l.f == f) {
                l2 = l;
                break;
            }
        }
        
        if (l1 == undefined || l2 == undefined) {
          console.log("yeeek---->", l1, l2);
          console.log("subsurf yeek");
          
          return r;
        }
        
        //corner1 adj1 adj2 corner2
        if (l1.next.v == v2) {
            if (l1.radial_next != l1) {
              r.push(l1.radial_next.next.next.v);
              r.push(l1.prev.v);
              r.push(l1.next.next.v);
              r.push(l1.radial_next.prev.v);
            } else {
              r.push(v1);
              r.push(l1.prev.v);
              r.push(l1.next.next.v);
              r.push(v2);
            }
        } else {
          if (l2.radial_next.prev != l2) {
            r.push(l2.radial_next.prev.v);
            r.push(l2.prev.prev.v);
            r.push(l2.radial_next.next.next.v);
            r.push(l2.prev.v);
          } else {
            r.push(v1);
            r.push(l2.prev.prev.v);
            r.push(v2);
            r.push(l2.prev.v);
          }
        }
        
        r.push(v1);
        r.push(v2);
        
        return r;
    }
    
    function edge(x1, y1, x2, y2, v1, v2) {
        var r = get_e_ring(v1, v2, f);
        
        if (r.length != 6)
          return
    
        var v11 = new Vector3()
        var v22 = new Vector3()
        
        var me1 = [2, 2, 1, 1, 8, 4];
        var me2 = [1, 1, 2, 2, 4, 8];
        me1[me1.length-2] = 2*v1.edges.length;
        me2[me1.length-1] = 2*v2.edges.length;
        norm(me1);
        norm(me2);
        
        for (var j=0; j<me1.length; j++) {
            v11.add(r[j].co.static_mulScalar(me1[j]));
        }
        
        for (var j=0; j<me2.length; j++) {
            v22.add(r[j].co.static_mulScalar(me2[j]));
        }
        
        ps[x1][y1] = v11;
        ps[x2][y2] = v22;
    }
    
    function rot(m, end) { //end is optional
        if (end == undefined) end = 0;
        var m2 = [];
        for (var i1=m.length; i1<-end; i1++) {
            m2.push(m[(i1+1)%(m.length-end)]);
        }
        
        for (var i1=m.length-end; i1<m.length; i1++) {
            m2.push(m[i1]);
        }
        
        for (var i1=0; i1<m.length; i1++)
          m[i1] = m2[i1];
    }
    
    edge(0, 1, 0, 2, v1, v2)
    edge(1, 3, 2, 3, v2, v3)
    edge(3, 1, 3, 2, v4, v3)
    edge(1, 0, 2, 0, v1, v4)
    
    function interior(x, y, v) {
        var r = get_ring(v, f, vlooplists);
        r[3] = v;
        
        if (v == ls[0].v)
            r = [ls[0].v, ls[1].v, ls[2].v, ls[3].v];
        else if (v == ls[1].v)
            r = [ls[1].v, ls[2].v, ls[3].v, ls[0].v];
        else if (v == ls[2].v)
            r = [ls[2].v, ls[3].v, ls[0].v, ls[1].v];
        else if (v == ls[3].v)
            r = [ls[3].v, ls[0].v, ls[1].v, ls[2].v];
            
        r.splice(r.indexOf(v), 1);
        r.push(v);
        
        var mi = [2, 1, 2, v.edges.length];
        norm(mi);
        
        ps[x][y] = new Vector3();
        for (var i=0; i<4; i++) {
            ps[x][y].add(r[i].co.static_mulScalar(mi[i]));
        }
    }
    
    interior(1, 1, v1);
    interior(1, 2, v2);
    interior(2, 2, v3);
    interior(2, 1, v4);
    
    return ptch;
}

function v_in_e(e, v) {
    return v == e.v1 || v == e.v2
}

function gen_subsurf(in_mesh2) {
  var m = new Mesh()
  
  var in_mesh = in_mesh2.copy()
  
  _quad_subd(in_mesh, in_mesh.faces, 1);
  vert_smooth(in_mesh, in_mesh.verts);
  
  in_mesh.faces.index_update();
  in_mesh.edges.index_update();
  in_mesh.verts.index_update();
  function do_boundary_edges() {  
      var edata = new GArray();
      var vmap = new hashtable();
      
      function new_vert(v) {
          if ((list(v.edges).length) == 2) {
              return in_mesh.make_vert(v.co);
          }
          
          if (vmap.has(v.index)) {
              return vmap[v.index];
          } else {
              vmap[v.index] = in_mesh.make_vert(v.co);
              return vmap[v.index];
          }
      }
      
      for (var e in list(in_mesh.edges)) {
          if ((list(e.faces).length) != 1)
            continue;
          
          var v1 = new_vert(e.v1);
          var v2 = new_vert(e.v2);
          
          var do_crn1 = do_crn2 = false;
          var do_crn1 = (list(e.v1.edges)).length == 2;
          var do_crn2 = (list(e.v2.edges)).length == 2;
          edata.push([e, v1, v2, do_crn1, do_crn2]);
      }
      
      var f = null;
      for (var ed in edata) {
          var e = ed[0]; var v1 = ed[1]; var v2 = ed[2]; var co_crn1 = ed[3];
          var co_crn2 = ed[4];
          
          var l = list(e.loops)[0]
          if (l.v == e.v2) {
              f = in_mesh.make_face([e.v1, e.v2, v2, v1])
          } else {
              f = in_mesh.make_face([e.v2, e.v1, v1, v2])
          }
          
          f.index = -1
          
          if (do_crn1) {
              var v3 = null;
              for (var e2 in e.v1.edges) {
                  if (e.index != e2.index && e2.index != -1 && e2.index < edata.length) { 
                      if (e.v1 == e2.verts[0]) {
                          v3 = edata[e2.index][1];
                      } else {
                          v3 = edata[e2.index][2];
                      }
                  }
              }
              if (v3 != null) {
                  var vs = [e.v2, v1, in_mesh.make_vert(v1.co), v3]
                  f = in_mesh.make_face(vs);
                  if (f != null)
                    f.index = -1;
              }
          }
          if (do_crn2) {
              var v3 = null;
              for (var e2 in e.v2.edges) {
                  if (e.index != e2.index && e2.index != -1 && e2.index < edata.length) {
                      if (e.v2 == e2.verts[0]) {
                          v3 = edata[e2.index][1]
                      } else {
                          v3 = edata[e2.index][2]
                      }
                  }
              }
              if (v3 != null) {
                  var vs = [e.v2, v2, in_mesh.make_vert(v2.co), v3]
                  print(vs)
                  var f = in_mesh.make_face(vs)
                  f.index = -1
              }
          }
      }
  }
  //do_boundary_edges();
  
  var vlooplists = {};
  for (var f in list(in_mesh.faces)) {
      if (f.index >= 0) {
          var qpatch = match_quad(f, vlooplists);
          tess_patch(m, f, qpatch, steps);
      }
  }
  
  m.render = new render();
  m.render.vertprogram = in_mesh.render.vertprogram;
  m.render.drawprogram = in_mesh.render.drawprogram;
  m.regen_render();
  return m;
}

function gpu_subsurf(gl, in_mesh2, steps, ss_mesh) {
  var m = new Mesh()
  
  var themesh = null;

  if (ss_mesh != undefined) {
    themesh = ss_mesh;
    var do_all = false;
    var i = 0;
    
    var c1 = new Vector3();
    var c2 = new Vector3();
    
    if (ss_mesh != undefined) {
      for (var f in in_mesh2.faces) {
        f.index = f.flag & Flags.DIRTY;
      }
      
      for (var f in in_mesh2.faces) {
        if (f.index != Flags.DIRTY) continue;
        
        for (var l in f.loops) {
          for (var f2 in l.v.faces) {
            f2.flag |= Flags.DIRTY;
          }
        }
      }
      
      themesh = ss_mesh;
      for (var f in ss_mesh.faces) {
        f.flag = f.old_face.flag;
        f.index = f.old_face.flag & Flags.DIRTY;
        f.no.load(f.old_face.no);
        
        f.center.zero();
        if (f.index != Flags.DIRTY)
          continue;
        
        if (f.old_face.looplists.length > 1) {
          continue;
        }
        
        for (var v in f.verts) {
          f.center.add(v.co);
          
          var v1 = v.old_v1;
          if (v.old_v1 != undefined && v.old_v2 == undefined) { //original vert
            v.co.load(v1.co);
            v.no.load(v1.no);
            var tot = 1.0;
            
            for (var e in v1.edges) {
              c1.load(v1.co);
              c1.add(e.other_vert(v1).co);
              c1.mulScalar(0.5);
              
              v.co.add(c1);
              tot++;
            }
            
            v.co.divideScalar(tot);            
          } else if (v.old_v1 != undefined && v.old_v2 != undefined) { //edge vert
            var v1 = v.old_v1;
            var v2 = v.old_v2;
            var e = in_mesh2.find_edge(v1, v2);
            
            if (e == undefined) {
              console.trace();
              continue;
            }
            
            v.co.load(v1.co);
            v.co.add(v2.co);
            v.co.mulScalar(0.5);
            
            v.no.load(v1.no);
            v.no.add(v2.no);
            
            
            v.co.add(v1.co);
            v.co.add(v2.co);
            
            tot = 3.0;
            for (var f2 in e.faces) {
              v.co.add(f2.center);
              tot += 1.0
            }
            v.co.divideScalar(tot);
          } else if (v.old_v1 == undefined) { //center vert
            v.co.load(f.old_face.center);
          }
        }
        
        f.center.divideScalar(f.totvert);
      }
    }
  } else {
    themesh = in_mesh2.copy()
    _quad_subd(themesh, themesh.faces, 1, true);
    vert_smooth(themesh, themesh.verts);
    themesh.render = new render()
    themesh.api.recalc_normals();

    for (var v in themesh.verts) {
      if (v.old_v1 != undefined)
        v.old_v1 = in_mesh2.verts.get(v.old_v1);
      if (v.old_v2 != undefined)
        v.old_v2 = in_mesh2.verts.get(v.old_v2);
    }
    
    for (var f in themesh.faces) {
      f.old_edge = in_mesh2.edges.get(f.old_edge);
      //console.log(f.old_face);
      f.old_face = in_mesh2.faces.get(f.old_face);
      f.index = (f.old_face.flag & Flags.DIRTY);
    }
    
    for (var f in themesh.faces) {
      if (f.index != Flags.DIRTY) 
        continue;
        
      for (var l in f.loops) {
        for (var f2 in l.e.faces) {
          f2.flag |= Flags.DIRTY;
        }
      }
    }
  }
  
  var data_size = 4*4*3*themesh.faces.length;
  data_size = 1<<Math.ceil(Math.log(Math.sqrt(data_size)) / Math.log(2.0));
  
  /*data_size = Math.ceil(Math.sqrt(data_size));
  if (data_size % 2 != 0)
    data_size += 1;*/
  
  if (ss_mesh != undefined && ss_mesh.render.ss_data.length == data_size*data_size) {
    var data = ss_mesh.render.ss_data;
  } else {
    var data = new Float32Array(new ArrayBuffer(data_size*data_size*4));
  }
  
  var vlooplists = {};
  var c = 0;
  var totmatch = 0;
  for (var f in themesh.faces) {
      if (ss_mesh == undefined || (f.flag & Flags.DIRTY)) {
          var qpatch = match_quad(f, vlooplists);
          var ps = qpatch.points;
          
          totmatch++;
          
          f.patch = qpatch;
          
          for (var x=0; x<4; x++) {
            for (var y=0; y<4; y++) {
              data[c++] = ps[x][y][0];
              data[c++] = ps[x][y][1];
              data[c++] = ps[x][y][2];
            }
          }
          
          /*set vert and face center mapped positions*/
          var v1 = f.looplists[0].loop;
          
          while (v1.v.old_v2 != undefined) {
            v1 = v1.next;
          } 
          
          v1 = v1.v.old_v1;
          v1.mapco.load(qpatch.eval(0, 1));
          
          f.old_face.mapcenter.load(qpatch.eval(1, 0));
      } else {
        c += 4*4*3;
      }
  }
  
  /*if (totmatch > 0) {
    console.log("totmatch:", totmatch);
  }*/
  
  themesh.render.ss_data = data;
  
  if (ss_mesh != undefined) {
      themesh.render = ss_mesh.render;
      gl.deleteTexture(ss_mesh.render.ss_tex);
      gl.deleteTexture(ss_mesh.render.util_tex);
  }
  
  themesh.render.ss_tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, themesh.render.ss_tex);
  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, data_size, data_size,
                0, gl.ALPHA, gl.FLOAT, data);
  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
  if (ss_mesh != undefined && ss_mesh.faces.length == themesh.faces.length) 
    return themesh;
    
  var vertbuf = []
  var df = 1.0 / (steps-1);
  
  for (var i=0; i<steps; i++) {
    for (var j=0; j<steps; j++) {
      vertbuf.push(i*df);
      vertbuf.push(j*df);
    }
  }
  
  vertbuf = new Float32Array(vertbuf);

  var edgebuf = []
  var u = 1.0 / (steps-1);
  for (var i=0; i<steps; i++) {
    edgebuf.push(1.0);
    edgebuf.push(i*u);
  }
  
  var idxbuf = []
  for (var i=0; i<steps-1; i++) {
    for (var j=0; j<steps-1; j++) {
      idxbuf.push(j*steps + i); idxbuf.push((j+1)*steps + i); idxbuf.push((j+1)*steps+i+1);
      idxbuf.push(j*steps+i); idxbuf.push((j+1)*steps+i+1); idxbuf.push(j*steps+i+1);
    }
  }
  themesh.render.numIndices = idxbuf.length;
  idxbuf = new Uint16Array(idxbuf);
  
  themesh.render.vertbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, themesh.render.vertbuf);
  gl.bufferData(gl.ARRAY_BUFFER, vertbuf, gl.STATIC_DRAW);

  edgebuf = new Float32Array(edgebuf);
  themesh.render.edgebuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, themesh.render.edgebuf);
  gl.bufferData(gl.ARRAY_BUFFER, edgebuf, gl.STATIC_DRAW);
  
  themesh.render.indexbuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, themesh.render.indexbuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxbuf, gl.STATIC_DRAW);
  
  themesh.render.ss_steps = steps;
  themesh.render.ss_tex_size = data_size;
  
  themesh.render.ss_program = new ShaderProgram(
          gl,
          // The ids of the vertex and fragment shaders
          "ss_vshader", "fshader",
          // The vertex attribute names used by the shaders.
          // The order they appear here corresponds to their index
          // used later.
          [ "vPosition"]
          );
  
  gl.activeTexture(gl.TEXTURE1);
  var utiltex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, utiltex);
  
  
  /*format of util tex:
    
    0-64: lookup table for integer shift operation
       [mul_part_1, mul_part_2],...
    use by multiplying by part 1 and part 2
    64-35: float precision information
      precision
      rangemin
      rangemax
  */
  
  var data = new Uint8Array(new ArrayBuffer(67))
  for (var i=0; i<32; i++) {
    if (i < 8) {
      data[i*2] = 1<<(i);
      data[i*2+1] = 1;
    } else {
      data[i*2] = 128;
      data[i*2+1] = 1<<(i-7);
    }
  }
  
  /*float precision information*/
  var float_prec = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  //console.log("float precision:", float_prec.precision, float_prec.rangeMin, float_prec.rangeMax)

  data[64] = float_prec.precision;
  data[65] = float_prec.rangeMin;
  data[66] = float_prec.rangeMax;
    
  /*upload util texture*/
  var util_w = data.length;
  data = new Uint8Array(data);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, data.length, 1,
                0, gl.ALPHA, gl.UNSIGNED_BYTE, data);
  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
  themesh.render.util_tex = utiltex;
  
  return themesh;
}

function subsurf_render(gl, view3d, ss_mesh, mesh, drawmats, draw_overlay, draw_elements)
{
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);

  var program = ss_mesh.render.ss_program
  set_program(gl, program, drawmats);
  
  function bind_sstext(ssprogram) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, ss_mesh.render.util_tex);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ss_mesh.render.ss_tex);
    
    gl.uniform1i(ssprogram.uniformloc(gl, "sampler2d"), 0);
    gl.uniform1i(ssprogram.uniformloc(gl, "util_sampler2d"), 1);
    gl.uniform1f(ssprogram.uniformloc(gl,  "steps"), ss_mesh.render.ss_steps);
    gl.uniform1f(ssprogram.uniformloc(gl, "data_size"), ss_mesh.render.ss_tex_size);
  }
  
  bind_sstext(program);
  
  set_light_uniform(gl, program, drawmats);
  
  var act = mesh.faces.highlight;
  set_highlight_uniforms(gl, act, program);
  
  gl.disableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);
  gl.disableVertexAttribArray(4);
  
  gl.enableVertexAttribArray(0);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, ss_mesh.render.vertbuf);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(1, 1);

  // Bind the index array
  var i = 0;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ss_mesh.render.indexbuf);
  
  var clr = (view3d.ctx.object.flag & SELECT) ? face_sel_color : face_unsel_color;
  for (var f in ss_mesh.faces) {
    if (draw_elements)
      clr = get_element_color(f.old_face, mesh.faces.highlight, true, true);
    
    gl.uniform4fv(program.uniformloc(gl, "face_color"), clr);
    gl.uniform1f(program.uniformloc(gl, "patch1"), i);
      
    gl.drawElements(gl.TRIANGLES, ss_mesh.render.numIndices, gl.UNSIGNED_SHORT, 0);
         
    i += 1;
  }
  
  gl.polygonOffset(1, 1);
  
  function draw_ss_edges(alpha_mul) {
    program = gl.ss_noshade;
    set_program(gl, program, drawmats);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, ss_mesh.render.edgebuf);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    bind_sstext(program);
    set_light_uniform(gl, program, drawmats);
    
    var act = mesh.faces.highlight;
    set_highlight_uniforms(gl, act, program);
    
    gl.uniform1f(program.uniformloc(gl, "alpha_mul"), alpha_mul);
    
    /*draw curved edges*/
    i = 0;
    for (var f in ss_mesh.faces) {
      if (f.old_edge == undefined) {
        var clr = [0.0, 0.0, 0.0, 1.0];
        continue;
      } else {
        var clr = get_element_color(f.old_edge, mesh.edges.highlight, false, true);
      }
      
      gl.uniform4fv(program.uniformloc(gl, "face_color"), clr);
      gl.uniform1f(program.uniformloc(gl, "patch1"), i);
        
      gl.drawArrays(gl.LINE_STRIP, 0, ss_mesh.render.ss_steps);
      i += 1;
    }
  }
  
  if (!draw_elements)
    return;
  
  draw_ss_edges(1.0);
  
  //draw vertices and face centers
  render_mesh_elements(gl, view3d, mesh, drawmats, 1.0, false);

  if (draw_overlay) {
    gl_blend_func(gl);

    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    
    draw_ss_edges(0.3);
    
    render_mesh_elements(gl, view3d, mesh, drawmats, 0.3, false);
    
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
  }
}


function subsurf_selbuf_render(gl, ss_mesh, mesh, drawmats, typemask)
{
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);

  var program = gl.selbuf_ss;
  set_program(gl, program, drawmats);
  
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, ss_mesh.render.util_tex);
  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ss_mesh.render.ss_tex);
  
  gl.uniform1i(program.uniformloc(gl, "sampler2d"), 0);
  gl.uniform1i(program.uniformloc(gl, "util_sampler2d"), 1);
  gl.uniform1f(program.uniformloc(gl, "steps"), ss_mesh.render.ss_steps);
  gl.uniform1f(program.uniformloc(gl, "data_size"), ss_mesh.render.ss_tex_size);
  
  set_light_uniform(gl, program, drawmats);
  
  var act = mesh.faces.highlight;
  set_highlight_uniforms(gl, act, program);
  
  gl.disableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);
  gl.disableVertexAttribArray(4);
  
  gl.enableVertexAttribArray(0);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, ss_mesh.render.vertbuf);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.enable(gl.BLEND);
  gl.disable(gl.DITHER);
  
  gl.blendFunc(gl.ONE, gl.ZERO);
  gl.polygonOffset(1, 1);

  // Bind the index array
  var i = 0;
  var clr = new Array(4);
  
  if (typemask & MeshTypes.FACE) {
    for (var f in ss_mesh.faces) {
      pack_index(f.old_face.sid+1, clr, 0);
      
      gl.uniform4fv(program.uniformloc(gl, "face_color"), clr);
      gl.uniform1f(program.uniformloc(gl, "patch1"), i);
        
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ss_mesh.render.indexbuf);
      gl.drawElements(gl.TRIANGLES, ss_mesh.render.numIndices, gl.UNSIGNED_SHORT, 0);
           
      i += 1;
    }
  }
  
  gl.bindBuffer(gl.ARRAY_BUFFER, ss_mesh.render.edgebuf);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  
  gl.polygonOffset(1, 1);
 
  /*draw curved edges*/
  if (typemask & MeshTypes.EDGE) {
    i = 0;
    for (var f in ss_mesh.faces) {
      if (f.old_edge == undefined)
        continue;
      
      pack_index(f.old_edge.sid+1, clr, 0);
      
      gl.uniform4fv(program.uniformloc(gl, "face_color"), clr);
      gl.uniform1f(program.uniformloc(gl, "patch1"), i);
        
      gl.drawArrays(gl.LINE_STRIP, 0, ss_mesh.render.ss_steps);
      i++;
    }
  }
  
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);
  
  set_program(gl, gl.selbuf, drawmats);
  
  if (typemask & MeshTypes.VERT) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vertbuf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.render.vselbuf);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.POINTS, 0, mesh.verts.length);
  }
  
  gl.disableVertexAttribArray(0);
  gl.disableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(3);
  
  gl.enable(gl.DITHER);
}

function destroy_subsurf_mesh(gl, ss_mesh)
{
  if (ss_mesh == undefined) {
    console.trace();
    return;
  }
  
  ss_mesh.render.destroy();
  gl.deleteTexture(ss_mesh.render.ss_tex);
  gl.deleteTexture(ss_mesh.render.util_tex);
}
