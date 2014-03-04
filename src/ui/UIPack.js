"use strict";

class UIPackFrame extends UIFrame {
  constructor(ctx, path_prefix)
  {
    UIFrame.call(this, ctx);
    if (path_prefix == undefined)
      path_prefix = ""
    
    this.path_prefix = path_prefix;
    this.min_size = undefined : Array<float>;
    
  }

  on_resize(Array<int> newsize, Array<int> oldsize)
  {
    prior(UIPackFrame, this).on_resize.call(this, newsize, oldsize);
    
    //var canvas = this.get_canvas();
    //if (canvas != undefined)
    //  this.pack(canvas, false);
  }

  toolop(path, inherit_flag) {
    var ctx = this.ctx;
    var opname = ctx.api.get_op_uiname(ctx, path);
    
    if (opname == undefined) {
      console.trace();
      console.log("couldn't find tool operator at path" + path + ".");
      return;
    }
    
    var c = new UIButton(ctx, opname, [0,0], [0,0], path);
    
    if (inherit_flag != undefined) 
      c.packflag |= inherit_flag;
      
    this.add(c);
  }

  pack(canvas, isVertical) {
    //this.do_full_recalc();
  }

  prop(path, packflag) {
    if (packflag == undefined)
      packflag = 0;
    
    if (this.path_prefix.length > 0)
      path = this.path_prefix + "." + path

    var ctx = this.ctx;
    var prop = ctx.api.get_prop_meta(ctx, path)
    
    if (prop == undefined) {
      console.trace();
      console.log("couldn't find property: " + path + ".", this.path_prefix);
      return;
    }
    
    if (prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT) {
      var range = prop.range;
      if (prop.range == undefined || (prop.range[0] == 0 && prop.range[1] == 0)) {
        range = [-2000, 2000];
      }
      
      var c = new UINumBox(ctx, prop.uiname, range, prop.data, [0,0], [0,0], path);
      c.packflag = packflag;
      c.unit = prop.unit;
      
      this.add(c);
    } else if (prop.type == PropTypes.ENUM) {
      var c = new UIMenuButton(ctx, undefined, [0,0], [0,0], path);
      
      c.packflag |= packflag;
      this.add(c)
    } else if (prop.type == PropTypes.VEC3) {
        range = [-2000, 2000];
        
        var row = this.row();
        row.packflag = packflag;
        
        row.label(prop.uiname);
        var c = new UINumBox(ctx, "X", range, prop.data, [0,0], [0,0], path + "[0]");
        c.unit = prop.unit;
        c.packflag |= packflag;
        row.add(c);
        
        var c = new UINumBox(ctx, "Y", range, prop.data, [0,0], [0,0], path + "[1]");
        c.unit = prop.unit;
        c.packflag |= packflag;
        row.add(c);
        
        var c = new UINumBox(ctx, "Z", range, prop.data, [0,0], [0,0], path + "[2]");
        c.unit = prop.unit;
        c.packflag |= packflag;
        row.add(c);
    } else if (prop.type == PropTypes.VEC4) {
        range = [-2000, 2000];
        
        var row = this.row();
        
        row.label(prop.uiname);
        var c = new UINumBox(ctx, "X", range, prop.data, [0,0], [0,0], path + "[0]");
        c.packflag |= packflag;
        c.unit = prop.unit;
        row.add(c);

        var c = new UINumBox(ctx, "Y", range, prop.data, [0,0], [0,0], path + "[1]");
        c.packflag |= packflag;
        c.unit = prop.unit;
        row.add(c);

        var c = new UINumBox(ctx, "Z", range, prop.data, [0,0], [0,0], path + "[2]");
        c.packflag |= packflag;
        c.unit = prop.unit;
        row.add(c);

        var c = new UINumBox(ctx, "W", range, prop.data, [0,0], [0,0], path + "[3]");
        c.packflag |= packflag;
        c.unit = prop.unit;
        row.add(c);
    } else if (prop.type == PropTypes.STRING && (prop.flag & TPropFlags.LABEL)) {
      this.label(path, true, packflag);
    } else if (prop.type == PropTypes.BOOL) {
      var check = new UICheckBox(ctx, prop.uiname, undefined, undefined, path);
      check.packflag |= packflag;
      this.add(check);
    } else if (prop.type == PropTypes.FLAG) {
      var row = this.row();
      row.packflag |= packflag;
      
      row.label(prop.uiname + ":");
      for (var k in prop.ui_value_names) {
        var path2 = path + "["+prop.keys[prop.ui_value_names[k]]+"]"
        var check = new UICheckBox(ctx, k, undefined, undefined, path2);
        check.packflag |= PackFlags.INHERIT_WIDTH;
        
        row.add(check);
      }
    }
    else {
      if (DEBUG.ui_datapaths)
        console.log("warning: unimplemented property type for path " + path + " in user interface code");
    }
  }

