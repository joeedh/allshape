"use strict";

#include "src/core/utildefine.js"

function e_hash(v1, v2)
{
  return Math.min(v1.eid, v2.eid)*40000000 + Math.max(v1.eid, v2.eid);
}

function hash_tri(v1, v2, v3) {
  var arr = [v1.eid, v2.eid, v3.eid];
  arr.sort();
  
  return arr[0].toString() + "|" + arr[1].toString() + "|" + arr[2].toString();

}

class _PSort {
  constructor(co, v, axis) {
    this.co = co;
    this.v = v;
    this.axis = axis;
  }
}

class TessCDT {
  constructor() {
  }

  add_vert(v, vset, verts) {
    if (!vset.has(v)) {
      verts.push(v);
      vset.add(v);
    }
  }
  
  find_outer_verts(edges, estart, eend) {
    var add_vert = this.add_vert;

    //simple array caching scheme
    static _rets = [new GArray(), new GArray(), new GArray(), new GArray()];
    static _cur_ret=0;
    
    var verts = _rets[_cur_ret];
    _cur_ret = (_cur_ret+1)%_rets.length;
    
    verts.reset();
    
    var vset = new set();
    for (var i=estart; i<eend; i++) {
      var e = edges[i];
      var count = 0;
      
      for (var f in e.faces) { 
        if (f.index == -2) {
          count += 1;
        }
      }
      
      //XXX
      if (1) { //count <= 1) {
        add_vert(e.v1, vset, verts);
        add_vert(e.v2, vset, verts);
      }
    }

    return verts;
  }

  PSortCmp(a, b) {
    var ax = a.axis;
    var ax2 = (ax+1)%2;
    
    if (Math.abs(a.co[ax]-b.co[ax]) < feps*200)
      return (a.co[ax2] < b.co[ax2]) ? 1 : -1;
    return (a.co[ax] > b.co[ax]) ? 1 : -1;
  }
  
  reset() {
    this.edge_hash = {};
    this.tri_hash = {};
    this.cedge_hash = {};
  }
  
  axis_sort(lst, start, end, axis) {
    static l2 = new GArray();
    static max_l2 = 0;
    
    l2.reset();
        
    for (var i=start; i<end; i++) {
      var v = lst[i];
      var sort;
      
      if (i-start < max_l2) {
        sort = l2[i-start];
        
        sort.v = v;
        sort.co.load(v.co);
        sort.axis = axis;
      } else {
        sort = new _PSort(new Vector3(v.co), v, axis);
      }
      
      l2.push(sort);
    }
    
    var max_l2 = Math.max(l2.length, Math.min(max_l2, 50));
    l2.sort(this.PSortCmp);
    var j;

    for (var i=start, j=0; i<end; i++, j++) {
      lst[i] = l2[j].v;
      
      l2[j].v = undefined; //prevent hanging reference
    }
  }

  scanfill_add_edge(m, v1, v2, edges) {
    var add = false;
    
    if (!(e_hash(v1, v2) in this.edge_hash)) {
      add = true;
    }
    
    var ret = this.scanfill_ensure_edge(m, v1, v2);
    edges.push(ret);
    
    if (add) {
      this.qtree.add_line(ret.v1.co, ret.v2.co, ret.eid);
    }
    
    return ret;
  }
  
  scanfill_ensure_edge(m, v1, v2) {
    var e = this.edge_hash[e_hash(v1, v2)]
    
    if (e == undefined) {
      e = m.make_edge(v1, v2, true);
      this.edge_hash[e_hash(v1, v2)] = e;
    }
    
    return e;
  }

  make_tri_add_edges(m, v1, v2, v3, eret) {
    this.tri_counter++;
    
    var hash = hash_tri(v1, v2, v3);
    if (hash in this.tri_hash)
      return undefined;
    
    f = m.make_face(new GArray([v1, v2, v3]), false); //true);
    this.tri_hash[hash] = f;
    
    for (var e in f.edges) {
      if (!(e_hash(e.v1, e.v2) in this.edge_hash))
        eret.push(e);
      
      this.edge_hash[e_hash(e.v1, e.v2)] = e;
    }
    
    return f;
  }
  
