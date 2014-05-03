var selectmode_enum = new EnumProperty("FACE", 
  {
    VERT : EditModes.VERT, 
    EDGE : EditModes.EDGE,
    FACE : EditModes.FACE,
    OBJECT : EditModes.OBJECT
  }, 
  "selmode", "Select Mode", "Selection mode");

selectmode_enum.add_icons({
  VERT : Icons.VERT_SEL,
  EDGE : Icons.EDGE_SEL,
  FACE : Icons.FACE_SEL,
  OBJECT : Icons.OBJECT_SEL
});

selectmode_enum.ui_value_names = {
  VERT: "Vertices", 
  EDGE: "Edges", 
  FACE: "Faces",
  OBJECT : "Object"
 };

var csg_mode_enum = new EnumProperty("SUBTRACT",
  {
    SUBTRACT : CsgModes.SUBTRACT,
    INTERSECT : CsgModes.INTERSECT,
    UNION : CsgModes.UNION
  },
  "csg_mode", "CSG Mode", "CSG Mode");

csg_mode_enum.ui_value_names = {
    SUBTRACT : "Subtract",
    INTERSECT : "Intersect",
    UNION : "Union"
}

function api_define_view3d() {
  var selmode = selectmode_enum.copy();
  
  selmode.update = function() {
    this.ctx.view3d.selectmode = this.values[this.data];
  }
  
  var zoomfac = new FloatProperty(0, "zoomfac", "Zoom", "Zoom Factor", [-7, 7], [-7, 7]);
  zoomfac.update = function() {
    var view3d = this.ctx.view3d;
    
    var zf = view3d.zoomfac;
    var r1 = view3d.zoom_wheelrange[0];
    var r2 = view3d.zoom_wheelrange[1];
    var r3 = view3d.zoom_range[0];
    var r4 = view3d.zoom_range[1];
    
    view3d.zoomwheel = (-r1*r4 + r1*zf + r2*r3 - r2*zf) / (r3 - r4);

    view3d.gen_rendermats();
    view3d.update_selbuf();
  }
  
  var use_backbuf_sel = new BoolProperty(false, "use_backbuf_sel", "Cull Select", "Cull backface geometry when selecting");
  
  use_backbuf_sel.update = function() {
    this.ctx.view3d.use_backbuf_sel = this.data;
  }
  
  var framerate_prop = new FloatProperty(0, "framerate", "Frame Rate", 
                                            "Number of frames rendered each secon", 
                                            [0, 250], [0, 250]);
  
  var test_flagprop = new FlagProperty(1, {FLAG_1 : 1, FLAG_2 : 2, FLAG_3 : 4, FLAG_4 : 3}, undefined, "flagprop", "Flag Property", "");
  
  View3DStruct = new DataStruct([
    new DataPath(selmode, "selectmode", "selectmode", true),
    new DataPath(zoomfac, "zoomfac", "zoomfac", true),
    new DataPath(framerate_prop, "framerate", "framerate", true),
    new DataPath(new Vec3Property(undefined, "test"), "test", "test", true),
    new DataPath(use_backbuf_sel, "use_backbuf_sel", "use_backbuf_sel", 
    true)
  ])
  
  return View3DStruct;
}

function api_define_mesh() {

  var totvert = new IntProperty(0, "totvert", "Verts", 
                                "Number of vertices in this mesh", 
                                [0, 60000000], [0, 60000000]);

  var totedge = new IntProperty(0, "totedge", "Edges", 
                                            "Number of edges in this mesh", 
                                            [0, 60000000], [0, 60000000]);

  var totface = new IntProperty(0, "totface", "Faces", 
                                            "Number of faces in this mesh", 
                                            [0, 60000000], [0, 60000000]);
  var tottri = new IntProperty(0, "tottri", "Tris", 
                                            "Number of triangles in this mesh", 
                                            [0, 60000000], [0, 60000000]);

                                            
  MeshStruct = new DataStruct([
    new DataPath(totvert, "totvert", "verts.length", true),
    new DataPath(totedge, "totedge", "edges.length", true),
    new DataPath(totface, "totface", "faces.length", true),
    new DataPath(tottri, "tottri", "looptris.length", true)
  ]);
  
  return MeshStruct;
}

