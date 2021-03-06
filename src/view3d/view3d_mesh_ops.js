"use strict";

class MeshEditor extends View3DEditor {
  constructor(view3d) {
    var keymap = new KeyMap();
    super("Geometry", EditModes.GEOMETRY, DataTypes.MESH, keymap);
    
    this.selectmode = MeshTypes.VERT;
    this.last_selectmode = 0;
    
    var sm = this.selectmode;
    if (sm!= 2 && sm != 4 && sm != 8) this.selectmode = MeshTypes.VERT;

    this.view3d = view3d;
    
    if (view3d != undefined) {
      this.mesh = view3d.ctx.mesh : Mesh;
    } else {
      this.mesh = undefined;
    }
    
    this.ss_mesh = undefined : Mesh;
    this.ctx = undefined : Context;
    this.gl = undefined : WebGLRenderingContext;
    
    this.define_keymap();
  }

  on_area_inactive(view3d) {
    this.mesh.remove_callback(view3d);
  }

  editor_duplicate(view3d) {
    var m = new MeshEditor(view3d);
    
    m.selectmode = this.selectmode;
    m.keymap = this.keymap;
    
    return m;
  }

  static fromSTRUCT(reader) {
    var m = new MeshEditor(undefined);
    reader(m);
    
    return m;
  }

  data_link(block, getblock, getblock_us) {
    this.ctx = new Context();
    this.mesh = this.ctx.mesh;
    
    if (this.mesh != undefined) {
      this.mesh.regen_render();
    }
  }

  render_selbuf(gl, view3d, typemask) {
    if (this.object == undefined) return;

    if (this.object.ss_mesh) 
      subsurf_selbuf_render(this.gl, this.object.ss_mesh, this.mesh, view3d.drawmats, 
                            (this.selectmode|MeshTypes.FACE|typemask));
    else
      render_mesh_selbuf(this.gl, this.mesh, view3d.drawmats, 
                       (this.selectmode|MeshTypes.FACE|typemask));
}

  selbuf_changed(typemask) {
    return this.last_selectmode != (this.selectmode|typemask);
  }

  reset_selbuf_changed(typemask) {
    this.last_selectmode = this.selectmode|typemask;
  }

  add_menu(View3DHandler view3d, Array<float> mpos, Boolean add_title=true) {
    this.ctx = new Context();
    
    console.log("Add menu")
     
    var oplist = ["mesh.add_cube()", "mesh.add_circle()"]
    var menu = toolop_menu(view3d.ctx, add_title ? "Add" : "", oplist);
    
    return menu;
  }
  
  _update_callback(view3d, mesh, event) {
    if (event & (MeshRecalcFlags.REGEN_TESS|MeshRecalcFlags.REGEN_COS)) 
    {
      view3d.redo_selbuf = true;
    }
  }
  
  on_tick(ctx) {
    if (ctx.view3d == undefined) return;
    
    this.ctx = ctx;
    this.mesh = ctx.mesh;
    this.object = ctx.object;
    this.selectmode = ctx.view3d.selectmode;
  }
  
  on_gl_lost(WebGLRenderingContext new_gl) {
    this.gl = gl;
  }
  
  draw_object(gl, view3d, object, is_active)
  {
    //return;
    
    this.ctx = new Context();
    this.mesh = object.data;
    this.object = object;
    this.gl = gl;
    this.selectmode = view3d.selectmode;
    view3d.check_subsurf(this.ctx, object);
    
    this.mesh.update_callback(view3d, this._update_callback);
    
    this.gl = gl;
    if (object.ss_mesh != null) {
      //console.log("face length: ", this.ss_mesh.faces.length);
      var steps = object.calc_ss_steps();
      var ss_recalc = object.data.render.recalc;
      
      if (steps != object.last_ss_steps) {
        object.last_ss_steps = steps;
        ss_recalc |= MeshRecalcFlags.REGEN_TESS;
      }
      
      if ((ss_recalc & MeshRecalcFlags.REGEN_TESS)==0)
        object.data.render.recalc &= ~MeshRecalcFlags.REGEN_NORS;

      if (ss_recalc != 0) {
        if (ss_recalc != MeshRecalcFlags.REGEN_COLORS) {
          if (ss_recalc & MeshRecalcFlags.REGEN_TESS) {
            destroy_subsurf_mesh(gl, object.ss_mesh);
            object.ss_mesh = gpu_subsurf(gl, object.data, steps);
          } else {
            object.ss_mesh = gpu_subsurf(gl, object.data, steps, object.ss_mesh);
          }
        }
        
        if (ss_recalc & MeshRecalcFlags.REGEN_TESS)
          object.data.flag |= MeshFlags.USE_MAP_CO;
        
        if (object.data.verts.length == 0) 
          return;
          
        gen_mesh_render(gl, object.data, object.data.render.drawprogram, object.data.render.vertprogram, object.data.render.recalc);        
      }
      
      object.data.flag |= MeshFlags.USE_MAP_CO;
      subsurf_render(gl, view3d, object.ss_mesh, object.data, 
                     view3d.drawmats, !view3d.use_backbuf_sel, true);
      
      //this.view3d.test_render_selbuf(1|2|8)
    } else {
      if (object.data.verts.length == 0) 
        return;
          
      object.data.flag &= ~MeshFlags.USE_MAP_CO;
      
      if (object.csg) {
        render_mesh_elements(gl, view3d, object.data, view3d.drawmats, 1.0, true);
      } else {
        render_mesh(gl, view3d, object.data, view3d.drawmats, !view3d.use_backbuf_sel); 
      }
    }
  }

