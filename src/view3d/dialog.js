DialogFlags = {MODAL : 1, END_ON_ESCAPE : 2, DEFAULT: 2}

function Dialog(title, ctx, screen, flag)
{
  UIFrame.call(this, ctx, screen.canvas);
  
  this.title = title;
  this.screen = screen;
  this.canvas = screen.canvas;
  this.headersize = 25
  this.callback = undefined;
  
  if (flag == undefined)
    this.flag = DialogFlags.DEFAULT;
  else
    this.flag = flag;
    
  this.subframe = new UIFrame(ctx, screen.canvas);
  this.titlebar = new _TitleBar(ctx);
  this.titlebar.canvas = this.canvas;
  
  this.add(this.titlebar);
  this.add(this.subframe);
}
inherit(Dialog, UIFrame);

Dialog.cancel_button = function(ctx) {
  var e = new UIButton(ctx, "Cancel");
  
  e.callback = function(element) {
    var p = element.parent;
    while (p != undefined && !(p instanceof Dialog)) {
      p = p.parent;
    }
    
    if (p == undefined) {
      console.log("Yeek, couldn't find parent dialog in Dialog.cancel_button");
      console.trace();
      return;
    }
    
    p.end(true);
  }
  return e;
}

Dialog.okay_button = function(ctx) {
  var e = new UIButton(ctx, "Okay");
  
  e.callback = function(element) {
    var p = element.parent;
    while (p != undefined && !(p instanceof Dialog)) {
      p = p.parent;
    }
    
    if (p == undefined) {
      console.log("Yeek, couldn't find parent dialog in Dialog.cancel_button");
      console.trace();
      return;
    }
    
    p.end(false);
  }
  
  return e;
}

function _TitleBar(ctx)
{
  UIElement.call(this, ctx);
  this.text = ""
  this.moving = false;
  this.start_mpos = [0, 0];
}

inherit(_TitleBar, UIElement);
_TitleBar.prototype.build_draw = function(canvas, isVertical) {
  canvas.simple_box([0, 0], this.size);
  
  var tsize = canvas.textsize(this.text);
  canvas.text([12, (this.size[1]-tsize[1])*0.25], this.text);
}

_TitleBar.prototype.on_mousedown = function(event) {
  this.push_modal(this);
  this.moving = true;
  this.start_mpos = [event.x, event.y]
}

_TitleBar.prototype.on_mousemove = function(event) {
  if (this.moving) { 
    this.parent.pos[0] += event.x-this.start_mpos[0];
    this.parent.pos[1] += event.y-this.start_mpos[1];
    this.parent.do_full_recalc();
  }
}

_TitleBar.prototype.on_mouseup = function(event) {
  this.pop_modal();
  this.moving = false;
}

Dialog.prototype.on_draw = function(gl) {
}

Dialog.prototype.build_draw = function(canvas, isVertical) {
  canvas.push_scissor([0, 0], this.size);
  
  /*
  if (this.flag & DialogFlags.MODAL) {
    //dim the screen
    clr = [0.2, 0.2, 0.2, 0.4];
    
    if (0) {
      var y = this.screen.size[1] - this.pos[1] - this.size[1]
      
      var size = [this.screen.size[0], y];
      canvas.simple_box([-this.pos[0], this.size[1]], size, clr, 100);
      
      y = this.screen.size[1] - this.pos[1]
      var size = [this.pos[0], this.size[1]+2];
      canvas.simple_box([-this.pos[0], 0], size, clr, 100);
      
      y = this.screen.size[1] - this.pos[1]
      var x = this.pos[0];
      
      var size = [this.screen.size[0]-this.pos[0]+this.size[0], this.size[1]+2];
      canvas.simple_box([this.size[0], 0], size, clr, 100);
    }
    
    canvas.simple_box([-this.pos[0], -this.pos[1]], this.screen.size, clr, 100);
  }  
  // */
  
  this.titlebar.pos = [0, this.size[1]-this.headersize]
  this.titlebar.size = [this.size[0], this.headersize]
  this.titlebar.text = this.title
  
  canvas.simple_box([0,0], this.size, uicolors["DialogBox"]);
  
  UIFrame.prototype.build_draw.call(this, canvas, isVertical);
  
  canvas.pop_scissor();
}

Dialog.prototype.on_keydown = function(event)
{
  prior(Dialog, this).on_keydown.call(this, event);
  
  if (this.flag & DialogFlags.END_ON_ESCAPE) {
    if (event.keyCode == charmap["Escape"])
      this.end(true);
  }
}
Dialog.prototype.call = function(pos) {
  this.pack(this.screen.canvas, false);
  
  /*clamp to screen bounds*/
  pos[0] = Math.min(pos[0]+this.size[0], this.screen.size[0]) - this.size[0];
  pos[1] = Math.min(pos[1]+this.size[1], this.screen.size[1]) - this.size[1];
  pos[0] = Math.max(pos[0], 0);
  pos[1] = Math.max(pos[1], 0);
  
  this.pos[0] = pos[0]; this.pos[1] = pos[1];
  this.screen.add(this);
  
  if (this.flag & DialogFlags.MODAL) {
    this.screen.push_modal(this);
  }
  
  this.titlebar.pos = [0, this.size[1]-this.headersize];
  this.titlebar.size = [this.size[0], this.headersize];
  
  this.subframe.pos = [0, 0];
  this.subframe.size = [this.size[0], this.size[1]-this.headersize]
  this.titlebar.do_recalc();
  this.subframe.do_recalc();
  this.do_recalc();
}

Dialog.prototype.end = function(do_cancel) {
  if (this.flag & DialogFlags.MODAL) {
    this.screen.pop_modal();
  }
  
  this.screen.remove(this);
}

function PackedDialog(title, ctx, screen, flag)
{
  Dialog.call(this, title, ctx, screen, flag);
  this.remove(this.subframe);
  
  this.subframe = new RowFrame(ctx, undefined, PackFlags.ALIGN_BOTTOM|PackFlags.ALIGN_CENTER);
  this.add(this.subframe);
}
inherit(PackedDialog, Dialog);

PackedDialog.prototype.call = function(pos)
{
  this.size = this.subframe.get_min_size(this.canvas);
  this.size[1] += this.headersize + 15
  this.size[0] += 15
  
  Dialog.prototype.call.call(this, pos);
  this.subframe.pack(this.canvas);
}

