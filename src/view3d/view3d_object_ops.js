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

  define_keymap() {
    var k = this.keymap;
    k.add_tool(new KeyHandler("G", [], "Translate"), 
               "object.translate()");
    /*k.add_tool(new KeyHandler("S", [], "Scale"), 
               "object.scale()");
    k.add_tool(new KeyHandler("R", [], "Rotate"), 
               "object.rotate()");*/
    
    k.add_tool(new KeyHandler("D", ["SHIFT"], "Duplicate"),
               "object.duplicate()");
  }
  
  static fromSTRUCT(reader) {
    var obj = new ObjectEditor();
    reader(obj);
    
    return obj;
  }

  on_area_inactive(view3d) {
  }

  //returns new copy
  editor_duplicate(view3d) {
  }
  render_selbuf(gl, view3d, typemask) {
  }
  selbuf_changed(typemask) {
  }
  reset_selbuf_changed(typemask) {
  }
  add_menu(view3d, mpos) {
  }
  
  on_inactive(view3d) {
  }
  
  on_active(view3d) {
  }
  
  draw_object(gl, view3d, object, is_active) {
    view3d.draw_object_basic(gl, object, is_active);
  }
  
  build_sidebar1(view3d)
  {
    var ctx = new Context();
    var row = new RowFrame(ctx);
    
    row.size = [115, view3d.size[1]-50]
    row.draw_background = true
    row.rcorner = 100.0
    row.pos = [0, 28]
    
    view3d.cols.push(row);
    view3d.add(row);
    
    row.toolop("screen.area_split_tool()", PackFlags.INHERIT_WIDTH);
    row.label("");
    
    row.label("Last Tool:", false)
    row.add(new ToolOpFrame(ctx, "last_tool"), PackFlags.INHERIT_WIDTH);
  }
  
  build_bottombar(view3d) {
    var ctx = new Context();
    var col = new ColumnFrame(ctx);
    
    col.draw_background = true;
    col.rcorner = 100.0
    col.pos = [0,0]
    col.size = [view3d.size[0], 30];
    
    col.prop("object.use_subsurf");
    
    //col.add(new UIMenuLabel(this.ctx, "File", undefined, gen_file_menu));
    col.label("  |  Select Mode:  ");
    col.prop("view3d.selectmode");
    col.prop("view3d.use_backbuf_sel");
    col.label("  |   ");
    col.prop("view3d.zoomfac");
    
    view3d.rows.push(col);
    view3d.add(col);
  }
  set_selectmode(int mode) {
  }

  //returns number of selected items
  do_select(event, mpos, view3d) {
  }
  tools_menu(event, view3d) {
  }
  rightclick_menu(event, view3d) {
  }
  on_mousemove(event) {
  }
  do_alt_select(event, mpos, view3d) {
  }
  delete_menu(event) {
  }
}

ObjectEditor.STRUCT = """
  ObjectEditor {
  }
""";
