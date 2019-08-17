"use strict";

#include "src/core/utildefine.js"

/*
  quad tree implemented with typed float32 arrays:
  
  qnode float32array layout:
  
    field   off    size
  min      :  0 : 2 floats
  max      :  2 : 2 floats
  children :  4 : 4 qnode references
  data     : 14 : index into data array
  
  total size: 2*2+8+1 = 13
  
  data layout:
  
  total indices : 0 : 1 float
  indices...    : 1 : [total indices] floats
*/

#define MAX_CHILD 8
#define QN_SIZE  13 //size in logical floats, not bytes

//these all assume a lqnal variable "qn", that points to 
//qntree.qnodes, which is a flat Float32Array
//also a dt lqnal var, which referces to qntree.data

#define _QN_CACHE3(off) CACHEARR2(qn[off], qn[off+1])

#define QN_MIN(ni) _QN_CACHE3((ni)*QN_SIZE)
#define QN_MAX(ni) _QN_CACHE3((ni)*QN_SIZE+2)
#define QN_SETMIN(ni, min) qn[(ni)*QN_SIZE] = min[0], qn[(ni)*QN_SIZE+1] = min[1]
#define QN_SETMAX(ni, max) qn[(ni)*QN_SIZE+2] = min[0], qn[(ni)*QN_SIZE+1+2] = min[1]

#define QN_GETDATA(ni) qn[(ni)*QN_SIZE+10] 
#define QN_SETDATA(ni, di) qn[(ni)*QN_SIZE+10] = di

#define QN_GETTOT(ni) QN_GETDATA(ni) != -1 ? dt[QN_GETDATA(ni)] : 0
#define QN_SETTOT(ni, tot) dt[qn[(ni)*QN_SIZE+10]] = tot

#define QN_GETCHILD(ni, x, y) qn[(ni)*QN_SIZE+6+y*2+x]
#define QN_SETCHILD(ni, x, y, c) qn[(ni)*QN_SIZE+6+y*2+x] = c
#define QN_LEAF(ni) (QN_GETDATA(ni) != -1)

#define QN_LOCALS var qn=this.qnodes, dt = this.data, ln=this.lines;
#define QN_ROOT 0

class QuadTree {
//  Float32Array qnodes = new Float32Array();
//  Float32Array data = new Float32Array();
//  Float32Array lines = new Float32Array();
  
//  int _qn_cur=0, _data_cur=0, _line_cur;
//  int totnodes=0;
  
  constructor() {
    
  }
  
  new_linedata() : float {
    if (this._line_cur+4 >= this.lines.length) {
      var dnew = new Float32Array(Math.floor(this.lines.length*1.5+4));
      var olen = this.lines.length;
      var dnold = this.lines;
      
      for (var i=0; i<olen; i++) {
        dnew[i] = dold[i];
      }
      
      this.lines = dnew;
    }
    
    var ret = this._line_cur;
    this._line_cur += 4;
    
    return ret;
  }
  
  new_dataline() : float {
    if (this._data_cur+MAX_CHILD+1 >= this.data.length) {
      var dnew = new Float32Array(Math.floor(this.data.length*1.5+MAX_CHILD+1));
      var olen = this.data.length;
      var dnold = this.data;
      
      for (var i=0; i<olen; i++) {
        dnew[i] = dold[i];
      }
      
      this.data = dnew;
    }
    
    var ret = this._data_cur;
    this._data_cur += MAX_CHILD+1; //data line size is MAX_CHILD + a length header
    
    //first element is number of used elements; init it to 0
    this.data[ret] = 0;
    
    return ret;
  }

  new_qnode() : float {
    if (this._qn_cur >= this.qnodes.length) {
      var qnnew = new Float32Array(Math.floor(this.qnodes.length*1.5));
      var olen = this.qnodes.length;
      var qnold = this.qnodes;
      
      for (var i=0; i<olen; i++) {
        qnnew[i] = qnold[i];
      }
      
      this.qnodes = qnnew;
    }
    
    QN_LOCALS;
    
    var ret = this._qn_cur++;
    
    //init child references to null (-1 in this case)
    for (var x=0; x<2; x++) {
      for (var y=0; y<2; y++) {
        QN_SETCHILD(ret, x, y, -1);
      }
    }
    
    QN_SETDATA(ret, -1);
    
    return ret;
  }
  
