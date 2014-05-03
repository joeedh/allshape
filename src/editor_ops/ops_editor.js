"use strict";

class OpStackFrame extends RowFrame {
  constructor(Context ctx, Array<float> size) {
    RowFrame.call(this, ctx);
    
    this.pos = [0, 0];
    this.size = size;
    
    this.packflag |= PackFlags.ALIGN_TOP;
    this.default_packflag |= PackFlags.INHERIT_WIDTH;
    
    var test_panel = new UIPanel(ctx, "Test Panel");
    test_panel.add(new UIButton(ctx, "test panel"));
    test_panel.add(new UIButton(ctx, "test panel"));
    test_panel.add(new UIButton(ctx, "test panel"));
    
    this.add(test_panel);
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    canvas.simple_box([0, Area.get_barhgt()], this.size, [0.2, 0.2, 0.2, 0.8]);
    
    prior(OpStackFrame, this).build_draw.call(this, canvas, isVertical);
  }
}

class OpStackEditor extends Area {
  constructor(x, y, width, height) {
    Area.call(this, OpStackEditor.name, OpStackEditor.uiname, new Context(), [x, y], [width, height]);

    this.keymap = new KeyMap();
    this.define_keymap();
    
    this.drawlines = new GArray<drawlines>();
    
    this.pan = new Vector2();
    this.gl = undefined;
    this.ctx = new Context();
    
    this.subframe = new OpStackFrame(new Context(), this.size);
    this.add(this.subframe);
  }
  
  static default_new(Context ctx, ScreenArea scr, WebGLRenderingContext gl, 
                     Array<float> pos, Array<float> size) : OpStackEditor
  {
    var ret = new OpStackEditor(pos[0], pos[1], size[0], size[1]);
    return ret;
  }
  
  area_duplicate() : OpStackEditor {
    var ret = new OpStackEditor(this.pos[0], this.pos[1], this.size[0], this.size[1]);
    
    return ret;
  }
  
  destroy() {
    Area.prototype.destroy.call(this);
  }
  
  build_bottombar() {
    var ctx = new Context();
    var col = new ColumnFrame(ctx);
    
    col.packflag |= PackFlags.ALIGN_LEFT;
    col.default_packflag = PackFlags.ALIGN_LEFT;
    
    //IsMobile ? 12 : 12
    col.draw_background = true;
    col.rcorner = 100.0
    col.pos = [0, 2]
    col.size = [this.size[0], Area.get_barhgt()];
    
    col.add(gen_editor_switcher(this.ctx, this));
    
    this.rows.push(col);
    this.add(col);
  }
  
  set_canvasbox() {
    this.asp = this.size[0] / this.size[1];
    
    //Set the viewport and projection matrix for the scene
    gl.viewport(this.parent.pos[0], this.parent.pos[1], this.size[0], this.size[1]);
  }
  
  on_draw(WebGLRenderingContext gl, test) {
    this.gl = gl;
    var ctx = this.ctx = new Context();
    
    this.subframe.size[0] = this.size[0];
    this.subframe.size[1] = this.size[1];
    this.subframe.canvas = this.canvas;
    
    //gl.getExtension("OES_TEXTURE_FLOAT");
    //this.draw_lines(gl)data;

    this.set_canvasbox();
    Area.prototype.on_draw.call(this, gl)
  }
  
  on_keyup(KeyboardEvent event) {
    var ctx = new Context();
    var ret = this.keymap.process_event(ctx, event);
    
    if (ret != undefined) {
      ret.handle(ctx);
    }
  }
  
  on_keydown(Keyboard event) {
    this.shift = event.shiftKey;
    this.alt = event.altKey;
    this.ctrl = event.ctrlKey;
  }
 
  static fromSTRUCT(reader) {
    var obj = new OpStackEditor(0, 0, 1, 1);
    reader(obj);
    
    return obj;
  }
  
  data_link(DataBlock block, Function getblock, Function getblock_us) {
    
  }
}

OpStackEditor.STRUCT = STRUCT.inherit(OpStackEditor, Area) + """
    pan : array(float);
  }
"""

OpStackEditor.uiname = "Operator Stack";
