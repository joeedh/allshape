"use strict";

function MeshEditor(view3d) {
  var keymap = new KeyMap();
  ObjectEditor.call(this, "Geometry", EditModes.GEOMETRY, DataTypes.MESH, keymap);
  
  this.selectmode = MeshTypes.VERT;
  this.last_selectmode = 0;
  
  var sm = this.selectmode;
  if (sm!= 2 && sm != 4 && sm != 8) this.selectmode = MeshTypes.VERT;

  this.view3d = view3d;
  
  this.mesh = view3d.mesh : Mesh;
  this.use_subsurf = 0 : Boolean;
  this.ss_mesh = undefined : Mesh;
  this.ctx = undefined : Context;
  this.gl = undefined : WebGLRenderingContext;
  this.drawmats = undefined : DrawMats;
  
  this.define_keymap();
}
inherit(MeshEditor, ObjectEditor);

MeshEditor.prototype.on_area_inactive = function(view3d) {
  this.mesh.remove_callback(view3d);
}

MeshEditor.prototype.editor_duplicate = function(view3d) {
  var m = new MeshEditor(view3d);
  
  m.selectmode = this.selectmode;
  m.keymap = this.keymap;
  m.use_subsurf = this.use_subsurf;
  
  return m;
}

MeshEditor.STRUCT = """
  MeshEditor {
    selectmode : int;
    use_subsurf : int;
  }
"""

MeshEditor.fromSTRUCT = function(reader) {
  var m = new MeshEditor(undefined);
  reader(m);
  
  return m;
}

MeshEditor.prototype.render_selbuf = function(gl, view3d, typemask) {
    if (this.ss_mesh) 
      subsurf_selbuf_render(this.gl, this.ss_mesh, this.mesh, this.drawmats, 
                            (this.selectmode|MeshTypes.FACE|typemask));
    else
      render_mesh_selbuf(this.gl, this.mesh, this.drawmats, 
                       (this.selectmode|MeshTypes.FACE|typemask));
}

MeshEditor.prototype.selbuf_changed = function(typemask) {
  return this.last_selectmode != (this.selectmode|typemask);
}

MeshEditor.prototype.reset_selbuf_changed = function(typemask) {
  this.last_selectmode = this.selectmode|typemask;
}

MeshEditor.prototype.check_subsurf = function(Context ctx) {
  if (this.use_subsurf && this.ss_mesh)
    return;
  if (!this.use_subsurf && this.ss_mesh == null)
    return;
    
  if (this.use_subsurf) {
      if (!this.ss_mesh) {
        ctx.mesh.regen_render();
        
        this.ss_mesh = gpu_subsurf(this.gl, ctx.mesh, this.get_ss_steps());
      }
    } else {
      if (ctx.view3d.editor.ss_mesh) {
        destroy_subsurf_mesh(this.gl, this.ss_mesh);
        
        this.ss_mesh = null;
        ctx.mesh.regen_render();
      }
    }  
}

MeshEditor.prototype.add_menu = function(view3d, mpos) {
  this.ctx = new Context(view3d);
  
  console.log("Add menu")
   
  var oplist = ["mesh.add_cube()", "mesh.add_circle()"]
  var menu = toolop_menu(view3d.ctx, "Add", oplist);
  view3d.call_menu(menu, view3d, mpos);
}

MeshEditor.prototype.get_ss_steps = function() : int {
  var steps = Math.floor(this.ss_steps / Math.log(this.mesh.faces.length))+1.0;
  steps = Math.max(steps, 3.0);
  
  return steps;
}

