//if field is not undefined, use the data
//contained in owner.[field].  otherwise, use
//own data.
class Matrix4Socket extends DagSocket {
  constructor(name, owner, field, flag) {
    //flag is optional
    DagSocket.call(this, name, owner, flag);
    
    this.matrix = new Matrix4();
    this.field = field;
  }

  get_data(edge) {
    if (this.field != undefined)
      return this.owner["field"];
    else return this.matrix;
  }
  
  static fromSTRUCT(reader) {
    var ms = STRUCT.chain_fromSTRUCT(Matrix4Socket, reader);
    
    return ms;
  }
}

Matrix4Socket.STRUCT = STRUCT.inherit(Matrix4Socket, DagSocket) + """
    matrix : mat4;
    field : string;
  }
""";

class DepSocket extends DagSocket {
  constructor(name, owner, flag) {
    DagSocket.call(this, name, owner, flag);
  }
  
  static fromSTRUCT(reader) {
    return STRUCT.chain_fromSTRUCT(DepSocket, reader);
  }
}

DepSocket.STRUCT = STRUCT.inherit(DepSocket, DagSocket) + """
  }
""";