  make_tri_if_not_exists(m, v1, v2, v3) {
    this.tri_counter++;
    
    var hash = hash_tri(v1, v2, v3);
    if (hash in this.tri_hash)
      return undefined;
    
    f = m.make_face(new GArray([v1, v2, v3]), false); //true);
    this.tri_hash[hash] = f;
    
    for (var e in f.edges) {
      this.edge_hash[e_hash(e.v1, e.v2)] = e;
    }
    
    return f;
  }
  
  make_tri(m, v1, v2, v3) {
    this.tri_counter++;
    
    var hash = hash_tri(v1, v2, v3);
    var f = this.tri_hash[hash];
    
    if (f != undefined)
      return f;
    
    f = m.make_face(new GArray([v1, v2, v3]), false); //true);
    this.tri_hash[hash] = f;
    
    for (var e in f.edges) {
      this.edge_hash[e_hash(e.v1, e.v2)] = e;
    }
    
    return f;
  }

  scanfill_kill_face(m, f) {
    if (f.totvert == 3) {
      var v1 = f.looplists[0].loop.v;
      var v2 = f.looplists[0].loop.next.v;
      var v3 = f.looplists[0].loop.next.next.v;
      
      var hash = hash_tri(v1, v2, v3);
      delete this.tri_hash[hash];
    }
    
    m.kill_face(f);
  }

  minmax_verts(verts, start, end) {
    var min = new Vector3([1e12, 1e12, 1e12]);
    var max = new Vector3([-1e12, -1e12, -1e12]);
    
    for (var i=start; i<end; i++) {
      var v = verts[i];
      
      for (var j=0; j<3; j++) {
        min[j] = Math.min(min[j], v.co[j]);
        max[j] = Math.max(max[j], v.co[j]);
      }
    }
    
    return [min, max];
  }

  scanfill_kill_edge(m, e)
  {
    var hash = e_hash(e.v1, e.v2);
    if (this.edge_hash[hash] == undefined) return;
    
    delete this.edge_hash[hash];
    
    if (e.loop != null) {
      var l, l2, lfirst, lastl;
      l = lfirst = lastl = e.loop;
      do {
        l2 = l.radial_next;
        this.scanfill_kill_face(m, l.f);
        
        lastl = l;
        l = l2;    
      } while (l != lfirst && l != lastl);
    }
    
    m.kill_edge(e);
  }

  scanfill_find_edge(v1, v2) {
    var hash = e_hash(v1, v2);
    
    if (!(hash in this.edge_hash))
      return undefined;
      
    return this.edge_hash[hash];
  }

  isect_new_edge_and_tris(v1, v2, edges, tris, check_constrained=false) {
    var i = 0;
    static vs = [0, 0, 0];

    for (var e in edges) {
      if (e.vert_in_edge(v1) && e.vert_in_edge(v2))
        continue;
      if (!check_constrained && e.index == -2) //don't check constrained edges at this point
        continue;
        
      if (this.mesh_edge_isect(v1, v2, e.v1, e.v2))
        return e;
      i++;
    }
    
    if (tris != undefined) {
      for (var t in tris) {
        var l = t.looplists[0].loop;
        vs[0] = l.v; vs[1] = l.next.v; vs[2] = l.next.next.v;

        if (vs.indexOf(v1) < 0 && point_in_tri(v1.co, vs[0].co, vs[1].co, vs[2].co))
          return t;

        if (vs.indexOf(v2) < 0 && point_in_tri(v2.co, vs[0].co, vs[1].co, vs[2].co))
          return t;
      }
    }

    return false;
  }

