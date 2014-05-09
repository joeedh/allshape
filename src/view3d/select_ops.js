class SelectOpAbstract extends ToolOp {
  constructor(String apiname, String uiname, String description, int icon) {
    ToolOp.call(this, apiname, uiname, description, icon);
    
    this._undo_presel = undefined;
  }
  
  undo_pre(ctx) {
    var m = ctx.mesh
    
    var a1 = new Array(m.verts._totsel);
    var a2 = new Array(m.edges._totsel);
    var a3 = new Array(m.faces._totsel);

    var i = 0;
    for (var v in m.verts.selected) {
      a1[i++] = v.eid;
    }
    
    i = 0;
    for (var e in m.edges.selected) {
      a2[i++] = e.eid;
    }
    
    i = 0;
    for (var f in m.faces.selected) {
      a3[i++] = f.eid;
    }
    
    this._undo_presel = [a1, a2, a3];
  }

  undo(ctx) {
    var lst = this._undo_presel;
    var mesh = ctx.mesh;
    
    for (var v in mesh.verts.selected) {
      mesh.verts.select(v, false);
    }
    
    for (var e in mesh.edges.selected) {
      mesh.edges.select(e, false);
    }
    
    for (var f in mesh.faces.selected) {
      mesh.faces.select(f, false);
    }
    
    for (var i=0; i<lst[0].length; i++) {
      var vid = lst[0][i];
      mesh.verts.select(mesh.verts.get(vid), true)
    }
    
    for (var i=0; i<lst[1].length; i++) {
      var eid = lst[1][i];
      mesh.edges.select(mesh.edges.get(eid), true)
    }
    
    for (var i=0; i<lst[2].length; i++) {
      var fid = lst[2][i];
      mesh.faces.select(mesh.faces.get(fid), true)
    }
    
    mesh.regen_colors();
  }
}

class SelectOp extends SelectOpAbstract {
  constructor(mode) {
    SelectOpAbstract.call(this, "mesh_select", "Select");
    
    this.is_modal = false;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    var mode_vals = ["add", "subtract"];
    
    var selmode_enum = selectmode_enum.copy();
    
    this.inputs = {eid_vs: new ElementBufProperty([], "verts", "Vertices", "Vertices"),
                   eid_es: new ElementBufProperty([], "edges", "Edges", "Edges"),
                   eid_fs: new ElementBufProperty([], "faces", "Faces", "Faces"),
                   mode: new EnumProperty(mode, mode_vals, "mode", "Mode", "mode"),
                   selmode : selmode_enum,
                   do_flush: new BoolProperty(true, "do_flush", "Do Flush", "Updated selection of other element types")}
  }

  can_call(ctx) {
    return true;
  }

  exec(ctx) {
    var verts = ctx.mesh.verts;
    var edges = ctx.mesh.edges;
    var faces = ctx.mesh.faces;
    var mesh = ctx.mesh;
    
    var mode = this.inputs.mode.data == "subtract"
    
    for (var eid in this.inputs.eid_vs.data) {
      var v = verts.get(eid);
      
      mesh.verts.select(v, !mode);
    }

    for (var eid in this.inputs.eid_es.data) {
      var e = edges.get(eid);

      mesh.edges.select(e, !mode);
    }

    for (var eid in this.inputs.eid_fs.data) {
      var f = faces.get(eid);
      
      mesh.faces.select(f, !mode);
    }
    
    if (this.inputs.do_flush.data) {
      mesh.api.select_flush(this.inputs.selmode.get_value());
    }
    
    ctx.mesh.regen_colors();
  }
}