MeshEditor.prototype.draw_object = function(gl, view3d, object, is_active)
{
  this.ctx = new Context(view3d);
  this.mesh = this.ctx.mesh;
  this.gl = gl;
  this.selectmode = view3d.selectmode;
  
  this.drawmats = view3d.drawmats;
  this.check_subsurf(this.ctx);
  this.ss_steps = 24;
  
  this.mesh.update_callback(view3d, function(view3d, mesh, event) {
    if (event == MeshEvents.RECALC) {
      if (mesh.render.recalc & (RecalcFlags.REGEN_TESS|RecalcFlags.REGEN_COS)) 
      {
        view3d.redo_selbuf = true;
      }
    }
  });
  
  this.gl = gl;
  if (this.ss_mesh != null) {
    //console.log("face length: ", this.ss_mesh.faces.length);
    var steps = this.get_ss_steps();
    var ss_recalc = this.mesh.render.recalc;
    
    if (steps != this.last_steps) {
      this.last_steps = steps;
      ss_recalc |= RecalcFlags.REGEN_TESS;
    }
    
    if ((ss_recalc & RecalcFlags.REGEN_TESS)==0)
      this.mesh.render.recalc &= ~RecalcFlags.REGEN_NORS;

    if (ss_recalc != 0) {
      if (ss_recalc != RecalcFlags.REGEN_COLORS) {
        if (ss_recalc & RecalcFlags.REGEN_TESS) {
          destroy_subsurf_mesh(gl, this.ss_mesh);
          this.ss_mesh = gpu_subsurf(gl, this.mesh, steps);
        } else {
          this.ss_mesh = gpu_subsurf(gl, this.mesh, steps, this.ss_mesh);
        }
      }
      
      if (ss_recalc & RecalcFlags.REGEN_TESS)
        this.mesh.flag |= MeshFlags.USE_MAP_CO;
      
      gen_mesh_render(gl, this.mesh, this.mesh.render.drawprogram, this.mesh.render.vertprogram, this.mesh.render.recalc);        
    }
    
    this.mesh.flag |= MeshFlags.USE_MAP_CO;
    subsurf_render(gl, view3d, this.ss_mesh, this.mesh, 
                   this.drawmats, !view3d.use_backbuf_sel);
  } else {
    this.mesh.flag &= ~MeshFlags.USE_MAP_CO;
    render_mesh(gl, view3d, this.mesh, this.drawmats, !view3d.use_backbuf_sel); 
  }
}