  build_sidebar1(view3d)
  {
    var ctx = new Context();
    var row = new RowFrame(ctx);
    
    row.no_auto_padding = true;
    row.packflag |= PackFlags.NO_AUTO_SPACING
    
    if (IsMobile)
      row.default_packflag |= PackFlags.FLIP_TABSTRIP;
    
    //row.default_packflag = PackFlags.INHERIT_WIDTH;
    
    row.size = [Area.get_barwid(), view3d.size[1]-Area.get_barhgt()*2.0]
    row.draw_background = true
    row.rcorner = 100.0
    row.pos = [0, Area.get_barhgt()]
    
    view3d.cols.push(row);
    view3d.add(row);
    
    if (!IsMobile)
      row.label("  ");
    row.toolop("screen.area_split_tool()", PackFlags.INHERIT_WIDTH);
    
    var spacing = IsMobile ? 9.0 : 0.0;
    
    var panel = row.panel("Tools");
    panel.packflag |= PackFlags.NO_AUTO_SPACING|PackFlags.NO_LEAD_SPACING|PackFlags.NO_TRAIL_SPACING;
    var tab = panel.tabstrip();
    
    var col = tab.panel_col("Tools A", undefined, PackFlags.USE_LARGE_ICON); //undefined, PackFlags.USE_LARGE_ICON)
    var row2 = col.row(undefined, undefined)
    row2.pad[1] = spacing;
    
    row2.toolop("mesh.rotate()");
    row2.toolop("mesh.flip_normals(faces=mesh_selected(f))");
    
    row2 = col.row(undefined, undefined, PackFlags.USE_LARGE_ICON);
    row2.pad[1] = spacing;
    
    row2.toolop("mesh.scale()");
    row2.toolop("mesh.duplicate_transform()");
    
    row2 = col.row(undefined, undefined);
    row2.pad[1] = spacing;
    row2.toolwidget("mesh.translate()");
    row2.toolop("mesh.bridge_edges(edges=mesh_selected(e), faces=mesh_selected(f))");
    
    var col = tab.panel_col("Tools B", undefined, PackFlags.USE_LARGE_ICON); //undefined, PackFlags.USE_LARGE_ICON)
    col.default_packflag |= PackFlags.NO_AUTO_SPACING;
    
    var row2 = col.row(undefined, undefined); row2.pad[1] = spacing;
    row2.toolop("mesh.triangulate(faces=mesh_selected(f))");
    row2.toolop("mesh.subdivide(faces=mesh_selected(f))");
    row2.toolop("mesh.inset_transform(faces=mesh_selected(f))");
    var row2 = col.row(undefined, undefined, PackFlags.USE_LARGE_ICON); row2.pad[1] = spacing;
    
    var ret = row2.toolwidget("mesh.extrude(geometry=mesh_selected(vef))");
    
    row2.toolop("mesh.tri2quad(faces=mesh_selected(f))");
    row2.toolop("mesh.dissolve_faces(faces=mesh_selected(f))");
    var row2 = col.row(undefined, undefined); row2.pad[1] = spacing;
    row2.toolop("mesh.vertsmooth(verts=mesh_selected(v))");
    row2.toolop("mesh.loopcut()");
    row2.toolop("mesh.split_edges(edges=mesh_selected(e))");
    
    /*dimension tab*/
    var dim = tab.panel("DIM");
    dim.prop("object.ctx_bb", PackFlags.INHERIT_WIDTH);
    
    /*select panel*/
    var col = row.panel("Select", "select").col();
    var row2 = col.row(undefined, undefined, PackFlags.USE_LARGE_ICON);
    row2.pad[1] = spacing;
    row2.toolop("mesh.toggle_select_all()");
    row2.toolop("view3d.circle_select()");
    
    var row2 = col.row(undefined, undefined, PackFlags.USE_LARGE_ICON);
    row2.pad[1] = spacing;
    row2.toolop("mesh.edgeloop_select_modal()");
    
    var row2 = col.row(undefined, undefined, PackFlags.USE_LARGE_ICON);
    row2.pad[1] = spacing;
    row2.toolop("mesh.faceloop_select_modal()");
    
    var col2 = row.col(undefined, undefined);
    col2.prop("appstate.select_inverse");
    col2.prop("appstate.select_multiple");
    
    //undo buttons
    view3d.undo_redo(row);
    if (DEBUG.screen_keyboard)
      row.add(new UITextBox(ctx, ""));
    
    //last tool panel
    var toolframe = new ToolOpFrame(ctx, "last_tool");
    toolframe.packflag |= PackFlags.INHERIT_WIDTH;
    
    row.label("Last Tool:", false)
    row.add(toolframe);
  }

