"use strict";

var debug_dag = 0;

/*okay, this design is a bit weird for just a simple scenegraph.
  it's designed to allow us to use a single integrated Dag 
  system for all situations where we might want one, 
  e.g. scenegraph, mesh nodes, material shaders, compositors,
  whatever.  Perhaps a node-based finite element analyser?*/

var DagFlags = {
  DIRTY : 1,
  HAS_EXECUTE : 2,
  SORTDIRTY : 4
};

var DagEdgeFlags = {
  INPUT_EXCLUSIVE : 1,  //socket can only have one input connection at a time
  OUTPUT_EXCLUSIVE : 2
};

class DagSocket {
  //by default, input sockets are only allowed to have
  //one input.
  constructor(name, owner, flag=DagEdgeFlags.INPUT_EXCLUSIVE) {
    this.edges = new GArray();
    this.node = owner;
    this.name = name;
    this.id = -1;
  }

  find_node(DagNode node) {
    for (var e in this.edges) {
      if (e.src == node || e.dst == node) {
        return e;
      }
    }
  }
  
  __iterator__() {
    return this.edges.__iterator__();
  }
  
  //get the data from an (output) socket.
  get_data(DagEdge edge) {
    
  }
  
  data_link(block, dag, getblock, getblock_us) {
    this.edges = new GArray(this.edges);
    for (var e in this.edges) {
      e.data_link(block, dag, getblock, getblock_us);
    }
  }
  
  static fromSTRUCT(reader) {
    static _version_convert_id = 1;
    var s = new DagSocket();
    
    reader(s);
    
    s.edges = new GArray(s.edges);
    return s;
  }
}

DagSocket.STRUCT = """
  DagSocket {
    name : static_string[64];
    id : int;
    node : int | obj.node == undefined ? -1 : (obj.node.dag_node == undefined ? -1 : obj.node.dag_node.id);
    edges : array(DagEdge);
  }
"""

//node connection type
class DagEdge {
  constructor(src, dst) {
    //name is optional
    this.src = src;
    this.dst = dst;

    this.killfunc = undefined;
  }

  /*grabs the node connected to this edge that isn't src.
    src is optional, defaults to the node opposite to Edge.node*/
  opposite(Node src) {
    return this.src == src ? this.dst : this.src;
  }
  
  data_link(block, dag, getblock, getblock_us) {
  }
  
  static fromSTRUCT(reader) {
    var e = new DagEdge();
    reader(e);
    
    return e;
  }
}

DagEdge.STRUCT = """
  DagEdge {
    src : int | obj.src.id; 
    dst : int | obj.dst.id;
  }
""";

/*flag is optional, defaults to DagFlags.HAS_EXECUTE.*/
class DagNodeData {
  constructor(owner, flag=DagFlags.HAS_EXECUTE) {
    this.ins = new GArray<DagSocket>();
    this.outs = new GArray<DagSocket>();
    this.owner = owner;
    
    this.inmap = {};
    this.outmap = {};
    
    this.flag = flag | DagFlags.DIRTY;
    this.id = -1;
  }
  
  //socktype can be 'i' or 'o', for input and output respectively
  add_sockets(type, socks) {
    var list, map;
    
    if (type == 'i') {
      list = this.ins;
      map = this.inmap;
    } else if (type == 'o') {
      list = this.outs;
      map = this.outmap;
    }
    
    for (var i=0; i<socks.length; i++) {
      list.push(socks[i]);
      map[socks[i].name] = socks[i];
    }
  }
  
  data_link(block, getblock, getblock_us) {
  }
  
  static fromSTRUCT(reader) {
    var nd = new DagNodeData();
    reader(nd);
    
    var ins = nd.ins, outs = nd.outs;
    nd.ins = new GArray(); nd.outs = new GArray();
    
    nd.add_sockets("i", ins);
    nd.add_sockets("o", outs);
    
    return nd;
  }
  
  set_owner(Object owner) {
    this.owner = owner;
    for (var s in this.ins) {
      s.node = owner;
    }
    
    for (var s in this.outs) {
      s.node = owner;
    }
  }
}

