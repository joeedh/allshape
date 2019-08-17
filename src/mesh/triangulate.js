"use strict";

#ifdef USE_THREADS
#define THREAD_YIELD yield;
#else
#define THREAD_YIELD
#endif

#ifdef USE_THREADS
function face_fill_threads(f, looptris) {
#else
//XXX
function face_fill(f, looptris) {
#endif
  var eps = 2.22e-16; //something between the 32 && 64 bit epsilons should work nicely

  var edge_hash = {}
  var cedge_hash = {}

  function PSort(co, v, axis) {
    this.co = co;
    this.v = v;
    this.axis = axis;
  }

  function PSortCmp(a, b) {
    var ax = a.axis;
    var ax2 = (ax+1)%2;
    
    if (Math.abs(a.co[ax]-b.co[ax]) < feps*200)
        return (a.co[ax2] < b.co[ax2]) ? 1 : -1;
    return (a.co[ax] > b.co[ax]) ? 1 : -1;
  }

  function axis_sort(lst, axis) {
      var l2 = new GArray();
      
      for (var v of lst) {
        l2.push(new PSort(new Vector3(v.co), v, axis));
      }
      
      //sort_list(l2, PSortCmp);
      l2.sort(PSortCmp);
        
      for (var i =0; i<lst.length; i++) {
        lst[i] = l2[i].v;
      }
  }
      
  function add_vert(v, vset, verts) {
    if (!vset.has(v)) {
      verts.push(v);
      vset.add(v);
    }
  }

  function find_outer_verts(tris, edges) {
    var verts = new GArray();
    var vset = new set();
    
    for (var e of edges) {
      var count = 0;
      for (var f of e.faces) {
        if (f.index == -2) {
           count += 1;
        }
      }
      
      if (count <= 1) {
          add_vert(e.v1, vset, verts);
          add_vert(e.v2, vset, verts);
      }
    }

    return verts;
  }

  function hash_tri(v1, v2, v3) {
    var arr = [v1.eid, v2.eid, v3.eid];
    arr.sort();
    
    return arr[0].toString() + "|" + arr[1].toString() + "|" + arr[2].toString();

  }

  var tri_hash = {}

  var tri_counter = 0;
  function make_tri(m, v1, v2, v3) {
    tri_counter++;
    
    var hash = hash_tri(v1, v2, v3);
    var f = tri_hash[hash];
    
    if (f != undefined)
      return f;
    
    f = m.make_face(new GArray([v1, v2, v3]), false); //true);
    tri_hash[hash] = f;
    
    for (var e of f.edges) {
      edge_hash[e_hash(e.v1, e.v2)] = e;
    }
    
    return f;
  }

  function make_tri_safe(m, v1, v2, v3, edges, tris) { //tris is optional
    
    if (v1 == undefined || v2 == undefined || v3 == undefined) return null;
    
    if (v1 != v2 && v1 != v3 && v2 != v1 && v2 != v3) {
      var es1 = [[v1, v2], [v2, v3], [v3, v1]];
      
      for (var i=0; i<3; i++) {
        if (isect_new_edge_and_tris(es1[i][0], es1[i][1], edges, undefined, true) != false) {
          return null;
        }
      }
      
      var f = make_tri(m, v1, v2, v3);
      if (f == undefined || f == null)
        return null;
        
      for (var e of f.edges) {
        edges.add(e);
      }
      
      if (tris != undefined && f != undefined)
        tris.add(f);
      return f;
    } else {
      console.log("could not make tri")
      console.trace();
    }
  }
  function scanfill_kill_face(m, f) {
    if (f.totvert == 3) {
      var v1 = f.looplists[0].loop.v;
      var v2 = f.looplists[0].loop.next.v;
      var v3 = f.looplists[0].loop.next.next.v;
      
      var hash = hash_tri(v1, v2, v3);
      delete tri_hash[hash];
    }
    
    m.kill_face(f);
  }

  function mesh_edge_isect(v1, v2, v3, v4) {
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
      console.trace()
    
    if (line_line_cross([v1.co, v2.co], [v3.co, v4.co]))
        return true;
    
    return false;
  }

  var _isney_n1 = new Vector3();
  function isect_new_edge_and_tris(v1, v2, edges, tris, check_constrained) {
    if (check_constrained == undefined)
      check_constrained = false;
    
      var i = 0;
      for (var e of edges) { //.query(v1.co, v2.co)) {
        if (e.vert_in_edge(v1) && e.vert_in_edge(v2))
          continue;
      
        if (!check_constrained && e.index == -2) //don't check constrained edges at this point
          continue;
          
        if (mesh_edge_isect(v1, v2, e.v1, e.v2))
          return e;
          
        i++;
      }
      
      if (tris != undefined) {
        for (var t of tris) { //.query(v1.co, v2.co)) {
            var vs = list(t.verts);
            var t1 = vs[0]; var t2 = vs[1]; var t3 = vs[2];
            
            if (!vs.indexOf(v1) < 0 && point_in_tri(v1.co, t1.co, t2.co, t3.co))
                return t;
                
            if (vs.indexOf(v2) < 0 && point_in_tri(v2.co, t1.co, t2.co, t3.co))
                return t;
        }
      }
      
      return false;
  }

  function find_edge(v1, v2) {
      for (var e of v1.edges) {
        if (e.other_vert(v1) == v2)
              return e;
      }
      
      return null;
  }

  function scanfill_find_edge(v1, v2) {
    /*
    for (var e1 of v1.edges) {
      if (e1.other_vert(v1) == v2)
        return e1;
    }
    
    return null;
    */
    
    var ret = edge_hash[e_hash(v1, v2)]
    if (ret == undefined)
      return null;
    return ret;
  }

  function isect_point_in_tris(v1, tris) {
    //console.log("returned tris: " + list(tris.query(v1.co, v1.co)).length + ", " + tris.length)
    
    for (var t of tris) { //.query(v1.co, v1.co)) {
      var skip = false;
      for (var v2 of t.verts) {
        if (v1 == v2) {
          skip = true;
          break;
        }
      }
      
      if (skip) continue;
      var vs = list(t.verts)
      
      if (point_in_tri(v1.co, vs[0].co, vs[1].co, vs[2].co))
        return true;
    }
    
    return false;
  }

  var nt_min = new Vector3()
  var nt_max = new Vector3()

  function isect_new_tri(v1, v2, v3, tris) {
    var vset = new set();
    
    for (var i=0; i<3; i++) {
      nt_min[i] = v1.co[i];
      nt_max[i] = v1.co[i];
    }
    
    for (var i=0; i<3; i++) {
      nt_min[i] = Math.min(nt_min[i], v1.co[i]); nt_min[i] = Math.min(nt_min[i], v2.co[i]);
      nt_min[i] = Math.min(nt_min[i], v3.co[i]);

      nt_max[i] = Math.max(nt_max[i], v1.co[i]); nt_max[i] = Math.max(nt_max[i], v2.co[i]);
      nt_max[i] = Math.max(nt_max[i], v3.co[i]);
    }
    
    for (var t of tris) { //.query(nt_min, nt_max)) {
      for (var v of t.verts) {
        vset.add(v);
      }
    }
    
    for (var v of vset) {
      if (point_in_tri(v.co, v1.co, v2.co, v3.co))
        return true;
    }
    
    return false;
  }

  function isect_new_tri_old(v1, v2, v3, edges) {
      var l = [v1, v2, v3];
      for (var e of edges) {
          if (!l.has(e.v1) && point_in_tri(e.v1.co, v1.co, v2.co, v3.co)) {
              return true;
          }
          if (!l.has(e.v2) && point_in_tri(e.v2.co, v1.co, v2.co, v3.co)) {
            return true;
          }
          if (!l.has(e.v1) && !l.has(e.v2) && point_in_tri((new Vector3(e.v1.co).add(e.v2.co)).mulScalar(0.5), v1.co, v2.co, v3.co)) {
              return true;
          }
      }
      return false
  }

  function sf_elist(edges) {
    var ret = new GArray();
    
    for (var e of edges) {
      if (e.index == -2)
        continue;
        
      ret.push(e);
    }
    
    return ret;
  }

  var _ftiv_static_ax1 = new Vector3();
  var _ftiv_static_ax2 = new Vector3();
  var _ftiv_static_n1 = new Vector3();
  var _ftiv_static_n2 = new Vector3();
  var _ftiv_static_zero = new Vector3();
  function find_tri_in_vert(vert, tsh) {
    var ret = new GArray();
    var ax = _ftiv_static_ax1;
    ax.zero(); ax[1] = 1.0;
    
    var ax2 = _ftiv_static_ax2.load(ax).negate();
    
    var n1 = _ftiv_static_n1;
    var n2 = _ftiv_static_n2;
    var zero = _ftiv_static_zero.zero();
    var edges = [];
    var sum = 0.0;
    var first = undefined;
    
    for (var e of vert.edges) {
      n1.load(e.other_vert(vert).co).sub(vert.co).normalize();
      var ang = (n1.dot(ax));
      
      ang = Math.acos(ang);
      if (winding(ax, n1, ax2)) {
        ang = Math.PI*2.0-ang;
      }
      
      edges.push([ang, e]);
    }
    
    function ESortCmp(a, b) {
      if (a[0] < b[0])
        return -1;
      else if (a[0] > b[0])
        return 1;
      else return 0;
    }
    
    edges.sort(ESortCmp);
    /*
    for (var i=0; i<edges.length; i++) {
      for (var j=0; j<edges.length-1; j++) {
        if (ESortCmp(edges[j], edges[j+1]) > 0) {
          var t = edges[j];
          edges[j] = edges[j+1];
          edges[j+1] = t;
        }
      }
    }
    */
    //console.log(edges.toString())
    
    for (var i=0; i<edges.length; i++) {
      var e1 = edges[i][1];
      var e2 = edges[(i+1)%edges.length][1];
      
      n1.load(e1.other_vert(vert).co).sub(vert.co).normalize();
      n2.load(e2.other_vert(vert).co).sub(vert.co).normalize();
      
      var ang = n1.dot(n2);    
      sum += Math.acos(ang);
    }
    
    //console.log("sum", sum);
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
      
      var e3 = scanfill_find_edge(e1.other_vert(vert), e2.other_vert(vert));
      
      if (e3 != null)
        ret.push([vert, e1.other_vert(vert), e2.other_vert(vert)]);
    }
    
    return ret;
  }

  function find_tri(edge, tsh)
  {
    var ret1 = find_tri_in_vert(edge.v1, tsh);
    ret1.concat(find_tri_in_vert(edge.v2, tsh));
    return ret1; //new GArray(ret1.concat(find_tri_in_vert(edge.v2, tsh)));
  }

  function find_tri2(edge, tsh) {
      var matches = new GArray();
      
      if (edge.index == -2)
        return matches;
      
      var i, j, k;
      
      for (var i=0; i<2; i++) {
        var v1 = i==0 ? edge.v1 : edge.v2;
        var es = sf_elist(v1.edges);
        
        for (var j=0; j<es.length; j++) {
          for (var k=0; k<es.length; k++) {
            if (j == k) continue;

            var e1 = es[j];
            var e2 = es[k];
            
            if (e1 == edge || e2 == edge) 
              continue;
            
            var e3 = scanfill_find_edge(e1.other_vert(v1), e2.other_vert(v1));
            if (e3) {
              var valid = e1.totface <= 1 && e2.totface <= 1 && e3.totface <= 1;
              //valid = valid && e1.index == -1 && e2.index == -1;
              var valid = true;
              
              var found = false;
              var vs = [v1, e1.other_vert(v1), e2.other_vert(v1)];
              if (vs[0] == vs[1] || vs[1] == vs[2] || vs[0] == vs[2])
                continue;
              
              matches.push([e1, e2, vs, valid]);
            }
          }
        }
      }
      
      var ret = new GArray();
      var minm = 0;
      
      for (var ii=0; ii<1; ii++) {
      for (var m1 of matches) {
          for (var m2 of matches) {
              for (var i=0; i<3; i++) {
                var skip1 = false, skip2=false;
                
                for (var j=0; j<3; j++) {
                  if (m1[2][i] == m2[2][j]) {
                    skip2 = true;
                    break;
                  }
                } 

                if (!skip2 && point_in_tri(m1[2][i].co, m2[2][0].co, m2[2][1].co, m2[2][2].co)) {
                    m2[3] = false;
                    //m1[3] = true;
                }
                
                /*
                for (var j=0; j<3; j++) {
                  if (m2[2][i] == m1[2][j]) {
                    skip1 = true;
                    break;
                  }
                } 

                if (!skip1 && point_in_tri(m2[2][i].co, m1[2][0].co, m1[2][1].co, m1[2][2].co)) {
                    m1[3] = false;
                    m2[3] = true;
                }*/
              }
              
              /*
              for (var i=0; i<3; i++) {
                var skip = false;
                
                for (var j=0; j<3; j++) {
                  if (m1[2][i] == m2[2][j]) {
                    skip = true;
                    break;
                  }
                } 
                if (skip) continue;
                
                if (point_in_tri(m1[2][i].co, m2[2][0].co, m2[2][1].co, m2[2][2].co)) {
                    m1[3] = false;
                    break;
                }
              }
             // */
          }
          
          for (var m1 of matches) {
                  //ensure we aren't creating more than two faces around an edge
                  for (var i=0; i<3; i++) {
                    var e = scanfill_find_edge(m1[2][i], m1[2][(i+1)%3]);
                    
                    if (e.totface >= 2) {
                      m1[3] = false;
                    }
                  }
                  
                  if (colinear(m1[2][0].co, m1[2][1].co, m1[2][2].co)) {
                      m1[3] = false;
                  }
              }    
          }
      }
      for (var m1 of matches) {
        if (m1[3])
            ret.push(m1[2]);
      }
      
      return ret;
  }

  function ensure_edge(m, v1, v2) {
      return m.make_edge(v1, v2, true);
  }

  function scanfill_ensure_edge(m, v1, v2) {
    var e = edge_hash[e_hash(v1, v2)]
    
    if (e == undefined) {
      e = m.make_edge(v1, v2, false);
      edge_hash[e_hash(v1, v2)] = e;
    }
    
    return e;
  }

  function find_replacement_edge(m, e, edges, esh, tsh) {
    var vset = new set()
    var vset2 = new set()
    var stack = new GArray([[e.v1, 0], [e.v2, 0]])
    
    var depth = 0;
    var maxdepth = 3;
    vset2.add(e.v1); vset2.add(e.v2);
    while (stack.length > 0 && depth < maxdepth) {
      var entry = stack.pop();
      
      depth = entry[1];
      var v1 = entry[0];

      vset.add(v1)
      for (var e2 of v1.edges) {
        var v2 = e2.other_vert(v1)
        if (!vset.has(v2)) {
          if (edges.has(e2)) {
            vset2.add(v2)
          }
          
          stack.push([v2, depth+1]);
        }
      }
    }
    
    var es = new GArray([])
    
    for (var v1 of vset2) { //new GArray([e.v1, e.v2])) {
      for (var v2 of vset2) {
          if (v1 == v2) continue;
          //if (scanfill_find_edge(v1, v2) != null)
          //  continue;
          
          var isec = isect_new_edge_and_tris(v1, v2, esh, tsh)
          if (isec == false) {
            var e2 = ensure_edge(m, v1, v2);
            
            es.push(e2)
            esh.add(e2)
          }
      }
    }
    //console.log(vset.length, es.length)
    if (es.length > 0) return es[0];
    
    return null;
  }

  function test_edges(m, edges, esh, tsh) {
    var edges2 = new set()
    for (var e of edges) {
      edges2.add(e);
      e.index = -1;
      esh.add(e);
    }
    
    return edges2;
    
    /*
    var edges2 = new set();
    
    for (var e of edges) {
      var isec = isect_new_edge_and_tris(e.v1, e.v2, esh, tsh)
      if (isec != false) {
        var edges3 = new set(edges)
        edges3.add(isec)
        
        var e2 = find_replacement_edge(m, e, edges3, esh, tsh);
        scanfill_kill_edge(m, e)
        
        if (e2 != null) {
          edges2.add(e2);
        } 
      } else {
          edges2.add(e)
          e.index = -1;
      }
    }
    
    for (var e of edges2) {
      esh.add(e);
    }
    
    return edges2;
    // */
  }

  function e_hash(v1, v2)
  {
    return Math.min(v1.eid, v2.eid)*40000000 + Math.max(v1.eid, v2.eid);
  }

  function scanfill_kill_edge(m, e)
  {
    if (edge_hash[e_hash(e.v1, e.v2)] == undefined) return;
    
    delete edge_hash[e_hash(e.v1, e.v2)];
    
    if (e.loop != null) {
      var l, l2, lfirst, lastl;
      l = lfirst = lastl = e.loop;
      do {
        l2 = l.radial_next;
        scanfill_kill_face(m, l.f);
        lastl = l;
        l = l2;    
      } while (l != lfirst && l != lastl);
    }
    
    m.kill_edge(e);
  }
  
  function scanfill2(m, loops, points) { //esh, tsh, depth are optional; don't set them
    function do_leaf(points) {
      var edges = new set();
      var tris = new set();
      
      if (points.length == 3) {
        var v1=points[0]; var v2=points[1]; var v3 = points[2];

        if (colinear(v1.co, v2.co, v3.co)) {
          var e1 = scanfill_ensure_edge(m, v1, v2);
          var e2 = scanfill_ensure_edge(m, v2, v3);
          //var e3 = scanfill_ensure_edge(m, v3, v1);
          var edges2 = new set(new GArray([e1, e2]));
          edges2 = test_edges(m, edges2, esh, tsh);
          
          edges = edges.union(edges2);
          
          return [new set(), edges];
        }
        
        var e1 = scanfill_ensure_edge(m, v1, v2);
        var e2 = scanfill_ensure_edge(m, v2, v3);
        var e3 = scanfill_ensure_edge(m, v3, v1);
        
        var edges2 = new set(new GArray([e1, e2, e3]));
        edges2 = test_edges(m, edges2, esh, tsh);

        edges = edges.union(edges2)
        
        if (edges2.has(e1) && edges2.has(e2) && edges2.has(e3)) {
          var tri = [v1, v2, v3];
          
          tri = make_tri(m, v1, v2, v3);
          if (tri != null) {
            tsh.add(tri);
            tri.index = -2;
          
            return [new set(new GArray([tri])), edges];
          } else {
            return [new set(), edges];
          }
        }
        
          return [new set(), edges];
        } else if (points.length == 2) {
          var e = scanfill_ensure_edge(m, points[0], points[1]);
          
          edges = edges.union(test_edges(m, new set(new GArray([e])), esh, tsh))
    
          return [new set(), edges]
        }
    }
    
    function do_push(stack, points, tris, edges) {
      stack.push([points, tris, edges]);
    }
    
    var stack = new GArray();
    
    edge_hash = {}
    for (var e of m.edges) {
      var k = e_hash(e.v1, e.v2);
      edge_hash[k] = e;
    }
    
    var esh = new set(); //new spatialhash(new GArray(), spacesize/2.0);
    var tsh = new set(); //new spatialhash(new GArray(), spacesize/30.0);
    
    axis_sort(points, 0);
    
    var p3 = new Array(3);
    var ilen = Math.floor(points.length/3);
    
    for (var i=0; i<ilen; i++) {
      p3[0] = points[i*3];
      p3[1] = points[i*3+1];
      p3[2] = points[i*3+2];
      
      var ret = do_leaf(p3);      
      do_push(stack, p3, ret[0], ret[1]);
    }
    
    if (points.length - i*3 == 2) {
      var p1 = [points[i*3], points[i*3+1]];
      
      var ret = do_leaf(p1);
      do_push(stack, p1, ret[0], ret[1]);
    } else if (points.length - i*3 == 1) {
      stack.pop();
      var i2 = i-1;
      var v1 = points[i2*3], v2 = points[i2*3+1];
      var v3 = points[i2*3+2], v4 = points[i2*3+3];
      
      var p1 = [v1, v2];
      var p2 = [v3, v4];
      
      ret = do_leaf(p1);
      do_push(stack, p1, ret[0], ret[1]);
      
      ret = do_leaf(p2);
      do_push(stack, p2, ret[0], ret[1]);
    }
    
    var tris = new set();
    var edges = new set();
    
    var ilen = 9+Math.ceil(Math.log(stack.length) / Math.log(2.0));
    
    for (var i=0; i<ilen; i++) {
      var stack2 = new GArray();
      
      var jlen = Math.floor(stack.length/2);
      var slen = stack.length;
      
      for (var j=0; j<jlen; j++) {
        var s;
        
        s = stack.pop();      
        var ret1 = s[0];
        var tris1 = s[1];
        var edges1 = s[2];
        
        s = stack.pop();      
        var ret2 = s[0];
        var tris2 = s[1];
        var edges2 = s[2];

        tris = tris1.union(tris2);
        edges = edges1.union(edges2);
        var ret3 = ret1.concat(ret2);        
        
        var o1 = find_outer_verts(tris1, edges1);
        var o2 = find_outer_verts(tris2, edges2);
        
        axis_sort(o1, 1);
        axis_sort(o2, 1);
        
        for (var k=0; k<o1.length; k++) { 
          for (var l=0; l<o2.length; l++) {
            if (o1[k] == o2[l]) continue;
            
            var isec = isect_new_edge_and_tris(o1[k], o2[l], esh, tsh)
            if (isec == false) {
                var e = scanfill_ensure_edge(m, o1[k], o2[l]);
                    
                esh.add(e);              
                edges.add(e);
                e.index = -1;
            }
          }
        }
        
        do_push(stack2, ret3, tris, edges);
      }
      
      for (var j=0; j<stack.length; j++) {
        stack2.push(stack[j]);
      }
      
      stack = stack2;
    }
    
    if (stack.length == 1) {
      tris = stack[0][1];
      edges = stack[0][2];
    }
    
    for (var e of edges) {
      var ts = find_tri(e, tsh);
        
      for (var t of ts) {
        var v1 = t[0];
        var v2 = t[1];
        var v3 = t[2];
        
        if (!colinear(v1.co, v2.co, v3.co)) { 
          var f = make_tri(m, v1, v2, v3);
          
          if (f != null) {
            f.index = -2;
            
            tsh.add(f);                 
            tris.add(f);
            
            for (var e2 of f.edges) {
                e2.index = -1;
                edges.add(e2);
                
                esh.add(e2);
            }
          } else {
            console.log("Yeek, failed to make a face")
          }
        }
      }
    }
    
    return [tris, edges];
  }
  
  function scanfill(m, loops, points, esh, tsh, depth) { //esh, tsh, depth are optional; don't set them
      var edges = new set()
      
      if (depth==undefined || depth == 0) {
          edge_hash = {}
          for (var e of m.edges) {
            var k = e_hash(e.v1, e.v2);
            edge_hash[k] = e;
          }
          
          depth = 0;
          axis_sort(points, 0);

          m.edges.index_update();
          
          var ret = minmax_verts(points);
          ret = ret[0].sub(ret[1]);
          var spacesize = ret.vectorLength();
          
          var esh = new set(); //new spatialhash(new GArray(), spacesize/2.0);
          var tsh = new set(); //new spatialhash(new GArray(), spacesize/30.0);
          
          /*
          for (var loop of loops) {
              for (var i=0; i<loop.length; i++) {
                  var v1 = loop[i];
                  var v2 = loop[(i+1) % loop.length];
                  if (v1 == v2) continue;
              
                  var e = scanfill_ensure_edge(m, v1, v2);
                      
                  esh.add(e);
                  edges.add(e)
                  
                  e.index = -1;
              }
          }*/
       }

       if (points.length == 3) {
          var v1=points[0]; var v2=points[1]; var v3 = points[2];

          if (colinear(v1.co, v2.co, v3.co)) {
            var e1 = scanfill_ensure_edge(m, v1, v2);
            var e2 = scanfill_ensure_edge(m, v2, v3);
            //var e3 = scanfill_ensure_edge(m, v3, v1);
            var edges2 = new set(new GArray([e1, e2]));
            edges2 = test_edges(m, edges2, esh, tsh);
            
            edges = edges.union(edges2);
            return [new set(), edges];
          }
          
          var e1 = scanfill_ensure_edge(m, v1, v2);
          var e2 = scanfill_ensure_edge(m, v2, v3);
          var e3 = scanfill_ensure_edge(m, v3, v1);
          
          var edges2 = new set(new GArray([e1, e2, e3]));
          edges2 = test_edges(m, edges2, esh, tsh);

          edges = edges.union(edges2)
          
          if (edges2.has(e1) && edges2.has(e2) && edges2.has(e3)) {
            var tri = [v1, v2, v3];
            
            tri = make_tri(m, v1, v2, v3);
            if (tri != null) {
              tsh.add(tri);
              tri.index = -2;
            
              return [new set(new GArray([tri])), edges];
            } else {
              return [new set(), edges];
            }
          }
          
          return [new set(), edges];
      } else if (points.length == 2) {
          var e = scanfill_ensure_edge(m, points[0], points[1]);
          
          edges = edges.union(test_edges(m, new set(new GArray([e])), esh, tsh))
    
          return [new set(), edges]
      }
      
      //prepare to merge triangle islands together
      var mid = Math.floor(points.length/2);

      var ret1 = scanfill(m, loops, points.slice(0, mid), esh, tsh, depth+1);
      var ret2 = scanfill(m, loops, points.slice(mid, points.length), esh, tsh, depth+1);
      
      var tris1 = ret1[0]; var edges1 = ret1[1];
      var tris2 = ret2[0]; var edges2 = ret2[1];
      
      var tris = tris1.union(tris2);
      var edges = edges1.union(edges2);
      
      var o1 = find_outer_verts(tris1, edges1);
      var o2 = find_outer_verts(tris2, edges2);
      
      axis_sort(o1, 1);
      axis_sort(o2, 1);
      
      for (var i=0; i<o1.length; i++) { 
          for (var j=0; j<o2.length; j++) {
              if (o1[i] == o2[j]) continue;
              
              var isec = isect_new_edge_and_tris(o1[i], o2[j], esh, tsh)
              if (isec == false) {
                  var e = scanfill_ensure_edge(m, o1[i], o2[j]);
                      
                  esh.add(e);              
                  edges.add(e);
                  e.index = -1;
              }
          }
      }
      
      if (depth == 0) {/*
        var sortedges = new Array()
        for (var e of edges) {
          sortedges.push(e);
        }
        function edge_val_sort(a, b) {
          var val1 = a.v1.edges.length + a.v2.edges.length;
          var val2 = b.v1.edges.length + b.v2.edges.length;
          
          if (val1 < val2) return -1
          else if (val1 == val2) return 0;
          else return 1;
        }
        
        sortedges.sort(edge_val_sort);
        
        for (var i=0; i<sortedges.length; i++) {
          var e = sortedges[i];*/
        
        for (var e of edges) {
          var ts = find_tri(e, tsh);
            
          for (var t of ts) {
            var v1 = t[0];
            var v2 = t[1];
            var v3 = t[2];
            
            if (!colinear(v1.co, v2.co, v3.co)) { 
              var f = make_tri(m, v1, v2, v3);
              
              if (f != null) {
                f.index = -2;
                
                tsh.add(f);                 
                tris.add(f);
                
                for (var e2 of f.edges) {
                    e2.index = -1;
                    edges.add(e2);
                    
                    esh.add(e2);
                }
              } else {
                console.log("Yeek, failed to make a face")
              }
            }
          }
        }
      }
      
      if (depth == 0)
        return [tsh, esh]
      else
        return [tris, edges];
  }

  function test_flip(e, print_d) {
      if (e.totface != 2) return false; // || e.index == -2) return false;
      
      var fs = list(e.faces);
      var t1 = fs[0]; var t2 = fs[1];
      
      var v1 = other_tri_vert(e, t1);
      var v2 = other_tri_vert(e, t2);
      
      if (v1 == v2) return false;
      
      if (!convex_quad(v1.co, e.v1.co, v2.co, e.v2.co))
          return false;
          
      if (cedge_hash[e_hash(e.v1, e.v2)] != undefined)
        return false;
      
      var tag = tag_hash[e_hash(e.v1, e.v2)];
      if (tag == false) return false;
      else if (tag == true) return true;
      
      //var e2 = scanfill_find_edge(v1, v2);
      //if (e2 != undefined && e2.index == -2) return true;
      
      if (colinear(v1.co, v2.co, e.v1.co))
        return false;        
      if (colinear(v1.co, v2.co, e.v2.co))
        return false;
      
      var vs1 = list(t1.verts);
      var vs2 = list(t2.verts);
       
      var circ1 = get_tri_circ(vs1[0].co, vs1[1].co, vs1[2].co);
      var circ2 = get_tri_circ(vs2[0].co, vs2[1].co, vs2[2].co);
      
      var circ3 = get_tri_circ(v1.co, v2.co, e.v1.co);
      var circ4 = get_tri_circ(v1.co, v2.co, e.v2.co);
      
      var delta = (circ3[1]+circ4[1]) - (circ1[1]+circ2[1])
      //if (print_d)
        //console.log(delta);
      return delta < 0.0; // && Math.abs(delta) > 0.00001;
  }

  var flip_max = 45;
  var tag_hash = {}

  function delauney_flip(m, loops, tris, edges, single_iter) {//single_iter is optional
      if (single_iter == undefined)
        single_iter = false;
        
      //set a maximum on flip iterations, to avoid infinte loops in degenerate edge cases
      edges = new set(edges);
      
      var itot = single_iter ? 1 : Math.max(flip_max, 0);
      for (var i=0; i<itot; i++) {
          var found_flip = false;
          var delset = {};
          var addset = {};
          
          //console.log("start loop");
          
          var j = 0;
          for (var e of edges) {
              var ret = test_flip(e, i==flip_max);
              
              if (!ret) continue;
              
              var fs = list(e.faces);
              var t1 = fs[0]; var t2 = fs[1];
              
              var v1 = other_tri_vert(e, t1);
              var v2 = other_tri_vert(e, t2);
              
              //make sure we haven't already removed any of this geometry
              if (!tris.has(t1) || !tris.has(t2))
                continue;
              
              if (t1 == t2) {
                console.trace();
                throw new Error("mesh integrity error");
              }
              
              tris.remove(t1);
              tris.remove(t2);
              
              t1 = make_tri(m, v1, v2, e.v1);
              t2 = make_tri(m, v2, v1, e.v2);
              
              if (t1 != null) tris.add(t1);
              if (t2 != null) tris.add(t2);
              
              delset[e.__hash__()] = e;
              scanfill_kill_edge(m, e);
              
              var e2 = scanfill_ensure_edge(m, v1, v2);
              addset[e2.__hash__()] = e2;
              
              found_flip = true;
          }
          
          for (var e of new obj_value_iter(delset)) {
            edges.remove(e);
          }
          
          for (var e of new obj_value_iter(addset)) {
            edges.add(e);
          }
          
          if (!found_flip)
            break;
      }
      
      if (single_iter)
        return [tris, edges, found_flip];
      else
        return [tris, edges];
  }

  function delauney_constrain_flip(m, loops, tris, edges)
  {
    for (var i=0; i<20; i++) {
      tag_hash = {}

      for (var cehash of cedge_hash) {
        var ce = cedge_hash[cehash];
        
        for (var e2 of edges) {
          if (cedge_hash[e_hash(e2.v1, e2.v2)] != undefined) continue;
          
          if (mesh_edge_isect(ce[0], ce[1], e2.v1, e2.v2)) {
            tag_hash[e_hash(e2.v1, e2.v2)] = true
          }
        }
      }

      var ret = delauney_flip(m, loops, tris, edges, true);

      tris = ret[0];
      edges = ret[1];
      if (!ret[2]) {
        //console.log("breaking", i);
        break;
      }
    }
    
    return [tris, edges];
  }

  function cut_holes(m, loops, tris, edges) {
      var cedges = new hashtable();
      var eloops = new GArray();

      for (var e of edges) {
          e.index = -1;
      }
      
      for (var loop of loops) {
          var eloop = new GArray();
          eloops.push(eloop);
          
          for (var i=0; i<loop.length; i++) {
              var v1 = loop[i];
              var v2 = loop[(i+1) % loop.length];
              
              if (v1 == v2) continue;
          
              var e = scanfill_ensure_edge(m, v1, v2)
                  
              cedges.add(e, [v1, v2])
              edges.remove(e)

              e.index = -2
              eloop.push(e)
          }
      }
      
      var deltris = new set();
      var startt = null;
      
      var cent = new Vector3();
      for (i=0; i<loops[0].length; i++)
          cent.add(loops[0][i].co)
         
      cent.mulScalar(1.0/loops[0].length);
      
      var cent = new Vector3()
      for (i=0; i<loops[0].length; i++) {
        
        cent.add(loops[0][i].co);
      }
      cent.mul(1.0 / loops[0].length);
      
      var wind=0;
      var totw=0;
      for (var i=0; i<loops[0].length; i++) {
          var v1 = loops[0][i];
          var v2 = loops[0][(i+1)%loops[0].length];
          
          if (colinear(v1.co, v2.co, cent)) continue;
          var w = winding(v1.co, v2.co, cent);
          
          if (w)
            wind += 1.0
            
          totw++;
      }
      
      if (totw > 0)
        wind /= totw;

      wind = Math.round(wind) == 1.0
      
      for (var i=0; i<loops[0].length; i++) {
          var v1 = loops[0][i];
          var v2 = loops[0][(i+1)%loops[0].length];
          var v3 = loops[0][(i+2)%loops[0].length];
          
          var e = scanfill_find_edge(v1, v2);
          
          if (colinear(v1.co, v2.co, v3.co)) continue;
          
          for (var f of e.faces) {
              var vs = [v1, v2, other_tri_vert(e, f)]
                      
              if (tris.has(f) && wind == winding(vs[0].co, vs[1].co, vs[2].co)) {
                  startt = f;
                  break
              }
          }
          
          if (startt != null)
              break;
      }
      
      for (var t of tris)
          t.index = -1;
      
      if (startt == null) {
        return [tris, edges]
      }
      
      var stack = [startt];
      var tset = new set(new GArray([startt]))
      
      while (stack.length > 0) {
          var t = stack.pop();
          t.index = -2;
          
          for (var e of t.edges) {
              if (cedges.has(e)) continue;
              
              for (var f of e.faces) {
                  if (!tset.has(f)) {
                      tset.add(f);
                      stack.push(f)
                  }
              }
          }
      }
      
      for (var t of new set(tris)) {
          if (t.index == -1) {
              tris.remove(t);
              
              var v1, v2, v3;
              v1 = t.looplists[0].loop.v;
              v2 = t.looplists[0].loop.next.v;
              v3 = t.looplists[0].loop.next.next.v;
              
              if (tri_hash[hash_tri(v1,v2,v3)] != undefined)
                scanfill_kill_face(m, t)
          }
      }
          
      for (var e of list(edges)) {
          if (e.totface == 0) {
            edges.remove(e);
            scanfill_kill_edge(m, e);
          }
      }
      
      return [tris, edges]
  }

  function constrain_delauney_intern(m, loops, tris, edges, cedges, edone) {
      var remedges = new set();
      var emap = new hashtable();
      var deltris = new set();
      
      var found = false;
      for (var e1 of cedges) {
        if (edone.has(e1)) continue;
        if (found) break;
        
        for (var tri of tris) {
          var es = [];
          var not_es = [];
          
          for (var e2 of tri.edges) {
            var valid = true;
            
            if (e1.v1 == e2.v1 || e1.v1 == e2.v2 || e1.v2 == e2.v1 || e1.v2 == e2.v2) {
              valid = false;
            }
            
            var isect = valid && !cedges.has(e2) && line_line_cross([e1.v1.co, e1.v2.co], [e2.v1.co, e2.v2.co]); //mesh_edge_isect(e1.v1, e1.v2, e2.v1, e2.v2);

            if (isect) {
              edone.add(e1);
              remedges.add(e2);
              
              edges.remove(e2);
              es.push(e2);
            } else {
              not_es.push(e2);
            }
          }
          
          if (es.length > 0) {
            var value;
            if (!emap.has(e1)) {
              value = [new set(), new set()]
              emap.add(e1, value)
            } else {
              value = emap.get(e1);
            }
            
            for (var i=0; i<es.length; i++) {
              value[0].add(es[i]);
            }
            
            for (var i=0; i<not_es.length; i++) {
              value[1].add(not_es[i]);
            }
            
            found = true;
            deltris.add(tri);
          }
        }
      }
      
      var cc = 0;
      
      for (var e1 of emap) {
        var value = emap.get(e1);
        
        var lastv = null;
        var vdone = new set();
        var not_es = value[1];
        var edone2 = new set();
        
        for (var e of value[0]) {
          for (var f of e.faces) {
            tris.remove(f);
          }
          
          scanfill_kill_edge(m, e);
        }
        
        for (var i=0; i<2; i++) {
          var startv = i==0 ? e1.v1 : e1.v2
          var endv = i==0 ? e1.v2 : e1.v1
          
          var v1 = startv;
          var e2 = e1;
          var i1 = 0;
          var lst = new GArray([v1]);
          vdone.add(v1);
          vdone.remove(endv);
          edone2.add(e1);
        
          do {
            var nv = null;
            
            //we need this variable to ensure we don't retrace the first loop.
            if (i ==0) lastv = v1;          
            
            for (var e of v1.edges) {
              if (!not_es.has(e)) continue;
              
              if (e != e2 && e.other_vert(v1) != lastv) {
                e2 = e;
                edone2.add(e);
                nv = e.other_vert(v1);
                //not_es.remove(e);
                
                if (cc == debug_int_1) {
                  m.edges.select(e, 1);
                  //console.log(cc, e.eid, e.index, not_es.toString());
                }
                
                cc++;
                break;
              }
            }
            
            for (var e of v1.edges) {
              //if (not_es.has(e)) not_es.remove(e);
            }
            
            v1 = nv;
            if (v1 == null) {
              //console.log("invalid loop");
              break;
            }
            
            i1++;
            if (i1 > 50000) {
              console.log("infinite loop in triangulate")
              return [tris, edges, 0];
            }
            
            lst.push(v1);
            vdone.add(v1);
          } while (v1 != endv);
          
          cc++;
          if (lst.length == 3) {
            var f = make_tri(m, lst[0], lst[1], lst[2]);
            if (f != null) {
              tris.add(f);
            }
          } else if (lst.length > 3) {
            var ret = scanfill(m, lst, lst);
            
            tris = tris.union(ret[0], tris);
            edges = edges.union(ret[1], edges);
            
            for (var t of ret[0]) {
              tris.add(t);
            }
            
            for (var e of ret[1]) {
              edges.add(e);
            }
          }
        }
      }
      
      return [tris, edges, remedges.length != 0]
  }

  function constrain_delauney(m, loops, tris, edges) {
    var cedges = new set();
    
    //clear indices
    for (var e of m.edges) {
        e.index = 0;
        if (e.totface < 2)
          e.index = -3;
    }
    
    //find and tag constrained edges
    for (var loop of loops) {
        for (var i=0; i<loop.length; i++) {
            var v1 = loop[i];
            var v2 = loop[(i+1) % loop.length];
            if (v1 == v2) continue;
        
            var e = scanfill_ensure_edge(m, v1, v2);
                
            cedges.add(e);
        }
    }
    
    //remove data in cedges from edges
    for (var e of cedges) {
        if (edges.has(e)) {
            edges.remove(e);
        }
    }
    
    var edone = new set();
    var max_i = cedges.length*2;
    for (var i=0; i<max_i; i++) {
      var ret = constrain_delauney_intern(m, loops, tris, edges, cedges, edone);
      tris = ret[0];
      edges = ret[1];
      
      if (!ret[2]) break;
    }
    
    return [tris, edges]
  }

  var _tri_f_f_static_axis = new Vector3();
  var _tri_f_f_static_scale = new Vector3();
  var _tri_f_f_static_rvec = new Vector3();
  var _tri_f_f_static_co = new Vector3();
  var _tri_f_f_static_cross = new Vector3();
  var _tri_f_last_ms = 0;

  function face_fill_intern(f, looptris) {
    tri_hash = {};
    cedge_hash = {}; //a key-only hash of constrained edges
    
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
    
    cross.load(f.no);
    cross.cross(axis);
    cross.normalize();
    
    var sign = axis.dot(f.no) > 0.0 ? 1.0 : -1.0
    
    var a = Math.acos(Math.abs(f.no.dot(axis)));
    var q = new Quat()
    q.axisAngleToQuat(cross, sign*a);
    var mat = q.toMatrix();
    
    var mm = new MinMax(3);
    
    var totvert=0;
    for (var v of f.verts) {
      mm.minmax(v.co);
      totvert++;
    }
    
    var randsize = new Vector3(mm.max).sub(mm.min);
    randsize.divScalar(Math.max(totvert*2.0, 100.0));
    randsize.max(Vector3.temp_xyz(0.02, 0.02, 0.02));
    
    for (var v of f.verts) {
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
    for (var loop of f.looplists) {
      var loop2 = new GArray();
      loops.push(loop2);
      
      
      for (var l of loop) {
        loop2.push(points[l.v.index]);
        ls.push(l);
      }
      
      if (sign == 1) loop2.reverse();
      
      for (var i=0; i<loop2.length; i++) {
        var v1 = loop2[i];
        var v2 = loop2[(i+1)%loop2.length];
        
        //cedge_hash[e_hash(v1, v2)] = [v1, v2];

        //var e = tmesh.make_edge(v1, v2, false);
        //e.index = 2;
      }
    }
    
    tri_counter = 0;
    var ret = 0;
    
    ret = scanfill2(tmesh, loops, points);
    THREAD_YIELD
    
    for (var lst of loops) {
      for (var i=0; i<lst.length; i++) {
        var v1 = lst[i];
        var v2 = lst[(i+1)%lst.length];
        
        //var e = scanfill_ensure_edge(tmesh, v1, v2);
        //e.index = -2;
      }
    }
     
    ret = delauney_flip(tmesh, loops, ret[0], ret[1]);
    THREAD_YIELD
    
    //ret = delauney_constrain_flip(tmesh, loops, ret[0], ret[1]);
    ret = constrain_delauney(tmesh, loops, ret[0], ret[1]);
    THREAD_YIELD
    
    ret = cut_holes(tmesh, loops, ret[0], ret[1]);
    THREAD_YIELD
    
    var ls2 = [0, 0, 0];
    for (var t1 of ret[0]) {
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
    
    /*
    for (var e of ret[1]) {
      if (e.eid == flip_max-6) {
        tmesh.kill_edge(e);
        console.log("found")
      }
    }  
    // */
    
    /*
    for (var f of tmesh.faces) {
      if (f.eid == flip_max-6) {
        var verts = list(f.verts)
       // while ((f = tmesh.find_face(verts)) != null) {
          tmesh.kill_face(f);
        //}
        console.log("found")
      }
    }  
    // */
    THREAD_YIELD
    
#ifndef USE_THREADS 
    return tmesh;
#endif
  }
  
#ifdef USE_THREADS 
  create_prototype(face_fill_intern);
  face_fill_intern.jobtype = new face_fill_intern();
  face_fill_intern.prototype.jobtype = face_fill_intern.jobtype;
  
  return new face_fill_intern(f, looptris);
#else
  return face_fill_intern(f, looptris);
#endif
}

#ifndef USE_THREADS
function triangulate(m, f) {
  var ls = [];
  var ts = new set();
  face_fill(f, ls);
  
  for (var i=0; i<Math.floor(ls.length/3); i++) {
    var v1 = ls[i*3].v;
    var v2 = ls[i*3+1].v;
    var v3 = ls[i*3+2].v;
    
    var f2 = m.make_face([v1, v2, v3]);
    ts.add(f2);
    
    m.copy_face_data(f2, f);
    
    f2.flag |= Flags.DIRTY;
    
    var j = 0;
    for (var l of f2.looplists[0]) {
      m.copy_loop_data(l, ls[i*3+j]);
      
      if (ls[i*3+j].e.flag & Flags.SELECT)
        m.edges.select(l.e);
        
      j++;
    }
  }
  
  m.kill_face(f);
  
  return ts;
}

function tris_to_quads(m, ts)
{
  var eset = new set();
  var fset = ts;
  var ret = new GArray();
  
  if (!(fset instanceof set))
    fset = new set(fset);
  
  var quads = new GArray();
  
  for (var f of fset) {
    for (var e of f.edges) {
      if (eset.has(e))
        continue;
      
      eset.add(e);
      
      if (e.totface != 2) continue;
      
      var ts = list(e.faces);
      if (!fset.has(ts[0]) || !fset.has(ts[1]))
        continue;
      
      var matchfac = 0;
      var v1 = other_tri_vert(e, ts[0]);
      var v2 = e.v1;
      var v3 = other_tri_vert(e, ts[1]);
      var v4 = e.v2;
      
      var vs = [v1.co, v2.co, v3.co, v4.co]
      var sum = 0.0;
      for (var i=0; i<4; i++) {
        var c1 = vs[(i+3)%4];
        var c2 = vs[i];
        var c3 = vs[(i+1)%4];
        
        var n1 = new Vector3(c1).sub(c2).normalize();
        var n2 = new Vector3(c3).sub(c2).normalize();
        
        sum += Math.acos(n1.dot(n2));
      }
      
      if (Math.abs(Math.PI*2.0-sum) > 0.0001)
        matchfac += 1000;
      
      var dfac = Math.abs((v1.co.vectorDistance(v3.co)) - (v2.co.vectorDistance(v4.co)));
      if (dfac != 0.0) {
        dfac = dfac / (v1.co.vectorDistance(v3.co)+v2.co.vectorDistance(v4.co))
      }
      matchfac += dfac;
      console.log("sum: ", sum);
      //if (!convex_quad(v1.co, v2.co, v3.co, v4.co))
      //  continue;
      
      console.log("yay");
      quads.push([matchfac, ts[0], ts[1], e, [v1, v2, v3, v4]]);
    }
  }
  //return
  var deltris = new set();
  
  function sortcmp(a, b) {
    if (a[0] > b[0]) return 1;
    else if (a[0] < b[0]) return -1;
    else return 0;
  }
  
  quads.sort(sortcmp);
  var deledges = new set();
  
  for (var q of quads) {
    if (deltris.has(q[1]) || deltris.has(q[2]))
      continue;
    
    deltris.add(q[1]);
    deltris.add(q[2]);
    deledges.add(q[3]);
    
    var f2 = m.make_face(q[4]);
    m.copy_face_data(f2, q[1]);
    
    ret.push(f2);
    
    for (var l of f2.looplists[0]) {
      for (var l2 of l.e.loops) {
        if (!fset.has(l2.f)) continue;
        
        if (l2.v != l.v)
          l2 = l2.next;
        
        m.copy_loop_data(l, l2);
        break;
      }
    }
  }
  
  for (var t of fset) {
    if (!deltris.has(t))
      ret.push(t);
  }
  
  for (var t of deltris) {
    m.kill_face(t);
  };
  
  for (var e of deledges) {
    m.kill_edge(e);
  }
  
  return ret;
}

#ifdef WORKER_THREAD
#include "src/util/workerutils.js"

var tri_workers = {
  "poly_fill" : function(data) {
    return "yay";
  }
};

var onmessage = define_worker_interface(tri_workers);
#endif

#endif