  label(text, use_path, align) { //use_path, align are optional
    if (use_path != undefined && use_path) {
      var c = new UILabel(this.ctx, "", [0,0], [0,0], text);
      this.add(c);
      
      if (align)
        c.packflag |= align;
      
      return c;
    } else {
      var c = new UILabel(this.ctx, text, [0,0], [0,0], undefined);
      this.add(c);
      
      if (align)
        c.packflag |= align;
      
      return c;
    }
  }

  row(path_prefix, align) { //path_prefix is optional
    if (path_prefix == undefined) path_prefix = ""
    
    var row = new RowFrame(this.ctx, this.path_prefix);
    this.add(row);
    
    if (align)
      row.packflag |= align;
      
    return row;
  }

  col(path_prefix, align) { //path_prefix is optional
    if (path_prefix == undefined) path_prefix = ""
    
    var col = new ColumnFrame(this.ctx, this.path_prefix);
    this.add(col);

    if (align)
      col.packflag |= align;
    
    return col;
  }

  _pack_recalc() 
  {
    return;
    //this.do_full_recalc();
    
    for (var c in this.children) {
      if (!(c instanceof UIFrame)) {
        c.recalc = 1;
      }
    }
  }
}

class RowFrame extends UIPackFrame {
  constructor(ctx, path_prefix, align)
  {
    UIPackFrame.call(this, ctx, path_prefix);
    this.packflag |= PackFlags.INHERIT_HEIGHT|align;
  }

  get_min_size(UICanvas canvas, Boolean isvertical) {
    if (canvas == undefined) {
      console.trace();
      console.log("Warning: undefined canvas in get_min_size");
      return;
    }
    
    var maxwidth = 0;
    var tothgt = 0;
    
    for (var c in this.children) {
      var size;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        size = c.get_min_size(canvas, isvertical);
      else
        size = [c.size[0], c.size[1]];
      
      tothgt += size[1]+2;
      maxwidth = Math.max(maxwidth, size[0]+2);
    }
    
    if (this.min_size != undefined) {
      maxwidth = Math.max(maxwidth, this.min_size[0]);
      tothgt = Math.max(tothgt, this.min_size[1]);
    }
    
    return [Math.max(maxwidth, 1), Math.max(tothgt, 1)];
  }

  pack(UICanvas canvas, Boolean is_vertical) {
    if (canvas == undefined) {
      console.trace();
      console.log("Warning: undefined canvas in pack");
      return;
    }
    
    this._pack_recalc();
    
    if (this.size[0] == 0 && this.size[1] == 0) {
      this.size[0] = this.parent.size[0];
      this.size[1] = this.parent.size[1];
    }
    
    var minsize = this.get_min_size(canvas, is_vertical);
    var spacing = Math.floor((this.size[1] - minsize[1])/this.children.length);
    if (spacing < 0) spacing = 0;
    spacing = Math.min(spacing, 4.0);
    
    var x = 0;
    var y;
    
    if (this.packflag & PackFlags.ALIGN_BOTTOM)
      y = 2;
    else
      y = this.size[1];
    
    for (var i=0; i<this.children.length; i++) {
      var c = this.children[i];
      var size;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        size = c.get_min_size(canvas, is_vertical);
      else
        size = [c.size[0], c.size[1]]
      
      size[0] = Math.min(size[0], this.size[0]);
      if (c.packflag & PackFlags.INHERIT_WIDTH)
        size[0] = this.size[0]-2
      
      c.size = size;
      var final_y = y;
      if (!(this.packflag & PackFlags.ALIGN_BOTTOM))
        final_y -= size[1];
      
      if (this.packflag & PackFlags.ALIGN_RIGHT) {
        c.pos = [this.size[0]-size[0]-x, final_y];
      } else if (this.packflag & PackFlags.ALIGN_LEFT) {
        c.pos = [x, final_y];
      } else {
        c.pos = [x + Math.floor(0.5*(this.size[0]-size[0])), final_y];
      }
      
      if (this.packflag & PackFlags.ALIGN_BOTTOM)
        y += c.size[1]+spacing;
      else
        y -= c.size[1]+spacing;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        c.pack(canvas, is_vertical);
    }
    
    //this.size[1] = Math.max(this.size[1], minsize[1]);
  }
}

class ColumnFrame extends UIPackFrame {
  constructor(ctx, path_prefix, align)
  {
    UIPackFrame.call(this, ctx, path_prefix);
    this.packflag |= PackFlags.INHERIT_WIDTH|align
  }