//block is owning block reference, if there is one
DagNodeData.STRUCT = """
  DagNodeData {
    id    : int;
    owner : dataref(DataBlock);
    flag  : int;
    ins   : array(abstract(DagSocket));
    outs  : array(abstract(DagSocket));
  }
""";

class DagNode extends DataBlock {
  constructor() {
    this.dag_node = new DagNodeData(this);
  }
  
  //note: subtypes may override this
  __hash__() : String {
    var n = this.constructor.name;
    return "DGN" + n[0] + n[3] + n[4] + this.dag_node.id;
  }
  
  dag_execute() { }
  dag_update() {
    var node = this;
    function flush(n) {
      n.dag_node.flag |= DagFlags.DIRTY;
      
      for (var o in n.dag_node.outs) {
        for (var e in o) {
          var n2 = e.opposite(o).node;
          
          if (n2 != n) {
            flush(n2);
          } else {
            /*
            console.log("yeek in dag_update.flush");
            console.log("----=-->", node, n, e, e.opposite(o));*/
          }
        }
      }
    }
    
    flush(this);
  }
}

function ddebug(msg) {
  if (DEBUG.dag) {
    if (arguments.length > 1) {
      var args = []
      for (var i=0; i<arguments.length; i++) {
        args.push(arguments[i]);
      }
      
      console.log.apply(console, args);
    } else {
      console.log(msg);
    }
  }
}

function DagRemFunc(dag, socket, dstsocket) {
  function rem() {
    dag.socket_disconnect(socket, dstsocket);
  }
  
  return rem;
}

class Dag {
  constructor() {
    //maps the data objects of nodes to the nodes themselves
    this.nodes = new GArray();
    this.sortlist = new GArray();
    this.idmap = {};
    this.sock_idgen = new EIDGen();
    
    this.flag = 0;
    this.idgen = new EIDGen();
  }

  has_node(node) {
    return node.dag_node.id in this.idmap;
  }
  
  sort() {
    ddebug("in sort", this.nodes);
    
    var nodes = this.nodes;
    
    for (var i=0; i<nodes.length; i++) {
      nodes[i].dag_node.flag |= DagFlags.SORTDIRTY;
    }
    
    var Dag = this;
    var sortl = new GArray();
    
    function dosort(n) {
      static _i = 0;
      
      _i++;
      
      if (_i > 10) { //XXX make this bigger
        console.log("infinite loop in dag sort");
        return;
      }
      
      for (var i=0; i<n.dag_node.ins.length; i++) {
        var s = n.dag_node.ins[i];
        
        for (var e in n.dag_node.ins[i]) {
          var n2 = e.opposite(s).node;
          
          if (n2.dag_node.flag & DagFlags.SORTDIRTY) {
            dosort(n2);
          }
        }
      }
      
      sortl.push(n);
      n.dag_node.flag &= ~DagFlags.SORTDIRTY;
      
      for (var i=0; i<n.dag_node.outs.length; i++) {
        var s = n.dag_node.outs[i];
        
        for (var e in n.dag_node.outs[i]) {
          var n2 = e.opposite(s).node;
          
          if (_i > 10) { //XXX make this bigger
            console.log("infinite loop in dag sort 2");
            return;
          }
          
          if (n2.dag_node.flag & DagFlags.SORTDIRTY) {
            dosort(n2);
          }
        }
      }
    }
    
    for (var i=0; i<nodes.length; i++) {
      var n = nodes[i];
      ddebug("sorting node ", n.dag_node.id);
      
      if (n.dag_node.flag & DagFlags.SORTDIRTY)
        dosort(n);
    }
    
    this.sortlist = sortl;
    this.flag &= ~DagFlags.SORTDIRTY;
  }

  exec() {
    if (debug_dag)
      console.log("executing dag...");
    
    if (this.flag & DagFlags.SORTDIRTY) {
      if (debug_dag)
        console.log("sorting dag...");
        
      this.sort();
    }
    
    for (var n in this.sortlist) {
      if (debug_dag)
        console.log("n.flag, n:", n.dag_node.flag, n);
      
      if (n.dag_node.flag  & DagFlags.DIRTY) {
        if (n.dag_node.flag & DagFlags.HAS_EXECUTE) {
          n.dag_execute();
          n.dag_node.flag &= ~DagFlags.DIRTY;
        }
      }
    }
    
    if (debug_dag)
      console.log("finished executing dag");
  }

