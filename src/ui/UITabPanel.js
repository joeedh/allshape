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
    this.mm = new MinMax(2);
    
    this.callback = callback;
    
    this.triwid = 4;
    this.mode = mode;
    this.thickness = this.min_thickness = IsMobile ? 40 : 25;
  }
  
  add_tab(String text, String tooltip="", Object id=undefined) {
    var tab = new _UITab(text, tooltip, id, undefined);
    this.tabs.push(tab);
    
    if (this.active == undefined)
      this.active = tab;
  }
  
  get_min_size(UICanvas canvas, Boolean isVertical) : Array<float> { 
    var thickness = this.min_thickness;
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
    //canvas.simple_box([0, 0], this.size, undefined, 0.0);
    
    var ax = 0, ay = 1;
    var w = this.thickness;
    var tri = this.triwid;
    var pos = [0, this.size[1]];
    var size = [w, 0];
    var pos2 = [Math.floor(w/1.5), 0];
    var pos3 = [0, 0];
    var size2 = [0, 0];
    
    var rot = new Matrix4();
    rot.rotate(0, 0, Math.pi/2);
    
    //y bounds of active tab
    var y1 = this.active.pos[1]-tri;
    var y2 = this.active.pos[1]+this.active.size[1]+tri;
    if (y1 < 5) y1 = 0;
    if (y2 >= this.size[1]-5) y2 = this.size[1]-1;
    
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

      //do minmax
      pos3[0] = pos[0]+size[0]; pos3[1] = pos[1]+size[1];
      this.mm.minmax(pos);
      this.mm.minmax(pos3);
      
      //text position
      pos2[1] = pos[1]+4;
      
      if (t == this.highlight && t != this.active)
        canvas.simple_box(pos, size, uicolors["HighlightTab"]);
      else if (t != this.active)
        canvas.simple_box(pos, size, 0.85);
      else {
        pos3[0] = 0; pos3[1] = y1;
        size2[0] = w+1; size2[1] = y2-y1;
        canvas.box2(pos3, size2, uicolors["SimpleBox"]);
      }
      canvas.text(pos2, t.text, uicolors["TabText"], undefined, undefined, Math.PI/2.0);
    }
      
    var lineclr = uicolors["TabPanelOutline"];
    if (!(this.packflag & PackFlags.FLIP_TABSTRIP)) {
      canvas.line([w, 0], [w, y1], lineclr);
      canvas.line([0, y1], [w, y1], lineclr);
      canvas.line([0, y1], [0, y2], lineclr);
      canvas.line([0, y2], [w, y2], lineclr);
      canvas.line([w, y2], [w, this.size[1]], lineclr);
    } else {
      canvas.line([0, 0], [0, y1], lineclr);
      canvas.line([w, y1], [0, y1], lineclr);
      canvas.line([w, y1], [w, y2], lineclr);
      canvas.line([w, y2], [0, y2], lineclr);
      canvas.line([0, y2], [0, this.size[1]], lineclr);
    }
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
  constructor(Context ctx, Array<float> size=undefined, char mode="v", Boolean flip=false) {
    UIFrame.call(this, ctx);
    
    this.flip = flip;
    if (flip)
      this.packflag |= PackFlags.FLIP_TABSTRIP;
    
    if (size != undefined) {
      this.size = size;
    }
    
    this.mode = mode;
      
    this.subframe = mode == "v" ? new ColumnFrame(ctx) : new RowFrame(ctx)
    this.subframe.pos = [0,0];
    this.subframe.pad[1] = 0;
    this.subframe.pad[0] = flip ? 4 : 0;
    this.subframe.packflag |= PackFlags.NO_AUTO_SPACING|PackFlags.ALIGN_LEFT|PackFlags.ALIGN_BOTTOM;
    this.subframe.packflag |= PackFlags.IGNORE_LIMIT;
    this.subframe.packflag |= PackFlags.NO_LEAD_SPACING|PackFlags.NO_TRAIL_SPACING;
    this.subframe.default_packflag |= PackFlags.INHERIT_WIDTH;
    
    var this2 = this;
    function callback(text, id) {
      this2.tab_callback(text, id);
    }
    
    this.panels = new GArray();
    this.tabstrip = new UITabBar(ctx, undefined, callback);
    this.tabstrip.packflag |= PackFlags.INHERIT_HEIGHT;
    
    this.content = new RowFrame();
    this.content.pad[1] = 4;
    this.content.rcorner = 0.0;
    this.content.draw_background = true;
    
    this.subframe.add(this.tabstrip);
    
    if (flip) {
      this.tabstrip.packflag |= PackFlags.FLIP_TABSTRIP;
      this.subframe.prepend(this.content);
    } else {
      this.subframe.add(this.content);
    }
    
    this.add(this.subframe);
  }
  
  on_saved_uidata(Function visit) {
    prior(UITabPanel, this).on_saved_uidata.call(this, visit);
    
    for (var t in this.tabstrip.tabs) {
      visit(t.id);
    }
  }
  
  on_load_uidata(Function visit) {
    prior(UITabPanel, this).on_load_uidata.call(this, visit);
    
    for (var t in this.tabstrip.tabs) {
      visit(t.id);
    }
  }
  
  load_filedata(ObjectMap map) {
    if (map.active) {
      var ts = this.tabstrip.tabs;
      for (var i=0; i<ts.length; i++) {
        if (ts[i].text == map.active) {
          this.tabstrip.active = ts[i];
          this.tab_callback(ts[i].text, ts[i].id);
          this.do_recalc();
          break;
        }
      }
    }
  }
  
  get_filedata() : ObjectMap {
    if (this.tabstrip.active != undefined)
      return {active : this.tabstrip.active.text};
  }
  
  get_uhash() {
    var s = prior(UITabPanel, this).get_uhash.call(this);
    
    for (var t in this.tabstrip.tabs) {
      s += t.text;
    }
    
    return s;
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    //strange, shouldn't have to manually call pack here. . .
    this.pack(canvas, isVertical);
    
    canvas.simple_box(this.pos, this.size);
    
    prior(UITabPanel, this).build_draw.call(this, canvas, isVertical);
    
    var lineclr = uicolors["TabPanelOutline"];
    var t = this.tabstrip.thickness; //header width
    
    var sx = this.flip ? this.tabstrip.pos[0] : this.size[0];
    var y = this.is_canvas_root() ? this.pos[1] : 0;
    if (!(this.packflag & PackFlags.FLIP_TABSTRIP)) {
      canvas.line([t, y], [sx, y], lineclr);
      canvas.line([t, y+this.size[1]-1], [sx, y+this.size[1]-1], lineclr);
    } else {
      canvas.line([0, y], [sx, y], lineclr);
      canvas.line([0, y+this.size[1]-1], [sx, y+this.size[1]-1], lineclr);
    }
  }
  
  tab_callback(String text, Object id) {
    var content = this.content;
    
    for (var c in list(content.children)) {
      content.remove(c);
      
      /*prevent UIFrame.remove from setting 
        c.parent to undefined.  this is necassary
        for c.get_uhash() to return correct results
        when it's part of an inactive tab.*/
      c.parent = content; 
    }
    
    if (id != undefined)
      content.add(id);
    
    //content.do_full_recalc();
  }
  
  pack(UICanvas canvas, Boolean isVertical) {
    this.subframe.size[0] = this.size[0];
    this.subframe.size[1] = this.size[1];
    
    prior(UITabPanel, this).pack.call(this, canvas, isVertical);
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
    
    var uhash = frame.get_uhash;
    frame.get_uhash = function() {
      return uhash.call(frame) + text;
    }
    
    this.tabstrip.add_tab(text, description, frame);
    
    //make sure uhash() returns consistent results
    frame.parent = this.content;
  }
  
  get_min_size(UICanvas canvas, Boolean isVertical) {
    return this.subframe.get_min_size(canvas, isVertical);
  }
}