  get_min_size(UICanvas canvas, Boolean isvertical) {
    if (canvas == undefined) {
      console.trace();
      console.log("Warning: undefined canvas in get_min_size");
      return;
    }
    
    var maxheight = 0;
    var totwid = 0;
    
    for (var c in this.children) {
      var size;
      if (!(c.packflag & PackFlags.NO_REPACK))
        size = c.get_min_size(canvas, isvertical);
      else
        size = [c.size[0], c.size[1]];
        
      totwid += size[0]+2;
      maxheight = Math.max(maxheight, size[1]+2);
    }
    
    if (this.min_size != undefined) {
      totwid = Math.max(totwid, this.min_size[0]);
      maxheight = Math.max(maxheight, this.min_size[1]);
    }
    
    return [totwid, maxheight];
  }

  pack(UICanvas canvas, Boolean is_vertical) {
    if (canvas == undefined) {
      console.trace();
      console.log("Warning: undefined canvas in pack");
      return;
    }

    this._pack_recalc();
    
    if (this.size[0] == 0 && this.size[1] == 0) {
      this.size[0] = this.parent.size[0];
      this.size[1] = this.parent.size[1];
    }
    
    var minsize = this.get_min_size(canvas, is_vertical);
    var spacing = Math.floor((this.size[0] - minsize[0])/this.children.length);
    if (spacing < 0) spacing = 0;
    spacing = Math.min(spacing, 4.0);
    
    var sum=0;
    var max_wid = 0;
    for (var c in this.children) {
      var s;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        s = c.get_min_size(canvas, is_vertical);
      else
        s = [c.size[0], c.size[1]];
      
      max_wid = Math.max(s[0], max_wid);
      sum += s[0];
    }
    
    var x;
    var y = 2;
    var pad = 4;
    max_wid *= ((this.size[0])/sum);
    
    if (!(this.packflag & PackFlags.ALIGN_LEFT) && !(this.packflag & PackFlags.ALIGN_RIGHT))
      this.packflag |= PackFlags.ALIGN_CENTER;
      
    if (this.packflag & PackFlags.ALIGN_RIGHT) {
      x = this.size[0]-3;
    } else if (this.packflag & PackFlags.ALIGN_LEFT) {
      x = 3;
    } else {
      x = 0;
    }
      
    for (var c in this.children) {
      var size;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        size = c.get_min_size(canvas, is_vertical);
      else
        size = [c.size[0], c.size[1]];
        
      if (!(this.packflag & PackFlags.IGNORE_LIMIT)) {
        if (c.packflag & PackFlags.INHERIT_WIDTH)
          size[0] = max_wid-pad;
        else
          size[0] = Math.min(size[0], max_wid-pad);
      }
      
      if (c.packflag & PackFlags.INHERIT_HEIGHT)
        size[1] = this.size[1]-6
        
      c.size = size;
      if (this.packflag & PackFlags.ALIGN_RIGHT) {
        c.pos = [x-size[0], y];
        x -= Math.floor(size[0]+pad+spacing);
      } else {
        c.pos = [x, y];
        x += Math.floor(size[0]+pad+spacing);
      }
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        c.pack(canvas, is_vertical);
    }
    
    if ((this.packflag & PackFlags.ALIGN_CENTER) && x < this.size[0]) {
      for (var c in this.children) {
        c.pos[0] += Math.floor((this.size[0]-x)*0.5);
      }
    }
  }
}

var _te = 0;
class ToolOpFrame extends RowFrame {
  constructor(ctx, path) {
    RowFrame.call(this, ctx, path);
    this.rebuild = true;
    this.strct = undefined;
    this.ctx = ctx;
  }

  do_rebuild(ctx) {
    var strct = this.ctx.api.get_struct(ctx, this.path_prefix);
    
    this.children = new GArray([]);
    
    if (strct == undefined) return;
    
    this.strct = strct;
    for (var p in strct) {
      if (!(p.flag & PackFlags.UI_DATAPATH_IGNORE))
        this.prop(p.name, PackFlags.INHERIT_WIDTH);
    }
  }

  on_tick() {
    var strct = this.ctx.api.get_struct(this.ctx, this.path_prefix);
    
    if (strct != this.strct) {
      this.do_rebuild(this.ctx);
      this.do_recalc();
    }
    
    RowFrame.prototype.on_tick.call(this);
  }

  build_draw(UICanvas canvas, Boolean isVertical) {
    if (this.rebuild) {
      this.do_rebuild(this.ctx);
      this.rebuild = false;
    }
    
    canvas.simple_box([0,0], this.size, [0.2, 0.2, 0.2, 0.1]);
    RowFrame.prototype.build_draw.call(this, canvas, isVertical);
  }
}