  add(DagNode node) {
    if (node instanceof DataBlock) {
      var this2 = this;
      function remove() {
        this2.remove(node);
      }
      
      node.lib_adduser(this, "DAG", remove);
    }
    
    if (node == undefined || node == 0 || node.dag_node == undefined) {
      console.trace();
      console.log("WARNING: invalid node passed to dag.add()!");
      return;
    }
    
    if (node.dag_node.id != -1 && (node.dag_node.id in this.idmap)) {
      console.trace();
      console.log("WARNING: node ", node, " was passed twice to dag.add()!");
      return;
    }
    
    if (node.dag_node.id == -1)
      node.dag_node.id = this.idgen.gen_id();
    
    for (var s in node.dag_node.ins) {
      s.id = this.sock_idgen.gen_id();
    }
    
    for (var s in node.dag_node.outs) {
      s.id = this.sock_idgen.gen_id();
    }
    
    this.nodes.push(node);
    this.flag |= DagFlags.SORTDIRTY;
    this.idmap[node.dag_node.id] = node;
  }

  //
  remove(DagNode node) {
    //disconnect from all other nodes
    for (var s in list(node.dag_node.ins)) {
      this.socket_clear(node, s, "i");
    }
    for (var s in list(node.dag_node.outs)) {
      this.socket_clear(node, s, "o");
    }
    
    if (node instanceof DataBlock) {
      node.lib_remuser(this, "DAG"); //should execute this.nodes.remove(node) itself
    } else {
      this.nodes.remove(node);
    }
    delete this.idmap[node.dag_node.id];
    this.flag |= DagFlags.SORTDIRTY;
  }

  //returns a new DagEdge object
  socket_connect(s1, s2) {
    var e = new DagEdge(s1, s2, this);
    
    s1.edges.push(e);
    s2.edges.push(e);
    
    this.flag |= DagFlags.SORTDIRTY;
    
    return e;
  }

  socket_disconnect(s1, s2) {
    for (var e in s1.edges) {
      if (e.src == s1 && e.dst == s2) {
        if (e.killfunc != undefined)
          e.killfunc(e);
        e.src.edges.remove(e);
        e.dst.edges.remove(e);
        break;
      } else if (e.dst == s1 && e.src == s2) {
        if (e.killfunc != undefined)
          e.killfunc(e);
        e.src.edges.remove(e);
        e.dst.edges.remove(e);
        break;
      }
    }
    
    this.flag |= DagFlags.SORTDIRTY;
  }

  //socktype must be one of ['i', 'o'], input/output
  socket_clear(node, sockname, socktype) {
    var sock;
    
    if (socktype == 'i')
      sock = node.dag_node.inmap[sockname];
    else
      sock = node.dag_node.outmap[sockname];
      
    for (var e in sock.edges) {
      if (e.killfunc != undefined)
        e.killfunc(e);
      
      if (e.src == sock)
        e.dst.edges.remove(e);
      else if (e.dst == sock)
        e.src.edges.remove(e);
    }
    
    sock.edges = new GArray();
    
    this.flag |= DagFlags.SORTDIRTY;
  }

  //this function connects inputs to outputs.
  //make sure the arguments are in the right order
  connect(n1, String s1name, n2, String s2name) {
    var s1 = n1.dag_node.outmap[s1name];
    var s2 = n2.dag_node.inmap[s2name];
    
    if (s1.node == undefined)
      s1.node = n1;
    if (s2.node == undefined)
      s2.node = n2;
    
    return this.socket_connect(s1, s2);
  }
  