MeshEditor.prototype.build_sidebar1 = function(view3d)
{
  var ctx = new Context(view3d);
  var row = new RowFrame(ctx);
  
  row.size = [115, view3d.size[1]-50]
  row.draw_background = true
  row.rcorner = 100.0
  row.pos = [0, 28]
  
  view3d.cols.push(row);
  view3d.add(row);
  
  row.toolop("screen.area_split_tool()", PackFlags.INHERIT_WIDTH);
  row.label("");
  
  var col = row.col()
  var row2 = col.row()
  row2.toolop("mesh.subdivide(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row2.toolop("mesh.translate()", PackFlags.INHERIT_WIDTH);
  row2.toolop("mesh.extrude(geometry=mesh_selected(vef))", PackFlags.INHERIT_WIDTH);
  row2.toolop("mesh.rotate()", PackFlags.INHERIT_WIDTH);
  
  row2 = col.row()
  row2.toolop("mesh.scale()", PackFlags.INHERIT_WIDTH);
  row2.toolop("mesh.flip_normals(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row2.toolop("mesh.triangulate(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row2.toolop("mesh.tri2quad(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  
  row.toolop("mesh.duplicate_transform()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.bridge_edges(edges=mesh_selected(e))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.vertsmooth(verts=mesh_selected(v))", PackFlags.INHERIT_WIDTH);

  row.label("Last Tool:", false)
  row.add(new ToolOpFrame(ctx, "last_tool"), PackFlags.INHERIT_WIDTH);
}

MeshEditor.prototype.build_bottombar = function(view3d)
{
  var ctx = new Context(view3d);
  var col = new ColumnFrame(ctx);
  
  col.draw_background = true;
  col.rcorner = 100.0
  col.pos = [0,0]
  col.size = [view3d.size[0], 30];
  
  col.prop("view3d.use_subsurf");
  
  //col.add(new UIMenuLabel(this.ctx, "File", undefined, gen_file_menu));
  col.label("  |  Select Mode:  ");
  col.prop("view3d.selectmode");
  col.prop("view3d.use_backbuf_sel");
  col.label("  |   ");
  col.prop("view3d.zoomfac");
  
  view3d.rows.push(col);
  view3d.add(col);
}

MeshEditor.prototype.define_keymap = function() {
  var k = this.keymap;
  
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
              ctx.view3d.add_menu();
             });
  k.add_tool(new KeyHandler("C", [], "Circle Select"), 
             "view3d.circle_select()");
  k.add(new KeyHandler("X", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
    ctx.view3d.editor.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
  }));
  k.add(new KeyHandler("Delete", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
    ctx.view3d.editor.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
  }));
  k.add(new KeyHandler("F", ["CTRL"], "Face Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.editor.rightclick_menu_face({x : mpos[0], y : mpos[1]});
  }));
  k.add(new KeyHandler("E", ["CTRL"], "Edge Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.editor.rightclick_menu_edge({x : mpos[0], y : mpos[1]});
  }));
  k.add(new KeyHandler("V", ["CTRL"], "Vertex Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.editor.rightclick_menu_vert({x : mpos[0], y : mpos[1]});
  }));
  k.add(new KeyHandler("W", [], "Tools Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.tools_menu(ctx, mpos);
  }));
  k.add(new KeyHandler("E", ["SHIFT"], "Toggle Subsurf"), new FuncKeyHandler(function(ctx) {
    console.log("subsurf");
    if (ctx.view3d.editor.ss_mesh == null) {
      ctx.mesh.regen_render();
      ctx.view3d.editor.ss_mesh = gpu_subsurf(ctx.view3d.gl, ctx.mesh, ctx.view3d.editor.get_ss_steps());
    } else {
      destroy_subsurf_mesh(ctx.view3d.gl, ctx.view3d.editor.ss_mesh);
      ctx.view3d.editor.ss_mesh = null;
      ctx.mesh.regen_render();
    }
  }));
  k.add(new KeyHandler("T", [], "Toggle Select Mode"), new FuncKeyHandler(function(ctx) {
    var mode = ctx.view3d.editor.selectmode;
    
    if (mode == MeshTypes.VERT)
      mode = MeshTypes.EDGE;
    else if (mode == MeshTypes.EDGE)
      mode = MeshTypes.FACE;
    else if (mode == MeshTypes.FACE)
      mode = MeshTypes.VERT;
      
    ctx.view3d.editor.set_selectmode(mode);
  }));
}

MeshEditor.prototype.set_selectmode = function(int mode) {
  this.selectmode = mode;
  this.view3d.selectmode = mode;
}

MeshEditor.prototype.get_mode_highlight = function() : Element {
  if (this.selectmode == MeshTypes.VERT)
    return this.mesh.verts.highlight;
  else if (this.selectmode == MeshTypes.EDGE)
    return this.mesh.edges.highlight;
  else
    return this.mesh.faces.highlight;
}

//returns number of selected items
MeshEditor.prototype.do_select = function(event, mpos, view3d) {
  var mode;
  var macro = new ToolMacro("select_macro", "Select Macro");
  
  var highlight = this.get_mode_highlight()
  console.log(highlight);
  
  if (!highlight)
    return 0;
  
  if (!this.shift) {
    var op = new ToggleSelectAllOp("deselect");
    op.inputs.selmode.set_data(this.selectmode);

    macro.add_tool(op);
    
    mode = "add";
  } else {
    mode = (highlight.flag & Flags.SELECT) ? "subtract" : "add";
  }
  
  var op = new SelectOp(mode);
  op.inputs.selmode.set_data(this.selectmode);
  
  macro.add_tool(op);
  macro.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS

  var eid = highlight.eid;
  var type = highlight.type
  
  if (type == MeshTypes.VERT) {
    console.log("selected vert " + eid);
    op.inputs.eid_vs.data.push(eid);
  } else if (type == MeshTypes.EDGE) {
    console.log("selected edge " + eid);
    op.inputs.eid_es.data.push(eid);
  } else {
    console.log("selected face " + eid);
    op.inputs.eid_fs.data.push(eid);
  }
  
  if (macro.tools.length == 1) 
    view3d.toolstack.exec_tool(macro.tools[0]);
  else
    view3d.toolstack.exec_tool(macro);
  
  return 1;
}