  build_bottombar(view3d) {
    var ctx = new Context();
    var col = new ColumnFrame(ctx);
    
    col.packflag |= PackFlags.ALIGN_LEFT|PackFlags.NO_AUTO_SPACING|PackFlags.IGNORE_LIMIT;
    col.default_packflag = PackFlags.ALIGN_LEFT|PackFlags.NO_AUTO_SPACING;
    
    //IsMobile ? 12 : 12
    col.draw_background = true;
    col.rcorner = 100.0
    col.pos = [0, 2]
    col.size = [view3d.size[0], Area.get_barhgt()];
    
    col.add(gen_editor_switcher(this.ctx, view3d));
    
    col.label("Selection Mode:");
    col.prop("view3d.selectmode", PackFlags.ENUM_STRIP|PackFlags.USE_SMALL_ICON);
    col.prop("view3d.use_backbuf_sel");
    col.label("  |  ");
    col.prop("view3d.zoomfac");
    col.label("  |  ");
    col.prop("object.use_subsurf");
    
    view3d.rows.push(col);
    view3d.add(col);
  }

  define_keymap() {
    var k = this.keymap;
    
    k.add_tool(new KeyHandler("B", [], "Bridge"), 
                "mesh.bridge_edges(edges=mesh_selected(e), faces=mesh_selected(f))");
    k.add_tool(new KeyHandler("C", ["CTRL"], "Loop Cut"),
               "mesh.loopcut()");
    k.add_tool(new KeyHandler("G", [], "Translate"), 
               "mesh.translate()");
    k.add_tool(new KeyHandler("S", [], "Scale"), 
               "mesh.scale()");
    k.add_tool(new KeyHandler("R", [], "Rotate"), 
               "mesh.rotate()");
    
    k.add_tool(new KeyHandler("F", [], "Create Face"),
               "mesh.context_create(verts=mesh_selected(v))");
    k.add_tool(new KeyHandler("D", ["SHIFT"], "Duplicate"), 
               "mesh.duplicate_transform()");
    k.add_tool(new KeyHandler("D", [], "Smooth Subdivide"), 
               "mesh.smooth_subdivide(faces=mesh_selected(f))");
    k.add_tool(new KeyHandler("Y", [], "Connect"), 
               "mesh.vert_connect(verts=mesh_selected(v))");
    k.add_tool(new KeyHandler("E", [], "Extrude"), 
               "mesh.extrude(geometry=mesh_selected(vef))");
    k.add_tool(new KeyHandler("L", [], "Remove Duplicate Verts"), 
               "mesh.remove_doubles(verts=mesh_selected(v))");
    k.add_tool(new KeyHandler("A", [], "Toggle Select All"), 
               "mesh.toggle_select_all()");
    k.add_func(new KeyHandler("A", ["SHIFT"], "Add"), 
               function(ctx) {
                  ctx.view3d.call_menu(ctx.view3d.add_menu(), ctx.view3d, ctx.view3d.mpos);
               });
    k.add_tool(new KeyHandler("C", [], "Circle Select"), 
               "view3d.circle_select()");
    k.add_tool(new KeyHandler("R", ["CTRL"], "Fix Normals"), 
               "mesh.normals_outside(faces=mesh_selected(f))");
    k.add(new KeyHandler("X", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
      ctx.view3d.editor.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
    }));
    k.add(new KeyHandler("Delete", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
      ctx.view3d.editor.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
    }));
    k.add(new KeyHandler("F", ["CTRL"], "Face Menu"), new FuncKeyHandler(function(ctx) {
      var mpos = ctx.keymap_mpos;
      ctx.view3d.editor.rightclick_menu_face({x : mpos[0], y : mpos[1]}, ctx.view3d);
    }));
    k.add(new KeyHandler("E", ["CTRL"], "Edge Menu"), new FuncKeyHandler(function(ctx) {
      var mpos = ctx.keymap_mpos;
      ctx.view3d.editor.rightclick_menu_edge({x : mpos[0], y : mpos[1]}, ctx.view3d);
    }));
    k.add(new KeyHandler("V", ["CTRL"], "Vertex Menu"), new FuncKeyHandler(function(ctx) {
      var mpos = ctx.keymap_mpos;
      ctx.view3d.editor.rightclick_menu_vert({x : mpos[0], y : mpos[1]}, ctx.view3d);
    }));
    k.add(new KeyHandler("W", [], "Tools Menu"), new FuncKeyHandler(function(ctx) {
      var mpos = ctx.keymap_mpos;
      ctx.view3d.tools_menu(ctx, mpos);
    }));
    k.add(new KeyHandler("E", ["SHIFT"], "Toggle Subsurf"), new FuncKeyHandler(function(ctx) {
      console.log("subsurf");
      ctx.object.subsurf ^= true;
    }));
  }

  set_selectmode(int mode) {
    this.selectmode = mode;
    this.view3d.selectmode = mode;
  }

  get_mode_highlight() : Element {
    if (this.selectmode == MeshTypes.VERT)
      return this.mesh.verts.highlight;
    else if (this.selectmode == MeshTypes.EDGE)
      return this.mesh.edges.highlight;
    else
      return this.mesh.faces.highlight;
  }

  //returns number of selected items
  do_select(event, mpos, view3d, do_multiple=false) {
    var mode;
    var macro = new ToolMacro("select_macro", "Select Macro");
    
    var highlight = this.get_mode_highlight()
    //console.log(highlight);
    
    if (!highlight)
      return 0;
    
    do_multiple |= g_app_state.select_inverse;
    
    if (!do_multiple) {
      var op = new ToggleSelectAllOp("deselect");
      op.inputs.selmode.set_data(this.selectmode);

      macro.add_tool(op);
      
      mode = "add";
    } else {
      mode = (highlight.flag & Flags.SELECT) ? "subtract" : "add";
      mode = g_app_state.select_inverse ? "subtract" : mode;
    }
    
    var op = new SelectOp(mode);
    op.inputs.selmode.set_data(this.selectmode);
    
    macro.add_tool(op);
    macro.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS

    var eid = highlight.eid;
    var type = highlight.type
    
    if (type == MeshTypes.VERT) {
      //console.log("selected vert " + eid);
      op.inputs.eid_vs.data.push(eid);
    } else if (type == MeshTypes.EDGE) {
      //console.log("selected edge " + eid);
      op.inputs.eid_es.data.push(eid);
    } else {
      //console.log("selected face " + eid);
      op.inputs.eid_fs.data.push(eid);
    }
    
    if (macro.tools.length == 1) 
      g_app_state.toolstack.exec_tool(macro.tools[0]);
    else
      g_app_state.toolstack.exec_tool(macro);
    
    return 1;
  }

  tools_menu(ctx, mpos, view3d) {
    static ops = [
      "mesh.subdivide(faces=mesh_selected(f))",
      "mesh.flip_normals(faces=mesh_selected(f))",
      "mesh.vertsmooth(verts=mesh_selected(v))"
    ];
    
    var menu = view3d.toolop_menu(ctx, "Tools", ops);
    
    view3d.call_menu(menu, view3d, mpos);
  }

  rightclick_common_ops() {
    return [
      "mesh.extrude(geometry=mesh_selected(vef))",
      "mesh.subdivide(faces=mesh_selected(f))"
    ];
  }

  rightclick_menu_vert(event, view3d) {
    var ops = this.rightclick_common_ops();
    var ctx = new Context();
    
    ops = ops.concat([
      "mesh.split_edges(edges=mesh_selected(e))",
      "mesh.context_create(verts=mesh_selected(v))"
    ])
    
    var menu = view3d.toolop_menu(ctx, "Vertex", ops);
    menu.close_on_right = true
    menu.swap_mouse_button = 2;
    
    view3d.call_menu(menu, view3d, [event.x, event.y]);
  }

  rightclick_menu_edge(event, view3d) {
    var ops = this.rightclick_common_ops();
    var ctx = new Context();
    
    ops = ops.concat([
      "mesh.split_edges(edges=mesh_selected(e))"
    ])
    
    var menu = view3d.toolop_menu(ctx, "Edges", ops);
    menu.close_on_right = true
    menu.swap_mouse_button = 2;
    
    view3d.call_menu(menu, view3d, [event.x, event.y]);
  }

  on_inactive(view3d) {
  }
  
  on_active(view3d) {
  }

  rightclick_menu_face(event, view3d) {
    var ops = this.rightclick_common_ops();
    var ctx = new Context();
    
    ops = ops.concat(
    ["mesh.flip_normals(faces=mesh_selected(f))",
     "mesh.dissolve_faces(faces=mesh_selected(f))",
     "mesh.inset_transform(faces=mesh_selected(f))"
    ])
    
    /*
    ops = []
    
    console.log("flip_max", flip_max);
    var tot = flip_max-2;
    tot = Math.max(tot, 2);
    
    for (var i=0; i<tot; i++) {
      ops = ops.concat(["mesh.flip_normals(faces=mesh_selected(f))"
      ])
    }
    // */
    
    var menu = view3d.toolop_menu(ctx, "Faces", ops);
    menu.close_on_right = true
    menu.swap_mouse_button = 2;
    
    view3d.call_menu(menu, view3d, [event.x, event.y]);
  }

  rightclick_menu(event, view3d) {
    if (this.selectmode == MeshTypes.VERT)
      this.rightclick_menu_vert(event, view3d);
    if (this.selectmode == MeshTypes.EDGE)
      this.rightclick_menu_edge(event, view3d);
    if (this.selectmode == MeshTypes.FACE)
      this.rightclick_menu_face(event, view3d);
      
  }

  on_mousemove(event) {
    var mpos = [event.x, event.y];
    
    this.mesh = this.view3d.ctx.mesh;
    
    //don't highlight elements when selecting loops,
    //except for edge mode
    if (!this.view3d.alt || this.selectmode == MeshTypes.EDGE) {
      if (this.selectmode & MeshTypes.VERT) {
        var prev = this.mesh.verts.highlight;
        var vpick;
        
        vpick = this.findnearestvert(mpos);
        this.mesh.verts.highlight = vpick;
      } else if (this.selectmode & MeshTypes.EDGE) {
        var prev = this.mesh.edges.highlight;
        var epick;
        
        epick = this.findnearestedge(mpos);
        this.mesh.edges.highlight = epick;
      } else if (this.selectmode & MeshTypes.FACE) {
        var prev = this.mesh.faces.highlight;
        var fpick;
        
        fpick = this.findnearestface(mpos);
        this.mesh.faces.highlight = fpick;
      }
    }
  }

  do_alt_select(event, mpos, view3d) {
    var e = this.findnearestedge(new Vector2(mpos));
    if (e == undefined)
      return false;
    
    var macro = new ToolMacro("select_loop", "Loop Select");
    macro.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
     
    var op = this.selectmode == MeshTypes.FACE ? new FaceLoopOp() : new EdgeLoopOp();
    
    op.inputs.eid_es.data.push(e.eid);
    op.inputs.selmode.set_data(view3d.selectmode);
    
    if (g_app_state.select_multiple || event.shiftKey) {
      op.inputs.mode.data = (e.flag & Flags.SELECT) ? "subtract" : "add";
    } else {
      op.inputs.mode.data = "add";
      macro.add_tool(new ToggleSelectAllOp("deselect"));
    }
    
    macro.add_tool(op);
    
    if (macro.tools.length == 1) 
      g_app_state.toolstack.exec_tool(macro.tools[0]);
    else
      g_app_state.toolstack.exec_tool(macro);
      
    return true;
  }

  findnearest_backbuf(Vector2 mpos, int type) {
    var pmat = new Matrix4(this.view3d.drawmats.rendermat);
    
    var mesh = this.mesh;
    
    var vpick=null;
    var size=this.sel_threshold;
    
    /*make sure the backbuffer has the right data*/
    //theoretically, always drawing edges should improve speed
    this.view3d.ensure_selbuf(type|MeshTypes.EDGE); 
    
    var selbuf = this.view3d.read_selbuf([Math.floor(mpos[0]-size/2), 
                                  Math.floor(mpos[1]-size/2)], size);
    
    var ret = undefined;
    var dis = 0;
    var x, y, x2, y2;
    
    var spiral = get_spiral(size);
    for (var i=0; i<spiral.length; i++) {
      x = spiral[i][0];
      y = spiral[i][1];
      x2 = spiral[i][0] - size/2;
      y2 = spiral[i][1] - size/2;
      
      var pix = [selbuf[(size*y+x)*4], selbuf[(size*y+x)*4+1], selbuf[(size*y+x)*4+2], selbuf[(size*y+x)*4+3]]
      
      var idx = unpack_index(pix);
      
      if (idx > 0 && ((idx-1) in mesh.sidmap)) {
        var e = mesh.sidmap[idx-1];
        
        if (e != undefined && e.type == type) {
          var d = x2*x2+y2*y2;
          if (ret == undefined || d < dis) {
            ret = idx-1;
            dis = d;
            break;
          }
        }
      }
    }
    
    if (ret == undefined)
      return null;
    else
      return mesh.sidmap[ret];
  }

  findnearestedge_mapco(Vector2 mpos) {
    var pmat = new Matrix4(this.view3d.drawmats.rendermat);
    pmat.multiply(this.object.matrix);
    
    if (this.view3d.use_backbuf_sel)
      return this.findnearest_backbuf(mpos, MeshTypes.EDGE);
      
    var epick = null;
    var limit=this.sel_threshold;
    var dis = limit;
    mpos = new Vector3([mpos[0], mpos[1], 0.0]);

    var s1 = new Vector3(); var s2 = new Vector3();
    
    for (var e in this.mesh.edges) {
      s1.load(e.v1.mapco); s2.load(e.v2.mapco);
      
      this.view3d.project(s1, pmat);
      this.view3d.project(s2, pmat);
      
      var d = dist_to_line_v2(mpos, s1, s2);
      //console.log(d)
      if (d < dis) {
        epick = e;
        dis = d;
      }
    }
    
    return epick;
  }

  findnearestedge_octree(Array<float> mpos) : Edge {
    var pmat = new Matrix4(this.view3d.drawmats.rendermat);
    pmat.multiply(this.object.matrix);
    
    //first, find a face
    var f = this.findnearestface_octree(mpos);
    if (f == undefined) return undefined;
    
    var limit = this.sel_threshold*this.sel_threshold;
    var epick = undefined;
    
    mpos = new Vector3([mpos[0], mpos[1], 0.0]);
    static s1 = new Vector3(), s2 = new Vector3();
    
    /*search face eertices for a match
      this should be pretty robust*/
    for (var e in f.edges) {
      s1.load(e.v1.co); s2.load(e.v2.co);
      
      this.view3d.project(s1, pmat);
      this.view3d.project(s2, pmat);
      
      var d = dist_to_line_v2(mpos, s1, s2);
      
      if (d < limit) {
        epick = e;
        limit = d;
      }
    }
    
    return epick;
  }
  
  findnearestedge(Vector2 mpos) {
    var pmat = new Matrix4(this.view3d.drawmats.rendermat);
    pmat.multiply(this.object.matrix);
    
    if (this.view3d.use_backbuf_sel) {
      if (use_octree_select)
        return this.findnearestedge_octree(mpos);
      else
        return this.findnearest_backbuf(mpos, MeshTypes.EDGE);
    }
    
    if (this.mesh.flag & MeshFlags.USE_MAP_CO)
      return this.findnearestedge_mapco(mpos);
      
    var epick = null;
    var limit=this.sel_threshold;
    var dis = limit;
    mpos = new Vector3([mpos[0], mpos[1], 0.0]);

    var s1 = new Vector3(); var s2 = new Vector3();
    for (var e in this.mesh.edges) {
      s1.load(e.v1.co); s2.load(e.v2.co);
      
      this.view3d.project(s1, pmat);
      this.view3d.project(s2, pmat);
      
      var d = dist_to_line_v2(mpos, s1, s2);
      if (d < dis) {
        epick = e;
        dis = d;
      }
    }
    
    return epick;
  }

  findnearestvert_mapco(Vector2 mpos) {
    var pmat = new Matrix4(this.view3d.drawmats.rendermat);
    pmat.multiply(this.object.matrix);
    
    if (this.view3d.use_backbuf_sel)
      return this.findnearest_backbuf(mpos, MeshTypes.VERT);
    
    var dis = 100000, vpick=null;
    var limit=this.sel_threshold*this.sel_threshold;
    mpos = new Vector3([mpos[0], mpos[1], 0.0]);
    
    for (var v in this.mesh.verts) {
      var co = new Vector3(v.mapco);
      co.multVecMatrix(pmat);
      
      co[0] = (co[0]+1.0)*0.5*this.view3d.size[0];
      co[1] = (co[1]+1.0)*0.5*this.view3d.size[1];
      co[2] = 0.0;
      
      co.sub(mpos);
      var d = co.dot(co);
      if (d < dis && d < limit) {
        vpick = v;
        dis = d;
      }
    }
    
    return vpick;
  }
  
  findnearestvert_octree(Array<float> mpos) : Vertex {
    var pmat = new Matrix4(this.view3d.drawmats.rendermat);
    pmat.multiply(this.object.matrix);
    
    //first, find a face
    var f = this.findnearestface_octree(mpos);
    if (f == undefined) return undefined;
    
    var limit = this.sel_threshold*this.sel_threshold;
    var vpick = undefined;
    
    mpos = new Vector3([mpos[0], mpos[1], 0.0]);
    
    /*search face vertices for a match
      this should be pretty robust*/
    for (var v in f.verts) {
      for (var e in v.edges) {
        var v2 = e.other_vert(v);
        
        var co = new Vector3(v2.co);
        this.view3d.project(co, pmat);
        
        co.sub(mpos);
        var d = co.vectorLength();
        if (vpick == undefined || d < limit) {
          vpick = v2;
          limit = d;
        }
      }
    }
    
    return vpick;
  }
  
  get sel_threshold() {
    return 75;
  }
  
  findnearestvert(Vector2 mpos) : Vertex {
    var pmat = new Matrix4(this.view3d.drawmats.rendermat);
    pmat.multiply(this.object.matrix);

    if (this.view3d.use_backbuf_sel) {
      if (use_octree_select)
        return this.findnearestvert_octree(mpos);
      else
        return this.findnearest_backbuf(mpos, MeshTypes.VERT);
    }
    
    if (this.mesh.flag & MeshFlags.USE_MAP_CO)
      return this.findnearestvert_mapco(mpos);
    
    var dis = 100000, vpick=null;
    var limit=this.sel_threshold*this.sel_threshold;
    var size = this.view3d.size;
    
    mpos = new Vector3([mpos[0], mpos[1], 0.0]);
    for (var v in this.mesh.verts) {
      var co = new Vector3(v.co);
      
      this.view3d.project(co, pmat);
      /*co.multVecMatrix(pmat);
      
      co[0] = (co[0]+1.0)*0.5*size[0];
      co[1] = (co[1]+1.0)*0.5*size[1];
      co[2] = 0.0;*/
      
      co.sub(mpos);
      
      var d = co.dot(co);
      if (d < dis && d < limit) {
        vpick = v;
        dis = d;
      }
    }
    
    return vpick;
  }

  findnearestface_mapco(Vector2 mpos) {
    var pmat = new Matrix4(this.view3d.drawmats.rendermat);
    pmat.multiply(this.object.matrix);
    
    if (this.view3d.use_backbuf_sel)
      return this.findnearest_backbuf(mpos, MeshTypes.FACE);
      
    var dis = 100000, fpick=null;
    var limit=this.sel_threshold;
    mpos = new Vector3([mpos[0], mpos[1], 0.0]);
    
    for (var f in this.mesh.faces) {
      var co = new Vector3(f.mapcenter);
      co.multVecMatrix(pmat);
      
      co[0] = (co[0]+1.0)*0.5*this.view3d.size[0];
      co[1] = (co[1]+1.0)*0.5*this.view3d.size[1];
      co[2] = 0.0;
      
      co.sub(mpos);
      var d = co.vectorLength();
      if (d < dis && d < limit) {
        fpick = f;
        dis = d;
      }
    }
    
    return fpick;
  } 
  
  findnearestface_octree(Vector2 mpos) {
    var ret = this.sample_octree(mpos);
    if (ret != undefined)
      return this.mesh.faces.get(ret[0]);
    
    /*nothing directly under the mouse cursor; do a wider sample*/
    var fs = this.sample_area(mpos, this.sel_threshold);
    
    var d = 0;
    var f = undefined;
    for (var f2 in fs) {
      if (f == undefined || f2[1] < d) {
        f = f2[0];
        d = f2[1];
      }
    }

    return f;
  }
  
  _oc_get_cached_points(int size, int samples) : Array<int> {
    static cache = {};
    
    var hash = ""+size+":"+samples;
    if (hash in cache)
      return cache[hash];
    
    //not sure if a spiral is what we want
    //var points = get_spiral(size);
    var points = [];
    for (var x=0; x<size; x++) {
      for (var y=0; y<size; y++) {
        points.push([x, y]);
      }
    }
    
    var len = points.length;
    
    var ret = [];
    var map = {};
    for (var i=0; i<samples; i++) {
      var c = Math.floor(Math.random()*len*0.99999);
      while (c in map)
        c = Math.floor(Math.random()*len*0.99999);
      
      ret.push(c);
    }
    
    //sorting random indices is only useful
    //if we're using a spiral pattern instead
    //of a grid.
    /*ret.sort(function(int a, int b) {
      return a < b ? -1 : (a > b ? 1 : 0);
    });*/
    var ret2 = [];
    
    for (i=0; i<ret.length; i++) {
      ret2.push(points[ret[i]]);
    }
    
    cache[hash] = ret2;
    
    return ret2;
  }
  
  //returns list of [face, distance from mpos] pairs
  sample_area(Array<float> mpos, int size=this.sel_threshold, int samples=IsMobile ? 7 : 25) {
    var points = this._oc_get_cached_points(size, samples);
    var mpos2 = [0, 0];
    var mesh = this.mesh;
    
    var halfsize = Math.floor(size/2);
    var lst = [];
    
    for (var i=0; i<points.length; i++) {
      if (i == 0) {
        mpos2[0] = mpos[0]; mpos2[1] = mpos[1];
      } else {
        mpos2[0] = mpos[0]+points[i][0] - halfsize;
        mpos2[1] = mpos[1]+points[i][1] - halfsize;
      }
      
      var ret = this.sample_octree(mpos2);
      if (ret != undefined) {
        var f = mesh.faces.get(ret[0]);
        
        mpos2[0] -= mpos[0];
        mpos2[1] -= mpos[1];
        
        var d = Math.sqrt(mpos2[0]*mpos2[0] + mpos2[1]*mpos2[1]);
        
        lst.push([f, d]);
      }
    }
    
    var map = {};
    var retlist = new GArray();
    
    for (var i=0; i<lst.length; i++) {
      var l = lst[i];
      var f = l[0];
      
      if (f == undefined)
        continue;
      
      if (f.eid in map) {
        if (map[f.eid] > l[1]) {
          map[f.eid] = l[1];
        }
      } else {
        map[f.eid] = l[1];
        retlist.push([f, l[1]]);
      }
    }
    
    for (var i=0; i<retlist.length; i++) {
      retlist[i][1] = map[retlist[i][0].eid];
    }
    
    return retlist;
  }
  
  sample_octree(Array<float> mpos, OcTree octree=undefined) {
    var mesh = this.mesh;
    
    if (octree == undefined)
      octree = this.ctx.object.get_octree();
    
    var size = this.view3d.size;
    static dir = new Vector3();
    static r1 = new Vector3(), r2 = new Vector3();
    static pmat = new Matrix4();
    
    dir.loadxy(mpos);
    
    dir[0] /= size[0]*0.5; dir[0] -= 1.0;
    dir[1] /= size[1]*0.5; dir[1] -= 1.0;
    
    r1.load(dir);
    r1[2] = 0.0001;
    r2.load(dir);
    r2[2] = 4000.0;
    
    pmat.load(this.view3d.drawmats.rendermat);
    pmat.multiply(this.object.matrix);
    pmat.invert();
    
    r1.multVecMatrix(pmat);
    r2.multVecMatrix(pmat);
    
    dir.load(r1).sub(r2).normalize();
    dir = new Vector3(dir);
    
    var ret = octree.isect_ray(r1, dir);
    
    return ret;
  }
  
  findnearestface(Vector2 mpos) {
    var pmat = new Matrix4(this.view3d.drawmats.rendermat);
    pmat.multiply(this.object.matrix);
    
    if (this.view3d.use_backbuf_sel) {
      if (use_octree_select)
        return this.findnearestface_octree(mpos);
      else
        return this.findnearest_backbuf(mpos, MeshTypes.FACE);
    }
    
    if (this.mesh.flag & MeshFlags.USE_MAP_CO)
      return this.findnearestface_mapco(mpos);
      
    var dis = 100000, fpick=null;
    var limit=this.sel_threshold;
    mpos = new Vector3([mpos[0], mpos[1], 0.0]);
    
    for (var f in this.mesh.faces) {
      var co = new Vector3(f.center);
      co.multVecMatrix(pmat);
      
      co[0] = (co[0]+1.0)*0.5*this.view3d.size[0];
      co[1] = (co[1]+1.0)*0.5*this.view3d.size[1];
      co[2] = 0.0;
      
      co.sub(mpos);
      var d = co.vectorLength();
      if (d < dis && d < limit) {
        fpick = f;
        dis = d;
      }
    }
    
    return fpick;
  }


  gen_delete_menu(Boolean add_title=false) {
    var view3d = this.view3d;
    var ctx = new Context();
    
    var selstr;
    if (this.selectmode == MeshTypes.VERT) selstr = "vert"
    else if (this.selectmode == MeshTypes.EDGE) selstr = "edge"
    else selstr = "face"
    
    //var dissolve_op = "mesh.dissolve_" + selstr + "(edges=mesh_selected(vef))"
    var ops = [
      "mesh.kill_verts(verts=mesh_selected(v))",
      "mesh.kill_edges(edges=mesh_selected(e))",
      "mesh.kill_regions(faces=mesh_selected(f))",
      "mesh.kill_faces(faces=mesh_selected(f))"
      //"mesh.kill_edgesfaces(edges=mesh_selected(ef))",
      //"mesh.kill_onlyfaces(edges=mesh_selected(f))",
      //dissolve_op,
    ]
    
    var menu = view3d.toolop_menu(ctx, add_title ? "Delete" : "", ops);
    return menu;
  }
  
  delete_menu(event) {
    var view3d = this.view3d;
    var ctx = new Context();
    
    var menu = this.gen_delete_menu(true);
    
    menu.close_on_right = true
    menu.swap_mouse_button = 2;
    
    view3d.call_menu(menu, view3d, [event.x, event.y]);
  }
}

MeshEditor.STRUCT = """
  MeshEditor {
    selectmode : int;
  }
"""