var SceneStruct = undefined;
function api_define_scene() {
  var name = new StringProperty("", "name", "name", "Name", TPropFlags.LABEL);
  var SceneStruct = new DataStruct([
    new DataPath(name, "name", "name", true)
  ]);
  
  return SceneStruct;
}

var ObjectStruct = undefined;
function api_define_object() {
  
  var name = new StringProperty("", "name", "name", "Name", TPropFlags.LABEL);
  var use_subsurf = new BoolProperty(false, "use_subsurf", "Use Subsurf", "Enable subdivision surface rendering");
  var use_csg = new BoolProperty(false, "use_csg", "Enable CSG", "Enable CSG rendering")
  var csg_mode = csg_mode_enum.copy();
  
  csg_mode.update = function() {
    this.ctx.object.csg_mode = this.values[this.data];
  }
  
  var ObjectStruct = new DataStruct([
    new DataPath(name, "name", "name", true),
    new DataPath(use_subsurf, "use_subsurf", "subsurf", true),
    new DataPath(use_csg, "use_csg", "csg", true),
    new DataPath(csg_mode, "csg_mode", "csg_mode", true)
  ]);
  
  return ObjectStruct;
}

var AppStateStruct = undefined;
function api_define_appstate() {
  var sel_multiple_mode = new BoolProperty(false, "select_multiple", "Multiple", "Select multiple elements");
  var sel_inverse_mode = new BoolProperty(false, "select_inverse", "Deselect", "Deselect Elements");
    
  AppStateStruct = new DataStruct([
    new DataPath(sel_multiple_mode, "select_multiple", "select_multiple", true),
    new DataPath(sel_inverse_mode, "select_inverse", "select_inverse", true)
  ]);
  
  return AppStateStruct;
}

function get_tool_struct(tool) { 
  var name = new StringProperty("name", "name", "name", "Name", TPropFlags.LABEL);
  var test_flagprop = new FlagProperty(1, {FLAG_1 : 1, FLAG_2 : 2, FLAG_3 : 4, FLAG_4 : 3}, undefined, "flagprop", "Flag Property", "");
  test_flagprop.data = 1;
  
  static ret = undefined;
  if (ret == undefined) {
    ret = new DataStruct([
            new DataPath(name, "name", "uiname", true, true),
            new DataPath(test_flagprop, "test", "", true, false)
          ]);
  }
  
  return ret;
  /*
  if (tool._datastruct != undefined)
    return tool._datastruct;
  
  tool._datastruct = g_app_state.toolstack.gen_tool_datastruct(tool);
  return tool._datastruct;
 // */
}

var ContextStruct = undefined;
function api_define_context() {
  ContextStruct = new DataStruct([
    new DataPath(api_define_view3d(), "view3d", "ctx.view3d", false),
    new DataPath(api_define_mesh(), "mesh", "ctx.mesh", false),
    new DataPath(api_define_object(), "object", "ctx.object", false),
    new DataPath(api_define_scene(), "scene", "ctx.scene", false),
    new DataPath(new DataStruct([]), "last_tool", "", false, false, DataFlags.RECALC_CACHE),
    new DataPath(api_define_appstate(), "appstate", "ctx.appstate", false),
    new DataPath(new DataStructArray(get_tool_struct), "operator_stack", 
                 "ctx.appstate.toolstack.undostack", false)
  ]);
}

function gen_path_maps(strct, obj, path1, path2) {//path is private, optional
  if (obj == undefined)
    obj = {}
  if (path1 == undefined) {
    path1 = "";
    path2 = "";
  }
  
  if (path1 != "")
    obj[path1] = strct;
  
  for (var p in strct.paths) {
    if (!(p.data instanceof DataStruct)) {
      if (p.use_path) {
        obj[path1+"."+p.path] = "r = " + path2+"."+p.path+"; obj["+path1+"].pathmap["+p.path+"]"
      } else {
        obj[path1+"."+p.path] = "r = undefined; obj["+path1+"].pathmap["+p.path+"]"
      }
    } else {
      gen_path_maps(p, obj, path1+p.name, path2+p.path);
    }
  }
}