MeshEditor.prototype.tools_menu = function(event, view3d) {
  var ops = [
    "mesh.subdivide(faces=mesh_selected(f))",
    "mesh.flip_normals(faces=mesh_selected(f))",
    "mesh.vertsmooth(verts=mesh_selected(v))"
  ]
  
  var menu = view3d.toolop_menu(ctx, "Tools", new Vec2([event.x, event.y]));
  view3d.call_menu(menu, view3d, pos);
}

MeshEditor.prototype.rightclick_common_ops = function() {
  return [
    "mesh.extrude(geometry=mesh_selected(vef))",
    "mesh.subdivide(faces=mesh_selected(f))"
  ];
}

MeshEditor.prototype.rightclick_menu_vert = function(event, view3d) {
  var ops = this.rightclick_common_ops();
  var ctx = new Context(view3d);
  
  ops = ops.concat([
    "mesh.split_edges(edges=mesh_selected(e))",
    "mesh.context_create(verts=mesh_selected(v)"
  ])
  
  var menu = view3d.toolop_menu(ctx, "Vertex", ops);
  menu.close_on_right = true
  menu.swap_mouse_button = 2;
  
  view3d.call_menu(menu, view3d, [event.x, event.y]);
}

MeshEditor.prototype.rightclick_menu_edge = function(event, view3d) {
  var ops = this.rightclick_common_ops();
  var ctx = new Context(view3d);
  
  ops = ops.concat([
    "mesh.split_edges(edges=mesh_selected(e))"
  ])
  
  var menu = view3d.toolop_menu(ctx, "Edges", ops);
  menu.close_on_right = true
  menu.swap_mouse_button = 2;
  
  view3d.call_menu(menu, view3d, [event.x, event.y]);
}