class ToggleSelectAllOp extends SelectOpAbstract {
  constructor(mode) {
    SelectOpAbstract.call(this, "mesh_toggle_select_all", "Toggle Sel", "Select All/None", Icons.SELECT_ALL);
    
    if (mode == undefined)
      mode = "auto";
    
    this.is_modal = false;
    var selmode_enum = selectmode_enum.copy();
    selmode_enum.flag |= PackFlags.UI_DATAPATH_IGNORE;
    
    var mode_vals = ["select", "deselect", "auto"];
    this.inputs = {
                    mode: new EnumProperty(mode, mode_vals, "mode", "Mode", "mode"),
                    selmode : selmode_enum
                  }
  }

  can_call(ctx) {
    return true;
  }

  exec(ctx) {
    var mode = 0;
    
    var lst;
    var selmode = this.inputs.selmode.get_value();
    
    if (selmode == MeshTypes.VERT)
      lst = ctx.mesh.verts;
    if (selmode == MeshTypes.EDGE)
      lst = ctx.mesh.edges;
    if (selmode == MeshTypes.FACE)
      lst = ctx.mesh.faces;
    
    if (this.inputs.mode.data == "auto") {
      for (var v in lst) {
        if ((v.flag & Flags.SELECT) != 0) {
          mode = 1;
          break;
        }
      }
    } else {
      mode = this.inputs.mode.data == "deselect";
    }
    
    var mesh = ctx.mesh;
    for (var v in lst) {
      lst.select(v, !mode);
    }
    
    mesh.api.select_flush(this.inputs.selmode.get_value());
    mesh.regen_colors();
  }
}

class EdgeLoopOp extends SelectOpAbstract {
  constructor(mode="add") {
    SelectOpAbstract.call(this, "mesh_eloop_select", "Loop Select", 
                          "Select edge loop", Icons.EDGE_LOOP_SEL);
    
    this.is_modal = false;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    var selmode_enum = selectmode_enum.copy();
    
    var mode_vals = ["add", "subtract"];
    this.inputs = {eid_es: new ElementBufProperty([], "edges", "Start Edges", "Start Edges"),
                   mode: new EnumProperty(mode, mode_vals, "mode", "Mode", "mode"),
                   do_flush: new BoolProperty(true, "do_flush", "Do Flush", "Updated selection of other element types"),
                   selmode : selmode_enum
                   }
  }

  can_call(ctx) {
    return true;
  }

  eloop_select(ctx, edge, flush) {
    var eset = new set();
    var mesh = ctx.mesh;
    var mode = this.inputs.mode.data == "subtract" ? false : true
    var vset = new set();
    
    for (var i=0; i<2; i++) {
      var v = i==0 ? edge.v1 : edge.v2;
      
      var e = edge;
      var l = e.loop;
      
      do {
        if (vset.has(v))
          break;
          
        eset.add(e);
        vset.add(v);
        mesh.edges.select(e, mode);

        if (flush) {
          mesh.verts.select(e.v1);
          mesh.verts.select(e.v2);
        }
        
        if (l == undefined)
          break;
        
        if (l.v == v) {
          l = l.prev.radial_next.prev;
        } else {
          l = l.next.radial_next.next;
        }
        
        e = l.e;
        v = e.other_vert(v);
        if (eset.has(e))
          break;      
        
        if (l.f.totvert != 4)
          break;
      } while (e != edge);
    }
  }

  exec(ctx) {
    var flush = this.inputs.do_flush.data;
    
    for (var e in this.inputs.eid_es.data) {
      e = ctx.mesh.edges.get(e);
      
      if (e != undefined)
        this.eloop_select(ctx, e, flush);
    }
    
    if (flush) {
      ctx.mesh.api.select_flush(this.inputs.selmode.get_value());
    }
    
    ctx.mesh.regen_colors();
  }
}

class EdgeLoopOpModal extends EdgeLoopOp {
  constructor(mode="add") {
    EdgeLoopOp.call(this, mode);
    
    this.inputs.single = new BoolProperty(false, "select_single", "Select Single", "Clear selection first");
    this.is_modal = true;
  }
  
  modal_init(Context ctx) {
    
  }
  