  data_link(block, getblock, getblock_us) {
    var nodes = new GArray(this.nodes);
    var nlen = nodes.length;
    var nmap = this.idmap = {};
    var sockmap = {};
    
    //console.log("in DAG data link");
    //console.log(nodes);
    //console.log(nodes.length);
    
    for (var i=0; i<nlen; i++) {
      var n = nodes[i];
      
      //check if we're the dag_node member of a datablock
      //console.log(n);
      if (n instanceof DagNodeData) { //as opposed to an instance of DataNode
        var b = getblock(n.owner);
        
        if (b == undefined) {
          console.trace();
          console.log("WARNING: could not load block for node! Yeek!");
          continue;
        }
        
        //.block was a serialization member
        //delete n.block;
        
        b.dag_node = n;
        n.owner = b;
        
        nodes[i] = b;
        
        var this2 = this;
        b.lib_adduser(this, "DAG", function() { this2.remove(b) });
      }
      
      nmap[nodes[i].dag_node.id] = b;
    }
    
    this.nodes = nodes;
    
    for (var node in nodes) {
      var n = node.dag_node;
      
      for (var s in n.ins) {  
        s.node = node;
        sockmap[s.id] = s;
      }
      
      for (var s in n.outs) {
        s.node = node;
        sockmap[s.id] = s;
      }
    }
    
    sockmap[-1] = -1;
    
    var this2 = this;
    var userset = new set();
    function get_sock(sock, id, add_libuser=false) {
      if (typeof(id) == "object") return id;
      
      if (id in sockmap) {
        var ret = sockmap[id];
        
        if (add_libuser && ret != sock && (ret.node instanceof DataBlock)) {
          if (!userset.has(ret.node)) {
            ret.node.lib_adduser(sock, "socket", DagRemFunc(this2, sock, ret));
            userset.add(ret.node);
          }
        }
        
        return ret;
      } else {
        console.log("Yeek!  Bad socket id ", id);
        return -1;
      }
    }
    
    for (var node in nodes) {
      var n = node.dag_node;
      
      for (var s in n.ins) {
        for (var e in s.edges) {
          e.src = get_sock(s, e.src, true);
          e.dst = get_sock(s, e.dst);
        }
      }
      
      for (var s in n.outs) {
        for (var e in s.edges) {
          e.src = get_sock(s, e.src);
          e.dst = get_sock(s, e.dst);
        }
      }
    }
    
    for (var i=0; i<nodes.length; i++) {
      if (!(nodes[i] instanceof DataBlock)) {
        nodes[i].dag_node.data_link(block, getblock, getblock_us);
        nodes[i].data_link(block, getblock, getblock_us);
      } else {
        nodes[i].dag_node.data_link(block, getblock, getblock_us);
      }
    }
    
    for (var node in nodes) {
      var n = node.dag_node;
      //console.log(n)
      if (!(node instanceof DataBlock))
        n.owner = node;
      
      for (var s in n.ins) {
        s.node = node;
        s.data_link(block, this, getblock, getblock_us);
      }
      
      for (var s in n.outs) {
        s.node = node;
        s.data_link(block, this, getblock, getblock_us);
      }
    }
    
    function find_link(DagEdge e, DagSocket s) {
      for (var e2 in s.edges) {
        if (e2.src == e.src && e2.dst == e.dst) return e2;
      }
      
      return undefined;
    }
    
    function link_sock(s, type) {
      for (var e in s.edges) {
        var target = type=="i" ? e.src : e.dst;
        var found=false;
        
        if (!target.edges.has(e)) {
          var e2 = find_link(e, target);
          if (e2 == undefined) {
            console.log("ERROR: Couldn't find edge in e.src", e);
            continue;
          }
          
          //var target2 = type == "i" ? e2.dst : e2.src;
          if (target.edges.has(e2))
            target.edges.replace(e2, e);
        }
      }
    }
    
    for (var node in nodes) {
      var n = node.dag_node;
      for (var s in n.ins) {
        //link_sock(s, "i");
      }
      
      for (var s in n.outs) {
        //link_sock(s, "o");
      }
    }
  }
  
  //XXX implement me, unlink all object references within this datatree
  unlink() {
  }
  
  static fromSTRUCT(reader) {
    var dag = new Dag();
    reader(dag);
    
    dag.flag |= DagFlags.SORTDIRTY;
    return dag;
  }
}

//how we serialize datablock nodes versus
//direct data nodes is a bit hackish. . .
Dag.STRUCT = """
  Dag {
    flag : int;
    idgen : EIDGen;
    sock_idgen : EIDGen;
    nodes : array(e, abstract(Object)) | (instance_of(e, DataBlock) ? e.dag_node : e) ;
  }
""";
