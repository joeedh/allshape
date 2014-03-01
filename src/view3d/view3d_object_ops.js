"use strict";

class ObjectEditor extends View3DEditor {
  constructor(view3d) {
    var keymap = new KeyMap();
    this.view3d = view3d;
    this.ctx = new Context();
    
    View3DEditor.call(this, "Object", EditModes.OBJECT, DataTypes.OBJECT, keymap);
    this.define_keymap()
  }

  define_keymap() {
    var k = this.keymap;
    k.add_tool(new KeyHandler("G", [], "Translate"), 
               "object.translate()");
    k.add_tool(new KeyHandler("S", [], "Scale"), 
               "object.scale()");
    k.add_tool(new KeyHandler("R", [], "Rotate"), 
               "object.rotate()");
  }
  
  static fromSTRUCT(reader) {
    var obj = {};
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
    if (object.data instanceof Mesh) {
      render_mesh_object(gl, view3d, object.data, view3d.drawmats);
    }
  }
  
  build_sidebar1(view3d) {
  }
  build_bottombar(view3d) {
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