  on_mousemove(MouseEvent evt) {
    var ctx = this.modal_ctx;
    
    /*check that undo_pre was called
      in theory this should not be
      necassary, but you never know...
     */
    if (this._undo_presel == undefined) {
      this.undo_pre(ctx);
      this.undoflag |= UndoFlags.HAS_UNDO_DATA;
    }
    
    g_app_state.screen.handle_active_view3d();
    
    if (ctx.view3d == undefined)
      return;
    
    var pos = ctx.view3d.pos;
        
    medit = ctx.view3d.editor;
    
    if (!(medit instanceof MeshEditor))
      return;
    
    var e = medit.findnearestedge([evt.x-pos[0], evt.y-pos[1]]);
    if (e == null) return;
    
    if (g_app_state.select_inverse || event.shiftKey)
      this.inputs.mode.set_value("subtract");
    else
      this.inputs.mode.set_value("add");
    
    this.inputs.eid_es.data = new GArray([e.eid]);
    this.inputs.selmode.set_value(ctx.view3d.selectmode);
    this.inputs.single.set_data(!g_app_state.select_multiple);
    
    if (this._undo_presel)
      this.undo(ctx);
    this.exec(this.modal_tctx);
  }
  
  exec(ToolContext ctx) {
    if (this.inputs.single.data)
      ctx.mesh.api.select_none();
    EdgeLoopOp.prototype.exec.call(this, ctx);
  }
  
  cancel() {
    this.undo(this.modal_ctx);
    this.end_modal();
  }
  
  on_mouseup(MouseEvent evt) {
    if (evt.button == 2)
      this.cancel();
    else if (evt.button == 0)
      this.end_modal();
  }
}

class FaceLoopOp extends SelectOpAbstract {
  constructor(String mode="add") {
    SelectOpAbstract.call(this, "mesh_floop_select", "Face Loop", "Face Loop Select", Icons.FACE_LOOP_SEL);
    
    this.is_modal = false;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    var selmode_enum = selectmode_enum.copy();
    
    var mode_vals = ["add", "subtract"];
    this.inputs = {eid_es: new ElementBufProperty([], "edges", "Start Edges", "Start Edges"),
                   mode: new EnumProperty(mode, mode_vals, "mode", "Mode", "mode"),
                   selmode : selmode_enum,
                   do_flush: new BoolProperty(true, "do_flush", "Do Flush", "Updated selection of other element types")}
  }

  can_call(ctx) {
    return true;
  }

  floop_select(ctx, edge, flush) {
    var mesh = ctx.mesh;
    var mode = this.inputs.mode.data == "subtract" ? false : true
    var fset = new set();
    
    var ls = list(edge.loops);
    
    for (var l in ls) {
      e = edge;
      do {
        mesh.faces.select(l.f, mode);
        if (flush) {
          for (var v in l.f.verts) {
            mesh.verts.select(v);
          }
        }
        
        if (fset.has(l.f))
          break;
        fset.add(l.f);
        
        if (l.f.totvert != 4)
          break;
        
        l = l.next.next.radial_next;
        e = l.e;
        f = l.f;
      } while (e != edge);
    }
  }

  exec(ctx) {
    var flush = this.inputs.do_flush.data;
    
    for (var e in this.inputs.eid_es.data) {
      e = ctx.mesh.edges.get(e);
      this.floop_select(ctx, e, flush);
    }
    
    if (flush) {
      ctx.mesh.api.select_flush(this.inputs.selmode.get_value());
    }
    
    ctx.mesh.regen_colors();
  }
}

class FaceLoopOpModal extends FaceLoopOp {
  constructor(String mode="add") {
    FaceLoopOp.call(this, mode);
    
    this.inputs.single = new BoolProperty(false, "select_single", "Select Single", "Clear selection first");
    this.is_modal = true;
  }
  
  modal_init(Context ctx) {
    
  }
  
