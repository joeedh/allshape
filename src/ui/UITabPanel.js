"use strict";

class _UITab {
  constructor(text, description, id, tbound) {
    this.text = text;
    this.description = description;
    this.id = id;
    this.tbound = tbound
    this.pos = [0, 0];
    this.size = [0, 0];
  }
}

class UITabBar extends UIElement {
  constructor(Context ctx, char mode="v", Function callback=undefined) {
    UIElement.call(this, ctx);
    
    this.highlight = undefined;
    this.active = undefined;
    this.tabs = new GArray();
    
    this.callback = callback;
    
    this.triwid = 4;
    this.mode = mode;
    this.thickness = 25;
  }
  
  add_tab(String text, String tooltip="", Object id=undefined) {
    var tab = new _UITab(text, tooltip, id, undefined);
    this.tabs.push(tab);
    
    if (this.active == undefined)
      this.active = tab;
  }
  
  get_min_size(UICanvas canvas, Boolean isVertical) : Array<float> { 
    var thickness = 25;
    var tpad = this.triwid*2.0;
    var twid = tpad;
    
    for (var c in this.tabs) {
      var sz = canvas.textsize(c.text);
      
      twid += sz[0] + tpad*2.0;
      thickness = Math.max(sz[1], thickness);
    }
    
    this.thickness = thickness;
    
    if (this.mode == "v")
      return [thickness, twid];
    else
      return [twid, thickness];
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    canvas.simple_box([0, 0], this.size, undefined, 0.0);
    
    var ax = 0, ay = 1;
    var w = this.thickness;
    var tri = this.triwid;
    var pos = [0, this.size[1]];
    var size = [w, 0];
    var pos2 = [Math.floor(w/1.5), 0];
    
    var rot = new Matrix4();
    rot.rotate(0, 0, Math.pi/2);
    
    for (var t in this.tabs) {
      if (t.tbound == undefined) {
        t.tbound = canvas.textsize(t.text);
        t.tbound = [t.tbound[0], t.tbound[1]];
      }
      
      size[0] = w;
      size[1] = t.tbound[0]+12;
      pos[1] -= t.tbound[0]+8 + tri*2.0;
      
      t.pos[0] = pos[0]; t.pos[1] = pos[1];
      t.size[0] = size[1]; t.size[1] = size[1];
      
      if (t == this.highlight && t != this.active)
        canvas.simple_box(pos, size, 1.0);
      else if (t != this.active)
        canvas.simple_box(pos, size, 0.85);
     
      pos2[1] = pos[1]+4;
      canvas.text(pos2, t.text, [0.77, 0.77, 0.77, 1.0], undefined, undefined, Math.PI/2.0);
    }
    
    canvas.line([w, 0], [w, this.active.pos[1]-tri]);
    canvas.line([0, this.active.pos[1]-tri], [w, this.active.pos[1]-tri]);
    canvas.line([0, this.active.pos[1]-tri], [0, this.active.pos[1]+this.active.size[1]+tri]);
    canvas.line([0, this.active.pos[1]+this.active.size[1]+tri], [w, this.active.pos[1]+this.active.size[1]+tri]);
    canvas.line([w, this.active.pos[1]+this.active.size[1]+tri], [w, this.size[1]]);
  }
  
  on_inactive() {
    if (this.highlight != undefined) {
      this.highlight = undefined;
      this.do_recalc();
    }
  }
  
  on_mousedown(MouseEvent event) {
    if (this.highlight != undefined) {
      if (this.highlight != this.active) {
        this.active = this.highlight;
        this.do_recalc();
        if (this.callback != undefined) {
          this.callback(this.active.text, this.active.id);
        }
      }
    }
  }
  
  on_mousemove(MouseEvent event) {
    var mpos = [event.x, event.y];
    var tab = undefined;
    
    for (var t in this.tabs) {
      if (inrect_2d(mpos, t.pos, t.size)) {
        tab = t;
        break;
      }
    }
    
    if (tab != this.highlight)
      this.do_recalc();
    this.highlight = tab;
  }
}
//want to see if I can use the same code for vertical/horizontal tab
//strips
class UITabPanel extends UIFrame {
  constructor(Context ctx, Array<float> size=undefined, char mode="v") {
    UIFrame.call(this, ctx);
    
    if (size != undefined) {
      this.size = size;
    }
    
    this.mode = mode;
      
    this.subframe = mode == "v" ? new ColumnFrame(ctx) : new RowFrame(ctx)
    this.subframe.pos = [0,0];
    this.subframe.packflag |= PackFlags.NO_AUTO_SPACING|PackFlags.ALIGN_LEFT|PackFlags.ALIGN_BOTTOM; //|PackFlags.INHERIT_HEIGHT; 
    this.subframe.packflag |= PackFlags.INHERIT_WIDTH;
    
    var this2 = this;
    function callback(text, id) {
      this2.tab_callback(text, id);
    }
    
    this.panels = new GArray();
    this.tabstrip = new UITabBar(ctx, undefined, callback);
    this.tabstrip.packflag |= PackFlags.INHERIT_HEIGHT;
    
    this.subframe.pad[0] = 0;
    
    this.content = new RowFrame();
    this.content.rcorner = 0.0;
    this.content.draw_background = true;
    
    this.subframe.add(this.tabstrip);
    this.subframe.add(this.content);
    
    this.add(this.subframe);
  }
  
  tab_callback(String text, Object id) {
    console.log("tab callback", id);
    var content = this.content;
    
    for (var c in list(content.children)) {
      content.remove(c);
    }
    
    if (id != undefined)
      content.add(id);
    
    //content.do_full_recalc();
  }
  
  pack(UICanvas canvas, Boolean is_vertical) {
    this.subframe.size[0] = this.size[0];
    this.subframe.size[1] = this.size[1];
    
    prior(UITabPanel, this).pack.call(this, canvas, is_vertical);
  }
  
  panel(String label, int align=0, int default_packflag=0) {
    align |= this.default_packflag|PackFlags.ALIGN_LEFT;
    
    var ret = new RowFrame(this.ctx, label);
    ret.packflag |= align;
    ret.default_packflag = this.default_packflag|default_packflag;
    
    this.add_tab(label, ret);
    
    return ret;
  }
  
  panel_col(String label, int align=0, int default_packflag=0) {
    align |= this.default_packflag|PackFlags.ALIGN_LEFT;
    
    var ret = new ColumnFrame(this.ctx, label);
    ret.packflag |= align;
    ret.default_packflag = this.default_packflag|default_packflag;
    
    this.add_tab(label, ret);
    
    return ret;
  }
  
  add_tab(String text, UIFrame frame, String description) {
    if (this.tabstrip.tabs.length == 0)
      this.content.add(frame);
    
    this.tabstrip.add_tab(text, description, frame);
  }
  
  get_min_size(UICanvas canvas, Boolean isVertical) {
    return this.subframe.get_min_size(canvas, isVertical);
  }
}