  reset() {
    this._qn_cur = this._data_cur = 0;
    this.totnodes = 1;
  }
  
  gen_root(Array<float> min, Array<float> max) {
    if (this.totnodes > 0) {
      console.trace("warning, QuadTree.gen_root called in possibly wrong place. resetting tree");
      this.reset();
    }
    
    this.new_qnode(); //initialize root node
    
    QN_LOCALS
    
    QN_SETMIN(QN_ROOT, min);
    QN_SETMAX(QN_ROOT, max);
  }
 
  add_line(Array<float> v1, Array<float> v2, int idx) {
    var n = QN_ROOT;
    
    var lref = this.new_linedata();
    QN_LOCALS
    
    ln[lref*2] = v1[0];   ln[lref*2+1] = v1[1];
    ln[lref*2+2] = v2[0]; ln[lref*2+3] = v2[1];
    
    function node_add(n, v1, v2, lref) {
      static vec1 = [0, 0], vec2 = [0, 0];
      
      QN_LOCALS
      
      if (QN_LEAF(n)) {
        if (QN_GETTOT(n) >= MAX_CHILD) {
          var tot = QN_GETTOT(n);
          var d = QN_GETDATA(n);
          
          QN_SETDATA(n, -1);
          
          var min = QN_GETMIN(n);
          var max = QN_GETMAX(n);
          
          for (var x=0; x<2; x++) {
            for (var y=0; y<2; y++) {
              vec1[0] = min[0] + x*(max[0]-min[0])*0.5;
              vec1[1] = min[0] + y*(max[1]-min[1])*0.5;
              vec2[0] = vec1[0] + (max[0]-min[0])*0.5;
              vec2[1] = vec1[1] + (max[1]-min[1])*0.5;
              
              var n2 = this.new_qnode();
              QN_LOCALS;
              
              QN_SETMIN(n2, vec1);
              QN_SETMAX(n2, vec2);
              
              var dref = this.gen_data();
              QN_LOCALS;
              
              QN_SETDATA(n2, dref);
            }
          }
          
          for (var i=d+1; i<d+1+tot; i++) {
            var l = dt[i];
            
            vec1[0] = ln[l];   vec1[1] = ln[l+1];
            vec2[0] = ln[l+2]; vec2[1] = ln[l+3];
            
            node_add(n, vec1, vec2, dt[i]);
          }
        } else { //add to data
          var d = QN_GETDATA(n);
          
          dt[Math.floor(dt[d])] = lref;
          dt[Math.floor(d)]++;
        }
        return;
      }
      
      for (var x=0; x<2; x++) {
        for (var y=0; y<2; y++) {
          var n2 = QN_GETCHILD(n, x, y);
          
          if (aabb_isect_line_2d(v1, v2, QN_GETMIN(n2), QN_GETMAX(n2)))
            node_add(n2, v1, v2, lref);
        }
      }
    }
    
    //use .call so QN_LOCALS works
    node_add.call(this, n);
  }
  
  _isect_recurse(n, v1, v2) {
    QN_LOCALS
    
    if (!QN_LEAF(n)) {
      for (var x=0; x<2; x++) {
        for (var y=0; y<2; y++) {
          var nref = QN_GETCHILD(n, x, y);
          
          if (line_aabb_isect(v1, v2, QN_GETMIN(nref), QN_GETMAX(nref)) &&
              this._isect_recurse(nref, v1, v2))
          {
            return true;
          }
        }
      }
      
      return false;
    }
    
    QN_LOCALS
   
    var d = QN_GETDATA(n);
    var tot = d[0];
    
    static sv1 = new Vector2(), sv2 = new Vector2();
    static l1 = [0, 0], l2 = [0, 0];
    
    l1[0] = v1;
    l1[1] = v2;
    
    for (var i=d+1; i<d+1+tot; i++) {
      var l = d[i];
      
      sv1[0] = ln[l];   sv1[1] = ln[l+1];
      sv2[0] = ln[l+2]; sv2[1] = ln[l+3];
      
      l2[0] = sv1; 
      l2[1] = sv2;
      
      if (line_line_cross(l1, l2)) {
        return true;
      }
    }
    
    return false;
  }
  
  line_isect(v1, v2) {
    return this._isect_recurse(v1, v2, QN_ROOT);
  }
}