  on_mousemove(MouseEvent evt) {
    var ctx = this.modal_ctx;
    
    /*check that undo_pre was called
      in theory this should not be
      necassary, but you never know...
     */
    if (this._undo_presel == undefined) {
      this.undo_pre(ctx);
      this.undoflag |= UndoFlags.HAS_UNDO_DATA;
    }
    
    g_app_state.screen.handle_active_view3d();
    
    if (ctx.view3d == undefined)
      return;
    
    var pos = ctx.view3d.pos;
        
    medit = ctx.view3d.editor;
    
    if (!(medit instanceof MeshEditor))
      return;
    
    var e = medit.findnearestedge([evt.x-pos[0], evt.y-pos[1]]);
    if (e == null) return;
    
    if (g_app_state.select_inverse || event.shiftKey)
      this.inputs.mode.set_value("subtract");
    else
      this.inputs.mode.set_value("add");
    
    this.inputs.eid_es.data = new GArray([e.eid]);
    this.inputs.selmode.set_value(MeshTypes.FACE);
    this.inputs.single.set_data(!g_app_state.select_multiple);
    
    if (this._undo_presel)
      this.undo(ctx);
    this.exec(this.modal_tctx);
  }
  
  exec(ToolContext ctx) {
    if (this.inputs.single.data)
      ctx.mesh.api.select_none();
    FaceLoopOp.prototype.exec.call(this, ctx);
  }
  
  cancel() {
    this.undo(this.modal_ctx);
    this.end_modal();
  }
  
  on_mouseup(MouseEvent evt) {
    if (evt.button == 2)
      this.cancel();
    else if (evt.button == 0)
      this.end_modal();
  }
}

class CircleDraw extends UIElement {
  constructor(ctx, radius) {
    UIElement.call(this, ctx);
    
    this.radius = radius;
    this.set_radius(radius);
  }
  
  set_radius(radius)
  {
    this.radius = radius;
    this.size = [radius, radius];
  }

  build_draw(canvas, isVertical)
  {
    canvas.begin(this);
    
    var view3d = g_app_state.active_view3d;
    
    var mat = new Matrix4();
    mat.translate(view3d.parent.pos[0], view3d.parent.pos[1], 0);
    
    canvas.push_transform(mat);
    
    var points = canvas.arc_points([this.size[0]/2, this.size[1]/2], 0, Math.PI*2.0, this.radius, 32.0);
    canvas.line_loop(points, uicolors["SelectLine"]);
    
    canvas.pop_transform();
    canvas.end(this);
  }
}

class CircleSelectOp extends SelectOpAbstract {
  constructor(selectmode=undefined) {
    SelectOpAbstract.call(this, "mesh_circle_select", "Circle Select", " ", Icons.CIRCLE_SEL);
    
    this.is_modal = true;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    this.doing = false;
    this.mode = true;
    
    this.radius = 75;
    
    this.alt = false;
    this.shift = false;
    this.mpos = [0,0];
    
    this.selset = new set();
    this.unselset = new set();
    
    var selmode_enum = selectmode_enum.copy();
    if (selectmode != undefined)
      selmode_enum.set_value(selectmode);
    
    var mode_vals = ["add", "subtract"];
    this.inputs = {sel_eids: new ElementBufProperty([], "sel_geometry", "SelGeometry", "Geometry to select"),
                   unsel_eids: new ElementBufProperty([], "unsel_geometry", "UnselGeometry", "Geometry to deselect"),
                   selmode : selmode_enum,
                   do_flush: new BoolProperty(true, "do_flush", "Do Flush", "Update selection of other element types")};
  }

  can_call(ctx) {
    return true;
  }

