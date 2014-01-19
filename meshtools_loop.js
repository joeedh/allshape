"use strict";

function LoopCutOp()
{
  ToolOp.call(this);
  
  this.name = "loopcut";
  this.uiname = "Loop Cut";
  
  this.drawlines = new GArray();
  
  this.curedge = undefined;
  
  this.is_modal = true;
  this.inputs = {start_edges : new ElementBufProperty("", "startedges", "Start Edges", "Start Edges For Loops"),
                cuts : new IntProperty(1, "cuts", "Cuts", "Cuts", [1, 25], [1, 25])};
                
  this._partial = undefined;
}
inherit(LoopCutOp, ToolOp);

LoopCutOp.prototype.can_call = function(ctx) {
  return true;
}

LoopCutOp.prototype.modal_init = function(ctx) {
  prior(LoopCutOp, this).modal_init.call(this, ctx);
  
  var mpos = ctx.view3d.mpos;
  var event = {x : mpos[0], y : mpos[1]};
  
  this.on_mousemove(event);
}

LoopCutOp.prototype.on_mousedown = function(event) {
  if (event.button == 0) {
    this.finish(this.modal_ctx);
  } else if (event.button == 2) {
    this.cancel(this.modal_ctx);
  }
}

LoopCutOp.prototype.on_mousewheel = function(event, delta) {
  this.inputs.cuts.data = Math.max(Math.min(Math.floor(this.inputs.cuts.data+delta), 25), 1);
  
  this.recalc();
}

LoopCutOp.prototype.kill_drawlines = function() {
  var view3d = this.modal_ctx.view3d;
  
  for (var dl in this.drawlines) {
    view3d.kill_drawline(dl);
  }
  
  this.drawlines = new GArray();
}

LoopCutOp.prototype.find_loop = function(ctx, edge) {
  if (edge == undefined)
    return [new GArray(), new GArray(), false];
  
  var edges = new GArray([edge])
  var v1s = new GArray([edge.v1]);
  
  var is_loop = false;
  
  var fs = list(edge.faces);
  if (fs.length == 0)
    return;
  
  var l=undefined;
  for (var l2 in edge.loops) {
    if (l2.f == fs[0]) {
      l = l2;
      break;
    }
  }
  
  var edges2 = new GArray()
  var v1s2 = new GArray()
  
  var v1, startv1;
  if (l.v == edge.v1)
    v1 = edge.v1;
  else
    v1 = edge.v2;
  
  startv1 = v1;
  var loop_stopped = false;
  
  for (var i=0; i<2; i++) {
    if (i >= fs.length)
      break;
    
    var f = fs[i];
    var e = edge;
    var eset = new set();
    
    v1 = startv1;
    var j = 0;
    while (1) {
      if (eset.has(e)) {
        break;
      }
      
      if (i != 1 || e != edge) {
        eset.add(e);
        
        if (i == 0) {
          edges.push(e);      
          v1s.push(v1);
        } else {
          edges2.push(e);      
          v1s2.push(v1);
        }          
      }
      
      if (f.totvert != 4) {
        loop_stopped = true;
        break;
      }
      
      var l=undefined;
      for (var l2 in e.loops) {
        if (l2.f == f) {
          l = l2;
          break;
        }
      }
      
      var lprev = l;
      l = l.next.next.radial_next;
      
      if (lprev.v == v1) {
        v1 = l.v;
      } else {
        v1 = l.next.v;
      }
      
      if (l.radial_next == l) {
        loop_stopped = true;
        break;
      }
      
      f = l.f;
      e = l.e;
    }
    
    if (e == edge) {
      break;
    }
    
    j++;
  }
  
  edges2.reverse();
  v1s2.reverse();
  
  v1s = concat_array(v1s2, v1s);
  edges = concat_array(edges2, edges);
  
  is_loop = !loop_stopped;
  
  console.log("is_loop", is_loop);
  return [edges, v1s, is_loop];
}