  mesh_edge_isect(v1, v2, v3, v4) {
    /*ensure we're not checking edges that share vertices,
      except for the one case where they can intersect*/
    if (v3 == v1 || v3 == v2) {
      var v11, v22;
      if (v3 == v1) {
        v11 = v1;
        v22 = v2;
      } else {
        v11 = v2;
        v22 = v1;
      }
    
      if (Vector3.normalizedDot4(v11.co, v22.co, v3.co, v4.co) < 1.0-feps*15
          || !colinear(v1.co, v2.co, v4.co)) 
      {
        return false;
      }
    }
    
    if (v4 == v1 || v4 == v2) {
      var v11, v22;
      if (v4 == v1) {
        v11 = v1;
        v22 = v2;
      } else {
        v11 = v2;
        v22 = v1;
      }
      
      if (Vector3.normalizedDot4(v11.co, v22.co, v4.co, v3.co) < 1.0-feps*15
          || !colinear(v1.co, v2.co, v3.co)) 
      {
        return false;
      }
    }
    
    if (v1 == undefined || v2 == undefined)
      console.trace("error in .mesh_edge_isect");
    
    if (line_line_cross([v1.co, v2.co], [v3.co, v4.co]))
        return true;
    
    return false;
  }
  
  make_tris_in_vert(m, vert, tret) {
    static n1 = new Vector3(), n2 = new Vector3(), zero = new Vector3().zero();
    static ax = new Vector3(), ax2 = new Vector3();
    
    var ret = new GArray();
    ax.zero(); ax[1] = 1.0;
    
    ax2.load(ax).negate();
    
    static edges = new GArray(), max_edges_len = 0;
    edges.reset();
    
    var sum = 0.0;
    var first = undefined;
    
    var i = 0;
    for (var e in vert.edges) {
      n1.load(e.other_vert(vert).co).sub(vert.co).normalize();
      var ang = (n1.dot(ax));
      
      ang = Math.acos(ang);
      if (winding(ax, n1, ax2)) {
        ang = Math.PI*2.0-ang;
      }
      
      if (edges.length >= max_edges_len) {
        edges.push([ang, e]);
      } else {
        edges[i][0] = ang;
        edges[i][1] = e;
        
        edges.push(edges[i]);
      }
      
      i++;
    }
    
    max_edges_len = Math.max(edges.length, max_edges_len);
    
    function ESortCmp(a, b) {
      if (a[0] < b[0])
        return -1;
      else if (a[0] > b[0])
        return 1;
      else return 0;
    }
    
    edges.sort(ESortCmp);
    
    for (var i=0; i<edges.length; i++) {
      var e1 = edges[i][1];
      var e2 = edges[(i+1)%edges.length][1];
      
      n1.load(e1.other_vert(vert).co).sub(vert.co).normalize();
      n2.load(e2.other_vert(vert).co).sub(vert.co).normalize();
      
      var ang = n1.dot(n2);    
      sum += Math.acos(ang);
    }
    
    var skip_last = Math.abs(Math.PI*2 - sum) > 0.0;
    var tote = 0;
    
    for (var i=0; i<edges.length-1; i++) {
      var e1 = edges[i][1];
      var e2 = edges[(i+1)%edges.length][1];
      
      if (Math.abs(edges[i][0] - edges[(i+1)%edges.length][0]) > Math.PI)
        continue;
      
      if (i == edges.length-1 && skip_last)
        break;
      
      if (e1.totface >= 2 || e2.totface >= 2) continue;
      
      var e3 = this.scanfill_find_edge(e1.other_vert(vert), e2.other_vert(vert));
      
      if (e3 != null && !colinear(vert.co, e1.other_vert(vert).co, e2.other_vert(vert).co)) {
        var f = this.make_tri_if_not_exists(m, vert, e1.other_vert(vert), e2.other_vert(vert));
        
        if (f != undefined)
          tret.push(f);
      }
    }
    
    return ret;
  }
  