  end_modal() {
    this.modal_ctx.screen.remove(this.circle);
    this.modal_ctx.screen.do_recalc();
    
    prior(CircleSelectOp, this).end_modal.call(this);
    
    var arr1 = new GArray(), arr2 = new GArray();
    for (var e in this.selset) {
      arr1.push(e.eid);
    }
    for (var e in this.unselset) {
      arr2.push(e.eid);
    }
    
    this.inputs.sel_eids.data = arr1;
    this.inputs.unsel_eids.data = arr2;
    
    //avoid hanging GC references
    this.eset = new set();
  }

  do_sel_transparent(event, view3d) {
    var mpos = new Vector2([event.x, event.y]);
    var selmode = view3d.selectmode;
    var mesh = this.modal_ctx.mesh;
    
    var pmat = new Matrix4(view3d.drawmats.rendermat);
    var use_mapco = mesh.flag & MeshFlags.USE_MAP_CO;
    
    var rsqr = this.radius*this.radius;
    var found = false;
    
    function do_sel(e) {
      mesh.select(e, this.mode);
      
      if (this.mode) {
        this.selset.add(e);
        if (this.unselset.has(e))
          this.unselset.remove(e);
      } else {
        this.unselset.add(e);
        if (this.selset.has(e))
          this.selset.remove(e);
      }
    }
    
    if (selmode & MeshTypes.VERT) {
      var co = new Vector3();
      
      for (var v in mesh.verts) {
        if (use_mapco)
          co.load(v.mapco);
        else
          co.load(v.co);
        
        view3d.project(co, pmat);
        var x = co[0]-mpos[0];
        var y = co[1]-mpos[1];
        
        if (x*x+y*y < rsqr) {
          do_sel.call(this, v);
          found = true;
        }
      }
    }
    
    if (selmode & MeshTypes.EDGE) {
      var co1 = new Vector3();
      var co2 = new Vector3();
      
      for (var e in mesh.edges) {
        if (use_mapco) {
          co1.load(e.v1.mapco);
          co2.load(e.v2.mapco);
        } else {
          co1.load(e.v1.co);
          co2.load(e.v2.co);
        }
        
        view3d.project(co1, pmat);
        view3d.project(co2, pmat);
        
        var d = dist_to_line_v2(mpos, co1, co2);
        
        if (d < this.radius) {
          do_sel.call(this, e);
          found = true;
        }
      }
    }
    
    if (selmode & MeshTypes.FACE) {
      var co = new Vector3();
      for (var f in mesh.faces) {
        if (use_mapco)
          co.load(f.mapcenter);
        else
          co.load(f.center);
        
        view3d.project(co, pmat);
        var x = co[0]-mpos[0];
        var y = co[1]-mpos[1];
        
        if (x*x+y*y < rsqr) {
          do_sel.call(this, f);
          found = true;
        }
      }
    }
    
    return found;
  }

  do_sel_backbuf(event, view3d) {
    var mpos = [event.x, event.y];
    var mesh=this.modal_ctx.mesh;
    
    //adding edge should theoretically prevent extraneous recalcs
    view3d.ensure_selbuf(view3d.selectmode|MeshTypes.EDGE); 
    
    var size = Math.ceil(this.radius*2);
    var selbuf = view3d.read_selbuf([Math.floor(mpos[0]-size/2), Math.floor(mpos[1]-size/2)], size);
    
    var rs = this.radius*this.radius;
    var x2, y2;
    var found = false;
    
    for (var x=0; x<size; x++) {
      for (var y=0; y<size; y++) {
        x2 = x-size/2;
        y2 = y-size/2;
        if (x2*x2+y2*y2 > rs)
          continue;
        
        var pix = [selbuf[(size*y+x)*4], selbuf[(size*y+x)*4+1], selbuf[(size*y+x)*4+2], selbuf[(size*y+x)*4+3]]
    
        var idx = unpack_index(pix);
        
        if (idx > 0) {
          var e = mesh.sidmap[idx-1];
          if (e != undefined && (e.type & view3d.selectmode)) {
            mesh.select(e, this.mode);
            
            if (this.mode) {
              this.selset.add(e);
              if (this.unselset.has(e))
                this.unselset.remove(e);
            } else {
              this.unselset.add(e);
              if (this.selset.has(e))
                this.selset.remove(e);
            }
            
            found = true;
          }
        }
      }
    }
    
    return found;
  }