MeshEditor.prototype.rightclick_menu_face = function(event, view3d) {
  var ops = this.rightclick_common_ops();
  var ctx = new Context(view3d);
  
  ops = ops.concat(
  ["mesh.flip_normals(faces=mesh_selected(f))",
   "mesh.dissolve_faces(faces=mesh_selected(f))",
   "mesh.inset()"
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

MeshEditor.prototype.rightclick_menu = function(event, view3d) {
  if (this.selectmode == MeshTypes.VERT)
    this.rightclick_menu_vert(event, view3d);
  if (this.selectmode == MeshTypes.EDGE)
    this.rightclick_menu_edge(event, view3d);
  if (this.selectmode == MeshTypes.FACE)
    this.rightclick_menu_face(event, view3d);
    
}


MeshEditor.prototype.on_mousemove = function(event) {
  var mpos = [event.x, event.y];
  
  this.mesh = this.view3d.mesh;
  
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

MeshEditor.prototype.do_alt_select = function(event, mpos, view3d) {
  var e = this.findnearestedge(new Vector2(mpos));
  if (e == undefined)
    return false;
  
  var macro = new ToolMacro("Loop Select");
  macro.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
   
  var op = this.selectmode == MeshTypes.FACE ? new FaceLoopOp() : new EdgeLoopOp();
  
  op.inputs.eid_es.data.push(e.eid);
  
  if (event.shiftKey) {
    op.inputs.mode.data = (e.flag & Flags.SELECT) ? "subtract" : "add";
  } else {
    op.inputs.mode.data = "add";
    macro.add_tool(new ToggleSelectAllOp("deselect"));
  }
  
  macro.add_tool(op);
  
  if (macro.tools.length == 1) 
    view3d.toolstack.exec_tool(macro.tools[0]);
  else
    view3d.toolstack.exec_tool(macro);
    
  return true;
}

MeshEditor.prototype.findnearest_backbuf = function(Vector2 mpos, int type) {
  var pmat = new Matrix4(this.drawmats.rendermat);
  
  var mesh = this.mesh;
  
  var vpick=null;
  var size=75;
  
  /*make sure the backbuffer has the right data*/
  //theoretically, always drawing edges should improve speed
  this.view3d.ensure_selbuf(type|MeshTypes.EDGE); 
  
  var selbuf = this.view3d.read_selbuf([Math.floor(mpos[0]-size/2), 
                                Math.floor(mpos[1]-size/2)], size);
  
  var ret = undefined;
  var dis = 0;
  var x, y, x2, y2;
  
  var spiral = _get_spiral(size);
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

MeshEditor.prototype.findnearestedge_mapco = function(Vector2 mpos) {
  var pmat = new Matrix4(this.view3d.drawmats.rendermat);
  
  if (this.view3d.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.EDGE);
    
  var epick = null;
  var limit=750;
  var dis = limit;
  mpos = new Vector3([mpos[0], mpos[1], 0.0]);

  var s1 = new Vector3(); var s2 = new Vector3();
  var project = this.view3d.project;
  
  for (var e in this.mesh.edges) {
    s1.load(e.v1.mapco); s2.load(e.v2.mapco);
    
    project(s1, pmat);
    project(s2, pmat);
    
    var d = dist_to_line_v2(mpos, s1, s2);
    //console.log(d)
    if (d < dis) {
      epick = e;
      dis = d;
    }
  }
  
  return epick;
}

MeshEditor.prototype.findnearestedge = function(Vector2 mpos) {
  var pmat = new Matrix4(this.view3d.drawmats.rendermat);
  mpos = new Vector2(mpos);
  
  if (this.view3d.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.EDGE);
    
  if (this.mesh.flag & MeshFlags.USE_MAP_CO)
    return this.findnearestedge_mapco(mpos);
    
  var epick = null;
  var limit=75;
  var dis = limit;
  mpos = new Vector3([mpos[0], mpos[1], 0.0]);

  var project = this.view3d.project;
  var s1 = new Vector3(); var s2 = new Vector3();
  for (var e in this.mesh.edges) {
    s1.load(e.v1.co); s2.load(e.v2.co);
    
    project(s1, pmat);
    project(s2, pmat);
    
    var d = dist_to_line_v2(mpos, s1, s2);
    //console.log(d)
    if (d < dis) {
      epick = e;
      dis = d;
    }
  }
  
  return epick;
}

MeshEditor.prototype.findnearestvert_mapco = function(Vector2 mpos) {
  var pmat = new Matrix4(this.view3d.drawmats.rendermat);
  
  if (this.view3d.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.VERT);
  
  var dis = 100000, vpick=null;
  var limit=75*75;
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

MeshEditor.prototype.findnearestvert = function(Vector2 mpos) {
  var pmat = new Matrix4(this.view3d.drawmats.rendermat);

  if (this.view3d.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.VERT);
  
  if (this.mesh.flag & MeshFlags.USE_MAP_CO)
    return this.findnearestvert_mapco(mpos);
  
  var dis = 100000, vpick=null;
  var limit=75*75;
  var size = this.view3d.size;
  
  mpos = new Vector3([mpos[0], mpos[1], 0.0]);
  for (var v in this.mesh.verts) {
    var co = new Vector3(v.co);
    co.multVecMatrix(pmat);
    
    co[0] = (co[0]+1.0)*0.5*size[0];
    co[1] = (co[1]+1.0)*0.5*size[1];
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

MeshEditor.prototype.findnearestface_mapco = function(Vector2 mpos) {
  var pmat = new Matrix4(this.view3d.drawmats.rendermat);
  
  if (this.view3d.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.FACE);
    
  var dis = 100000, fpick=null;
  var limit=75;
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

MeshEditor.prototype.findnearestface = function(Vector2 mpos) {
  var pmat = new Matrix4(this.view3d.drawmats.rendermat);
  
  if (this.view3d.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.FACE);

  if (this.mesh.flag & MeshFlags.USE_MAP_CO)
    return this.findnearestface_mapco(mpos);
    
  var dis = 100000, fpick=null;
  var limit=75;
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


MeshEditor.prototype.delete_menu = function(event) {
  var view3d = this.view3d;
  var ctx = new Context(view3d);
  
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
  
  var menu = view3d.toolop_menu(ctx, "Delete", ops);
  menu.close_on_right = true
  menu.swap_mouse_button = 2;
  
  view3d.call_menu(menu, view3d, [event.x, event.y]);
}