  scanfill(m, loops, points, start=0, end=points.length, eret=new GArray(), tret=new GArray(), depth=0) {
    var ret_tote=0, ret_tott=0;
    
    if (depth==undefined || depth == 0) {
      this.edge_hash = {};
      this.tri_hash = {};
      this.cedge_hash = {};
      
      for (var e in m.edges) {
        //this.edge_hash[e_hash(e.v1, e.v2)] = e;
      }
      
      depth = 0;
      this.axis_sort(points, start, end, 0);

      m.edges.index_update();
      
      var mm = new MinMax(3);
      for (var p in points) {
        mm.minmax(p.co);
      }
      
      this.min = mm.min;
      this.max = mm.max;
      
      this.qtree = new QuadTree();
      this.qtree.gen_root(this.min, this.max);
     }
      
     var plen = end - start;
     if (plen == 3) {
      var v1=points[start]; var v2=points[start+1]; var v3 = points[start+2];

      if (colinear(v1.co, v2.co, v3.co)) {
        var e1 = this.scanfill_add_edge(m, v1, v2, eret);
        var e2 = this.scanfill_add_edge(m, v2, v3, eret);
        
        e1.index = -1; e2.index = -1;
        
        ret_tote += 2;
        
        return;
      }

      var e1 = this.scanfill_add_edge(m, v1, v2, eret);
      var e2 = this.scanfill_add_edge(m, v2, v3, eret);
      var e3 = this.scanfill_add_edge(m, v3, v1, eret);

      e1.index = e2.index = e3.index = -1;
      ret_tote += 3;

      var tri = this.make_tri_add_edges(m, v1, v2, v3, eret);
      if (tri != null) {
        tret.push(tri);
        tri.index = -2;
        
        tret.push(tri);
        return;
      }

      return;
    } else if (plen == 2) {
      var e = this.scanfill_add_edge(m, points[start], points[start+1], eret);

      e.index = -1;
      ret_tote++;

      return;
    } else if (end-start > 3) {
      var mid = Math.floor((start+end)*0.5);

      var starte1 = eret.length, startt1 = tret.length;
      this.scanfill(m, loops, points, start, mid, eret, tret, depth+1);
      
      var starte2 = eret.length, startt2 = tret.length;
      this.scanfill(m, loops, points, mid, end, eret, tret, depth+1);
      
      ret_tote = eret.length - starte1;
      ret_tott = tret.length - startt1;
      
      var o1 = this.find_outer_verts(eret, starte1, starte2);
      var o2 = this.find_outer_verts(eret, starte2, eret.length);
      
      this.axis_sort(o1, 0, o1.length, 1);
      this.axis_sort(o2, 0, o2.length, 1);
      
      for (var i=0; i<o1.length; i++) {
        for (var j=0; j<o2.length; j++) {
          if (o1[i] == o2[j]) continue;

          var isec = this.isect_new_edge_and_tris(o1[i], o2[j], eret, tret);
          if (isec == false) {
            var e = this.scanfill_add_edge(m, o1[i], o2[j], eret);
            e.index = -1;
          }
        }
      }
    }

    if (depth == 0) { //generate final triangles and return result 
      for (var e in eret) {
        this.make_tris_in_vert(m, e.v1, tret);
        this.make_tris_in_vert(m, e.v2, tret);
      }
      
      return [tret, eret];
    }
  }