  do_sel(event) {
    var view3d = this.modal_ctx.view3d;
    
    var found;

    if (view3d.use_backbuf_sel) {
      found = this.do_sel_backbuf(event, view3d);
    } else {
      found = this.do_sel_transparent(event, view3d);
    }
    
    return found;
  }

  on_mousemove(event) {
    var ctx = this.modal_ctx;
    this.mpos = [event.x, event.y]
    
    var mpos = this.mpos;
    this.circle.pos = [mpos[0]-this.circle.size[0]/2, mpos[1]-this.circle.size[1]/2]
    this.circle.do_recalc();
    
    if (this.doing) {
      var found = this.do_sel(event);
      if (found) {
        if (this.inputs.do_flush.data) {
          this.modal_ctx.mesh.api.select_flush(this.inputs.selmode.get_value());
        }
        this.modal_ctx.mesh.regen_colors();      
      }
    }
  }

  step_radius(delta) {
    var step;
    
    if (this.shift)
      step = 3;
    else
      step = 10 + (this.radius/200.0)*10.0;
    
    this.radius = Math.min(Math.max(this.radius + delta*step, 0), 250);
    
    var mpos = this.mpos;
    this.circle.set_radius(this.radius);
    this.circle.pos = [mpos[0]-this.circle.size[0]/2, mpos[1]-this.circle.size[1]/2]
    this.circle.do_recalc();
  }

  on_mousewheel(event, delta) {
    this.step_radius(-delta);
  }

  on_mousedown(event) {
    //touch version
    if (g_app_state.was_touch) {
      this.doing = true;
      this.mode = !g_app_state.select_inverse;
      return;
    }
    
    //normal mouse version
    if (event.button == 2 && !this.alt) {
      this.end_modal();
    } else if (event.button == 2 && this.alt) {
      this.doing = true;
      this.mode = false;
    } else if (event.button == 0) {
      this.doing = true;
      this.mode = this.alt ? false : true;
    } else if (event.button == 1) {
      this.doing = true;
      this.mode = false;
    }
  }
 
  on_mouseup(event) {
    this.doing = false;
    
    if (g_app_state.was_touch)
      this.end_modal();
  }

  on_keydown(event) {
    this.shift = event.shiftKey;
    this.alt = event.altKey;
    
    if (event.keyCode == charmap["Escape"] || event.keyCode == charmap["Enter"]) {
      this.end_modal();
      return;
    }
    
    if (event.keyCode == charmap["Up"] || event.keyCode == charmap["="] || event.keyCode == charmap["NumPlus"]) {
      this.step_radius(1);
    } else if (event.keyCode == charmap["Down"] || event.keyCode == charmap["-"] || event.keyCode == charmap["NumMinus"]) {
      this.step_radius(-1);
    }
  }

  on_keyup(event) {
    this.shift = event.shiftKey;
    this.alt = event.altKey;
  }

  modal_init(ctx) {
    this.circle = new CircleDraw(ctx, this.radius);
    
    ctx.screen.add(this.circle);
    this.eset = new set();
    
    prior(CircleSelectOp, this).modal_init(ctx);
  }

  exec(ctx) {
    var mesh = ctx.mesh;
    
    for (var e in this.inputs.sel_eids.data) {
      e = mesh.eidmap[e];
      mesh.select(e, true);
    }
    
    for (var e in this.inputs.unsel_eids.data) {
      e = mesh.eidmap[e];
      mesh.select(e, false);
    }
    
    if (this.inputs.do_flush.data) {
      ctx.mesh.api.select_flush(this.inputs.selmode.get_value());
    }
    
    ctx.mesh.regen_colors();
  }
}