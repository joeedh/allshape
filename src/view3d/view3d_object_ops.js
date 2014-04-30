"use strict";

class ObjectEditor extends View3DEditor {
  constructor(view3d=undefined) {
    var keymap = new KeyMap();
    this.view3d = view3d;
    
    if (view3d != undefined)
      this.ctx = new Context();
    else
      this.ctx = undefined;
    
    View3DEditor.call(this, "Object", EditModes.OBJECT, DataTypes.OBJECT, keymap);
    this.define_keymap()
  }
  
  on_gl_lost(WebGLRenderingContext new_gl) {
    this.gl = gl;
  }

  define_keymap() {
    var k = this.keymap;
    k.add_tool(new KeyHandler("G", [], "Translate"), 
               "object.translate()");
    k.add_tool(new KeyHandler("A", [], "Select All"), 
               "object.toggle_select_all()");
               
    k.add(new KeyHandler("X", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
      console.log("delete menu");
      ctx.view3d.editor.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
    }));
    k.add(new KeyHandler("Delete", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
      ctx.view3d.editor.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
    }));
    
    k.add_tool(new KeyHandler("P", ["CTRL"], "Parent"), 
               "object.set_parent()");
    
    /*k.add_tool(new KeyHandler("S", [], "Scale"), 
               "object.scale()");
    k.add_tool(new KeyHandler("R", [], "Rotate"), 
               "object.rotate()");*/
    
    k.add_tool(new KeyHandler("D", ["SHIFT"], "Duplicate"),
               "object.duplicate()");
  }
  
  gen_delete_menu(Boolean add_title=false) {
    var view3d = this.view3d;
    var ctx = new Context();
    
    console.log("object delete_menu");
    var ops = [
      "object.delete_selected()"
    ];
    
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

  static fromSTRUCT(reader) {
    var obj = new ObjectEditor();
    reader(obj);
    
    return obj;
  }

  on_area_inactive(view3d) {
  }

  //returns new copy
  editor_duplicate(view3d) : View3DEditor {
    var ret = new ObjectEditor(view3d);
    
    return ret;
  }
  
  render_selbuf(gl, view3d, typemask) {
    view3d.render_selbuf_obj(gl, view3d.ctx.object, typemask|EditModes.OBJECT);
  }
  selbuf_changed(typemask) {
  }
  reset_selbuf_changed(typemask) {
  }
  
  add_menu(view3d, mpos, add_title=true) {
    var oplist = [];
    var menu = toolop_menu(view3d.ctx, add_title ? "Add" : "", oplist);
    
    return menu;
  }
  
  on_inactive(view3d) {
  }
  
  on_active(view3d) {
  }
  
  on_tick(ctx) {
    this.object = ctx.object;
  }
  
  draw_object(gl, view3d, object, is_active) {
    this.object = object;
    var drawmode = gl.TRIANGELS;
    
    if (object.csg) {
      drawmode = gl.LINES;
    }
    
    view3d.draw_object_basic(gl, object, drawmode, is_active);
  }
  
  build_sidebar1(view3d)
  {
    var ctx = new Context();
    var row = new RowFrame(ctx);
    
    row.size = [148, view3d.size[1]-Area.get_barhgt()*2.0]
    row.draw_background = true
    row.rcorner = 100.0
    row.pos = [0, Area.get_barhgt()]
    
    view3d.cols.push(row);
    view3d.add(row);
    
    //XXX
    //if (!RELEASE)
      row.toolop("screen.area_split_tool()", PackFlags.INHERIT_WIDTH);
      
    row.toolop("object.set_parent()", PackFlags.INHERIT_WIDTH);
    row.label("");
    
    row.label("Last Tool:", false)
    row.add(new ToolOpFrame(ctx, "last_tool"), PackFlags.INHERIT_WIDTH);
  }
  
  build_bottombar(view3d) {
    var ctx = new Context();
    var col = new ColumnFrame(ctx);
    
    col.packflag |= PackFlags.ALIGN_LEFT;
    col.default_packflag = PackFlags.ALIGN_LEFT;
    
    col.draw_background = true;
    col.rcorner = 100.0
    col.pos = [0, 0]
    col.size = [view3d.size[0], Area.get_barhgt()];
    
    col.label("        Selection Mode:");
    col.prop("view3d.selectmode", PackFlags.ENUM_STRIP|PackFlags.USE_SMALL_ICON);
    col.prop("view3d.use_backbuf_sel");
    col.label("  |  ");
    col.prop("view3d.zoomfac");
    
    col.label("  |  ");
    col.prop("object.use_subsurf");
    col.prop("object.use_csg");
    col.prop("object.csg_mode");
    
    view3d.rows.push(col);
    view3d.add(col);
  }
  
  set_selectmode(int mode) {
  }
  
  findnearestobj(mpos, view3d) {
    var size = 75;
    
    console.log("in object select");
    view3d.ensure_selbuf(view3d.selectmode|EditModes.OBJECT);
    
    var selbuf = view3d.read_selbuf([Math.floor(mpos[0]-size/2), 
                                  Math.floor(mpos[1]-size/2)], size);
    
    var ret = undefined;
    var dis = 0;
    var x, y, x2, y2;
    
    //console.log(selbuf);
    var spiral = get_spiral(size);
    for (var i=0; i<spiral.length; i++) {
      x = spiral[i][0];
      y = spiral[i][1];
      x2 = spiral[i][0] - size/2;
      y2 = spiral[i][1] - size/2;
      
      var pix = [selbuf[(size*y+x)*4], selbuf[(size*y+x)*4+1], selbuf[(size*y+x)*4+2], selbuf[(size*y+x)*4+3]]
      
      var idx = unpack_index(pix)-1;
      var ob = undefined;
      if (idx > 0) {
        var ref = view3d.sidmap[idx];
        console.log(idx);
        if (ref != undefined && ref instanceof DataRef) {
          var ob = this.ctx.datalib.get(ref);
          if (ob instanceof ASObject) {
            console.log("found object idx:", ob.lib_id);
            break;
          } else {
            ob = undefined;
          }
        }
      }
    }
    
    return ob;
  }
  
  //returns number of selected items
  do_select(event, mpos, view3d, do_multiple=false) {
    var ob = this.findnearestobj(mpos, view3d);
    
    if (ob == undefined) return;
    console.log(ob);
    
    var mode = "set";
    if (do_multiple) 
      mode = (ob.flag & SELECT) ? "subtract" : "add";
    
    var tool = new SelectObjectOp(mode);
    tool.inputs.objects.set_data([ob]);
    
    g_app_state.toolstack.exec_tool(tool);
    //view3d.update_selbuf();
  }
  
  tools_menu(ctx, mpos, view3d) {
  }
  
  rightclick_menu(event, view3d) {
  }
  on_mousemove(event) {
  }
  do_alt_select(event, mpos, view3d) {
  }
}

ObjectEditor.STRUCT = """
  ObjectEditor {
  }
""";