  face_fill(f, looptris) {
    static _tri_f_f_static_axis = new Vector3();
    static _tri_f_f_static_scale = new Vector3();
    static _tri_f_f_static_rvec = new Vector3();
    static _tri_f_f_static_co = new Vector3();
    static _tri_f_f_static_cross = new Vector3();
    static _tri_f_last_ms = 0;
      
    this.reset();
    
    global seedrand;
    if (seedrand == undefined)
      seedrand = new StupidRandom()
      
    var points = new GArray();
    var orig = new GArray();
    var tmesh = new Mesh()
    var ls = new GArray();
    
    var axis = _tri_f_f_static_axis.zero();
    var cross = _tri_f_f_static_cross.zero();
    
    var i = 0;  
    var rvec = _tri_f_f_static_rvec.zero();
    var co = _tri_f_f_static_co.zero();
    
    axis.zero();
    axis[2] = 1.0;
    
    cross.load(f.no).cross(axis).normalize();
    
    var sign = axis.dot(f.no) > 0.0 ? 1.0 : -1.0;
    var angle = Math.acos(f.no.dot(axis)); //Math.abs(Math.acos(f.no.dot(axis)));
    
    var q = new Quat()
    q.axisAngleToQuat(cross, angle);
    var mat = q.toMatrix();
    
    var mm = new MinMax(3);
    
    var totvert=0;
    for (var v in f.verts) {
      mm.minmax(v.co);
      totvert++;
    }
    
    var randsize = new Vector3(mm.max).sub(mm.min);
    randsize.divScalar(Math.max(totvert*2.0, 100.0));
    randsize.max(Vector3.temp_xyz(0.02, 0.02, 0.02));
    
    for (var v in f.verts) {
      var v2 = tmesh.make_vert(new Vector3(v.co), new Vector3(v.no));
      v2.flag = v.flag
      
      co.load(v.co);
      co.sub(f.center);
      co.multVecMatrix(mat);
      co.add(f.center);
      
      v2.co[0] = co[0];
      v2.co[1] = co[1];
      v2.co[2] = co[2];
      
      seedrand.seed(v.eid);
      for (var j=0; j<3; j++) {
        rvec[j] = (seedrand.random()-0.5)*randsize[j]; //feps*20000000;
      }
      
      v2.co.add(rvec);
      v2.co[2] = 0.0;
      
      //it's a temp variable, so we can use its eid to store an index
      v2.eid = i;
      v.index = i;
      
      points.push(v2);
      orig.push(v);
      i++;
    }
    
    var loops = new GArray();
    for (var loop in f.looplists) {
      var loop2 = new GArray();
      loops.push(loop2);
      
      
      for (var l in loop) {
        loop2.push(points[l.v.index]);
        ls.push(l);
      }
      
      if (sign == 1) loop2.reverse();
    
      var tri_counter = 0;
      var ret = 0;
      
      ret = this.scanfill(tmesh, loops, points);
      //ret = delauney_flip(tmesh, loops, ret[0], ret[1]);
      //ret = constrain_delauney(tmesh, loops, ret[0], ret[1]);
      //ret = cut_holes(tmesh, loops, ret[0], ret[1]);
      
      var ls2 = [0, 0, 0];
      for (var t1 in ret[0]) {
        if (t1 == undefined || t1.type != MeshTypes.FACE) continue;
        
        var l = t1.looplists[0].loop;
        
        var vs = [l.v, l.next.v, l.next.next.v]
        var es = [l.e, l.next.e, l.next.next.e]
        
        //ensure normals are correct      
        for (var i=0; i<vs.length; i++) {
          ls2[i] = ls[vs[i].eid];
          
          vs[i] = orig[vs[i].eid];
        }
        
        var n = normal_tri(vs[0].co, vs[1].co, vs[2].co);
        if (n.dot(f.no) < 0) {
          ls2.reverse();
        }
        
        for (var i=0; i<ls2.length; i++) {
          looptris.push(ls2[i]);
        }
      }
    
      return tmesh;
    }
  }
}

//override triangulate.js implementation
//XXX disabled
function _face_fill(f, looptris) {
  static tess = new TessCDT();
  
  tess.reset();
  return tess.face_fill(f, looptris);
}

function test_face_fill() {
  var mesh1 = new Context().mesh;
  var tess = new TessCDT();
  
  var eid = mesh1.faces[Symbol.iterator]().next().value.eid; //2681;
  var mesh2 = tess.face_fill(mesh1.faces.get(eid), new GArray());
    
  mesh2.render = new render();
  mesh2.render.vertprogram = mesh1.render.vertprogram;
  mesh2.render.drawprogram = mesh1.render.drawprogram;
  mesh2.render.recalc = MeshRecalcFlags.REGEN_TESS|MeshRecalcFlags.REGEN_COLORS|MeshRecalcFlags.REGEN_NORS|MeshRecalcFlags.REGEN_COS;
  mesh2.api.recalc_normals();
  
  return [tess, mesh2];
}