LoopCutOp.prototype.recalc = function() {
  var ctx = this.modal_ctx;
  
  this.kill_drawlines();
  
  if (this.curedge == undefined)
    return;
  
  this.inputs.start_edges.data = new GArray([this.curedge.eid]);
  
  var ret = this.find_loop(ctx, this.curedge);
  var edges = ret[0];
  var v1s = ret[1];
  var cuts = Math.max(this.inputs.cuts.data, 1);
  
  var loops = []
  for (var i=0; i<cuts; i++) {
    loops.push([]);
  }
  
  var i = 0;
  var pmat = ctx.view3d.drawmats.rendermat;
  
  var eset = new set(edges);
  
  for (var e in edges) {
    var dc = 1.0 / (cuts+1);
    var c = dc;
    for (var j=0; j<cuts; j++) {
      var v1 = v1s[i];
      var v2 = e.other_vert(v1);
      
      if (v1 == null || v2 == null) {
        c += dc;
        continue;
      }
      
      var co = new Vector3(v2.co).sub(v1.co).mulScalar(c).add(v1.co);
      //co = new Vector3(v1s[i].co);
      
      co.multVecMatrix(pmat);
      loops[j].push(co);
      c += dc;
      
      var k = 0;
      for (var f in e.faces) {
        if (f.totvert == 3) {
          var found = false;
          
          for (var e2 in f.edges) {
            if (e2 != e && eset.has(e2)) {
              found = true;
              break;
            }
          }
          if (found) continue;
          
          console.log("yay2");
          var co2 = new Vector3(other_tri_vert(e, f).co);
          co2.multVecMatrix(pmat);
          
          if (k > 0)
            loops[j].push(co);
          
          loops[j].push(co2);
          k++;
        }
      }
    }
    
    i++;
  }
  
  var elen = ret[2] ? loops[0].length : loops[0].length-1;
  
  for (var i=0; i<elen; i++) {
    for (var j=0; j<cuts; j++) {
      var v1 = loops[j][i];
      var v2 = loops[j][(i+1)%edges.length];
      
      var dl = ctx.view3d.new_drawline(v1, v2);
      this.drawlines.push(dl);
    }
  }
  console.log(edges.length);
}

LoopCutOp.prototype.on_mousemove = function(event) {
  var mpos = [event.x, event.y]
  this.mpos = mpos;
  
  var ctx = this.modal_ctx
  
  var e = ctx.view3d.findnearestedge(mpos);
  
  if (e != null && e != this.curedge) {
    this.curedge = e;
    this.recalc();
  }
}

LoopCutOp.prototype.finish = function(ctx) {
  this.exec(ctx);
  
  this.end_modal();
}

LoopCutOp.prototype.cancel = function(ctx) {
  this.end_modal();
}

LoopCutOp.prototype.undo_pre = function(ctx) {
  //due to this being an interactive tool, undo data
  //is stored in exec.
}

LoopCutOp.prototype.undo = function(ctx) {
  if (this._partial != undefined) {
    var part = this._partial;
    var mesh = ctx.mesh;
    
    mesh.load_partial(this._partial);
    mesh.regen_render();
    
    this._partial = undefined;
  }
}

LoopCutOp.prototype.end_modal = function(ctx) {
  this.kill_drawlines();
  prior(LoopCutOp, this).end_modal.call(this, ctx);
}

LoopCutOp.prototype.exec = function(ctx) {
  var mesh = ctx.mesh;
  console.log(this.inputs);
  
  var undoset = new set();
  var ops = new GArray();
 
  for (var e in this.inputs.start_edges.data) {
    e = mesh.eidmap[e];
    
    if (e == undefined)
      continue;
    
    var ret = this.find_loop(ctx, e);
    var edges = new set(ret[0]);
    
    for (var e in edges) {
      undoset.add(e);
      undoset.add(e.v1);
      undoset.add(e.v2);
      for (var l in e.loops) {
        undoset.add(l.v);
        undoset.add(l.f);
        undoset.add(l.e);
      }
    }
    
    var op = new ESubdivideOp(edges, this.inputs.cuts.data);
    op.inputs.fillmode.set_flag("EDGE_TRI");
    ops.push(op);
  }
  
  this._partial = mesh.gen_partial(undoset, 1);

  for (var op in ops) {
    mesh.ops.call_op(op);
  }
  
  mesh.regen_positions();
  mesh.regen_render();
}